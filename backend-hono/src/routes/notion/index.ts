// [claude-code 2026-03-03] Phase 3: Notion API routes — MDB brief + schedule
// [claude-code 2026-03-03] Extended: trade-ideas, performance, poll-status endpoints.
// [claude-code 2026-03-05] Added econ-calendar sub-routes.
// [claude-code 2026-03-06] Renamed NTN → MDB throughout.
// [claude-code 2026-03-10] POST /mdb-report/generate — AI-generated brief stored in Notion.
import { Hono } from 'hono';
import { generateText } from 'ai';
import { fetchMDBBrief, fetchSchedule, writeMDBReportToNotion } from '../../services/notion-service.js';
import { getTradeIdeas, getPerformance, getPollStatus } from './handlers.js';
import { getFeed } from '../../services/riskflow/feed-service.js';
import { fetchEconCalendar } from '../../services/econ-calendar-service.js';
import { selectModel } from '../../services/ai/model-selector.js';

type BriefType = 'MDB' | 'ADB' | 'PMDB';

function getCurrentBriefType(): BriefType {
  const hour = new Date().getHours();
  if (hour < 11) return 'MDB';
  if (hour < 17 || (hour === 17 && new Date().getMinutes() < 30)) return 'ADB';
  return 'PMDB';
}

const BRIEF_LABELS: Record<BriefType, string> = {
  MDB: 'Morning Daily Brief (MDB)',
  ADB: 'Afternoon Daily Brief (ADB)',
  PMDB: 'Post-Market Daily Brief (PMDB)',
};
import { createEconCalendarRoutes } from './econ-calendar.js';

export function createNotionRoutes(): Hono {
  const app = new Hono();

  // Econ calendar routes (GET /econ-calendar, /econ-prints, POST /econ-print, PATCH /econ-event/:id/actual)
  app.route('/', createEconCalendarRoutes());

  // GET /api/notion/mdb-brief (legacy alias: /ntn-brief)
  app.get('/mdb-brief', async (c) => {
    try {
      const items = await fetchMDBBrief();
      return c.json({ items });
    } catch (err) {
      console.error('[Notion] /mdb-brief error:', err);
      return c.json({ items: [] }, 500);
    }
  });
  app.get('/ntn-brief', async (c) => {
    try {
      const items = await fetchMDBBrief();
      return c.json({ items });
    } catch (err) {
      return c.json({ items: [] }, 500);
    }
  });

  // GET /api/notion/schedule
  app.get('/schedule', async (c) => {
    try {
      const items = await fetchSchedule();
      return c.json({ items });
    } catch (err) {
      console.error('[Notion] /schedule error:', err);
      return c.json({ items: [] }, 500);
    }
  });

  // GET /api/notion/trade-ideas — live trade ideas from Notion poller cache
  app.get('/trade-ideas', getTradeIdeas);

  // GET /api/notion/performance — KPI data from Daily P&L database
  app.get('/performance', getPerformance);

  // GET /api/notion/poll-status — poller health check
  app.get('/poll-status', getPollStatus);

  // POST /api/notion/mdb-report/generate — generate AI brief and store in Notion
  app.post('/mdb-report/generate', async (c) => {
    try {
      const briefType = getCurrentBriefType();
      const today = new Date().toISOString().slice(0, 10);

      // Fetch feed context and econ calendar in parallel
      const [feedResponse, econEvents] = await Promise.allSettled([
        getFeed('system', { limit: 20 }),
        fetchEconCalendar({ from: today, to: today }),
      ]);

      const feedItems = feedResponse.status === 'fulfilled' ? feedResponse.value.items.slice(0, 15) : [];
      const events = econEvents.status === 'fulfilled' ? econEvents.value : [];

      // Build prompt
      const feedSummary = feedItems.length > 0
        ? feedItems.map((item, i) => `${i + 1}. [${item.macroLevel >= 3 ? 'HIGH' : 'MED'}] ${item.headline}`).join('\n')
        : 'No significant feed items at this time.';

      const econSummary = events.length > 0
        ? events.map((e) => `• ${e.name}${e.time ? ` at ${e.time}` : ''}${e.actual != null ? ` — Actual: ${e.actual}` : ''}${e.forecast != null ? `, Forecast: ${e.forecast}` : ''}`).join('\n')
        : 'No major economic events today.';

      const prompt = `You are Pulse, a macro trading assistant for Priced In Capital. Generate a concise ${BRIEF_LABELS[briefType]}.

## Today's Economic Events
${econSummary}

## Recent RiskFlow Headlines
${feedSummary}

## Instructions
Write 3-5 bullet points covering:
1. Key macro/risk themes from today's data
2. Market implications (bullish/bearish signals)
3. Actionable focus areas for the trading session

Be direct, specific, and use financial shorthand. No filler. Max 200 words.`;

      const { model, provider } = selectModel({ taskType: 'analysis', preferCheap: true });
      const { text } = await generateText({ model, prompt, maxTokens: 400 });

      // Store in Notion (archives previous same-type entry)
      const notionResult = await writeMDBReportToNotion(text, briefType);

      return c.json({
        content: text,
        briefType,
        generatedAt: new Date().toISOString(),
        notionUrl: notionResult?.url ?? null,
        provider,
      });
    } catch (err) {
      console.error('[Notion] /mdb-report/generate error:', err);
      return c.json({ error: 'Generation failed', details: String(err) }, 500);
    }
  });

  return app;
}
