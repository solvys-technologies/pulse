import { Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LockedCard } from '../ui/LockedCard';

export function BlindspotsWidget() {
  const { tier } = useAuth();
  const isLocked = tier === 'free';

  const blindspots = [
    { id: 1, text: 'Overtrading in low volatility environments', severity: 'high' },
    { id: 2, text: 'Confirmation bias on bullish setups', severity: 'medium' },
    { id: 3, text: 'Revenge trading after losses', severity: 'high' },
  ];

  const content = (
    <div className="bg-[#050500] border border-[#FFC038]/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-[#FFC038]" />
        <h3 className="text-sm font-semibold text-[#FFC038]">Blindspots</h3>
      </div>
      <div className="space-y-2">
        {blindspots.map(spot => (
          <div
            key={spot.id}
            className="text-xs p-2 rounded bg-black/30 border-l-2 border-l-red-500"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-300 flex-1">{spot.text}</span>
              <span
                className={`text-xs uppercase whitespace-nowrap ${
                  spot.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                }`}
              >
                {spot.severity === 'medium' ? 'MED' : spot.severity.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return <LockedCard locked={isLocked}>{content}</LockedCard>;
}
