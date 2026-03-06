// [claude-code 2026-03-06] Regime store — localStorage persistence, CRUD, useRegimes hook

import { useState, useEffect, useCallback } from 'react';
import { type TradingRegime, SEED_REGIMES } from './regimes';

const STORAGE_KEY = 'pulse_regime_tracker_v1';

function loadRegimes(): TradingRegime[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SEED_REGIMES];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [...SEED_REGIMES];
    return parsed as TradingRegime[];
  } catch {
    return [...SEED_REGIMES];
  }
}

function saveRegimes(regimes: TradingRegime[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(regimes));
  } catch {
    // ignore
  }
}

export function useRegimes() {
  const [regimes, setRegimes] = useState<TradingRegime[]>(loadRegimes);

  // Persist on change
  useEffect(() => {
    saveRegimes(regimes);
  }, [regimes]);

  const addRegime = useCallback((regime: TradingRegime) => {
    setRegimes((prev) => [...prev, regime]);
  }, []);

  const updateRegime = useCallback((id: string, updates: Partial<TradingRegime>) => {
    setRegimes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    );
  }, []);

  const deleteRegime = useCallback((id: string) => {
    setRegimes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const recordWin = useCallback((id: string) => {
    setRegimes((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, record: { ...r.record, wins: r.record.wins + 1 }, daysObserved: r.daysObserved + 1 }
          : r,
      ),
    );
  }, []);

  const recordLoss = useCallback((id: string) => {
    setRegimes((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, record: { ...r.record, losses: r.record.losses + 1 }, daysObserved: r.daysObserved + 1 }
          : r,
      ),
    );
  }, []);

  const resetToDefaults = useCallback(() => {
    setRegimes([...SEED_REGIMES]);
  }, []);

  return {
    regimes,
    addRegime,
    updateRegime,
    deleteRegime,
    recordWin,
    recordLoss,
    resetToDefaults,
  };
}
