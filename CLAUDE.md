# Viral Tracker

SaaS-Tool für YouTube-Creator zur Analyse viraler Konkurrenz-Videos. Nutzer analysieren Channels, sehen Virality-Scores, lassen KI Titelmuster erkennen und generieren Titelvorschläge.

## Tech Stack

- **Framework**: Next.js 15 App Router, TypeScript — interaktive Seiten mit `"use client"`
- **Auth + DB**: Supabase (Projekt-ID: `nohrlqktlonrtywywdaj`)
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`) — Muster-Analyse + Titelgenerator
- **Daten**: YouTube Data API v3
- **Styling**: Tailwind CSS + shadcn/ui
- **UI-Sprache**: Deutsch

## Build Commands

```bash
npm run dev        # localhost:3000
npm run build
npm run lint
```

## Routen

| Route | Beschreibung |
|---|---|
| `/` | Landingpage |
| `/analysen` | Haupt-App (Viral Tracker + Competitor Analyse Tabs) |
| `/verlauf` | Vergangene Analysen mit Lösch-Funktion |
| `/verlauf/[id]` | Detail-Ansicht einer Analyse |
| `/profil` | YouTube-Channel hinterlegen (mit API-Validierung) |
| `/anleitung` | How-To (AppShell wenn eingeloggt, plain wenn nicht) |
| `/impressum` | Impressum (Platzhalter noch ausfüllen!) |
| `/datenschutz` | Datenschutzerklärung (DSGVO) |
| `/agb` | AGB inkl. Widerrufsbelehrung |

## API-Routes

| Route | Beschreibung |
|---|---|
| `/api/analyze` | Haupt-Analyse: channels, dayRange, minViews, maxResults |
| `/api/subscriptions` | Öffentliche Abos eines Channels inkl. Subscriber-Counts |
| `/api/validate-channel` | Prüft ob YouTube-Channel existiert (`?q=`) |

## Supabase-Tabellen

- `profiles` — `user_id`, `youtube_channel_id`
- `scans` — `user_id`, `channels` (JSON), `day_range`, `min_views`, `video_count`, `created_at`
- `channel_lists` — User-spezifische Channel-Listen
- `channel_list_items` — `channel_id`, `channel_name`, `channel_thumbnail`

## Virality-Score-Formel

```ts
const ratio = viewCount / subscriberCount
const outperf = ratio < 1
  ? Math.log10(ratio + 1) * ratio   // Penalty wenn views < subs
  : Math.log10(ratio + 1)
const daysOld = Math.max(1, (Date.now() - publishedAt) / 86400000)
const velocity = Math.sqrt(viewCount / daysOld)
const score = Math.min(100, Math.round(outperf * velocity / 253 * 1000) / 10)
```

## Pricing-Tiers

- **Free**: kostenlos, 3 Channels/Analyse
- **Basic**: 8,99 €/Monat, 10 Channels
- **Premium**: 15,99 €/Monat, 40 Channels

## Wichtige Implementierungsdetails

- Nach Login (E-Mail + OAuth) → immer redirect zu `/analysen`
- Sticky-Panels brauchen `max-h-[calc(100vh-...)] overflow-y-auto` — sonst werden Buttons off-screen geclippt
- Subscriptions-Auswahl: zentriertes Modal (fixed overlay), kein Drawer
- shadcn/ui-Komponenten aus `src/components/ui/` nie neu erstellen

## Launch-Checkliste

- [ ] Impressum-Platzhalter ersetzen: `[VORNAME NACHNAME]`, `[STRASSE]`, `[PLZ ORT]`, `[EMAIL]`
- [ ] Stripe-Integration: Abo-Verwaltung, Webhooks, Abo-Status in DB
- [ ] Feature-Gating im Backend (Free: max 3 Channels — aktuell nur UI, kein Backend-Gate)
- [ ] AGB-Zustimmungs-Checkbox im AuthModal bei Registrierung
