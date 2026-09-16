# Khaen 16 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Refactor Khaen Logic into a tested, reproducible 16-pipe Khaen web app whose instrument mapping and music-theory results can be verified independently of React.

**Architecture:** Preserve the verified 8+8 layout as immutable data, move note/scale/chord rules into pure TypeScript modules, and keep React as a thin state-and-presentation layer. Upgrade the build/test baseline first, extract the domain in dependency order, split the UI, isolate MIDI lifecycle handling, then perform clean-install and static-deployment verification.

**Tech Stack:** React 18, TypeScript, Vite 8.3.0, Vitest 5.0.1, Testing Library, Tailwind CSS 3.4.19, Web MIDI API.

**Spec:** docs/superpowers/specs/2026-09-16-khaen16-core-design.md

## Global Constraints

- Preserve verified pipe ordering, scale degrees, labels, and high/low relationships exactly.
- Support only the current 16-pipe Khaen; modes are major and natural minor.
- Keep visible controls, layout, colors, and interaction flow equivalent.
- Sidebar chords highlight primary black-label pipes; Octave reveals alternates.
- Remain a static client-only app with no secrets, database, API, or provider runtime.
- Exclude other modes, audio, notation, progressions, fingering optimization, accounts, and cloud persistence.
- Never run npm audit fix --force.
- Domain tasks use red-green-refactor and each task ends in a focused commit.

## Target File Map

~~~text
index.html
package.json
package-lock.json
postcss.config.cjs
tailwind.config.cjs
vitest.config.ts
README.md
src/main.tsx
src/styles.css
src/App.tsx
src/App.test.tsx
src/test/setup.ts
src/domain/instruments/khaen16.ts
src/domain/instruments/khaen16.test.ts
src/domain/theory/{types,notes,notes.test,scales,scales.test,chords,chords.test,analyzeChord,analyzeChord.test}.ts
src/domain/khaenMapping.ts
src/domain/khaenMapping.test.ts
src/components/{SettingsPanel,ChordSelector,AnalysisPanel,KhaenDiagram,SidebarToggle}.tsx
src/midi/useMidiInput.ts
src/midi/useMidiInput.test.tsx
~~~

---

### Task 1: Reproducible Build and Test Baseline

**Files:**
- Modify: package.json, package-lock.json, index.html, vite.config.ts
- Create: vitest.config.ts, tailwind.config.cjs, postcss.config.cjs
- Create: src/styles.css, src/test/setup.ts, src/App.test.tsx
- Move: App.tsx -> src/App.tsx; index.tsx -> src/main.tsx

**Interfaces:**
- Consumes: current React app and Tailwind classes.
- Produces: npm test, npm run test:watch, npm run build, package-managed Tailwind.

- [ ] **Step 1: Capture baseline**

~~~bash
npm run build
npm audit --json
~~~

Expected: build passes; audit records current Vite/esbuild findings.

- [ ] **Step 2: Move entry files**

~~~bash
mkdir -p src/test
git mv App.tsx src/App.tsx
git mv index.tsx src/main.tsx
~~~

Import App from ./App and ./styles.css in main.tsx. Load /src/main.tsx from index.html.

- [ ] **Step 3: Install fixed tools**

~~~bash
npm install @fontsource/inter@5.3.0
npm install -D vite@8.3.0 @vitejs/plugin-react@6.1.1 vitest@5.0.1 jsdom@26.1.0 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/jest-dom@7.0.1 tailwindcss@3.4.19 postcss@8.5.28 autoprefixer@10.6.1
~~~

Set scripts to dev=vite, build=tsc && vite build, test=vitest run, test:watch=vitest, preview=vite preview. Add engines.node >=22.12.0.

- [ ] **Step 4: Replace CDN styling**

tailwind.config.cjs:

~~~js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
~~~

postcss.config.cjs:

~~~js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
~~~

Create styles.css with imports for the packaged Inter 300/400/500/600/700 weights, Tailwind directives, zero body margin, the Inter/system font stack, hidden overflow, and scrollbar rules. Remove the Tailwind CDN, AI Studio import map, Google font dependency, and duplicate body styles from index.html.

- [ ] **Step 5: Add smoke test**

setup.ts:

~~~ts
import '@testing-library/jest-dom/vitest';
~~~

vitest.config.ts:

~~~ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', restoreMocks: true },
});
~~~

App.test.tsx:

