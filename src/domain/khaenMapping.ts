import { KHAEN_16_PIPES, type KhaenPipe } from './instruments/khaen16';
import { buildChordPitchClasses } from './theory/chords';
import { buildScale } from './theory/scales';
import type { ChordSelection, KeyRoot, PitchClass, ScaleType } from './theory/types';

function requirePipe(id: string): KhaenPipe {
  const pipe = KHAEN_16_PIPES.find(candidate => candidate.id === id);
  if (!pipe) throw new RangeError(`Unknown Khaen pipe ID: ${id}`);
  return pipe;
}

const ROOTS_BY_PITCH_CLASS: readonly KeyRoot[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function instrumentScale(root: KeyRoot, type: ScaleType): readonly PitchClass[] {
  if (type === 'natural-minor') return buildScale(root, type);

  const relativeMinorRoot = ROOTS_BY_PITCH_CLASS[buildScale(root, 'major')[5]];
  return buildScale(relativeMinorRoot, 'natural-minor');
}

export function pipePitchClass(pipe: KhaenPipe, root: KeyRoot, type: ScaleType): PitchClass {
  return instrumentScale(root, type)[pipe.degreeIndex];
}

export function pipeDisplayDegree(pipe: KhaenPipe, root: KeyRoot, type: ScaleType): number {
  const displayedScale = buildScale(root, type);
  const pitchClass = pipePitchClass(pipe, root, type);
  return displayedScale.indexOf(pitchClass) + 1;
}

export function selectedPipePitchClasses(
  ids: readonly string[], root: KeyRoot, type: ScaleType,
): readonly PitchClass[] {
  return [...new Set(ids.map(id => pipePitchClass(requirePipe(id), root, type)))];
}

export function primaryPipesForChord(input: {
  readonly keyRoot: KeyRoot;
  readonly scaleType: ScaleType;
  readonly chord: ChordSelection;
}): readonly string[] {
  const targetNotes = new Set(buildChordPitchClasses(input.chord));
  return KHAEN_16_PIPES
    .filter(pipe => pipe.displayGroup === 'primary' && targetNotes.has(pipePitchClass(pipe, input.keyRoot, input.scaleType)))
    .map(pipe => pipe.id);
}

export function alternatePipesForPitchClasses(
  notes: readonly PitchClass[], root: KeyRoot, type: ScaleType,
): readonly string[] {
  const targetNotes = new Set(notes);
  return KHAEN_16_PIPES
    .filter(pipe => pipe.displayGroup !== 'primary' && targetNotes.has(pipePitchClass(pipe, root, type)))
    .map(pipe => pipe.id);
}
