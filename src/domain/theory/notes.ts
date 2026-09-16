import type { KeyRoot, PitchClass, ScaleType } from './types';

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const FLAT_KEYS = new Set<KeyRoot>(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const LEGACY_MINOR_FLAT_KEYS = new Set<KeyRoot>(['C', 'F', 'Bb', 'Eb', 'G', 'D']);

export function toPitchClass(value: number): PitchClass {
  if (!Number.isFinite(value)) throw new RangeError(`Invalid pitch class: ${value}`);
  return (((Math.trunc(value) % 12) + 12) % 12) as PitchClass;
}

export function parseNote(name: string): PitchClass {
  const normalized = name.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const value = SHARPS.indexOf(normalized as (typeof SHARPS)[number]);
  const flatValue = FLATS.indexOf(normalized as (typeof FLATS)[number]);
  if (value >= 0) return value as PitchClass;
  if (flatValue >= 0) return flatValue as PitchClass;
  throw new RangeError(`Unsupported note name: ${name}`);
}

export function displayNote(value: PitchClass, root: KeyRoot, type: ScaleType): string {
  const useFlats = (root === 'Db' && type === 'major') || (root === 'Gb' && type === 'major') ||
    (type === 'natural-minor' && (root === 'Db' || root === 'Gb'
      ? false
      : FLAT_KEYS.has(root) || LEGACY_MINOR_FLAT_KEYS.has(root)));
  return (useFlats ? FLATS : SHARPS)[toPitchClass(value)];
}
