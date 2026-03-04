// [claude-code 2026-03-03] Extended: polls Notion trade ideas on 60s interval,
// injects them as RiskFlowAlerts with source='notion-trade-idea' pinned at top.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { riskFlowPoller, type RiskFlowAlert } from '../lib/riskflow-feed';
import baseBackend from '../lib/backend';

interface RiskFlowContextValue {
  alerts: RiskFlowAlert[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  clearAll: () => void;
  removeAlert: (id: string) => void;
}

const RiskFlowContext = createContext<RiskFlowContextValue>({
  alerts: [],
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  clearAll: () => {},
  removeAlert: () => {},
});

const NOTION_POLL_MS = 60_000;

export function RiskFlowProvider({ children }: { children: React.ReactNode }) {
  const [rssAlerts, setRssAlerts] = useState<RiskFlowAlert[]>([]);
  const [notionAlerts, setNotionAlerts] = useState<RiskFlowAlert[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const notionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MarketWatch RSS polling (unchanged)
  useEffect(() => {
    riskFlowPoller.start();
    const unsub = riskFlowPoller.subscribe(setRssAlerts);
    return () => {
      unsub();
      riskFlowPoller.stop();
    };
  }, []);

  // Notion trade idea polling
  const pollNotion = useCallback(async () => {
    try {
      const ideas = await baseBackend.notion.getTradeIdeas();
      const converted: RiskFlowAlert[] = ideas.map((idea) => ({
        id: `notion-ti-${idea.id}`,
        headline: `${idea.direction.toUpperCase()} ${idea.ticker}${idea.entry ? ` @ ${idea.entry}` : ''}`,
        summary: idea.openclawDescription
          ?? `${idea.ticker} — ${idea.direction} trade idea${idea.confidence ? ` (${idea.confidence} confidence)` : ''}`,
        url: idea.notionUrl,
        publishedAt: idea.createdAt,
        source: 'notion-trade-idea' as const,
        severity: (idea.confidence === 'high' || idea.confidence === 'max') ? 'high'
          : idea.confidence === 'medium' ? 'medium' : 'low',
        tags: [idea.ticker, idea.direction, idea.timeframe ?? ''].filter(Boolean),
        tradeIdea: {
          ticker: idea.ticker,
          direction: idea.direction,
          entry: idea.entry,
          stopLoss: idea.stopLoss,
          takeProfit: idea.takeProfit,
          potentialRisk: idea.potentialRisk,
          potentialProfit: idea.potentialProfit,
          riskRewardRatio: idea.riskRewardRatio,
          confidence: idea.confidence,
          timeframe: idea.timeframe,
          sourceAgent: idea.sourceAgent,
          openclawDescription: idea.openclawDescription,
          notionUrl: idea.notionUrl,
        },
      }));
      setNotionAlerts(converted);
    } catch (err) {
      console.warn('[RiskFlowContext] Notion poll error:', err);
    }
  }, []);

  useEffect(() => {
    void pollNotion();
    notionIntervalRef.current = setInterval(() => { void pollNotion(); }, NOTION_POLL_MS);
    return () => {
      if (notionIntervalRef.current) clearInterval(notionIntervalRef.current);
    };
  }, [pollNotion]);

  // Merge: Notion trade ideas pinned at top, then RSS alerts
  const merged = [...notionAlerts, ...rssAlerts];
  const visibleAlerts = merged.filter((a) => !dismissedIds.has(a.id));
  const highCount = visibleAlerts.filter((a) => a.severity === 'high').length;
  const mediumCount = visibleAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = visibleAlerts.filter((a) => a.severity === 'low').length;

  const clearAll = useCallback(() => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      merged.forEach((a) => next.add(a.id));
      return next;
    });
  }, [merged]);

  const removeAlert = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  return (
    <RiskFlowContext.Provider
      value={{
        alerts: visibleAlerts,
        highCount,
        mediumCount,
        lowCount,
        clearAll,
        removeAlert,
      }}
    >
      {children}
    </RiskFlowContext.Provider>
  );
}

export function useRiskFlow(): RiskFlowContextValue {
  return useContext(RiskFlowContext);
}
