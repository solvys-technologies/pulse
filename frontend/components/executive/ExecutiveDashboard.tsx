import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useBackend } from '../../lib/backend';
import type { RiskFlowItem } from '../../types/api';
import {
  executiveKpis,
  executiveNeedToKnow,
  executiveSchedule,
  type ExecutiveScheduleItem,
} from './mockExecutiveData';

function KanbanTitle({
  title,
  tag,
  tone = 'gold',
  headerRight,
}: {
  title: string;
  tag?: string;
  tone?: 'gold' | 'violet' | 'cyan' | 'emerald';
  headerRight?: React.ReactNode;
}) {
  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    gold: 'text-[#D4AF37] border-[#D4AF37]/30',
    violet: 'text-[#a5b4fc] border-[#6366f1]/30',
    cyan: 'text-[#67e8f9] border-[#06b6d4]/30',
    emerald: 'text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="flex items-center justify-between px-1 py-1">
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-semibold text-[#D4AF37] tracking-[0.2em] uppercase">{title}</h2>
        {tag ? (
          <span
            className={`text-[9px] tracking-[0.22em] uppercase border rounded-full px-2 py-0.5 ${toneClasses[tone]}`}
          >
            {tag}
          </span>
        ) : null}
      </div>
      {headerRight}
    </div>
  );
}

