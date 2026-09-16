import { describe, expect, test } from 'vitest';
import { buildScale } from './scales';

describe('buildScale', () => {
  test('builds C major', () => {
    expect(buildScale('C', 'major')).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  test('builds A natural minor', () => {
    expect(buildScale('A', 'natural-minor')).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  test.each(['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const)(
    'builds seven valid pitch classes for %s in both supported modes', root => {
      for (const mode of ['major', 'natural-minor'] as const) {
        const scale = buildScale(root, mode);
        expect(scale).toHaveLength(7);
        expect(scale.every(pitch => Number.isInteger(pitch) && pitch >= 0 && pitch < 12)).toBe(true);
      }
    },
  );
});
