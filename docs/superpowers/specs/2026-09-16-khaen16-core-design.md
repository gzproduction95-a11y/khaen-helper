# Khaen 16 Core Architecture Design

## Status

Approved direction: establish a reliable, tested musical core for the existing 16-pipe Khaen web app before adding new practice or composition features.

## Product Context

Khaen Logic is primarily a personal composition and practice tool. A public tool for other Khaen players is a secondary goal. The app will support one instrument format only: the verified 16-pipe layout currently represented in the UI.

The existing left/right pipe ordering, scale degrees, and high/low relationships have been verified against the user's physical instrument. They are authoritative product data and must not change during this phase.

## Goals

- Preserve the current UI behavior and the verified 8+8 pipe layout.
- Separate instrument data, music theory, application state, MIDI input, and presentation concerns.
- Make chord construction and chord analysis deterministic and independently testable.
- Correct known theory defects, including the unreachable `sus2` recognition branch.
- Establish a reproducible web build suitable for local use, Vercel, and Cloudflare.
- Create a foundation for later voicing, inversion, chord-progression, and fingering recommendations.

## Non-Goals

- Supporting Khaen formats other than the verified 16-pipe instrument.
- Redesigning the visual appearance or interaction model.
- Adding accounts, cloud persistence, a database, or a server API.
- Adding generalized user-editable instrument definitions.
- Rebuilding MIDI support beyond preserving existing behavior.
- Adding audio synthesis, notation, chord progressions, or fingering optimization in this phase.
- Publishing or deploying the app during this phase.

## Selected Approach

Use a foundation-first refactor. Retain the existing React/Vite web app and extract domain logic behind small typed interfaces. The UI will consume those interfaces but will not calculate scale, chord, or instrument rules directly.

This approach was selected over patching `App.tsx` in place because the current file combines domain data, chord construction, chord analysis, MIDI lifecycle, responsive behavior, and rendering. It was selected over a full practice-workstation rewrite because that would expand scope before the musical results are verified.

## Architecture

### 1. Instrument domain

Create a single immutable `Khaen16` definition containing the current verified pipe data. Each pipe record will include:

- Stable ID such as `L8` or `R1`.
- Side and vertical position.
- Scale-degree index.
- Existing displayed degree label.
- Register/display category currently represented by black, blue, or green.

The initial model preserves the existing relative-degree behavior. It will not invent absolute octave numbers or physical properties that the current verified data does not establish.

Expected module boundary:

```text
src/domain/instruments/khaen16.ts
```

### 2. Music-theory domain

Create pure functions and types for:

- Pitch classes.
- Major and natural-minor scales.
- Display spelling of notes within the supported key choices.
- Diatonic triad and seventh-chord construction.
- Chord modifiers: `add9`, `add11`, `add13`, `add6`, `no3`, `no5`, `sus2`, `sus4`, `aug`, and `dim`.
- Chord analysis from an unordered set of pitch classes.
- Candidate ranking using an optional selected-root hint and the active key.

The first version continues to analyze pitch-class sets rather than voicings. It will not claim to recognize inversions because octave and bass-order information are not represented yet.

Expected module boundaries:

```text
src/domain/theory/notes.ts
src/domain/theory/scales.ts
src/domain/theory/chords.ts
src/domain/theory/analyzeChord.ts
```

### 3. Application mapping layer

Create two explicit, independently tested transformations:

```text
Selected chord + key
  -> chord pitch classes
  -> recommended primary-register Khaen pipe IDs

Selected Khaen pipe IDs + key
  -> unique pitch classes
  -> ranked chord-analysis result
```

The first transformation must preserve the current rule that sidebar chord selection highlights only the primary black-label pipes. The existing Octave control may then reveal alternate pipes carrying an already-active pitch class.

Expected module boundary:

```text
src/domain/khaenMapping.ts
```

### 4. UI components

Split the current component only along existing visual responsibilities:

```text
src/components/SettingsPanel.tsx
src/components/ChordSelector.tsx
src/components/AnalysisPanel.tsx
src/components/KhaenDiagram.tsx
src/components/SidebarToggle.tsx
```

`App.tsx` remains the composition root and owns shared UI state. Components receive typed values and callbacks. They do not duplicate theory or instrument rules.

The layout, colors, labels, responsive sidebar behavior, and existing controls remain visually equivalent in this phase.

### 5. MIDI boundary

Move browser MIDI lifecycle code into a focused hook without changing the user-visible MIDI feature:

```text
src/midi/useMidiInput.ts
```

The hook will own access setup, input listener registration, listener cleanup, and connection state. Incoming notes will continue to be reduced to pitch classes for compatibility with the current app. Device selection, channels, sustain handling, and octave-aware mapping remain future work.

