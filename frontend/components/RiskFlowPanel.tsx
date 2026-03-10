// [claude-code 2026-02-26] Make RiskFlow subsection collapsible in Mission Control stack.
// [claude-code 2026-03-03] Add trade idea row rendering (gold border, click-to-modal).
// [claude-code 2026-03-10] Status dots (Notion + X CLI), dropdown filters (Priority + Source), X filter.
// [claude-code 2026-03-10] T3: critical severity renders same as high (pulse + red text)
import React, { useState } from 'react';
import { useRiskFlow } from '../contexts/RiskFlowContext';
import { Zap, ExternalLink, ChevronDown, ChevronUp, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { RiskFlowAlert, TradeIdeaDetail } from '../lib/riskflow-feed';
import TradeIdeaModal from './TradeIdeaModal';
import { useSourceStatus } from '../hooks/useSourceStatus';

import { SEVERITY_CONFIG } from '../lib/severity-config';

// ── Time formatting ────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Trade Idea Row ─────────────────────────────────────────────────────────────

function TradeIdeaRow({
  alert,
  onDelete,
  onOpen,
  onMarkSeen,
  seen,
}: {
  alert: RiskFlowAlert;
  onDelete: (id: string) => void;
  onOpen: (idea: TradeIdeaDetail) => void;
  onMarkSeen: (id: string) => void;
  seen: boolean;
}) {
  const idea = alert.tradeIdea!;
  const isLong = idea.direction === 'long';

  return (
    <div
      className={`group flex items-start gap-2 px-3 py-2.5 border-b border-zinc-800/50 border-l-2 border-l-[var(--pulse-accent)]/50 hover:bg-[var(--pulse-accent)]/5 transition-colors cursor-pointer ${
        seen ? 'opacity-70' : ''
      }`}
      onClick={() => {
        onMarkSeen(alert.id);
        onOpen(idea);
      }}
    >
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 border border-[var(--pulse-accent)]/40 bg-[var(--pulse-accent)]/10">
          {isLong
            ? <TrendingUp className="w-3 h-3 text-[var(--pulse-accent)]" />
            : <TrendingDown className="w-3 h-3 text-zinc-400" />
          }
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-snug font-medium line-clamp-2 text-[var(--pulse-text)] group-hover:text-white transition-colors">
            {alert.headline}
          </p>
          {alert.summary && alert.summary !== alert.headline && (
            <p className="text-[10px] text-zinc-600 line-clamp-1 mt-0.5">{alert.summary}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-zinc-600">{timeAgo(alert.publishedAt)}</span>
            <span className="text-[10px] text-zinc-700">•</span>
            <span className="text-[10px] text-[var(--pulse-accent)]/60 uppercase tracking-wider">
              {idea.sourceAgent ?? 'Trade Idea'}
            </span>
            {idea.riskRewardRatio && (
              <>
                <span className="text-[10px] text-zinc-700">•</span>
                <span className="text-[10px] text-zinc-500">R/R {idea.riskRewardRatio.toFixed(1)}:1</span>
              </>
            )}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(alert.id); }}
        className="flex-shrink-0 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Remove item"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Alert Row ──────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  onDelete,
  onMarkSeen,
  seen,
}: {
  alert: RiskFlowAlert;
  onDelete: (id: string) => void;
  onMarkSeen: (id: string) => void;
  seen: boolean;
}) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const isHigh = alert.severity === 'high' || alert.severity === 'critical';

  return (
    <div className={`group flex items-start gap-2 px-3 py-2.5 border-b border-zinc-800/50 hover:bg-[var(--pulse-accent)]/5 transition-colors ${isHigh ? 'riskflow-pulse-row' : ''} ${seen ? 'opacity-70' : ''}`}>
      <a
        href={alert.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 flex items-start gap-2 cursor-pointer"
        onClick={() => onMarkSeen(alert.id)}
      >
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${sev.bg} ${sev.text} ${sev.border} border ${sev.glow || ''} flex-shrink-0 mt-0.5`}>
          {sev.label}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-snug font-medium line-clamp-3 break-words ${alert.severity === 'critical' ? 'text-orange-300' : isHigh ? 'text-red-300' : 'text-zinc-300'} group-hover:text-white transition-colors`}>
            {alert.headline}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-zinc-600">{timeAgo(alert.publishedAt)}</span>
            <span className="text-[10px] text-zinc-700">•</span>
            <span className="text-[10px] text-[var(--pulse-accent)]/60 uppercase tracking-wider">{alert.source}</span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
          </div>
        </div>
      </a>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(alert.id); }}
        className="flex-shrink-0 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Remove item"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Status Dot ─────────────────────────────────────────────────────────────────

