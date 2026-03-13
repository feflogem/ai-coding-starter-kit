"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface CompetitorResult {
  channelName: string
  summary: string
  angles: string[]
  titlePatterns: string[]
  topPerformers: { title: string; views: number }[]
}

interface SavedAnalysis {
  id: string
  channel_name: string
  result: CompetitorResult
  created_at: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function CompetitorAnalysis() {
  const [channelInput, setChannelInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompetitorResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<SavedAnalysis[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  async function analyze() {
    const input = channelInput.trim()
    if (!input) return
    setLoading(true)
    setError(null)
    setResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    try {
      const res = await fetch("/api/analyze-competitor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ channelInput: input }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Fehler"); return }
      setResult(data)
      // Save to DB
      if (session?.user) {
        await supabase.from("competitor_analyses").insert({
          user_id: session.user.id,
          channel_name: data.channelName,
          result: data,
        })
      }
      // Refresh history
      loadHistory()
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setLoading(false)
    }
  }

  async function loadHistory() {
    setHistoryLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("competitor_analyses")
      .select("id, channel_name, result, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
    setHistory(data ?? [])
    setHistoryLoading(false)
  }

  useEffect(() => { loadHistory() }, [])

  function showSaved(item: SavedAnalysis) {
    setResult(item.result)
    setChannelInput(item.channel_name)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Competitor Analyse</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Analysiere einen YouTube-Channel — verstehe Angles, Titelmuster und was ihn erfolgreich macht
        </p>
      </div>

      {/* Input */}
      <div className="max-w-xl space-y-2 mb-8">
        <div className="flex gap-2">
          <Input
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="YouTube-Channel @Handle oder URL"
            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
          />
          <Button
            onClick={analyze}
            disabled={loading || !channelInput.trim()}
            className="shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            {loading ? "Analysiere..." : "Analysieren"}
          </Button>
        </div>
        <p className="text-xs text-gray-400">z.B. @MrBeast oder youtube.com/@MrBeast</p>
      </div>

      {error && <p className="mb-6 text-sm text-red-500 dark:text-red-400">{error}</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-5 w-48 bg-gray-100 dark:bg-gray-800" />
          <Skeleton className="h-4 w-full bg-gray-100 dark:bg-gray-800" />
          <Skeleton className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <Skeleton className="h-36 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <Skeleton className="h-36 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="max-w-3xl space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{result.channelName}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{result.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Angles */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Content-Angles</h3>
              </div>
              <ul className="space-y-2">
                {result.angles.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Title Patterns */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Titelmuster</h3>
              </div>
              <ul className="space-y-2">
                {result.titlePatterns.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Top Performers */}
          {result.topPerformers?.length > 0 && (
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top-Videos</h3>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {result.topPerformers.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
                    <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{v.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">{(v.views / 1000).toFixed(0)}K</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past analyses */}
      {!result && !loading && (
        <div className="mt-4 max-w-3xl">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Frühere Analysen</h3>
          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg" />)}
            </div>
          ) : history && history.length > 0 ? (
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => showSaved(item)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                >
                  <span className="text-sm text-gray-900 dark:text-white font-medium">{item.channel_name}</span>
                  <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">Noch keine Analysen gespeichert.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
