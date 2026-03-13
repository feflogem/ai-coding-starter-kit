import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthUser } from "@/lib/auth-server"

const InspirationVideoSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  viewCount: z.number(),
})

const RequestSchema = z.object({
  ownChannelId: z.string().min(1),
  inspirationVideos: z.array(InspirationVideoSchema).min(1).max(5),
})

export type TitleSuggestion = {
  title: string
  inspirationTitle: string
  swappedComponent: string
}

type GenerateResponse =
  | { suggestions: TitleSuggestion[] }
  | { error: string }

async function fetchChannelTopVideos(
  channelId: string,
  apiKey: string
): Promise<Array<{ title: string; viewCount: number }>> {
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
  channelUrl.searchParams.set("part", "contentDetails")
  channelUrl.searchParams.set("id", channelId)
  channelUrl.searchParams.set("key", apiKey)

  const channelRes = await fetch(channelUrl.toString())
  if (!channelRes.ok) return []
  const channelData = await channelRes.json()
  const playlistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!playlistId) return []

  const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems")
  playlistUrl.searchParams.set("part", "contentDetails")
  playlistUrl.searchParams.set("playlistId", playlistId)
  playlistUrl.searchParams.set("maxResults", "25")
  playlistUrl.searchParams.set("key", apiKey)

  const playlistRes = await fetch(playlistUrl.toString())
  if (!playlistRes.ok) return []
  const playlistData = await playlistRes.json()
  const videoIds: string[] = (playlistData.items ?? []).map(
    (item: { contentDetails: { videoId: string } }) => item.contentDetails.videoId
  )
  if (videoIds.length === 0) return []

  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos")
  videosUrl.searchParams.set("part", "snippet,statistics,contentDetails")
  videosUrl.searchParams.set("id", videoIds.join(","))
  videosUrl.searchParams.set("key", apiKey)

  const videosRes = await fetch(videosUrl.toString())
  if (!videosRes.ok) return []
  const videosData = await videosRes.json()

  return (videosData.items ?? [])
    .filter((item: { contentDetails: { duration: string } }) => {
      const dur = item.contentDetails.duration
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return false
      const seconds = parseInt(match[1] ?? "0") * 3600 + parseInt(match[2] ?? "0") * 60 + parseInt(match[3] ?? "0")
      return seconds >= 60
    })
    .map((item: { snippet: { title: string }; statistics: { viewCount?: string } }) => ({
      title: item.snippet.title,
      viewCount: parseInt(item.statistics.viewCount ?? "0"),
    }))
    .sort((a: { viewCount: number }, b: { viewCount: number }) => b.viewCount - a.viewCount)
    .slice(0, 10)
}

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  // Auth check — title generation requires login
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert. Bitte einloggen." }, { status: 401 })
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  if (!youtubeApiKey) {
    return NextResponse.json({ error: "YouTube API-Key nicht konfiguriert" }, { status: 500 })
  }
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "Anthropic API-Key nicht konfiguriert" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Ungültige Anfrage: ${parsed.error.issues[0]?.message}` },
      { status: 400 }
    )
  }

  const { ownChannelId, inspirationVideos } = parsed.data
  const ownTopVideos = await fetchChannelTopVideos(ownChannelId, youtubeApiKey)

  const ownChannelContext =
    ownTopVideos.length > 0
      ? `Top-Videos des eigenen Channels (nach Views sortiert):\n${ownTopVideos
          .map((v, i) => `${i + 1}. "${v.title}" (${(v.viewCount / 1000).toFixed(0)}K Views)`)
          .join("\n")}`
      : "Keine eigenen Videos gefunden — generiere ohne Channel-Kontext."

  const inspirationContext = inspirationVideos
    .map((v, i) => `${i + 1}. "${v.title}" von ${v.channelTitle} (${(v.viewCount / 1000).toFixed(0)}K Views)`)
    .join("\n")

  const prompt = `You are an expert YouTube title strategist. Your job is to transfer viral title structures from competitor channels to the user's own channel — matching their topic, style, and language.

## Own Channel — Top Performers:
${ownChannelContext}

## Viral Inspiration Videos (from competitor channels):
${inspirationContext}

## Your Task:
Create 1-2 new title variations per inspiration title, adapted to the own channel.

## CRITICAL RULES:

### 1. Detect and match the own channel's language
Look at the titles of the own channel's top performers and identify the language they use (English, German, Spanish, etc.).
ALL generated titles MUST be written in that exact same language. Never switch languages.
If no own channel videos are available, use the language of the inspiration videos.

### 2. Match the own channel's topic
Analyze the own channel's top performers and identify the niche (Food, Gaming, Fitness, Finance, etc.).
All generated titles must fit that niche — never keep competitor-specific topics.

### 3. Keep the structure, swap the content
Take the emotional structure of the inspiration title (e.g. "X does Y and everyone is shocked") but fill it with content from the own channel's niche and language.

### 4. Allowed adaptations:
- **Topic/subject swap**: Replace with a relevant topic from the own channel's niche
- **Keep emotional triggers**: e.g. "SHOCKING", "SECRET", "NEVER BEFORE SEEN" — but translate them to the channel's language
- **Language**: Always match the own channel's language

### 5. Plausibility check
The generated title must make sense and be relevant to the own channel's audience.

## Output (JSON):
Reply ONLY with a JSON array, no other text:
[
  {
    "title": "The new generated title",
    "inspirationTitle": "The original template title",
    "swappedComponent": "What was adapted"
  }
]`

  const client = new Anthropic({ apiKey: anthropicApiKey })

  let message
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Anthropic API error:", msg)
    return NextResponse.json({ error: `Claude API Fehler: ${msg}` }, { status: 500 })
  }

  // Safe access to content
  const firstBlock = message.content[0]
  if (!firstBlock || firstBlock.type !== "text") {
    return NextResponse.json({ error: "Unerwartete Antwort von Claude" }, { status: 500 })
  }
  const rawText = firstBlock.text

  let suggestions: TitleSuggestion[]
  try {
    const stripped = rawText.replace(/```(?:json)?\n?/g, "").trim()
    const jsonMatch = stripped.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("Kein JSON-Array gefunden. Antwort:", rawText)
      throw new Error("Kein JSON-Array in der Antwort gefunden")
    }
    suggestions = JSON.parse(jsonMatch[0])
    if (!Array.isArray(suggestions)) throw new Error("Antwort ist kein Array")
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("JSON parse error:", msg, "Raw:", rawText)
    return NextResponse.json({ error: `Fehler beim Verarbeiten der KI-Antwort: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ suggestions })
}
