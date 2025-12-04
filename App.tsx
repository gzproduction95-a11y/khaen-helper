import { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, Music, Info, RotateCcw, Piano, Zap, Menu, X, ChevronRight } from 'lucide-react';

// --- Types & Constants ---

type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
type KeyMode = 'Major' | 'Minor';
type TextColor = 'black' | 'red' | 'green';

interface HoleDefinition {
  id: string;
  side: 'left' | 'right';
  row: number; // 1 is bottom
  label: string; // The fixed scale degree label (1-7)
  color: TextColor;
  baseNoteOffset: number; // Semitones from A3 (Low A = 0) in standard Am tuning
  // A3=0, B3=2, C4=3, D4=5, E4=7, F4=8, G4=10, A4=12, B4=14, C5=15, D5=17...
}

// Standard Khaen 16 Layout (Approximated based on prompt & physical instrument)
// Base Tuning: A Minor (Relative to C Major).
// Reference: A3 = 220Hz (MIDI 57). We treat A3 as offset 0.
const KHAEN_LAYOUT: HoleDefinition[] = [
  // --- Right Column (Bottom to Top) ---
  { id: 'R1', side: 'right', row: 1, label: '1', color: 'black', baseNoteOffset: 0 },   // A3 (Low)
  { id: 'R2', side: 'right', row: 2, label: '3', color: 'black', baseNoteOffset: 3 },   // C4
  { id: 'R3', side: 'right', row: 3, label: '2', color: 'black', baseNoteOffset: 2 },   // B3
  { id: 'R4', side: 'right', row: 4, label: '4', color: 'red',   baseNoteOffset: 17 },  // D5 (High) - Prompt specified Red
  { id: 'R5', side: 'right', row: 5, label: '5', color: 'red',   baseNoteOffset: 19 },  // E5 (High) - Prompt specified Red
  { id: 'R6', side: 'right', row: 6, label: '6', color: 'red',   baseNoteOffset: 20 },  // F5 (High)
  { id: 'R7', side: 'right', row: 7, label: '7', color: 'red',   baseNoteOffset: 22 },  // G5 (High)
  { id: 'R8', side: 'right', row: 8, label: '1', color: 'green', baseNoteOffset: 24 },  // A5 (Highest)

  // --- Left Column (Bottom to Top) ---
  { id: 'L1', side: 'left', row: 1, label: '4', color: 'black', baseNoteOffset: 5 },    // D4
  { id: 'L2', side: 'left', row: 2, label: '5', color: 'black', baseNoteOffset: 7 },    // E4
  { id: 'L3', side: 'left', row: 3, label: '6', color: 'black', baseNoteOffset: 8 },    // F4
  { id: 'L4', side: 'left', row: 4, label: '7', color: 'black', baseNoteOffset: 10 },   // G4
  { id: 'L5', side: 'left', row: 5, label: '1', color: 'green', baseNoteOffset: 24 },   // A5 (Highest - Prompt specified Green L5)
  { id: 'L6', side: 'left', row: 6, label: '3', color: 'red',   baseNoteOffset: 15 },   // C5
  { id: 'L7', side: 'left', row: 7, label: '2', color: 'red',   baseNoteOffset: 14 },   // B4
  { id: 'L8', side: 'left', row: 8, label: '1', color: 'red',   baseNoteOffset: 12 },   // A4 (High)
];

const NOTES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Minor Scale Intervals: W H W W H W W (2, 1, 2, 2, 1, 2, 2)
// Major Scale Intervals: W W H W W W H (2, 2, 1, 2, 2, 2, 1)
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

// --- Helper Functions ---

const getNoteIndex = (note: NoteName) => NOTES.indexOf(note);

const getNoteFromMidi = (midi: number): { note: NoteName, octave: number } => {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { note: NOTES[noteIndex], octave };
};

const getMidiFromNote = (note: NoteName, octave: number) => {
  return (octave + 1) * 12 + NOTES.indexOf(note);
};

// Returns the Root of the Relative Minor
const getRelativeMinorRoot = (majorRoot: NoteName): NoteName => {
  const idx = getNoteIndex(majorRoot);
  // Down 3 semitones (or up 9)
  return NOTES[(idx + 9) % 12];
};

const getRomanNumeral = (degree: number, quality: string) => {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  let r = romans[degree - 1];
  if (quality === 'm' || quality === 'dim') r = r.toLowerCase();
  if (quality === 'dim') r += '°';
  return r;
};

