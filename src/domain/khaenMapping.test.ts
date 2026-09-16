import { describe, expect, test } from 'vitest';
import {
  alternatePipesForPitchClasses,
  pipePitchClass,
  primaryPipesForChord,
  selectedPipePitchClasses,
} from './khaenMapping';
import type { ChordModifier, PitchClass } from './theory/types';

describe('Khaen 16 mapping', () => {
  test('maps A minor to the primary-register pipes', () => {
    expect(primaryPipesForChord({
      keyRoot: 'A', scaleType: 'natural-minor',
      chord: { root: 9, quality: 'minor', type: 'triad', modifiers: new Set() },
    })).toEqual(['L4', 'R2', 'R1']);
  });

  test('maps selected pipes back to unique pitches in click order', () => {
    expect(selectedPipePitchClasses(['L4', 'R2', 'R1'], 'A', 'natural-minor')).toEqual([4, 0, 9]);
    expect(pipePitchClass({ id: 'R1', side: 'right', position: 7, degreeIndex: 0, label: '1', displayGroup: 'primary' }, 'A', 'natural-minor')).toBe(9);
  });

  test('uses the relative natural minor for physical pipes in a major key', () => {
    expect(selectedPipePitchClasses(['R1', 'R2', 'R3'], 'C', 'major')).toEqual([9, 0, 7]);
  });

  test('chooses physical pipes for a major-key chord while keeping its major pitches', () => {
    const cMajor = { root: 0 as PitchClass, quality: 'major' as const, type: 'triad' as const, modifiers: new Set<ChordModifier>() };
    const pipes = primaryPipesForChord({ keyRoot: 'C', scaleType: 'major', chord: cMajor });

    expect(pipes).toEqual(['L6', 'L4', 'R3', 'R2']);
    expect(selectedPipePitchClasses(pipes, 'C', 'major')).toEqual([7, 4, 0]);
  });

  test('finds alternate-register pipes by display order', () => {
    expect(alternatePipesForPitchClasses([9], 'A', 'natural-minor')).toEqual(['R8', 'R4']);
  });

  test('rejects unknown pipe IDs', () => {
    expect(() => selectedPipePitchClasses(['X1'], 'C', 'major')).toThrow(RangeError);
  });
});
