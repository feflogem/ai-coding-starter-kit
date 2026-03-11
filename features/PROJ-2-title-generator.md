# PROJ-2: Videotitel-Generator

## Status: Planned
**Created:** 2026-03-10
**Last Updated:** 2026-03-10

## Dependencies
- Requires: PROJ-1 (Viral Video Tracker) — virale Videos werden als Inspirationsvorlagen genutzt

## Overview
Nach einer Analyse mit PROJ-1 kann der User seinen eigenen Channel hinterlegen. Die KI analysiert die Top-Videos des eigenen Channels, versteht die spezifischen Sub-Nischen-Stärken (z.B. "Royal Kids performt besser als Meghan/William"), und generiert Titel-Ideen die viral getestete Formate mit den eigenen Channel-Stärken kombinieren. Titel-Variationen unterscheiden sich von den Vorlagen in genau einer Komponente (Person, Adjektiv, Subjekt, Zahl, etc.).

## User Stories
- Als YouTube Creator möchte ich meinen eigenen Channel hinterlegen, damit die KI meinen spezifischen Content-Stil und meine Sub-Nischen-Stärken versteht.
- Als YouTube Creator möchte ich aus den viralen Ergebnissen Inspirations-Videos auswählen, damit nur relevante Vorlagen genutzt werden.
- Als YouTube Creator möchte ich Titel-Vorschläge erhalten, die auf meinem Channel-Stil basieren und sich von den Vorlagen nur in einer Komponente unterscheiden.
- Als YouTube Creator möchte ich verstehen, warum ein Titel vorgeschlagen wird (welche Vorlage, welche Komponente wurde getauscht).

## Acceptance Criteria
- [ ] User kann eigene Channel-ID eingeben (einmalig, wird im Browser gespeichert)
- [ ] App ruft die letzten 25 Videos des eigenen Channels ab und analysiert Top-Performer
- [ ] User kann 1–5 virale Videos aus den PROJ-1 Ergebnissen als Inspiration markieren
- [ ] Auf Knopfdruck generiert Claude 5–10 Titel-Vorschläge
- [ ] Jeder Vorschlag zeigt: generierter Titel + Vorlage-Video + welche Komponente getauscht wurde
- [ ] Ladezustand während der KI-Generierung wird angezeigt
- [ ] Generierte Titel können einzeln in die Zwischenablage kopiert werden

## Edge Cases
- **Eigener Channel hat wenige Videos:** Generierung trotzdem möglich, aber weniger personalisiert — Hinweis an User
- **Keine Inspiration-Videos ausgewählt:** Button deaktiviert mit Hinweis "Bitte mindestens 1 Video als Inspiration markieren"
- **Claude API nicht konfiguriert:** Klare Fehlermeldung
- **Eigener Channel in anderer Sprache als Konkurrenz:** KI generiert Titel in der Sprache des eigenen Channels

## Technical Requirements
- Claude API (server-side, API Key als Umgebungsvariable `ANTHROPIC_API_KEY`)
- Eigene Channel-ID wird in `localStorage` gespeichert (kein Backend nötig)
- Inspiration-Videos werden aus dem PROJ-1 State übergeben (kein extra API-Call)
- Browser Support: Chrome, Firefox, Safari (aktuelle Versionen)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Component Structure
```
Page: / (Home) — erweitert PROJ-1

+-- [bestehend] ChannelInputForm + VideoTable
|
+-- InspirationSelector (erscheint sobald PROJ-1 Ergebnisse vorliegen)
|   +-- Hinweistext: "Markiere bis zu 5 Videos als Inspiration"
|   +-- VideoTable bekommt auswählbare Zeilen (Checkbox pro Zeile)
|   +-- Badge: "X ausgewählt"
|
+-- TitleGeneratorPanel
    +-- Input: Eigene Channel-ID (vorausgefüllt aus localStorage)
    +-- Button: "Titel-Ideen generieren" (deaktiviert wenn 0 Videos markiert)
    +-- Ladezustand (Skeleton / Spinner)
    +-- TitleSuggestionList
        +-- TitleCard (pro Vorschlag)
            +-- Generierter Titel (groß)
            +-- Vorlage: "[Originaltitel]"
            +-- Getauschte Komponente: z.B. "Person: Meghan → Royal Kids"
            +-- Button: Kopieren
```

### Datenfluss
```
User markiert 1-5 Inspiration-Videos (aus PROJ-1 Ergebnissen)
        +
User gibt eigene Channel-ID ein
        ↓
Frontend schickt POST an /api/generate-titles
        ↓
API Route (Server-side):
  1. Eigenen Channel abrufen → letzte 25 Videos + View-Counts
  2. Top-Performer identifizieren (Top 10 nach Views)
  3. Prompt für Claude bauen
  4. Claude API aufrufen (claude-sonnet-4-6)
  5. Strukturierte Antwort zurückgeben
        ↓
Frontend zeigt TitleSuggestionList
```

### Tech-Entscheidungen
| Entscheidung | Gewählt | Warum |
|---|---|---|
| KI-Modell | claude-sonnet-4-6 | Beste Balance aus Qualität und Kosten |
| Eigene Channel-ID | localStorage | Kein Backend nötig, bleibt nach Reload erhalten |
| Inspiration-Auswahl | State in page.tsx | Daten liegen bereits vor, kein extra API-Call |
| API-Antwort | Strukturiertes JSON | Einfaches Rendern mit Vorlage + getauschter Komponente |

### Dependencies
- `@anthropic-ai/sdk` — Claude API Client

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
