// [claude-code 2026-03-06] Narrative card component — used in list and sidebar views
import { ExternalLink } from 'lucide-react';
import type { NarrativeItem } from '../../lib/services';

const VOL_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-[#166534]/30', text: 'text-[#22c55e]', label: 'Low' },
  gaining: { bg: 'bg-[#F59E0B]/15', text: 'text-[#F59E0B]', label: 'Gaining' },
  hot: { bg: 'bg-[#DC2626]/20', text: 'text-[#DC2626]', label: 'Hot' },
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'text-[#D4AF37]',
  Resolved: 'text-zinc-500',
  Watching: 'text-[#60a5fa]',
};

interface NarrativeCardProps {
  narrative: NarrativeItem;
  compact?: boolean;
  onClick?: (narrative: NarrativeItem) => void;
}

export function NarrativeCard({ narrative, compact = false, onClick }: NarrativeCardProps) {
  const vol = VOL_COLORS[narrative.volatility] ?? VOL_COLORS.low;

  return (
    <button
      type="button"
      onClick={() => onClick?.(narrative)}
      className="w-full text-left rounded-lg border border-[#D4AF37]/15 bg-[#0a0a00] hover:bg-[#D4AF37]/5 transition-colors p-3"
    >
      {/* Header: title + volatility */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[13px] font-semibold text-[#f0ead6] leading-tight flex-1 min-w-0 truncate">
          {narrative.title}
        </h4>
        <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${vol.bg} ${vol.text}`}>
          {vol.label}
        </span>
      </div>

      {/* Tags */}
      {narrative.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {narrative.tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#D4AF37]/20 text-[#D4AF37]/70 bg-[#D4AF37]/5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Instruments */}
      {narrative.instruments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {narrative.instruments.map((inst) => (
            <span
              key={inst}
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1a10] text-[#f0ead6]/60 font-mono"
            >
              {inst}
            </span>
          ))}
        </div>
      )}

      {/* Catalysts excerpt */}
      {!compact && narrative.catalysts && (
        <p className="text-[10px] text-[#f0ead6]/40 leading-relaxed line-clamp-2 mb-2">
          {narrative.catalysts}
        </p>
      )}

      {/* Footer: status + impact + link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-semibold ${STATUS_COLORS[narrative.status] ?? 'text-zinc-500'}`}>
            {narrative.status}
          </span>
          <span className="text-[9px] text-[#f0ead6]/30">
            Impact {narrative.impact}/10
          </span>
        </div>
        {narrative.notionUrl && (
          <a
            href={narrative.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#D4AF37]/40 hover:text-[#D4AF37] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </button>
  );
}
