import { useState, useEffect, useMemo } from 'react';
import { KHAEN_16_PIPES } from './domain/instruments/khaen16';
import { buildScale } from './domain/theory/scales';
import { buildDiatonicChordChoices } from './domain/theory/chords';
import { analyzeChord } from './domain/theory/analyzeChord';
import { alternatePipesForPitchClasses, primaryPipesForChord, selectedPipePitchClasses } from './domain/khaenMapping';
import type { ChordModifier, ChordQuality, KeyRoot, PitchClass, ScaleType } from './domain/theory/types';
import { SidebarToggle } from './components/SidebarToggle';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ChordSelector } from './components/ChordSelector';
import { SettingsPanel, type UiModifier, type UiScaleType } from './components/SettingsPanel';
import { KhaenDiagram } from './components/KhaenDiagram';

// === CONSTANTS & TYPES ===

interface ChordSelection {
  rootVal: number | null;
  quality: string | null;
  type: 'triad' | '7th' | null;
  modifiers: Set<UiModifier>;
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
  const chordChoices = useMemo(() => buildDiatonicChordChoices(keyRoot, keyType === 'minor' ? 'natural-minor' : 'major'), [keyRoot, keyType]);

  // Derived State: Active Note Values for Analysis
  const activeNoteValues = useMemo(() => {
    return selectedPipePitchClasses([...activeHoleIds], keyRoot, keyType === 'minor' ? 'natural-minor' : 'major');
  }, [activeHoleIds, keyRoot, keyType]);

  const octavePipeIds = useMemo(() => new Set(alternatePipesForPitchClasses(
    activeNoteValues, keyRoot, keyType === 'minor' ? 'natural-minor' : 'major',
  )), [activeNoteValues, keyRoot, keyType]);

  // === LOGIC: Compute Active Holes from Selection ===
  useEffect(() => {
    if (selection.rootVal === null || selection.quality === null) {
      return;
    }

    const root = selection.rootVal;
    const quality: ChordQuality = selection.quality === 'Maj' ? 'major' : selection.quality === 'm' ? 'minor' : 'diminished';
    const modifiers = new Set([...selection.modifiers].map(mod => (mod === 'dim_mod' ? 'dim' : mod) as ChordModifier));
    const pipeIds = primaryPipesForChord({
      keyRoot,
      scaleType: keyType === 'minor' ? 'natural-minor' : 'major',
      chord: {
      root: root as PitchClass,
      quality,
      type: selection.type === '7th' ? 'seventh' : 'triad',
      modifiers,
      },
    });
    
    // Default selection: only 'num' holes
    const newHoleIds = new Set(pipeIds);

    setActiveHoleIds(newHoleIds);
    setHintRoot(root);

  }, [selection, currentKeyNotes, keyRoot, keyType]);

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

  const toggleMod = (mod: UiModifier) => {
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
      <SidebarToggle visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      {/* --- LEFT SIDEBAR --- */}
      <SettingsPanel
        visible={sidebarVisible}
        keyRoot={keyRoot}
        scaleType={keyType}
        selectedModifiers={selection.modifiers}
        onKeyRootChange={root => { setKeyRoot(root); resetAll(); }}
        onScaleTypeChange={type => { setKeyType(type); resetAll(); }}
        onToggleModifier={toggleMod}
      >
        <ChordSelector
          choices={chordChoices}
          selectedRoot={selection.rootVal}
          selectedQuality={selection.quality}
          selectedType={selection.type}
          onSelect={selectChord}
        />
      </SettingsPanel>

      {/* --- RIGHT MAIN PANEL --- */}
      <div className="flex-1 flex flex-col items-center p-8 relative h-full overflow-y-auto">
        
        <AnalysisPanel
          {...analyzedChord}
          midiConnected={midiConnected}
          octaveExpanded={octaveExpanded}
          onReset={resetAll}
          onToggleOctave={() => setOctaveExpanded(!octaveExpanded)}
        />

        <KhaenDiagram
          keyRoot={keyRoot}
          scaleType={keyType === 'minor' ? 'natural-minor' : 'major'}
          activePipeIds={activeHoleIds}
          octavePipeIds={octavePipeIds}
          octaveExpanded={octaveExpanded}
          scaleFactor={scaleFactor}
          onPipeToggle={handleHoleClick}
        />
      </div>
    </div>
  );
}
