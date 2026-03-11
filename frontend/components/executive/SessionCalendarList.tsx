// [claude-code 2026-03-05] Extracted from ExecutiveDashboard — session calendar with progressive date fade
// [claude-code 2026-03-07] After 9PM, discard today's releases and show upcoming first
// [claude-code 2026-03-11] Track 6: P/A/F column headers + beat/miss dots
import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import type { ExecutiveScheduleItem } from './mockExecutiveData';

/** Get the "session date" — after 9PM local, roll forward to tomorrow */
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

function getBeatStatus(item: ExecutiveScheduleItem): BeatStatus {
  if (!item.actual || item.actual === '-') return 'pending';
  if (!item.forecast || item.forecast === '-') return 'pending';
  const a = parseFloat(item.actual.replace(/[^0-9.\-]/g, ''));
  const f = parseFloat(item.forecast.replace(/[^0-9.\-]/g, ''));
  if (isNaN(a) || isNaN(f)) return 'pending';
  return a >= f ? 'beat' : 'miss';
}

/** Group schedule items by date and render with progressive fade for future days */
export function SessionCalendarList({ items }: { items: ExecutiveScheduleItem[] }) {
  const sessionDate = getSessionDate();

  const grouped = useMemo(() => {
    // Filter out dates before the session date (past releases)
    const filtered = items.filter((item) => {
      const d = item.date ?? sessionDate;
      return d >= sessionDate;
    });
    const map = new Map<string, ExecutiveScheduleItem[]>();
    for (const item of filtered) {
      const key = item.date ?? sessionDate;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, sessionDate]);

  function formatDateLabel(dateStr: string): string {
    const realToday = new Date().toISOString().slice(0, 10);
    if (dateStr === realToday) return 'Today';
    if (dateStr === sessionDate && dateStr !== realToday) return 'Next Session';
    const d = new Date(dateStr + 'T12:00:00');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const opacitySteps = [1, 0.6, 0.4, 0.25];

  return (
    <div className="space-y-1">
      {grouped.map(([dateStr, events], groupIdx) => {
        const isToday = dateStr === sessionDate;
        const opacity = opacitySteps[Math.min(groupIdx, opacitySteps.length - 1)];

        return (
          <div key={dateStr} style={{ opacity }}>
            {/* Date separator + P/A/F headers on first group */}
            {groupIdx === 0 && (
              <div className="flex items-center gap-2 px-4 pb-1.5 mb-1">
                <div className="flex-1" />
                <div className="flex items-center gap-3 text-[9px] font-mono text-zinc-500 tracking-[0.12em] uppercase">
                  <span className="w-12 text-right">Prev</span>
                  <span className="w-12 text-right">Actual</span>
                  <span className="w-12 text-right">Fcst</span>
                  <span className="w-5 text-center">B/M</span>
                </div>
              </div>
            )}
            {!isToday && (
              <div className="flex items-center gap-3 mt-3 mb-2 px-1">
                <div className="h-px flex-1 bg-[var(--pulse-accent)]/15" />
                <span className="text-[9px] tracking-[0.22em] uppercase text-zinc-500 shrink-0">
                  {formatDateLabel(dateStr)}
                </span>
                <div className="h-px flex-1 bg-[var(--pulse-accent)]/15" />
              </div>
            )}
            <div className="space-y-2.5">
              {events.map((item) => {
                const status = getBeatStatus(item);
                return (
                  <div
                    key={`${dateStr}-${item.title}`}
                    className={`px-4 py-3.5 border-l-2 ${
                      isToday
                        ? 'bg-[#0b0b08] border-[var(--pulse-accent)]/45'
                        : 'bg-[#080806] border-[var(--pulse-accent)]/20'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-zinc-400'}`}>
                          {item.title}
                        </div>
                        <div className={`mt-1 text-xs ${isToday ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {item.detail}
                        </div>
                      </div>
                    </div>
                    {/* P / A / F row with beat/miss dot */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex-1" />
                      <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums">
                        <div className="w-12 text-right">
                          <div className={`text-[8px] uppercase tracking-[0.16em] mb-0.5 ${isToday ? 'text-zinc-500' : 'text-zinc-600'}`}>P</div>
                          <div className={isToday ? 'text-zinc-400' : 'text-zinc-500'}>{item.previous ?? '-'}</div>
                        </div>
                        <div className="w-12 text-right">
                          <div className={`text-[8px] uppercase tracking-[0.16em] mb-0.5 ${isToday ? 'text-zinc-500' : 'text-zinc-600'}`}>A</div>
                          <div className={`font-semibold ${
                            status === 'beat' ? 'text-emerald-400'
                              : status === 'miss' ? 'text-red-400'
                              : isToday ? 'text-zinc-300' : 'text-zinc-500'
                          }`}>{item.actual ?? '-'}</div>
                        </div>
                        <div className="w-12 text-right">
                          <div className={`text-[8px] uppercase tracking-[0.16em] mb-0.5 ${isToday ? 'text-zinc-500' : 'text-zinc-600'}`}>F</div>
                          <div className={isToday ? 'text-zinc-300' : 'text-zinc-500'}>{item.forecast ?? '-'}</div>
                        </div>
                        {/* Beat/miss indicator */}
                        <div className="w-5 flex items-center justify-center">
                          {status === 'beat' && <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={3} />}
                          {status === 'miss' && <X className="w-3.5 h-3.5 text-red-400" strokeWidth={3} />}
                          {status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
