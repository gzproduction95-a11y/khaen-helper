import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers } from 'lucide-react';

// === CONSTANTS & TYPES ===

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

type ScaleType = 'major' | 'minor';
type Modifier = 'add9' | 'add11' | 'add13' | 'add6' | 'no3' | 'no5' | 'sus4' | 'sus2';

interface ChordSelection {
  rootVal: number | null;
  quality: string | null;
  type: 'triad' | '7th' | null;
  modifiers: Set<Modifier>;
}

// Data from HTML logic
const SCALES = {
  'major': { intervals: [0, 2, 4, 5, 7, 9, 11], qualities: ['Maj', 'm', 'm', 'Maj', 'Maj', 'm', 'dim'] },
  'minor': { intervals: [0, 2, 3, 5, 7, 8, 10], qualities: ['m', 'dim', 'Maj', 'm', 'm', 'Maj', 'Maj'] }
};

// Khaen Layout based on HTML structure
interface HoleConfig {
  id: string;
  degIndex: number; // Index in the 7-note scale (0-6)
  label: string;
  colorClass: 'num' | 'num-blue' | 'num-green';
}

const LEFT_COL: HoleConfig[] = [
  { id: 'L8', degIndex: 6, label: '7', colorClass: 'num-blue' },
  { id: 'L7', degIndex: 5, label: '6', colorClass: 'num-blue' },
  { id: 'L6', degIndex: 6, label: '7', colorClass: 'num' },
  { id: 'L5', degIndex: 5, label: '6', colorClass: 'num' },
  { id: 'L4', degIndex: 4, label: '5', colorClass: 'num' },
  { id: 'L3', degIndex: 3, label: '4', colorClass: 'num' },
  { id: 'L2', degIndex: 1, label: '2', colorClass: 'num' },
  { id: 'L1', degIndex: 2, label: '3', colorClass: 'num-blue' },
];

const RIGHT_COL: HoleConfig[] = [
  { id: 'R8', degIndex: 0, label: '1', colorClass: 'num-green' },
  { id: 'R7', degIndex: 4, label: '5', colorClass: 'num-blue' },
  { id: 'R6', degIndex: 3, label: '4', colorClass: 'num-blue' },
  { id: 'R5', degIndex: 1, label: '2', colorClass: 'num-blue' },
  { id: 'R4', degIndex: 0, label: '1', colorClass: 'num-blue' },
  { id: 'R3', degIndex: 6, label: '7', colorClass: 'num' },
  { id: 'R2', degIndex: 2, label: '3', colorClass: 'num' },
  { id: 'R1', degIndex: 0, label: '1', colorClass: 'num' },
];

// === UTILITIES ===

function getNoteVal(name: string): number {
  if (!name) return -1;
  let n = name.charAt(0).toUpperCase() + name.slice(1);
  let idx = SHARPS.indexOf(n);
  if (idx === -1) idx = FLATS.indexOf(n);
  return idx;
}

