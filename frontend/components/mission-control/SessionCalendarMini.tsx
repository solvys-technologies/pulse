// [claude-code 2026-03-11] Track 4: Compact session calendar widget for Mission Control
import { useMemo } from 'react';
import { useSchedule } from '../../contexts/ScheduleContext';
import type { ExecutiveScheduleItem } from '../executive/mockExecutiveData';

const MAX_EVENTS = 4;

/** Get the "session date" — after 9 PM local, roll forward to tomorrow */
function getSessionDate(): string {
  const now = new Date();
  if (now.getHours() >= 21) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

type BeatStatus = 'beat' | 'miss' | 'pending';

function beatStatus(item: ExecutiveScheduleItem): BeatStatus {
  if (!item.actual || item.actual === '-') return 'pending';
  if (!item.forecast || item.forecast === '-') return 'pending';
  const a = parseFloat(item.actual.replace(/[^0-9.\-]/g, ''));
  const f = parseFloat(item.forecast.replace(/[^0-9.\-]/g, ''));
  if (isNaN(a) || isNaN(f)) return 'pending';
  return a >= f ? 'beat' : 'miss';
}

const DOT_CLASSES: Record<BeatStatus, string> = {
  beat: 'bg-emerald-400',
  miss: 'bg-red-400',
  pending: 'bg-zinc-600',
};

export function SessionCalendarMini() {
  const { items, loaded } = useSchedule();
  const sessionDate = getSessionDate();

  const upcoming = useMemo(() => {
    return items
      .filter((it) => (it.date ?? sessionDate) >= sessionDate)
      .sort((a, b) => {
        const da = a.date ?? sessionDate;
        const db = b.date ?? sessionDate;
        return da.localeCompare(db) || a.title.localeCompare(b.title);
      })
      .slice(0, MAX_EVENTS);
  }, [items, sessionDate]);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-zinc-600 tracking-wider uppercase">
        Loading calendar...
      </div>
    );
  }

  if (upcoming.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[10px] text-zinc-600 tracking-wider uppercase">
        No upcoming events
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-1 pb-1">
        <div className="text-[9px] text-zinc-600 tracking-[0.16em] uppercase">Event</div>
        <div className="grid grid-cols-3 gap-3 text-[9px] text-zinc-600 tracking-[0.16em] uppercase text-right">
          <span>P</span>
          <span>A</span>
          <span>F</span>
        </div>
      </div>

      {upcoming.map((item, idx) => {
        const status = beatStatus(item);
        const isToday = (item.date ?? sessionDate) === sessionDate;
        return (
          <div
            key={`${item.date}-${item.title}-${idx}`}
            className={`grid grid-cols-[1fr_auto] items-center gap-2 px-1 py-1.5 rounded ${
              isToday ? 'bg-[var(--pulse-accent)]/[0.04]' : ''
            }`}
          >
            {/* Title + beat dot */}
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASSES[status]}`} />
              <span className={`text-[11px] truncate ${isToday ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {item.title}
              </span>
            </div>

            {/* P / A / F values */}
            <div className="grid grid-cols-3 gap-3 text-[10px] text-right tabular-nums">
              <span className="text-zinc-600">{item.previous ?? '-'}</span>
              <span className={status === 'beat' ? 'text-emerald-400' : status === 'miss' ? 'text-red-400' : 'text-zinc-500'}>
                {item.actual ?? '-'}
              </span>
              <span className="text-zinc-500">{item.forecast ?? '-'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
