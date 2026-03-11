// [claude-code 2026-03-11] Mini Brief widget for Mission Control — compact daily brief view
import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useBackend } from '../../lib/backend';

export function BriefMiniWidget() {
  const backend = useBackend();
  const [briefText, setBriefText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const getBriefLabel = () => {
    const now = new Date();
    const day = now.getDay();
    const h = now.getHours();
    if (day === 0 || (day === 1 && h < 7)) return 'Tale of the Tape';
    const t = h * 60 + now.getMinutes();
    if (t >= 17 * 60 + 30) return 'Post-Market Brief';
    if (t >= 11 * 60) return 'Afternoon Brief';
    return 'Morning Brief';
  };

  const [label, setLabel] = useState(getBriefLabel);

  const fetchBrief = useCallback(async () => {
    try {
      setLabel(getBriefLabel());
      const items = await backend.notion.getMdbBrief();
      setBriefText(items[0]?.detail ?? '');
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, [backend]);

  useEffect(() => {
    fetchBrief();
    const interval = setInterval(fetchBrief, 60_000);
    return () => clearInterval(interval);
  }, [fetchBrief]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBrief();
    setRefreshing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[var(--pulse-accent)]" />
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--pulse-accent)]">{label}</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-0.5 rounded hover:bg-[var(--pulse-accent)]/10 text-zinc-600 hover:text-[var(--pulse-accent)] transition-colors disabled:opacity-40"
          title="Refresh brief"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!loaded ? (
          <div className="text-[10px] text-zinc-600 py-2">Loading brief...</div>
        ) : briefText ? (
          <p className="text-[10px] leading-relaxed text-zinc-400 border-l-2 border-[var(--pulse-accent)]/30 pl-2 line-clamp-[8]">
            {briefText}
          </p>
        ) : (
          <div className="text-[10px] text-zinc-600 py-2">No brief available</div>
        )}
      </div>
    </div>
  );
}
