// [claude-code 2026-03-03] Phase 4B: Footer toolbar — changelog viewer, CLI input, system status
import { useState } from 'react';
import { ChevronUp, ChevronDown, Terminal } from 'lucide-react';

const RECENT_CHANGES: Array<{ date: string; summary: string }> = [
  { date: '2026-03-03', summary: 'Phase 3A-C: Notion NTN brief + schedule backend; live Intraday PnL KPI.' },
  { date: '2026-03-03', summary: 'Phase 4B: Footer toolbar — changelog viewer, CLI input.' },
  { date: '2026-03-03', summary: 'Phase 1C-D: Removed history panel; wired PulseSkillsPopup.' },
  { date: '2026-03-03', summary: 'Phase 2A-E: Kanban borders removed, 50/50 split, BlindspotsWidget dismiss/clear.' },
  { date: '2026-03-03', summary: 'Phase 4A/4C-D: Header -20%; VIX-derived IV score.' },
  { date: '2026-03-03', summary: 'Phase 1 autopilot: /api/trading/test-trade wired to Rithmic/ProjectX.' },
];

export function FooterToolbar() {
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

        {/* System status dot */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-700 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          <span>pulse</span>
        </div>
      </div>
    </div>
  );
}
