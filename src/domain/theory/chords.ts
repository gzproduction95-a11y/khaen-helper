import { displayNote } from './notes';
import { buildScale } from './scales';
import { toPitchClass } from './notes';
import type { ChordModifier, ChordQuality, ChordSelection, KeyRoot, PitchClass, ScaleType } from './types';

export interface DiatonicChordChoice {
  readonly degree: number;
  readonly root: PitchClass;
  readonly quality: ChordQuality;
  readonly triadName: string;
  readonly seventhName: string;
}

const QUALITY_BY_MODE: Readonly<Record<ScaleType, readonly ChordQuality[]>> = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  'natural-minor': ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
};

const TRIAD_SUFFIX: Readonly<Record<ChordQuality, string>> = {
  major: '', minor: 'm', diminished: 'dim',
};

const SEVENTH_SUFFIX: Readonly<Record<ScaleType, readonly string[]>> = {
  major: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'],
  'natural-minor': ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'],
};

export function buildDiatonicChordChoices(root: KeyRoot, type: ScaleType): readonly DiatonicChordChoice[] {
  const scale = buildScale(root, type);
  return scale.map((pitch, degree) => {
    const quality = QUALITY_BY_MODE[type][degree];
    const note = displayNote(pitch, root, type);
    return {
      degree,
      root: pitch,
      quality,
      triadName: `${note}${TRIAD_SUFFIX[quality]}`,
      seventhName: `${note}${SEVENTH_SUFFIX[type][degree]}`,
    };
  });
}

export function buildChordPitchClasses(selection: ChordSelection): readonly PitchClass[] {
  const { root, quality, type, modifiers } = selection;
  if (modifiers.has('sus2') && modifiers.has('sus4')) {
    throw new RangeError('sus2 and sus4 cannot be combined');
  }
  if (modifiers.has('aug') && modifiers.has('dim')) {
    throw new RangeError('aug and dim cannot be combined');
  }

  let intervals = quality === 'major' ? [0, 4, 7]
    : quality === 'minor' ? [0, 3, 7] : [0, 3, 6];
  if (type === 'seventh') {
    intervals = quality === 'major' ? [0, 4, 7, 11]
      : quality === 'minor' ? [0, 3, 7, 10] : [0, 3, 6, 10];
  }

  if (modifiers.has('no3')) intervals = intervals.filter(interval => interval !== 3 && interval !== 4);
  if (modifiers.has('no5')) intervals = intervals.filter(interval => interval !== 6 && interval !== 7 && interval !== 8);

  if (modifiers.has('sus2') || modifiers.has('sus4')) {
    intervals = intervals.filter(interval => interval !== 3 && interval !== 4);
    intervals.push(modifiers.has('sus2') ? 2 : 5);
  }
  if (modifiers.has('aug')) {
    intervals = intervals.filter(interval => interval !== 6 && interval !== 7);
    intervals.push(8);
  }
  if (modifiers.has('dim')) {
    intervals = intervals.filter(interval => interval !== 4 && interval !== 7 && interval !== 8);
    intervals.push(3, 6);
  }

  const additions: Readonly<Record<Extract<ChordModifier, 'add9' | 'add11' | 'add13' | 'add6'>, number>> = {
    add9: 2, add11: 5, add13: 9, add6: 9,
  };
  for (const modifier of ['add9', 'add11', 'add13', 'add6'] as const) {
    if (modifiers.has(modifier)) intervals.push(additions[modifier]);
  }

  return [...new Set(intervals.sort((a, b) => a - b).map(interval => toPitchClass(root + interval)))];
}
