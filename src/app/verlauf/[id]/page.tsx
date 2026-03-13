"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { VideoTable } from "@/components/VideoTable"
import { PatternAnalysis } from "@/components/PatternAnalysis"
import { TitleGeneratorPanel } from "@/components/TitleGeneratorPanel"
import { supabase } from "@/lib/supabase"
import type { VideoResult } from "@/app/api/analyze/route"

interface ChannelEntry {
  id: string
  name: string
}

interface Scan {
  id: string
  channels: ChannelEntry[]
  day_range: number
  min_views: number
  video_count: number
  created_at: string
  results: VideoResult[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ScanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [scan, setScan] = useState<Scan | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return }
      const { data: scanData } = await supabase
        .from("scans")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", data.user.id)
        .single()
      setScan(scanData ?? null)
      setLoading(false)
    })
  }, [params.id, router])

  function handleSelectionChange(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const selectedVideos = (scan?.results ?? []).filter((v) => selectedIds.has(v.videoId))

  if (loading) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <div className="space-y-3">
            <div className="h-7 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </AppShell>
    )
  }

  if (!scan) {
    return (
      <AppShell>
        <div className="px-8 py-8">
          <button
            onClick={() => router.push("/verlauf")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-base">←</span> Verlauf
          </button>
          <p className="text-sm text-gray-500">Analyse nicht gefunden.</p>
        </div>
      </AppShell>
    )
  }

  const channelNames = Array.isArray(scan.channels)
    ? scan.channels.map((c) => c.name ?? c.id).join(", ")
    : "—"

  const summary = `${scan.video_count} Video${scan.video_count !== 1 ? "s" : ""} · ${scan.day_range} Tage · ${channelNames}`

  return (
    <AppShell>
      <div className="px-8 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/verlauf")}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-5 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-base">←</span> Verlauf
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{channelNames}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDate(scan.created_at)}</p>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            `Zeitraum: ${scan.day_range} Tage`,
            `Min. Views: ${scan.min_views.toLocaleString("de-DE")}`,
            `${scan.video_count} Videos gefunden`,
          ].map((label) => (
            <span key={label} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
              {label}
            </span>
          ))}
        </div>

        {scan.results?.length > 0 ? (
          <div className="animate-in fade-in duration-300">
            <VideoTable
              videos={scan.results}
              isLoading={false}
              summary={summary}
              errors={[]}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
            />
            <PatternAnalysis videos={scan.results} />
            <TitleGeneratorPanel selectedVideos={selectedVideos} />
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
            <p className="text-sm text-gray-400">Keine gespeicherten Ergebnisse für diesen Scan.</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
              Ältere Scans wurden ohne Ergebnisse gespeichert — führe den Scan erneut durch.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
