export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type KeyRoot = 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'Gb' | 'G' | 'Ab' | 'A' | 'Bb' | 'B';
export type ScaleType = 'major' | 'natural-minor';
export type ChordQuality = 'major' | 'minor' | 'diminished';
export type ChordType = 'triad' | 'seventh';
export type ChordModifier = 'add9' | 'add11' | 'add13' | 'add6' | 'no3' | 'no5' | 'sus4' | 'sus2' | 'aug' | 'dim';

export interface ChordSelection {
  readonly root: PitchClass;
  readonly quality: ChordQuality;
  readonly type: ChordType;
  readonly modifiers: ReadonlySet<ChordModifier>;
}
