// [claude-code 2026-03-13] T2: KPI header mirror, emotional control rating, blindspots section
import { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, Shield, Save, Eye, Heart } from 'lucide-react';
import { useBackend } from '../../lib/backend';
import { useERSafe } from '../../contexts/ERContext';
import type { JournalEntryItem, NotionPerformanceResponse, BlindspotItem } from '../../lib/services';

interface HumanPsychTabProps {
  entries: JournalEntryItem[];
  onRefresh: () => void;
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-black/30 border border-[var(--fintheon-accent)]/10 rounded p-2.5">
      <div className="text-[10px] text-[var(--fintheon-muted)]">{label}</div>
      <div className="text-base font-mono mt-0.5" style={{ color: color || 'var(--fintheon-text)' }}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-[var(--fintheon-muted)] mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 40;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DisciplineGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const color = pct >= 80 ? '#34D399' : pct >= 50 ? 'var(--fintheon-accent)' : '#EF4444';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}

export function HumanPsychTab({ entries, onRefresh }: HumanPsychTabProps) {
  const backend = useBackend();
  const er = useERSafe();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [emotionalRating, setEmotionalRating] = useState<number | null>(null);
  const [kpis, setKpis] = useState<NotionPerformanceResponse | null>(null);
  const [blindspots, setBlindspots] = useState<BlindspotItem[]>([]);
  const [blindspotSource, setBlindspotSource] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(e => e.date === today && e.type === 'human');

  useEffect(() => {
    if (todayEntry?.notes) setNotes(todayEntry.notes);
    if (todayEntry?.emotionalControlRating) setEmotionalRating(todayEntry.emotionalControlRating);
  }, [todayEntry]);

  // Fetch KPIs and blindspots on mount
  useEffect(() => {
    backend.notion.getPerformance().then(setKpis);
    backend.blindspots.getBlindspots().then(res => {
      setBlindspots(res.blindspots);
      setBlindspotSource(res.source);
    });
  }, [backend]);

  // Compute ER trend from recent entries
  const erTrendData = entries
    .filter(e => e.type === 'human' && e.erTrend?.length)
    .slice(0, 7)
    .reverse()
    .flatMap(e => e.erTrend ?? []);

  // Build live ER trend from context snapshots
  const liveSnapshots = er?.getRecentSnapshots?.() ?? [];
  const liveTrend = liveSnapshots.map(s => s.score).reverse();
  const combinedTrend = erTrendData.length > 0 ? erTrendData : liveTrend;

  // Total infractions this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weekEntries = entries.filter(e => e.type === 'human' && e.date >= weekAgo);
  const weekInfractions = weekEntries.reduce((s, e) => s + (e.infractions?.length ?? 0), 0);
  const avgDiscipline = weekEntries.length > 0
    ? Math.round(weekEntries.reduce((s, e) => s + (e.disciplineScore ?? 0), 0) / weekEntries.length)
    : 0;

  // ER-derived emotional control score (normalized 1-10)
  const erDerivedScore = er ? Math.max(1, Math.min(10, Math.round(5 + er.erScore * 2.5))) : null;

  // Parse KPI values for display
  const findKpi = (label: string) => kpis?.kpis?.find(k => k.label.toLowerCase().includes(label.toLowerCase()));
  const netPnl = findKpi('P&L') ?? findKpi('pnl') ?? findKpi('Net');
  const winRate = findKpi('Win Rate') ?? findKpi('win');
  const trades = findKpi('Trades') ?? findKpi('trades');
  const grade = findKpi('Grade') ?? findKpi('grade');

  const handleSaveDay = async () => {
    setSaving(true);
    try {
      const erTrend = liveTrend.length > 0 ? liveTrend : undefined;
      const infractions = er ? undefined : undefined; // populated from ER context on backend
      const disciplineScore = er
        ? Math.max(0, Math.min(100, Math.round(50 + (er.erScore * 5) - (er.infractionCount * 10))))
        : undefined;

      await backend.journal.saveEntry({
        type: 'human',
        date: today,
        erTrend,
        infractions,
        disciplineScore,
        emotionalControlRating: emotionalRating ?? undefined,
        notes: notes.trim() || undefined,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to save journal entry:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Header Mirror */}
      {kpis && kpis.kpis.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            label="Net P&L"
            value={netPnl?.value ?? '--'}
            sub={netPnl?.meta}
            color={netPnl?.value?.startsWith('-') ? '#EF4444' : '#34D399'}
          />
          <StatCard
            label="Win Rate"
            value={winRate?.value ?? '--'}
            sub={winRate?.meta}
            color={parseFloat(winRate?.value ?? '0') >= 50 ? '#34D399' : '#EF4444'}
          />
          <StatCard
            label="Trades Taken"
            value={trades?.value ?? '--'}
            sub={trades?.meta}
          />
          <StatCard
            label="P&L Grade"
            value={grade?.value ?? '--'}
            sub={grade?.meta}
            color="var(--fintheon-accent)"
          />
        </div>
      )}

      {/* ER Trend */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/10 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-[var(--fintheon-accent)]" />
          <span className="text-xs font-semibold text-[var(--fintheon-text)]">ER Trend</span>
          {er?.isMonitoring && (
            <span className="text-[10px] text-emerald-400 ml-auto">LIVE</span>
          )}
        </div>
        {combinedTrend.length >= 2 ? (
          <MiniSparkline
            data={combinedTrend}
            color={combinedTrend[combinedTrend.length - 1] < -0.5 ? '#EF4444' : '#34D399'}
          />
        ) : (
          <div className="text-[10px] text-[var(--fintheon-muted)] h-10 flex items-center">
            Start monitoring to see ER trend
          </div>
        )}
        {er && (
          <div className="flex items-center justify-between mt-1.5 text-[10px]">
            <span className="text-[var(--fintheon-muted)]">Current</span>
            <span className={`font-mono ${er.erScore < -0.5 ? 'text-red-500' : er.erScore > 0.5 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {er.erScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Infractions */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/10 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs font-semibold text-[var(--fintheon-text)]">Infractions</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-[var(--fintheon-muted)]">Today</div>
            <div className="text-lg font-mono text-[var(--fintheon-text)]">
              {er?.infractionCount ?? todayEntry?.infractions?.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--fintheon-muted)]">This Week</div>
            <div className="text-lg font-mono text-[var(--fintheon-text)]">{weekInfractions}</div>
          </div>
        </div>
        {todayEntry?.infractions && todayEntry.infractions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {todayEntry.infractions.map((inf, i) => (
              <span key={i} className="text-[9px] bg-red-500/10 border border-red-500/20 text-red-400 rounded px-1.5 py-0.5">
                {inf}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Discipline Score */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/10 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3.5 h-3.5 text-[var(--fintheon-accent)]" />
          <span className="text-xs font-semibold text-[var(--fintheon-text)]">Discipline</span>
        </div>
        <DisciplineGauge score={todayEntry?.disciplineScore ?? avgDiscipline} />
        <div className="text-[10px] text-[var(--fintheon-muted)] mt-1.5">
          7-day avg: {avgDiscipline}%
        </div>
      </div>

      {/* Session Notes */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/10 rounded-lg p-3">
        <div className="text-xs font-semibold text-[var(--fintheon-text)] mb-2">Session Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What happened today? How did you feel about your trades?"
          className="w-full h-20 bg-black/30 border border-[var(--fintheon-accent)]/10 rounded p-2 text-xs text-[var(--fintheon-text)] placeholder:text-[var(--fintheon-muted)] resize-none focus:outline-none focus:border-[var(--fintheon-accent)]/30"
        />
      </div>

      {/* Emotional Control Rating */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/10 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-3.5 h-3.5 text-[var(--fintheon-accent)]" />
          <span className="text-xs font-semibold text-[var(--fintheon-text)]">Emotional Control</span>
          {erDerivedScore && (
            <span className="text-[9px] text-[var(--fintheon-muted)] ml-auto">
              ER score: <span className="font-mono text-[var(--fintheon-accent)]">{erDerivedScore}/10</span>
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setEmotionalRating(n)}
              className={`flex-1 py-1.5 rounded text-[10px] font-mono transition-all ${
                emotionalRating === n
                  ? 'bg-[var(--fintheon-accent)] text-black font-semibold'
                  : 'bg-black/30 border border-[var(--fintheon-accent)]/10 text-[var(--fintheon-muted)] hover:border-[var(--fintheon-accent)]/30 hover:text-[var(--fintheon-text)]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-[var(--fintheon-muted)]">
          <span>Tilted</span>
          <span>Composed</span>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveDay}
        disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium bg-[var(--fintheon-accent)] text-black rounded hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
      >
        <Save className="w-3 h-3" />
        {saving ? 'Saving...' : 'Save Entry'}
      </button>

      {/* Blindspots */}
      <div className="bg-[var(--fintheon-surface)] border border-[var(--fintheon-accent)]/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-3.5 h-3.5 text-[var(--fintheon-accent)]" />
          <span className="text-xs font-semibold text-[var(--fintheon-text)]">Blindspots</span>
          {blindspotSource && blindspotSource !== 'error' && blindspotSource !== 'empty' && (
            <span className="text-[9px] text-[var(--fintheon-muted)] ml-auto">via {blindspotSource}</span>
          )}
        </div>
        {blindspots.length > 0 ? (
          <div className="space-y-1.5">
            {blindspots.map(spot => (
              <div
                key={spot.id}
                className={`flex items-start gap-2 p-2 rounded border ${
                  spot.severity === 'high'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-[var(--fintheon-accent)]/5 border-[var(--fintheon-accent)]/20'
                }`}
              >
                <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                  spot.severity === 'high' ? 'text-red-400' : 'text-[var(--fintheon-accent)]'
                }`} />
                <span className="text-[10px] text-[var(--fintheon-text)] leading-tight">{spot.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[var(--fintheon-muted)] py-3 text-center">
            {blindspotSource === 'error' || blindspotSource === 'empty'
              ? 'PsychAssist not configured — blindspots will appear once ER monitoring builds a profile'
              : 'No blindspots detected'}
          </div>
        )}
      </div>
    </div>
  );
}
