// [claude-code 2026-03-05] Phase 2A: Added iframe controls + heartbeat status
// [claude-code 2026-03-07] Slide-up panel with Terminal + Changelog tabs
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Terminal, ExternalLink, SplitSquareVertical, Power, FileText } from 'lucide-react';
import { PLATFORM_LABELS, PLATFORM_URLS, type TradingPlatform } from '../TopStepXBrowser';
import { changelog } from '../../../src/lib/changelog';

type PanelTab = 'terminal' | 'changelog';

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal');
  const [cliInput, setCliInput] = useState('');
  const [cliHistory, setCliHistory] = useState<Array<{ type: 'input' | 'output'; text: string }>>([
    { type: 'output', text: 'Pulse CLI v7.0.1 — type "help" for commands' },
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliHistory]);

  // Focus input when terminal tab opens
  useEffect(() => {
    if (panelOpen && activeTab === 'terminal') {
      inputRef.current?.focus();
    }
  }, [panelOpen, activeTab]);

  const handleCli = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const cmd = cliInput.trim();
    if (!cmd) return;
    setCliInput('');

    const newHistory = [...cliHistory, { type: 'input' as const, text: cmd }];

    const lower = cmd.toLowerCase();
    if (lower === 'help') {
      newHistory.push({ type: 'output', text: 'Commands: help, changelog, clear, status, version' });
    } else if (lower === 'clear') {
      setCliHistory([{ type: 'output', text: 'Cleared.' }]);
      return;
    } else if (lower === 'changelog') {
      setActiveTab('changelog');
      newHistory.push({ type: 'output', text: 'Switched to changelog tab.' });
    } else if (lower === 'status') {
      newHistory.push({ type: 'output', text: `System: online | Backend: localhost:8080 | Agents: standby` });
    } else if (lower === 'version') {
      newHistory.push({ type: 'output', text: 'Pulse v7.0.1 | Build 2026-03-07' });
    } else {
      newHistory.push({ type: 'output', text: `Unknown command: ${cmd}` });
    }

    setCliHistory(newHistory);
  }, [cliInput, cliHistory]);

  const togglePanel = () => setPanelOpen((v) => !v);

  const openTab = (tab: PanelTab) => {
    if (panelOpen && activeTab === tab) {
      setPanelOpen(false);
    } else {
      setActiveTab(tab);
      setPanelOpen(true);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-[#D4AF37]/12 bg-[#050402]">
      {/* Slide-up panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: panelOpen ? '280px' : '0px' }}
      >
        <div className="h-[280px] flex flex-col border-b border-[#D4AF37]/10">
          {/* Panel tab bar */}
          <div className="flex items-center gap-0 border-b border-[#D4AF37]/10 bg-[#080806] shrink-0">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
                activeTab === 'terminal'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Terminal className="w-3 h-3" />
              Terminal
            </button>
            <button
              onClick={() => setActiveTab('changelog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
                activeTab === 'changelog'
                  ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <FileText className="w-3 h-3" />
              Changelog
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'terminal' && (
              <div className="h-full flex flex-col">
                {/* Terminal output */}
                <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] space-y-0.5">
                  {cliHistory.map((line, i) => (
                    <div key={i} className={line.type === 'input' ? 'text-[#D4AF37]' : 'text-zinc-500'}>
                      {line.type === 'input' ? `> ${line.text}` : line.text}
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
                {/* Terminal input */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-t border-[#D4AF37]/10 shrink-0">
                  <span className="text-[#D4AF37]/50 text-[11px] font-mono">{'>'}</span>
                  <input
                    ref={inputRef}
                    value={cliInput}
                    onChange={(e) => setCliInput(e.target.value)}
                    onKeyDown={handleCli}
                    className="flex-1 bg-transparent text-[11px] text-[#D4AF37] placeholder-zinc-700 focus:outline-none font-mono"
                    placeholder="type a command..."
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {activeTab === 'changelog' && (
              <div className="px-3 py-2 space-y-2">
                {changelog.slice(0, 20).map((entry, i) => (
                  <div key={i} className="flex gap-3 text-[11px]">
                    <span className="text-[#D4AF37]/40 shrink-0 font-mono w-[88px]">
                      {entry.date.slice(0, 10)}
                    </span>
                    <span className="text-zinc-400 shrink-0 font-mono w-[76px] text-[10px]">
                      {entry.agent}
                    </span>
                    <span className="text-zinc-500 flex-1">{entry.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar strip */}
      <div className="h-7 flex items-center gap-3 px-3">
        {/* Panel toggle */}
        <button
          onClick={togglePanel}
          className="flex items-center gap-1 text-[10px] text-[#D4AF37]/50 hover:text-[#D4AF37] transition-colors"
          title={panelOpen ? 'Close panel' : 'Open panel'}
        >
          {panelOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          <span className="font-mono tracking-[0.12em]">v7.0.1</span>
        </button>

        <div className="w-px h-3.5 bg-[#D4AF37]/10" />

        {/* Tab shortcuts */}
        <button
          onClick={() => openTab('terminal')}
          className={`flex items-center gap-1 text-[10px] transition-colors ${
            panelOpen && activeTab === 'terminal'
              ? 'text-[#D4AF37]'
              : 'text-zinc-600 hover:text-[#D4AF37]'
          }`}
          title="Terminal"
        >
          <Terminal className="w-3 h-3" />
        </button>
        <button
          onClick={() => openTab('changelog')}
          className={`flex items-center gap-1 text-[10px] transition-colors ${
            panelOpen && activeTab === 'changelog'
              ? 'text-[#D4AF37]'
              : 'text-zinc-600 hover:text-[#D4AF37]'
          }`}
          title="Changelog"
        >
          <FileText className="w-3 h-3" />
        </button>

        <div className="w-px h-3.5 bg-[#D4AF37]/10" />

        {/* Quick CLI — always available in toolbar */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Terminal className="w-3 h-3 text-[#D4AF37]/30 shrink-0" />
          <input
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && cliInput.trim()) {
                setPanelOpen(true);
                setActiveTab('terminal');
                handleCli(e);
              }
            }}
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
