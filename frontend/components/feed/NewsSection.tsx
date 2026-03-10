// [claude-code 2026-03-05] Add filter tabs: All, High, Medium, Proposals
// [claude-code 2026-03-10] Dropdown filters (Priority + Source), X/FJ filter, X CLI status dot.
// [claude-code 2026-03-10] T3: critical severity support in labels, points, color display
import { useEffect, useState, useMemo } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useRiskFlow } from '../../contexts/RiskFlowContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useSourceStatus } from '../../hooks/useSourceStatus';

type PriorityFilter = 'all' | 'high' | 'medium';
type SourceFilter = 'all' | 'notion' | 'twitter';

function severityLabel(severity: 'critical' | 'high' | 'medium' | 'low'): string {
  if (severity === 'critical') return 'CRITICAL';
  if (severity === 'high') return 'HIGH';
  if (severity === 'medium') return 'MEDIUM';
  return 'LOW';
}

type FlowTag = 'Commentary' | 'Econ' | 'Geopol';
type FlowBias = 'Bullish' | 'Bearish' | 'Neutral';
type FlowCycle = 'Cyclical' | 'Counter-cyclical';

const ECON_KEYWORDS = [
  'cpi', 'ppi', 'inflation', 'jobs', 'payroll', 'nfp', 'gdp', 'rate', 'fomc',
  'fed', 'yield', 'bond', 'claims', 'retail sales', 'pce', 'umich', 'consumer sentiment',
];

const GEOPOL_KEYWORDS = [
  'war', 'geopolitical', 'sanction', 'tariff', 'military', 'border', 'opec',
  'iran', 'china', 'russia', 'ukraine', 'conflict', 'election', 'embargo',
];

const BULLISH_KEYWORDS = [
  'beat', 'beats', 'rally', 'surge', 'gain', 'gains', 'up', 'cooling inflation',
  'below expectations', 'bullish', 'upgrade', 'easing',
];

const BEARISH_KEYWORDS = [
  'miss', 'misses', 'drop', 'selloff', 'fall', 'falls', 'down', 'crisis', 'downgrade',
  'hot inflation', 'above expectations', 'recession', 'panic',
];

function classifyTag(text: string): FlowTag {
  const lower = text.toLowerCase();
  if (GEOPOL_KEYWORDS.some((kw) => lower.includes(kw))) return 'Geopol';
  if (ECON_KEYWORDS.some((kw) => lower.includes(kw))) return 'Econ';
  return 'Commentary';
}

function classifyBias(text: string, direction?: 'long' | 'short' | 'neutral'): FlowBias {
  if (direction === 'long') return 'Bullish';
  if (direction === 'short') return 'Bearish';
  const lower = text.toLowerCase();
  const bull = BULLISH_KEYWORDS.some((kw) => lower.includes(kw));
  const bear = BEARISH_KEYWORDS.some((kw) => lower.includes(kw));
  if (bull && !bear) return 'Bullish';
  if (bear && !bull) return 'Bearish';
  return 'Neutral';
}

function classifyCycle(tag: FlowTag): FlowCycle {
  return tag === 'Commentary' ? 'Cyclical' : 'Counter-cyclical';
}

function impliedPoints(
  severity: 'critical' | 'high' | 'medium' | 'low',
  bias: FlowBias,
  tag: FlowTag
): number {
  const base = severity === 'critical' ? 24 : severity === 'high' ? 18 : severity === 'medium' ? 10 : 6;
  const multiplier = tag === 'Geopol' ? 1.4 : tag === 'Econ' ? 1.2 : 1.0;
  const signed = bias === 'Bullish' ? 1 : bias === 'Bearish' ? -1 : 0;
  return Number((base * multiplier * signed).toFixed(1));
}

function biasColor(bias: FlowBias): string {
  if (bias === 'Bullish') return 'text-emerald-400';
  if (bias === 'Bearish') return 'text-red-400';
  return 'text-zinc-400';
}

function cycleColor(cycle: FlowCycle): string {
  return cycle === 'Cyclical' ? 'text-cyan-400' : 'text-amber-400';
}

