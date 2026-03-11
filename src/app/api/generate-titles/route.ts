import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

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
  // Get uploads playlist
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels")
  channelUrl.searchParams.set("part", "contentDetails")
  channelUrl.searchParams.set("id", channelId)
  channelUrl.searchParams.set("key", apiKey)

  const channelRes = await fetch(channelUrl.toString())
  if (!channelRes.ok) return []
  const channelData = await channelRes.json()
  const playlistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!playlistId) return []

  // Get video IDs
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

  // Get video details
  const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos")
  videosUrl.searchParams.set("part", "snippet,statistics,contentDetails")
  videosUrl.searchParams.set("id", videoIds.join(","))
  videosUrl.searchParams.set("key", apiKey)

  const videosRes = await fetch(videosUrl.toString())
  if (!videosRes.ok) return []
  const videosData = await videosRes.json()

  return (videosData.items ?? [])
    .filter((item: { contentDetails: { duration: string } }) => {
      // Exclude Shorts
      const dur = item.contentDetails.duration
      const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return false
      const seconds =
        parseInt(match[1] ?? "0") * 3600 +
        parseInt(match[2] ?? "0") * 60 +
        parseInt(match[3] ?? "0")
      return seconds >= 60
    })
    .map((item: { snippet: { title: string }; statistics: { viewCount?: string } }) => ({
      title: item.snippet.title,
      viewCount: parseInt(item.statistics.viewCount ?? "0"),
    }))
    .sort(
      (
        a: { viewCount: number },
        b: { viewCount: number }
      ) => b.viewCount - a.viewCount
    )
    .slice(0, 10)
}

export async function POST(request: Request): Promise<NextResponse<GenerateResponse>> {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  if (!youtubeApiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
  }
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 })
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

  const { ownChannelId, inspirationVideos } = parsed.data

  const ownTopVideos = await fetchChannelTopVideos(ownChannelId, youtubeApiKey)

  const ownChannelContext =
    ownTopVideos.length > 0
      ? `Top-Videos des eigenen Channels (nach Views sortiert):\n${ownTopVideos
          .map((v, i) => `${i + 1}. "${v.title}" (${(v.viewCount / 1000).toFixed(0)}K Views)`)
          .join("\n")}`
      : "Keine eigenen Videos gefunden — generiere ohne Channel-Kontext."

  const inspirationContext = inspirationVideos
    .map(
      (v, i) =>
        `${i + 1}. "${v.title}" von ${v.channelTitle} (${(v.viewCount / 1000).toFixed(0)}K Views)`
    )
    .join("\n")

  const prompt = `Du bist ein erfahrener YouTube-Titel-Stratege im Royal/Celebrity Gossip Bereich. Du kennst die Dynamiken der royalen Familie genau und weißt, welche Geschichten realistisch und glaubwürdig klingen.

## Eigener Channel — Top-Performer:
${ownChannelContext}

## Virale Inspiration-Videos (Vorlagen):
${inspirationContext}

## Deine Aufgabe:
Erstelle pro Inspirations-Titel 1-2 neue Titel-Variationen für den eigenen Channel.

## WICHTIGE REGELN:

### 1. Kontext-Plausibilität ist Pflicht
Bevor du eine Komponente tauschst, frage dich: "Macht diese Geschichte in der realen Welt Sinn?"
- ✅ "King Charles Hands FINAL AUTHORITY To William" → William übernimmt Macht = realistisch
- ❌ "King Charles Hands FINAL AUTHORITY To Charlotte" → Ein Kind übernimmt königliche Autorität = absurd, niemals verwenden

### 2. Erlaubte Tausch-Typen (nur wenn kontextuell sinnvoll):
- **Person tauschen**: Nur wenn die neue Person dieselbe Rolle plausibel übernehmen kann (z.B. William ↔ Harry, Meghan ↔ Kate)
- **Ereignis/Skandal tauschen**: Das Ereignis durch ein anderes ersetzen, das zur Person passt
- **Adjektiv/Intensität tauschen**: z.B. "FINAL" → "SHOCKING", "SECRET" → "HIDDEN"
- **Handlung tauschen**: Die Aktion durch eine ähnliche ersetzen (z.B. "Hands Authority" → "Strips Power")

### 3. Passe an den eigenen Channel an:
Nutze die Top-Performer des eigenen Channels als Hinweis, welche Personen und Themen besser ankommen. Wenn der eigene Channel gut mit jüngeren Royals performt, bevorzuge diese — aber nur wenn es kontextuell Sinn ergibt.

### 4. Stil: Reißerisch aber glaubwürdig
Die Titel sollen clickbait-ig und gossip-y sein, aber die Geschichte dahinter muss sich realistisch anfühlen. Jemand der den Titel liest soll denken "oh, das könnte wirklich passieren" — nicht "das ergibt keinen Sinn".

## Ausgabe (JSON):
Antworte NUR mit einem JSON-Array, kein weiterer Text:
[
  {
    "title": "Der neue generierte Titel",
    "inspirationTitle": "Der originale Vorlage-Titel",
    "swappedComponent": "Was wurde getauscht und warum ist es plausibel, z.B. 'William → Harry: Beide sind potenzielle Thronerben, Machtverlust-Narrative passen zu Harry'"
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

  const rawText = message.content[0].type === "text" ? message.content[0].text : ""

  let suggestions: TitleSuggestion[]
  try {
    // Strip markdown code blocks if present
    const stripped = rawText.replace(/```(?:json)?\n?/g, "").trim()
    const jsonMatch = stripped.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error("No JSON array found. Raw response:", rawText)
      throw new Error("No JSON array found in response")
    }
    suggestions = JSON.parse(jsonMatch[0])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("JSON parse error:", msg, "Raw:", rawText)
    return NextResponse.json({ error: `Fehler beim Verarbeiten der KI-Antwort: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ suggestions })
}
