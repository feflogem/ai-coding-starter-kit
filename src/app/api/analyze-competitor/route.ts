import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthUser, getTierAndMonthlyUsage, MONTHLY_LIMITS } from "@/lib/auth-server"

const RequestSchema = z.object({
  channelInput: z.string().min(1).max(200),
})

export type CompetitorAnalysisResult = {
  channelName: string
  summary: string
  angles: string[]
  titlePatterns: string[]
  topPerformers: { title: string; views: number }[]
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "").trim()
  const user = await getAuthUser(request)
  if (!user || !token) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  // Monthly competitor limit
  const { tier, competitorThisMonth } = await getTierAndMonthlyUsage(user.id, token)
  const competitorLimit = MONTHLY_LIMITS[tier]?.competitor ?? 1
  if (competitorThisMonth >= competitorLimit) {
    return NextResponse.json(
      { error: `Du hast dein monatliches Limit von ${competitorLimit} Competitor-Analyse${competitorLimit !== 1 ? "n" : ""} erreicht. Upgrade für mehr.` },
      { status: 429 }
    )
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) return NextResponse.json({ error: "Anthropic API-Key nicht konfiguriert" }, { status: 500 })

  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  if (!youtubeApiKey) return NextResponse.json({ error: "YouTube API-Key nicht konfiguriert" }, { status: 500 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })

  let channelInput = parsed.data.channelInput.trim()

  // Extract handle or ID from URL
  if (channelInput.includes("youtube.com")) {
    try {
      const url = new URL(channelInput.startsWith("http") ? channelInput : `https://${channelInput}`)
      const parts = url.pathname.split("/").filter(Boolean)
      const atPart = parts.find((p) => p.startsWith("@"))
      if (atPart) channelInput = atPart
      else {
        const idx = parts.findIndex((p) => ["channel", "c", "user"].includes(p))
        if (idx !== -1) channelInput = parts[idx + 1] ?? channelInput
      }
    } catch { /* keep as is */ }
  }

  let channelId = channelInput
  let channelName = channelInput

  // Resolve @handle to channel ID
  if (!channelId.startsWith("UC")) {
    const q = channelId.startsWith("@") ? channelId.slice(1) : channelId
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=1&key=${youtubeApiKey}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    const item = searchData.items?.[0]
    if (!item) {
      return NextResponse.json({ error: `Channel "${channelInput}" nicht gefunden.` }, { status: 404 })
    }
    channelId = item.snippet.channelId
    channelName = item.snippet.channelTitle
  }

  // Fetch top videos by view count
  const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=25&key=${youtubeApiKey}`
  const videosRes = await fetch(videosUrl)
  const videosData = await videosRes.json()

  if (!videosData.items?.length) {
    return NextResponse.json({ error: "Keine Videos für diesen Channel gefunden." }, { status: 404 })
  }

  // Get statistics
  const videoIds = videosData.items
    .map((v: { id: { videoId: string } }) => v.id.videoId)
    .join(",")
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${youtubeApiKey}`
  const statsRes = await fetch(statsUrl)
  const statsData = await statsRes.json()

  const statsMap = new Map<string, number>(
    (statsData.items ?? []).map((v: { id: string; statistics: { viewCount?: string } }) => [
      v.id,
      parseInt(v.statistics.viewCount ?? "0"),
    ])
  )

  const videos = videosData.items
    .map((v: { id: { videoId: string }; snippet: { title: string } }) => ({
      title: v.snippet.title,
      views: statsMap.get(v.id.videoId) ?? 0,
    }))
    .sort((a: { views: number }, b: { views: number }) => b.views - a.views)

  const videoList = videos
    .slice(0, 20)
    .map((v: { title: string; views: number }, i: number) =>
      `${i + 1}. "${v.title}" (${(v.views / 1000).toFixed(0)}K Views)`
    )
    .join("\n")

  const prompt = `Analyze the YouTube channel "${channelName}" based on its top-performing videos and identify what makes it successful.

Top videos:
${videoList}

Respond ONLY with valid JSON in this exact format — no other text:
{
  "summary": "One concise sentence describing the channel's overall content strategy and why it works.",
  "angles": [
    "Angle 1 — specific content angle or topic approach",
    "Angle 2 — specific content angle or topic approach",
    "Angle 3 — specific content angle or topic approach"
  ],
  "titlePatterns": [
    "Pattern 1 — specific title structure or formula used",
    "Pattern 2 — specific title structure or formula used",
    "Pattern 3 — specific title structure or formula used"
  ]
}

Rules:
- summary: max 25 words
- angles: exactly 3, each max 15 words — describe recurring themes, formats, or emotional hooks
- titlePatterns: exactly 3, each max 15 words — describe structural patterns, e.g. "[Number] + [Superlative]" or "question format"
- Be specific and actionable, not generic
- Respond in the same language as the majority of the video titles`

  const client = new Anthropic({ apiKey: anthropicApiKey })

  let message
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Claude API Fehler: ${msg}` }, { status: 500 })
  }

  const firstBlock = message.content[0]
  if (!firstBlock || firstBlock.type !== "text") {
    return NextResponse.json({ error: "Unerwartete Antwort von Claude" }, { status: 500 })
  }

  try {
    const stripped = firstBlock.text.replace(/```(?:json)?\n?/g, "").trim()
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Kein JSON gefunden")
    const result = JSON.parse(jsonMatch[0])
    if (!result.summary || !Array.isArray(result.angles) || !Array.isArray(result.titlePatterns)) {
      throw new Error("Ungültiges Format")
    }
    return NextResponse.json({
      channelName,
      summary: result.summary,
      angles: result.angles,
      titlePatterns: result.titlePatterns,
      topPerformers: videos.slice(0, 5),
    })
  } catch {
    return NextResponse.json({ error: "Fehler beim Verarbeiten der Antwort" }, { status: 500 })
  }
}
