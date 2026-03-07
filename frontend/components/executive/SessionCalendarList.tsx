// [claude-code 2026-03-05] Extracted from ExecutiveDashboard — session calendar with progressive date fade
// [claude-code 2026-03-07] After 9PM, discard today's releases and show upcoming first
import { useMemo } from 'react';
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
            {!isToday && (
              <div className="flex items-center gap-3 mt-3 mb-2 px-1">
                <div className="h-px flex-1 bg-[#06b6d4]/15" />
                <span className="text-[9px] tracking-[0.22em] uppercase text-gray-500 shrink-0">
                  {formatDateLabel(dateStr)}
                </span>
                <div className="h-px flex-1 bg-[#06b6d4]/15" />
              </div>
            )}
            <div className="space-y-2.5">
              {events.map((item) => (
                <div
                  key={`${dateStr}-${item.title}`}
                  className={`px-4 py-3 border-l-2 ${
                    isToday
                      ? 'bg-[#0b0b08] border-[#06b6d4]/45'
                      : 'bg-[#080806] border-[#06b6d4]/20'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-400'}`}>
                    {item.title}
                  </div>
                  <div className={`mt-1 text-xs ${isToday ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.detail}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Forecast</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.forecast ?? '-'}</div>
                    </div>
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Actual</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.actual ?? '-'}</div>
                    </div>
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Previous</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.previous ?? '-'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
