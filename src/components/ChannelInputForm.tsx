"use client"

import { useState, useEffect } from "react"
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
}

interface SearchResult {
  channelId: string
  title: string
  thumbnail: string
  subscriberCount: number
}

const STORAGE_KEY = "viral-tracker-channels"
const TIER_LIMITS: Record<string, number> = { free: 3, basic: 10, premium: 40 }

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
  const [sortBy, setSortBy] = useState("views")
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")

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
      .select("id, channel_list_items(channel_id, channel_name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single()

    if (list?.channel_list_items?.length) {
      setChannels(
        list.channel_list_items.map((i: { channel_id: string; channel_name: string | null }) => ({
          id: i.channel_id,
          name: i.channel_name ?? i.channel_id,
        }))
      )
    } else {
      loadFromLocalStorage()
    }
  }

  async function saveToSupabase() {
    if (!user) return
    setSaveStatus("saving")

    let { data: list } = await supabase
      .from("channel_lists")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (!list) {
      const { data: newList } = await supabase
        .from("channel_lists")
        .insert({ user_id: user.id, name: "Meine Liste" })
        .select("id")
        .single()
      list = newList
    }

    if (!list) { setSaveStatus("idle"); return }

    await supabase.from("channel_list_items").delete().eq("list_id", list.id)
    if (channels.length > 0) {
      await supabase.from("channel_list_items").insert(
        channels.map((e) => ({ list_id: list!.id, channel_id: e.id, channel_name: e.name }))
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
    persist(channels.filter((_, i) => i !== index))
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

    onLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ channelIds, minViews: parsedMinViews, dayRange: parseInt(dayRange), sortBy }),
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
          day_range: parseInt(dayRange),
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

  const directEntry: ChannelEntry | null =
    query.trim() && isDirectInput(query.trim())
      ? { id: extractHandle(query.trim()), name: extractHandle(query.trim()) }
      : null

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Gespeicherte Channels ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Gespeicherte Channels{" "}
            <span className="font-normal normal-case tracking-normal">({channels.length}/{channelLimit})</span>
          </Label>
          {user && channels.length > 0 && (
            <button
              type="button"
              onClick={saveToSupabase}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {saveStatus === "saving" ? "Speichern..." : saveStatus === "saved" ? "✓ Gespeichert" : "Liste speichern"}
            </button>
          )}
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
                <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{ch.name}</p>
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

        {!user && atLimit && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Maximal 3 Channels ohne Anmeldung.{" "}
            <span className="underline cursor-pointer">Anmelden</span> für bis zu 40.
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
                onClick={() => { addChannel(directEntry); setQuery("") }}
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
                      onClick={() => addChannel({ id: ch.channelId, name: ch.title, thumbnail: ch.thumbnail })}
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

      {/* ── Filter ── */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
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
                <SelectItem value="14">Letzte 14 Tage</SelectItem>
                <SelectItem value="30">Letzte 30 Tage</SelectItem>
                <SelectItem value="90">Letzte 90 Tage</SelectItem>
              </SelectContent>
            </Select>
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
    </form>
  )
}
