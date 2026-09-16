import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useMidiInput, type MidiNoteEvent } from './useMidiInput';

interface FakeInput {
  onmidimessage: ((event: { data: Uint8Array }) => void) | null;
}
interface FakeAccess {
  inputs: Map<string, FakeInput>;
  onstatechange: ((event: { port: { state: string } }) => void) | null;
}

function Harness({ onNote }: { onNote: (event: MidiNoteEvent) => void }) {
  const status = useMidiInput(onNote);
  return <output>{status}</output>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useMidiInput', () => {
  test('reports unsupported when Web MIDI is unavailable', () => {
    vi.stubGlobal('navigator', {});
    render(<Harness onNote={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('unsupported');
  });

  test('reports permission errors and no-input state', async () => {
    vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn().mockRejectedValue(new Error('denied')) });
    const first = render(<Harness onNote={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('error'));
    first.unmount();

    const access: FakeAccess = { inputs: new Map(), onstatechange: null };
    vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn().mockResolvedValue(access) });
    render(<Harness onNote={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('disconnected'));
  });

  test('registers note events and cleans listeners on unmount', async () => {
    const input: FakeInput = { onmidimessage: null };
    const access: FakeAccess = { inputs: new Map([['input-1', input]]), onstatechange: null };
    vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn().mockResolvedValue(access) });
    const onNote = vi.fn();
    const { unmount } = render(<Harness onNote={onNote} />);
    await waitFor(() => expect(input.onmidimessage).toBeTypeOf('function'));
    expect(screen.getByRole('status')).toHaveTextContent('connected');
    input.onmidimessage?.({ data: new Uint8Array([0x90, 69, 100]) });
    input.onmidimessage?.({ data: new Uint8Array([0x80, 69, 0]) });
    expect(onNote).toHaveBeenNthCalledWith(1, { pitchClass: 9, active: true });
    expect(onNote).toHaveBeenNthCalledWith(2, { pitchClass: 9, active: false });
    unmount();
    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
  });

  test('binds newly connected inputs after a state change', async () => {
    const access: FakeAccess = { inputs: new Map(), onstatechange: null };
    vi.stubGlobal('navigator', { requestMIDIAccess: vi.fn().mockResolvedValue(access) });
    render(<Harness onNote={vi.fn()} />);
    await waitFor(() => expect(access.onstatechange).toBeTypeOf('function'));
    const input: FakeInput = { onmidimessage: null };
    access.inputs.set('new-device', input);
    access.onstatechange?.({ port: { state: 'connected' } });
    expect(input.onmidimessage).toBeTypeOf('function');
    expect(screen.getByRole('status')).toHaveTextContent('connected');
  });
});
