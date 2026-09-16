import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { KHAEN_16_PIPES, LEFT_PIPES, RIGHT_PIPES } from './domain/instruments/khaen16';
import { displayNote } from './domain/theory/notes';
import { buildScale } from './domain/theory/scales';
import { buildChordPitchClasses, buildDiatonicChordChoices } from './domain/theory/chords';
import { analyzeChord } from './domain/theory/analyzeChord';
import type { KeyRoot, PitchClass, ScaleType } from './domain/theory/types';

// === CONSTANTS & TYPES ===

const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

type UiScaleType = 'major' | 'minor';
type Modifier = 'add9' | 'add11' | 'add13' | 'add6' | 'no3' | 'no5' | 'sus4' | 'sus2' | 'aug' | 'dim_mod';

interface ChordSelection {
  rootVal: number | null;
  quality: string | null;
  type: 'triad' | '7th' | null;
  modifiers: Set<Modifier>;
}

// Data from HTML logic
// === MAIN COMPONENT ===

export default function App() {
  // State
  const [keyRoot, setKeyRoot] = useState<KeyRoot>('A');
  const [keyType, setKeyType] = useState<UiScaleType>('minor');
  const [activeHoleIds, setActiveHoleIds] = useState<Set<string>>(new Set());
  const [hintRoot, setHintRoot] = useState<number | null>(null);
  const [octaveExpanded, setOctaveExpanded] = useState<boolean>(false);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [selection, setSelection] = useState<ChordSelection>({
    rootVal: null,
    quality: null,
    type: null,
    modifiers: new Set(),
  });
  const [midiConnected, setMidiConnected] = useState<boolean>(false);
  const [scaleFactor, setScaleFactor] = useState(1);

  // Derived State: Current Key Notes
  const currentKeyNotes = useMemo(() => {
    return buildScale(keyRoot, keyType === 'minor' ? 'natural-minor' : 'major');
  }, [keyRoot, keyType]);

  // Derived State: Active Note Values for Analysis
  const activeNoteValues = useMemo(() => {
    const notes = new Set<number>();
    activeHoleIds.forEach(id => {
      const hole = KHAEN_16_PIPES.find(h => h.id === id);
      if (hole) {
        notes.add(currentKeyNotes[hole.degreeIndex]);
      }
    });
    return [...notes];
  }, [activeHoleIds, currentKeyNotes]);

  // === LOGIC: Compute Active Holes from Selection ===
  useEffect(() => {
    if (selection.rootVal === null || selection.quality === null) {
      return;
    }

    const root = selection.rootVal;
    const quality = selection.quality === 'Maj' ? 'major' : selection.quality === 'm' ? 'minor' : 'diminished';
    const modifiers = new Set([...selection.modifiers].map(mod => mod === 'dim_mod' ? 'dim' : mod));
    const targetVals = buildChordPitchClasses({
      root: root as PitchClass,
      quality,
      type: selection.type === '7th' ? 'seventh' : 'triad',
      modifiers,
    });
    
    // Default selection: only 'num' holes
    const newHoleIds = new Set<string>();
    KHAEN_16_PIPES.forEach(h => {
      const noteVal = currentKeyNotes[h.degreeIndex];
      if (targetVals.includes(noteVal) && h.displayGroup === 'primary') {
        newHoleIds.add(h.id);
      }
    });

    setActiveHoleIds(newHoleIds);
    setHintRoot(root);

  }, [selection, currentKeyNotes, keyType]);

  // === LOGIC: Chord Analysis ===
  const analyzedChord = useMemo(() => {
    const theoryType: ScaleType = keyType === 'minor' ? 'natural-minor' : 'major';
    const analysis = analyzeChord(activeNoteValues as PitchClass[], {
      keyRoot, scaleType: theoryType, rootHint: hintRoot as PitchClass | null,
    });
    return {
      main: analysis.main,
      sub: analysis.status === 'ready'
        ? 'Ready'
        : analysis.alternatives.length ? `Or: ${analysis.alternatives.join(' / ')}`
          : analysis.status === 'unknown' ? 'Unknown Shape' : 'Exact Match',
      notes: analysis.notes.length ? `Notes: ${analysis.notes.join(' - ')}` : '-',
    };
  }, [activeNoteValues, hintRoot, keyRoot, keyType, currentKeyNotes]);


  // === MIDI HANDLING ===
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let midiAccess: any = null;

    const onMIDIMessage = (event: any) => {
      const data = event.data as Uint8Array;
      if (!data || data.length < 3) return;
      
      const cmd = data[0] & 0xf0;
      const note = data[1];
      const velocity = data[2];
      const noteVal = note % 12;

      if (cmd === 144 && velocity > 0) {
        setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() });
        setActiveHoleIds(prev => {
          const next = new Set(prev);
          KHAEN_16_PIPES.forEach(h => {
             if (currentKeyNotes[h.degreeIndex] === noteVal) next.add(h.id);
          });
          return next;
        });
      } else if (cmd === 128 || (cmd === 144 && velocity === 0)) {
        setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() });
        setActiveHoleIds(prev => {
          const next = new Set(prev);
          KHAEN_16_PIPES.forEach(h => {
            if (currentKeyNotes[h.degreeIndex] === noteVal) next.delete(h.id);
          });
          return next;
        });
      }
    };

    const initMIDI = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          midiAccess = await navigator.requestMIDIAccess();
          setMidiConnected(midiAccess.inputs.size > 0);
          midiAccess.inputs.forEach((input: any) => {
            input.onmidimessage = onMIDIMessage;
          });
          midiAccess.onstatechange = (e: any) => {
             setMidiConnected(e.port.state === 'connected');
          };
        } catch (e) {
          console.error("MIDI Failed", e);
        }
      }
    };

    initMIDI();
  }, [currentKeyNotes]);


  // === HANDLERS ===
  const resetAll = () => {
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() });
    setHintRoot(null);
    setActiveHoleIds(new Set());
    setOctaveExpanded(false);
  };

  const toggleMod = (mod: Modifier) => {
    setSelection(prev => {
      const newMods = new Set(prev.modifiers);
      if (newMods.has(mod)) newMods.delete(mod);
      else newMods.add(mod);
      return { ...prev, modifiers: newMods };
    });
  };

  const selectChord = (rootVal: number, quality: string, type: 'triad' | '7th', isActive: boolean) => {
    if (isActive) {
      resetAll();
    } else {
      setSelection({
        rootVal,
        quality,
        type,
        modifiers: new Set()
      });
      setHintRoot(rootVal);
    }
  };

  const handleHoleClick = (holeId: string, degIndex: number) => {
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() }); 
    const noteVal = currentKeyNotes[degIndex];

    setActiveHoleIds(prev => {
       const next = new Set(prev);
       const exists = next.has(holeId);
       if (exists) {
         next.delete(holeId);
       } else {
         next.add(holeId);
         if (next.size === 1) setHintRoot(noteVal);
       }
       return next;
    });
  };

  // Auto-resize visualizer and Handle Orientation
  useEffect(() => {
    const handleResize = () => {
       const w = window.innerWidth;
       const h = window.innerHeight;
       
       // Handle scale
       if (h < 700) setScaleFactor(0.8);
       else if (h < 900) setScaleFactor(0.9);
       else setScaleFactor(1);

       // USER REQUEST: Auto-hide sidebar if mobile/tablet in portrait mode
       const isPortrait = h > w;
       const isMobileOrTablet = w <= 1024;
       if (isPortrait && isMobileOrTablet) {
          setSidebarVisible(false);
       }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#f5f7fa] text-[#2b2d42] font-sans relative">
      
      <style>{`
        .khaen-body {
          border-radius: 50% 50% 40% 40% / 15% 15% 10% 10%;
        }
        .text-shadow {
           text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: #ced4da; border-radius: 4px; }
      `}</style>

      {/* --- TOGGLE BUTTON --- */}
      <button 
        onClick={() => setSidebarVisible(!sidebarVisible)}
        className={`
          absolute top-8 z-50 p-2 bg-white border border-[#e9ecef] rounded-full shadow-lg transition-all duration-300 hover:scale-110
          ${sidebarVisible ? 'left-[324px]' : 'left-4'}
        `}
        title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
      >
        {sidebarVisible ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* --- LEFT SIDEBAR --- */}
      <div 
        className={`
          h-full bg-white border-r border-[#e9ecef] flex flex-col z-10 shadow-[4px_0_20px_rgba(0,0,0,0.03)] shrink-0 transition-all duration-300 overflow-hidden
          ${sidebarVisible ? 'w-[340px]' : 'w-0 border-none'}
        `}
      >
        <div className="w-[340px]">
          <div className="p-5 border-b border-[#e9ecef] bg-white">
            <div className="text-[11px] font-extrabold text-[#adb5bd] uppercase mb-2.5 tracking-wider">1. Key / 调式设定</div>
            <div className="flex gap-2.5">
              <select 
                value={keyRoot}
                onChange={(e) => {
                  setKeyRoot(e.target.value as KeyRoot);
                  resetAll();
                }}
                className="flex-1 p-2 text-sm border border-[#ced4da] rounded-md bg-white cursor-pointer text-[#495057] focus:outline-none focus:ring-2 focus:ring-[#2b2d42]"
              >
                <option value="C">C</option><option value="Db">Db / C#</option><option value="D">D</option>
                <option value="Eb">Eb</option><option value="E">E</option><option value="F">F</option>
                <option value="Gb">Gb / F#</option><option value="G">G</option><option value="Ab">Ab</option>
                <option value="A">A</option><option value="Bb">Bb</option><option value="B">B</option>
              </select>
              <select 
                value={keyType}
                onChange={(e) => {
                  setKeyType(e.target.value as UiScaleType);
                  resetAll();
                }}
                className="flex-1 p-2 text-sm border border-[#ced4da] rounded-md bg-white cursor-pointer text-[#495057] focus:outline-none focus:ring-2 focus:ring-[#2b2d42]"
              >
                <option value="minor">Minor (小调)</option>
                <option value="major">Major (大调)</option>
              </select>
            </div>
          </div>

          <div className="h-[calc(100vh-100px)] overflow-y-auto custom-scroll pb-10">
            <div>
              <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-[#adb5bd] uppercase tracking-wider">2. Modifiers / 修饰</div>
              <div className="px-5 pb-4 border-b border-[#e9ecef]">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'add9', label: '+ add9' }, { id: 'add11', label: '+ add11' }, 
                    { id: 'add13', label: '+ add13' }, { id: 'add6', label: '+ add6' }, 
                    { id: 'no3', label: '- no3' }, { id: 'no5', label: '- no5' },
                    { id: 'sus4', label: 'sus4' }, { id: 'sus2', label: 'sus2' },
                    { id: 'aug', label: 'aug' }, { id: 'dim_mod', label: 'dim' }
                  ].map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => toggleMod(mod.id as Modifier)}
                      className={`
                        text-[13px] py-2 border rounded-md font-medium transition-colors select-none
                        ${selection.modifiers.has(mod.id as Modifier)
                          ? 'bg-[#2b2d42] text-white border-[#2b2d42]' 
                          : 'bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef] hover:border-[#adb5bd]'
                        }
                      `}
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="px-5 pt-5 pb-2 text-[11px] font-extrabold text-[#adb5bd] uppercase tracking-wider">3. Chords / 基础和弦</div>
              <div className="px-5">
                {currentKeyNotes.map((rootVal, i) => {
                  const choice = buildDiatonicChordChoices(keyRoot, keyType === 'minor' ? 'natural-minor' : 'major')[i];
                  const q = choice.quality === 'major' ? 'Maj' : choice.quality === 'minor' ? 'm' : 'dim';
                  const triName = choice.triadName;
                  const sevName = choice.seventhName;

                  const isTriadActive = selection.rootVal === rootVal && selection.quality === q && selection.type === 'triad';
                  const isSeventhActive = selection.rootVal === rootVal && selection.quality === q && selection.type === '7th';

                  return (
                    <div key={i} className="mb-4">
                      <div className="text-[13px] font-bold text-[#343a40] mb-2 flex items-center">
                         <span><span className="text-[#d90429] font-black mr-1.5">{ROMANS[i]}</span>{q}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <button
                           onClick={() => selectChord(rootVal, q, 'triad', isTriadActive)}
                           className={`
                             p-3 border rounded-lg text-[15px] font-semibold transition-all select-none
                             ${isTriadActive 
                               ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-lg' 
                               : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-px'
                             }
                           `}
                         >
                           {triName}
                         </button>
                         <button
                           onClick={() => selectChord(rootVal, q, '7th', isSeventhActive)}
                           className={`
                             p-3 border rounded-lg text-[15px] font-semibold transition-all select-none
                             ${isSeventhActive
                               ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-lg' 
                               : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-px'
                             }
                           `}
                         >
                           {sevName}
                         </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT MAIN PANEL --- */}
      <div className="flex-1 flex flex-col items-center p-8 relative h-full overflow-y-auto">
        
        <div className="bg-white px-10 py-5 rounded-2xl w-full max-w-[480px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] mb-8 text-center shrink-0">
          <div className="text-[42px] font-black text-[#d90429] leading-tight mb-1 min-h-[46px]">
            {analyzedChord.main}
          </div>
          <div className="text-sm text-[#868e96] font-medium h-5">
            {analyzedChord.sub}
          </div>
          <span className="font-mono bg-[#f8f9fa] px-3 py-1 rounded text-[13px] text-[#495057] inline-block mt-2.5 font-semibold">
            {analyzedChord.notes}
          </span>
          <div className={`text-[10px] mt-1.5 uppercase tracking-widest ${midiConnected ? 'text-[#d90429] font-bold' : 'text-[#aaa]'}`}>
             {midiConnected ? '● MIDI Connected' : 'MIDI Device: Scanning...'}
          </div>
          <div className="mt-4 flex gap-3 justify-center">
             <button 
               onClick={resetAll}
               className="px-5 py-2 bg-[#2b2d42] text-white rounded-md text-xs font-bold hover:bg-[#1a1c29] transition-colors"
             >
               RESET GRAPH
             </button>
             <button 
               onClick={() => setOctaveExpanded(!octaveExpanded)}
               className={`
                 px-5 py-2 rounded-md text-xs font-bold transition-all
                 ${octaveExpanded 
                   ? 'bg-[#0077b6] text-white shadow-[0_0_15px_rgba(0,119,182,0.4)]' 
                   : 'bg-white border border-[#ced4da] text-[#495057] hover:bg-[#f8f9fa]'
                 }
               `}
             >
               OCTAVE
             </button>
          </div>
        </div>

        <div 
           className="relative pb-12 select-none"
           style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }}
        >
           <div className="absolute top-[75px] -left-[45px] text-sm font-bold text-[#2b2d42]">L5</div>
           <div className="absolute top-[300px] -left-[45px] text-sm font-bold text-[#2b2d42]">L2-4</div>
           <div className="absolute -bottom-[30px] -left-[45px] text-sm font-bold text-[#2b2d42]">L1</div>
           
           <div className="absolute top-[75px] -right-[45px] text-sm font-bold text-[#2b2d42]">R5</div>
           <div className="absolute top-[300px] -right-[45px] text-sm font-bold text-[#2b2d42]">R2-4</div>
           <div className="absolute -bottom-[30px] -right-[45px] text-sm font-bold text-[#2b2d42]">R1</div>

           <div className="absolute top-[145px] w-[220px] h-[380px] left-1/2 -translate-x-1/2 border-2 border-dashed border-[#e9ecef] -z-20 rounded-xl"></div>

           <div className="khaen-body relative w-[180px] h-[680px] bg-white border-[4px] border-[#2b2d42] flex justify-between px-[25px] pt-[60px] pb-[80px] shadow-[0_25px_50px_rgba(0,0,0,0.1)] box-border">
              <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 w-[60px] h-[25px] border-[4px] border-b-0 border-[#2b2d42] bg-white -z-10"></div>
              
              <div className="flex flex-col justify-between h-full w-[50px] items-center">
                 {LEFT_PIPES.map((h) => {
                   const noteVal = currentKeyNotes[h.degreeIndex];
                   const isActive = activeHoleIds.has(h.id);
                   const isOctaveActive = !isActive && octaveExpanded && activeNoteValues.includes(noteVal);
                   const noteName = displayNote(noteVal as PitchClass, keyRoot, keyType === 'minor' ? 'natural-minor' : 'major');

                   return (
                     <div 
                       key={h.id}
                       onClick={() => handleHoleClick(h.id, h.degreeIndex)}
                       className={`
                         w-[46px] h-[46px] border-[2px] rounded-full flex justify-center items-center cursor-pointer relative transition-all duration-100
                         hover:scale-110 hover:bg-[#f8f9fa]
                         ${isActive 
                            ? 'border-[#d90429] bg-[#ffe3e3] shadow-[0_0_15px_rgba(217,4,41,0.3)]' 
                            : isOctaveActive
                              ? 'border-[#0077b6] bg-[#e0f2fe] shadow-[0_0_15px_rgba(0,119,182,0.3)]'
                              : 'border-[#2b2d42] bg-white'
                         }
                       `}
                     >
                       <div className="pointer-events-none text-center leading-none">
                         <span className={`
                           font-extrabold text-[20px] transition-colors
                           ${isActive ? '!text-[#d90429]' : isOctaveActive ? '!text-[#0077b6]' : ''}
                           ${h.displayGroup === 'alternate' ? 'text-[#0077b6]' : h.displayGroup === 'top-tonic' ? 'text-[#2a9d8f]' : 'text-[#2b2d42]'}
                         `}>
                           {h.label}
                         </span>
                         <span className={`block text-[11px] font-bold -mt-0.5 ${isActive ? 'text-[#d90429]' : isOctaveActive ? 'text-[#0077b6]' : 'text-[#adb5bd]'}`}>
                           {noteName}
                         </span>
                       </div>
                     </div>
                   );
                 })}
              </div>

              <div className="flex flex-col justify-between h-full w-[50px] items-center">
                 {RIGHT_PIPES.map((h) => {
                   const noteVal = currentKeyNotes[h.degreeIndex];
                   const isActive = activeHoleIds.has(h.id);
                   const isOctaveActive = !isActive && octaveExpanded && activeNoteValues.includes(noteVal);
                   const noteName = displayNote(noteVal as PitchClass, keyRoot, keyType === 'minor' ? 'natural-minor' : 'major');

                   return (
                     <div 
                       key={h.id}
                       onClick={() => handleHoleClick(h.id, h.degreeIndex)}
                       className={`
                         w-[46px] h-[46px] border-[2px] rounded-full flex justify-center items-center cursor-pointer relative transition-all duration-100
                         hover:scale-110 hover:bg-[#f8f9fa]
                         ${isActive 
                            ? 'border-[#d90429] bg-[#ffe3e3] shadow-[0_0_15px_rgba(217,4,41,0.3)]' 
                            : isOctaveActive
                              ? 'border-[#0077b6] bg-[#e0f2fe] shadow-[0_0_15px_rgba(0,119,182,0.3)]'
                              : 'border-[#2b2d42] bg-white'
                         }
                       `}
                     >
                       <div className="pointer-events-none text-center leading-none">
                         <span className={`
                           font-extrabold text-[20px] transition-colors
                           ${isActive ? '!text-[#d90429]' : isOctaveActive ? '!text-[#0077b6]' : ''}
                           ${h.displayGroup === 'alternate' ? 'text-[#0077b6]' : h.displayGroup === 'top-tonic' ? 'text-[#2a9d8f]' : 'text-[#2b2d42]'}
                         `}>
                           {h.label}
                         </span>
                         <span className={`block text-[11px] font-bold -mt-0.5 ${isActive ? 'text-[#d90429]' : isOctaveActive ? 'text-[#0077b6]' : 'text-[#adb5bd]'}`}>
                           {noteName}
                         </span>
                       </div>
                     </div>
                   );
                 })}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
