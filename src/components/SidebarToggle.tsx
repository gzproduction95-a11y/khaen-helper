import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarToggleProps {
  readonly visible: boolean;
  readonly onToggle: () => void;
}

export function SidebarToggle({ visible, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`absolute top-8 z-50 p-2 bg-white border border-[#e9ecef] rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${visible ? 'left-[324px]' : 'left-4'}`}
      title={visible ? 'Hide Sidebar' : 'Show Sidebar'}
    >
      {visible ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );
}
