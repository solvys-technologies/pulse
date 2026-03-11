// [claude-code 2026-03-11] Native Economic Calendar — replaced TradingView iframe (X-Frame-Options blocked)
// Uses EconCalendarContext data + EconEventRow for full native rendering
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import { useEconCalendar } from '../../contexts/EconCalendarContext';
import { EconEventRow } from './EconEventRow';
import { EconTickerFooter } from './EconTickerFooter';
import type { EconEventItem } from '../../lib/services';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function getWeekDates(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date.toISOString().slice(0, 10);
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type ImportanceFilter = 'all' | 'medium' | 'high';

export function EconCalendar() {
  const { events, loading, error, selectedDate, setSelectedDate, refresh } = useEconCalendar();
  const [refreshing, setRefreshing] = useState(false);
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>('all');

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const filteredEvents = useMemo(() => {
    const dateEvents = events.filter(e => e.date === selectedDate);
    if (importanceFilter === 'high') return dateEvents.filter(e => e.importance === 3);
    if (importanceFilter === 'medium') return dateEvents.filter(e => e.importance >= 2);
    return dateEvents;
  }, [events, selectedDate, importanceFilter]);

  // Group by time blocks
  const grouped = useMemo(() => {
    const preMarket: EconEventItem[] = [];
    const session: EconEventItem[] = [];
    const afterHours: EconEventItem[] = [];
    const allDay: EconEventItem[] = [];

    for (const e of filteredEvents) {
      if (!e.time) { allDay.push(e); continue; }
      const [h] = e.time.split(':').map(Number);
      if (h < 9) preMarket.push(e);
      else if (h < 16) session.push(e);
      else afterHours.push(e);
    }
    return { preMarket, session, afterHours, allDay };
  }, [filteredEvents]);

  // Day-level summary counts
  const daySummaries = useMemo(() => {
    const map: Record<string, { total: number; high: number; beats: number; misses: number }> = {};
    for (const date of weekDates) {
      const dayEvents = events.filter(e => e.date === date);
      let beats = 0, misses = 0;
      for (const e of dayEvents) {
        if (e.actual && e.forecast) {
          const a = parseFloat(e.actual);
          const f = parseFloat(e.forecast);
          if (!isNaN(a) && !isNaN(f)) {
            if (a >= f) beats++; else misses++;
          }
        }
      }
      map[date] = { total: dayEvents.length, high: dayEvents.filter(e => e.importance === 3).length, beats, misses };
    }
    return map;
  }, [events, weekDates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const navigateWeek = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + offset * 7);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full flex flex-col bg-[var(--pulse-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[var(--pulse-accent)]" />
            <h2 className="text-sm font-semibold text-[var(--pulse-accent)]">Economic Calendar</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Importance filter */}
            <div className="flex items-center gap-1 bg-zinc-900/50 rounded px-1 py-0.5">
              <Filter className="w-3 h-3 text-zinc-500" />
              {(['all', 'medium', 'high'] as ImportanceFilter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setImportanceFilter(f)}
                  className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors ${
                    importanceFilter === f
                      ? 'bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'medium' ? 'Med+' : 'High'}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button onClick={handleRefresh} className="p-1 rounded hover:bg-zinc-800 transition-colors" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-1 mt-3">
          <button onClick={() => navigateWeek(-1)} className="p-1 rounded hover:bg-zinc-800 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
          </button>
          <div className="flex-1 grid grid-cols-5 gap-1">
            {weekDates.map((date, i) => {
              const summary = daySummaries[date];
              const active = date === selectedDate;
              const today = isToday(date);
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center py-1.5 px-2 rounded transition-all ${
                    active
                      ? 'bg-[var(--pulse-accent)]/15 border border-[var(--pulse-accent)]/30'
                      : today
                        ? 'bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800'
                        : 'hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <span className={`text-[9px] uppercase tracking-wider ${active ? 'text-[var(--pulse-accent)]' : 'text-zinc-500'}`}>
                    {DAY_LABELS[i]}
                  </span>
                  <span className={`text-[11px] font-medium mt-0.5 ${active ? 'text-white' : today ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {formatDateShort(date)}
                  </span>
                  {summary && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[8px] text-zinc-500">{summary.total}</span>
                      {summary.high > 0 && (
                        <span className="text-[8px] text-red-400 font-semibold">{summary.high}H</span>
                      )}
                      {summary.beats > 0 && (
                        <span className="text-[8px] text-emerald-400">{summary.beats}B</span>
                      )}
                      {summary.misses > 0 && (
                        <span className="text-[8px] text-red-400">{summary.misses}M</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={() => navigateWeek(1)} className="p-1 rounded hover:bg-zinc-800 transition-colors">
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2 border-b border-zinc-800/40 text-[9px] text-zinc-500 uppercase tracking-wider">
        <span className="w-3" />  {/* chevron */}
        <span className="w-5" />  {/* flag */}
        <span className="w-3" />  {/* volume bar */}
        <span className="w-12">Time</span>
        <span className="flex-1">Event</span>
        <span className="w-14 text-right">Prev</span>
        <span className="w-14 text-right">Actual</span>
        <span className="w-14 text-right">Fcst</span>
        <span className="w-5 text-center">B/M</span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-zinc-500">Loading calendar data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-red-400">{error}</div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-xs text-zinc-500">No events for {formatDateShort(selectedDate)}</div>
          </div>
        ) : (
          <div>
            {grouped.preMarket.length > 0 && (
              <TimeBlock label="Pre-Market" events={grouped.preMarket} />
            )}
            {grouped.session.length > 0 && (
              <TimeBlock label="Session" events={grouped.session} />
            )}
            {grouped.afterHours.length > 0 && (
              <TimeBlock label="After Hours" events={grouped.afterHours} />
            )}
            {grouped.allDay.length > 0 && (
              <TimeBlock label="All Day" events={grouped.allDay} />
            )}
          </div>
        )}
      </div>

      {/* Ticker footer */}
      <EconTickerFooter />
    </div>
  );
}

function TimeBlock({ label, events }: { label: string; events: EconEventItem[] }) {
  return (
    <div>
      <div className="px-4 py-1.5 bg-zinc-900/40 border-b border-zinc-800/30">
        <span className="text-[9px] text-zinc-500 uppercase tracking-[0.15em] font-medium">{label}</span>
        <span className="text-[9px] text-zinc-600 ml-2">{events.length}</span>
      </div>
      <div className="divide-y divide-zinc-800/20">
        {events.map(event => (
          <EconEventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