/** Group schedule items by date and render with progressive fade for future days */
function SessionCalendarList({ items }: { items: ExecutiveScheduleItem[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const map = new Map<string, ExecutiveScheduleItem[]>();
    for (const item of items) {
      const key = item.date ?? todayStr;
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    // Sort date keys chronologically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [items, todayStr]);

  function formatDateLabel(dateStr: string): string {
    if (dateStr === todayStr) return 'Today';
    const d = new Date(dateStr + 'T12:00:00');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Opacity steps: today = full, tomorrow = 60%, day+2 = 40%, day+3+ = 25%
  const opacitySteps = [1, 0.6, 0.4, 0.25];

  return (
    <div className="space-y-1">
      {grouped.map(([dateStr, events], groupIdx) => {
        const isToday = dateStr === todayStr;
        const opacity = opacitySteps[Math.min(groupIdx, opacitySteps.length - 1)];

        return (
          <div key={dateStr} style={{ opacity }}>
            {/* Date divider — hidden for today's first group since the header says "Upcoming Events" */}
            {!isToday && (
              <div className="flex items-center gap-3 mt-3 mb-2 px-1">
                <div className="h-px flex-1 bg-[#06b6d4]/15" />
                <span className="text-[9px] tracking-[0.22em] uppercase text-gray-500 shrink-0">
                  {formatDateLabel(dateStr)}
                </span>
                <div className="h-px flex-1 bg-[#06b6d4]/15" />
              </div>
            )}
            <div className="space-y-2.5">
              {events.map((item) => (
                <div
                  key={`${dateStr}-${item.title}`}
                  className={`px-4 py-3 border-l-2 ${
                    isToday
                      ? 'bg-[#0b0b08] border-[#06b6d4]/45'
                      : 'bg-[#080806] border-[#06b6d4]/20'
                  }`}
                >
                  <div className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-400'}`}>
                    {item.title}
                  </div>
                  <div className={`mt-1 text-xs ${isToday ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.detail}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Forecast</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.forecast ?? '-'}</div>
                    </div>
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Actual</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.actual ?? '-'}</div>
                    </div>
                    <div className={isToday ? 'text-gray-500' : 'text-gray-600'}>
                      <span className="uppercase tracking-[0.16em]">Previous</span>
                      <div className={`mt-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>{item.previous ?? '-'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const DASHBOARD_PAGES = ['Briefing', 'Action Tape'];

export function ExecutiveDashboard() {
  const backend = useBackend();
  const [activePage, setActivePage] = useState(0); // default to Briefing
  const containerRef = useRef<HTMLDivElement>(null);
  const [ntnText, setNtnText] = useState(
    executiveNeedToKnow.map((item) => `• ${item.title} — ${item.detail}`).join('\n\n')
  );
  const [runningReport, setRunningReport] = useState(false);
  const reportTimerRef = useRef<number | null>(null);
  // Action tape: RiskFlow items (replaces Alerts + Signals)
  const [tapeItems, setTapeItems] = useState<RiskFlowItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchTape = async () => {
      try {
        const res = await backend.riskflow.list({ limit: 50 });
        if (!mounted) return;
        setTapeItems(res.items ?? []);
      } catch {
        // silent
      }
    };
    fetchTape();
    const id = window.setInterval(fetchTape, 30_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [backend]);

  const scrollToPage = useCallback((idx: number) => {
    setActivePage(idx);
    const el = containerRef.current;
    if (!el) return;
    const pages = el.querySelectorAll('[data-dash-page]');
    if (pages[idx]) {
      pages[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Detect which page is in view on scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const pages = el.querySelectorAll('[data-dash-page]');
    const scrollTop = el.scrollTop;
    const containerH = el.clientHeight;
    let closest = 0;
    let minDist = Infinity;
    pages.forEach((page, idx) => {
      const rect = page.getBoundingClientRect();
      const elTop = rect.top - el.getBoundingClientRect().top;
      const dist = Math.abs(elTop);
      if (dist < minDist) {
        minDist = dist;
        closest = idx;
      }
    });
    setActivePage(closest);
  }, []);

  const runNtnReport = async () => {
    if (runningReport) return;
    setRunningReport(true);

    if (reportTimerRef.current) {
      window.clearInterval(reportTimerRef.current);
      reportTimerRef.current = null;
    }

    try {
      const response = await backend.ai.generateNTNReport();
      const target = response?.report?.content?.trim() || 'NTN report returned no content.';
      let index = 0;
      setNtnText('');

      reportTimerRef.current = window.setInterval(() => {
        index += 14;
        setNtnText(target.slice(0, index));
        if (index >= target.length && reportTimerRef.current) {
          window.clearInterval(reportTimerRef.current);
          reportTimerRef.current = null;
          setRunningReport(false);
        }
      }, 25);
    } catch (error) {
      console.error('[Dashboard] NTN report generation failed:', error);
      setNtnText('Failed to run NTN report. Please try again.');
      setRunningReport(false);
    }
  };

  // Scroll to default page (Briefing) on mount
  useEffect(() => {
    const timer = setTimeout(() => scrollToPage(0), 50);
    return () => clearTimeout(timer);
  }, [scrollToPage]);

  return (
    <div className="h-full w-full flex relative">
      {/* Main scrollable area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth snap-y snap-mandatory"
      >
        {/* Page 1: Briefing (default) — NTK Brief + Session Calendar + Core KPIs + Action Tape */}
        <div data-dash-page="0" className="min-h-full snap-start p-5 flex flex-col">
          {/* Row 1: Need-to-Know Brief (left) + Session Calendar (right) */}
          <div className="shrink-0 grid grid-cols-1 xl:grid-cols-2 gap-6 mb-5" style={{ height: '380px' }}>
            {/* Need-to-Know Brief */}
            <div className="flex flex-col h-full min-h-0">
              <KanbanTitle
                title="Need-to-Know Brief"
                tone="gold"
                headerRight={
                  <button
                    onClick={runNtnReport}
                    disabled={runningReport}
                    className="text-[10px] tracking-[0.22em] uppercase rounded-full px-2 py-0.5 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {runningReport ? 'Running...' : 'Run Report'}
                  </button>
                }
              />
              <textarea
                value={ntnText}
                onChange={(e) => setNtnText(e.target.value)}
                className="mt-2 flex-1 min-h-0 w-full resize-none bg-[#0b0b08] px-4 py-3 text-sm text-gray-200 border-l-2 border-[#D4AF37]/40 focus:outline-none focus:border-[#D4AF37]"
                placeholder="NTN report output will stream here..."
              />
            </div>

            {/* Session Calendar */}
            <div className="flex flex-col h-full min-h-0">
              <KanbanTitle
                title="Session Calendar"
                tone="cyan"
                headerRight={
                  <span className="text-[9px] tracking-[0.22em] uppercase border rounded-full px-2 py-0.5 text-[#67e8f9] border-[#06b6d4]/30">
                    Upcoming Events
                  </span>
                }
              />
              <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1 relative">
                <SessionCalendarList items={executiveSchedule} />
              </div>
            </div>
          </div>

          {/* Row 2: Core KPIs — single horizontal row, static */}
          <div className="shrink-0 mb-5">
            <KanbanTitle title="Core KPIs" tone="emerald" />
            <div className="mt-2 grid grid-cols-2 xl:grid-cols-4 gap-3">
              {executiveKpis.map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-[#0b0b08] px-4 py-3 border-l-2 border-[#D4AF37]/35"
                >
                  <div className="text-[10px] tracking-[0.2em] uppercase text-gray-500">{kpi.label}</div>
                  <div className="mt-1.5 text-2xl font-semibold text-white">{kpi.value}</div>
                  <div className="mt-1 text-xs text-gray-400">{kpi.meta}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Action Tape — fills remaining space, fully scrollable, recency fade */}
          <div className="flex-1 min-h-0 flex flex-col">
            <KanbanTitle title="Action Tape" tag="Alerts + Signals" tone="emerald" />
            <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
              {tapeItems.length === 0 ? (
                <div className="text-xs text-gray-500 px-1 py-4">No actions in the feed right now.</div>
              ) : (
                tapeItems.map((item, idx) => {
                  const total = tapeItems.length;
                  const ratio = total <= 1 ? 0 : idx / (total - 1);
                  const opacity = Math.max(0.3, 1 - ratio * 0.7);
                  const borderOpacity = Math.max(0.15, 0.4 - ratio * 0.25);
                  const isVivid = idx < 4;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-3 py-2 border-l-2 ${
                        isVivid ? 'bg-[#0b0b08] border-emerald-500/40' : 'bg-[#080806]'
                      }`}
                      style={isVivid ? undefined : {
                        opacity,
                        borderLeftColor: `rgba(16, 185, 129, ${borderOpacity})`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.isBreaking && (
                            <span className="text-[9px] tracking-[0.18em] uppercase text-red-400 font-semibold">Breaking</span>
                          )}
                          {item.impact === 'high' && !item.isBreaking && (
                            <span className="text-[9px] tracking-[0.18em] uppercase text-amber-400 font-semibold">High</span>
                          )}
                          <span className={`text-xs font-semibold truncate ${isVivid ? 'text-white' : 'text-gray-400'}`}>
                            {item.title}
                          </span>
                        </div>
                        {item.summary && (
                          <div className={`mt-0.5 text-[11px] line-clamp-2 ${isVivid ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.summary}
                          </div>
                        )}
                      </div>
                      <div className={`shrink-0 text-[10px] ${isVivid ? 'text-gray-500' : 'text-gray-600'}`}>
                        {new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Page 2: Full Action Tape */}
        <div data-dash-page="1" className="min-h-full snap-start p-5 flex flex-col">
          <KanbanTitle title="Action Tape" tag="Full Feed" tone="emerald" />
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
            {tapeItems.length === 0 ? (
              <div className="text-xs text-gray-500 px-1 py-8 text-center">No actions in the feed right now.</div>
            ) : (
              tapeItems.map((item, idx) => {
                const total = tapeItems.length;
                const ratio = total <= 1 ? 0 : idx / (total - 1);
                const opacity = Math.max(0.35, 1 - ratio * 0.65);
                const borderOpacity = Math.max(0.15, 0.4 - ratio * 0.25);
                const isVivid = idx < 6;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 px-3 py-2.5 border-l-2 ${
                      isVivid ? 'bg-[#0b0b08] border-emerald-500/40' : 'bg-[#080806]'
                    }`}
                    style={isVivid ? undefined : {
                      opacity,
                      borderLeftColor: `rgba(16, 185, 129, ${borderOpacity})`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.isBreaking && (
                          <span className="text-[9px] tracking-[0.18em] uppercase text-red-400 font-semibold">Breaking</span>
                        )}
                        {item.impact === 'high' && !item.isBreaking && (
                          <span className="text-[9px] tracking-[0.18em] uppercase text-amber-400 font-semibold">High</span>
                        )}
                        <span className={`text-xs font-semibold truncate ${isVivid ? 'text-white' : 'text-gray-400'}`}>
                          {item.title}
                        </span>
                      </div>
                      {item.summary && (
                        <div className={`mt-0.5 text-[11px] line-clamp-2 ${isVivid ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.summary}
                        </div>
                      )}
                    </div>
                    <div className={`shrink-0 text-[10px] ${isVivid ? 'text-gray-500' : 'text-gray-600'}`}>
                      {new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Scroll-lock page indicators — vertical lines on the right */}
      <div className="shrink-0 w-6 flex flex-col items-center justify-center gap-3 py-8">
        {DASHBOARD_PAGES.map((label, idx) => (
          <button
            key={label}
            onClick={() => scrollToPage(idx)}
            className="group relative flex items-center justify-center"
            title={label}
          >
            <div
              className={`transition-all duration-300 rounded-full ${
                activePage === idx
                  ? 'w-[3px] h-8 bg-[#D4AF37]'
                  : 'w-[2px] h-5 bg-gray-700 hover:bg-gray-500'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

