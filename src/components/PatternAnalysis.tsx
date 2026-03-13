"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
import type { VideoResult } from "@/app/api/analyze/route"
import type { PatternAnalysis as PatternAnalysisType } from "@/app/api/analyze-patterns/route"

interface PatternAnalysisProps {
  videos: VideoResult[]
}

export function PatternAnalysis({ videos }: PatternAnalysisProps) {
  const [analysis, setAnalysis] = useState<PatternAnalysisType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (videos.length === 0) return
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)
      setAnalysis(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      try {
        const res = await fetch("/api/analyze-patterns", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            videos: videos.slice(0, 30).map((v) => ({
              title: v.title,
              channelTitle: v.channelTitle,
              viewCount: v.viewCount,
            })),
          }),
        })
        if (cancelled) return
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? "Fehler"); return }
        setAnalysis(data)
      } catch {
        if (!cancelled) setError("Netzwerkfehler")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [videos])

  if (videos.length === 0) return null

  return (
    <div className="mt-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Muster & Erkenntnisse</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">KI-Analyse der viralen Titel</span>
      </div>

      {loading && (
        <div className="space-y-2.5 pt-1">
          <Skeleton className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800" />
          <Skeleton className="h-3.5 w-full bg-gray-100 dark:bg-gray-800" />
          <Skeleton className="h-3.5 w-5/6 bg-gray-100 dark:bg-gray-800" />
          <Skeleton className="h-3.5 w-4/6 bg-gray-100 dark:bg-gray-800" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {analysis && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{analysis.summary}</p>
          <ul className="space-y-2">
            {analysis.patterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-500 dark:text-gray-400">
                <span className="mt-1 w-1 h-1 rounded-full bg-violet-400 dark:bg-violet-500 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
