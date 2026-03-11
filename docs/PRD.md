# Product Requirements Document

## Vision
Ein Web-Tool für YouTube Creator, mit dem sie die performantesten Videos von Konkurrenz-Channels analysieren können. User geben Channel-IDs ein, das Tool ruft die Videos via YouTube API ab und zeigt gefiltert und sortiert die Top-Performer an — direkt im Browser, ohne Google Sheets oder n8n.

## Target Users
**YouTube Creator** (primär: deutschsprachig, aber nicht limitiert), die:
- regelmäßig Konkurrenz-Channels beobachten wollen
- schnell herausfinden wollen, welche Video-Themen gerade viral gehen
- bisher manuell oder über komplexe Workflows (n8n, Sheets) recherchieren

**Pain Points:**
- Manuelle Recherche auf YouTube ist zeitaufwändig
- n8n-Workflows sind technisch, nicht für andere nutzbar
- Kein einfaches Tool speziell für diesen Use Case

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Viral Video Tracker (Channel Input, Fetch, Filter, Tabelle) | Planned |
| P1 | User Authentication & Accounts | Planned |
| P1 | Erweiterte Channel-Listen (40+ Channels, gespeicherte Listen) | Planned |
| P2 | CSV Export | Planned |
| P2 | Benachrichtigungen (neues virales Video) | Planned |

## Success Metrics
- Mindestens 5 Freunde testen den MVP und finden ihn nützlich
- Durchschnittliche Session-Dauer > 2 Minuten
- User kommen mehr als einmal zurück

## Constraints
- YouTube Data API v3: 10.000 Units/Tag (kostenlos) — reicht für moderaten MVP-Betrieb
- Keine Datenbank für MVP (kein State, kein Login)
- Deploy auf Vercel (kostenlos)
- Solo-Entwickler, kleines Budget

## Non-Goals (MVP)
- Kein Login / keine User-Accounts (kommt in P1)
- Kein Google Sheets Export (existiert bereits via n8n)
- Keine YouTube Shorts Analyse
- Keine Benachrichtigungen / Alerts
- Kein Speichern von Suchergebnissen

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.
