// [claude-code 2026-03-11] Phase 3: Notion API routes — single-item brief, TOTT type, RiskFlow prints merged into schedule
import { Hono } from 'hono';
import { generateText } from 'ai';
import { fetchMDBBrief, fetchSchedule, writeMDBReportToNotion, getCurrentBriefType } from '../../services/notion-service.js';
import type { BriefType } from '../../services/notion-service.js';
import { getTradeIdeas, getPerformance, getPollStatus } from './handlers.js';
import { getFeed } from '../../services/riskflow/feed-service.js';
import { fetchEconCalendar } from '../../services/econ-calendar-service.js';
import { fetchEconomicFeed } from '../../services/riskflow/economic-feed.js';
import { selectModel } from '../../services/ai/model-selector.js';

const BRIEF_LABELS: Record<string, string> = {
  MDB: 'Morning Daily Brief (MDB)',
  ADB: 'Afternoon Daily Brief (ADB)',
  PMDB: 'Post-Market Daily Brief (PMDB)',
  TOTT: 'Tip of the Tape (TOTT)',
};
import { createEconCalendarRoutes } from './econ-calendar.js';

export function createNotionRoutes(): Hono {
  const app = new Hono();

  // Econ calendar routes (GET /econ-calendar, /econ-prints, POST /econ-print, PATCH /econ-event/:id/actual)
  app.route('/', createEconCalendarRoutes());

  // GET /api/notion/mdb-brief?type=MDB|ADB|PMDB|TOTT (legacy alias: /ntn-brief)
  app.get('/mdb-brief', async (c) => {
    try {
      const typeParam = c.req.query('type')?.toUpperCase() as import('../../services/notion-service.js').BriefType | undefined;
      const validTypes = ['MDB', 'ADB', 'PMDB', 'TOTT'];
      const briefType = typeParam && validTypes.includes(typeParam) ? typeParam : undefined;
      const items = await fetchMDBBrief(briefType);
      return c.json({ items, briefType: briefType ?? getCurrentBriefType() });
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

  // GET /api/notion/schedule — economic calendar + recent RiskFlow prints merged
  app.get('/schedule', async (c) => {
    try {
      const [notionItems, econPrints] = await Promise.allSettled([
        fetchSchedule(),
        fetchEconomicFeed(),
      ]);

      const items = notionItems.status === 'fulfilled' ? notionItems.value : [];

      // Merge RiskFlow economic prints as schedule items (actual data from FMP)
      if (econPrints.status === 'fulfilled' && econPrints.value.length > 0) {
        const existingTitles = new Set(items.map(i => i.title.toLowerCase()));
        for (const print of econPrints.value) {
          // Skip duplicates already in Notion schedule
          const printName = print.headline.split('|')[0].trim().toLowerCase();
          if (existingTitles.has(printName)) continue;

          // Parse "Name | Actual: X | Forecast: Y | Prev: Z" headline
          const parts = print.headline.split('|').map(s => s.trim());
          const title = parts[0] || 'Economic Print';
          const actual = parts.find(p => p.startsWith('Actual:'))?.replace('Actual:', '').trim();
          const forecast = parts.find(p => p.startsWith('Forecast:'))?.replace('Forecast:', '').trim();
          const previous = parts.find(p => p.startsWith('Prev:'))?.replace('Prev:', '').trim();

          items.push({
            title,
            detail: `RiskFlow print — IV ${print.ivScore ?? '?'}/10`,
            forecast,
            actual,
            previous,
            date: print.publishedAt ? new Date(print.publishedAt).toISOString().slice(0, 10) : undefined,
          });
        }
      }

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

      const { model, provider } = selectModel({ taskType: 'analysis', maxBudgetUsd: 0.01 });
      const { text } = await generateText({ model, prompt });

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