## Data and State Flow

The React state remains the source of transient UI state:

- Active key root and scale type.
- Selected pipe IDs.
- Optional selected chord and root hint.
- Octave-expansion state.
- Sidebar visibility.
- MIDI connection state.

Derived values such as scale pitch classes, active pitch classes, chord names, and candidate pipe IDs are calculated through pure domain functions. Derived values are not stored as competing state.

Changing the key resets the current pipe/chord selection as it does today. Manually selecting a pipe clears the sidebar chord selection. Selecting a sidebar chord produces primary-register pipe IDs through the mapping layer.

## Theory Behavior

The supported scale modes in this phase are explicitly:

- Major.
- Natural minor.

Harmonic minor, melodic minor, modal scales, borrowed chords, and secondary dominants are excluded until they are introduced as explicit user-selectable concepts.

Chord construction and chord-analysis naming must agree. A chord created by the sidebar and then analyzed from its resulting pitch classes must return the same primary chord identity, subject to documented enharmonic spelling.

When several chord interpretations are possible, ranking order is:

1. The explicitly selected root hint.
2. The current key tonic.
3. A root contained in the active scale.
4. The simplest supported name.

Unknown or unsupported pitch-class sets return a neutral result with their note list; they do not fabricate a confident chord name.

## Error Handling

- Invalid or incomplete selections produce a neutral `Ready` result.
- Domain functions reject invalid pitch classes and unsupported scale types at typed boundaries.
- MIDI unavailability must not block mouse/touch interaction.
- MIDI listener failures are contained in the MIDI hook and surfaced as a status value rather than uncaught exceptions.
- Empty analysis results and unsupported chord shapes remain usable UI states.

## Testing Strategy

Add a lightweight unit-test runner compatible with Vite and TypeScript. Tests focus on pure domain behavior rather than snapshots of Tailwind markup.

Required coverage includes:

- Major and natural-minor scales for all supported key roots.
- Diatonic triads and seventh chords.
- Every supported modifier in construction and analysis.
- Regression coverage for `sus2` recognition.
- Chord construction/analyzer round trips.
- The exact 16-pipe IDs, ordering, degrees, and register categories.
- Chord-to-primary-pipe mapping.
- Manual pipe selection to pitch-class analysis.
- Alternate-octave highlighting behavior as a pure mapping rule.
- MIDI listener registration and cleanup at the hook boundary where practical.

UI validation consists of the production build plus focused interaction tests for key selection, chord selection, manual pipe toggling, reset, sidebar visibility, and octave expansion.

## Build and Repository Hygiene

- Track the generated npm lockfile so local, Vercel, and Cloudflare installs resolve the same dependency graph.
- Remove the unused Gemini API key instructions from the README.
- Remove the AI Studio import map that conflicts with package-managed React and Vite versions.
- Replace the runtime Tailwind CDN dependency with a package-managed build configuration.
- Retain a static client-only output in `dist/`; no deployment provider-specific runtime is required.
- Add scripts for tests and keep `npm run build` as the production-build contract.

Dependency security findings will be reviewed individually. No forced major-version audit fix will be applied without verifying compatibility.

## Deployment Compatibility

The output remains a static Vite single-page application. It must build without secrets and without the unused `GEMINI_API_KEY` requirement. The generated `dist/` directory is suitable for either Vercel static deployment or Cloudflare Pages.

This phase does not add provider-specific configuration unless a deployment test demonstrates that it is required.

## Acceptance Criteria

- The verified Khaen 16 layout is unchanged and protected by tests.
- Existing mouse/touch interactions and visible controls retain equivalent behavior.
- Music-theory and Khaen-mapping logic no longer live inside UI components.
- The known `sus2` recognition defect is covered by a failing regression test and corrected.
- Supported chord construction and analysis agree in automated tests.
- MIDI listeners are cleaned up when inputs, keys, or components change.
- Tests and the production build complete successfully.
- The app runs locally without a Gemini key or runtime AI Studio dependency.
- A clean install uses the tracked lockfile.
- The static build remains compatible with both Vercel and Cloudflare Pages.

## Future Phases

After this foundation is verified, the next product phase may add:

1. Multiple playable voicings for one chord.
2. Explicit inversion and bass-note handling.
3. Chord-progressions with minimum pipe/finger movement recommendations.
4. Improved MIDI device, channel, sustain, and octave handling.
5. Public-facing explanations and onboarding for other 16-pipe Khaen players.

These capabilities must build on the tested Khaen 16 and theory interfaces rather than adding rules back into UI components.