~~~tsx
import { render, screen } from '@testing-library/react';
import App from './App';
test('renders existing controls', () => {
  render(<App />);
  expect(screen.getByText('1. Key / 调式设定')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'RESET GRAPH' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'OCTAVE' })).toBeInTheDocument();
});
~~~

- [ ] **Step 6: Verify and commit**

~~~bash
npm test -- src/App.test.tsx
npm run build
npm audit --audit-level=high
git diff --check
git add package.json package-lock.json index.html vite.config.ts vitest.config.ts tailwind.config.cjs postcss.config.cjs src
git commit -m "build: establish reproducible web app baseline"
~~~

Expected: test/build pass; audit has no high/critical finding.

---

### Task 2: Freeze the Verified Khaen 16 Model

**Files:**
- Create/Test: src/domain/instruments/khaen16.ts, khaen16.test.ts
- Modify: src/App.tsx

**Interfaces:** Produces PipeSide, PipeDisplayGroup, KhaenPipe, LEFT_PIPES, RIGHT_PIPES, KHAEN_16_PIPES.

- [ ] **Step 1: Write failing layout tests**

~~~ts
test('preserves verified ordering and degrees', () => {
  expect(LEFT_PIPES.map(p => [p.id, p.degreeIndex])).toEqual([
    ['L8',6], ['L7',5], ['L6',6], ['L5',5], ['L4',4], ['L3',3], ['L2',1], ['L1',2],
  ]);
  expect(RIGHT_PIPES.map(p => [p.id, p.degreeIndex])).toEqual([
    ['R8',0], ['R7',4], ['R6',3], ['R5',1], ['R4',0], ['R3',6], ['R2',2], ['R1',0],
  ]);
});
test('preserves display groups', () => {
  expect(KHAEN_16_PIPES.filter(p => p.displayGroup === 'primary').map(p => p.id))
    .toEqual(['L6','L5','L4','L3','L2','R3','R2','R1']);
  expect(KHAEN_16_PIPES.find(p => p.id === 'R8')?.displayGroup).toBe('top-tonic');
});
~~~

Run the file; expect missing-module failure.

- [ ] **Step 2: Implement immutable data**

~~~ts
export type PipeSide = 'left' | 'right';
export type PipeDisplayGroup = 'primary' | 'alternate' | 'top-tonic';
export interface KhaenPipe {
  readonly id: string;
  readonly side: PipeSide;
  readonly position: number;
  readonly degreeIndex: number;
  readonly label: string;
  readonly displayGroup: PipeDisplayGroup;
}
~~~

Copy current arrays exactly. Map num -> primary, num-blue -> alternate, num-green -> top-tonic.

- [ ] **Step 3: Integrate, verify, commit**

Delete App-local pipe declarations and map displayGroup to existing colors in rendering.

~~~bash
npm test -- src/domain/instruments/khaen16.test.ts src/App.test.tsx
npm run build
git add src/domain/instruments src/App.tsx
git commit -m "refactor: model verified Khaen 16 layout"
~~~

---

### Task 3: Extract Notes and Scales

**Files:** Create src/domain/theory/types.ts, notes.ts/tests, scales.ts/tests; modify App.tsx.

**Interfaces:** Produces PitchClass, KeyRoot, ScaleType, toPitchClass(), parseNote(), displayNote(), buildScale().

- [ ] **Step 1: Write failing note tests**

~~~ts
test('normalizes pitch classes', () => {
  expect(toPitchClass(13)).toBe(1);
  expect(toPitchClass(-1)).toBe(11);
});
test('parses enharmonics', () => {
  expect(parseNote('C#')).toBe(1);
  expect(parseNote('Db')).toBe(1);
});
test('spells combined choices by mode', () => {
  expect(displayNote(1, 'Db', 'major')).toBe('Db');
  expect(displayNote(1, 'Db', 'natural-minor')).toBe('C#');
  expect(displayNote(6, 'Gb', 'natural-minor')).toBe('F#');
});
~~~

Run and require missing-module failure.

- [ ] **Step 2: Implement types/utilities**

~~~ts
export type PitchClass = 0|1|2|3|4|5|6|7|8|9|10|11;
export type KeyRoot = 'C'|'Db'|'D'|'Eb'|'E'|'F'|'Gb'|'G'|'Ab'|'A'|'Bb'|'B';
export type ScaleType = 'major'|'natural-minor';
export function toPitchClass(value: number): PitchClass;
export function parseNote(name: string): PitchClass;
export function displayNote(value: PitchClass, root: KeyRoot, type: ScaleType): string;
~~~

Unsupported names throw RangeError. Db/C# and Gb/F# use flat spelling in major and sharp spelling in natural minor.

