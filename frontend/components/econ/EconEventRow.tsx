// [claude-code 2026-03-05] Expandable econ event row: importance dots, US flag, print table.
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEconCalendar } from '../../contexts/EconCalendarContext';
import type { EconEventItem, EconPrintItem } from '../../lib/services';

const IMPORTANCE_DOTS: Record<number, { count: number; color: string }> = {
  1: { count: 1, color: 'bg-zinc-500' },
  2: { count: 2, color: 'bg-[#D4AF37]' },
  3: { count: 3, color: 'bg-red-400' },
};

const FLAG_EMOJI: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  UK: '\u{1F1EC}\u{1F1E7}',
  GB: '\u{1F1EC}\u{1F1E7}',
  EU: '\u{1F1EA}\u{1F1FA}',
  JP: '\u{1F1EF}\u{1F1F5}',
  CA: '\u{1F1E8}\u{1F1E6}',
  AU: '\u{1F1E6}\u{1F1FA}',
  CN: '\u{1F1E8}\u{1F1F3}',
  CH: '\u{1F1E8}\u{1F1ED}',
};

function getSurpriseColor(direction: string | null, goodBeta: boolean): string {
  if (!direction) return 'text-zinc-400';
  if (direction === 'beat') return goodBeta ? 'text-emerald-400' : 'text-red-400';
  if (direction === 'miss') return goodBeta ? 'text-red-400' : 'text-emerald-400';
  return 'text-zinc-400';
}

interface EconEventRowProps {
  event: EconEventItem;
}

export function EconEventRow({ event }: EconEventRowProps) {
  const { fetchPrints } = useEconCalendar();
  const [expanded, setExpanded] = useState(false);
  const [prints, setPrints] = useState<EconPrintItem[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setLoadingPrints(true);
    fetchPrints(event.name).then((p) => {
      if (!cancelled) {
        setPrints(p.slice(0, 3));
        setLoadingPrints(false);
      }
    });
    return () => { cancelled = true; };
  }, [expanded, event.name, fetchPrints]);

  const imp = IMPORTANCE_DOTS[event.importance] ?? IMPORTANCE_DOTS[1];
  const flag = FLAG_EMOJI[event.country.toUpperCase()] ?? FLAG_EMOJI['US'];
  const hasActual = !!event.actual;

  return (
    <div className="group">
      {/* Main row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[#D4AF37]/5 transition-colors"
      >
        {/* Expand icon */}
        {expanded
          ? <ChevronDown className="w-3 h-3 text-[#D4AF37]/60 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
        }

        {/* Flag */}
        <span className="text-sm shrink-0" title={event.country}>{flag}</span>

        {/* Importance dots */}
        <div className="flex gap-0.5 shrink-0" title={`Importance: ${event.importance}`}>
          {Array.from({ length: imp.count }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${imp.color}`} />
          ))}
        </div>

        {/* Time */}
        {event.time && (
          <span className="text-[10px] text-zinc-500 font-mono shrink-0 w-12">
            {event.time}
          </span>
        )}

        {/* Event name */}
        <span className={`text-[11px] font-medium flex-1 min-w-0 truncate ${
          hasActual ? 'text-zinc-300' : 'text-zinc-100'
        }`}>
          {event.name}
        </span>

        {/* Print columns: Prev / Forecast / Actual */}
        <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
          <div className="w-14 text-right text-zinc-500" title="Previous">
            {event.previous ?? '-'}
          </div>
          <div className="w-14 text-right text-zinc-400" title="Forecast">
            {event.forecast ?? '-'}
          </div>
          <div className={`w-14 text-right font-semibold ${hasActual ? 'text-[#D4AF37]' : 'text-zinc-600'}`} title="Actual">
            {event.actual ?? '-'}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 pt-1 ml-6 border-l border-[#D4AF37]/15 space-y-2">
          {/* Definition */}
          {event.definition && (
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              {event.definition}
            </p>
          )}

          {/* Column headers for prints table */}
          {prints.length > 0 && (
            <div className="mt-2">
              <div className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">
                Last {prints.length} Print{prints.length !== 1 ? 's' : ''}
              </div>
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-1 font-medium">Date</th>
                    <th className="text-right py-1 font-medium">Prev</th>
                    <th className="text-right py-1 font-medium">Fcst</th>
                    <th className="text-right py-1 font-medium">Actual</th>
                    <th className="text-right py-1 font-medium">Surprise%</th>
                  </tr>
                </thead>
                <tbody>
                  {prints.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800/50">
                      <td className="py-1 text-zinc-400 font-mono">{p.date}</td>
                      <td className="py-1 text-right text-zinc-500 font-mono">{p.previous ?? '-'}</td>
                      <td className="py-1 text-right text-zinc-400 font-mono">{p.forecast ?? '-'}</td>
                      <td className="py-1 text-right text-zinc-200 font-mono font-semibold">{p.actual ?? '-'}</td>
                      <td className={`py-1 text-right font-mono font-semibold ${getSurpriseColor(p.direction, p.goodBeta)}`}>
                        {p.surprise != null ? `${p.surprise > 0 ? '+' : ''}${p.surprise.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {loadingPrints && (
            <div className="text-[10px] text-zinc-500 italic">Loading prints...</div>
          )}

          {!loadingPrints && prints.length === 0 && (
            <div className="text-[10px] text-zinc-600 italic">No historical prints available</div>
          )}
        </div>
      )}
    </div>
  );
}
