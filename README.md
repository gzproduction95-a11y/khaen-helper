# Khaen Logic

A browser-based tool for composing and practicing on the verified 16-pipe Khaen layout. It displays scale notes, diatonic chords, selected pipes, and pitch-class chord analysis, with optional Web MIDI input.

The app is client-only: it requires no API server, account, database, API key, or environment variables. It supports major and natural-minor keys for the single 16-pipe layout represented in the app.

## Requirements

- Node.js 22.12 or newer
- npm

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Web MIDI is optional; browser support and secure-context requirements vary. Mouse and touch controls work without MIDI.

## Quality checks

```sh
npm test
npm run build
```

The production-ready static site is written to `dist/`. To serve that output locally:

```sh
npm run preview
```

## Deploy

The repository can be deployed as a static site to Vercel or Cloudflare Pages. Use `npm run build` as the build command and `dist` as the output directory. No environment variables or server-side functions are needed.
