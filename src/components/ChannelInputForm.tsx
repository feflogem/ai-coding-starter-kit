"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { PricingModal } from "@/components/PricingModal"
import type { VideoResult } from "@/app/api/analyze/route"
import type { User } from "@supabase/supabase-js"

interface ChannelInputFormProps {
  onResults: (videos: VideoResult[], summary: string, errors: string[]) => void
  onLoading: (loading: boolean) => void
}

interface ChannelEntry {
  id: string
  name: string
  thumbnail?: string
  subscriberCount?: number
}

interface SearchResult {
  channelId: string
  title: string
  thumbnail: string
  subscriberCount: number
}

const STORAGE_KEY = "viral-tracker-channels"
const TIER_LIMITS: Record<string, number> = { free: 20, basic: 10, premium: 40 }

function formatSubs(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function ChannelInputForm({ onResults, onLoading }: ChannelInputFormProps) {
  const [user, setUser] = useState<User | null>(null)
  const [channelLimit, setChannelLimit] = useState(3)
  const [channels, setChannels] = useState<ChannelEntry[]>([])
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [minViews, setMinViews] = useState("50000")
  const [dayRange, setDayRange] = useState("30")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [sortBy, setSortBy] = useState("views")
  const [maxResults, setMaxResults] = useState("15")
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [pricingOpen, setPricingOpen] = useState(false)
  const [subsOpen, setSubsOpen] = useState(false)
  const [subsChannels, setSubsChannels] = useState<{ channelId: string; name: string; thumbnail: string | null; subscriberCount?: number }[]>([])
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsError, setSubsError] = useState<string | null>(null)
  // YouTube channel profile setup (inline)
  const [ownChannel, setOwnChannel] = useState<string | null | undefined>(undefined) // undefined = loading, null = not set
  const [ownChannelInput, setOwnChannelInput] = useState("")
  const [ownChannelSaving, setOwnChannelSaving] = useState(false)

  const atLimit = channels.length >= channelLimit

  async function loadTierLimit(userId: string) {
    const { data } = await supabase.from("subscriptions").select("tier").eq("user_id", userId).single()
    setChannelLimit(TIER_LIMITS[data?.tier ?? "free"] ?? 3)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        loadFromSupabase(data.user.id)
        loadTierLimit(data.user.id)
        supabase.from("profiles").select("youtube_channel_id").eq("id", data.user.id).single()
          .then(({ data: p }) => setOwnChannel(p?.youtube_channel_id || null))
      } else {
        loadFromLocalStorage()
        setChannelLimit(3)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadFromSupabase(session.user.id)
        loadTierLimit(session.user.id)
      }
      else { loadFromLocalStorage(); setChannelLimit(3) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : null
      if (Array.isArray(parsed) && parsed.length > 0) {
        const entries: ChannelEntry[] = parsed
          .map((item: string | ChannelEntry) =>
            typeof item === "string" ? { id: item, name: item } : item
          )
          .filter((e: ChannelEntry) => e.id?.trim())
        setChannels(entries)
      }
    } catch { /* ignore */ }
  }

  async function loadFromSupabase(userId: string) {
    const { data: list } = await supabase
      .from("channel_lists")
      .select("id, channel_list_items(channel_id, channel_name, channel_thumbnail)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (!list) {
      // No list record — logged-in user starts with empty list (don't load localStorage)
      setChannels([])
      return
    }

    const loaded: ChannelEntry[] = (list.channel_list_items ?? []).map(
      (i: { channel_id: string; channel_name: string | null; channel_thumbnail: string | null }) => ({
        id: i.channel_id,
        name: i.channel_name ?? i.channel_id,
        thumbnail: i.channel_thumbnail ?? undefined,
      })
    )
    setChannels(loaded)

    // Resolve any entries where name looks like a raw channel ID (UCxxx…)
    const needsResolve = loaded.filter(
      (e) => /^UC[A-Za-z0-9_-]{20,}$/.test(e.name) || e.name === e.id
    )
    if (needsResolve.length === 0) return
    const { data: { session } } = await supabase.auth.getSession()
    const resolved = await Promise.all(
      needsResolve.map(async (e) => {
        try {
          const res = await fetch(`/api/validate-channel?q=${encodeURIComponent(e.id)}`, {
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          })
          const data = await res.json()
          if (data.valid) return { ...e, id: data.channelId, name: data.title, thumbnail: data.thumbnail ?? e.thumbnail }
        } catch { /* keep original */ }
        return e
      })
    )
    const resolvedMap = new Map(resolved.map((e) => [e.id, e]))
    // Also try original IDs (in case channelId changed)
    needsResolve.forEach((orig, idx) => { resolvedMap.set(orig.id, resolved[idx]) })
    const updated = loaded.map((e) => resolvedMap.get(e.id) ?? e)
    setChannels(updated)
    // Persist resolved names to DB
    if (updated.some((e, i) => e.name !== loaded[i].name)) {
      // Re-save with real names using service call pattern
      const listId = list.id
      await supabase.from("channel_list_items").delete().eq("list_id", listId)
      if (updated.length > 0) {
        await supabase.from("channel_list_items").insert(
          updated.map((e) => ({ list_id: listId, channel_id: e.id, channel_name: e.name, channel_thumbnail: e.thumbnail ?? null }))
        )
      }
    }
  }

  async function saveToSupabase(list?: ChannelEntry[]) {
    if (!user) return
    const toSave = list ?? channels
    setSaveStatus("saving")

    let { data: listRow } = await supabase
      .from("channel_lists")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (!listRow) {
      const { data: newList } = await supabase
        .from("channel_lists")
        .insert({ user_id: user.id, name: "Meine Liste" })
        .select("id")
        .single()
      listRow = newList
    }

    if (!listRow) { setSaveStatus("idle"); return }

    await supabase.from("channel_list_items").delete().eq("list_id", listRow.id)
    if (toSave.length > 0) {
      await supabase.from("channel_list_items").insert(
        toSave.map((e) => ({ list_id: listRow!.id, channel_id: e.id, channel_name: e.name, channel_thumbnail: e.thumbnail ?? null }))
      )
    }

    setSaveStatus("saved")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  function persist(updated: ChannelEntry[]) {
    setChannels(updated)
    if (!user) localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function addChannel(entry: ChannelEntry) {
    if (atLimit || channels.some((c) => c.id === entry.id)) return
    persist([...channels, entry])
  }

  function removeChannel(index: number) {
    const updated = channels.filter((_, i) => i !== index)
    persist(updated)
    if (user) saveToSupabase(updated)
  }

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearched(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/search-channels?q=${encodeURIComponent(q)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      setSearchResults(data.channels ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // If query looks like a direct channel URL/ID/handle, offer direct add
  function isDirectInput(q: string) {
    return q.startsWith("UC") || q.startsWith("@") || q.includes("youtube.com")
  }

  function extractHandle(q: string) {
    try {
      const url = new URL(q.startsWith("http") ? q : `https://${q}`)
      const parts = url.pathname.split("/").filter(Boolean)
      const idx = parts.findIndex((p) => p === "channel" || p === "c" || p === "user")
      if (idx !== -1) return parts[idx + 1] ?? q
      const atPart = parts.find((p) => p.startsWith("@"))
      if (atPart) return atPart
      return parts[parts.length - 1] ?? q
    } catch {
      return q
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const channelIds = channels.map((c) => c.id.trim()).filter(Boolean)

    if (channelIds.length === 0) {
      setError("Bitte mindestens einen Channel zur Liste hinzufügen.")
      return
    }

    const parsedMinViews = parseInt(minViews)
    if (isNaN(parsedMinViews) || parsedMinViews < 0) {
      setError("Bitte eine gültige Zahl für Mindestabrufe eingeben.")
      return
    }

    const isCustom = dayRange === "custom"
    if (isCustom && !customFrom) {
      setError("Bitte ein Startdatum wählen.")
      return
    }

    // Build request body
    let analyzeDayRange = parseInt(dayRange)
    let publishedAfter: string | undefined
    let publishedBefore: string | undefined
    if (isCustom) {
      publishedAfter = new Date(customFrom).toISOString()
      publishedBefore = customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined
      const diffMs = (publishedBefore ? new Date(publishedBefore) : new Date()).getTime() - new Date(publishedAfter).getTime()
      analyzeDayRange = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    }

    onLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ channelIds, minViews: parsedMinViews, dayRange: analyzeDayRange, sortBy, maxResults: Math.max(1, parseInt(maxResults) || 15), publishedAfter, publishedBefore }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Ein Fehler ist aufgetreten."); return }
      const summary = `${data.videos.length} Video${data.videos.length !== 1 ? "s" : ""} gefunden über ${data.totalChannels} Channel${data.totalChannels !== 1 ? "s" : ""}`
      // Save scan to history
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase.from("scans").insert({
          user_id: currentUser.id,
          channels: channels.map((c) => ({ id: c.id, name: c.name })),
          day_range: analyzeDayRange,
          min_views: parsedMinViews,
          sort_by: sortBy,
          video_count: data.videos.length,
          results: data.videos,
        })
      }
      onResults(data.videos, summary, data.errors ?? [])
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.")
    } finally {
      onLoading(false)
    }
  }

  async function loadSubscriptions() {
    if (subsOpen) { setSubsOpen(false); return }
    setSubsOpen(true)
    if (subsChannels.length > 0) return
    setSubsLoading(true)
    setSubsError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/subscriptions", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) {
        setSubsError(data.code ?? data.error ?? "Fehler")
      } else {
        setSubsChannels(data.channels ?? [])
      }
    } catch {
      setSubsError("Netzwerkfehler")
    } finally {
      setSubsLoading(false)
    }
  }

  const directEntry: ChannelEntry | null =
    query.trim() && isDirectInput(query.trim())
      ? { id: extractHandle(query.trim()), name: extractHandle(query.trim()) }
      : null

  async function saveOwnChannel() {
    if (!user || !ownChannelInput.trim()) return
    setOwnChannelSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/validate-channel?q=${encodeURIComponent(ownChannelInput.trim())}`, {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    })
    const data = await res.json()
    const channelId = data.valid ? data.channelId : ownChannelInput.trim()
    await supabase.from("profiles").update({ youtube_channel_id: channelId, updated_at: new Date().toISOString() }).eq("id", user.id)
    setOwnChannel(channelId)
    setOwnChannelInput("")
    setOwnChannelSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Own channel hint ── */}
      {user && ownChannel === null && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg px-4 py-3 space-y-2">
          <p className="text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
            <strong>Tipp:</strong> Hinterlege deinen eigenen Channel — der KI-Titelgenerator passt Vorschläge dann auf deinen Stil an.
          </p>
          <div className="flex gap-2">
            <input
              value={ownChannelInput}
              onChange={(e) => setOwnChannelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), saveOwnChannel())}
              placeholder="@DeinChannel"
              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={saveOwnChannel}
              disabled={ownChannelSaving || !ownChannelInput.trim()}
              className="text-xs px-3 py-1.5 rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium shrink-0"
            >
              {ownChannelSaving ? "..." : "Speichern"}
            </button>
          </div>
        </div>
      )}

      {/* ── Filter ── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Filter</p>
        <div className="flex flex-col gap-3">
          <div className="space-y-2">
            <Label htmlFor="minViews" className="text-gray-700 dark:text-gray-300">Mindestabrufe</Label>
            <Input
              id="minViews"
              type="number"
              min="0"
              value={minViews}
              onChange={(e) => setMinViews(e.target.value)}
              className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Zeitraum</Label>
            <Select value={dayRange} onValueChange={setDayRange}>
              <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectItem value="7">Letzte 7 Tage</SelectItem>
                <SelectItem value="30">Letzter Monat</SelectItem>
                <SelectItem value="90">Letzte 3 Monate</SelectItem>
                <SelectItem value="365">Letztes Jahr</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
            {dayRange === "custom" && (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-8 shrink-0">Von</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="flex-1 text-sm px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 dark:text-gray-400 w-8 shrink-0">Bis</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCustomTo(e.target.value)}
                    placeholder="Heute"
                    className="flex-1 text-sm px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">"Bis" leer lassen für heute.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Sortierung</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <SelectItem value="views">Nach Views</SelectItem>
                <SelectItem value="date">Nach Datum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxResults" className="text-gray-700 dark:text-gray-300">Max. Ergebnisse</Label>
            <Input
              id="maxResults"
              type="number"
              min="1"
              max="500"
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm" role="alert">{error}</p>
      )}

      <Button
        type="submit"
        className="w-full h-11 bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-700 dark:hover:bg-gray-200 font-semibold"
      >
        Analysieren
      </Button>

      {/* ── Gespeicherte Channels ── */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Gespeicherte Channels{" "}
            <span className="font-normal normal-case tracking-normal">({channels.length}/{channelLimit})</span>
          </Label>
          <div className="flex items-center gap-3">
            {user && (
              <button
                type="button"
                onClick={loadSubscriptions}
                className={`text-sm transition-colors ${subsOpen ? "text-violet-600 dark:text-violet-400" : "text-violet-500 hover:text-violet-700 dark:hover:text-violet-300"}`}
              >
                {subsOpen ? "Abos schließen" : "Aus Abos laden"}
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={() => saveToSupabase()}
                className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {saveStatus === "saving" ? "Speichern..." : saveStatus === "saved" ? "✓ Gespeichert" : "Liste speichern"}
              </button>
            )}
          </div>
        </div>

        {channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-4 py-5 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Noch keine Channels gespeichert.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5">Suche unten nach Channels und füge sie hinzu.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {channels.map((ch, index) => (
              <div key={ch.id} className="flex items-center gap-3 px-3 py-2.5 group bg-white dark:bg-gray-950 first:rounded-t-lg last:rounded-b-lg">
                {ch.thumbnail && (
                  <img src={ch.thumbnail} alt="" className="w-7 h-7 rounded-full shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.name}</p>
                  {ch.subscriberCount !== undefined && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatSubs(ch.subscriberCount)} Abos</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeChannel(index)}
                  className="text-gray-300 dark:text-gray-700 hover:text-red-400 dark:hover:text-red-500 text-lg leading-none shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Entfernen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}


        {atLimit && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {!user ? (
              <>Maximal 3 Channels ohne Anmeldung.{" "}
                <Link href="/" className="underline hover:text-gray-600 dark:hover:text-gray-300">Anmelden</Link> für bis zu 40.</>
            ) : (
              <>Channel-Limit erreicht.{" "}
                <button type="button" onClick={() => setPricingOpen(true)} className="underline hover:text-gray-600 dark:hover:text-gray-300">Upgrade</button> für mehr.</>
            )}
          </p>
        )}
      </div>

      {/* ── Channel hinzufügen ── */}
      {!atLimit && (
        <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Channel hinzufügen
          </Label>

          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearched(false); setSearchResults([]) }}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
              placeholder="Channel suchen oder URL einfügen"
              className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={searching || !query.trim()}
              onClick={handleSearch}
              className="shrink-0"
            >
              {searching ? "..." : "Suchen"}
            </Button>
          </div>

          {/* Direct-add for URL/handle */}
          {directEntry && !searched && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-mono">{directEntry.id}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Direkt hinzufügen</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession()
                  try {
                    const res = await fetch(`/api/validate-channel?q=${encodeURIComponent(directEntry.id)}`, {
                      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
                    })
                    const data = await res.json()
                    if (data.valid) {
                      addChannel({ id: data.channelId, name: data.title, thumbnail: data.thumbnail })
                    } else {
                      addChannel(directEntry)
                    }
                  } catch {
                    addChannel(directEntry)
                  }
                  setQuery("")
                }}
                disabled={channels.some((c) => c.id === directEntry.id)}
                className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
              >
                {channels.some((c) => c.id === directEntry.id) ? "✓" : "+ Hinzufügen"}
              </button>
            </div>
          )}

          {/* Search results */}
          {searched && searchResults.length === 0 && !searching && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">Keine Channels gefunden.</p>
              <button type="button" onClick={() => { setSearched(false); setQuery("") }} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Schließen</button>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-t-lg border-b border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">{searchResults.length} Ergebnisse</p>
                <button type="button" onClick={() => { setSearchResults([]); setSearched(false); setQuery("") }} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Schließen ×</button>
              </div>
              {searchResults.map((ch) => {
                const isAdded = channels.some((c) => c.id === ch.channelId)
                return (
                  <div key={ch.channelId} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900">
                    {ch.thumbnail && (
                      <img src={ch.thumbnail} alt="" className="w-8 h-8 rounded-full shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.title}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatSubs(ch.subscriberCount)} Abonnenten</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addChannel({ id: ch.channelId, name: ch.title, thumbnail: ch.thumbnail, subscriberCount: ch.subscriberCount })}
                      disabled={isAdded || atLimit}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors text-base"
                    >
                      {isAdded ? "✓" : "+"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />

      {/* Subscriptions modal */}
      {subsOpen && user && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSubsOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col pointer-events-auto" style={{ maxHeight: "70vh" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Abonnements</p>
                  {!subsLoading && !subsError && subsChannels.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">{subsChannels.length} Channels · Klick zum Hinzufügen</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {!subsLoading && !subsError && subsChannels.length > 0 && !atLimit && (
                    <button
                      type="button"
                      onClick={() => {
                        const existingIds = new Set(channels.map((c) => c.id))
                        const toAdd = subsChannels
                          .filter((ch) => !existingIds.has(ch.channelId))
                          .slice(0, channelLimit - channels.length)
                          .map((ch) => ({ id: ch.channelId, name: ch.name, thumbnail: ch.thumbnail ?? undefined, subscriberCount: ch.subscriberCount }))
                        if (toAdd.length === 0) return
                        const updated = [...channels, ...toAdd]
                        persist(updated)
                        if (user) saveToSupabase(updated)
                      }}
                      className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                    >
                      Alle auswählen
                    </button>
                  )}
                  <button type="button" onClick={() => setSubsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none">×</button>
                </div>
              </div>
              {/* Upgrade hint when at limit */}
              {atLimit && (
                <div className="px-5 py-2.5 bg-violet-50 dark:bg-violet-950/30 border-b border-violet-100 dark:border-violet-900/50 flex items-center justify-between gap-3">
                  <p className="text-xs text-violet-700 dark:text-violet-300">Limit erreicht. Mehr Channels mit einem Upgrade.</p>
                  <button type="button" onClick={() => { setSubsOpen(false); setPricingOpen(true) }} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline shrink-0">Upgrade →</button>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {subsLoading && (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-violet-600 animate-spin" />
                      <p className="text-xs text-gray-400">Lade Abonnements...</p>
                    </div>
                  </div>
                )}
                {!subsLoading && subsError === "no_channel" && (
                  <div className="p-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Kein YouTube-Channel hinterlegt.{" "}
                    <Link href="/profil" className="text-violet-500 underline hover:text-violet-700" onClick={() => setSubsOpen(false)}>Zum Profil</Link>{" "}
                    um deinen Channel einzutragen.
                  </div>
                )}
                {!subsLoading && subsError === "private" && (
                  <div className="p-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Deine Abonnements sind auf YouTube nicht öffentlich. Gehe auf YouTube → Einstellungen → Datenschutz → Abonnements auf &quot;Öffentlich&quot; stellen.
                  </div>
                )}
                {!subsLoading && subsError && subsError !== "no_channel" && subsError !== "private" && (
                  <p className="p-6 text-sm text-red-500 dark:text-red-400">{subsError}</p>
                )}
                {!subsLoading && !subsError && subsChannels.length === 0 && (
                  <p className="p-6 text-sm text-gray-400 dark:text-gray-500">Keine Abonnements gefunden.</p>
                )}
                {!subsLoading && !subsError && subsChannels.length > 0 && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {subsChannels.map((ch) => {
                      const isAdded = channels.some((c) => c.id === ch.channelId)
                      return (
                        <div key={ch.channelId} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          {ch.thumbnail
                            ? <img src={ch.thumbnail} alt="" className="w-9 h-9 rounded-full shrink-0" />
                            : <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                          }
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.name}</p>
                            {ch.subscriberCount !== undefined && ch.subscriberCount > 0 && (
                              <p className="text-xs text-gray-400 dark:text-gray-500">{formatSubs(ch.subscriberCount)} Abos</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                const idx = channels.findIndex((c) => c.id === ch.channelId)
                                if (idx !== -1) removeChannel(idx)
                              } else {
                                addChannel({ id: ch.channelId, name: ch.name, thumbnail: ch.thumbnail ?? undefined, subscriberCount: ch.subscriberCount })
                              }
                            }}
                            disabled={!isAdded && atLimit}
                            className={`w-8 h-8 flex items-center justify-center rounded-full border shrink-0 transition-colors text-base ${
                              isAdded
                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 hover:text-red-500"
                                : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                            }`}
                          >
                            {isAdded ? "✓" : "+"}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </form>
  )
}
