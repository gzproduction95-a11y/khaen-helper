# Khaen Logic

**A browser-based composing and practice companion for the verified 16-pipe Khaen layout.**

Khaen Logic helps you explore keys, chords, and note positions on one fixed 16-pipe instrument. It is designed first for personal composing and practice, with a clear visual reference that can also be useful to other players.

Khaen Logic runs entirely in your browser. It does not need an account, API key, application server, database, or cloud service.

## What it does

- Shows the notes and scale degrees available on the verified 16-pipe layout.
- Builds diatonic triads and seventh chords for major and natural-minor keys.
- Offers the current chord modifiers: add9, add11, add13, add6, no3, no5, sus2, sus4, augmented, and diminished.
- Highlights the pipes for a selected chord, with an optional octave view for alternate pipes.
- Lets you select pipes directly and identifies supported chord shapes from their pitch classes.
- Accepts optional MIDI note input from a connected keyboard or controller where Web MIDI is supported.
- Adapts its layout to portrait and landscape screens so the chord panel and instrument diagram remain visible.

### How major keys relate to the instrument

This app models the Khaen as a relative-minor instrument. When you choose a major key, the pipe pitches and fingering display use that key's relative natural minor, while the scale degrees and chord choices are shown in the selected major key. For example, choosing C major maps the physical pipes to A natural minor and labels the notes by their roles in C major.

The pipe order and pitch relationships in the app represent the single 16-pipe layout verified by the project owner. Other Khaen layouts and tunings are not currently supported.

## Try it locally

### Requirements

- Node.js 22.12 or later
- npm

### Install and run

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, usually <http://localhost:5173>.

Mouse and touch controls work without MIDI. MIDI is optional, input-only, and depends on browser support and permission. Browsers generally require a secure context for Web MIDI; `localhost` is treated as secure by modern browsers.

## Using the app

1. Choose a key and mode in the settings panel.
2. Select a chord from the chord list, or tap/click individual pipe positions on the diagram.
3. Use **OCTAVE** to show alternate pipes with matching pitch classes.
4. Use **RESET GRAPH** to clear the current pipe selection.
5. Connect a MIDI keyboard/controller if you want incoming notes reflected in the diagram.

Chord analysis is based on pitch classes, not voicing or bass-note order. The app therefore does not currently identify inversions or claim to optimize fingerings.

## Development

```sh
npm test       # Run the unit and interaction tests
npm run build  # Type-check and create the production site in dist/
npm run preview # Preview the production build locally
```

The source is organized by responsibility:

- `src/domain/instruments/` — verified 16-pipe instrument data.
- `src/domain/theory/` — notes, scales, chord construction, and chord analysis.
- `src/domain/khaenMapping.ts` — maps keys and chords to physical pipe positions.
- `src/midi/` — optional Web MIDI input lifecycle.
- `src/components/` and `src/App.tsx` — interface components and application state.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the project constraints and contribution checks.

## Deploy

Khaen Logic is a static Vite web app. Build it with `npm run build`; the deployable files are written to `dist/`.

- **Vercel:** choose the Vite framework preset, use `npm run build` as the build command, and `dist` as the output directory.
- **Cloudflare Pages:** use `npm run build` as the build command and `dist` as the build output directory.

No environment variables, server-side functions, or provider-specific backend are required.

## Current scope

Supported: the verified 16-pipe layout, major and natural-minor keys, diatonic triads/seventh chords, the listed chord modifiers, direct pipe selection, pitch-class analysis, octave highlighting, and optional MIDI input.

Not currently supported: other Khaen layouts, harmonic/melodic minor or modal systems, audio synthesis or MIDI output, notation, progressions, inversion/bass-aware analysis, user accounts, or cloud-saved sessions.

## License

No license has been specified yet. Until a license is added, please do not assume that the source is available for reuse or redistribution.
