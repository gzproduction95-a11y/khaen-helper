import { useEffect, useRef, useState } from 'react';
import type { PitchClass } from '../domain/theory/types';

export type MidiStatus = 'unsupported' | 'requesting' | 'disconnected' | 'connected' | 'error';

export interface MidiNoteEvent {
  readonly pitchClass: PitchClass;
  readonly active: boolean;
}

interface MidiMessageLike {
  readonly data?: ArrayLike<number>;
}

interface MidiInputLike {
  onmidimessage: ((event: MidiMessageLike) => void) | null;
  readonly state?: string;
}

interface MidiAccessLike {
  readonly inputs: Map<string, MidiInputLike>;
  onstatechange: ((event: { readonly port?: { readonly state?: string } }) => void) | null;
}

interface NavigatorWithMidi {
  requestMIDIAccess?: () => Promise<MidiAccessLike>;
}

export function useMidiInput(onNote: (event: MidiNoteEvent) => void): MidiStatus {
  const [status, setStatus] = useState<MidiStatus>('requesting');
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;

  useEffect(() => {
    const request = (navigator as unknown as NavigatorWithMidi).requestMIDIAccess;
    if (!request) {
      setStatus('unsupported');
      return;
    }

    let disposed = false;
    let access: MidiAccessLike | null = null;
    const boundInputs = new Map<string, MidiInputLike>();

    const handleMessage = (event: MidiMessageLike) => {
      const data = event.data;
      if (!data || data.length < 3) return;
      const command = data[0] & 0xf0;
      const velocity = data[2];
      const active = command === 0x90 && velocity > 0;
      if (!active && command !== 0x80 && !(command === 0x90 && velocity === 0)) return;
      onNoteRef.current({ pitchClass: (data[1] % 12) as PitchClass, active });
    };

    const syncInputs = () => {
      if (!access) return;
      const currentIds = new Set(access.inputs.keys());
      for (const [id, input] of boundInputs) {
        if (!currentIds.has(id)) {
          if (input.onmidimessage === handleMessage) input.onmidimessage = null;
          boundInputs.delete(id);
        }
      }
      access.inputs.forEach((input, id) => {
        const previous = boundInputs.get(id);
        if (previous && previous !== input && previous.onmidimessage === handleMessage) previous.onmidimessage = null;
        input.onmidimessage = handleMessage;
        boundInputs.set(id, input);
      });
      const hasConnectedInput = [...access.inputs.values()].some(input => input.state !== 'disconnected');
      setStatus(hasConnectedInput ? 'connected' : 'disconnected');
    };

    const handleStateChange = () => syncInputs();

    void Promise.resolve().then(() => request.call(navigator)).then(result => {
      if (disposed) return;
      access = result;
      syncInputs();
      access.onstatechange = handleStateChange;
    }).catch(() => {
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      for (const input of boundInputs.values()) {
        if (input.onmidimessage === handleMessage) input.onmidimessage = null;
      }
      boundInputs.clear();
      if (access?.onstatechange === handleStateChange) access.onstatechange = null;
    };
  }, []);

  return status;
}
