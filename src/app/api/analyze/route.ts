import { NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUser, getChannelLimit, getTierAndMonthlyUsage, MONTHLY_LIMITS } from "@/lib/auth-server"

const RequestSchema = z.object({
  channelIds: z.array(z.string().min(1)).min(1).max(40),
  minViews: z.number().int().min(0).default(50000),
  dayRange: z.number().int().min(1).max(1095).default(30),
  sortBy: z.enum(["views", "date"]).default("views"),
  maxResults: z.number().int().min(1).max(500).default(15),
  publishedAfter: z.string().optional(),
  publishedBefore: z.string().optional(),
})

export type VideoResult = {
  videoId: string
  title: string
  channelId: string
  channelTitle: string
  viewCount: number
  subscriberCount: number
  viralityScore: number
  publishedAt: string
  url: string
}

type AnalyzeResponse =
  | { videos: VideoResult[]; totalChannels: number; errors: string[] }
  | { error: string }

async function resolveChannelId(input: string, apiKey: string): Promise<string | null> {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const pathParts = url.pathname.split("/").filter(Boolean)
    if (pathParts[0] === "channel" && pathParts[1]) return pathParts[1]
    if (pathParts[0]?.startsWith("@")) return resolveHandle(pathParts[0], apiKey)
  } catch { /* not a URL */ }
  if (trimmed.startsWith("@")) return resolveHandle(trimmed, apiKey)
  if (trimmed.startsWith("UC")) return trimmed
  return null
}

async function resolveHandle(handle: string, apiKey: string): Promise<string | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels")
  url.searchParams.set("part", "id")
  url.searchParams.set("forHandle", handle)
  url.searchParams.set("key", apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0]?.id ?? null
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  return parseInt(match[1] ?? "0") * 3600 + parseInt(match[2] ?? "0") * 60 + parseInt(match[3] ?? "0")
}

async function fetchUploadsPlaylistId(
  channelId: string,
  apiKey: string
): Promise<{ playlistId: string; channelTitle: string; subscriberCount: number } | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels")
  url.searchParams.set("part", "contentDetails,snippet,statistics")
  url.searchParams.set("id", channelId)
  url.searchParams.set("key", apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return null
  return {
    playlistId: item.contentDetails.relatedPlaylists.uploads,
    channelTitle: item.snippet.title,
    subscriberCount: parseInt(item.statistics?.subscriberCount ?? "0"),
  }
}

const VIRALITY_DIVISOR = 253

function calcViralityScore(viewCount: number, subscriberCount: number, publishedAt: string): number {
  if (subscriberCount === 0 || viewCount === 0) return 0
  const daysOld = Math.max(1, (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24))
  const ratio = viewCount / subscriberCount
  // Penalize underperformance: multiply by ratio when views < subs (ratio < 1 → pushes score down quadratically)
  const outperf = ratio < 1
    ? Math.log10(ratio + 1) * ratio
    : Math.log10(ratio + 1)
  const velocity = Math.sqrt(viewCount / daysOld)
  return Math.min(100, Math.round(outperf * velocity / VIRALITY_DIVISOR * 1000) / 10)
}

async function fetchPlaylistVideoIds(playlistId: string, apiKey: string, maxResults = 25): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
  url.searchParams.set("part", "contentDetails")
  url.searchParams.set("playlistId", playlistId)
  url.searchParams.set("maxResults", String(maxResults))
  url.searchParams.set("key", apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []).map((item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId)
}

async function fetchVideoDetails(videoIds: string[], apiKey: string): Promise<Array<{
  id: string; title: string; channelId: string; channelTitle: string; viewCount: number; publishedAt: string; duration: number
}>> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos")
  url.searchParams.set("part", "snippet,statistics,contentDetails")
  url.searchParams.set("id", videoIds.join(","))
  url.searchParams.set("key", apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.items ?? []).map((item: {
    id: string
    snippet: { title: string; channelId: string; channelTitle: string; publishedAt: string }
    statistics: { viewCount?: string }
    contentDetails: { duration: string }
  }) => ({
    id: item.id,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    viewCount: parseInt(item.statistics.viewCount ?? "0"),
    publishedAt: item.snippet.publishedAt,
    duration: parseDuration(item.contentDetails.duration),
  }))
}

