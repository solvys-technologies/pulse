// [claude-code 2026-03-05] Economic Calendar — TradingView-style time-grouped layout.
// [claude-code 2026-03-11] Track 6: Redesign — P/A/F column headers, volume bars, beat/miss indicators, more row spacing.
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useEconCalendar } from '../../contexts/EconCalendarContext';
import { EconEventRow } from './EconEventRow';
import { EconTickerFooter } from './EconTickerFooter';
import type { EconEventItem } from '../../lib/services';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function shiftWeek(dateStr: string, delta: number): string {
  const monday = getMonday(dateStr);
  monday.setDate(monday.getDate() + delta * 7);
  return monday.toISOString().slice(0, 10);
}

function getWeekDates(dateStr: string): string[] {
  const monday = getMonday(dateStr);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

type GroupedEvents = Record<string, EconEventItem[]>;

function groupByDate(events: EconEventItem[]): GroupedEvents {
  const groups: GroupedEvents = {};
  for (const event of events) {
    const key = event.date ?? 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  }
  return groups;
}

const IMPORTANCE_FILTER_OPTIONS = [
  { label: 'All', value: 0 },
  { label: 'Medium+', value: 2 },
  { label: 'High', value: 3 },
];

export function EconCalendar() {
  const { events, loading, error, selectedDate, setSelectedDate, refresh } = useEconCalendar();
  const [minImportance, setMinImportance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (minImportance === 0) return events;
    return events.filter((e) => e.importance >= minImportance);
  }, [events, minImportance]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--pulse-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--pulse-accent)]/15">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-sm font-semibold text-[var(--pulse-accent)] tracking-[0.15em] uppercase">
            Economic Calendar
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1.5 rounded hover:bg-[var(--pulse-accent)]/10 text-[var(--pulse-accent)]/60 hover:text-[var(--pulse-accent)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(shiftWeek(selectedDate, -1))}
            className="p-1 rounded hover:bg-[var(--pulse-accent)]/10 text-[var(--pulse-accent)]/60 hover:text-[var(--pulse-accent)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1 flex-1">
            {weekDates.map((date) => {
              const d = new Date(date + 'T12:00:00');
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const hasEvents = grouped[date]?.length > 0;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-1 py-1.5 px-1 rounded text-center transition-colors relative ${
                    isSelected
                      ? 'bg-[var(--pulse-accent)] text-black'
                      : isToday
                        ? 'bg-[var(--pulse-accent)]/15 text-[var(--pulse-accent)]'
                        : 'text-zinc-400 hover:text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/10'
                  }`}
                >
                  <div className="text-[10px] font-medium">{WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                  <div className="text-[11px] font-bold">{d.getDate()}</div>
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--pulse-accent)]/60" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setSelectedDate(shiftWeek(selectedDate, 1))}
            className="p-1 rounded hover:bg-[var(--pulse-accent)]/10 text-[var(--pulse-accent)]/60 hover:text-[var(--pulse-accent)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Importance filter */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Impact:</span>
          {IMPORTANCE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMinImportance(opt.value)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                minImportance === opt.value
                  ? 'bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] border border-[var(--pulse-accent)]/40'
                  : 'text-zinc-500 hover:text-[var(--pulse-accent)] border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Loading calendar...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-12 text-red-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && weekDates.map((date) => {
          const dayEvents = grouped[date] ?? [];
          const isToday = date === today;
          return (
            <div key={date} className="border-b border-[var(--pulse-accent)]/10 last:border-b-0">
              {/* Day header with P/A/F column labels */}
              <div className={`px-4 py-2.5 flex items-center gap-2 ${isToday ? 'bg-[var(--pulse-accent)]/5' : 'bg-[#080800]'}`}>
                <span className={`text-[11px] font-semibold tracking-wider uppercase ${isToday ? 'text-[var(--pulse-accent)]' : 'text-zinc-400'}`}>
                  {formatDateLabel(date)}
                </span>
                {isToday && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] font-medium">
                    TODAY
                  </span>
                )}
                <span className="text-[10px] text-zinc-600 ml-auto mr-2">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </span>
                {/* P / A / F column headers */}
                {dayEvents.length > 0 && (
                  <div className="flex items-center gap-3 shrink-0 text-[9px] font-mono text-zinc-500 tracking-[0.12em] uppercase">
                    <span className="w-14 text-right">Prev</span>
                    <span className="w-14 text-right">Actual</span>
                    <span className="w-14 text-right">Fcst</span>
                    <span className="w-5" />
                  </div>
                )}
              </div>
              {/* Events */}
              {dayEvents.length > 0 ? (
                <div className="divide-y divide-[var(--pulse-accent)]/5">
                  {dayEvents.map((event) => (
                    <EconEventRow key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-4 text-zinc-600 text-[11px] italic">
                  No events scheduled
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI analysis ticker */}
      <EconTickerFooter />
    </div>
  );
}
