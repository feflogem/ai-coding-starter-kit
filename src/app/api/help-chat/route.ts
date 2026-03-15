import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { getAuthUser } from "@/lib/auth-server"
import { logTokens } from "@/lib/log-tokens"

const SYSTEM_PROMPT = `Du bist der Support-Assistent von Viral Tracker. Du beantwortest ausschließlich Fragen zur App, zur Nutzung, zu den Tarifen und zum Ablauf. Auf alles andere antwortest du kurz: "Dazu kann ich leider nicht helfen — ich bin nur für Fragen zu Viral Tracker da."

## Was ist Viral Tracker?
Ein SaaS-Tool für YouTube-Creator zur Analyse viraler Konkurrenz-Videos. Nutzer geben YouTube-Channels ein, analysieren deren Inhalte und erhalten KI-gestützte Titelvorschläge und Muster-Erkenntnisse.

## Features
- **Viral Video Tracker**: YouTube-Channels eingeben, Zeitraum & Filter setzen, viraleVideos mit Virality-Score anzeigen lassen
- **Competitor Analyse**: Tiefer Einblick in einen einzelnen Channel (Angles, Titelmuster, KI-Assistent)
- **KI-Titel Generator**: Wähle 1–5 Videos als Inspiration, Claude generiert Titelideen für deinen Kanal
- **Muster-Analyse**: Automatische Erkennung von Gemeinsamkeiten in viralen Titeln
- **Aus Abos laden**: Channels direkt aus den eigenen YouTube-Abonnements importieren (YouTube-Abos müssen öffentlich sein: YouTube → Einstellungen → Datenschutz → Abonnements öffentlich)
- **Verlauf**: Vergangene Analysen speichern und erneut aufrufen

## Tarife
- **Free** – 0€/Monat: 3 Channels pro Analyse, KI-Titel Generator, Muster-Analyse, alle Zeitraum-Filter
- **Basic** – 8,99€/Monat: 10 Channels pro Analyse, Competitor Analyse, Kanalliste speichern
- **Premium** – 15,99€/Monat: 40 Channels pro Analyse, Competitor Analyse, mehrere Listen

## Wie nutzt man die App (Schritt für Schritt)?
1. Channels hinzufügen (Suche, URL, @Handle oder aus Abos laden)
2. Filter setzen (Mindestabrufe: empfohlen 50.000, Zeitraum: z.B. letzte 30 Tage)
3. „Analysieren" klicken
4. Ergebnisse sehen: Views, Datum, Virality Score
5. Videos per Checkbox auswählen → KI-Titel generieren
6. Für Deep-Dives: Tab „Competitor Analyse" nutzen

## Virality Score
Setzt Views ins Verhältnis zur Channelgröße (Abonnenten) und dem Alter des Videos. 0–100, höher = viraler relativ zur Channelgröße.

## Passwort zurücksetzen
Im Login-Modal auf „Passwort vergessen?" klicken → E-Mail-Adresse eingeben → Link per Mail.

## Channel hinterlegen (Profil)
Unter Profil den eigenen YouTube-@Handle eintragen. Verbessert die KI-Titelgenerierung, da Claude dann den eigenen Stil analysieren kann.

Antworte immer auf Deutsch, kurz und hilfreich. Keine langen Ausführungen, außer der User fragt explizit nach Details.`

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 })

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) return NextResponse.json({ error: "API-Key fehlt" }, { status: 500 })

  let body: { messages: { role: "user" | "assistant"; content: string }[] }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Ungültiger Body" }, { status: 400 })
  }

  const { messages } = body
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Keine Nachrichten" }, { status: 400 })
  }

  const client = new Anthropic({ apiKey: anthropicApiKey })
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10), // keep last 10 for context
    })
    const text = response.content[0]?.type === "text" ? response.content[0].text : ""
    void logTokens(user.id, "help-chat", response.usage.input_tokens, response.usage.output_tokens)
    return NextResponse.json({ reply: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