export async function POST(request: Request): Promise<NextResponse<AnalyzeResponse>> {
  // Auth check
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim()
  const user = token ? await getAuthUser(request) : null
  if (!user || !token) {
    return NextResponse.json({ error: "Nicht autorisiert. Bitte einloggen." }, { status: 401 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API-Key nicht konfiguriert" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: `Ungültige Anfrage: ${parsed.error.issues[0]?.message}` }, { status: 400 })
  }

  const { channelIds, minViews, dayRange, sortBy, maxResults, publishedAfter, publishedBefore } = parsed.data
  const uniqueInputs = [...new Set(channelIds.map((id) => id.trim()).filter(Boolean))]

  // Server-side tier + monthly scan limit
  const [channelLimit, { tier, scansThisMonth }] = await Promise.all([
    getChannelLimit(user.id, token),
    getTierAndMonthlyUsage(user.id, token),
  ])
  if (uniqueInputs.length > channelLimit) {
    return NextResponse.json(
      { error: `Dein Plan erlaubt maximal ${channelLimit} Channels pro Analyse. Upgrade für mehr.` },
      { status: 403 }
    )
  }
  const scanLimit = MONTHLY_LIMITS[tier]?.scans ?? 3
  if (scanLimit !== Infinity && scansThisMonth >= scanLimit) {
    return NextResponse.json(
      { error: `Du hast dein monatliches Limit von ${scanLimit} Kanal-Analysen erreicht. Upgrade für mehr.` },
      { status: 429 }
    )
  }

  const cutoffDateAfter = publishedAfter
    ? new Date(publishedAfter)
    : (() => { const d = new Date(); d.setDate(d.getDate() - dayRange); return d })()
  const cutoffDateBefore = publishedBefore ? new Date(publishedBefore) : null

  const errors: string[] = []
  const allVideos: VideoResult[] = []

  await Promise.all(
    uniqueInputs.map(async (input) => {
      try {
        const channelId = await resolveChannelId(input, apiKey)
        if (!channelId) {
          errors.push(`Channel nicht gefunden: ${input}`)
          return
        }
        const channelInfo = await fetchUploadsPlaylistId(channelId, apiKey)
        if (!channelInfo) {
          errors.push(`Channel nicht gefunden: ${channelId}`)
          return
        }

        const videoIds = await fetchPlaylistVideoIds(channelInfo.playlistId, apiKey, 25)
        if (videoIds.length === 0) return

        const videos = await fetchVideoDetails(videoIds, apiKey)

        for (const video of videos) {
          if (video.duration < 60) continue
          if (new Date(video.publishedAt) < cutoffDateAfter) continue
          if (cutoffDateBefore && new Date(video.publishedAt) > cutoffDateBefore) continue
          if (video.viewCount < minViews) continue

          allVideos.push({
            videoId: video.id,
            title: video.title,
            channelId: video.channelId,
            channelTitle: video.channelTitle,
            viewCount: video.viewCount,
            subscriberCount: channelInfo.subscriberCount,
            viralityScore: calcViralityScore(video.viewCount, channelInfo.subscriberCount, video.publishedAt),
            publishedAt: video.publishedAt,
            url: `https://www.youtube.com/watch?v=${video.id}`,
          })
        }
      } catch {
        errors.push(`Fehler beim Laden von Channel: ${input}`)
      }
    })
  )

  allVideos.sort((a, b) => {
    if (sortBy === "views") return b.viewCount - a.viewCount
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  return NextResponse.json({
    videos: allVideos.slice(0, maxResults),
    totalChannels: uniqueInputs.length - errors.length,
    errors,
  })
}
