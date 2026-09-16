import { describe, expect, test } from 'vitest';
import { KHAEN_16_PIPES, LEFT_PIPES, RIGHT_PIPES } from './khaen16';

describe('verified Khaen 16 layout', () => {
  test('preserves left and right pipe order and scale degrees', () => {
    expect(LEFT_PIPES.map(({ id, degreeIndex }) => [id, degreeIndex])).toEqual([
      ['L8', 6], ['L7', 5], ['L6', 6], ['L5', 5],
      ['L4', 4], ['L3', 3], ['L2', 1], ['L1', 2],
    ]);
    expect(RIGHT_PIPES.map(({ id, degreeIndex }) => [id, degreeIndex])).toEqual([
      ['R8', 0], ['R7', 4], ['R6', 3], ['R5', 1],
      ['R4', 0], ['R3', 6], ['R2', 2], ['R1', 0],
    ]);
  });

  test('preserves primary, alternate, and tonic display groups', () => {
    expect(KHAEN_16_PIPES.filter(pipe => pipe.displayGroup === 'primary').map(pipe => pipe.id)).toEqual([
      'L6', 'L5', 'L4', 'L3', 'L2', 'R3', 'R2', 'R1',
    ]);
    expect(KHAEN_16_PIPES.filter(pipe => pipe.displayGroup === 'alternate').map(pipe => pipe.id)).toEqual([
      'L8', 'L7', 'L1', 'R7', 'R6', 'R5', 'R4',
    ]);
    expect(KHAEN_16_PIPES.filter(pipe => pipe.displayGroup === 'top-tonic').map(pipe => pipe.id)).toEqual(['R8']);
  });

  test('contains exactly sixteen pipes in visual order with matching positions', () => {
    expect(KHAEN_16_PIPES).toHaveLength(16);
    expect(LEFT_PIPES.map(pipe => [pipe.side, pipe.position])).toEqual(
      Array.from({ length: 8 }, (_, position) => ['left', position]),
    );
    expect(RIGHT_PIPES.map(pipe => [pipe.side, pipe.position])).toEqual(
      Array.from({ length: 8 }, (_, position) => ['right', position]),
    );
  });
});
