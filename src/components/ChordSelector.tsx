import type { DiatonicChordChoice } from '../domain/theory/chords';
import type { ChordQuality } from '../domain/theory/types';

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const LEGACY_QUALITY: Readonly<Record<ChordQuality, string>> = { major: 'Maj', minor: 'm', diminished: 'dim' };

export interface ChordSelectorProps {
  readonly choices: readonly DiatonicChordChoice[];
  readonly selectedRoot: number | null;
  readonly selectedQuality: string | null;
  readonly selectedType: 'triad' | '7th' | null;
  readonly onSelect: (root: number, quality: string, type: 'triad' | '7th', active: boolean) => void;
}

export function ChordSelector({ choices, selectedRoot, selectedQuality, selectedType, onSelect }: ChordSelectorProps) {
  return (
    <div>
      <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-[#adb5bd] uppercase tracking-wider">3. Chords / 基础和弦</div>
      <div className="px-5">
        {choices.map((choice, index) => {
          const quality = LEGACY_QUALITY[choice.quality];
          const triadActive = selectedRoot === choice.root && selectedQuality === quality && selectedType === 'triad';
          const seventhActive = selectedRoot === choice.root && selectedQuality === quality && selectedType === '7th';
          return (
            <div key={choice.degree} className="mb-4">
              <div className="text-[13px] font-bold text-[#343a40] mb-2 flex items-center">
                <span><span className="text-[#d90429] font-black mr-1.5">{ROMANS[index]}</span>{quality}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onSelect(choice.root, quality, 'triad', triadActive)} className={`p-3 border rounded-lg text-[15px] font-semibold transition-all select-none ${triadActive ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-lg' : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-px'}`}>
                  {choice.triadName}
                </button>
                <button onClick={() => onSelect(choice.root, quality, '7th', seventhActive)} className={`p-3 border rounded-lg text-[15px] font-semibold transition-all select-none ${seventhActive ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-lg' : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-px'}`}>
                  {choice.seventhName}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
