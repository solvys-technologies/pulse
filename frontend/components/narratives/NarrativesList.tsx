// [claude-code 2026-03-06] Narratives list — scroll-lock weekly pages with kanban-style cards
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Maximize2 } from 'lucide-react';
import { useBackend } from '../../lib/backend';
import type { NarrativeItem, CreateNarrativeParams } from '../../lib/services';
import { NarrativeCard } from './NarrativeCard';
import { NarrativeCreateModal } from './NarrativeCreateModal';

/** ISO week string, e.g. "2026-W10" */
function isoWeek(date: Date): string {
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((date.getTime() - jan4.getTime()) / 86400000) + jan4.getDay();
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function offsetWeek(weekStr: string, delta: number): string {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekStr;
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  // Approximate: go to ~middle of the week, then offset
  const jan4 = new Date(year, 0, 4);
  const dayOffset = (week - 1) * 7 + (delta * 7);
  const target = new Date(jan4.getTime() + dayOffset * 86400000);
  return isoWeek(target);
}

function weekLabel(weekStr: string): string {
  const match = weekStr.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekStr;
  return `Week ${parseInt(match[2])}, ${match[1]}`;
}

interface NarrativesListProps {
  compact?: boolean;
  onExpandToWeb?: () => void;
}

export function NarrativesList({ compact = false, onExpandToWeb }: NarrativesListProps) {
  const backend = useBackend();
  const [week, setWeek] = useState(() => isoWeek(new Date()));
  const [narratives, setNarratives] = useState<NarrativeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentWeekStr = isoWeek(new Date());
  const isCurrentWeek = week === currentWeekStr;

  const fetchNarratives = useCallback(async (w: string) => {
    setLoading(true);
    try {
      const res = await backend.narratives.list(w);
      setNarratives(res.narratives ?? []);
    } catch {
      setNarratives([]);
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    fetchNarratives(week);
  }, [week, fetchNarratives]);

  const handleCreate = useCallback(async (data: CreateNarrativeParams) => {
    const result = await backend.narratives.create(data);
    if (result) {
      setNarratives((prev) => [result, ...prev]);
    }
    setShowCreate(false);
  }, [backend]);

  // Scroll-lock: mouse wheel navigates weeks
  useEffect(() => {
    const el = containerRef.current;
    if (!el || compact) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 30) return;
      e.preventDefault();
      if (debounce) return;
      debounce = setTimeout(() => { debounce = null; }, 400);
      setWeek((prev) => offsetWeek(prev, e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [compact]);

  const emptySlots = Math.max(0, 5 - narratives.length);

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-[#050402]">
      {/* Week navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4AF37]/15">
        <button
          type="button"
          onClick={() => setWeek((w) => offsetWeek(w, -1))}
          className="text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-[13px] font-semibold text-[#f0ead6]">{weekLabel(week)}</div>
          {isCurrentWeek && (
            <div className="text-[9px] text-[#D4AF37]/60 uppercase tracking-wider">Current Week</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeek((w) => offsetWeek(w, 1))}
            className="text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onExpandToWeb && !compact && (
            <button
              type="button"
              onClick={onExpandToWeb}
              title="Heatmap view"
              className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors ml-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Narrative cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-[11px] text-zinc-500">Loading narratives...</div>
          </div>
        ) : (
          <>
            {narratives.map((n) => (
              <NarrativeCard key={n.id} narrative={n} compact={compact} />
            ))}

            {/* Empty placeholder slots */}
            {emptySlots > 0 && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full rounded-lg border border-dashed border-[#D4AF37]/15 bg-[#050402] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-colors p-4 flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]/30" />
                <span className="text-[11px] text-[#D4AF37]/30">Add narrative</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer: quick-add */}
      {!compact && (
        <div className="px-3 py-2 border-t border-[#D4AF37]/10">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors text-[11px]"
          >
            <Plus className="w-3 h-3" />
            New Narrative
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <NarrativeCreateModal
          week={week}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
