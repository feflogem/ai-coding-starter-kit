import Link from "next/link"

export const metadata = { title: "AGB – Viral Tracker" }

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-8 inline-block">
          ← Zurück zur Startseite
        </Link>

        <h1 className="text-3xl font-bold mb-2">Allgemeine Geschäftsbedingungen</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Stand: März 2026</p>

        <div className="space-y-10 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">1. Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen [VORNAME NACHNAME] (nachfolgend „Anbieter") und den Nutzern des Dienstes „Viral Tracker" (nachfolgend „Nutzer"). Abweichende Bedingungen des Nutzers haben keine Gültigkeit, es sei denn, der Anbieter stimmt ihnen ausdrücklich schriftlich zu.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">2. Leistungsbeschreibung</h2>
            <p>
              Viral Tracker ist ein webbasiertes SaaS-Tool zur Analyse öffentlich zugänglicher YouTube-Videodaten. Der Dienst ermöglicht es Nutzern, Virality-Scores zu berechnen, Titelmuster zu erkennen und KI-gestützte Titelvorschläge zu generieren.
            </p>
            <p className="mt-2">
              Der Anbieter stellt die Plattform als Software-as-a-Service bereit. Ein Anspruch auf 100 % Verfügbarkeit besteht nicht. Geplante Wartungsarbeiten werden nach Möglichkeit angekündigt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">3. Vertragsschluss und Tarife</h2>
            <p>
              Der Vertrag kommt durch die Registrierung des Nutzers und die Bestätigung der AGB zustande. Es stehen folgende Tarife zur Verfügung:
            </p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li><strong>Free</strong> – kostenlos, dauerhaft. 3 Channels pro Analyse, KI-Funktionen inklusive.</li>
              <li><strong>Basic</strong> – 8,99 € / Monat (inkl. MwSt.). 10 Channels pro Analyse, alle Funktionen.</li>
              <li><strong>Premium</strong> – 15,99 € / Monat (inkl. MwSt.). 40 Channels pro Analyse, alle Funktionen, mehrere Listen.</li>
            </ul>
            <p className="mt-3">
              Alle Preise verstehen sich als Bruttopreise inklusive der gesetzlichen Mehrwertsteuer.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">4. Zahlung</h2>
            <p>
              Die Abrechnung kostenpflichtiger Tarife erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe. Zahlungsmittel: Kreditkarte, SEPA-Lastschrift (soweit verfügbar). Bei Zahlungsverzug behält sich der Anbieter vor, den Zugang auf den Free-Tarif zu beschränken.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">5. Laufzeit und Kündigung</h2>
            <p>
              Kostenpflichtige Abonnements laufen monatlich und verlängern sich automatisch, wenn sie nicht bis zum Ende der Laufzeit gekündigt werden. Die Kündigung kann jederzeit über das Profil oder per E-Mail an [DEINE@EMAIL.DE] erfolgen und wird zum Ende des laufenden Abrechnungszeitraums wirksam. Eine anteilige Rückerstattung für bereits gezahlte Zeiträume erfolgt nicht.
            </p>
            <p className="mt-2">
              Der Kostenlos-Tarif kann jederzeit durch Löschung des Kontos beendet werden.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">6. Widerrufsbelehrung</h2>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Widerrufsrecht</h3>
              <p>
                Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
              </p>
              <p>
                Um dein Widerrufsrecht auszuüben, musst du uns ([VORNAME NACHNAME], [STRASSE], [PLZ ORT], E-Mail: [DEINE@EMAIL.DE]) mittels einer eindeutigen Erklärung (z. B. eine E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren.
              </p>
              <p>
                Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
              </p>
              <h3 className="font-semibold text-gray-900 dark:text-white pt-2">Folgen des Widerrufs</h3>
              <p>
                Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen.
              </p>
              <h3 className="font-semibold text-gray-900 dark:text-white pt-2">Vorzeitiges Erlöschen des Widerrufsrechts</h3>
              <p>
                Das Widerrufsrecht erlischt vorzeitig, wenn wir mit der Ausführung des Vertrags begonnen haben und du ausdrücklich zugestimmt hast, dass wir mit der Ausführung vor Ablauf der Widerrufsfrist beginnen, und du deine Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung des Vertrags dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB).
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Durch das Anlegen eines Kontos und die aktive Nutzung des Dienstes stimmst du dem sofortigen Beginn der Leistungserbringung zu und nimmst zur Kenntnis, dass dein Widerrufsrecht damit erlischt.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">7. Nutzungsbeschränkungen</h2>
            <p>Der Nutzer verpflichtet sich, den Dienst ausschließlich für legale Zwecke zu nutzen und insbesondere:</p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>keine automatisierten Massenanfragen zu stellen, die den Dienst überlasten</li>
              <li>keine Daten aus der Plattform für Spam oder Missbrauch zu verwenden</li>
              <li>die YouTube API-Nutzungsbedingungen einzuhalten</li>
            </ul>
            <p className="mt-3">
              Bei Verstößen behält sich der Anbieter die sofortige Sperrung des Kontos ohne Rückerstattung vor.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">8. Haftungsbeschränkung</h2>
            <p>
              Der Anbieter haftet unbegrenzt bei Vorsatz und grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper und Gesundheit. Im Übrigen ist die Haftung auf typischerweise vorhersehbare Schäden begrenzt.
            </p>
            <p className="mt-2">
              Der Anbieter übernimmt keine Gewähr für die Korrektheit, Vollständigkeit oder Aktualität der über die YouTube API abgerufenen Daten. Die KI-generierten Vorschläge stellen keine Garantie für den Erfolg von YouTube-Inhalten dar.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">9. Änderungen der AGB</h2>
            <p>
              Der Anbieter behält sich vor, diese AGB mit einer Ankündigungsfrist von mindestens 30 Tagen per E-Mail zu ändern. Widerspricht der Nutzer den Änderungen nicht innerhalb dieser Frist, gelten die neuen AGB als akzeptiert. Im Falle eines Widerspruchs endet der Vertrag zum Zeitpunkt des Inkrafttretens der Änderungen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">10. Anwendbares Recht und Gerichtsstand</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland. Bei Verbrauchern gilt dies nur insoweit, als keine zwingenden Verbraucherschutzvorschriften des Wohnsitzlandes entgegenstehen.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
