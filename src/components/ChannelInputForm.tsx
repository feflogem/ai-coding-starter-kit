"use client"

import { useState } from "react"
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
import type { VideoResult } from "@/app/api/analyze/route"

interface ChannelInputFormProps {
  onResults: (videos: VideoResult[], summary: string, errors: string[]) => void
  onLoading: (loading: boolean) => void
}

const STORAGE_KEY = "viral-tracker-channels"

export function ChannelInputForm({ onResults, onLoading }: ChannelInputFormProps) {
  const [channels, setChannels] = useState<string[]>(() => {
    if (typeof window === "undefined") return [""]
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : null
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [""]
    } catch {
      return [""]
    }
  })
  const [minViews, setMinViews] = useState("50000")
  const [dayRange, setDayRange] = useState("30")
  const [sortBy, setSortBy] = useState("views")
  const [error, setError] = useState<string | null>(null)

  function saveChannels(updated: string[]) {
    setChannels(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function updateChannel(index: number, value: string) {
    saveChannels(channels.map((c, i) => (i === index ? value : c)))
  }

  function addChannel() {
    if (channels.length < 10) saveChannels([...channels, ""])
  }

  function removeChannel(index: number) {
    saveChannels(channels.length === 1 ? [""] : channels.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const channelIds = channels.map((c) => c.trim()).filter(Boolean)

    if (channelIds.length === 0) {
      setError("Bitte mindestens einen Channel eingeben.")
      return
    }

    const parsedMinViews = parseInt(minViews)
    if (isNaN(parsedMinViews) || parsedMinViews < 0) {
      setError("Bitte eine gültige Zahl für Mindestabrufe eingeben.")
      return
    }

    onLoading(true)
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelIds,
          minViews: parsedMinViews,
          dayRange: parseInt(dayRange),
          sortBy,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Ein Fehler ist aufgetreten.")
        return
      }

      const summary = `${data.videos.length} Video${data.videos.length !== 1 ? "s" : ""} gefunden über ${data.totalChannels} Channel${data.totalChannels !== 1 ? "s" : ""}`
      onResults(data.videos, summary, data.errors ?? [])
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.")
    } finally {
      onLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label className="text-gray-700 dark:text-gray-300">
          Channels{" "}
          <span className="text-gray-400 dark:text-gray-500 font-normal">
            (ID, @handle oder YouTube-Link · max. 10)
          </span>
        </Label>

        <div className="space-y-2">
          {channels.map((channel, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                value={channel}
                onChange={(e) => updateChannel(index, e.target.value)}
                placeholder="UCxxxxx, @ChannelName oder youtube.com/@..."
                className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => removeChannel(index)}
                className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 text-lg leading-none px-1 shrink-0"
                aria-label="Channel entfernen"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {channels.length < 10 && (
          <button
            type="button"
            onClick={addChannel}
            className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
          >
            <span className="text-lg leading-none">+</span> Channel hinzufügen
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minViews" className="text-gray-700 dark:text-gray-300">
            Mindestabrufe
          </Label>
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

      {error && (
        <p className="text-red-500 dark:text-red-400 text-sm" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-700 dark:hover:bg-gray-200 font-semibold"
      >
        Analysieren
      </Button>
    </form>
  )
}
