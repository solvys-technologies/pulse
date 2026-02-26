import React, { useState } from 'react';
import { useRiskFlow } from '../contexts/RiskFlowContext';
import { Zap, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import type { AlertSeverity, RiskFlowAlert } from '../lib/riskflow-feed';

// ── Severity config ────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; bg: string; text: string; border: string; glow?: string }> = {
  high: {
    label: 'HIGH',
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/40',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  },
  medium: {
    label: 'MED',
    bg: 'bg-[#D4AF37]/20',
    text: 'text-[#D4AF37]',
    border: 'border-[#D4AF37]/40',
  },
  low: {
    label: 'LOW',
    bg: 'bg-zinc-700/30',
    text: 'text-zinc-500',
    border: 'border-zinc-700/40',
  },
};

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

// ── Alert Row ──────────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: RiskFlowAlert }) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const isHigh = alert.severity === 'high';

  return (
    <a
      href={alert.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        group block px-3 py-2.5 border-b border-zinc-800/50
        hover:bg-[#D4AF37]/5 transition-colors cursor-pointer
        ${isHigh ? 'riskflow-pulse-row' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Severity badge */}
        <span className={`
          inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider
          ${sev.bg} ${sev.text} ${sev.border} border
          ${sev.glow || ''}
          flex-shrink-0 mt-0.5
        `}>
          {sev.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* Headline */}
          <p className={`text-xs leading-snug font-medium truncate ${isHigh ? 'text-red-300' : 'text-zinc-300'} group-hover:text-white transition-colors`}>
            {alert.headline}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-zinc-600">{timeAgo(alert.publishedAt)}</span>
            <span className="text-[10px] text-zinc-700">•</span>
            <span className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider">{alert.source}</span>
            <ExternalLink className="w-2.5 h-2.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
          </div>
        </div>
      </div>
    </a>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

type FilterMode = 'all' | 'high' | 'medium';

export default function RiskFlowPanel() {
  const { alerts, highCount, mediumCount } = useRiskFlow();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expanded, setExpanded] = useState(true);

  const filtered = filter === 'all' ? alerts
    : filter === 'high' ? alerts.filter(a => a.severity === 'high')
    : alerts.filter(a => a.severity === 'medium');

  return (
    <div className="h-full flex flex-col bg-[#0a0a00]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#D4AF37]/20">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-[#D4AF37]" />
          <h3 className="text-xs font-semibold tracking-[0.15em] uppercase text-[#D4AF37]">
            RiskFlow
          </h3>
          {highCount > 0 && (
            <span className="riskflow-pulse-badge inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/30 text-red-400 text-[9px] font-bold">
              {highCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-[#D4AF37]/10 text-zinc-500 hover:text-[#D4AF37] transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/50">
            {([['all', `All (${alerts.length})`], ['high', `High (${highCount})`], ['medium', `Med (${mediumCount})`]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterMode)}
                className={`
                  px-2 py-0.5 rounded text-[10px] font-medium transition-colors
                  ${filter === key
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-zinc-700 text-xs">
                {alerts.length === 0 ? 'Polling MarketWatch…' : 'No matching alerts'}
              </div>
            ) : (
              filtered.map(alert => <AlertRow key={alert.id} alert={alert} />)
            )}
          </div>
        </>
      )}

      {/* Pulse animation styles */}
      <style>{`
        @keyframes riskflow-pulse {
          0%, 100% { box-shadow: none; }
          50% { box-shadow: inset 0 0 12px rgba(239, 68, 68, 0.08); }
        }
        .riskflow-pulse-row {
          animation: riskflow-pulse 3s ease-in-out infinite;
        }
        @keyframes riskflow-badge-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        .riskflow-pulse-badge {
          animation: riskflow-badge-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
