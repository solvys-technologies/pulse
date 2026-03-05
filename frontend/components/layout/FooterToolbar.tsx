// [claude-code 2026-03-05] Phase 2A: Added iframe controls + heartbeat status
import { useState } from 'react';
import { ChevronUp, ChevronDown, Terminal, ExternalLink, SplitSquareVertical, Power } from 'lucide-react';
import { PLATFORM_LABELS, PLATFORM_URLS, type TradingPlatform } from '../TopStepXBrowser';

const RECENT_CHANGES: Array<{ date: string; summary: string }> = [
  { date: '2026-03-05', summary: 'Plan 1A/1B: Data layer, RiskFlow expansion, iframe preload, countdown timer.' },
  { date: '2026-03-03', summary: 'Phase 3A-C: Notion NTN brief + schedule backend; live Intraday PnL KPI.' },
  { date: '2026-03-03', summary: 'Phase 4B: Footer toolbar — changelog viewer, CLI input.' },
  { date: '2026-03-03', summary: 'Phase 2A-E: Kanban borders removed, 50/50 split, BlindspotsWidget dismiss/clear.' },
  { date: '2026-03-03', summary: 'Phase 4A/4C-D: Header -20%; VIX-derived IV score.' },
];

interface FooterToolbarProps {
  topStepXEnabled?: boolean;
  primaryPlatform?: TradingPlatform;
  onPrimaryPlatformChange?: (p: TradingPlatform) => void;
  splitViewEnabled?: boolean;
  onSplitViewToggle?: () => void;
  allowSplitView?: boolean;
  onPowerOff?: () => void;
}

export function FooterToolbar({
  topStepXEnabled = false,
  primaryPlatform = 'topstepx',
  onPrimaryPlatformChange,
  splitViewEnabled = false,
  onSplitViewToggle,
  allowSplitView = false,
  onPowerOff,
}: FooterToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const [cliInput, setCliInput] = useState('');

  const handleCli = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const cmd = cliInput.trim().toLowerCase();
    setCliInput('');
    if (cmd === 'help') { setExpanded(true); return; }
    if (cmd === 'changelog') { setExpanded((v) => !v); return; }
    console.log('[PulseCLI]', cmd);
  };

  return (
    <div className="flex-shrink-0 border-t border-[#D4AF37]/12 bg-[#050402]">
      {/* Expanded changelog panel */}
      {expanded && (
        <div className="px-4 py-2.5 border-b border-[#D4AF37]/10 max-h-36 overflow-y-auto space-y-1">
          {RECENT_CHANGES.map((entry, i) => (
            <div key={i} className="flex gap-3 text-[11px]">
              <span className="text-[#D4AF37]/50 shrink-0 font-mono w-24">{entry.date}</span>
              <span className="text-gray-500">{entry.summary}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar strip */}
      <div className="h-7 flex items-center gap-3 px-3">
        {/* Changelog toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
          title={expanded ? 'Hide changelog' : 'Show changelog'}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          <span className="font-mono tracking-[0.12em]">v7.0.1</span>
        </button>

        <div className="w-px h-3.5 bg-[#D4AF37]/10" />

        {/* CLI input */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Terminal className="w-3 h-3 text-[#D4AF37]/30 shrink-0" />
          <input
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            onKeyDown={handleCli}
            className="flex-1 bg-transparent text-[11px] text-gray-500 placeholder-gray-700 focus:outline-none font-mono"
            placeholder=">"
            spellCheck={false}
          />
        </div>

        {/* Iframe controls (when TopStepX active) */}
        {topStepXEnabled && (
          <>
            <div className="w-px h-3.5 bg-[#D4AF37]/10" />
            <select
              value={primaryPlatform}
              onChange={(e) => onPrimaryPlatformChange?.(e.target.value as TradingPlatform)}
              className="px-1.5 py-0.5 bg-[#050500] border border-[#D4AF37]/15 rounded text-[10px] text-[#D4AF37] focus:outline-none"
            >
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {allowSplitView && (
              <button
                type="button"
                onClick={onSplitViewToggle}
                className={`p-0.5 rounded transition-colors ${
                  splitViewEnabled
                    ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                    : 'text-gray-600 hover:text-[#D4AF37]'
                }`}
                title="Toggle split view"
              >
                <SplitSquareVertical className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => window.open(PLATFORM_URLS[primaryPlatform], '_blank', 'noopener,noreferrer')}
              className="p-0.5 rounded text-gray-600 hover:text-gray-300 transition-colors"
              title="Open in browser"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onPowerOff}
              className="p-0.5 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Power off iframe"
            >
              <Power className="w-3 h-3" />
            </button>
          </>
        )}

        {/* Heartbeat */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-700 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
          <span>heartbeat</span>
        </div>
        <div className="w-px h-3.5 bg-[#D4AF37]/10" />
        {/* System status dot */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-700 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          <span>pulse</span>
        </div>
      </div>
    </div>
  );
}
