import { Info, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface IVScoreCardProps {
  score: number;
}

// Instrument configurations for point move calculations
const INSTRUMENT_CONFIG = {
  "/MNQ": {
    tickSize: 0.25,
    typicalDailyRange: 250,
    currentPrice: 21000,
  },
  "/ES": {
    tickSize: 0.25,
    typicalDailyRange: 40,
    currentPrice: 6000,
  },
  "/NQ": {
    tickSize: 0.25,
    typicalDailyRange: 160,
    currentPrice: 21000,
  },
  "/YM": {
    tickSize: 1.0,
    typicalDailyRange: 350,
    currentPrice: 44000,
  },
  "/RTY": {
    tickSize: 0.10,
    typicalDailyRange: 20,
    currentPrice: 2200,
  },
} as const;

function calculateExpectedMove(ivScore: number, symbol: string) {
  const config = INSTRUMENT_CONFIG[symbol as keyof typeof INSTRUMENT_CONFIG];
  if (!config) return null;

  // Convert IV score (0-10) to volatility multiplier
  const volatilityMultiplier = (ivScore / 10) * 1.5;

  // Calculate expected point move
  const expectedPoints = config.typicalDailyRange * volatilityMultiplier;

  // Calculate as percentage
  const expectedPercent = (expectedPoints / config.currentPrice) * 100;

  return {
    points: Math.round(expectedPoints * 100) / 100,
    percent: Math.round(expectedPercent * 100) / 100,
  };
}

interface IVScoreCardProps {
  score: number;
  variant?: 'default' | 'frosted';
  layoutOption?: 'movable' | 'tickers-only' | 'combined';
}

export function IVScoreCard({ score, variant = 'default', layoutOption }: IVScoreCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { selectedSymbol } = useSettings();

  // Calculate expected move for user's selected instrument
  const expectedMove = calculateExpectedMove(score, selectedSymbol.symbol);

  const getScoreColor = () => {
    if (score >= 8) return 'text-red-500';
    if (score >= 6) return 'text-orange-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getScoreLabel = () => {
    if (score >= 8) return 'Extreme';
    if (score >= 6) return 'High';
    if (score >= 4) return 'Moderate';
    return 'Low';
  };

  const getBarColor = () => {
    if (score >= 8) return 'bg-red-500';
    if (score >= 6) return 'bg-orange-400';
    if (score >= 4) return 'bg-yellow-400';
    return 'bg-emerald-400';
  };

  const containerClasses = variant === 'frosted'
    ? 'relative backdrop-blur-2xl bg-gradient-to-br from-[#050500]/60 to-[#050500]/40 border border-[#D4AF37]/30 rounded-xl px-3 py-1.5 shadow-lg'
    : 'relative bg-[#050500] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5';
  
  const frostedStyle = variant === 'frosted' ? {
    backdropFilter: 'blur(20px) saturate(150%)',
    WebkitBackdropFilter: 'blur(20px) saturate(150%)',
  } : {};

  return (
    <div className={`${containerClasses} relative`} style={frostedStyle}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400">IV Score</span>
        <span className={`text-sm font-bold ${getScoreColor()}`}>
          {score.toFixed(1)}
        </span>
        <span className={`text-[10px] font-medium ${getScoreColor()}`}>
          {getScoreLabel()}
        </span>
        {expectedMove && (
          <>
            <span className="text-gray-600">|</span>
            <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
            <span className="text-[10px] text-[#D4AF37] font-medium">
              ±{expectedMove.points} pts ({selectedSymbol.symbol})
            </span>
          </>
        )}
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
          className={`absolute top-full mt-2 w-80 bg-[#0a0a00] border border-[#D4AF37]/30 rounded-lg p-4 shadow-xl z-50 ${
            layoutOption === 'tickers-only' ? 'right-0' : 'left-0'
          }`}
          style={{
            maxWidth: layoutOption === 'tickers-only' ? 'min(320px, calc(100vw - 2rem))' : '320px',
            ...(layoutOption === 'tickers-only' ? {
              right: '0',
              left: 'auto'
            } : {
              left: '0',
              right: 'auto'
            })
          }}
        >
          <h4 className="text-sm font-semibold text-[#D4AF37] mb-2">Implied Volatility Score</h4>
          <p className="text-xs text-gray-400 mb-3">
            Measures expected market volatility using Black-Scholes methodology. Higher scores indicate greater expected price swings.
          </p>

          {expectedMove && (
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-lg p-3 mb-3">
              <h5 className="text-xs font-semibold text-[#D4AF37] mb-1">Expected Move for {selectedSymbol.symbol}</h5>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-white">±{expectedMove.points}</span>
                <span className="text-xs text-gray-400">points</span>
                <span className="text-xs text-gray-500">({expectedMove.percent.toFixed(2)}%)</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Basis-adjusted for {selectedSymbol.symbol} typical volatility profile
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-300"><strong>0-4:</strong> Low volatility, stable conditions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span className="text-xs text-gray-300"><strong>4-6:</strong> Moderate volatility, normal fluctuations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-xs text-gray-300"><strong>6-8:</strong> High volatility, significant moves expected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-gray-300"><strong>8-10:</strong> Extreme volatility, major market events</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
