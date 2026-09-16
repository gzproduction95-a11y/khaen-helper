import { buildChordPitchClasses } from './chords';
import { displayNote } from './notes';
import { buildScale } from './scales';
import type { ChordModifier, ChordQuality, ChordSelection, ChordType, KeyRoot, PitchClass, ScaleType } from './types';

export interface ChordCandidate {
  readonly root: PitchClass;
  readonly name: string;
}

export interface ChordAnalysis {
  readonly main: string;
  readonly alternatives: readonly string[];
  readonly notes: readonly string[];
  readonly status: 'ready' | 'matched' | 'unknown';
}

interface AnalysisOptions {
  readonly keyRoot: KeyRoot;
  readonly scaleType: ScaleType;
  readonly rootHint: PitchClass | null;
}

const QUALITIES: readonly ChordQuality[] = ['major', 'minor', 'diminished'];
const TYPES: readonly ChordType[] = ['triad', 'seventh'];
const MODIFIERS: readonly ChordModifier[] = [
  'sus2', 'sus4', 'aug', 'dim', 'add9', 'add11', 'add13', 'add6', 'no3', 'no5',
];

function modifierName(quality: ChordQuality, type: ChordType, modifier?: ChordModifier): string {
  if (modifier === 'sus2' || modifier === 'sus4') return modifier;
  if (modifier === 'aug') return `${quality === 'minor' ? 'm' : ''}aug`;
  if (modifier === 'dim') return 'dim';
  if (modifier === 'no3') return '5(no3)';
  if (modifier === 'no5') return `${quality === 'minor' ? 'm' : quality === 'diminished' ? 'dim' : ''}(no5)`;
  const base = quality === 'major'
    ? (type === 'triad' ? '' : 'maj7')
    : quality === 'minor'
      ? (type === 'triad' ? 'm' : 'm7')
      : (type === 'triad' ? 'dim' : 'm7b5');
  if (modifier === 'add6' && (quality === 'major' || quality === 'minor') && type === 'triad') {
    return `${quality === 'minor' ? 'm' : ''}6`;
  }
  if (modifier) return `${base}(${modifier})`;
  return base;
}

function templates(): readonly { selection: ChordSelection; suffix: string }[] {
  const entries: { selection: ChordSelection; suffix: string }[] = [];
  for (const quality of QUALITIES) {
    for (const type of TYPES) {
      entries.push({ selection: { root: 0, quality, type, modifiers: new Set() }, suffix: modifierName(quality, type) });
      for (const modifier of MODIFIERS) {
        try {
          const selection: ChordSelection = { root: 0, quality, type, modifiers: new Set([modifier]) };
          buildChordPitchClasses(selection);
          entries.push({ selection, suffix: modifierName(quality, type, modifier) });
        } catch {
          // Mutually exclusive alterations are not valid templates.
        }
      }
    }
  }
  return entries;
}

const CHORD_TEMPLATES = templates();
const DIMINISHED_SEVENTH: readonly PitchClass[] = [0, 3, 6, 9];

export function analyzeChord(notes: readonly PitchClass[], options: AnalysisOptions): ChordAnalysis {
  const unique = [...new Set(notes)];
  if (unique.some(note => !Number.isInteger(note) || note < 0 || note > 11)) {
    throw new RangeError('Chord notes must be pitch classes from 0 through 11');
  }
  if (!unique.length) return { main: '-', alternatives: [], notes: [], status: 'ready' };

  const sorted = [...unique].sort((a, b) => a - b);
  const noteNames = sorted.map(note => displayNote(note, options.keyRoot, options.scaleType));
  const scale = buildScale(options.keyRoot, options.scaleType);
  const candidates: ChordCandidate[] = [];

  for (const root of unique) {
    const relative = new Set(unique.map(note => (note - root + 12) % 12));
    const rootName = displayNote(root, options.keyRoot, options.scaleType);
    for (const template of CHORD_TEMPLATES) {
      const templateNotes = buildChordPitchClasses(template.selection);
      if (relative.size !== templateNotes.length || templateNotes.some(note => !relative.has(note))) continue;
      candidates.push({ root, name: `${rootName}${template.suffix}` });
    }
    if (relative.size === DIMINISHED_SEVENTH.length && DIMINISHED_SEVENTH.every(note => relative.has(note))) {
      candidates.push({ root, name: `${rootName}dim7` });
    }
  }

  const ranked = [...new Map(candidates.map(candidate => [`${candidate.root}:${candidate.name}`, candidate])).values()]
    .sort((a, b) => {
      if (options.rootHint !== null && a.root !== b.root) {
        if (a.root === options.rootHint) return -1;
        if (b.root === options.rootHint) return 1;
      }
      const tonic = scale[0];
      if (a.root !== b.root) {
        if (a.root === tonic) return -1;
        if (b.root === tonic) return 1;
        const aInScale = scale.includes(a.root);
        const bInScale = scale.includes(b.root);
        if (aInScale !== bInScale) return aInScale ? -1 : 1;
      }
      return a.name.length - b.name.length || a.name.localeCompare(b.name);
    });

  if (!ranked.length) return { main: '?', alternatives: [], notes: noteNames, status: 'unknown' };
  return {
    main: ranked[0].name,
    alternatives: ranked.slice(1).map(candidate => candidate.name),
    notes: noteNames,
    status: 'matched',
  };
}
