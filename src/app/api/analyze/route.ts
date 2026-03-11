import { NextResponse } from "next/server"
import { z } from "zod"

const RequestSchema = z.object({
  channelIds: z.array(z.string().min(1)).min(1).max(10),
  minViews: z.number().int().min(0).default(50000),
  dayRange: z.number().int().min(1).max(365).default(30),
  sortBy: z.enum(["views", "date"]).default("views"),
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

// Resolve URL, handle, or raw ID to a YouTube channel ID
// Supports: UCxxxx, @handle, youtube.com/@handle, youtube.com/channel/UCxxxx
async function resolveChannelId(input: string, apiKey: string): Promise<string | null> {
  const trimmed = input.trim()

  // Extract from URL
  try {
    const url = new URL(trimmed)
    const pathParts = url.pathname.split("/").filter(Boolean)
    if (pathParts[0] === "channel" && pathParts[1]) return pathParts[1]
    if (pathParts[0]?.startsWith("@")) {
      return resolveHandle(pathParts[0], apiKey)
    }
  } catch {
    // Not a URL — continue
  }

  // @handle without URL
  if (trimmed.startsWith("@")) return resolveHandle(trimmed, apiKey)

  // Already a channel ID (UC...)
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

// ISO 8601 duration (e.g. PT4M13S) → seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] ?? "0")
  const minutes = parseInt(match[2] ?? "0")
  const seconds = parseInt(match[3] ?? "0")
  return hours * 3600 + minutes * 60 + seconds
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

function calcViralityScore(viewCount: number, subscriberCount: number, publishedAt: string): number {
  if (subscriberCount === 0) return 0
  const daysSince = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  const decay = Math.exp(-0.05 * daysSince)
  return Math.round((viewCount / subscriberCount) * decay * 100) / 100
}

async function fetchPlaylistVideoIds(
  playlistId: string,
  apiKey: string,
  maxResults = 25
): Promise<string[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
  url.searchParams.set("part", "contentDetails")
  url.searchParams.set("playlistId", playlistId)
  url.searchParams.set("maxResults", String(maxResults))
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json()
  return (data.items ?? []).map(
    (item: { contentDetails: { videoId: string } }) =>
      item.contentDetails.videoId
  )
}

async function fetchVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<
  Array<{
    id: string
    title: string
    channelId: string
    channelTitle: string
    viewCount: number
    publishedAt: string
    duration: number
  }>
> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos")
  url.searchParams.set("part", "snippet,statistics,contentDetails")
  url.searchParams.set("id", videoIds.join(","))
  url.searchParams.set("key", apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const data = await res.json()
  return (data.items ?? []).map(
    (item: {
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
    })
  )
}

export async function POST(request: Request): Promise<NextResponse<AnalyzeResponse>> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid request: ${parsed.error.issues[0]?.message}` },
      { status: 400 }
    )
  }

  const { channelIds, minViews, dayRange, sortBy } = parsed.data
  const uniqueInputs = [...new Set(channelIds.map((id) => id.trim()).filter(Boolean))]
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - dayRange)

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
          errors.push(`Channel not found: ${channelId}`)
          return
        }

        const videoIds = await fetchPlaylistVideoIds(channelInfo.playlistId, apiKey, 25)
        if (videoIds.length === 0) return

        const videos = await fetchVideoDetails(videoIds, apiKey)

        for (const video of videos) {
          // Filter out Shorts (< 60 seconds)
          if (video.duration < 60) continue

          // Filter by date range
          if (new Date(video.publishedAt) < cutoffDate) continue

          // Filter by min views
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
        errors.push(`Error fetching channel: ${input}`)
      }
    })
  )

  // Sort results
  allVideos.sort((a, b) => {
    if (sortBy === "views") return b.viewCount - a.viewCount
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  return NextResponse.json({
    videos: allVideos,
    totalChannels: uniqueInputs.length - errors.length,
    errors,
  })
}
