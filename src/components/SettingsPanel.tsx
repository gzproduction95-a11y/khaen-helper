import type { ReactNode } from 'react';
import type { KeyRoot } from '../domain/theory/types';

export type UiModifier = 'add9' | 'add11' | 'add13' | 'add6' | 'no3' | 'no5' | 'sus4' | 'sus2' | 'aug' | 'dim_mod';
export type UiScaleType = 'major' | 'minor';

const MODIFIERS: readonly { id: UiModifier; label: string }[] = [
  { id: 'add9', label: '+ add9' }, { id: 'add11', label: '+ add11' },
  { id: 'add13', label: '+ add13' }, { id: 'add6', label: '+ add6' },
  { id: 'no3', label: '- no3' }, { id: 'no5', label: '- no5' },
  { id: 'sus4', label: 'sus4' }, { id: 'sus2', label: 'sus2' },
  { id: 'aug', label: 'aug' }, { id: 'dim_mod', label: 'dim' },
];

export interface SettingsPanelProps {
  readonly visible: boolean;
  readonly keyRoot: KeyRoot;
  readonly scaleType: UiScaleType;
  readonly selectedModifiers: ReadonlySet<UiModifier>;
  readonly onKeyRootChange: (root: KeyRoot) => void;
  readonly onScaleTypeChange: (type: UiScaleType) => void;
  readonly onToggleModifier: (modifier: UiModifier) => void;
  readonly children: ReactNode;
}

export function SettingsPanel({ visible, keyRoot, scaleType, selectedModifiers, onKeyRootChange, onScaleTypeChange, onToggleModifier, children }: SettingsPanelProps) {
  return (
    <div className={`h-full bg-white border-r border-[#e9ecef] flex flex-col z-10 shadow-[4px_0_20px_rgba(0,0,0,0.03)] shrink-0 transition-all duration-300 overflow-hidden ${visible ? 'w-[340px]' : 'w-0 border-none'}`}>
      <div className="w-[340px]">
        <div className="p-5 border-b border-[#e9ecef] bg-white">
          <div className="text-[11px] font-extrabold text-[#adb5bd] uppercase mb-2.5 tracking-wider">1. Key / 调式设定</div>
          <div className="flex gap-2.5">
            <select value={keyRoot} onChange={event => onKeyRootChange(event.target.value as KeyRoot)} className="flex-1 p-2 text-sm border border-[#ced4da] rounded-md bg-white cursor-pointer text-[#495057] focus:outline-none focus:ring-2 focus:ring-[#2b2d42]">
              <option value="C">C</option><option value="Db">Db / C#</option><option value="D">D</option>
              <option value="Eb">Eb</option><option value="E">E</option><option value="F">F</option>
              <option value="Gb">Gb / F#</option><option value="G">G</option><option value="Ab">Ab</option>
              <option value="A">A</option><option value="Bb">Bb</option><option value="B">B</option>
            </select>
            <select value={scaleType} onChange={event => onScaleTypeChange(event.target.value as UiScaleType)} className="flex-1 p-2 text-sm border border-[#ced4da] rounded-md bg-white cursor-pointer text-[#495057] focus:outline-none focus:ring-2 focus:ring-[#2b2d42]">
              <option value="minor">Minor (小调)</option><option value="major">Major (大调)</option>
            </select>
          </div>
        </div>
        <div className="h-[calc(100vh-100px)] overflow-y-auto custom-scroll pb-10">
          <div>
            <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-[#adb5bd] uppercase tracking-wider">2. Modifiers / 修饰</div>
            <div className="px-5 pb-4 border-b border-[#e9ecef]"><div className="grid grid-cols-2 gap-2">
              {MODIFIERS.map(modifier => (
                <button key={modifier.id} onClick={() => onToggleModifier(modifier.id)} className={`text-[13px] py-2 border rounded-md font-medium transition-colors select-none ${selectedModifiers.has(modifier.id) ? 'bg-[#2b2d42] text-white border-[#2b2d42]' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef] hover:border-[#adb5bd]'}`}>
                  {modifier.label}
                </button>
              ))}
            </div></div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
