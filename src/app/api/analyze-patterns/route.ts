import { NextResponse } from "next/server"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthUser } from "@/lib/auth-server"

const RequestSchema = z.object({
  videos: z.array(z.object({
    title: z.string(),
    channelTitle: z.string(),
    viewCount: z.number(),
  })).min(1).max(50),
})

export type PatternAnalysis = {
  summary: string
  patterns: string[]
}

export async function POST(request: Request): Promise<NextResponse<PatternAnalysis | { error: string }>> {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })
  }

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    return NextResponse.json({ error: "Anthropic API-Key nicht konfiguriert" }, { status: 500 })
  }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const { videos } = parsed.data
  const videoList = videos
    .map((v, i) => `${i + 1}. "${v.title}" — ${v.channelTitle} (${(v.viewCount / 1000).toFixed(0)}K Views)`)
    .join("\n")

  const prompt = `Analyze the following viral YouTube video titles and identify patterns, recurring themes, people, events, or emotional triggers that make them successful.

Videos:
${videoList}

Respond ONLY with valid JSON in this exact format — no other text:
{
  "summary": "One concise sentence summarizing the overall pattern across these videos.",
  "patterns": [
    "Pattern 1 — short, specific insight",
    "Pattern 2 — short, specific insight",
    "Pattern 3 — short, specific insight"
  ]
}

Rules:
- summary: max 20 words, one sentence
- patterns: exactly 3 bullet points, each max 15 words
- Be specific: name recurring people, events, emotions, or title structures
- Language: respond in the same language as the majority of the video titles`

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
    const result = JSON.parse(jsonMatch[0]) as PatternAnalysis
    if (!result.summary || !Array.isArray(result.patterns)) throw new Error("Ungültiges Format")
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Fehler beim Verarbeiten der Antwort" }, { status: 500 })
  }
}
