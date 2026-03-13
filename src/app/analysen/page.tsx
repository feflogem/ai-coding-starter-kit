"use client"

import { useState } from "react"
import { AppShell } from "@/components/AppShell"
import { ChannelInputForm } from "@/components/ChannelInputForm"
import { VideoTable } from "@/components/VideoTable"
import { TitleGeneratorPanel } from "@/components/TitleGeneratorPanel"
import { PatternAnalysis } from "@/components/PatternAnalysis"
import { CompetitorAnalysis } from "@/components/CompetitorAnalysis"
import type { VideoResult } from "@/app/api/analyze/route"

type Tab = "viral" | "competitor"

export default function AnalysenPage() {
  const [tab, setTab] = useState<Tab>("viral")
  const [videos, setVideos] = useState<VideoResult[]>([])
  const [summary, setSummary] = useState<string | undefined>()
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function handleResults(results: VideoResult[], resultSummary: string, resultErrors: string[]) {
    setVideos(results)
    setSummary(resultSummary)
    setErrors(resultErrors)
    setSelectedIds(new Set())
  }

  function handleSelectionChange(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectedVideos = videos.filter((v) => selectedIds.has(v.videoId))

  return (
    <AppShell>
      <div className="px-8 py-8">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setTab("viral")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "viral"
                ? "border-violet-600 text-violet-600 dark:text-violet-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Viral Video Tracker
          </button>
          <button
            onClick={() => setTab("competitor")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "competitor"
                ? "border-violet-600 text-violet-600 dark:text-violet-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Competitor Analyse
          </button>
        </div>

        {/* ── Viral Tracker Tab ── */}
        {tab === "viral" && (
          <div className="flex gap-6 items-start">
            {/* Left: Input panel (sticky) */}
            <div className="w-80 shrink-0">
              <div className="sticky top-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Kanal-Analyse
                </p>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <ChannelInputForm onResults={handleResults} onLoading={setIsLoading} />
                </div>
              </div>
            </div>

            {/* Right: Results */}
            <div className="flex-1 min-w-0">
              {isLoading && (
                <div className="flex items-center justify-center py-24">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-violet-600 animate-spin" />
                    <p className="text-sm text-gray-400">Analysiere Channels…</p>
                  </div>
                </div>
              )}

              {!isLoading && videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Noch keine Ergebnisse</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Channels links hinzufügen und auf Analysieren klicken.
                  </p>
                </div>
              )}

              {!isLoading && videos.length > 0 && (
                <div className="animate-in fade-in duration-300">
                  {summary && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{summary}</p>
                  )}
                  <VideoTable
                    videos={videos}
                    isLoading={false}
                    summary={summary}
                    errors={errors}
                    selectedIds={selectedIds}
                    onSelectionChange={handleSelectionChange}
                  />
                  <PatternAnalysis videos={videos} />
                  <TitleGeneratorPanel selectedVideos={selectedVideos} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Competitor Tab ── */}
        {tab === "competitor" && <CompetitorAnalysis />}
      </div>
    </AppShell>
  )
}
