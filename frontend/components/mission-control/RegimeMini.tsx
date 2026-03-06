// [claude-code 2026-03-06] Mission Control mini-screener for active/upcoming trading regimes
import { useState, useEffect } from 'react';
import { Clock, TrendingUp, TrendingDown, RotateCcw, Activity } from 'lucide-react';
import { useRegimes } from '../../lib/regime-store';
import { isRegimeActive, getTimeRemaining, getCurrentETTime, getUpcomingRegimes } from '../../lib/regime-time';
import type { TradingRegime } from '../../lib/regimes';

function BiasBadge({ bias }: { bias: TradingRegime['bias'] }) {
  const config = {
    long: { label: 'LONG', color: 'text-emerald-400', icon: TrendingUp },
    short: { label: 'SHORT', color: 'text-red-400', icon: TrendingDown },
    fade: { label: 'FADE', color: 'text-orange-400', icon: RotateCcw },
    neutral: { label: 'NTRL', color: 'text-gray-400', icon: Activity },
  }[bias];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tracking-wider ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

interface RegimeMiniProps {
  onOpenFullTracker?: () => void;
}

export function RegimeMini({ onOpenFullTracker }: RegimeMiniProps) {
  const { regimes } = useRegimes();
  const [now, setNow] = useState(getCurrentETTime);

  useEffect(() => {
    const interval = setInterval(() => setNow(getCurrentETTime()), 15_000);
    return () => clearInterval(interval);
  }, []);

  const active = regimes.filter((r) => isRegimeActive(r, now));
  const upcoming = getUpcomingRegimes(regimes, 120, now);

  return (
    <div className="bg-[#050500] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
          <h3 className="text-[11px] font-semibold text-[#D4AF37] tracking-wide uppercase">Regimes</h3>
          {active.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[9px] font-bold">
              {active.length}
            </span>
          )}
        </div>
        {onOpenFullTracker && (
          <button
            onClick={onOpenFullTracker}
            className="text-[9px] text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors tracking-wider uppercase"
          >
            View All
          </button>
        )}
      </div>

      {active.length === 0 && upcoming.length === 0 && (
        <div className="text-[10px] text-zinc-600 py-2">No active or upcoming regimes</div>
      )}

      {/* Active regimes */}
      {active.map((r) => {
        const winRate = r.record.wins + r.record.losses > 0
          ? Math.round((r.record.wins / (r.record.wins + r.record.losses)) * 100)
          : 0;
        return (
          <div
            key={r.id}
            className="mb-1.5 px-2 py-1.5 border border-[#D4AF37]/30 bg-[#D4AF37]/5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#f0ead6] truncate">{r.name}</span>
              <BiasBadge bias={r.bias} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[9px] text-[#D4AF37]/70">{getTimeRemaining(r, now)}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-500">{r.record.wins}W-{r.record.losses}L ({winRate}%)</span>
                <span className={`text-[9px] font-semibold ${r.confidence >= 70 ? 'text-emerald-400' : r.confidence >= 50 ? 'text-yellow-500' : 'text-red-400'}`}>
                  {r.confidence}%
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Upcoming regimes (dimmed) */}
      {upcoming.map((r) => (
        <div
          key={r.id}
          className="mb-1 px-2 py-1 opacity-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-400 truncate">{r.name}</span>
            <BiasBadge bias={r.bias} />
          </div>
          <div className="text-[9px] text-zinc-600 mt-0.5">{getTimeRemaining(r, now)}</div>
        </div>
      ))}
    </div>
  );
}
