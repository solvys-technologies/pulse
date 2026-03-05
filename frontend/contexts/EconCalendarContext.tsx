// [claude-code 2026-03-05] Economic Calendar context — polls Notion econ events on 60s interval.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import baseBackend from '../lib/backend';
import type { EconEventItem, EconPrintItem } from '../lib/services';

interface EconCalendarContextValue {
  events: EconEventItem[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  fetchPrints: (eventName: string) => Promise<EconPrintItem[]>;
  refresh: () => Promise<void>;
}

const EconCalendarContext = createContext<EconCalendarContextValue>({
  events: [],
  loading: true,
  error: null,
  selectedDate: new Date().toISOString().slice(0, 10),
  setSelectedDate: () => {},
  fetchPrints: async () => [],
  refresh: async () => {},
});

const POLL_INTERVAL_MS = 60_000;

function getWeekRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  return {
    from: monday.toISOString().slice(0, 10),
    to: friday.toISOString().slice(0, 10),
  };
}

export function EconCalendarProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EconEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { from, to } = getWeekRange(selectedDate);
      const result = await baseBackend.econCalendar.getEvents({ from, to });
      setEvents(result);
      setError(null);
    } catch (err) {
      console.error('[EconCalendar] Fetch error:', err);
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    void fetchEvents();
    intervalRef.current = setInterval(() => { void fetchEvents(); }, POLL_INTERVAL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchEvents]);

  const fetchPrints = useCallback(async (eventName: string): Promise<EconPrintItem[]> => {
    return baseBackend.econCalendar.getPrints(eventName);
  }, []);

  return (
    <EconCalendarContext.Provider value={{ events, loading, error, selectedDate, setSelectedDate, fetchPrints, refresh: fetchEvents }}>
      {children}
    </EconCalendarContext.Provider>
  );
}

export function useEconCalendar(): EconCalendarContextValue {
  return useContext(EconCalendarContext);
}
