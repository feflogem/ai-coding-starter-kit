"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
      if (data.user) { setRedirecting(true); setTimeout(() => router.push("/analysen"), 500) }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setRedirecting(true); setTimeout(() => router.push("/analysen"), 600) }
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
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 mb-7">
          Viral Video Tracker + Channel Analysis
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
          Lass die Daten<br />die Arbeit machen.
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10">
          Finde virale Muster, analysiere Konkurrenz-Kanäle und generiere KI-Titel — alles in einem Tool für YouTube-Creator.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => { setModalMode("signup"); setModalOpen(true) }}
            className="text-base px-8 bg-violet-600 hover:bg-violet-700 text-white border-0"
          >
            Jetzt kostenlos starten
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => { setModalMode("login"); setModalOpen(true) }}
            className="text-base px-8"
          >
            Anmelden
          </Button>
        </div>
        <p className="text-sm text-gray-400 mt-4">Keine Kreditkarte nötig · Kostenlos bis zu 3 Channels</p>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { value: "< 30 Sek.", label: "bis zum ersten Ergebnis" },
            { value: "bis zu 40", label: "Channels gleichzeitig analysieren" },
            { value: "KI-gestützt", label: "Muster, Insights & Titelideen" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Was Viral Tracker kann</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Klar kann man Konkurrenz-Channels manuell durchforsten — aber wer hat dafür jeden Tag die Zeit? Viral Tracker automatisiert diese Recherche und gibt dir mit KI Einblicke, die du sonst gar nicht hättest.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: "Recherche",
                title: "Viral Video Tracker",
                desc: "Sieh sofort, welche Videos deiner Konkurrenz in den letzten 7–90 Tagen am stärksten performen.",
              },
              {
                label: "KI-Analyse",
                title: "Muster & Erkenntnisse",
                desc: "Automatische Erkennung wiederkehrender Muster in viralen Titeln — Emotionen, Themen, Strukturen.",
              },
              {
                label: "KI-Generierung",
                title: "Titel Generator",
                desc: "Claude generiert maßgeschneiderte Titelvorschläge für deinen Channel — in deiner Sprache und Nische.",
              },
              {
                label: "Deep Dive",
                title: "Competitor Analyse",
                desc: "Verstehe die Content-Strategie eines Channels: Angles, Titelmuster und was ihn wirklich erfolgreich macht.",
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

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-3">Einfache Preise</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-14 text-sm">Starte kostenlos. Upgrade wenn du mehr brauchst.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              name: "Free", price: "0€", period: "für immer",
              features: ["Bis zu 3 Channels", "KI-Titel Generator", "Muster-Analyse", "Alle Filter"],
              cta: "Jetzt starten", highlight: false,
            },
            {
              name: "Basic", price: "8,99€", period: "/ Monat",
              features: ["Bis zu 10 Channels", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Liste speichern"],
              cta: "Basic starten", highlight: true,
            },
            {
              name: "Premium", price: "15,99€", period: "/ Monat",
              features: ["Bis zu 40 Channels", "Competitor Analyse", "KI-Titel Generator", "Muster-Analyse", "Mehrere Listen"],
              cta: "Premium starten", highlight: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border p-6 flex flex-col gap-4 ${
                plan.highlight
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-gray-200 dark:border-gray-700"
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
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-8 text-center text-sm text-gray-400">
        © 2026 Viral Tracker
      </footer>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode={modalMode} />
    </div>
  )
}
