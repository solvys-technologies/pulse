// [claude-code 2026-03-11] Redesigned to consume backend IVScoreResponse — point range, rationale tooltip, environment label
// [claude-code 2026-03-12] VIX spike notice shows only once per session (sessionStorage guard)
import { Info, TrendingUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { IVScoreResponse } from '../types/market-data';

interface IVScoreCardProps {
  /** Backend blended IV score response */
  data: IVScoreResponse | null;
  /** Loading state while first fetch is in-flight */
  loading?: boolean;
  layoutOption?: 'tickers-only' | 'combined';
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-red-500';
  if (score >= 6) return 'text-orange-400';
  if (score >= 4) return 'text-yellow-400';
  return 'text-emerald-400';
}

function getEnvironmentLabel(score: number): string {
  if (score >= 8) return 'Extreme';
  if (score >= 6) return 'High';
  if (score >= 4) return 'Moderate';
  if (score >= 2) return 'Normal';
  return 'Low';
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case 'extreme': return 'text-red-500';
    case 'high': return 'text-orange-400';
    case 'elevated': return 'text-yellow-400';
    case 'moderate': return 'text-blue-400';
    default: return 'text-emerald-400';
  }
}

const VIX_SPIKE_SESSION_KEY = 'pulse_vix_spike_shown';

export function IVScoreCard({ data, loading, layoutOption }: IVScoreCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [spikeAcknowledged, setSpikeAcknowledged] = useState(() => {
    try { return sessionStorage.getItem(VIX_SPIKE_SESSION_KEY) === '1'; } catch { return false; }
  });

  // Mark spike as shown once per session
  useEffect(() => {
    if (data?.vix.isSpike && !spikeAcknowledged) {
      // Auto-acknowledge after 10 seconds
      const t = setTimeout(() => {
        setSpikeAcknowledged(true);
        try { sessionStorage.setItem(VIX_SPIKE_SESSION_KEY, '1'); } catch {}
      }, 10_000);
      return () => clearTimeout(t);
    }
  }, [data?.vix.isSpike, spikeAcknowledged]);

  if (loading || !data) {
    return (
      <div className="relative bg-[var(--pulse-bg)] border border-[var(--pulse-accent)]/20 rounded-lg px-3 h-8 flex items-center">
        <span className="text-[10px] text-gray-500">IV Score</span>
        <span className="text-sm font-bold text-gray-600 ml-2">--</span>
      </div>
    );
  }

  const color = getScoreColor(data.score);
  const envLabel = getEnvironmentLabel(data.score);
  const pts = data.points;

  return (
    <div className="relative bg-[var(--pulse-bg)] border border-[var(--pulse-accent)]/20 rounded-lg px-3 h-8 flex items-center">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400">IV</span>
        <span className={`text-sm font-bold ${color}`}>
          {data.score.toFixed(1)}
        </span>
        <span className={`text-[10px] font-medium ${color}`}>
          {envLabel}
        </span>

        {/* Implied point range */}
        {pts && (
          <>
            <span className="text-gray-600">|</span>
            <TrendingUp className="w-3 h-3 text-[var(--pulse-accent)]" />
            <span className="text-[10px] text-[var(--pulse-accent)] font-medium">
              ±{pts.scaledPoints} pts
            </span>
            <span className={`text-[9px] font-medium ${getUrgencyColor(pts.urgency)}`}>
              {pts.urgency}
            </span>
          </>
        )}

        {/* Info button for rationale tooltip */}
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-gray-500 hover:text-gray-400 transition-colors ml-0.5"
        >
          <Info className="w-2.5 h-2.5" />
        </button>
      </div>

      {showTooltip && (
        <div
          className={`absolute top-full mt-2 w-80 bg-[var(--pulse-surface)] border border-[var(--pulse-accent)]/30 rounded-lg p-4 shadow-xl z-50 ${
            layoutOption === 'tickers-only' ? 'right-0' : 'left-0'
          }`}
          style={{
            maxWidth: layoutOption === 'tickers-only' ? 'min(320px, calc(100vw - 2rem))' : '320px',
          }}
        >
          <h4 className="text-sm font-semibold text-[var(--pulse-accent)] mb-2">
            Blended IV Score
          </h4>
          <p className="text-xs text-gray-400 mb-3">
            60% VIX ({data.vix.level.toFixed(1)}) + 40% headline heat ({data.eventCount} events).
          </p>

          {/* Component breakdown */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-3 space-y-2">
            <h5 className="text-xs font-semibold text-gray-300 mb-1">Components</h5>
            {[
              { label: 'VIX Component', value: data.vixComponent, max: 10 },
              { label: 'Headline Component', value: data.headlineComponent, max: 10 },
            ].map(c => (
              <div key={c.label} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{c.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--pulse-accent)]"
                      style={{ width: `${(c.value / c.max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-300 w-8 text-right">{c.value.toFixed(1)}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] text-gray-300 font-medium">Blended</span>
              <span className="text-xs font-bold text-[var(--pulse-accent)]">{data.score.toFixed(1)}/10</span>
            </div>
          </div>

          {/* Implied point range detail */}
          {pts && (
            <div className="bg-[var(--pulse-accent)]/10 border border-[var(--pulse-accent)]/20 rounded-lg p-3 mb-3">
              <h5 className="text-xs font-semibold text-[var(--pulse-accent)] mb-1">
                Implied Range ({data.instrument})
              </h5>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">±{pts.scaledPoints}</span>
                <span className="text-xs text-gray-400">pts</span>
                <span className="text-xs text-gray-500">(${pts.scaledDollarRisk}/contract)</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                <span>Daily implied: ±{pts.implied.adjustedPoints.toFixed(1)} pts</span>
                <span>|</span>
                <span>Beta: {pts.implied.beta.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Rationale lines from backend */}
          {data.rationale.length > 0 && (
            <div className="mb-3 space-y-1">
              <h5 className="text-xs font-semibold text-gray-300">Rationale</h5>
              {data.rationale.map((line, i) => (
                <p key={i} className="text-[10px] text-gray-500">{line}</p>
              ))}
            </div>
          )}

          {/* VIX spike indicator — only shown once per session */}
          {data.vix.isSpike && !spikeAcknowledged && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
              <span className="text-[10px] text-red-400 font-medium">
                VIX spike detected ({data.vix.spikeDirection}) — {data.vix.percentChange.toFixed(1)}% change
              </span>
            </div>
          )}

          {/* Timestamp + staleness */}
          <div className="text-[9px] text-gray-600 flex items-center gap-2">
            <span>Updated: {new Date(data.timestamp).toLocaleTimeString()}</span>
            {data.vix.staleMinutes > 5 && (
              <span className="text-yellow-600">VIX data {data.vix.staleMinutes}m old</span>
            )}
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-3 pt-3 border-t border-zinc-800">
            {[
              { range: '0-2', label: 'Low', color: 'bg-emerald-400' },
              { range: '2-4', label: 'Normal', color: 'bg-emerald-400' },
              { range: '4-6', label: 'Moderate', color: 'bg-yellow-400' },
              { range: '6-8', label: 'High', color: 'bg-orange-400' },
              { range: '8-10', label: 'Extreme', color: 'bg-red-500' },
            ].map(item => (
              <div key={item.range} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-xs text-gray-300"><strong>{item.range}:</strong> {item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
