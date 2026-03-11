// [claude-code 2026-03-09] ERScoringContext — state provider for ER scoring history
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useBackend } from '../lib/backend';
import type {
  EarningsReview,
  EarningsHistoryFilter,
  EarningsReviewCreate,
  EarningsReviewUpdate,
} from '../types/earnings-history';

interface ERScoringContextValue {
  reviews: EarningsReview[];
  loading: boolean;
  error: string | null;
  filter: EarningsHistoryFilter;
  total: number;
  hasMore: boolean;
  selectedReview: EarningsReview | null;
  setFilter: (f: Partial<EarningsHistoryFilter>) => void;
  refresh: () => Promise<void>;
  selectReview: (review: EarningsReview | null) => void;
  createReview: (data: EarningsReviewCreate) => Promise<void>;
  updateReview: (id: string, data: EarningsReviewUpdate) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setupDb: () => Promise<boolean>;
}

const ERScoringContext = createContext<ERScoringContextValue | null>(null);

export function useERScoring() {
  const ctx = useContext(ERScoringContext);
  if (!ctx) throw new Error('useERScoring must be used within ERScoringProvider');
  return ctx;
}

export function ERScoringProvider({ children }: { children: React.ReactNode }) {
  const backend = useBackend();
  const [reviews, setReviews] = useState<EarningsReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<EarningsHistoryFilter>({ limit: 20, offset: 0 });
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedReview, setSelectedReview] = useState<EarningsReview | null>(null);

  const fetchReviews = useCallback(async (f: EarningsHistoryFilter) => {
    setLoading(true);
    setError(null);
    try {
      const result = await backend.erScoring.list(f);
      if ((f.offset ?? 0) > 0) {
        setReviews((prev) => [...prev, ...result.items]);
      } else {
        setReviews(result.items);
      }
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch ER scoring records');
    } finally {
      setLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    fetchReviews(filter);
  }, [filter.symbol, filter.setupType, filter.dateFrom, filter.dateTo, filter.grade, filter.direction]);

  const setFilter = useCallback((partial: Partial<EarningsHistoryFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial, offset: 0 }));
  }, []);

  const refresh = useCallback(async () => {
    const resetFilter = { ...filter, offset: 0 };
    setFilterState(resetFilter);
    await fetchReviews(resetFilter);
  }, [filter, fetchReviews]);

  const selectReview = useCallback((review: EarningsReview | null) => {
    setSelectedReview(review);
  }, []);

  const createReview = useCallback(async (data: EarningsReviewCreate) => {
    await backend.erScoring.create(data);
    await refresh();
  }, [backend, refresh]);

  const updateReview = useCallback(async (id: string, data: EarningsReviewUpdate) => {
    const updated = await backend.erScoring.update(id, data);
    if (updated) {
      setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
      if (selectedReview?.id === id) setSelectedReview(updated);
    }
  }, [backend, selectedReview]);

  const deleteReview = useCallback(async (id: string) => {
    const ok = await backend.erScoring.deleteReview(id);
    if (ok) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
      if (selectedReview?.id === id) setSelectedReview(null);
      setTotal((t) => t - 1);
    }
  }, [backend, selectedReview]);

  const loadMore = useCallback(async () => {
    const nextOffset = (filter.offset ?? 0) + (filter.limit ?? 20);
    const nextFilter = { ...filter, offset: nextOffset };
    setFilterState(nextFilter);
    await fetchReviews(nextFilter);
  }, [filter, fetchReviews]);

  const setupDb = useCallback(async () => {
    try {
      const result = await backend.erScoring.setup();
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [backend, refresh]);

  return (
    <ERScoringContext.Provider
      value={{
        reviews,
        loading,
        error,
        filter,
        total,
        hasMore,
        selectedReview,
        setFilter,
        refresh,
        selectReview,
        createReview,
        updateReview,
        deleteReview,
        loadMore,
        setupDb,
      }}
    >
      {children}
    </ERScoringContext.Provider>
  );
}
