import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth-server"
import { logTokens } from "@/lib/log-tokens"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface CompetitorContext {
  channelName: string
  summary: string
  angles: string[]
  titlePatterns: string[]
  topPerformers: { title: string; views: number }[]
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) return NextResponse.json({ error: "Anthropic API-Key fehlt" }, { status: 500 })

  let body: { messages: Message[]; competitorContext: CompetitorContext }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })
  }

  const { messages, competitorContext } = body
  if (!messages?.length || !competitorContext?.channelName) {
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 })
  }

  // Fetch user's own channel from profile for personalized advice
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: profile } = await supabase.from("profiles").select("youtube_channel_id").eq("id", user.id).single()
  const ownChannel = profile?.youtube_channel_id ?? null

  const topPerformersList = competitorContext.topPerformers
    .map((v, i) => `${i + 1}. "${v.title}" (${(v.views / 1000).toFixed(0)}K Views)`)
    .join("\n")

  const systemPrompt = `Du bist ein YouTube-Strategie-Assistent. Der Nutzer hat gerade den YouTube-Channel "${competitorContext.channelName}" analysiert und möchte Fragen dazu stellen.

## Analyseergebnisse für "${competitorContext.channelName}":

**Zusammenfassung:** ${competitorContext.summary}

**Content-Angles:**
${competitorContext.angles.map((a) => `- ${a}`).join("\n")}

**Titelmuster:**
${competitorContext.titlePatterns.map((p) => `- ${p}`).join("\n")}

**Top-Videos:**
${topPerformersList}

${ownChannel ? `**Eigener Channel des Nutzers:** ${ownChannel} — beziehe deine Antworten auf diesen Channel wenn sinnvoll.` : "Der Nutzer hat noch keinen eigenen Channel hinterlegt."}

## Deine Aufgabe:
Beantworte Fragen des Nutzers konkret und actionable. Fokus auf: Wie kann er die Erkenntnisse aus der Analyse für seinen eigenen Channel nutzen? Welche Angles, Titelstrukturen oder Themen sind auf seinen Channel übertragbar?
- Antworte immer auf Deutsch
- Sei direkt und konkret, keine langen Einleitungen
- Halte Antworten fokussiert (3-6 Sätze reichen meist)
- Wenn der Nutzer nach Titel-Ideen fragt, gib 2-3 konkrete Beispiele`

  const client = new Anthropic({ apiKey: anthropicApiKey })

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    void logTokens(user.id, "chat-competitor", response.usage.input_tokens, response.usage.output_tokens)
    return NextResponse.json({ reply: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Claude API Fehler: ${msg}` }, { status: 500 })
  }
}
