import { useState, useEffect, useMemo, useRef } from 'react';
import { KHAEN_16_PIPES } from './domain/instruments/khaen16';
import { buildDiatonicChordChoices } from './domain/theory/chords';
import { analyzeChord } from './domain/theory/analyzeChord';
import { alternatePipesForPitchClasses, pipePitchClass, primaryPipesForChord, selectedPipePitchClasses } from './domain/khaenMapping';
import type { ChordModifier, ChordQuality, KeyRoot, PitchClass, ScaleType } from './domain/theory/types';
import { SidebarToggle } from './components/SidebarToggle';
import { AnalysisPanel } from './components/AnalysisPanel';
import { ChordSelector } from './components/ChordSelector';
import { SettingsPanel, type UiModifier, type UiScaleType } from './components/SettingsPanel';
import { KhaenDiagram } from './components/KhaenDiagram';
import { useMidiInput } from './midi/useMidiInput';

// === CONSTANTS & TYPES ===

interface ChordSelection {
  rootVal: number | null;
  quality: string | null;
  type: 'triad' | '7th' | null;
  modifiers: Set<UiModifier>;
}

// Includes side labels and the mouthpiece extending beyond the 180×728 drawing box.
const KHAEN_FIT_BOUNDS = { width: 270, height: 753 };

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
  const [scaleFactor, setScaleFactor] = useState(1);
  const diagramViewportRef = useRef<HTMLDivElement>(null);

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

  }, [selection, keyRoot, keyType]);

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
  }, [activeNoteValues, hintRoot, keyRoot, keyType]);


  const midiStatus = useMidiInput(({ pitchClass, active }) => {
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() });
    setActiveHoleIds(previous => {
      const next = new Set(previous);
      KHAEN_16_PIPES.forEach(pipe => {
        if (pipePitchClass(pipe, keyRoot, keyType === 'minor' ? 'natural-minor' : 'major') === pitchClass) {
          if (active) next.add(pipe.id);
          else next.delete(pipe.id);
        }
      });
      return next;
    });
  });


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

  const handleHoleClick = (holeId: string) => {
    setSelection({ rootVal: null, quality: null, type: null, modifiers: new Set() }); 
    const pipe = KHAEN_16_PIPES.find(candidate => candidate.id === holeId);
    if (!pipe) return;
    const noteVal = pipePitchClass(pipe, keyRoot, keyType === 'minor' ? 'natural-minor' : 'major');

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
       
       // USER REQUEST: Auto-hide sidebar if mobile/tablet in portrait mode
       const isPortrait = h > w;
       const isCompactScreen = w <= 1024 && (isPortrait || h <= 520);
       if (isCompactScreen) {
          setSidebarVisible(false);
       }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const viewport = diagramViewportRef.current;
    if (!viewport) return;

    const updateScale = (width: number, height: number) => {
      const scale = Math.max(0, Math.min(1, width / KHAEN_FIT_BOUNDS.width, height / KHAEN_FIT_BOUNDS.height));
      setScaleFactor(previous => Math.abs(previous - scale) < 0.001 ? previous : scale);
    };

    if (typeof ResizeObserver === 'undefined') {
      const updateFromWindow = () => updateScale(viewport.clientWidth || window.innerWidth, viewport.clientHeight || window.innerHeight);
      window.addEventListener('resize', updateFromWindow);
      updateFromWindow();
      return () => window.removeEventListener('resize', updateFromWindow);
    }

    const observer = new ResizeObserver(entries => {
      const size = entries[0]?.contentRect;
      if (size) updateScale(size.width, size.height);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex w-screen h-[100dvh] min-h-0 overflow-hidden bg-[#f5f7fa] text-[#2b2d42] font-sans relative">

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
      <div className={`responsive-workspace flex-1 min-w-0 min-h-0 p-[clamp(0.5rem,2vmin,2rem)] relative overflow-hidden ${sidebarVisible ? '' : 'sidebar-collapsed-workspace'}`}>
        <div className="workspace-layout h-full w-full flex flex-col items-center">
          <AnalysisPanel
            {...analyzedChord}
            midiStatus={midiStatus}
            octaveExpanded={octaveExpanded}
            onReset={resetAll}
            onToggleOctave={() => setOctaveExpanded(!octaveExpanded)}
          />

          <div ref={diagramViewportRef} className="diagram-fit-slot w-full min-w-0 min-h-0 flex-1">
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
      </div>
    </div>
  );
}
