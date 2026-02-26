import { ChevronLeft, ChevronRight, MoveLeft, MoveRight, GripVertical, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { EmotionalResonanceMonitor } from './EmotionalResonanceMonitor';
import { BlindspotsWidget } from './BlindspotsWidget';
import { AlgoStatusWidget } from './AlgoStatusWidget';
import { AccountTrackerWidget } from './AccountTrackerWidget';


import { PanelPosition } from '../layout/DraggablePanel';

interface MissionControlPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  topStepXEnabled?: boolean;
  position?: PanelPosition;
  onPositionChange?: (position: PanelPosition) => void;
  onHide?: () => void;
}

export function MissionControlPanel({ 
  collapsed, 
  onToggleCollapse, 
  topStepXEnabled = false,
  position = 'right',
  onPositionChange,
  onHide
}: MissionControlPanelProps) {
  const [erScore, setErScore] = useState<number>(0);
  const [headerHovered, setHeaderHovered] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const peekTimerRef = useRef<number | null>(null);

  // Collapsed hover-peek: slide open on hover, close on leave
  const handleCollapsedEnter = useCallback(() => {
    if (!collapsed) return;
    if (peekTimerRef.current) { clearTimeout(peekTimerRef.current); peekTimerRef.current = null; }
    setPeekOpen(true);
  }, [collapsed]);

  const handleCollapsedLeave = useCallback(() => {
    if (!collapsed) return;
    peekTimerRef.current = window.setTimeout(() => setPeekOpen(false), 250);
  }, [collapsed]);

  // Close peek when permanently expanding
  const handleKeepExpanded = useCallback(() => {
    setPeekOpen(false);
    if (collapsed) onToggleCollapse();
  }, [collapsed, onToggleCollapse]);

  // Determine visual width
  const isVisuallyExpanded = !collapsed || peekOpen;
  const panelWidth = isVisuallyExpanded ? 'w-80' : 'w-3';

  return (
    <div
      className={`relative bg-[#050500] border-l border-[#D4AF37]/8 transition-all duration-200 ease-out ${panelWidth}`}
      onMouseEnter={handleCollapsedEnter}
      onMouseLeave={handleCollapsedLeave}
      style={{ minWidth: collapsed && !peekOpen ? '12px' : undefined }}
    >
      {/* Collapsed thin hover-trigger strip */}
      {collapsed && !peekOpen && (
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
          <div className="w-[2px] h-12 rounded-full bg-[#D4AF37]/20" />
        </div>
      )}

      {/* Full panel content — shown when expanded or peek-open */}
      <div className={`h-full flex flex-col transition-opacity duration-150 ${isVisuallyExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Header */}
        <div
          className="h-12 flex items-center justify-between px-3"
          onMouseEnter={() => setHeaderHovered(true)}
          onMouseLeave={() => setHeaderHovered(false)}
        >
          <h2 className="text-sm font-semibold text-[#D4AF37]">Mission Control</h2>

          <div className="flex items-center gap-1">
            {/* TopStepX controls */}
            {topStepXEnabled && onPositionChange && (
              <>
                {position === 'right' && (
                  <button
                    onClick={() => onPositionChange('left')}
                    className="p-1 hover:bg-[#D4AF37]/10 rounded text-[#D4AF37]/60 hover:text-[#D4AF37]"
                    title="Move Left"
                  >
                    <MoveLeft className="w-3.5 h-3.5" />
                  </button>
                )}
                {position === 'left' && (
                  <button
                    onClick={() => onPositionChange('right')}
                    className="p-1 hover:bg-[#D4AF37]/10 rounded text-[#D4AF37]/60 hover:text-[#D4AF37]"
                    title="Move Right"
                  >
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onPositionChange('floating')}
                  className="p-1 hover:bg-[#D4AF37]/10 rounded text-[#D4AF37]/60 hover:text-[#D4AF37]"
                  title="Float"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {topStepXEnabled && onHide && (
              <button
                onClick={onHide}
                className="p-1 hover:bg-[#D4AF37]/10 rounded text-[#D4AF37]/60 hover:text-[#D4AF37]"
                title="Hide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Collapse / Keep-expanded button — only visible on header hover */}
            {headerHovered && !collapsed && (
              <button
                onClick={onToggleCollapse}
                className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
                title="Collapse"
              >
                <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            )}
            {peekOpen && collapsed && (
              <button
                onClick={handleKeepExpanded}
                className="p-1.5 hover:bg-[#D4AF37]/10 rounded transition-colors"
                title="Keep expanded"
              >
                <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
              </button>
            )}
          </div>
        </div>

        {/* Widgets */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <EmotionalResonanceMonitor onERScoreChange={setErScore} />
          <BlindspotsWidget />
          <AccountTrackerWidget />
          <AlgoStatusWidget />
        </div>
      </div>
    </div>
  );
}