- [ ] **Step 3: Write failing scale tests**

~~~ts
test('builds C major', () => {
  expect(buildScale('C','major')).toEqual([0,2,4,5,7,9,11]);
});
test('builds A natural minor', () => {
  expect(buildScale('A','natural-minor')).toEqual([9,11,0,2,4,5,7]);
});
~~~

Add a table test requiring seven valid pitch classes for all 12 roots in both modes.

- [ ] **Step 4: Implement and integrate**

Use intervals [0,2,4,5,7,9,11] and [0,2,3,5,7,8,10]. Remove App-local SHARPS/FLATS, interval data, getNoteVal(), and getDisplayNote(). Translate visible Minor to natural-minor internally.

- [ ] **Step 5: Verify and commit**

~~~bash
npm test -- src/domain/theory/notes.test.ts src/domain/theory/scales.test.ts src/App.test.tsx
npm run build
git add src/domain/theory src/App.tsx
git commit -m "refactor: extract note and scale theory"
~~~

---

### Task 4: Extract Chord Construction

**Files:** Create chords.ts/test; modify types.ts and App.tsx.

**Interfaces:** Produces ChordQuality, ChordType, ChordModifier, ChordSelection, buildDiatonicChordChoices(), buildChordPitchClasses().

- [ ] **Step 1: Write failing tests**

~~~ts
test('builds A minor triads', () => {
  expect(buildDiatonicChordChoices('A','natural-minor').map(c => c.triadName))
    .toEqual(['Am','Bdim','C','Dm','Em','F','G']);
});
test('builds C major sevenths', () => {
  expect(buildDiatonicChordChoices('C','major').map(c => c.seventhName))
    .toEqual(['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5']);
});
test.each([
  ['sus2',[0,2,7]], ['sus4',[0,5,7]], ['aug',[0,4,8]], ['dim',[0,3,6]],
  ['add9',[0,2,4,7]], ['no3',[0,7]], ['no5',[0,4]],
])('applies %s', (modifier, expected) => {
  expect(buildChordPitchClasses({
    root: 0, quality: 'major', type: 'triad', modifiers: new Set([modifier]),
  })).toEqual(expected);
});
~~~

Run and require missing-module failure.

- [ ] **Step 2: Define types and implement**

~~~ts
export type ChordQuality = 'major'|'minor'|'diminished';
export type ChordType = 'triad'|'seventh';
export type ChordModifier =
  'add9'|'add11'|'add13'|'add6'|'no3'|'no5'|'sus4'|'sus2'|'aug'|'dim';
export interface ChordSelection {
  readonly root: PitchClass;
  readonly quality: ChordQuality;
  readonly type: ChordType;
  readonly modifiers: ReadonlySet<ChordModifier>;
}
export function buildDiatonicChordChoices(root: KeyRoot, type: ScaleType): readonly DiatonicChordChoice[];
export function buildChordPitchClasses(selection: ChordSelection): readonly PitchClass[];
~~~

Order modifiers: replace/remove third, replace/remove fifth, add extensions, deduplicate. Simultaneous sus2/sus4 or conflicting fifth modifiers throw RangeError.

- [ ] **Step 3: Integrate, verify, commit**

Use these functions for sidebar labels and tones while preserving button order.

~~~bash
npm test -- src/domain/theory/chords.test.ts src/App.test.tsx
npm run build
git add src/domain/theory src/App.tsx
git commit -m "refactor: extract chord construction"
~~~

---

### Task 5: Deterministic Chord Analysis

**Files:** Create analyzeChord.ts/test; modify App.tsx.

**Interfaces:** Produces ChordCandidate, ChordAnalysis, analyzeChord().

- [ ] **Step 1: Write sus2 regression**

~~~ts
test('recognizes C sus2', () => {
  expect(analyzeChord([0,2,7], {
    keyRoot:'C', scaleType:'major', rootHint:0,
  }).main).toBe('Csus2');
});
test('uses A minor root hint', () => {
  expect(analyzeChord([9,0,4], {
    keyRoot:'A', scaleType:'natural-minor', rootHint:9,
  }).main).toBe('Am');
});
test('does not invent unsupported names', () => {
  expect(analyzeChord([0,1,6], {
    keyRoot:'C', scaleType:'major', rootHint:null,
  }).status).toBe('unknown');
});
~~~

Run and require missing-module failure, preserving a red reproduction of the current defect.

- [ ] **Step 2: Implement interface/algorithm**