function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className="flex items-center gap-1"
      title={`${label}: ${active ? 'connected' : 'disconnected'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
      <span className={`text-[9px] uppercase tracking-wider ${active ? 'text-emerald-400/60' : 'text-zinc-700'}`}>{label}</span>
    </span>
  );
}

// ── Filter Dropdown ────────────────────────────────────────────────────────────

function FilterDropdown<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="px-1.5 py-0.5 bg-[var(--pulse-bg)] border border-zinc-800 rounded text-[10px] text-zinc-400 focus:outline-none focus:border-[var(--pulse-accent)]/40 cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

type PriorityFilter = 'all' | 'high' | 'medium';
type SourceFilter = 'all' | 'notion' | 'twitter';

export default function RiskFlowPanel({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { alerts, highCount, mediumCount, clearAll, removeAlert, markSeen, markAllSeen, isSeen } = useRiskFlow();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showProposals, setShowProposals] = useState(false);
  const [expandedInternal, setExpandedInternal] = useState(true);
  const [selectedIdea, setSelectedIdea] = useState<TradeIdeaDetail | null>(null);
  const sourceStatus = useSourceStatus();
  const expanded = collapsed != null ? !collapsed : expandedInternal;

  const ideaCount = alerts.filter((a) => a.source === 'notion-trade-idea').length;

  const filtered = (() => {
    let base = alerts;
    if (showProposals) return base.filter((a) => a.source === 'notion-trade-idea');
    if (priorityFilter === 'high') base = base.filter((a) => a.severity === 'high' || a.severity === 'critical');
    else if (priorityFilter === 'medium') base = base.filter((a) => a.severity === 'medium');
    if (sourceFilter === 'notion') base = base.filter((a) => a.source === 'notion-trade-idea' || (a.source as string).toLowerCase().includes('notion'));
    else if (sourceFilter === 'twitter') base = base.filter((a) => (a.source as string).toLowerCase().includes('twitter') || (a.source as string) === 'TwitterCli' || (a.source as string) === 'FinancialJuice');
    return base;
  })();

  const collapsedPreviewItems = alerts.slice(0, 2);

  React.useEffect(() => {
    if (!expanded) return;
    markAllSeen(filtered.map((item) => item.id));
  }, [expanded, filtered, markAllSeen]);

  return (
    <>
      {selectedIdea && (
        <TradeIdeaModal idea={selectedIdea} onClose={() => setSelectedIdea(null)} />
      )}

      <div className="h-full flex flex-col bg-[var(--pulse-surface)]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--pulse-accent)]/20">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[var(--pulse-accent)]" />
            <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-[var(--pulse-accent)]">RiskFlow</h3>
            {highCount > 0 && (
              <span className="riskflow-pulse-badge inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/30 text-red-400 text-[9px] font-bold">
                {highCount}
              </span>
            )}
            {ideaCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-sm bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] text-[9px] font-bold tracking-wider">
                {ideaCount} proposal{ideaCount !== 1 ? 's' : ''}
              </span>
            )}
            <div className="flex items-center gap-2 ml-1">
              <StatusDot active={sourceStatus.notion} label="NTN" />
              <StatusDot active={sourceStatus.twitterCli} label="X" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {alerts.length > 0 && (
              <button type="button" onClick={clearAll} className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors" title="Clear all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { if (onToggleCollapsed) onToggleCollapsed(); else setExpandedInternal(!expandedInternal); }}
              className="p-1 rounded hover:bg-[var(--pulse-accent)]/10 text-zinc-500 hover:text-[var(--pulse-accent)] transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
            {/* Filter row */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-zinc-800/50 flex-wrap">
              <FilterDropdown<PriorityFilter>
                value={showProposals ? 'all' : priorityFilter}
                options={[
                  { value: 'all', label: `Priority: All` },
                  { value: 'high', label: `High (${highCount})` },
                  { value: 'medium', label: `Med (${mediumCount})` },
                ]}
                onChange={(v) => { setShowProposals(false); setPriorityFilter(v); }}
              />
              <FilterDropdown<SourceFilter>
                value={showProposals ? 'all' : sourceFilter}
                options={[
                  { value: 'all', label: 'Source: All' },
                  { value: 'notion', label: 'Notion' },
                  { value: 'twitter', label: 'X / FJ' },
                ]}
                onChange={(v) => { setShowProposals(false); setSourceFilter(v); }}
              />
              <button
                onClick={() => setShowProposals((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  showProposals
                    ? 'bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)]'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                Proposals{ideaCount > 0 ? ` (${ideaCount})` : ''}
              </button>
            </div>

            {/* Alert list */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-zinc-700 text-xs">
                  {alerts.length === 0 ? 'Polling Sources…' : 'No matching alerts'}
                </div>
              ) : (
                filtered.map((alert) =>
                  alert.source === 'notion-trade-idea' && alert.tradeIdea ? (
                    <TradeIdeaRow
                      key={alert.id}
                      alert={alert}
                      onDelete={removeAlert}
                      onOpen={setSelectedIdea}
                      onMarkSeen={markSeen}
                      seen={isSeen(alert.id)}
                    />
                  ) : (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onDelete={removeAlert}
                      onMarkSeen={markSeen}
                      seen={isSeen(alert.id)}
                    />
                  )
                )
              )}
            </div>
        </div>

        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${!expanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
        {!expanded && (
          <div className="px-2 pb-2">
            {collapsedPreviewItems.length === 0 ? (
              <div className="rounded border border-zinc-800/80 bg-[#080806] px-3 py-2 text-[11px] text-zinc-600">
                No recent items
              </div>
            ) : (
              <div className="rounded border border-[var(--pulse-accent)]/20 bg-[#080806] overflow-hidden">
                {collapsedPreviewItems.map((item, idx) => {
                  const sev = SEVERITY_CONFIG[item.severity];
                  const seen = isSeen(item.id);
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markSeen(item.id)}
                      className={`block px-3 py-2 ${idx < collapsedPreviewItems.length - 1 ? 'border-b border-zinc-800/80' : ''} ${seen ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-semibold tracking-wider ${sev.text}`}>
                          {sev.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
                          {item.source === 'notion-trade-idea' ? 'proposal' : item.source}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-300 line-clamp-1">
                        {item.headline}
                      </p>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Pulse animation styles */}
        <style>{`
          @keyframes riskflow-pulse {
            0%, 100% { box-shadow: none; }
            50% { box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.08); }
          }
          .riskflow-pulse-row { animation: riskflow-pulse 3s ease-in-out infinite; }
          @keyframes riskflow-badge-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.8; }
          }
          .riskflow-pulse-badge { animation: riskflow-badge-pulse 2s ease-in-out infinite; }
        `}</style>
      </div>
    </>
  );
}
