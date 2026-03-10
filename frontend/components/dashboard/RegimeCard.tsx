// [claude-code 2026-03-06] Dashboard regime preview card — shows top 3 active/upcoming regimes
import { useState, useEffect, useMemo } from 'react';
import { Clock, TrendingUp, TrendingDown, RotateCcw, Activity } from 'lucide-react';
import { useRegimes } from '../../lib/regime-store';
import { isRegimeActive, getTimeRemaining, getCurrentETTime, getUpcomingRegimes } from '../../lib/regime-time';
import type { TradingRegime } from '../../lib/regimes';

function BiasIcon({ bias }: { bias: TradingRegime['bias'] }) {
  const config = {
    long: { color: 'text-emerald-400', Icon: TrendingUp },
    short: { color: 'text-red-400', Icon: TrendingDown },
    fade: { color: 'text-orange-400', Icon: RotateCcw },
    neutral: { color: 'text-zinc-400', Icon: Activity },
  }[bias];

  return <config.Icon className={`w-3 h-3 ${config.color}`} />;
}

interface RegimeCardProps {
  onOpenTracker: () => void;
}

export function RegimeCard({ onOpenTracker }: RegimeCardProps) {
  const { regimes } = useRegimes();
  const [now, setNow] = useState(getCurrentETTime);

  useEffect(() => {
    const interval = setInterval(() => setNow(getCurrentETTime()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const topRegimes = useMemo(() => {
    const active = regimes.filter((r) => isRegimeActive(r, now));
    const upcoming = getUpcomingRegimes(regimes, 120, now);
    return [...active, ...upcoming].slice(0, 3);
  }, [regimes, now]);

  const activeCount = regimes.filter((r) => isRegimeActive(r, now)).length;

  return (
    <div className="bg-[#0b0b08] border-l-2 border-[var(--pulse-accent)]/35 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-[var(--pulse-accent)]" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-[var(--pulse-accent)] font-semibold">Regime Tracker</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] text-[8px] font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={onOpenTracker}
          className="text-[9px] text-[var(--pulse-accent)]/50 hover:text-[var(--pulse-accent)] transition-colors tracking-wider uppercase"
        >
          Open
        </button>
      </div>

      {topRegimes.length === 0 ? (
        <div className="text-[10px] text-zinc-600">No active or upcoming regimes</div>
      ) : (
        <div className="space-y-1.5">
          {topRegimes.map((r) => {
            const active = isRegimeActive(r, now);
            return (
              <div key={r.id} className="flex items-center gap-2">
                <BiasIcon bias={r.bias} />
                <span className={`text-[10px] flex-1 truncate ${active ? 'text-[var(--pulse-text)] font-semibold' : 'text-zinc-500'}`}>
                  {r.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-12 h-1 bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full ${r.confidence >= 70 ? 'bg-emerald-500' : r.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${r.confidence}%` }}
                    />
                  </div>
                  <span className="text-[8px] text-zinc-600 w-10 text-right">
                    {active ? getTimeRemaining(r, now) : getTimeRemaining(r, now).replace('starts in ', '')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
