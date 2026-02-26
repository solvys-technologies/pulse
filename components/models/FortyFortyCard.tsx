import React, { useState, useEffect } from 'react';
import {
  FortyFortySetup,
  ModelStatus,
  MODEL_METADATA,
  getMockSetup,
  evaluateSetup,
  validateEntry,
  getMockMarketData,
} from '../../lib/models/forty-forty-club';
import { Target, TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle, Radio } from 'lucide-react';

interface FortyFortyCardProps {
  expanded?: boolean;
}

const STATUS_CONFIG: Record<ModelStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  idle: { label: 'Idle', color: 'text-gray-400', bg: 'bg-gray-400/10', icon: <Radio className="w-3 h-3" /> },
  scanning: { label: 'Scanning', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', icon: <Activity className="w-3 h-3 animate-pulse" /> },
  setup_found: { label: 'Setup Found', color: 'text-green-400', bg: 'bg-green-400/10', icon: <CheckCircle className="w-3 h-3" /> },
  active_trade: { label: 'Active Trade', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: <Target className="w-3 h-3 animate-pulse" /> },
};

export function FortyFortyCard({ expanded = false }: FortyFortyCardProps) {
  const [status, setStatus] = useState<ModelStatus>('scanning');
  const [setup, setSetup] = useState<FortyFortySetup | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; reasons: string[] } | null>(null);
  const [isExpanded, setIsExpanded] = useState(expanded);

  // TODO: Replace with live market data subscription
  useEffect(() => {
    // Simulate scanning → setup found cycle with mock data
    const timer = setTimeout(() => {
      const mockData = getMockMarketData();
      const result = evaluateSetup(mockData);
      if (result) {
        setSetup(result);
        setStatus('setup_found');
        setValidation(validateEntry(result));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const statusCfg = STATUS_CONFIG[status as ModelStatus];

  return (
    <div className="bg-[#0a0a00] border border-[#D4AF37]/20 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-[#D4AF37]/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#D4AF37]/20 flex items-center justify-center">
            <span className="text-[#D4AF37] font-bold text-xs">40</span>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-[#D4AF37]">{MODEL_METADATA.name}</h3>
            <p className="text-[10px] text-gray-500">{setup?.instrument ?? '/MNQ'} • {setup?.timeframe ?? '15m'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.color} ${statusCfg.bg}`}>
            {statusCfg.icon}
            {statusCfg.label}
          </span>
        </div>
      </button>

      {/* Compact metrics row (always visible) */}
      <div className="px-3 pb-2 flex items-center gap-3 text-[10px]">
        {/* Ticks from level */}
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-[#D4AF37]/60" />
          <span className="text-gray-400">
            {setup ? `${setup.ticksFromLevel} ticks` : '—'}
          </span>
        </div>
        {/* EMA */}
        <div className="flex items-center gap-1">
          {setup?.emaAlignment === 'bullish' ? (
            <TrendingUp className="w-3 h-3 text-green-400" />
          ) : setup?.emaAlignment === 'bearish' ? (
            <TrendingDown className="w-3 h-3 text-red-400" />
          ) : (
            <Activity className="w-3 h-3 text-gray-400" />
          )}
          <span className={setup?.emaAlignment === 'bullish' ? 'text-green-400' : setup?.emaAlignment === 'bearish' ? 'text-red-400' : 'text-gray-400'}>
            {setup?.emaAlignment === 'bullish' ? '20>100' : setup?.emaAlignment === 'bearish' ? '20<100' : '—'}
          </span>
        </div>
        {/* Volume */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Vol:</span>
          <span className={setup && setup.volumeAtLevel >= 40 ? 'text-green-400' : 'text-gray-400'}>
            {setup ? `${setup.volumeAtLevel}%` : '—'}
          </span>
        </div>
        {/* Confidence */}
        {setup && (
          <div className="ml-auto flex items-center gap-1">
            <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${setup.confidence}%`,
                  backgroundColor: setup.confidence >= 70 ? '#22c55e' : setup.confidence >= 50 ? '#D4AF37' : '#ef4444',
                }}
              />
            </div>
            <span className="text-gray-400">{setup.confidence}%</span>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && setup && (
        <div className="border-t border-[#D4AF37]/10 p-3 space-y-3">
          {/* Key Level & Price */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500 text-[10px]">Key Level</span>
              <p className="text-[#D4AF37] font-mono font-semibold">{setup.keyLevel.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-gray-500 text-[10px]">Current Price</span>
              <p className="text-white font-mono font-semibold">{setup.currentPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Entry / Stop / Targets */}
          <div className="bg-[#050500] rounded-md p-2 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Entry Zone</span>
              <span className="text-[#D4AF37] font-mono">{setup.entryZone.low.toFixed(2)} — {setup.entryZone.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Stop Loss</span>
              <span className="text-red-400 font-mono">{setup.stopLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">R1 Target</span>
              <span className="text-green-400 font-mono">{setup.targets.r1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">R2 Target</span>
              <span className="text-green-400 font-mono">{setup.targets.r2.toFixed(2)}</span>
            </div>
          </div>

          {/* Direction badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              setup.direction === 'long' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
            }`}>
              {setup.direction === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {setup.direction}
            </span>
          </div>

          {/* Validation warnings */}
          {validation && !validation.valid && (
            <div className="space-y-1">
              {validation.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400/80">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rules summary */}
          <details className="text-[10px] text-gray-500">
            <summary className="cursor-pointer hover:text-gray-300 transition-colors">Model Rules</summary>
            <ul className="mt-1 space-y-0.5 pl-3 list-disc">
              {MODEL_METADATA.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
