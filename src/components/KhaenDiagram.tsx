import { LEFT_PIPES, RIGHT_PIPES } from '../domain/instruments/khaen16';
import { displayNote } from '../domain/theory/notes';
import { pipeDisplayDegree, pipePitchClass } from '../domain/khaenMapping';
import type { KeyRoot, ScaleType } from '../domain/theory/types';

const TOP_BRACKET_OVERHANG = 25;

export interface KhaenDiagramProps {
  readonly keyRoot: KeyRoot;
  readonly scaleType: ScaleType;
  readonly activePipeIds: ReadonlySet<string>;
  readonly octavePipeIds: ReadonlySet<string>;
  readonly octaveExpanded: boolean;
  readonly scaleFactor: number;
  readonly onPipeToggle: (pipeId: string) => void;
}

export function KhaenDiagram({ keyRoot, scaleType, activePipeIds, octavePipeIds, octaveExpanded, scaleFactor, onPipeToggle }: KhaenDiagramProps) {
  const renderPipes = (pipes: typeof LEFT_PIPES) => pipes.map(pipe => {
    const isActive = activePipeIds.has(pipe.id);
    const isOctaveActive = !isActive && octaveExpanded && octavePipeIds.has(pipe.id);
    const pitchClass = pipePitchClass(pipe, keyRoot, scaleType);
    const noteName = displayNote(pitchClass, keyRoot, scaleType);
    const displayDegree = pipeDisplayDegree(pipe, keyRoot, scaleType);
    return (
      <div key={pipe.id} data-testid={`pipe-${pipe.id}`} data-active={isActive ? 'true' : 'false'} data-octave-active={isOctaveActive ? 'true' : 'false'}
        onClick={() => onPipeToggle(pipe.id)}
        className={`w-[46px] h-[46px] border-[2px] rounded-full flex justify-center items-center cursor-pointer relative transition-all duration-100 hover:scale-110 hover:bg-[#f8f9fa] ${isActive ? 'border-[#d90429] bg-[#ffe3e3] shadow-[0_0_15px_rgba(217,4,41,0.3)]' : isOctaveActive ? 'border-[#0077b6] bg-[#e0f2fe] shadow-[0_0_15px_rgba(0,119,182,0.3)]' : 'border-[#2b2d42] bg-white'}`}>
        <div className="pointer-events-none text-center leading-none">
          <span className={`font-extrabold text-[20px] transition-colors ${isActive ? '!text-[#d90429]' : isOctaveActive ? '!text-[#0077b6]' : ''} ${pipe.displayGroup === 'alternate' ? 'text-[#0077b6]' : pipe.displayGroup === 'top-tonic' ? 'text-[#2a9d8f]' : 'text-[#2b2d42]'}`}>{displayDegree}</span>
          <span className={`block text-[11px] font-bold -mt-0.5 ${isActive ? 'text-[#d90429]' : isOctaveActive ? 'text-[#0077b6]' : 'text-[#adb5bd]'}`}>{noteName}</span>
        </div>
      </div>
    );
  });

  return (
    <div className="khaen-diagram-scale relative pb-12 select-none" style={{ transform: `translateY(${TOP_BRACKET_OVERHANG * scaleFactor / 2}px) scale(${scaleFactor})`, transformOrigin: 'center center' }}>
      <div className="absolute top-[75px] -left-[45px] text-sm font-bold text-[#2b2d42]">L5</div>
      <div className="absolute top-[300px] -left-[45px] text-sm font-bold text-[#2b2d42]">L2-4</div>
      <div className="absolute -bottom-[30px] -left-[45px] text-sm font-bold text-[#2b2d42]">L1</div>
      <div className="absolute top-[75px] -right-[45px] text-sm font-bold text-[#2b2d42]">R5</div>
      <div className="absolute top-[300px] -right-[45px] text-sm font-bold text-[#2b2d42]">R2-4</div>
      <div className="absolute -bottom-[30px] -right-[45px] text-sm font-bold text-[#2b2d42]">R1</div>
      <div className="absolute top-[145px] w-[220px] h-[380px] left-1/2 -translate-x-1/2 border-2 border-dashed border-[#e9ecef] -z-20 rounded-xl"></div>
      <div className="khaen-body relative w-[180px] h-[680px] bg-white border-[4px] border-[#2b2d42] flex justify-between px-[25px] pt-[60px] pb-[80px] shadow-[0_25px_50px_rgba(0,0,0,0.1)] box-border">
        <div className="absolute -top-[25px] left-1/2 -translate-x-1/2 w-[60px] h-[25px] border-[4px] border-b-0 border-[#2b2d42] bg-white -z-10"></div>
        <div className="flex flex-col justify-between h-full w-[50px] items-center">{renderPipes(LEFT_PIPES)}</div>
        <div className="flex flex-col justify-between h-full w-[50px] items-center">{renderPipes(RIGHT_PIPES)}</div>
      </div>
    </div>
  );
}
