import { describe, expect, test } from 'vitest';
import { buildChordPitchClasses, buildDiatonicChordChoices } from './chords';

describe('diatonic chord choices', () => {
  test('builds A natural-minor triads', () => {
    expect(buildDiatonicChordChoices('A', 'natural-minor').map(chord => chord.triadName))
      .toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  test('builds C major sevenths', () => {
    expect(buildDiatonicChordChoices('C', 'major').map(chord => chord.seventhName))
      .toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
  });
});

describe('buildChordPitchClasses', () => {
  test.each([
    ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]], ['aug', [0, 4, 8]], ['dim', [0, 3, 6]],
    ['add9', [0, 2, 4, 7]], ['add11', [0, 4, 5, 7]], ['add13', [0, 4, 7, 9]],
    ['add6', [0, 4, 7, 9]], ['no3', [0, 7]], ['no5', [0, 4]],
  ] as const)('applies %s', (modifier, expected) => {
    expect(buildChordPitchClasses({
      root: 0, quality: 'major', type: 'triad', modifiers: new Set([modifier]),
    })).toEqual(expected);
  });

  test('builds seventh-chord qualities', () => {
    expect(buildChordPitchClasses({ root: 0, quality: 'major', type: 'seventh', modifiers: new Set() }))
      .toEqual([0, 4, 7, 11]);
    expect(buildChordPitchClasses({ root: 9, quality: 'minor', type: 'seventh', modifiers: new Set() }))
      .toEqual([9, 0, 4, 7]);
    expect(buildChordPitchClasses({ root: 11, quality: 'diminished', type: 'seventh', modifiers: new Set() }))
      .toEqual([11, 2, 5, 9]);
  });

  test('rejects conflicting modifiers', () => {
    expect(() => buildChordPitchClasses({ root: 0, quality: 'major', type: 'triad', modifiers: new Set(['sus2', 'sus4']) })).toThrow(RangeError);
    expect(() => buildChordPitchClasses({ root: 0, quality: 'major', type: 'triad', modifiers: new Set(['aug', 'dim']) })).toThrow(RangeError);
  });
});