export function NewsSection() {
  const { alerts, markAllSeen, isSeen, notionPollStatus } = useRiskFlow();
  const { selectedSymbol } = useSettings();
  const sourceStatus = useSourceStatus();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showProposals, setShowProposals] = useState(false);

  useEffect(() => {
    markAllSeen(alerts.slice(0, 50).map((a) => a.id));
  }, [alerts, markAllSeen]);

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        new Notification('PULSE RiskFlow Alerts', {
          body: 'You will now receive notifications for breaking RiskFlow events',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const medCount = alerts.filter((a) => a.severity === 'medium').length;
  const proposalCount = alerts.filter((a) => a.source === 'notion-trade-idea').length;

  const items = useMemo(() => {
    if (showProposals) return alerts.slice(0, 50).filter((a) => a.source === 'notion-trade-idea');
    let base = alerts.slice(0, 50);
    if (priorityFilter === 'high') base = base.filter((a) => a.severity === 'high');
    else if (priorityFilter === 'medium') base = base.filter((a) => a.severity === 'medium');
    if (sourceFilter === 'notion') base = base.filter((a) => a.source === 'notion-trade-idea' || (a.source as string).toLowerCase().includes('notion'));
    else if (sourceFilter === 'twitter') base = base.filter((a) => (a.source as string) === 'TwitterCli' || (a.source as string) === 'FinancialJuice' || (a.source as string).toLowerCase().includes('twitter'));
    return base;
  }, [alerts, priorityFilter, sourceFilter, showProposals]);

  return (
    <div className="h-full overflow-y-auto px-5 pt-4 pb-4">
      <div className="flex items-center justify-between mb-2 mt-1">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.12em]">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${notionPollStatus?.running ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span className={notionPollStatus?.running ? 'text-emerald-400/90' : 'text-zinc-500'}>NTN</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${sourceStatus.twitterCli ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            <span className={sourceStatus.twitterCli ? 'text-emerald-400/90' : 'text-zinc-500'}>X CLI</span>
          </span>
        </div>
        <button
          onClick={requestNotifications}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-[var(--pulse-accent)] transition-colors px-2 py-1"
        >
          {notificationsEnabled ? (
            <Bell className="w-3.5 h-3.5" />
          ) : (
            <BellOff className="w-3.5 h-3.5" />
          )}
          {notificationsEnabled ? 'Notifications On' : 'Notifications'}
        </button>
      </div>

      {/* Filter row: Priority dropdown + Source dropdown + Proposals tab */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={showProposals ? 'all' : priorityFilter}
          onChange={(e) => { setShowProposals(false); setPriorityFilter(e.target.value as PriorityFilter); }}
          className="text-[10px] px-2 py-1 rounded bg-[var(--pulse-bg)] border border-zinc-800 text-zinc-400 focus:outline-none focus:border-[var(--pulse-accent)]/40 cursor-pointer"
        >
          <option value="all">Priority: All ({alerts.length})</option>
          <option value="high">High ({highCount})</option>
          <option value="medium">Medium ({medCount})</option>
        </select>
        <select
          value={showProposals ? 'all' : sourceFilter}
          onChange={(e) => { setShowProposals(false); setSourceFilter(e.target.value as SourceFilter); }}
          className="text-[10px] px-2 py-1 rounded bg-[var(--pulse-bg)] border border-zinc-800 text-zinc-400 focus:outline-none focus:border-[var(--pulse-accent)]/40 cursor-pointer"
        >
          <option value="all">Source: All</option>
          <option value="notion">Notion</option>
          <option value="twitter">X / FJ</option>
        </select>
        <button
          onClick={() => setShowProposals((v) => !v)}
          className={`text-[10px] px-2.5 py-1 rounded transition-colors border ${
            showProposals
              ? 'bg-[var(--pulse-accent)]/20 text-[var(--pulse-accent)] border-[var(--pulse-accent)]/40'
              : 'text-zinc-500 hover:text-[var(--pulse-accent)] border-transparent'
          }`}
        >
          Proposals{proposalCount > 0 ? ` (${proposalCount})` : ''}
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>No RiskFlow items available</p>
            <p className="text-xs mt-2">Live feed is currently empty or disconnected</p>
          </div>
        ) : (
          items.map((item) => {
            const seen = isSeen(item.id);
            const combinedText = `${item.headline} ${item.summary} ${(item.tags || []).join(' ')}`;
            const tag = classifyTag(combinedText);
            const bias = classifyBias(combinedText, item.tradeIdea?.direction);
            const cycle = classifyCycle(tag);
            const points = impliedPoints(item.severity, bias, tag);
            return (
              <div
                key={item.id}
                className={`bg-[var(--pulse-bg)] border rounded-lg p-4 transition-colors border-b-2 ${
                  seen
                    ? 'border-zinc-800/60 opacity-70'
                    : 'border-[var(--pulse-accent)]/20 hover:border-[var(--pulse-accent)]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-[var(--pulse-accent)]">{item.source}</span>
                      <span className={`text-xs ${
                        item.severity === 'critical' ? 'text-orange-400' :
                        item.severity === 'high' ? 'text-red-400' :
                        item.severity === 'medium' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {severityLabel(item.severity)}
                      </span>
                      <span className={`text-xs ${cycleColor(cycle)}`}>{cycle}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${biasColor(bias)}`}>
                        {bias}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{item.headline}</h3>
                    </div>
                    {item.summary && (
                      <p className="text-xs text-gray-400 line-clamp-2">{item.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        {new Date(item.publishedAt).toLocaleString()}
                      </span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--pulse-accent)] hover:underline"
                        >
                          Read more →
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--pulse-accent)]/10">
                  <div className="flex-1 px-3 py-2 text-xs font-semibold text-center text-zinc-300">
                    {tag}
                  </div>
                  <div className={`flex-1 px-3 py-2 text-xs font-semibold text-center ${biasColor(bias)}`}>
                    {bias}
                  </div>
                  <div className={`flex-1 px-3 py-2 text-xs font-semibold text-center ${
                    points > 0 ? 'text-emerald-400' : points < 0 ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {points > 0 ? '+' : ''}{points.toFixed(1)} {selectedSymbol.symbol} pts
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
