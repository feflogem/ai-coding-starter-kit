import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthUser } from "@/lib/auth-server"
import { logTokens } from "@/lib/log-tokens"

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
  reasoning: string
}

type GenerateResponse =
  | { suggestions: TitleSuggestion[] }
  | { error: string }

async function resolveChannelIdFromInput(input: string, apiKey: string): Promise<string | null> {
  let handle = input.trim()
  // Extract handle/ID from YouTube URL
  if (handle.includes("youtube.com")) {
    try {
      const url = new URL(handle.startsWith("http") ? handle : `https://${handle}`)
      const parts = url.pathname.split("/").filter(Boolean)
      const atPart = parts.find((p) => p.startsWith("@"))
      if (atPart) handle = atPart
      else {
        const idx = parts.findIndex((p) => ["channel", "c", "user"].includes(p))
        if (idx !== -1) handle = parts[idx + 1] ?? handle
      }
    } catch { /* keep as-is */ }
  }
  if (handle.startsWith("UC")) return handle // already a channel ID
  // Resolve @handle
  const q = handle.startsWith("@") ? handle : `@${handle}`
  const url = new URL("https://www.googleapis.com/youtube/v3/channels")
  url.searchParams.set("part", "id")
  url.searchParams.set("forHandle", q)
  url.searchParams.set("key", apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0]?.id ?? null
}

async function fetchChannelTopVideos(
  channelInput: string,
  apiKey: string
): Promise<Array<{ title: string; viewCount: number }>> {
  const channelId = await resolveChannelIdFromInput(channelInput, apiKey)
  if (!channelId) return []

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

  const prompt = `Act as a Senior Youtube Faceless Channel director with a deep understanding of virality.

## Own Channel — Top Performers:
${ownChannelContext}

## Viral Inspiration Videos (from competitor channels):
${inspirationContext}

## Your Task:

1. Analysiere den hinterlegten YouTube-Channel des Users. Was sind erfolgreiche TitelMuster/Themen (Personen/Ereignisse/etc.) auf dem Channel des Users? Identifiziere die Channel-Ausrichtung (z.B. Royal Drama, Finance, Gaming, etc.).

2. Basierend auf den ausgewählten Videos bei der Videoanalyse, die der User auf Basis der Konkurrenzchannel hinterlegt hat, generiere neue Titelideen für den User — aber NUR, wenn die Swaps inhaltlich plausibel sind.

3. KRITISCH: Nimm die Titel, die der User ausgewählt hat und verändere nur EINE einzelne Komponente daran (Person/Adjektiv/Ereignis). Der Rest des Titels bleibt UNVERÄNDERT. Keine neuen Präfixe hinzufügen, keine Strukturen umbauen.

4. Die neue Komponente muss REALISTISCHE FAKTEN widerspiegeln. Z.B. "King Charles hat ein neues Zuhause" — nur vorschlagen wenn es WAHR ist oder plausibel im Kontext des Channels. Keine erfundenen oder unsinnigen Sachverhalte.

5. Schlage nur Titel vor, die für den User-Channel thematisch passen (z.B. für Royal-Drama-Channel nur Royal-bezogene Swaps).

6. Für jeden Titel: zeige genau WELCHE Komponente geswappt wurde und warum der neue Titel für den Channel funktioniert (1-2 Sätze, max).

## CRITICAL RULES:

- LANGUAGE: Identify the language of the own channel's top videos. ALL generated titles MUST be in that exact language. No language switching!
- PRESERVE ORIGINAL STRUCTURE: Do not add prefixes, rearrange, or rebuild the title. Change ONLY the one component.
- ONE SWAP ONLY: Exactly one person/adjective/event changes. Everything else stays identical.
- FACTUAL PLAUSIBILITY: The swapped component must make sense (e.g., don't claim King Charles has a new home if he doesn't)
- CHANNEL ALIGNMENT: Only swap with content/people/topics that fit the own channel's niche
- SKIP IF NO SENSE: If no single-component swap makes thematic sense, skip that title entirely
- Provide a brief (1-2 sentences max) reasoning for why each suggested title fits the channel

## Output (JSON):
Reply ONLY with a JSON array, no other text:
[
  {
    "title": "The new generated title (in own channel's language)",
    "inspirationTitle": "The original template title",
    "swappedComponent": "What was adapted",
    "reasoning": "Brief explanation why this title works for the channel (max 2 sentences)"
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
  void logTokens(user.id, "generate-titles", message.usage.input_tokens, message.usage.output_tokens)
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
