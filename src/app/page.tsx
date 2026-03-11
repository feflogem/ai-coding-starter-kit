"use client"

import { useState } from "react"
import { ChannelInputForm } from "@/components/ChannelInputForm"
import { VideoTable } from "@/components/VideoTable"
import { TitleGeneratorPanel } from "@/components/TitleGeneratorPanel"
import { ThemeToggle } from "@/components/ThemeToggle"
import type { VideoResult } from "@/app/api/analyze/route"

export default function Home() {
  const [view, setView] = useState<"input" | "results">("input")
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
    setView("results")
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
    <main className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10 flex items-start justify-between">
        <div>
          {view === "results" ? (
            <button
              onClick={() => setView("input")}
              className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-3 transition-colors"
            >
              ← Zurück
            </button>
          ) : null}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Viral Tracker</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            {view === "input"
              ? "Finde die performantesten Videos deiner Konkurrenz-Channels"
              : summary}
          </p>
        </div>
        <ThemeToggle />
      </div>

      {view === "input" ? (
        <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <ChannelInputForm onResults={handleResults} onLoading={setIsLoading} />
        </div>
      ) : (
        <>
          <VideoTable
            videos={videos}
            isLoading={isLoading}
            summary={summary}
            errors={errors}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
          />
          <TitleGeneratorPanel selectedVideos={selectedVideos} />
        </>
      )}
    </main>
  )
}