// Generate Diatonic Chords for a key
const getDiatonicChords = (root: NoteName, mode: KeyMode) => {
  const rootIdx = NOTES.indexOf(root);
  const intervals = mode === 'Major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const scaleNotes = intervals.map(i => NOTES[(rootIdx + i) % 12]);
  
  // Triad stacking: 1-3-5 relative to scale degree
  const chords = scaleNotes.map((note, i) => {
    const third = scaleNotes[(i + 2) % 7];
    const fifth = scaleNotes[(i + 4) % 7];
    
    // Measure intervals to determine Major/Minor/Dim
    const distThird = (NOTES.indexOf(third) - NOTES.indexOf(note) + 12) % 12;
    const distFifth = (NOTES.indexOf(fifth) - NOTES.indexOf(note) + 12) % 12;

    let quality = '';
    if (distThird === 4 && distFifth === 7) quality = ''; // Major
    else if (distThird === 3 && distFifth === 7) quality = 'm'; // Minor
    else if (distThird === 3 && distFifth === 6) quality = 'dim'; // Diminished
    else if (distThird === 4 && distFifth === 8) quality = 'aug'; // Augmented

    return { root: note, quality, roman: getRomanNumeral(i + 1, quality) };
  });

  return chords;
};

// Chord Detection Logic
const detectChord = (activeNotes: number[], firstNote: number | null) => {
  if (activeNotes.length < 2) return null;
  
  // Sort and remove duplicates (octaves)
  const uniqueNotes = Array.from(new Set(activeNotes.map(n => n % 12))).sort((a, b) => a - b);
  
  if (uniqueNotes.length === 0) return null;

  // Try to find a match with the firstNote as root if possible
  let rootCandidates = uniqueNotes;
  if (firstNote !== null) {
    const firstNoteMod = firstNote % 12;
    // Prioritize the clicked note as root
    rootCandidates = [firstNoteMod, ...uniqueNotes.filter(n => n !== firstNoteMod)];
  }

  for (const root of rootCandidates) {
    const intervals = uniqueNotes.map(n => (n - root + 12) % 12).sort((a, b) => a - b);
    
    // Check patterns
    const isMajor = intervals.includes(4) && intervals.includes(7);
    const isMinor = intervals.includes(3) && intervals.includes(7);
    const isDim = intervals.includes(3) && intervals.includes(6);
    const isSus4 = intervals.includes(5) && intervals.includes(7) && !intervals.includes(3) && !intervals.includes(4);
    const isSus2 = intervals.includes(2) && intervals.includes(7) && !intervals.includes(3) && !intervals.includes(4);
    
    const rootName = NOTES[root];

    if (intervals.length === 2 && intervals.includes(7)) return `${rootName}5`; // Power chord
    if (isMajor) {
      if (intervals.includes(10) || intervals.includes(11)) return `${rootName}Maj7`;
      if (intervals.includes(10)) return `${rootName}7`;
      if (intervals.includes(2)) return `${rootName}add9`;
      return rootName;
    }
    if (isMinor) {
      if (intervals.includes(10)) return `${rootName}m7`;
      if (intervals.includes(2)) return `${rootName}m9`;
      return `${rootName}m`;
    }
    if (isDim) return `${rootName}dim`;
    if (isSus4) return `${rootName}sus4`;
    if (isSus2) return `${rootName}sus2`;
  }
  
  return null;
};


// --- Components ---

