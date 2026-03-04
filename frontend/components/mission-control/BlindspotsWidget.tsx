import { useState } from 'react';
import { Eye, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LockedCard } from '../ui/LockedCard';

const INITIAL_BLINDSPOTS = [
  { id: 1, text: 'Overtrading in low volatility environments', severity: 'high' },
  { id: 2, text: 'Confirmation bias on bullish setups', severity: 'medium' },
  { id: 3, text: 'Revenge trading after losses', severity: 'high' },
];

export function BlindspotsWidget() {
  const { tier } = useAuth();
  const isLocked = tier === 'free';
  const [blindspots, setBlindspots] = useState(INITIAL_BLINDSPOTS);

  const dismiss = (id: number) => setBlindspots((prev) => prev.filter((s) => s.id !== id));
  const clearAll = () => setBlindspots([]);

  const content = (
    <div className="bg-[#050500] border border-[#D4AF37]/20 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#D4AF37]" />
          <h3 className="text-sm font-semibold text-[#D4AF37]">Blindspots</h3>
        </div>
        {blindspots.length > 0 && (
          <button
            onClick={clearAll}
            className="p-1 hover:bg-[#D4AF37]/10 rounded transition-colors"
            title="Clear all"
          >
            <Trash2 className="w-3 h-3 text-zinc-500 hover:text-[#D4AF37]" />
          </button>
        )}
      </div>
      {blindspots.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-2">No active blindspots.</p>
      ) : (
        <div className="space-y-2">
          {blindspots.map(spot => (
            <div key={spot.id} className="group text-xs p-2 rounded bg-black/30 border-l-2 border-l-red-500">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-300 flex-1">{spot.text}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`uppercase whitespace-nowrap ${spot.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`}>
                    {spot.severity === 'medium' ? 'MED' : spot.severity.toUpperCase()}
                  </span>
                  <button
                    onClick={() => dismiss(spot.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return <LockedCard locked={isLocked}>{content}</LockedCard>;
}
