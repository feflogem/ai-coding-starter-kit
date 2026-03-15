"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"
import { AppShell } from "@/components/AppShell"
import { supabase } from "@/lib/supabase"

function AccordionItem({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="font-semibold text-sm text-gray-900 dark:text-white">{title}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Logged-in: full how-to guide ──────────────────────────────────────────────
function LoggedInContent() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <span className="block text-xs font-semibold tracking-widest uppercase text-violet-500 mb-4">Anleitung</span>
      <h1 className="text-3xl font-bold mb-3 leading-tight">Wie du Viral Tracker am besten nutzt</h1>
      <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed mb-10">
        Schritt-für-Schritt durch alle Features — von der Channel-Recherche bis zum fertigen Titel.
      </p>

      {/* Know Your Competitor callout */}
      <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl p-6 mb-10">
        <div className="flex items-start gap-4">
          <span className="text-2xl shrink-0">🎯</span>
          <div>
            <h2 className="font-bold text-violet-900 dark:text-violet-200 mb-2">Voraussetzung: Know Your Competitor</h2>
            <p className="text-sm text-violet-800 dark:text-violet-300 leading-relaxed mb-3">
              Viral Tracker funktioniert am besten, wenn du deine Konkurrenten bereits kennst. Das Tool ist kein Entdeckungs-Tool — es ist ein Analyse-Tool. Wer sind die 5–10 Kanäle in deiner Nische, die du regelmäßig im Auge behältst?
            </p>
            <p className="text-sm text-violet-800 dark:text-violet-300 leading-relaxed">
              <span className="font-semibold">Die Suchfunktion im Tool</span> kann dir helfen, Kanäle anhand eines ungefähren Namens zu finden. Sie ist aber kein Ersatz für eine eigene Nischen-Recherche. Empfehlung: Schreib dir einmalig 5–10 Konkurrenz-Kanäle raus, dann kannst du das Tool sofort vollständig nutzen.
            </p>
          </div>
        </div>
      </div>

      {/* How To */}
      <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">How To</h2>
      <div className="space-y-2 mb-10">
        <AccordionItem title="Schritt 1 — Channels hinzufügen" defaultOpen>
          <p>
            Gehe zu <strong>Analysen → Viral Video Tracker</strong>. Suche nach Kanalnamen oder gib direkt eine YouTube-URL, einen @Handle oder eine Channel-ID ein.
          </p>
          <p>
            Tipp: Analysiere immer mehrere Kanäle gleichzeitig (mindestens 3–5) — je mehr Datenpunkte, desto besser die Muster-Erkennung. Im Free-Plan sind bis zu 3 Kanäle möglich, im Premium-Plan bis zu 40.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-amber-800 dark:text-amber-300 text-xs">
            <strong>Zur Suchfunktion:</strong> Sie funktioniert gut, wenn du den ungefähren Kanalnamen kennst. Für exakte Channel-IDs (UC...) oder vollständige URLs ist direkte Eingabe zuverlässiger.
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 text-blue-800 dark:text-blue-300 text-xs">
            <strong>„Aus Abos laden":</strong> Channels direkt aus deinen YouTube-Abonnements hinzufügen. Voraussetzung: Deine Abonnements müssen auf YouTube auf <strong>öffentlich</strong> gestellt sein.
          </div>
        </AccordionItem>

        <AccordionItem title="Schritt 2 — Zeitraum & Filter einstellen">
          <p>
            Wähle den Zeitraum: letzte 7 Tage, letzter Monat, 3 Monate, letztes Jahr — oder einen eigenen Zeitraum per Datepicker.
          </p>
          <p>
            <strong>Mindestabrufe:</strong> 50.000 Views ist ein guter Startpunkt. In kleineren Nischen kannst du auf 10.000–20.000 runter. Zu niedrig führt zu vielen irrelevanten Ergebnissen.
          </p>
          <p>
            <strong>Sortierung:</strong> &quot;Nach Views&quot; zeigt die absoluten Top-Performer. &quot;Nach Datum&quot; zeigt die neuesten Videos zuerst — gut um aktuelle Trends zu sehen.
          </p>
        </AccordionItem>

        <AccordionItem title="Schritt 3 — Ergebnisse lesen">
          <p>
            Die Tabelle zeigt Views, Erscheinungsdatum und den <strong>Virality Score</strong>. Der Score setzt Views ins Verhältnis zur Channelgröße und dem Alter — ein 500K-Video von einem 50K-Kanal ist viraler als dasselbe Ergebnis von einem 5M-Kanal.
          </p>
          <p>
            Klicke auf einen Spaltenkopf zum Sortieren. Klicke auf einen Videotitel um das Video direkt auf YouTube zu öffnen.
          </p>
        </AccordionItem>

        <AccordionItem title="Schritt 4 — Muster & Erkenntnisse">
          <p>
            Läuft automatisch nach jeder Analyse. Claude analysiert alle viralen Titel und zeigt dir, was sie gemeinsam haben — Emotionen, Strukturen, Themen, wiederkehrende Personen oder Ereignisse.
          </p>
          <p>
            Diese Erkenntnisse sind der eigentliche Wert: Du siehst auf einen Blick, was in deiner Nische funktioniert — ohne jedes Video einzeln zu lesen.
          </p>
        </AccordionItem>

        <AccordionItem title="Schritt 5 — Titel Generator">
          <p>
            Markiere 1–5 Videos per Checkbox als Inspiration. Dann generiert Claude Titelideen für deinen Kanal — basierend auf den viralen Strukturen, angepasst an deine Nische und Sprache.
          </p>
          <p>
            <strong>Wichtig:</strong> Hinterlege deinen Channel-Handle im Profil. Claude analysiert dann deine eigenen Top-Videos und versteht deinen Stil — die Ergebnisse werden deutlich besser.
          </p>
        </AccordionItem>

        <AccordionItem title="Schritt 6 — Competitor Analyse (Deep Dive)">
          <p>
            Für einen vollständigen Einblick in einen einzelnen Kanal. Gib einen @Handle oder URL ein und erhalte: Content-Angles, Titelmuster, Top-Videos und eine Zusammenfassung der Channel-Strategie.
          </p>
          <p>
            <strong>Neu:</strong> Nach der Analyse erscheint rechts ein KI-Assistent. Du kannst direkt Fragen stellen — zum Beispiel wie du die Erkenntnisse für deinen eigenen Channel nutzen kannst.
          </p>
          <p>
            Alle Competitor-Analysen werden gespeichert und können jederzeit wieder geöffnet werden.
          </p>
        </AccordionItem>
      </div>

      {/* Empfohlener Workflow */}
      <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Empfohlener Workflow</h2>
      <div className="space-y-2 mb-10">
        <AccordionItem title="Wöchentliche Routine">
          <p>
            Analysiere deine 5–10 Konkurrenz-Kanäle für die letzten 30 Tage. Sieh, welche Videos neu in die Top-Liste eingestiegen sind. Notiere Themen, die mehrfach auftauchen — das sind Trends in deiner Nische.
          </p>
        </AccordionItem>

        <AccordionItem title="Vor einem neuen Video">
          <p>
            Führe einen frischen Scan durch. Wähle 3–5 Top-Performer als Inspiration und generiere Titelideen. Wähle den besten Vorschlag und passe ihn auf dein konkretes Thema an.
          </p>
        </AccordionItem>

        <AccordionItem title="Neue Nische erkunden">
          <p>
            Mach zuerst eine Competitor Analyse der 2–3 stärksten Kanäle in der neuen Nische. Verstehe die Angles und Titelmuster, bevor du anfängst zu produzieren.
          </p>
        </AccordionItem>
      </div>

      {/* FAQ (kurz, nur technische Fragen) */}
      <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Häufige Fragen</h2>
      <div className="space-y-2 pb-10">
        <AccordionItem title="Warum sehe ich manchmal keine Ergebnisse?">
          <p>
            Der Kanal hat im gewählten Zeitraum keine Videos mit den gesetzten Mindestabrufen veröffentlicht. Probiere einen längeren Zeitraum oder senke die Mindestabrufe.
          </p>
        </AccordionItem>

        <AccordionItem title="Die Suchfunktion findet meinen Kanal nicht — was tun?">
          <p>
            Versuche den genauen @Handle direkt einzugeben (z.B. <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">@KanalName</code>) oder füge die vollständige YouTube-URL ein.
          </p>
        </AccordionItem>

        <AccordionItem title="Was ist der Virality Score?">
          <p>
            Der Score setzt Views ins Verhältnis zur Channelgröße und dem Alter des Videos. So siehst du, welche Videos wirklich überperformt haben — unabhängig von der Kanalgröße.
          </p>
        </AccordionItem>
      </div>
    </div>
  )
}

// ── Not logged in: value prop + FAQ ───────────────────────────────────────────
function PublicContent({ onSignup }: { onSignup: () => void }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
          ← Zurück zur Startseite
        </Link>
        <h1 className="text-4xl font-bold mb-4 leading-tight">Finde heraus, welche Videos<br />in deiner Nische viral gehen</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
          Viral Tracker analysiert YouTube-Kanäle deiner Konkurrenz und zeigt dir, was funktioniert — damit du bessere Titel, Themen und Strategien findest.
        </p>
      </section>

      {/* Für wen ist das? */}
      <section className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-lg font-bold mb-4">Für wen ist Viral Tracker?</h2>
        <div className="space-y-2">
          <AccordionItem title="YouTube-Creator, die wachsen wollen" defaultOpen>
            <p>
              Du postest regelmäßig Videos, aber die Views bleiben hinter deinen Erwartungen? Viral Tracker zeigt dir, welche Titel und Themen in deiner Nische tatsächlich funktionieren — basierend auf echten Daten, nicht auf Bauchgefühl.
            </p>
          </AccordionItem>

          <AccordionItem title="Content-Strategen und Agenturen">
            <p>
              Du betreust mehrere Kanäle oder planst Content-Strategien? Analysiere bis zu 40 Konkurrenz-Kanäle gleichzeitig, erkenne Muster und generiere datenbasierte Titelvorschläge.
            </p>
          </AccordionItem>

          <AccordionItem title="Neue Creator, die ihre Nische verstehen wollen">
            <p>
              Du startest gerade und weißt noch nicht, was in deiner Nische funktioniert? Die Competitor-Analyse gibt dir einen tiefen Einblick in die Strategie erfolgreicher Kanäle.
            </p>
          </AccordionItem>
        </div>
      </section>

      {/* Was kann das Tool? */}
      <section className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-lg font-bold mb-4">Was kann Viral Tracker?</h2>
        <div className="space-y-2">
          <AccordionItem title="Virale Videos deiner Konkurrenz finden">
            <p>
              Gib die YouTube-Kanäle deiner Konkurrenten ein und Viral Tracker zeigt dir deren Top-Videos — sortiert nach Views oder dem Virality Score, der die Performance ins Verhältnis zur Kanalgröße setzt.
            </p>
          </AccordionItem>

          <AccordionItem title="KI-Muster-Erkennung">
            <p>
              Nach jeder Analyse erkennt Claude automatisch Muster in den viralen Titeln: wiederkehrende Emotionen, Strukturen, Themen und Trends. Du siehst auf einen Blick, was in deiner Nische funktioniert.
            </p>
          </AccordionItem>

          <AccordionItem title="Titel-Generator">
            <p>
              Wähle virale Videos als Inspiration und lass dir Titelvorschläge für deinen eigenen Kanal generieren — angepasst an deinen Stil und deine Nische.
            </p>
          </AccordionItem>

          <AccordionItem title="Competitor Deep Dive">
            <p>
              Analysiere einzelne Kanäle im Detail: Content-Angles, Titelmuster, Top-Videos und eine Zusammenfassung der Channel-Strategie. Plus: ein KI-Assistent, dem du Folgefragen stellen kannst.
            </p>
          </AccordionItem>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-10">
        <h2 className="text-lg font-bold mb-4">Häufige Fragen</h2>
        <div className="space-y-2">
          <AccordionItem title="Ist Viral Tracker kostenlos?">
            <p>
              Ja, der Free-Plan ist dauerhaft kostenlos. Du kannst bis zu 3 Kanäle gleichzeitig analysieren. Für mehr Kanäle gibt es den Basic-Plan (10 Kanäle, 8,99 €/Monat) und den Premium-Plan (40 Kanäle, 15,99 €/Monat).
            </p>
          </AccordionItem>

          <AccordionItem title="Wie aktuell sind die Daten?">
            <p>
              Viral Tracker fragt die YouTube Data API in Echtzeit an. Die Daten sind immer aktuell zum Zeitpunkt deiner Analyse — es gibt keinen Cache.
            </p>
          </AccordionItem>

          <AccordionItem title="Was ist der Virality Score?">
            <p>
              Der Score setzt die Views eines Videos ins Verhältnis zur Channelgröße (Abonnenten) und dem Alter des Videos. Ein Video mit 200K Views von einem Kanal mit 20K Abonnenten ist viraler als dasselbe Ergebnis bei 2 Millionen Abonnenten.
            </p>
          </AccordionItem>

          <AccordionItem title="Muss ich meine Konkurrenten schon kennen?">
            <p>
              Idealerweise ja — Viral Tracker ist ein Analyse-Tool, kein Entdeckungs-Tool. Du solltest 5–10 Kanäle in deiner Nische kennen. Die Suchfunktion hilft dir, Kanäle anhand ihres Namens zu finden.
            </p>
          </AccordionItem>

          <AccordionItem title="Kann ich jederzeit kündigen?">
            <p>
              Ja, jederzeit über dein Profil. Nach der Kündigung läuft dein Abo bis zum Ende des bezahlten Zeitraums weiter und wechselt dann automatisch zum Free-Plan.
            </p>
          </AccordionItem>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">Bereit loszulegen?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Kostenlos starten — kein Abo, keine Kreditkarte.</p>
          <Button
            size="lg"
            onClick={onSignup}
            className="text-base px-10 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            Jetzt kostenlos starten
          </Button>
        </div>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">← Zurück zur Startseite</Link>
          <span>© 2026 Viral Tracker</span>
        </div>
      </footer>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnleitungPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
  }, [])

  if (loggedIn === null) return <div className="min-h-screen bg-white dark:bg-gray-950" />

  if (loggedIn) {
    return <AppShell><LoggedInContent /></AppShell>
  }

  return (
    <>
      <PublicContent onSignup={() => setModalOpen(true)} />
      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode="signup" />
    </>
  )
}
