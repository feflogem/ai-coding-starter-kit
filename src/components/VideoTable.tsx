"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import type { VideoResult } from "@/app/api/analyze/route"

function formatViews(views: number): string {
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`
  if (views >= 1_000) return `${(views / 1_000).toFixed(0)}K`
  return views.toString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

type SortKey = "rank" | "viewCount" | "subscriberCount" | "viralityScore" | "publishedAt"
type SortDir = "asc" | "desc"

interface VideoTableProps {
  videos: VideoResult[]
  isLoading: boolean
  summary?: string
  errors?: string[]
  selectedIds?: Set<string>
  onSelectionChange?: (id: string, checked: boolean) => void
}

export function VideoTable({
  videos,
  isLoading,
  summary,
  errors,
  selectedIds,
  onSelectionChange,
}: VideoTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("rank")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const selectable = !!onSelectionChange

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-gray-300 dark:text-gray-700">↕</span>
    return <span className="ml-1 text-gray-500 dark:text-gray-300">{sortDir === "desc" ? "↓" : "↑"}</span>
  }

  const sorted = useMemo(() => {
    if (sortKey === "rank") return videos
    return [...videos].sort((a, b) => {
      let diff = 0
      if (sortKey === "viewCount") diff = a.viewCount - b.viewCount
      else if (sortKey === "subscriberCount") diff = a.subscriberCount - b.subscriberCount
      else if (sortKey === "viralityScore") diff = a.viralityScore - b.viralityScore
      else if (sortKey === "publishedAt")
        diff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      return sortDir === "desc" ? -diff : diff
    })
  }, [videos, sortKey, sortDir])

  if (isLoading) {
    return (
      <div className="space-y-3 mt-8">
        <Skeleton className="h-5 w-48 bg-gray-200 dark:bg-gray-800" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-gray-500 dark:text-gray-400 text-sm">{summary}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {selectable && selectedIds && selectedIds.size > 0 && (
            <Badge className="bg-gray-900 dark:bg-white text-white dark:text-gray-950 text-xs">
              {selectedIds.size} / 5 ausgewählt
            </Badge>
          )}
          {errors && errors.length > 0 && errors.map((err, i) => (
            <Badge key={i} variant="destructive" className="text-xs">{err}</Badge>
          ))}
        </div>
      </div>

      {selectable && (
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          Markiere bis zu 5 Videos als Inspiration für den Titelgenerator.
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg">Keine Videos gefunden</p>
          <p className="text-sm mt-1">Versuche die Filter anzupassen.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800">
          <Table className="table-fixed w-full text-[13px]">
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-gray-800 hover:bg-transparent">
                {selectable && <TableHead className="w-8" />}
                <TableHead
                  className="text-gray-500 dark:text-gray-400 w-8 cursor-pointer select-none"
                  onClick={() => handleSort("rank")}
                >
                  # <SortIcon col="rank" />
                </TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400">Titel</TableHead>
                <TableHead className="text-gray-500 dark:text-gray-400 w-44">Channel</TableHead>
                <TableHead
                  className="text-gray-500 dark:text-gray-400 text-right cursor-pointer select-none w-16"
                  onClick={() => handleSort("viewCount")}
                >
                  Views <SortIcon col="viewCount" />
                </TableHead>
                <TableHead
                  className="text-gray-500 dark:text-gray-400 text-right cursor-pointer select-none w-16"
                  onClick={() => handleSort("subscriberCount")}
                >
                  Subs <SortIcon col="subscriberCount" />
                </TableHead>
                <TableHead
                  className="text-gray-500 dark:text-gray-400 text-right cursor-pointer select-none w-24"
                  onClick={() => handleSort("viralityScore")}
                >
                  Viral-Score <SortIcon col="viralityScore" />
                </TableHead>
                <TableHead
                  className="text-gray-500 dark:text-gray-400 cursor-pointer select-none w-24"
                  onClick={() => handleSort("publishedAt")}
                >
                  Datum <SortIcon col="publishedAt" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((video, index) => {
                const isChecked = selectedIds?.has(video.videoId) ?? false
                const isDisabled = !isChecked && (selectedIds?.size ?? 0) >= 5
                const score = video.viralityScore

                return (
                  <TableRow
                    key={video.videoId}
                    className={`border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer ${isChecked ? "bg-gray-100 dark:bg-gray-900" : ""}`}
                    onClick={() => {
                      if (selectable && !isDisabled) {
                        onSelectionChange?.(video.videoId, !isChecked)
                      } else if (!selectable) {
                        window.open(video.url, "_blank")
                      }
                    }}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={(checked) =>
                            onSelectionChange?.(video.videoId, !!checked)
                          }
                          className="border-gray-400 dark:border-gray-600"
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-gray-400 dark:text-gray-500 py-2">{index + 1}</TableCell>
                    <TableCell className="py-2">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={video.title}
                        className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {video.title}
                      </a>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs truncate max-w-full block text-center">
                        {video.channelTitle}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-800 dark:text-gray-200 py-2">
                      {formatViews(video.viewCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-gray-500 dark:text-gray-400 py-2">
                      {formatViews(video.subscriberCount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs py-2">
                      <span className={
                        score >= 10 ? "text-green-600 dark:text-green-400" :
                        score >= 3 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-gray-500 dark:text-gray-400"
                      }>
                        {score.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs py-2">
                      {formatDate(video.publishedAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