~~~ts
export interface ChordAnalysis {
  readonly main: string;
  readonly alternatives: readonly string[];
  readonly notes: readonly string[];
  readonly status: 'ready'|'matched'|'unknown';
}
export function analyzeChord(
  notes: readonly PitchClass[],
  options: { keyRoot: KeyRoot; scaleType: ScaleType; rootHint: PitchClass|null },
): ChordAnalysis;
~~~

Treat every active pitch as a candidate root, calculate relative intervals, match explicit supported templates, and rank by root hint, key tonic, in-scale root, then name complexity. Empty returns ready; unsupported returns unknown.

- [ ] **Step 3: Add round-trip matrix**

Table-test major/minor/diminished, sus2/sus4, aug/dim, add9/add11/add13/add6, no3/no5, maj7/7/m7/m7b5/dim7. Build each shape with buildChordPitchClasses() and require matched status with its root hint.

- [ ] **Step 4: Integrate, verify, commit**

Delete App-local heuristic and format the structured result only at the UI boundary.

~~~bash
npm test -- src/domain/theory
npm run build
git add src/domain/theory src/App.tsx
git commit -m "fix: make chord analysis deterministic"
~~~

---

### Task 6: Extract Khaen Mapping

**Files:** Create khaenMapping.ts/test; modify App.tsx.

**Interfaces:** Produces pipePitchClass(), selectedPipePitchClasses(), primaryPipesForChord(), alternatePipesForPitchClasses().

- [ ] **Step 1: Write failing verified-layout tests**

~~~ts
test('maps Am to primary pipes', () => {
  expect(primaryPipesForChord({
    keyRoot:'A', scaleType:'natural-minor',
    chord:{ root:9, quality:'minor', type:'triad', modifiers:new Set() },
  })).toEqual(['L4','R2','R1']);
});
test('maps pipes back to E C A', () => {
  expect(selectedPipePitchClasses(['L4','R2','R1'],'A','natural-minor'))
    .toEqual([4,0,9]);
});
test('finds alternate A pipes', () => {
  expect(alternatePipesForPitchClasses([9],'A','natural-minor'))
    .toEqual(['R8','R4']);
});
~~~

Run and require missing-module failure.

- [ ] **Step 2: Implement signatures**

~~~ts
export function pipePitchClass(pipe: KhaenPipe, root: KeyRoot, type: ScaleType): PitchClass;
export function selectedPipePitchClasses(ids: readonly string[], root: KeyRoot, type: ScaleType): readonly PitchClass[];
export function primaryPipesForChord(input: {
  keyRoot: KeyRoot; scaleType: ScaleType; chord: ChordSelection;
}): readonly string[];
export function alternatePipesForPitchClasses(
  notes: readonly PitchClass[], root: KeyRoot, type: ScaleType,
): readonly string[];
~~~

Return pipe arrays in verified display order and unique pitch classes in first-occurrence order. Unknown IDs throw RangeError.

- [ ] **Step 3: Integrate, verify, commit**

Replace App loops used for chord selection, active notes, and octave alternatives.

~~~bash
npm test -- src/domain src/App.test.tsx
npm run build
git add src/domain/khaenMapping.ts src/domain/khaenMapping.test.ts src/App.tsx
git commit -m "refactor: isolate Khaen chord mapping"
~~~

---

### Task 7: Split UI Without Redesign

**Files:** Create five components; modify App.tsx/App.test.tsx.

**Interfaces:** Components consume domain results via typed props; App keeps shared state.

- [ ] **Step 1: Capture interactions first**

Add data-testid, data-active, data-octave-active to pipes. Test:

~~~tsx
test('Am highlights primary pipes', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button',{name:'Am'}));
  for (const id of ['L4','R2','R1']) {
    expect(screen.getByTestId('pipe-' + id)).toHaveAttribute('data-active','true');
  }
});
test('reset clears a pipe', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('pipe-R1'));
  fireEvent.click(screen.getByRole('button',{name:'RESET GRAPH'}));
  expect(screen.getByTestId('pipe-R1')).toHaveAttribute('data-active','false');
});
test('octave reveals alternates', () => {
  render(<App />);
  fireEvent.click(screen.getByTestId('pipe-R1'));
  fireEvent.click(screen.getByRole('button',{name:'OCTAVE'}));
  expect(screen.getByTestId('pipe-R4')).toHaveAttribute('data-octave-active','true');
  expect(screen.getByTestId('pipe-R8')).toHaveAttribute('data-octave-active','true');
});
~~~

Require green before extraction.

