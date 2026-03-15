"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/AppShell"
import { supabase } from "@/lib/supabase"

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
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export default function VerlaufPage() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function deleteScan(e: React.MouseEvent, scanId: string) {
    e.stopPropagation()
    setDeletingId(scanId)
    await supabase.from("scans").delete().eq("id", scanId)
    setScans((prev) => prev.filter((s) => s.id !== scanId))
    setDeletingId(null)
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/"); return }
      const { data: scanData } = await supabase
        .from("scans")
        .select("id, channels, day_range, min_views, video_count, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(100)
      setScans(scanData ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <AppShell>
      <div className="px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verlauf</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Vergangene Analysen — klicke auf eine Zeile um die Ergebnisse wieder aufzurufen
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-16 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Noch keine Analysen</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1.5">
              Geh zu{" "}
              <Link href="/analysen" className="font-medium text-violet-500 hover:text-violet-400 transition-colors">
                Analysen
              </Link>{" "}
              und starte deinen ersten Scan.
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_70px_140px_32px] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Zeitraum</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Min. Views</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Videos</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Datum</span>
              <span />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {scans.map((scan) => {
                const channelNames = Array.isArray(scan.channels)
                  ? scan.channels.map((c) => c.name ?? c.id).join(", ")
                  : "—"
                return (
                  <div
                    key={scan.id}
                    onClick={() => router.push(`/verlauf/${scan.id}`)}
                    className="grid grid-cols-[1fr_80px_80px_70px_140px_32px] gap-4 px-5 py-3.5 items-center hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors group cursor-pointer"
                  >
                    <p className="text-sm text-gray-900 dark:text-white truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                      {channelNames}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-right">{scan.day_range}d</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-right">{formatViews(scan.min_views)}</p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-right">{scan.video_count}</p>
                    <p className="text-xs text-gray-400 text-right">{formatDate(scan.created_at)}</p>
                    <button
                      onClick={(e) => deleteScan(e, scan.id)}
                      disabled={deletingId === scan.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30"
                      title="Analyse löschen"
                    >
                      {deletingId === scan.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V4" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
