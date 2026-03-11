// [claude-code 2026-03-11] Native compact calendar widget for Mission Control — replaced TradingView embed
import { useEffect, useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import baseBackend from '../../lib/backend';
import type { EconEventItem } from '../../lib/services';

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

export function SessionCalendarMini() {
  const [events, setEvents] = useState<EconEventItem[]>([]);
  const sessionDate = getSessionDate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await baseBackend.econCalendar.getEvents({ from: sessionDate, to: sessionDate });
        if (!cancelled) setEvents(result);
      } catch { /* keep empty */ }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionDate]);

  // Medium+ importance, max 4 for compact view
  const filtered = useMemo(() =>
    events.filter(e => e.importance >= 2).slice(0, 4),
  [events]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-3">
        <span className="text-[10px] text-zinc-500">No high-impact events today</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-1">
      {/* P/A/F header */}
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-[7px] text-zinc-600 uppercase tracking-wider">
        <span className="w-8">Time</span>
        <span className="flex-1">Event</span>
        <span className="w-8 text-right">P</span>
        <span className="w-8 text-right">A</span>
        <span className="w-8 text-right">F</span>
        <span className="w-3" />
      </div>
      {filtered.map(event => {
        const beat = getBeatStatus(event);
        const impColor = event.importance === 3 ? 'border-l-red-400' : 'border-l-[var(--pulse-accent)]/40';
        return (
          <div key={event.id} className={`flex items-center gap-1.5 px-1 py-1 border-l-2 ${impColor} hover:bg-white/[0.02] transition-colors`}>
            <span className="text-[8px] text-zinc-500 font-mono w-8 shrink-0">{event.time ?? ''}</span>
            <span className="text-[9px] text-zinc-300 font-medium flex-1 min-w-0 truncate">{event.name}</span>
            <span className="text-[8px] text-zinc-500 font-mono w-8 text-right shrink-0">{event.previous ?? '-'}</span>
            <span className={`text-[8px] font-mono w-8 text-right shrink-0 ${event.actual ? 'text-[var(--pulse-accent)] font-semibold' : 'text-zinc-600'}`}>
              {event.actual ?? '-'}
            </span>
            <span className="text-[8px] text-zinc-400 font-mono w-8 text-right shrink-0">{event.forecast ?? '-'}</span>
            <div className="w-3 flex items-center justify-center shrink-0">
              {beat === 'beat' && <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />}
              {beat === 'miss' && <X className="w-2.5 h-2.5 text-red-400" strokeWidth={3} />}
              {beat === 'pending' && <div className="w-1 h-1 rounded-full bg-zinc-700" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
