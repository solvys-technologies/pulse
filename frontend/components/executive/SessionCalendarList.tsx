// [claude-code 2026-03-05] Extracted from ExecutiveDashboard — session calendar with progressive date fade
import { useMemo } from 'react';
import type { ExecutiveScheduleItem } from './mockExecutiveData';

/** Group schedule items by date and render with progressive fade for future days */
export function SessionCalendarList({ items }: { items: ExecutiveScheduleItem[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const map = new Map<string, ExecutiveScheduleItem[]>();
    for (const item of items) {
      const key = item.date ?? todayStr;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, todayStr]);

  function formatDateLabel(dateStr: string): string {
    if (dateStr === todayStr) return 'Today';
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
        const isToday = dateStr === todayStr;
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
