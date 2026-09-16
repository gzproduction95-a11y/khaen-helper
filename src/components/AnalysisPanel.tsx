import type { MidiStatus } from '../midi/useMidiInput';

export interface AnalysisPanelProps {
  readonly main: string;
  readonly sub: string;
  readonly notes: string;
  readonly midiStatus: MidiStatus;
  readonly octaveExpanded: boolean;
  readonly onReset: () => void;
  readonly onToggleOctave: () => void;
}

export function AnalysisPanel({ main, sub, notes, midiStatus, octaveExpanded, onReset, onToggleOctave }: AnalysisPanelProps) {
  return (
    <div className="analysis-panel bg-white px-[clamp(1rem,3vw,2.5rem)] py-[clamp(0.75rem,2vh,1.25rem)] rounded-2xl w-full max-w-[480px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] text-center shrink-0">
      <div className="analysis-panel__main text-[clamp(1.75rem,4vh,2.625rem)] font-black text-[#d90429] leading-tight mb-1 min-h-[1.2em]">{main}</div>
      <div className="analysis-panel__sub text-sm text-[#868e96] font-medium h-5">{sub}</div>
      <span className="analysis-panel__notes font-mono bg-[#f8f9fa] px-3 py-1 rounded text-[13px] text-[#495057] inline-block mt-2.5 font-semibold">{notes}</span>
      <div role="status" className={`analysis-panel__status text-[10px] mt-1.5 uppercase tracking-widest ${midiStatus === 'connected' ? 'text-[#d90429] font-bold' : 'text-[#aaa]'}`}>
        {midiStatus === 'connected' ? '● MIDI Connected'
          : midiStatus === 'requesting' ? 'MIDI: Requesting access…'
            : midiStatus === 'unsupported' ? 'MIDI: Not supported in this browser'
              : midiStatus === 'error' ? 'MIDI: Access unavailable'
                : 'MIDI: No device connected'}
      </div>
      <div className="analysis-panel__actions mt-3 flex gap-3 justify-center flex-wrap">
        <button onClick={onReset} className="px-5 py-2 bg-[#2b2d42] text-white rounded-md text-xs font-bold hover:bg-[#1a1c29] transition-colors">RESET GRAPH</button>
        <button onClick={onToggleOctave} className={`px-5 py-2 rounded-md text-xs font-bold transition-all ${octaveExpanded ? 'bg-[#0077b6] text-white shadow-[0_0_15px_rgba(0,119,182,0.4)]' : 'bg-white border border-[#ced4da] text-[#495057] hover:bg-[#f8f9fa]'}`}>OCTAVE</button>
      </div>
    </div>
  );
}
