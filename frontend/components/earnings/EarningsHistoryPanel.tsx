// [claude-code 2026-03-09] EarningsHistoryPanel — full-width ER journal view with filters + slideout
import React, { useState, useCallback } from 'react';
import { BookOpenCheck, Plus, Search, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Minus, Loader2, Database } from 'lucide-react';
import { useERScoring } from '../../contexts/EarningsHistoryContext';
import { EarningsReviewSlideout } from './EarningsReviewSlideout';
import type { EarningsReviewCreate } from '../../types/earnings-history';

const SETUP_OPTIONS = ['gap-fill', 'breakout', 'fade', 'momentum', 'reversal', 'other'];
const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'F'];
const DIRECTION_OPTIONS = ['long', 'short', 'flat'];

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'long') return <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />;
  if (direction === 'short') return <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return null;
  const colors: Record<string, string> = {
    A: 'bg-green-500/20 text-green-400',
    B: 'bg-blue-500/20 text-blue-400',
    C: 'bg-yellow-500/20 text-yellow-400',
    D: 'bg-orange-500/20 text-orange-400',
    F: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[grade] ?? 'bg-zinc-700 text-zinc-400'}`}>
      {grade}
    </span>
  );
}

function NewEntryForm({ onSubmit, onCancel }: { onSubmit: (data: EarningsReviewCreate) => void; onCancel: () => void }) {
  const [symbol, setSymbol] = useState('');
  const [earningsDate, setEarningsDate] = useState('');
  const [setupType, setSetupType] = useState('other');
  const [direction, setDirection] = useState<'long' | 'short' | 'flat'>('flat');
  const [thesis, setThesis] = useState('');
  const [emotionalState, setEmotionalState] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !earningsDate || !thesis) return;
    onSubmit({ symbol: symbol.toUpperCase(), earningsDate, setupType, direction, thesis, emotionalState: emotionalState || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 border border-[var(--pulse-accent)]/30 rounded-lg space-y-2 mb-3">
      <div className="text-[11px] font-semibold text-[var(--pulse-accent)] mb-1">New Journal Entry</div>
      <div className="grid grid-cols-3 gap-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol *"
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-[var(--pulse-text)] placeholder-zinc-600 focus:border-[var(--pulse-accent)] focus:outline-none"
        />
        <input
          type="date"
          value={earningsDate}
          onChange={(e) => setEarningsDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-[var(--pulse-text)] focus:border-[var(--pulse-accent)] focus:outline-none"
        />
        <select
          value={setupType}
          onChange={(e) => setSetupType(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-[var(--pulse-text)] focus:border-[var(--pulse-accent)] focus:outline-none"
        >
          {SETUP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        {DIRECTION_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d as any)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              direction === d ? 'border-[var(--pulse-accent)] text-[var(--pulse-accent)]' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <input
        value={emotionalState}
        onChange={(e) => setEmotionalState(e.target.value)}
        placeholder="Emotional state (how are you feeling?)"
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-[var(--pulse-text)] placeholder-zinc-600 focus:border-[var(--pulse-accent)] focus:outline-none"
      />
      <textarea
        value={thesis}
        onChange={(e) => setThesis(e.target.value)}
        placeholder="Pre-earnings thesis / plan *"
        rows={2}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[11px] text-[var(--pulse-text)] placeholder-zinc-600 focus:border-[var(--pulse-accent)] focus:outline-none resize-none"
      />
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-[10px] px-3 py-1 text-zinc-500 hover:text-zinc-300">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!symbol || !earningsDate || !thesis}
          className="text-[10px] px-3 py-1 rounded bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] border border-[var(--pulse-accent)]/30 hover:bg-[var(--pulse-accent)]/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Entry
        </button>
      </div>
    </form>
  );
}

export function EarningsHistoryPanel() {
  const {
    reviews, loading, error, filter, total, hasMore,
    selectedReview, setFilter, refresh, selectReview,
    createReview, updateReview, deleteReview, loadMore, setupDb,
  } = useERScoring();

  const [showNewForm, setShowNewForm] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  const handleSymbolSearch = useCallback(() => {
    setFilter({ symbol: symbolSearch || undefined });
  }, [symbolSearch, setFilter]);

  const handleCreate = useCallback(async (data: EarningsReviewCreate) => {
    await createReview(data);
    setShowNewForm(false);
  }, [createReview]);

  const handleSetup = useCallback(async () => {
    setSettingUp(true);
    await setupDb();
    setSettingUp(false);
  }, [setupDb]);

  // If no reviews and no filter active, might need setup
  const needsSetup = !loading && reviews.length === 0 && !filter.symbol && !filter.setupType && !filter.dateFrom;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--pulse-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--pulse-accent)]/15">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-[var(--pulse-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--pulse-text)]">Trading Journal</span>
          {total > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--pulse-accent)]/15 text-[var(--pulse-accent)]">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowNewForm((v) => !v)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-[var(--pulse-accent)]/30 text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/10 transition-colors"
        >
          <Plus className="w-3 h-3" /> New Entry
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-4 py-2 border-b border-[var(--pulse-accent)]/10 space-y-2">
        <div className="flex gap-2 items-center">
          <div className="flex-1 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded px-2">
            <Search className="w-3 h-3 text-zinc-500" />
            <input
              value={symbolSearch}
              onChange={(e) => setSymbolSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSymbolSearch()}
              placeholder="Search symbol..."
              className="flex-1 bg-transparent text-[11px] text-[var(--pulse-text)] placeholder-zinc-600 py-1 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setFiltersExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Filters {filtersExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {filtersExpanded && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={filter.setupType ?? ''}
              onChange={(e) => setFilter({ setupType: e.target.value || undefined })}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-[var(--pulse-text)] focus:outline-none"
            >
              <option value="">All setups</option>
              {SETUP_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filter.grade ?? ''}
              onChange={(e) => setFilter({ grade: e.target.value || undefined })}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-[var(--pulse-text)] focus:outline-none"
            >
              <option value="">All grades</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select
              value={filter.direction ?? ''}
              onChange={(e) => setFilter({ direction: e.target.value || undefined })}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-[var(--pulse-text)] focus:outline-none"
            >
              <option value="">All directions</option>
              {DIRECTION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              type="date"
              value={filter.dateFrom ?? ''}
              onChange={(e) => setFilter({ dateFrom: e.target.value || undefined })}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-[var(--pulse-text)] focus:outline-none"
              placeholder="From"
            />
            <input
              type="date"
              value={filter.dateTo ?? ''}
              onChange={(e) => setFilter({ dateTo: e.target.value || undefined })}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-[var(--pulse-text)] focus:outline-none"
              placeholder="To"
            />
            {(filter.symbol || filter.setupType || filter.grade || filter.direction || filter.dateFrom || filter.dateTo) && (
              <button
                onClick={() => {
                  setSymbolSearch('');
                  setFilter({ symbol: undefined, setupType: undefined, grade: undefined, direction: undefined, dateFrom: undefined, dateTo: undefined });
                }}
                className="text-[10px] text-red-400/60 hover:text-red-400"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* New entry form */}
      {showNewForm && (
        <div className="px-4 pt-3">
          <NewEntryForm onSubmit={handleCreate} onCancel={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="px-4 py-3 text-[11px] text-red-400">{error}</div>
        )}

        {loading && reviews.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[var(--pulse-accent)] animate-spin" />
          </div>
        )}

        {needsSetup && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <Database className="w-8 h-8 text-[var(--pulse-accent)]/40 mb-3" />
            <div className="text-[12px] text-[var(--pulse-text)]/60 mb-1">No ER scoring entries yet</div>
            <div className="text-[10px] text-zinc-500 mb-4 max-w-[280px]">
              Set up your Notion database to start logging ER scores for psych analysis.
            </div>
            <button
              onClick={handleSetup}
              disabled={settingUp}
              className="flex items-center gap-1.5 text-[11px] px-4 py-2 rounded border border-[var(--pulse-accent)]/30 text-[var(--pulse-accent)] hover:bg-[var(--pulse-accent)]/10 disabled:opacity-50"
            >
              {settingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              {settingUp ? 'Creating DB...' : 'Set Up Earnings DB'}
            </button>
            <div className="text-[9px] text-zinc-600 mt-6">
              Or click "New Entry" above to add your first review.
            </div>
          </div>
        )}

        {!needsSetup && reviews.length === 0 && !loading && (
          <div className="px-4 py-8 text-center text-[11px] text-zinc-500">
            No entries match your filters.
          </div>
        )}

        {reviews.length > 0 && (
          <div className="divide-y divide-[var(--pulse-accent)]/8">
            {reviews.map((review) => (
              <button
                key={review.id}
                onClick={() => selectReview(review)}
                className={`w-full text-left px-4 py-2.5 hover:bg-[var(--pulse-accent)]/5 transition-colors ${
                  selectedReview?.id === review.id ? 'bg-[var(--pulse-accent)]/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <DirectionIcon direction={review.direction} />
                    <span className="text-[12px] font-semibold text-[var(--pulse-text)] truncate">{review.symbol}</span>
                    <span className="text-[10px] text-zinc-500">{review.earningsDate}</span>
                    {review.setupType && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{review.setupType}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {review.pnl != null && (
                      <span className={`text-[11px] font-mono ${review.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {review.pnl >= 0 ? '+' : ''}{review.pnl.toFixed(0)}
                      </span>
                    )}
                    <GradeBadge grade={review.grade} />
                  </div>
                </div>
                {review.emotionalState && (
                  <div className="text-[10px] text-zinc-500 mt-0.5 truncate pl-5">
                    {review.emotionalState}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="px-4 py-3 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="text-[10px] px-4 py-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-[var(--pulse-accent)] hover:border-[var(--pulse-accent)]/30 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Slideout */}
      {selectedReview && (
        <EarningsReviewSlideout
          review={selectedReview}
          onClose={() => selectReview(null)}
          onUpdate={updateReview}
          onDelete={deleteReview}
        />
      )}
    </div>
  );
}
