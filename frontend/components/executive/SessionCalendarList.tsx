// [claude-code 2026-03-11] Native session calendar for ExecutiveDashboard — replaced TradingView embed
import { useEffect, useState, useMemo } from 'react';
import { Check, X, CalendarDays } from 'lucide-react';
import baseBackend from '../../lib/backend';
import type { EconEventItem } from '../../lib/services';
import type { ExecutiveScheduleItem } from './mockExecutiveData';

/** After 9PM local, session rolls to tomorrow */
function getSessionDate(): string {
  const now = new Date();
  if (now.getHours() >= 21) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

function getBeatStatus(event: EconEventItem): 'beat' | 'miss' | 'pending' {
  if (!event.actual || !event.forecast) return 'pending';
  const a = parseFloat(event.actual);
  const f = parseFloat(event.forecast);
  if (isNaN(a) || isNaN(f)) return 'pending';
  return a >= f ? 'beat' : 'miss';
}

const VOLUME_DOT: Record<number, string> = {
  1: 'bg-zinc-600',
  2: 'bg-[var(--pulse-accent)]',
  3: 'bg-red-400',
};

export function SessionCalendarList({ items: _items }: { items: ExecutiveScheduleItem[] }) {
  const [events, setEvents] = useState<EconEventItem[]>([]);
  const sessionDate = getSessionDate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await baseBackend.econCalendar.getEvents({ from: sessionDate, to: sessionDate });
        if (!cancelled) setEvents(result);
      } catch { /* fallback empty */ }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionDate]);

  // Only show medium+ importance, max 8
  const filtered = useMemo(() =>
    events.filter(e => e.importance >= 2).slice(0, 8),
  [events]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="text-[10px] text-zinc-500">No high-impact events today</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {/* P/A/F header */}
      <div className="flex items-center gap-2 px-2 py-1 text-[8px] text-zinc-600 uppercase tracking-wider">
        <span className="w-2" />
        <span className="w-10">Time</span>
        <span className="flex-1">Event</span>
        <span className="w-10 text-right">Prev</span>
        <span className="w-10 text-right">Act</span>
        <span className="w-10 text-right">Fcst</span>
        <span className="w-4" />
      </div>
      {filtered.map(event => {
        const beat = getBeatStatus(event);
        const dot = VOLUME_DOT[event.importance] ?? VOLUME_DOT[1];
        return (
          <div key={event.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--pulse-accent)]/5 transition-colors rounded">
            <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
            <span className="text-[9px] text-zinc-500 font-mono w-10 shrink-0">{event.time ?? ''}</span>
            <span className="text-[10px] text-zinc-300 font-medium flex-1 min-w-0 truncate">{event.name}</span>
            <span className="text-[9px] text-zinc-500 font-mono w-10 text-right shrink-0">{event.previous ?? '-'}</span>
            <span className={`text-[9px] font-mono w-10 text-right shrink-0 font-semibold ${event.actual ? 'text-[var(--pulse-accent)]' : 'text-zinc-600'}`}>
              {event.actual ?? '-'}
            </span>
            <span className="text-[9px] text-zinc-400 font-mono w-10 text-right shrink-0">{event.forecast ?? '-'}</span>
            <div className="w-4 flex items-center justify-center shrink-0">
              {beat === 'beat' && <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />}
              {beat === 'miss' && <X className="w-3 h-3 text-red-400" strokeWidth={3} />}
              {beat === 'pending' && <div className="w-1 h-1 rounded-full bg-zinc-700" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