- [ ] **Step 2: Extract one component at a time**

Use narrow contracts such as:

~~~ts
export interface SettingsPanelProps {
  keyRoot: KeyRoot;
  scaleType: ScaleType;
  onKeyRootChange(root: KeyRoot): void;
  onScaleTypeChange(type: ScaleType): void;
}
export interface KhaenDiagramProps {
  keyRoot: KeyRoot;
  scaleType: ScaleType;
  activePipeIds: ReadonlySet<string>;
  octavePipeIds: ReadonlySet<string>;
  scaleFactor: number;
  onPipeToggle(pipeId: string): void;
}
~~~

Move JSX/classes unchanged. Run App.test.tsx after each extraction and fix any regression before continuing.

- [ ] **Step 3: Verify and commit**

~~~bash
npm test
npm run build
git diff --check
git add src/App.tsx src/App.test.tsx src/components
git commit -m "refactor: split Khaen app components"
~~~

---

### Task 8: Isolate MIDI Lifecycle

**Files:** Create useMidiInput.ts/test.tsx; modify App.tsx and AnalysisPanel.tsx.

**Interfaces:** Produces MidiStatus, MidiNoteEvent, useMidiInput().

- [ ] **Step 1: Write failing lifecycle tests**

With a hook harness and fake MIDIAccess, verify input listener registration and cleanup:

~~~ts
test('cleans listeners on unmount', async () => {
  const input = { onmidimessage:null } as unknown as MIDIInput;
  const access = {
    inputs:new Map([['input-1',input]]), onstatechange:null,
  } as unknown as MIDIAccess;
  vi.stubGlobal('navigator', {
    requestMIDIAccess:vi.fn().mockResolvedValue(access),
  });
  const { unmount } = render(<MidiHarness />);
  await waitFor(() => expect(input.onmidimessage).toBeTypeOf('function'));
  unmount();
  expect(input.onmidimessage).toBeNull();
  expect(access.onstatechange).toBeNull();
});
~~~

Also test unsupported, rejected permission, no input, connected input, note-on/off, and state-change rebind.

- [ ] **Step 2: Implement**

~~~ts
export type MidiStatus =
  'unsupported'|'requesting'|'disconnected'|'connected'|'error';
export interface MidiNoteEvent {
  readonly pitchClass: PitchClass;
  readonly active: boolean;
}
export function useMidiInput(onNote:(event:MidiNoteEvent)=>void): MidiStatus;
~~~

Request once, attach all inputs, refresh on state change, clear listeners on cleanup, and hold onNote in a ref.

- [ ] **Step 3: Integrate, verify, commit**

Remove App's MIDI effect. Preserve pitch-class behavior. Show distinct non-blocking status text.

~~~bash
npm test -- src/midi/useMidiInput.test.tsx src/App.test.tsx
npm test
npm run build
git add src/midi src/App.tsx src/components/AnalysisPanel.tsx
git commit -m "fix: isolate MIDI input lifecycle"
~~~

---

### Task 9: Documentation and Final Verification

**Files:** Modify README.md; modify .gitignore only if required; update lockfile only via npm.

- [ ] **Step 1: Replace AI Studio README**

Document Node >=22.12, npm ci, npm run dev, npm test, npm run build, build command npm run build, output dist, no environment variables, and compatibility with Vercel/Cloudflare Pages. Remove Gemini/AI Studio text.

- [ ] **Step 2: Clean-install recoverably**

~~~bash
mv node_modules /tmp/khaen-helper-node_modules-before-ci
npm ci
~~~

Keep the old directory until the new install and quality gate pass.

- [ ] **Step 3: Full gate**

~~~bash
npm test
npm run build
npm audit --audit-level=high
git diff --check
~~~

Expected: zero test failures, successful dist build, no high/critical audit finding, clean diff.

- [ ] **Step 4: Production smoke test**

~~~bash
npm run preview -- --host 127.0.0.1
curl --fail --silent --show-error --head http://127.0.0.1:4173/
~~~

Expected HTTP 200. Manually verify key/mode, Am selection, pipe toggles, reset, Octave, sidebar, and MIDI-unavailable behavior.

- [ ] **Step 5: Commit and handoff**

~~~bash
git add README.md .gitignore package-lock.json
git commit -m "docs: document local and static deployment"
git status --short
git log --oneline --decorate -10
~~~

Report test count, build size, audit result, manual checks, commits, and future limitations. Mark READY FOR MANUAL TEST. Do not push, deploy, or create a PR without separate authorization.
