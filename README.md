# Tracking Checker

Next.js-App zur Analyse von Cookie-Bannern, Consent Mode, Tracking-Tags und DSGVO-/DMA-Signalen.

## Lokal starten

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Environment-Datei anlegen:

```bash
cp .env.example .env.local
```

3. Werte in `.env.local` eintragen.

Wichtig:
- `NEXTAUTH_URL` muss auf deine echte Dev-URL zeigen.
- Wenn `next dev` auf `3001` statt `3000` läuft, muss `NEXTAUTH_URL=http://localhost:3001` gesetzt werden.

4. Dev-Server starten:

```bash
npm run dev
```

## Wichtige Environment-Variablen

Pflicht fuer konsistentes Verhalten lokal und auf Vercel:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VANTERO_API_KEY`

Je nach Feature zusaetzlich:
- `ADMIN_EMAILS`
- `RESEND_API_KEY`
- `LEADS_TO_EMAIL`
- `LEADS_FROM_EMAIL`

Optional lokal:
- `PUPPETEER_EXECUTABLE_PATH`

## Local vs. Vercel angleichen

Damit lokale Scans und Vercel moeglichst gleich reagieren:
- dieselben Environment-Variablen lokal und in Vercel pflegen
- auf beiden Seiten nur Frischscans vergleichen, nicht Cache mit Frischscan mischen
- identische Ziel-URL inklusive Protokoll testen
- nach Environment-Aenderungen immer neu deployen

Die Analyse-Routen sind fuer Vercel explizit auf:
- `runtime = nodejs`
- bevorzugte Region `fra1`

gesetzt, damit das Verhalten naeher an einer deutschen/EU-Umgebung liegt und geobasierte CMP-/Banner-Unterschiede kleiner werden.

## Validierung

```bash
npm run lint
npm run validate
```
