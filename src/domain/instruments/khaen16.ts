export type PipeSide = 'left' | 'right';
export type PipeDisplayGroup = 'primary' | 'alternate' | 'top-tonic';

export interface KhaenPipe {
  readonly id: string;
  readonly side: PipeSide;
  readonly position: number;
  readonly degreeIndex: number;
  readonly label: string;
  readonly displayGroup: PipeDisplayGroup;
}

export const LEFT_PIPES: readonly KhaenPipe[] = [
  { id: 'L8', side: 'left', position: 0, degreeIndex: 6, label: '7', displayGroup: 'alternate' },
  { id: 'L7', side: 'left', position: 1, degreeIndex: 5, label: '6', displayGroup: 'alternate' },
  { id: 'L6', side: 'left', position: 2, degreeIndex: 6, label: '7', displayGroup: 'primary' },
  { id: 'L5', side: 'left', position: 3, degreeIndex: 5, label: '6', displayGroup: 'primary' },
  { id: 'L4', side: 'left', position: 4, degreeIndex: 4, label: '5', displayGroup: 'primary' },
  { id: 'L3', side: 'left', position: 5, degreeIndex: 3, label: '4', displayGroup: 'primary' },
  { id: 'L2', side: 'left', position: 6, degreeIndex: 1, label: '2', displayGroup: 'primary' },
  { id: 'L1', side: 'left', position: 7, degreeIndex: 2, label: '3', displayGroup: 'alternate' },
];

export const RIGHT_PIPES: readonly KhaenPipe[] = [
  { id: 'R8', side: 'right', position: 0, degreeIndex: 0, label: '1', displayGroup: 'top-tonic' },
  { id: 'R7', side: 'right', position: 1, degreeIndex: 4, label: '5', displayGroup: 'alternate' },
  { id: 'R6', side: 'right', position: 2, degreeIndex: 3, label: '4', displayGroup: 'alternate' },
  { id: 'R5', side: 'right', position: 3, degreeIndex: 1, label: '2', displayGroup: 'alternate' },
  { id: 'R4', side: 'right', position: 4, degreeIndex: 0, label: '1', displayGroup: 'alternate' },
  { id: 'R3', side: 'right', position: 5, degreeIndex: 6, label: '7', displayGroup: 'primary' },
  { id: 'R2', side: 'right', position: 6, degreeIndex: 2, label: '3', displayGroup: 'primary' },
  { id: 'R1', side: 'right', position: 7, degreeIndex: 0, label: '1', displayGroup: 'primary' },
];

export const KHAEN_16_PIPES: readonly KhaenPipe[] = [...LEFT_PIPES, ...RIGHT_PIPES];
