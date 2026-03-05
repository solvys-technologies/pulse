// [claude-code 2026-03-05] Expandable tape item for ExecutiveDashboard — shows full RiskFlow detail on click
import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { SEVERITY_CONFIG } from '../../lib/severity-config';
import type { RiskFlowAlert, TradeIdeaDetail } from '../../lib/riskflow-feed';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ExpandableTapeItemProps {
  alert: RiskFlowAlert;
  isVivid: boolean;
  opacity: number;
  borderOpacity: number;
  seen: boolean;
  onOpenIdea: (idea: TradeIdeaDetail) => void;
}

export function ExpandableTapeItem({ alert, isVivid, opacity, borderOpacity, seen, onOpenIdea }: ExpandableTapeItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isTradeIdea = alert.source === 'notion-trade-idea' && !!alert.tradeIdea;
  const sev = SEVERITY_CONFIG[alert.severity];

  return (
    <div
      className={`border-l-2 ${
        isTradeIdea
          ? 'border-l-[#c79f4a]/50 bg-[#0b0b08]'
          : isVivid
            ? 'bg-[#0b0b08] border-emerald-500/40'
            : 'bg-[#080806]'
      }`}
      style={isVivid || isTradeIdea ? undefined : { opacity, borderLeftColor: `rgba(16, 185, 129, ${borderOpacity})` }}
    >
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isTradeIdea ? (
              <span className="inline-flex items-center justify-center w-4 h-4 border border-[#c79f4a]/40 bg-[#c79f4a]/10 flex-shrink-0">
                {alert.tradeIdea!.direction === 'long'
                  ? <TrendingUp className="w-2.5 h-2.5 text-[#c79f4a]" />
                  : <TrendingDown className="w-2.5 h-2.5 text-zinc-400" />}
              </span>
            ) : (
              <>
                {alert.severity === 'high' && (
                  <span className="text-[9px] tracking-[0.18em] uppercase text-red-400 font-semibold">Breaking</span>
                )}
                {alert.severity === 'medium' && (
                  <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold tracking-wider ${sev.bg} ${sev.text}`}>
                    {sev.label}
                  </span>
                )}
              </>
            )}
            <span className={`text-xs font-semibold truncate ${isVivid || isTradeIdea ? 'text-white' : 'text-gray-400'}`}>
              {alert.headline}
            </span>
          </div>
          {!expanded && alert.summary && alert.summary !== alert.headline && (
            <div className={`mt-0.5 text-[11px] line-clamp-1 ${isVivid ? 'text-gray-400' : 'text-gray-500'}`}>
              {alert.summary}
            </div>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <span className={`text-[10px] ${isVivid ? 'text-gray-500' : 'text-gray-600'}`}>
            {timeAgo(alert.publishedAt)}
          </span>
          {expanded
            ? <ChevronUp className="w-3 h-3 text-zinc-600" />
            : <ChevronDown className="w-3 h-3 text-zinc-600" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-zinc-800/40">
          {/* Summary */}
          {alert.summary && (
            <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">{alert.summary}</p>
          )}

          {/* Trade Idea detail */}
          {isTradeIdea && alert.tradeIdea && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {alert.tradeIdea.entry != null && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider">Entry</span>
                    <div className="mt-0.5 text-gray-300">${alert.tradeIdea.entry}</div>
                  </div>
                )}
                {alert.tradeIdea.stopLoss != null && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider">Stop</span>
                    <div className="mt-0.5 text-red-400/80">${alert.tradeIdea.stopLoss}</div>
                  </div>
                )}
                {alert.tradeIdea.takeProfit != null && (
                  <div>
                    <span className="text-gray-600 uppercase tracking-wider">Target</span>
                    <div className="mt-0.5 text-emerald-400/80">${alert.tradeIdea.takeProfit}</div>
                  </div>
                )}
              </div>
              {alert.tradeIdea.riskRewardRatio != null && (
                <div className="text-[10px] text-zinc-500">
                  R/R {alert.tradeIdea.riskRewardRatio.toFixed(1)}:1
                  {alert.tradeIdea.confidence && ` · ${alert.tradeIdea.confidence}% confidence`}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenIdea(alert.tradeIdea!); }}
                className="mt-1 text-[10px] text-[#c79f4a] hover:text-[#dbb85c] transition-colors uppercase tracking-wider"
              >
                View Full Proposal →
              </button>
            </div>
          )}

          {/* Regular alert detail */}
          {!isTradeIdea && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">{alert.source}</span>
              {alert.tags.length > 0 && (
                <div className="flex gap-1">
                  {alert.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/50 text-zinc-500">{tag}</span>
                  ))}
                </div>
              )}
              {alert.url && (
                <a
                  href={alert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Source
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
