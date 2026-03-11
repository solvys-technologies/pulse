// [claude-code 2026-03-11] Compact RiskFlow card for The Tape in combined panels
import { ExternalLink } from 'lucide-react';
import type { RiskFlowAlert } from '../../lib/riskflow-feed';
import { SEVERITY_CONFIG } from '../../lib/severity-config';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function SourceDot({ source }: { source: string }) {
  const color =
    source === 'x' || source === 'twitter' ? '#1DA1F2' :
    source === 'notion-trade-idea' ? '#c79f4a' :
    source === 'marketwatch' ? '#14B8A6' :
    source === 'rss' ? '#F59E0B' : '#6B7280';
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />;
}

interface CompactRiskFlowCardProps {
  alert: RiskFlowAlert;
  seen?: boolean;
}

export function CompactRiskFlowCard({ alert, seen = false }: CompactRiskFlowCardProps) {
  const sev = SEVERITY_CONFIG[alert.severity];
  const isHigh = alert.severity === 'high' || alert.severity === 'critical';
  const showDirection = alert.direction && alert.direction !== 'Neutral';

  return (
    <a
      href={alert.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-start gap-2 px-2.5 py-2 rounded-md hover:bg-[var(--pulse-accent)]/5 transition-colors ${isHigh ? 'bg-red-500/5' : ''} ${seen ? 'opacity-60' : ''}`}
    >
      {/* Severity dot */}
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${sev.bg.replace('bg-', 'bg-').replace('/10', '')}`}
        style={{ backgroundColor: isHigh ? '#EF4444' : alert.severity === 'medium' ? '#F59E0B' : '#6B7280' }}
      />

      <div className="flex-1 min-w-0">
        {/* Headline */}
        <div className="flex items-center gap-1">
          {showDirection && (
            <span className={`text-[9px] font-bold ${
              alert.direction === 'Bullish' ? 'text-emerald-500' : 'text-red-400'
            }`}>
              {alert.direction === 'Bullish' ? '\u25B2' : '\u25BC'}
            </span>
          )}
          <p className={`text-[11px] leading-snug font-medium line-clamp-2 ${isHigh ? 'text-red-300' : 'text-zinc-300'} group-hover:text-white transition-colors`}>
            {alert.headline}
          </p>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <SourceDot source={alert.source} />
          <span className="text-[9px] text-zinc-600">{timeAgo(alert.publishedAt)}</span>
          {alert.authorHandle && (
            <span className="text-[9px] text-zinc-500 truncate max-w-[80px]">@{alert.authorHandle}</span>
          )}
          {alert.pointRange != null && alert.pointRange !== 0 && (
            <span className={`text-[9px] font-mono ${alert.pointRange > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
              {alert.pointRange > 0 ? '+' : ''}{alert.pointRange.toFixed(1)}pt
            </span>
          )}
          <ExternalLink className="w-2 h-2 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
        </div>
      </div>
    </a>
  );
}
