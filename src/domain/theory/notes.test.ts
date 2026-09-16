import { describe, expect, test } from 'vitest';
import { displayNote, parseNote, toPitchClass } from './notes';

describe('note utilities', () => {
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

  test('rejects unsupported note names', () => {
    expect(() => parseNote('H')).toThrow(RangeError);
  });
});
