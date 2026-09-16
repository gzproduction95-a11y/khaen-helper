import { parseNote, toPitchClass } from './notes';
import type { KeyRoot, PitchClass, ScaleType } from './types';

const SCALE_INTERVALS: Readonly<Record<ScaleType, readonly number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10],
};

export function buildScale(root: KeyRoot, type: ScaleType): readonly PitchClass[] {
  const tonic = parseNote(root);
  return SCALE_INTERVALS[type].map(interval => toPitchClass(tonic + interval));
}
