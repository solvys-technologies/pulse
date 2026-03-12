// [claude-code 2026-03-11] BlindspotsWidget — agent-controllable via backend ER monitoring
import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBackend } from '../../lib/backend';
import { LockedCard } from '../ui/LockedCard';
import { IS_INTERNAL_BUILD } from '../../lib/internal-build';
import type { BlindspotItem } from '../../lib/services';

const FALLBACK_BLINDSPOTS: BlindspotItem[] = [
  { id: 1, text: 'Overtrading in low volatility environments', severity: 'high' },
  { id: 2, text: 'Confirmation bias on bullish setups', severity: 'medium' },
  { id: 3, text: 'Revenge trading after losses', severity: 'high' },
];

export function BlindspotsWidget() {
  const { tier } = useAuth();
  const backend = useBackend();
  const isLocked = !IS_INTERNAL_BUILD && tier === 'free';
  const [blindspots, setBlindspots] = useState<BlindspotItem[]>(FALLBACK_BLINDSPOTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await backend.blindspots.getBlindspots();
        if (!cancelled && data.blindspots.length > 0) {
          setBlindspots(data.blindspots);
        }
      } catch {
        // keep fallback
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [backend]);

  const content = (
    <div className="bg-[var(--pulse-bg)] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--pulse-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--pulse-accent)]">Blindspots</h3>
        </div>
      </div>
      {blindspots.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-2">No active blindspots.</p>
      ) : (
        <div className="space-y-2">
          {blindspots.map(spot => (
            <div key={spot.id} className="text-xs p-2 rounded bg-black/30 border-l-2 border-l-red-500">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-300 flex-1">{spot.text}</span>
                <span className={`uppercase whitespace-nowrap ${spot.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {spot.severity === 'medium' ? 'MED' : spot.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return <LockedCard locked={isLocked}>{content}</LockedCard>;
}
