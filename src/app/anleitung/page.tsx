"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/AuthModal"

export default function AnleitungPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight">Viral Tracker</span>
        </Link>
        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white border-0 text-sm"
        >
          Kostenlos starten
        </Button>
      </nav>

      {/* Header */}
      <section className="max-w-3xl mx-auto px-4 pt-14 pb-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
          ← Zurück zur Startseite
        </Link>
        <span className="inline-block text-xs font-semibold tracking-widest uppercase text-violet-500 mb-4">Anleitung</span>
        <h1 className="text-4xl font-bold mb-4 leading-tight">Wie du Viral Tracker<br />am besten nutzt</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
          Viral Tracker ist ein Recherche-Tool für YouTube-Creator. Hier erfährst du, für wen es gemacht ist, wie die einzelnen Funktionen zusammenspielen — und wie du in unter fünf Minuten zu deinem ersten Insight kommst.
        </p>
      </section>

      {/* For whom */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Für wen ist das Tool?</h2>
        <div className="space-y-4">
          {[
            {
              title: "YouTube-Creator, die wachsen wollen",
              desc: "Du bist nicht neu auf YouTube, aber du fragst dich regelmäßig: Warum performt dieses Video so viel besser als das andere? Was machen die erfolgreichen Kanäle in meiner Nische anders? Viral Tracker gibt dir Antworten — auf Basis echter Daten, nicht Meinungen.",
            },
            {
              title: "Creator in wettbewerbsintensiven Nischen",
              desc: "Je mehr Kanäle es in deiner Nische gibt, desto wichtiger ist es zu verstehen, was den Unterschied macht. Fitness, Finance, Gaming, Business, Food — in jeder Nische gibt es virale Muster. Die musst du nicht selbst entdecken.",
            },
            {
              title: "Content-Strategen und Agenturen",
              desc: "Du betreust mehrere Kanäle oder planst Redaktionspläne? Viral Tracker gibt dir einen strukturierten Überblick über ganze Nischen — ohne stundenlange Handarbeit.",
            },
          ].map((item) => (
            <div key={item.title} className="p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 p-5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">Was Viral Tracker nicht ist:</span> Kein automatischer Upload-Bot, kein SEO-Tool für Beschreibungen oder Tags, und kein Ersatz für eigene Kreativität. Es ist ein Recherchetool — du entscheidest, was du damit machst.
          </p>
        </div>
      </section>

      {/* Feature 1: Viral Tracker */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-500 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full">Funktion 1</span>
          <h2 className="text-2xl font-bold">Viral Video Tracker</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Das ist der Kern des Tools. Du gibst Konkurrenz-Kanäle ein, wählst einen Zeitraum — und siehst sofort, welche Videos davon am stärksten performen.
        </p>

        <div className="space-y-5">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
              Channels hinzufügen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed ml-8">
              Suche nach Kanalnamen oder gib direkt eine YouTube-URL, einen @Handle oder eine Channel-ID ein. Du kannst mehrere Kanäle gleichzeitig analysieren — im Free-Plan bis zu 3, im Premium-Plan bis zu 40. Tipp: Analysiere immer mehrere Kanäle auf einmal, um eine größere Datenmenge zu bekommen.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">2</span>
              Zeitraum und Filter wählen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed ml-8">
              Wähle, wie weit zurück du schauen willst: letzte 7 Tage, letzten Monat, 3 Monate, letztes Jahr — oder einen eigenen Zeitraum mit Datepicker. Setze außerdem Mindestabrufe, um kleine Videos herauszufiltern. 50.000 Views ist ein guter Startpunkt; in kleineren Nischen kannst du das auf 10.000 senken.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shrink-0">3</span>
              Ergebnisse lesen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed ml-8">
              Die Ergebnistabelle zeigt dir alle Videos mit Views, Datum und dem sogenannten Virality Score. Der Score setzt Views ins Verhältnis zur Channelgröße und dem Alter des Videos — ein Video mit 500.000 Views von einem Kanal mit 1 Mio. Abonnenten ist weniger beeindruckend als dasselbe Ergebnis von einem 50K-Kanal.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tipp</p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Klicke auf einen Spaltenkopf, um nach Views oder Datum zu sortieren. Per Checkbox kannst du bis zu 5 Videos als Inspiration für den Titel-Generator markieren.
          </p>
        </div>
      </section>

      {/* Feature 2: Pattern Analysis */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-500 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full">Funktion 2</span>
          <h2 className="text-2xl font-bold">Muster & Erkenntnisse</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Nach einer Analyse läuft automatisch eine KI-Auswertung aller viralen Titel. Claude erkennt, was die Videos gemeinsam haben — und fasst es in klare Muster zusammen.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Typische Erkenntnisse sind z.B.: "Alle Top-Videos nutzen eine konkrete Zahl im Titel", "Emotionale Trigger wie Schock oder Überraschung tauchen in 7 von 10 Titeln auf" oder "Der Channel setzt stark auf persönliche Erfahrungsberichte als Einstieg." Das sind Insights, die du beim manuellen Durchscrollen leicht übersiehst.
        </p>
      </section>

      {/* Feature 3: Title Generator */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-500 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full">Funktion 3</span>
          <h2 className="text-2xl font-bold">KI-Titel Generator</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Markiere aus den Ergebnissen 1–5 Videos als Inspiration. Dann generiert Claude Titelideen für deinen Kanal — basierend auf den viralen Strukturen, aber angepasst auf deine Nische und Sprache.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
          Damit das gut funktioniert, hinterlege deinen eigenen YouTube-Kanal im Profil. Claude analysiert dann deine eigenen Top-Videos und versteht, welche Themen und welchen Stil dein Kanal hat — und generiert Ideen, die wirklich passen.
        </p>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">So bekommst du die besten Ergebnisse</p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5">
            <li className="flex items-start gap-2"><span className="text-violet-500 shrink-0 mt-0.5">→</span> Wähle 3–5 Videos aus, nicht nur eines</li>
            <li className="flex items-start gap-2"><span className="text-violet-500 shrink-0 mt-0.5">→</span> Hinterlege deinen Channel-Handle im Profil</li>
            <li className="flex items-start gap-2"><span className="text-violet-500 shrink-0 mt-0.5">→</span> Nutze Videos aus verschiedenen Kanälen als Inspiration für mehr Vielfalt</li>
            <li className="flex items-start gap-2"><span className="text-violet-500 shrink-0 mt-0.5">→</span> Die generierten Titel sind Vorlagen — passe sie noch auf dein spezifisches Video-Thema an</li>
          </ul>
        </div>
      </section>

      {/* Feature 4: Competitor Analyse */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-500 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full">Funktion 4</span>
          <h2 className="text-2xl font-bold">Competitor Analyse</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Für einen Deep Dive in einen einzelnen Kanal. Gib einen Channel-Namen oder URL ein und erhalte eine strukturierte Analyse: Was sind die wiederkehrenden Content-Angles? Welche Titelstrukturen nutzt der Kanal? Was sind seine stärksten Videos?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Die Competitor Analyse eignet sich besonders gut, um neue Nischen zu erkunden oder einen Kanal zu verstehen, bevor du anfängst, ähnliche Inhalte zu erstellen. Alle Analysen werden gespeichert und können jederzeit erneut aufgerufen werden.
        </p>
      </section>

      {/* Workflow tip */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Empfohlener Workflow</h2>
        <div className="space-y-4">
          {[
            { step: "Wöchentlich", title: "Viral Video Tracker laufen lassen", desc: "Analysiere 5–10 Konkurrenz-Kanäle für die letzten 30 Tage. Sieh, was sich seit der letzten Woche verändert hat — welche Themen gerade hochkommen." },
            { step: "Bei Planung", title: "Titel Generator nutzen", desc: "Wenn du ein neues Video planst, wähle 3–5 aktuelle Top-Videos als Inspiration und generiere Titelideen. Dann wähle das Beste aus und schärfe es nach." },
            { step: "Beim Start eines neuen Themas", title: "Competitor Analyse machen", desc: "Wenn du eine neue Nische oder ein neues Format ausprobieren willst, analysiere zuerst 2–3 der erfolgreichsten Kanäle in diesem Bereich." },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 items-start p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 px-2.5 py-1 rounded-full shrink-0 mt-0.5 whitespace-nowrap">
                {item.step}
              </span>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Häufige Fragen</h2>
        <div className="space-y-5">
          {[
            {
              q: "Warum sehe ich manchmal keine Ergebnisse?",
              a: "Das passiert, wenn der Kanal im gewählten Zeitraum keine Videos mit den gesetzten Mindestabrufen hatte. Probiere einen längeren Zeitraum oder niedrigere Mindestabrufe.",
            },
            {
              q: "Wie frisch sind die Daten?",
              a: "Viral Tracker fragt die YouTube Data API in Echtzeit an. Die Daten sind immer aktuell zum Zeitpunkt deiner Analyse.",
            },
            {
              q: "Warum unterscheidet sich das Ergebnis wenn ich denselben Scan nochmals mache?",
              a: "Views ändern sich kontinuierlich. Ein Video das gestern 80.000 Views hatte kann heute über deinem Filter von 50.000 liegen — oder darunter.",
            },
            {
              q: "Was ist der Virality Score?",
              a: "Der Score setzt die Views eines Videos ins Verhältnis zur Channelgröße (Abonnenten) und dem Alter des Videos. So siehst du schnell, welche Videos überproportional gut performen — unabhängig davon, wie groß der Kanal ist.",
            },
            {
              q: "Werden meine Channel-Listen gespeichert?",
              a: "Ja, wenn du eingeloggt bist. Du kannst die Liste über den Button 'Liste speichern' explizit abspeichern. Im Free-Plan wird eine Liste gespeichert, im Basic- und Premium-Plan mehrere.",
            },
          ].map((item) => (
            <div key={item.q} className="border-b border-gray-100 dark:border-gray-800 pb-5 last:border-0">
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">Bereit loszulegen?</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Kostenlos, sofort, kein Kreditkarte.</p>
        <Button
          size="lg"
          onClick={() => setModalOpen(true)}
          className="text-base px-10 bg-violet-600 hover:bg-violet-700 text-white border-0"
        >
          Jetzt kostenlos starten
        </Button>
      </section>

      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">← Zurück zur Startseite</Link>
          <span>© 2026 Viral Tracker</span>
        </div>
      </footer>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultMode="signup" />
    </div>
  )
}
