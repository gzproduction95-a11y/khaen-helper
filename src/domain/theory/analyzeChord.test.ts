import { describe, expect, test } from 'vitest';
import { buildChordPitchClasses } from './chords';
import { analyzeChord } from './analyzeChord';
import type { ChordModifier, ChordQuality, ChordType, PitchClass } from './types';

const options = { keyRoot: 'C' as const, scaleType: 'major' as const, rootHint: 0 as PitchClass };

describe('analyzeChord', () => {
  test('recognizes C sus2', () => {
    expect(analyzeChord([0, 2, 7], options).main).toBe('Csus2');
  });

  test('uses A minor root hint', () => {
    expect(analyzeChord([9, 0, 4], {
      keyRoot: 'A', scaleType: 'natural-minor', rootHint: 9,
    }).main).toBe('Am');
  });

  test('does not invent unsupported names and handles empty input', () => {
    expect(analyzeChord([0, 1, 6], { ...options, rootHint: null }).status).toBe('unknown');
    expect(analyzeChord([], options).status).toBe('ready');
  });

  test.each([
    ['major', 'triad', []], ['minor', 'triad', []], ['diminished', 'triad', []],
    ['major', 'triad', ['sus2']], ['major', 'triad', ['sus4']],
    ['major', 'triad', ['aug']], ['major', 'triad', ['dim']],
    ['major', 'triad', ['add9']], ['major', 'triad', ['add11']],
    ['major', 'triad', ['add13']], ['major', 'triad', ['add6']],
    ['major', 'triad', ['no3']], ['major', 'triad', ['no5']],
    ['major', 'seventh', []], ['minor', 'seventh', []], ['diminished', 'seventh', []],
  ] as const)('round-trips %s %s with %j', (quality, type, modifiers) => {
    const chord = buildChordPitchClasses({
      root: 0,
      quality: quality as ChordQuality,
      type: type as ChordType,
      modifiers: new Set(modifiers as readonly ChordModifier[]),
    });
    expect(analyzeChord(chord, options).status).toBe('matched');
  });

  test('recognizes diminished seventh', () => {
    expect(analyzeChord([0, 3, 6, 9], options).main).toBe('Cdim7');
  });
});
