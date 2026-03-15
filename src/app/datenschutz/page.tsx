import Link from "next/link"

export const metadata = { title: "Datenschutzerklärung – Viral Tracker" }

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <Link href="/" className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-8 inline-block">
          ← Zurück zur Startseite
        </Link>

        <h1 className="text-3xl font-bold mb-2">Datenschutzerklärung</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">Stand: März 2026</p>

        <div className="space-y-10 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">1. Verantwortlicher</h2>
            <p>
              Verantwortlicher im Sinne der DSGVO ist:<br /><br />
              [VORNAME NACHNAME]<br />
              [STRASSE HAUSNUMMER]<br />
              [PLZ ORT]<br />
              E-Mail: [DEINE@EMAIL.DE]
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">2. Erhobene Daten und Zwecke</h2>

            <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-1">2.1 Registrierung und Anmeldung</h3>
            <p>
              Bei der Registrierung erheben wir deine E-Mail-Adresse und ein Passwort (verschlüsselt gespeichert). Diese Daten sind erforderlich, um dir Zugang zum Dienst zu ermöglichen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
            <p className="mt-2">
              Alternativ kann die Anmeldung über Google OAuth erfolgen. In diesem Fall übermittelt Google deine E-Mail-Adresse und deinen Namen an uns. Bitte beachte hierzu die Datenschutzrichtlinie von Google.
            </p>

            <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-1">2.2 YouTube-Kanal-Konfiguration</h3>
            <p>
              Wenn du in deinem Profil einen YouTube-Kanal hinterlegst, speichern wir die Kanal-ID sowie den öffentlichen Kanalnamen und das Kanalbild. Diese Daten werden ausschließlich zur Nutzung der App-Funktionen (z. B. Laden deiner Abonnements) verwendet.
            </p>

            <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-1">2.3 Analyse-Daten</h3>
            <p>
              Bei der Durchführung von Analysen werden öffentlich zugängliche YouTube-Daten (Videotitel, Aufrufzahlen, Veröffentlichungsdaten) über die YouTube Data API abgerufen. Diese Daten werden zur Anzeige der Ergebnisse in deinem Verlauf gespeichert. Es handelt sich ausschließlich um öffentliche Metadaten – keine privaten Nutzerdaten Dritter.
            </p>

            <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-1">2.4 KI-gestützte Funktionen</h3>
            <p>
              Für die Muster-Analyse und den Titel-Generator werden Videotitel und -metadaten (keine personenbezogenen Daten) an die Anthropic API übermittelt. Anthropic verarbeitet diese Daten zur Generierung von Analyse-Ergebnissen. Es werden keine personenbezogenen Daten an Anthropic übermittelt.
            </p>

            <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4 mb-1">2.5 Technische Nutzungsdaten</h3>
            <p>
              Beim Besuch der Website werden technische Daten (IP-Adresse, Browser-Typ, Zugriffszeit) durch den Hosting-Anbieter Vercel protokolliert. Diese Daten dienen der Absicherung und dem Betrieb des Dienstes und werden nicht für Werbezwecke genutzt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">3. Cookies und Session-Daten</h2>
            <p>
              Wir verwenden technisch notwendige Cookies ausschließlich zur Verwaltung deiner Anmeldesitzung (Session-Cookie). Ohne diese Cookies ist eine Nutzung des eingeloggten Bereichs nicht möglich. Marketing- oder Tracking-Cookies werden nicht eingesetzt.
            </p>
            <p className="mt-2">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO sowie § 25 Abs. 2 TDDDG.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">4. Auftragsverarbeiter</h2>
            <p>Wir setzen folgende Dienstleister ein, mit denen Auftragsverarbeitungsverträge geschlossen wurden oder die durch eigene Datenschutzzertifizierungen abgedeckt sind:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>
                <strong>Supabase Inc.</strong> (USA / EU-Region) – Authentifizierung und Datenbank. Datenverarbeitung auf Basis von EU-Standardvertragsklauseln.
              </li>
              <li>
                <strong>Vercel Inc.</strong> (USA) – Hosting und Bereitstellung der Webanwendung. Datenverarbeitung auf Basis von EU-Standardvertragsklauseln.
              </li>
              <li>
                <strong>Anthropic PBC</strong> (USA) – KI-Verarbeitung von nicht-personenbezogenen Videometadaten.
              </li>
              <li>
                <strong>Google LLC / YouTube</strong> – Quelle öffentlicher YouTube-Daten über die YouTube Data API v3.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">5. Speicherdauer</h2>
            <p>
              Deine Kontodaten werden gespeichert, solange du ein aktives Konto hast. Analyse-Ergebnisse (Verlauf) werden bis zur manuellen Löschung durch dich oder bei Kontolöschung aufbewahrt. Du kannst einzelne Einträge jederzeit selbst löschen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">6. Deine Rechte</h2>
            <p>Du hast jederzeit das Recht auf:</p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>Auskunft über die zu dir gespeicherten Daten (Art. 15 DSGVO)</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
              <li>Löschung deiner Daten (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>Beschwerde bei der zuständigen Datenschutzaufsichtsbehörde</li>
            </ul>
            <p className="mt-3">
              Zur Ausübung deiner Rechte wende dich an: [DEINE@EMAIL.DE]
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">7. Datensicherheit</h2>
            <p>
              Alle Datenübertragungen erfolgen verschlüsselt über HTTPS/TLS. Passwörter werden ausschließlich in gehashter Form gespeichert und sind für uns nicht einsehbar.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
