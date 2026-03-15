"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"

export default function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"login" | "signup">("signup")
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setRedirecting(true); router.replace("/analysen") }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setRedirecting(true); router.replace("/analysen") }
    })

    return () => listener.subscription.unsubscribe()
  }, [router])

  if (redirecting) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-violet-600 animate-spin" />
          <p className="text-sm text-gray-400 dark:text-gray-500">Wird geladen…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 mb-7">
          Für YouTube-Creator
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Finde was viral geht.<br />Bevor es deine Konkurrenz tut.
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Viral Tracker zeigt dir in Sekunden, welche Videos in deiner Nische gerade durch die Decke gehen — und was sie gemeinsam haben. Damit du nicht rätst, sondern weißt.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => { setModalMode("signup"); setModalOpen(true) }}
            className="text-base px-8 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            Kostenlos ausprobieren
          </Button>
          <Link href="/anleitung">
            <Button size="lg" variant="outline" className="text-base px-8 w-full sm:w-auto">
              Wie funktioniert's?
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-4">Kein Abo, keine Kreditkarte — sofort loslegen</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: "< 30 Sek.", label: "bis zum ersten Ergebnis" },
            { value: "bis zu 40", label: "Channels auf einmal analysieren" },
            { value: "Claude 4", label: "Muster & Titelideen per KI" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For whom */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Für wen ist Viral Tracker?</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Du erstellst YouTube-Content und willst nicht jeden Tag manuell Konkurrenz-Channels durchklicken, um zu verstehen was funktioniert. Viral Tracker macht das für dich.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            {
              icon: "🎯",
              title: "Creator mit Konkurrenz",
              desc: "Du kennst deine Nische und weißt, wer die großen Player sind — aber du verlierst Zeit damit, deren Kanäle manuell zu analysieren.",
            },
            {
              icon: "📈",
              title: "Wachstumsphase",
              desc: "Du willst deinen Kanal skalieren und brauchst datenbasierte Entscheidungen statt Bauchgefühl beim nächsten Video-Titel.",
            },
            {
              icon: "🧠",
              title: "Content-Strategen",
              desc: "Du planst Serien, Formate oder einen Redaktionsplan — und willst verstehen, welche Themen und Strukturen gerade wirklich performen.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Alles, was du für deine Recherche brauchst</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Vier Werkzeuge, die zusammenspielen — von der ersten Recherche bis zum fertigen Titel.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Recherche",
                title: "Viral Video Tracker",
                desc: "Welche Videos deiner Konkurrenz haben in den letzten 7 bis 365 Tagen am meisten Views gemacht? Du siehst es auf einen Blick.",
              },
              {
                label: "KI-Analyse",
                title: "Muster erkennen",
                desc: "Claude analysiert automatisch die viralen Titel und zeigt dir, welche Emotionen, Themen und Strukturen wiederholt auftauchen.",
              },
              {
                label: "KI-Generierung",
                title: "Titel Generator",
                desc: "Auf Basis der viralen Muster generiert Claude Titelvorschläge, die zu deinem Kanal passen — nicht irgendwelche generischen Ideen.",
              },
              {
                label: "Deep Dive",
                title: "Competitor Analyse",
                desc: "Geh tiefer: Verstehe die gesamte Content-Strategie eines einzelnen Kanals — Angles, Titelmuster, was ihn wirklich erfolgreich macht.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <span className="inline-block text-xs font-semibold tracking-widest uppercase text-violet-500 mb-3">{f.label}</span>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — preview */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-3">In drei Schritten zu Ergebnissen</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-12 text-sm">Kein Setup, kein Onboarding-Marathon.</p>
        <div className="space-y-6 text-left">
          {[
            {
              step: "01",
              title: "Channels hinzufügen",
              desc: "Gib die YouTube-Kanäle deiner Konkurrenz ein — per Suche, URL oder Channel-ID. Bis zu 40 gleichzeitig.",
            },
            {
              step: "02",
              title: "Analysieren",
              desc: "Wähle den Zeitraum und Mindest-Views. Viral Tracker holt sich alle relevanten Videos und sortiert sie nach Performance.",
            },
            {
              step: "03",
              title: "Ergebnisse nutzen",
              desc: "Sieh die viralen Videos, lass Claude Muster erkennen und generiere direkt Titelideen für deinen eigenen Kanal.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-5 items-start">
              <span className="text-xs font-bold text-violet-500 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
                {item.step}
              </span>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/anleitung" className="text-sm text-violet-600 dark:text-violet-400 hover:underline font-medium">
            Vollständige Anleitung lesen →
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-3">Transparent und fair</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-14 text-sm">Starte gratis. Upgrade nur wenn du mehr brauchst.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Free", price: "0€", period: "für immer",
                features: ["3 Channels pro Analyse", "KI-Titel Generator", "Muster-Analyse", "Alle Zeitraum-Filter"],
                cta: "Kostenlos starten", highlight: false,
              },
              {
                name: "Basic", price: "8,99€", period: "/ Monat",
                features: ["10 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Kanalliste speichern"],
                cta: "Basic wählen", highlight: true,
              },
              {
                name: "Premium", price: "15,99€", period: "/ Monat",
                features: ["40 Channels pro Analyse", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Mehrere Listen"],
                cta: "Premium wählen", highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col gap-4 ${
                  plan.highlight
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
                }`}
              >
                <div>
                  <p className="text-sm font-medium opacity-60 mb-1">{plan.name}</p>
                  <p className="text-4xl font-bold">{plan.price}</p>
                  <p className="text-sm opacity-60">{plan.period}</p>
                </div>
                <ul className="space-y-2 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="opacity-70">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => { setModalMode("signup"); setModalOpen(true) }}
                  variant={plan.highlight ? "secondary" : "outline"}
                  className={plan.highlight ? "bg-white text-violet-700 hover:bg-violet-50" : ""}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Bereit, smarter zu recherchieren?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Kein Setup. Keine Kreditkarte. Einfach loslegen.
        </p>
        <Button
          size="lg"
          onClick={() => { setModalMode("signup"); setModalOpen(true) }}
          className="text-base px-10 bg-violet-600 hover:bg-violet-700 text-white border-0"
        >
          Jetzt kostenlos starten
        </Button>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span>© 2026 Viral Tracker</span>
          <div className="flex gap-6">
            <Link href="/anleitung" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Anleitung</Link>
            <Link href="/impressum" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">AGB</Link>
          </div>
        </div>
      </footer>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode={modalMode} />
    </div>
  )
}
