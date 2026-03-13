"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface Channel {
  channelId: string
  title: string
  description: string
  thumbnail: string
  subscriberCount: number
  videoCount: number
}

interface ChannelSearchProps {
  onAdd: (channelId: string, channelName: string) => void
  onClose: () => void
  disabledIds: string[]
  atLimit: boolean
}

function formatSubs(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function ChannelSearch({ onAdd, onClose, disabledIds, atLimit }: ChannelSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Channel[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const res = await fetch(`/api/search-channels?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data.channels ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Channel-Suche</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          placeholder='z.B. "Finance Tips" oder "Travel Vlog"'
          className="bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 text-sm"
          autoFocus
        />
        <Button type="button" variant="outline" size="sm" disabled={loading || !query.trim()} onClick={handleSearch}>
          {loading ? "..." : "Suchen"}
        </Button>
      </div>

      {searched && results.length === 0 && !loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Keine Channels gefunden.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
          {results.map((ch) => {
            const isAdded = disabledIds.includes(ch.channelId)
            return (
              <div key={ch.channelId} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
                {ch.thumbnail && (
                  <img src={ch.thumbnail} alt="" className="w-8 h-8 rounded-full shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ch.title}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatSubs(ch.subscriberCount)} Abonnenten</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(ch.channelId, ch.title)}
                  disabled={isAdded || atLimit}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-colors"
                >
                  {isAdded ? "✓" : "+ Hinzufügen"}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
