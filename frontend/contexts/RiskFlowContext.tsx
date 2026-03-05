// [claude-code 2026-03-03] Extended: polls Notion trade ideas on 60s interval,
// injects them as RiskFlowAlerts with source='notion-trade-idea' pinned at top.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { riskFlowPoller, type RiskFlowAlert } from '../lib/riskflow-feed';
import baseBackend from '../lib/backend';
import { decodeHtmlEntities } from '../lib/html-entities';
import type { NotionPollStatus } from '../lib/services';

interface RiskFlowContextValue {
  alerts: RiskFlowAlert[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  notionPollStatus: NotionPollStatus | null;
  clearAll: () => void;
  removeAlert: (id: string) => void;
  markSeen: (id: string) => void;
  markAllSeen: (ids: string[]) => void;
  isSeen: (id: string) => boolean;
}

const RiskFlowContext = createContext<RiskFlowContextValue>({
  alerts: [],
  highCount: 0,
  mediumCount: 0,
  lowCount: 0,
  notionPollStatus: null,
  clearAll: () => {},
  removeAlert: () => {},
  markSeen: () => {},
  markAllSeen: () => {},
  isSeen: () => false,
});

const NOTION_POLL_MS = 60_000;
const DISMISSED_STORAGE_KEY = 'pulse_riskflow_dismissed_ids:v1';
const SEEN_STORAGE_KEY = 'pulse_riskflow_seen_ids:v1';

function loadStoredIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v: unknown) => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function persistIds(key: string, ids: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage failures
  }
}

export function RiskFlowProvider({ children }: { children: React.ReactNode }) {
  const [rssAlerts, setRssAlerts] = useState<RiskFlowAlert[]>([]);
  const [notionAlerts, setNotionAlerts] = useState<RiskFlowAlert[]>([]);
  const [notionPollStatus, setNotionPollStatus] = useState<NotionPollStatus | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadStoredIds(DISMISSED_STORAGE_KEY));
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadStoredIds(SEEN_STORAGE_KEY));
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
      const [ideas, pollStatus] = await Promise.all([
        baseBackend.notion.getTradeIdeas(),
        baseBackend.notion.getPollStatus(),
      ]);
      const converted: RiskFlowAlert[] = ideas.map((idea) => ({
        id: `notion-ti-${idea.id}`,
        headline: decodeHtmlEntities(`${idea.direction.toUpperCase()} ${idea.ticker}${idea.entry ? ` @ ${idea.entry}` : ''}`),
        summary: decodeHtmlEntities(
          idea.openclawDescription
          ?? `${idea.ticker} — ${idea.direction} trade idea${idea.confidence ? ` (${idea.confidence} confidence)` : ''}`
        ),
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
      setNotionPollStatus(pollStatus);
      console.debug(
        `[RiskFlowContext] Notion poll: ${ideas.length} proposals (cache=${pollStatus.tradeIdeaCount}, running=${pollStatus.running})`
      );
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
    setSeenIds((prev) => {
      const next = new Set(prev);
      merged.forEach((a) => next.add(a.id));
      return next;
    });
  }, [merged]);

  const removeAlert = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    setSeenIds((prev) => new Set(prev).add(id));
  }, []);

  const markSeen = useCallback((id: string) => {
    if (!id) return;
    setSeenIds((prev) => {
      if (prev.has(id)) return prev;
      return new Set(prev).add(id);
    });
  }, []);

  const markAllSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setSeenIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      ids.forEach((id) => {
        if (id && !next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const isSeen = useCallback((id: string) => {
    return seenIds.has(id);
  }, [seenIds]);

  useEffect(() => {
    persistIds(DISMISSED_STORAGE_KEY, dismissedIds);
  }, [dismissedIds]);

  useEffect(() => {
    persistIds(SEEN_STORAGE_KEY, seenIds);
  }, [seenIds]);

  return (
    <RiskFlowContext.Provider
      value={{
        alerts: visibleAlerts,
        highCount,
        mediumCount,
        lowCount,
        notionPollStatus,
        clearAll,
        removeAlert,
        markSeen,
        markAllSeen,
        isSeen,
      }}
    >
      {children}
    </RiskFlowContext.Provider>
  );
}

export function useRiskFlow(): RiskFlowContextValue {
  return useContext(RiskFlowContext);
}
