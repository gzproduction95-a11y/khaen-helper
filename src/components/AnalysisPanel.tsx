export interface AnalysisPanelProps {
  readonly main: string;
  readonly sub: string;
  readonly notes: string;
  readonly midiConnected: boolean;
  readonly octaveExpanded: boolean;
  readonly onReset: () => void;
  readonly onToggleOctave: () => void;
}

export function AnalysisPanel({ main, sub, notes, midiConnected, octaveExpanded, onReset, onToggleOctave }: AnalysisPanelProps) {
  return (
    <div className="bg-white px-10 py-5 rounded-2xl w-full max-w-[480px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] mb-8 text-center shrink-0">
      <div className="text-[42px] font-black text-[#d90429] leading-tight mb-1 min-h-[46px]">{main}</div>
      <div className="text-sm text-[#868e96] font-medium h-5">{sub}</div>
      <span className="font-mono bg-[#f8f9fa] px-3 py-1 rounded text-[13px] text-[#495057] inline-block mt-2.5 font-semibold">{notes}</span>
      <div className={`text-[10px] mt-1.5 uppercase tracking-widest ${midiConnected ? 'text-[#d90429] font-bold' : 'text-[#aaa]'}`}>
        {midiConnected ? '● MIDI Connected' : 'MIDI Device: Scanning...'}
      </div>
      <div className="mt-4 flex gap-3 justify-center">
        <button onClick={onReset} className="px-5 py-2 bg-[#2b2d42] text-white rounded-md text-xs font-bold hover:bg-[#1a1c29] transition-colors">RESET GRAPH</button>
        <button onClick={onToggleOctave} className={`px-5 py-2 rounded-md text-xs font-bold transition-all ${octaveExpanded ? 'bg-[#0077b6] text-white shadow-[0_0_15px_rgba(0,119,182,0.4)]' : 'bg-white border border-[#ced4da] text-[#495057] hover:bg-[#f8f9fa]'}`}>OCTAVE</button>
      </div>
    </div>
  );
}