function getDisplayNote(val: number, keyRoot: string, keyType: ScaleType): string {
  const root = keyRoot;
  const useFlat = (['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(root)) ||
                  (keyType === 'minor' && ['C', 'F', 'Bb', 'Eb', 'G', 'D'].includes(root));
  return useFlat ? FLATS[val % 12] : SHARPS[val % 12];
}

// === MAIN COMPONENT ===

export default function App() {
  // State
  const [keyRoot, setKeyRoot] = useState<string>('A');
  const [keyType, setKeyType] = useState<ScaleType>('minor');
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [hintRoot, setHintRoot] = useState<number | null>(null);
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
    const rootVal = getNoteVal(keyRoot);
    const intervals = SCALES[keyType].intervals;
    return intervals.map(i => (rootVal + i) % 12);
  }, [keyRoot, keyType]);

  // === LOGIC: Compute Active Notes from Selection ===
  useEffect(() => {
    if (selection.rootVal === null || selection.quality === null) {
      // If no chord selected (manual mode or reset), don't overwrite activeNotes unless explicitly reset
      // We handle clearing in resetAll
      return;
    }

    const root = selection.rootVal;
    const q = selection.quality;
    const type = selection.type;
    const modifiers = selection.modifiers;
    let intervals = [0];

    if (q === 'Maj') { intervals.push(4); intervals.push(7); }
    else if (q === 'm') { intervals.push(3); intervals.push(7); }
    else if (q === 'dim') { intervals.push(3); intervals.push(6); }

    // 7ths
    if (type === '7th') {
      // Determine suffix based on scale context logic from HTML or generic standard
      // The HTML had logic based on index (i). We'll try to replicate standard diatonic 7ths for simplicity
      // based on quality, but to match the HTML perfectly we might need to know the 'degree'.
      // For now, let's infer standard 7ths from quality:
      if (q === 'Maj') intervals.push(11); // Maj7
      else if (q === 'm') intervals.push(10); // m7
      else if (q === 'dim') intervals.push(10); // m7b5 (half dim is standard for VII in major)
      
      // Fix specific diatonic adjustments if needed, but let's stick to standard map first
      // Actually, let's do a quick lookup if we can find the chord in the scale list
      // Re-deriving exact interval:
      // We'll rely on the fact that the user clicked a specific button generated by the scale loop
    }

    // Since we don't pass the "button label" logic here, let's refine the 7th logic
    // based on Diatonic position. We need to find which degree this root is.
    const degreeIdx = currentKeyNotes.indexOf(root);
    if (degreeIdx !== -1 && type === '7th') {
       // Apply diatonic 7th logic from HTML
       if (keyType === 'major') {
         if (degreeIdx === 4 || degreeIdx === 6) { // V7 or VIIm7b5 (wait, V is dom7)
            if (degreeIdx === 4) {
               // V7: Maj triad + minor 7
               if (intervals.includes(11)) { intervals = intervals.filter(i=>i!==11); intervals.push(10); } 
            }
         }
       }
       if (keyType === 'minor') {
          // I is m, usually m7
          // II is dim, usually m7b5
          // III is Maj, usually Maj7
          // IV is m, usually m7
          // V is m, usually m7 (natural minor)
          // VI is Maj, usually Maj7
          // VII is Maj, usually Dom7 (wait, natural minor VII is Maj7 relative to root? No, whole step down)
          // Let's just use the intervals from the scale:
          // The 7th is simply +2 scale degrees up (wrapping)
          // Actually, simplest way: Just pick the notes from the current scale!
          // Root, 3rd, 5th, 7th from scale degrees.
          
          // Reset and just grab scale notes?
          // This is safer to ensure it matches the "Diatonic Chords" header.
          const deg3 = currentKeyNotes[(degreeIdx + 2) % 7];
          const deg5 = currentKeyNotes[(degreeIdx + 4) % 7];
          const deg7 = currentKeyNotes[(degreeIdx + 6) % 7];
          
          intervals = [0, 
            (deg3 - root + 12) % 12, 
            (deg5 - root + 12) % 12, 
            (deg7 - root + 12) % 12
          ];
       } else {
          // Major scale
          const deg3 = currentKeyNotes[(degreeIdx + 2) % 7];
          const deg5 = currentKeyNotes[(degreeIdx + 4) % 7];
          const deg7 = currentKeyNotes[(degreeIdx + 6) % 7];
          
           intervals = [0, 
            (deg3 - root + 12) % 12, 
            (deg5 - root + 12) % 12, 
            (deg7 - root + 12) % 12
          ];
       }
    }

    // Modifiers
    modifiers.forEach(m => {
      if (m === 'add9') intervals.push(2);
      if (m === 'add11') intervals.push(5);
      if (m === 'add13') intervals.push(9);
      if (m === 'add6') intervals.push(9);
      if (m === 'no3') intervals = intervals.filter(i => i !== 3 && i !== 4);
      if (m === 'no5') intervals = intervals.filter(i => i !== 7 && i !== 6);
      if (m === 'sus4') { intervals.push(5); intervals = intervals.filter(i => i !== 3 && i !== 4); }
      if (m === 'sus2') { intervals.push(2); intervals = intervals.filter(i => i !== 3 && i !== 4); }
    });

    const targetVals = intervals.map(i => (root + i) % 12);
    setActiveNotes(targetVals);
    setHintRoot(root);

  }, [selection, currentKeyNotes, keyType]);

  // === LOGIC: Chord Analysis ===
  const analyzedChord = useMemo(() => {
    const unique = [...new Set(activeNotes)].sort((a, b) => a - b);
    if (unique.length === 0) return { main: '-', sub: 'Ready', notes: '-' };

    const noteNames = unique.map(v => getDisplayNote(v, keyRoot, keyType));
    
    // Candidates generation
    const candidates: { root: number, name: string }[] = [];

    for (let i = 0; i < unique.length; i++) {
      const rVal = unique[i];
      const rName = getDisplayNote(rVal, keyRoot, keyType);
      const ints = new Set(unique.map(v => (v - rVal + 12) % 12));

      let name = "";
      let baseType = "";
      let valid = false;

      const hasM3 = ints.has(4);
      const hasm3 = ints.has(3);
      const hasP5 = ints.has(7);
      const hasd5 = ints.has(6);
      const hasP4 = ints.has(5);
      const hasM2 = ints.has(2);

      if (hasm3 && hasd5 && !hasP5) { baseType = "dim"; valid = true; }
      else if (hasm3 && hasP5) { baseType = "m"; valid = true; }
      else if (hasM3 && hasP5) { baseType = "Maj"; valid = true; }
      else if (hasP4 && hasP5 && !hasm3 && !hasM3) { baseType = "sus4"; valid = true; }
      else if (hasM2 && hasP5 && !hasm3 && !hasM3) { baseType = "sus2"; valid = true; }
      else if (!hasP5 && !hasd5) {
          if (hasM3) { baseType = "no5Maj"; valid = true; }
          else if (hasm3) { baseType = "no5m"; valid = true; }
      }
      else if (hasP5 && ints.size === 2) { baseType = "5"; valid = true; }

      if (!valid) continue;

      const hasm7 = ints.has(10);
      const hasM7 = ints.has(11);
      const hasdim7 = ints.has(9); 

      name = rName;

      if (hasm7) { 
          if (baseType === "Maj" || baseType === "no5Maj") name += "7"; 
          else if (baseType === "m" || baseType === "no5m") name += "m7";
          else if (baseType === "dim") name += "m7b5"; 
          else if (baseType === "sus4") name += "7sus4"; 
          else if (baseType === "sus2") name += "7sus2";
      } else if (hasM7) { 
          if (baseType === "m" || baseType === "no5m") name += "m(maj7)";
          else name += "maj7"; 
      } else if (hasdim7 && baseType === "dim") {
          name += "dim7";
      } else {
          if (baseType === "m") name += "m";
          else if (baseType === "dim") name += "dim";
          else if (baseType === "sus4") name += "sus4";
          else if (baseType === "sus2") name += "sus2";
          else if (baseType === "5") name += "5";
          else if (baseType === "no5m") name += "m"; 
      }

      const has7th = (hasm7 || hasM7 || (hasdim7 && baseType === "dim"));

      if (ints.has(2) && baseType !== "sus2") {
          if (has7th) name = name.replace("7", "9"); 
          else name += "(add9)";
      }
      if (ints.has(5) && baseType !== "sus4") {
           name += "(add11)"; 
      }
      if (ints.has(9) && !hasm7 && !hasM7 && !name.includes("dim7")) {
          if (has7th) name = name.replace("7", "13");
          else {
              if (baseType === "Maj" || baseType === "no5Maj") name += "6"; 
              else if (baseType === "m" || baseType === "no5m") name += "6"; 
              else name += "(add13)";
          }
      }

      if (baseType === "no5Maj" || baseType === "no5m") name += "(no5)";

      candidates.push({ root: rVal, name });
    }

    // Ranking
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        if (hintRoot !== null) {
            if (a.root === hintRoot && b.root !== hintRoot) return -1;
            if (b.root === hintRoot && a.root !== hintRoot) return 1;
        }
        const keyVal = getNoteVal(keyRoot);
        if (a.root === keyVal && b.root !== keyVal) return -1;
        if (b.root === keyVal && a.root !== keyVal) return 1;
        const aIn = currentKeyNotes.includes(a.root);
        const bIn = currentKeyNotes.includes(b.root);
        if (aIn && !bIn) return -1;
        if (bIn && !aIn) return 1;
        return a.name.length - b.name.length;
      });

      const best = candidates[0];
      const others = candidates.slice(1).map(c => c.name);
      return { 
        main: best.name, 
        sub: others.length ? "Or: " + others.join(" / ") : "Exact Match",
        notes: "Notes: " + noteNames.join(" - ")
      };
    }

    return { main: '?', sub: 'Unknown Shape', notes: "Notes: " + noteNames.join(" - ") };

  }, [activeNotes, hintRoot, keyRoot, keyType, currentKeyNotes]);


  // === MIDI HANDLING ===
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let midiAccess: any = null;

    const onMIDIMessage = (event: any) => {
      const data = event.data;
      if (!data) return;
      const cmd = data[0] & 0xf0;
      const note = data[1];
      const velocity = data[2];
      const noteVal = note % 12;

      if (cmd === 144 && velocity > 0) {
        // Note On
        setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() }); // Clear sidebar selection
        setActiveNotes(prev => [...prev, noteVal]);
      } else if (cmd === 128 || (cmd === 144 && velocity === 0)) {
        // Note Off
        setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() }); // Clear sidebar selection
        setActiveNotes(prev => prev.filter(n => n !== noteVal));
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
    return () => {
       // Cleanup if needed, though inputs usually persist
    };
  }, []);


  // === HANDLERS ===
  const resetAll = () => {
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() });
    setHintRoot(null);
    setActiveNotes([]);
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

  const handleHoleClick = (degIndex: number) => {
    // Determine note val from degree
    const noteVal = currentKeyNotes[degIndex];
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() }); // Clear sidebar
    
    // Toggle logic
    setActiveNotes(prev => {
       const exists = prev.includes(noteVal);
       const newNotes = exists 
         ? prev.filter(n => n !== noteVal)
         : [...prev, noteVal];
       
       // Update hint root if adding first note
       if (!exists && newNotes.length === 1) {
         setHintRoot(noteVal);
       }
       return newNotes;
    });
  };

  // Auto-resize visualizer for mobile
  useEffect(() => {
    const handleResize = () => {
       const h = window.innerHeight;
       if (h < 700) setScaleFactor(0.8);
       else if (h < 900) setScaleFactor(0.9);
       else setScaleFactor(1);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-[#f5f7fa] text-[#2b2d42] font-sans">
      
      {/* Styles for complex shapes */}
      <style>{`
        .khaen-body {
          border-radius: 50% 50% 40% 40% / 15% 15% 10% 10%;
        }
        .text-shadow {
           text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>

      {/* --- LEFT SIDEBAR --- */}
      <div className="w-[340px] bg-white border-r border-[#e9ecef] flex flex-col z-10 shadow-[4px_0_20px_rgba(0,0,0,0.03)] shrink-0">
        
        {/* 1. Key / Mode */}
        <div className="p-5 border-b border-[#e9ecef] bg-white">
          <div className="text-[11px] font-extrabold text-[#adb5bd] uppercase mb-2.5 tracking-wider">1. Key / 调式设定</div>
          <div className="flex gap-2.5">
            <select 
              value={keyRoot} 
              onChange={(e) => { setKeyRoot(e.target.value); resetAll(); }}
              className="flex-1 p-2 border border-[#ced4da] rounded-md text-sm bg-white text-[#495057] focus:outline-none focus:border-[#2b2d42]"
            >
              {['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'].map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <select 
              value={keyType}
              onChange={(e) => { setKeyType(e.target.value as ScaleType); resetAll(); }}
              className="flex-1 p-2 border border-[#ced4da] rounded-md text-sm bg-white text-[#495057] focus:outline-none focus:border-[#2b2d42]"
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
            </select>
          </div>
        </div>

        {/* Scroll Area */}
        <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
          
          {/* 2. Modifiers */}
          <div className="pt-5 px-5 pb-4 border-b border-[#e9ecef]">
            <div className="text-[11px] font-extrabold text-[#adb5bd] uppercase mb-2.5 tracking-wider">2. Modifiers / 修饰</div>
            <div className="grid grid-cols-3 gap-2">
              {(['add9', 'add11', 'add13', 'add6', 'no3', 'no5', 'sus4', 'sus2'] as Modifier[]).map(mod => {
                 const isActive = selection.modifiers.has(mod);
                 return (
                   <button
                     key={mod}
                     onClick={() => toggleMod(mod)}
                     className={`text-[13px] py-2 border rounded-md font-medium transition-all ${
                       isActive 
                         ? 'bg-[#2b2d42] text-white border-[#2b2d42]' 
                         : 'bg-[#f8f9fa] border-[#dee2e6] text-[#6c757d] hover:bg-[#e9ecef]'
                     }`}
                   >
                     {mod.startsWith('no') ? '- ' : (mod.startsWith('sus') ? '' : '+ ')}{mod}
                   </button>
                 );
              })}
            </div>
          </div>

          {/* 3. Chords */}
          <div className="pt-5 px-5">
            <div className="text-[11px] font-extrabold text-[#adb5bd] uppercase mb-2.5 tracking-wider">3. Chords / 基础和弦</div>
            <div className="flex flex-col gap-4">
              {currentKeyNotes.map((rootVal, i) => {
                 const noteName = getDisplayNote(rootVal, keyRoot, keyType);
                 const quality = SCALES[keyType].qualities[i];
                 const roman = ROMANS[i];
                 
                 // Triad Name
                 const triName = noteName + (quality==='m'?'m' : (quality==='dim'?'dim' : ''));
                 
                 // Seventh Name Logic matching HTML
                 let suffix = '7';
                 if (quality === 'Maj') suffix = 'maj7';
                 else if (quality === 'm') suffix = 'm7';
                 else if (quality === 'dim') suffix = 'm7b5';

                 // Exceptions from HTML logic
                 if (keyType === 'major') {
                    if (i === 4) suffix = '7';
                    if (i === 6) suffix = 'm7b5';
                 } else {
                    if (i === 1) suffix = 'm7b5';
                    if (i === 2) suffix = 'maj7';
                    if (i === 4) suffix = 'm7';
                    if (i === 6) suffix = '7';
                 }
                 const sevName = noteName + suffix;

                 const isTriadActive = selection.rootVal === rootVal && selection.type === 'triad';
                 const isSeventhActive = selection.rootVal === rootVal && selection.type === '7th';

                 return (
                   <div key={i} className="px-0">
                     <div className="flex justify-between items-center mb-2 text-[13px] font-bold text-[#343a40]">
                        <span><span className="text-[#d90429] font-black mr-1.5">{roman}</span>{quality}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => selectChord(rootVal, quality, 'triad', isTriadActive)}
                          className={`py-3 border rounded-lg text-[15px] font-semibold transition-all shadow-sm ${
                            isTriadActive
                              ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-[0_4px_10px_rgba(43,45,66,0.3)]'
                              : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-[1px]'
                          }`}
                        >
                          {triName}
                        </button>
                        <button
                           onClick={() => selectChord(rootVal, quality, '7th', isSeventhActive)}
                           className={`py-3 border rounded-lg text-[15px] font-semibold transition-all shadow-sm ${
                            isSeventhActive
                              ? 'bg-[#2b2d42] text-white border-[#2b2d42] shadow-[0_4px_10px_rgba(43,45,66,0.3)]'
                              : 'bg-white border-[#dee2e6] text-[#495057] hover:border-[#adb5bd] hover:-translate-y-[1px]'
                          }`}
                        >
                          {sevName}
                        </button>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN PANEL --- */}
      <div className="flex-1 flex flex-col items-center p-8 relative h-full overflow-y-auto bg-[#f5f7fa]">
        
        {/* Info Panel */}
        <div className="bg-white p-5 w-[480px] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] mb-8 text-center shrink-0 border border-white">
          <div className="text-[42px] font-black text-[#d90429] leading-tight mb-1 min-h-[46px]">
            {analyzedChord.main}
          </div>
          <div className="text-sm text-[#868e96] font-medium h-5 mb-3">
             {analyzedChord.sub}
          </div>
          <span className="font-mono bg-[#f8f9fa] px-3 py-1 rounded text-[13px] text-[#495057] font-semibold inline-block">
             {analyzedChord.notes}
          </span>
          <div className={`text-[10px] mt-2 uppercase tracking-widest font-bold ${midiConnected ? 'text-[#d90429]' : 'text-[#aaa]'}`}>
             {midiConnected ? '● MIDI Connected' : 'MIDI Device: Scanning...'}
          </div>
          <div className="mt-4">
             <button 
               onClick={resetAll}
               className="px-5 py-2 bg-[#2b2d42] text-white border-none rounded-md cursor-pointer text-xs font-bold hover:bg-[#1a1c2e] transition-colors"
             >
               RESET GRAPH
             </button>
          </div>
        </div>

        {/* Visualizer Container */}
        <div 
           className="relative pb-12 transition-transform duration-200"
           style={{ transform: `scale(${scaleFactor})`, transformOrigin: 'top center' }}
        >
           {/* Labels */}
           <div className="absolute top-[75px] -left-[45px] text-sm font-bold text-[#2b2d42]">L5</div>
           <div className="absolute top-[300px] -left-[45px] text-sm font-bold text-[#2b2d42]">L2-4</div>
           <div className="absolute -bottom-[30px] -left-[45px] text-sm font-bold text-[#2b2d42]">L1</div>

           <div className="absolute top-[75px] -right-[45px] text-sm font-bold text-[#2b2d42]">R5</div>
           <div className="absolute top-[300px] -right-[45px] text-sm font-bold text-[#2b2d42]">R2-4</div>
           <div className="absolute -bottom-[30px] -right-[45px] text-sm font-bold text-[#2b2d42]">R1</div>

           {/* Group Box Dashed */}
           <div className="absolute top-[145px] w-[220px] h-[380px] left-1/2 -translate-x-1/2 border-2 border-dashed border-[#e9ecef] -z-20 rounded-xl" />

           {/* Instrument Body */}
           <div className="khaen-body relative w-[180px] h-[680px] bg-white border-[4px] border-[#2b2d42] flex justify-between p-[60px_25px_80px_25px] box-border shadow-[0_25px_50px_rgba(0,0,0,0.1)]">
              
              {/* Mouthpiece */}
              <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 w-[60px] h-[25px] border-[4px] border-b-0 border-[#2b2d42] bg-white -z-10 rounded-t-sm" />

              {/* Left Column */}
              <div className="flex flex-col justify-between h-full w-[50px] items-center">
                 {LEFT_COL.map(hole => {
                    const noteVal = currentKeyNotes[hole.degIndex];
                    const isActive = activeNotes.includes(noteVal);
                    const noteName = getDisplayNote(noteVal, keyRoot, keyType);

                    return (
                      <div 
                        key={hole.id}
                        onClick={() => handleHoleClick(hole.degIndex)}
                        className={`w-[46px] h-[46px] border-[2px] rounded-full flex justify-center items-center cursor-pointer relative transition-transform duration-100 hover:scale-110 hover:bg-gray-50
                          ${isActive 
                             ? 'border-[#d90429] bg-[#ffe3e3] shadow-[0_0_15px_rgba(217,4,41,0.3)]' 
                             : 'border-[#2b2d42] bg-white'
                          }`}
                      >
                         <div className="pointer-events-none text-center leading-none">
                            <span 
                              className={`block font-extrabold text-[20px] transition-colors
                                ${isActive ? '!text-[#d90429]' : ''}
                                ${!isActive && hole.colorClass === 'num-blue' ? 'text-[#0077b6]' : ''}
                                ${!isActive && hole.colorClass === 'num-green' ? 'text-[#2a9d8f]' : ''}
                                ${!isActive && hole.colorClass === 'num' ? 'text-[#2b2d42]' : ''}
                              `}
                            >
                              {hole.label}
                            </span>
                            <span className={`block text-[10px] font-bold mt-[-2px] ${isActive ? 'text-[#d90429]' : 'text-[#adb5bd]'}`}>
                              {noteName}
                            </span>
                         </div>
                      </div>
                    );
                 })}
              </div>

              {/* Right Column */}
              <div className="flex flex-col justify-between h-full w-[50px] items-center">
                 {RIGHT_COL.map(hole => {
                    const noteVal = currentKeyNotes[hole.degIndex];
                    const isActive = activeNotes.includes(noteVal);
                    const noteName = getDisplayNote(noteVal, keyRoot, keyType);

                    return (
                      <div 
                        key={hole.id}
                        onClick={() => handleHoleClick(hole.degIndex)}
                        className={`w-[46px] h-[46px] border-[2px] rounded-full flex justify-center items-center cursor-pointer relative transition-transform duration-100 hover:scale-110 hover:bg-gray-50
                          ${isActive 
                             ? 'border-[#d90429] bg-[#ffe3e3] shadow-[0_0_15px_rgba(217,4,41,0.3)]' 
                             : 'border-[#2b2d42] bg-white'
                          }`}
                      >
                         <div className="pointer-events-none text-center leading-none">
                            <span 
                              className={`block font-extrabold text-[20px] transition-colors
                                ${isActive ? '!text-[#d90429]' : ''}
                                ${!isActive && hole.colorClass === 'num-blue' ? 'text-[#0077b6]' : ''}
                                ${!isActive && hole.colorClass === 'num-green' ? 'text-[#2a9d8f]' : ''}
                                ${!isActive && hole.colorClass === 'num' ? 'text-[#2b2d42]' : ''}
                              `}
                            >
                              {hole.label}
                            </span>
                            <span className={`block text-[10px] font-bold mt-[-2px] ${isActive ? 'text-[#d90429]' : 'text-[#adb5bd]'}`}>
                              {noteName}
                            </span>
                         </div>
                      </div>
                    );
                 })}
              </div>

           </div>
           
           {/* Octave Button (Optional UI addition, logic simplified) */}
           <div className="absolute top-[50%] -right-32 hidden xl:block">
              <button 
                 onClick={() => { /* Toggle Octave Mode Logic Placeholder */ }}
                 className="flex flex-col items-center gap-2 p-3 text-[#adb5bd] hover:text-[#2b2d42] transition-colors"
              >
                 <Layers size={24} />
                 <span className="text-xs font-bold uppercase tracking-widest">Octave</span>
              </button>
           </div>

        </div>
      </div>
    </div>
  );
}