export default function App() {
  const [selectedRoot, setSelectedRoot] = useState<NoteName>('C');
  const [selectedMode, setSelectedMode] = useState<KeyMode>('Major');
  const [octaveMode, setOctaveMode] = useState(false);
  const [activeMidiNotes, setActiveMidiNotes] = useState<Set<number>>(new Set());
  const [firstClickedNote, setFirstClickedNote] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  // --- Logic Engine ---

  // 1. Calculate the "Working Minor Root"
  const workingMinorRoot = useMemo(() => {
    if (selectedMode === 'Minor') return selectedRoot;
    return getRelativeMinorRoot(selectedRoot);
  }, [selectedRoot, selectedMode]);

  const workingMinorRootIdx = useMemo(() => getNoteIndex(workingMinorRoot), [workingMinorRoot]);

  // 2. Map Holes to Actual MIDI Notes based on current Key
  // The Instrument is physically built in "A Minor" logic (relative to C Major).
  // A3 (Hole 1) corresponds to Degree 1 of the Minor Scale.
  // If we transpose to E Minor, Hole 1 should be E3 (or E4).
  // We calculate the shift from Standard A Minor (Root A) to Working Minor (Root X).
  const semitoneShift = useMemo(() => {
    let shift = workingMinorRootIdx - getNoteIndex('A');
    return shift;
  }, [workingMinorRootIdx]);

  const mappedHoles = useMemo(() => {
    return KHAEN_LAYOUT.map(hole => {
      // Base A3 is MIDI 57.
      const standardMidi = 57 + hole.baseNoteOffset;
      // Apply shift. 
      // Note: We might want to keep the instrument range somewhat centered. 
      // If shift is too high, maybe drop octave? For now, linear shift.
      const mappedMidi = standardMidi + semitoneShift;
      const { note, octave } = getNoteFromMidi(mappedMidi);
      return {
        ...hole,
        midiNumber: mappedMidi,
        noteName: note,
        octave: octave
      };
    });
  }, [semitoneShift]);

  // --- MIDI Handling ---

  useEffect(() => {
    if ((navigator as any).requestMIDIAccess) {
      (navigator as any).requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
    }
    function onMIDISuccess(midiAccess: any) {
      for (const input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage;
      }
    }
    function onMIDIFailure() {
      console.warn("Could not access your MIDI devices.");
    }
    function getMIDIMessage(message: any) {
      const command = message.data[0];
      const note = message.data[1];
      const velocity = (message.data.length > 2) ? message.data[2] : 0;

      if (command === 144 && velocity > 0) {
        handleNoteOn(note);
      } else if (command === 128 || (command === 144 && velocity === 0)) {
        handleNoteOff(note);
      }
    }
  }, [octaveMode]); // Re-bind if logic changes (though logic is largely in state setters)

  const handleNoteOn = useCallback((note: number) => {
    setActiveMidiNotes(prev => {
      const newSet = new Set(prev);
      newSet.add(note);
      return newSet;
    });
    setFirstClickedNote(prev => prev === null ? note : prev);
  }, []);

  const handleNoteOff = useCallback((note: number) => {
    setActiveMidiNotes(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
    setFirstClickedNote(prev => prev === note ? null : prev);
  }, []);

  // --- Interaction ---

  const handleHoleClick = (midi: number) => {
    // Toggle logic for mouse clicks
    if (activeMidiNotes.has(midi)) {
      handleNoteOff(midi);
      if (octaveMode) {
        // Find all octaves of this note in the mapped holes
        const noteName = getNoteFromMidi(midi).note;
        mappedHoles.forEach(h => {
          if (h.noteName === noteName) handleNoteOff(h.midiNumber);
        });
      }
    } else {
      handleNoteOn(midi);
      if (octaveMode) {
        const noteName = getNoteFromMidi(midi).note;
        mappedHoles.forEach(h => {
          if (h.noteName === noteName) handleNoteOn(h.midiNumber);
        });
      }
    }
  };

  const clearAll = () => {
    setActiveMidiNotes(new Set());
    setFirstClickedNote(null);
  };

  // --- Analysis Data ---

  const activeNoteArray = Array.from(activeMidiNotes);
  const detectedChord = useMemo(() => detectChord(activeNoteArray, firstClickedNote), [activeNoteArray, firstClickedNote]);
  
  const diatonicChords = useMemo(() => getDiatonicChords(selectedRoot, selectedMode), [selectedRoot, selectedMode]);

  // Handle chord preset click
  const playChord = (chordRoot: NoteName, quality: string) => {
    // Determine notes in chord
    const rootIdx = NOTES.indexOf(chordRoot);
    const intervals = quality.includes('dim') ? [0, 3, 6] : 
                      quality.includes('m') ? [0, 3, 7] : [0, 4, 7]; // Basic triad
    
    // Find mapped holes that match these notes
    const targetNotes = intervals.map(i => NOTES[(rootIdx + i) % 12]);
    
    const newActive = new Set<number>();
    mappedHoles.forEach(h => {
      if (targetNotes.includes(h.noteName)) {
        newActive.add(h.midiNumber);
      }
    });
    
    setActiveMidiNotes(newActive);
    setFirstClickedNote(getMidiFromNote(chordRoot, 4)); // Approximation
  };

  // --- Layout Helper ---
  
  // Detect mobile landscape
  useEffect(() => {
    const checkOrientation = () => {
      setIsMobileLandscape(window.innerWidth < 900 && window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // --- Rendering ---

  return (
    <div className={`h-screen w-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden ${isMobileLandscape ? 'landscape-mode' : ''}`}>
      
      {/* Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg hidden sm:block">Khaen Logic</h1>
          <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 border border-slate-700">
            {selectedRoot} {selectedMode} {selectedMode === 'Major' ? `(Rel: ${workingMinorRoot}m)` : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <div className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${detectedChord ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' : 'bg-slate-800 text-slate-500'}`}>
              {detectedChord || "No Chord"}
           </div>
           <button 
             onClick={() => setShowSidebar(!showSidebar)}
             className="p-2 md:hidden hover:bg-slate-800 rounded-lg transition-colors"
           >
             {showSidebar ? <X size={20} /> : <Menu size={20} />}
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar (Desktop: Static, Mobile: Drawer) */}
        <aside className={`
          absolute md:relative z-10 h-full w-80 bg-slate-900/95 md:bg-slate-900 border-r border-slate-800 backdrop-blur-md md:backdrop-blur-none transition-transform duration-300 ease-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col
        `}>
          <div className="p-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* Key Selection */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Settings size={14} /> Global Key
              </h3>
              <div className="grid grid-cols-4 gap-1 mb-2">
                {NOTES.map(note => (
                  <button
                    key={note}
                    onClick={() => setSelectedRoot(note)}
                    className={`text-xs py-1.5 rounded-md transition-all ${
                      selectedRoot === note 
                        ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/50' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
                {(['Major', 'Minor'] as KeyMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-all ${
                      selectedMode === mode
                        ? 'bg-slate-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </section>

            {/* Controls */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Settings size={14} /> Controls
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setOctaveMode(!octaveMode)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${
                    octaveMode 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <span className="flex items-center gap-2"><Zap size={14} /> Octave Mode</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${octaveMode ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${octaveMode ? 'left-4.5' : 'left-0.5'}`} style={{ left: octaveMode ? 'calc(100% - 14px)' : '2px' }} />
                  </div>
                </button>
                <button
                  onClick={clearAll}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/50 hover:text-rose-400 transition-colors"
                >
                  <RotateCcw size={14} /> Reset Instrument
                </button>
              </div>
            </section>

            {/* Diatonic Chords */}
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Piano size={14} /> Diatonic Chords
              </h3>
              <div className="space-y-1">
                {diatonicChords.map((chord, idx) => (
                  <button
                    key={idx}
                    onClick={() => playChord(chord.root, chord.quality)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm bg-slate-800/50 hover:bg-slate-700 text-left group border border-transparent hover:border-slate-600 transition-all"
                  >
                    <span className="font-mono text-slate-500 w-6 text-xs">{chord.roman}</span>
                    <span className="font-semibold text-slate-200 flex-1">{chord.root}{chord.quality}</span>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Visualizer Area */}
        <main className="flex-1 relative bg-slate-900 flex items-center justify-center p-4">
          {/* Background Grid/Design */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 rounded-full blur-[120px]" />
          </div>

          <div 
            className="relative z-0 transition-transform duration-300 ease-out"
            style={{ 
              transform: isMobileLandscape ? 'scale(0.65)' : 'scale(1)',
              transformOrigin: 'center center'
            }}
          >
            {/* Instrument Container */}
            <div className="flex gap-8 md:gap-16 items-end relative">
              
              {/* Left Pipe Column */}
              <div className="flex flex-col-reverse gap-3 items-center">
                {mappedHoles.filter(h => h.side === 'left').map((hole) => {
                  const isActive = activeMidiNotes.has(hole.midiNumber);
                  const isHigh = hole.color !== 'black';
                  
                  return (
                    <div 
                      key={hole.id} 
                      onClick={() => handleHoleClick(hole.midiNumber)}
                      className="group relative cursor-pointer select-none"
                    >
                      {/* Pipe Body */}
                      <div className={`
                        w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-out shadow-lg
                        ${isActive 
                          ? 'bg-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.6)] scale-110 border-4 border-white' 
                          : 'bg-slate-100 border-4 border-slate-300 hover:border-slate-400 hover:bg-white'}
                      `}>
                        {/* Number Label */}
                        <span className={`
                          text-2xl md:text-3xl font-bold font-mono
                          ${isActive 
                            ? (hole.color === 'black' ? 'text-rose-600' : 'text-rose-700') 
                            : (hole.color === 'red' ? 'text-red-600' : hole.color === 'green' ? 'text-green-600' : 'text-slate-900')}
                        `}>
                          {hole.label}
                        </span>

                        {/* Dashed Indicator for High Octaves when inactive */}
                        {!isActive && isHigh && (
                          <div className={`absolute inset-0 rounded-full border-2 border-dashed opacity-40 ${hole.color === 'green' ? 'border-green-500' : 'border-red-500'}`} />
                        )}
                      </div>

                      {/* Note Tooltip (Always visible or on hover) */}
                      <div className={`
                        absolute right-full mr-4 top-1/2 -translate-y-1/2
                        px-2 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono font-bold whitespace-nowrap
                        transition-all duration-200 border border-slate-700
                        ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}
                      `}>
                        {hole.noteName}{hole.octave}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center decoration / Bamboo binding representation */}
              <div className="absolute left-1/2 -translate-x-1/2 top-10 bottom-10 w-24 md:w-32 bg-amber-900/10 border-x-2 border-amber-900/20 rounded-lg -z-10 flex flex-col justify-between py-8">
                 <div className="w-full h-2 bg-amber-900/20" />
                 <div className="w-full h-2 bg-amber-900/20" />
                 <div className="w-full h-2 bg-amber-900/20" />
              </div>


              {/* Right Pipe Column */}
              <div className="flex flex-col-reverse gap-3 items-center">
                {mappedHoles.filter(h => h.side === 'right').map((hole) => {
                  const isActive = activeMidiNotes.has(hole.midiNumber);
                  const isHigh = hole.color !== 'black';

                  return (
                    <div 
                      key={hole.id} 
                      onClick={() => handleHoleClick(hole.midiNumber)}
                      className="group relative cursor-pointer select-none"
                    >
                      {/* Pipe Body */}
                      <div className={`
                        w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                        transition-all duration-200 ease-out shadow-lg
                        ${isActive 
                          ? 'bg-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.6)] scale-110 border-4 border-white' 
                          : 'bg-slate-100 border-4 border-slate-300 hover:border-slate-400 hover:bg-white'}
                      `}>
                        <span className={`
                          text-2xl md:text-3xl font-bold font-mono
                          ${isActive 
                            ? (hole.color === 'black' ? 'text-rose-600' : 'text-rose-700') 
                            : (hole.color === 'red' ? 'text-red-600' : hole.color === 'green' ? 'text-green-600' : 'text-slate-900')}
                        `}>
                          {hole.label}
                        </span>

                        {!isActive && isHigh && (
                          <div className={`absolute inset-0 rounded-full border-2 border-dashed opacity-40 ${hole.color === 'green' ? 'border-green-500' : 'border-red-500'}`} />
                        )}
                      </div>

                       {/* Note Tooltip */}
                       <div className={`
                        absolute left-full ml-4 top-1/2 -translate-y-1/2
                        px-2 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono font-bold whitespace-nowrap
                        transition-all duration-200 border border-slate-700
                        ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}
                      `}>
                        {hole.noteName}{hole.octave}
                      </div>
                    </div>
                  );
                })}
              </div>
              
            </div>
            
            <div className="text-center mt-8 text-slate-500 text-sm font-medium tracking-widest uppercase opacity-50">
              Mouthpiece
            </div>

          </div>
        </main>
        
        {/* Info Panel (Right side - Desktop only or Toggle) */}
        <div className="hidden lg:block w-72 bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
          <div className="space-y-6">
            <section>
              <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Info size={16} className="text-indigo-400" /> Active Notes
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeNoteArray.length === 0 ? (
                  <span className="text-xs text-slate-600 italic">No notes active</span>
                ) : (
                  activeNoteArray.sort((a,b) => a-b).map(midi => {
                    const {note, octave} = getNoteFromMidi(midi);
                    return (
                      <span key={midi} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-indigo-300">
                        {note}{octave}
                      </span>
                    )
                  })
                )}
              </div>
            </section>
            
            <section>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Instrument Logic</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                The Khaen is fundamentally a Minor instrument. 
                Currently in <strong className="text-slate-300">{selectedRoot} {selectedMode}</strong>. 
                Internally mapped to <strong className="text-slate-300">{workingMinorRoot} Minor</strong>.
              </p>
              <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-xs space-y-1 border border-slate-800">
                 <div className="flex justify-between">
                   <span className="text-slate-500">Scale Degree 1:</span>
                   <span className="text-indigo-300 font-mono">{workingMinorRoot}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-slate-500">Hole 1 Plays:</span>
                   <span className="text-indigo-300 font-mono">
                     {mappedHoles.find(h => h.id === 'R1')?.noteName}
                   </span>
                 </div>
              </div>
            </section>

             <section>
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Legend</h4>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-900">1</div>
                  <span>Standard Octave (Black)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-red-600">1</div>
                  <span>High Octave (Red)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-green-600">1</div>
                  <span>Highest Octave (Green)</span>
                </div>
              </div>
            </section>
          </div>
        </div>

      </div>
    </div>
  );
}