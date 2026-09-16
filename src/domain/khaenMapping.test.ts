import { describe, expect, test } from 'vitest';
import {
  alternatePipesForPitchClasses,
  pipePitchClass,
  primaryPipesForChord,
  selectedPipePitchClasses,
} from './khaenMapping';

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

  test('finds alternate-register pipes by display order', () => {
    expect(alternatePipesForPitchClasses([9], 'A', 'natural-minor')).toEqual(['R8', 'R4']);
  });

  test('rejects unknown pipe IDs', () => {
    expect(() => selectedPipePitchClasses(['X1'], 'C', 'major')).toThrow(RangeError);
  });
});
