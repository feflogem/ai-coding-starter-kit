"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import type { VideoResult } from "@/app/api/analyze/route"
import type { TitleSuggestion } from "@/app/api/generate-titles/route"

const STORAGE_KEY = "viral-tracker-own-channel-id"

interface TitleGeneratorPanelProps {
  selectedVideos: VideoResult[]
}

export function TitleGeneratorPanel({ selectedVideos }: TitleGeneratorPanelProps) {
  const [ownChannelId, setOwnChannelId] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [profileChannelId, setProfileChannelId] = useState<string | null>(null) // null = loading, "" = not set
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session?.user) {
        setIsLoggedIn(true)
        setAccessToken(session.access_token)
        localStorage.removeItem(STORAGE_KEY) // clear stale cache for logged-in users
        const { data: profile } = await supabase
          .from("profiles")
          .select("youtube_channel_id")
          .eq("id", session.user.id)
          .single()
        if (cancelled) return
        setProfileChannelId(profile?.youtube_channel_id ?? "")
        setOwnChannelId(profile?.youtube_channel_id ?? "")
      } else {
        setIsLoggedIn(false)
        setProfileChannelId("")
        const saved = localStorage.getItem(STORAGE_KEY)
        if (!cancelled && saved) setOwnChannelId(saved)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function handleChannelIdChange(value: string) {
    setOwnChannelId(value)
    localStorage.setItem(STORAGE_KEY, value)
  }

  async function handleGenerate() {
    setError(null)
    setSuggestions([])
    setIsLoading(true)

    try {
      const res = await fetch("/api/generate-titles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ownChannelId: ownChannelId.trim(),
          inspirationVideos: selectedVideos.map((v) => ({
            videoId: v.videoId,
            title: v.title,
            channelTitle: v.channelTitle,
            viewCount: v.viewCount,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Ein Fehler ist aufgetreten."); return }
      setSuggestions(data.suggestions)
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy(title: string, index: number) {
    await navigator.clipboard.writeText(title)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const channelReady = ownChannelId.trim().length > 0

  return (
    <div className="mt-8 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Titelgenerator</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Wähle oben Videos als Inspiration aus — die KI generiert passende Titel für deinen Channel.
        </p>
      </div>

      {/* Channel-Bereich */}
      {isLoggedIn && profileChannelId !== null ? (
        profileChannelId ? (
          // Channel hinterlegt → kompakte Anzeige
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 dark:text-gray-500">Dein Channel</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">{profileChannelId}</p>
            </div>
            <Link
              href="/profil"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
            >
              Ändern →
            </Link>
          </div>
        ) : (
          // Eingeloggt aber kein Channel hinterlegt
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-300">Kein Channel hinterlegt</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Hinterlege deinen YouTube Channel im Profil, um Titelideen zu generieren.
              </p>
            </div>
            <Link href="/profil">
              <Button size="sm" variant="outline" className="shrink-0">
                Zum Profil →
              </Button>
            </Link>
          </div>
        )
      ) : !isLoggedIn ? (
        // Nicht eingeloggt → lokales Input-Feld
        <div className="space-y-2">
          <Label htmlFor="ownChannel" className="text-gray-700 dark:text-gray-300">
            Deine Channel-ID
          </Label>
          <Input
            id="ownChannel"
            placeholder="UCxxxxxxxxxxxxxxxxxxxxxx oder @DeinChannel"
            value={ownChannelId}
            onChange={(e) => handleChannelIdChange(e.target.value)}
            className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          />
          <p className="text-gray-400 dark:text-gray-600 text-xs">Wird lokal gespeichert.</p>
        </div>
      ) : null /* loading */ }

      {/* Generate Button */}
      {(profileChannelId || !isLoggedIn) && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleGenerate}
            disabled={selectedVideos.length === 0 || !channelReady || isLoading}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-700 dark:hover:bg-gray-200 font-semibold disabled:opacity-40"
          >
            {isLoading ? "Generiere..." : "Titel-Ideen generieren"}
          </Button>
          {selectedVideos.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Markiere mindestens 1 Video als Inspiration.
            </p>
          )}
          {selectedVideos.length > 0 && !isLoading && (
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {selectedVideos.length} Video{selectedVideos.length !== 1 ? "s" : ""} ausgewählt
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm" role="alert">{error}</p>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-500 dark:text-gray-400 text-sm">{suggestions.length} Titel-Ideen generiert</p>
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-900 dark:text-white font-medium leading-snug">{s.title}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(s.title, i)}
                  className="border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0 text-xs"
                >
                  {copiedIndex === i ? "Kopiert!" : "Kopieren"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs">
                  Vorlage: {s.inspirationTitle}
                </Badge>
                <Badge variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs">
                  {s.swappedComponent}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
