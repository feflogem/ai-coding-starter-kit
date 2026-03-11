"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { VideoResult } from "@/app/api/analyze/route"
import type { TitleSuggestion } from "@/app/api/generate-titles/route"

const STORAGE_KEY = "viral-tracker-own-channel-id"

interface TitleGeneratorPanelProps {
  selectedVideos: VideoResult[]
}

export function TitleGeneratorPanel({ selectedVideos }: TitleGeneratorPanelProps) {
  const [ownChannelId, setOwnChannelId] = useState("")
  const [suggestions, setSuggestions] = useState<TitleSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setOwnChannelId(saved)
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
        headers: { "Content-Type": "application/json" },
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
      if (!res.ok) {
        setError(data.error ?? "Ein Fehler ist aufgetreten.")
        return
      }
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

  return (
    <div className="mt-8 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-gray-900 dark:text-white font-semibold text-lg">Titelgenerator</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Hinterlege deinen Channel — die KI analysiert deine Top-Videos und generiert passende Titel-Ideen.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ownChannel" className="text-gray-700 dark:text-gray-300">
          Deine Channel-ID
        </Label>
        <Input
          id="ownChannel"
          placeholder="UCxxxxxxxxxxxxxxxxxxxxxx"
          value={ownChannelId}
          onChange={(e) => handleChannelIdChange(e.target.value)}
          className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-mono text-sm"
        />
        <p className="text-gray-400 dark:text-gray-600 text-xs">Wird lokal gespeichert — bleibt nach Reload erhalten.</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleGenerate}
          disabled={selectedVideos.length === 0 || !ownChannelId.trim() || isLoading}
          className="bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-700 dark:hover:bg-gray-200 font-semibold disabled:opacity-40"
        >
          {isLoading ? "Generiere..." : "Titel-Ideen generieren"}
        </Button>
        {selectedVideos.length === 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Bitte markiere mindestens 1 Video als Inspiration.
          </p>
        )}
        {selectedVideos.length > 0 && (
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            {selectedVideos.length} Video{selectedVideos.length !== 1 ? "s" : ""} als Inspiration ausgewählt
          </p>
        )}
      </div>

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
