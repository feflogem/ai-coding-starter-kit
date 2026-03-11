# PROJ-1: Viral Video Tracker (Core)

## Status: Planned
**Created:** 2026-03-10
**Last Updated:** 2026-03-10

## Dependencies
- None

## Overview
YouTube Creator können bis zu 10 Konkurrenz-Channel-IDs eingeben. Das Tool ruft via YouTube Data API v3 die letzten 25 Long-form Videos pro Channel ab, filtert nach Mindestabrufen und Zeitraum, und zeigt die Ergebnisse sortiert als Tabelle an.

## User Stories
- Als YouTube Creator möchte ich mehrere Konkurrenz-Channel-IDs eingeben, damit ich alle auf einmal analysieren kann.
- Als YouTube Creator möchte ich einen Mindestabruf-Schwellenwert setzen (z.B. 50.000 Views), damit nur wirklich virale Videos angezeigt werden.
- Als YouTube Creator möchte ich einen Zeitraum festlegen (z.B. letzte 30 Tage), damit ich aktuelle Trends sehe.
- Als YouTube Creator möchte ich die Ergebnisse nach Views oder Uploaddatum sortieren, damit ich die relevantesten Videos oben sehe.
- Als YouTube Creator möchte ich, dass Shorts automatisch herausgefiltert werden, damit ich mich auf Long-form Content konzentrieren kann.
- Als YouTube Creator möchte ich die Ergebnisse als Tabelle sehen mit Titel, Channel, Views, Datum und einem Link zum Video.

## Acceptance Criteria
- [ ] User kann 1–10 YouTube Channel-IDs in ein Textfeld eingeben (eine pro Zeile oder kommagetrennt)
- [ ] User kann einen Mindestabruf-Wert eingeben (Default: 50.000)
- [ ] User kann einen Zeitraum wählen: letzte 7 / 14 / 30 / 90 Tage (Default: 30 Tage)
- [ ] User kann die Sortierung wählen: nach Views (absteigend) oder nach Uploaddatum (neueste zuerst)
- [ ] Nach Klick auf "Analysieren" werden die Videos abgerufen
- [ ] Nur Long-form Videos werden angezeigt (Shorts = Videos kürzer als 60 Sekunden werden ausgeschlossen)
- [ ] Ergebnisse werden als Tabelle angezeigt mit: Titel, Channel-Name, Views, Uploaddatum, Link zum Video
- [ ] Während des Ladens wird ein Ladezustand angezeigt
- [ ] Wenn ein Channel nicht gefunden wird, wird eine klare Fehlermeldung angezeigt (Channel übersetzt oder nicht gefunden)
- [ ] Wenn keine Videos den Filterkriterien entsprechen, wird eine leere-Ergebnis-Meldung angezeigt
- [ ] Die App ist ohne Login nutzbar

## Edge Cases
- **Ungültige Channel-ID:** Fehlermeldung für den jeweiligen Channel, restliche Channels werden trotzdem abgerufen
- **API-Kontingent erschöpft:** Klare Fehlermeldung "API-Limit erreicht, bitte später versuchen"
- **Channel ist privat oder gelöscht:** Fehlermeldung pro Channel
- **Alle Videos sind Shorts:** Tabelle leer, Hinweis "Keine Long-form Videos im gewählten Zeitraum gefunden"
- **Zeitraum schließt alle Videos aus:** Leere Tabelle mit Hinweis, Zeitraum zu erweitern
- **Doppelte Channel-IDs:** Deduplizierung vor dem Abruf
- **Sehr langsame API-Antwort:** Timeout nach 30 Sekunden mit Fehlermeldung
- **Netzwerkfehler:** Klare Fehlermeldung mit Retry-Option

## Technical Requirements
- YouTube Data API v3 (Server-side, API Key nicht im Frontend exponiert)
- API Key wird als Umgebungsvariable gespeichert (`YOUTUBE_API_KEY`)
- Pro Channel: 1 Search-Request (letzte 25 Videos) + 1 Videos-Request (Details) = ~2–3 API Units
- Bei 10 Channels: ~20–30 API Units pro Anfrage (weit unter dem 10.000 Units/Tag Limit)
- Shorts-Erkennung: Videos mit Dauer < 60 Sekunden (via `contentDetails.duration`)
- Browser Support: Chrome, Firefox, Safari (aktuelle Versionen)
- Responsive: funktioniert auf Desktop und Tablet

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
Page: / (Home)
+-- ChannelInputForm
|   +-- Textarea (Channel IDs, eine pro Zeile)
|   +-- FilterBar
|       +-- Input: Mindestabrufe (Default: 50.000)
|       +-- Select: Zeitraum (7 / 14 / 30 / 90 Tage)
|       +-- Select: Sortierung (Views | Uploaddatum)
|   +-- Button: "Analysieren"
|
+-- ResultsSection (erscheint nach Suche)
|   +-- ResultsSummary (z.B. "23 Videos gefunden über 4 Channels")
|   +-- VideoTable
|       +-- Columns: Titel | Channel | Views | Datum | Link
|       +-- SkeletonLoader (während Laden)
|       +-- EmptyState (keine Treffer)
|
+-- ErrorDisplay (ungültige IDs, API-Fehler etc.)
```

### Datenfluss
```
User gibt Channel-IDs ein
        ↓
Frontend schickt POST an /api/analyze
        ↓
API Route (Server-side):
  1. Für jeden Channel: YouTube API → letzte 25 Videos abrufen
  2. Shorts rausfiltern (Dauer < 60 Sek.)
  3. Nach Zeitraum filtern
  4. Nach Mindestabrufen filtern
  5. Sortieren
        ↓
Gefilterte Video-Liste zurück ans Frontend
        ↓
Frontend zeigt Tabelle
```

### Tech-Entscheidungen
| Entscheidung | Gewählt | Warum |
|---|---|---|
| API-Calls | Server-side (Next.js API Route) | API Key bleibt geheim, nie im Browser sichtbar |
| State | Kein Backend/DB | MVP braucht keine Persistenz, alles in-memory |
| Shorts-Erkennung | Video-Dauer < 60 Sek. | Zuverlässigste Methode via YouTube API |
| UI | shadcn/ui Table + Skeleton | Bereits installiert, kein Extra-Package nötig |

### Dependencies
Keine neuen Packages erforderlich — alle UI-Komponenten bereits vorhanden.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
