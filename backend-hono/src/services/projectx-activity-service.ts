import { isPoolAvailable, query } from '../db/optimized.js';

export interface ProjectXActivityEventInput {
  accountId: number;
  eventType: string;
  eventSource?: string;
  eventTimestamp?: string | Date;
  isTrade?: boolean;
  symbol?: string;
  side?: string;
  quantity?: number;
  price?: number;
  realizedPnl?: number;
  eventWeight?: number;
  payload?: Record<string, unknown>;
}

export interface ProjectXActivityEventRecord {
  id: number;
  eventType: string;
  eventSource: string;
  eventTimestamp: string;
  isTrade: boolean;
  symbol?: string | null;
  side?: string | null;
  quantity?: number | null;
  price?: number | null;
  realizedPnl?: number | null;
  eventWeight?: number | null;
  payload?: Record<string, unknown>;
}

export interface ProjectXActivitySummary {
  accountId: number;
  windowMinutes: number;
  eventCount: number;
  tradeCount: number;
  weightedTradeCount: number;
  overtradingPenalty: number;
  realizedPnl: number;
  lastEventAt: string | null;
}

const isDev = process.env.NODE_ENV !== 'production';

const memoryEvents: Array<ProjectXActivityEventRecord & { userId: string; accountId: number }> = [];
let memoryEventId = 1;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function calculateOvertradingPenalty(weightedTradeCount: number, threshold: number): number {
  if (weightedTradeCount < threshold) return 0;
  const delta = weightedTradeCount - threshold + 1;
  return Number((delta * 0.35).toFixed(2));
}

export async function recordActivityEvent(userId: string, input: ProjectXActivityEventInput): Promise<number | null> {
  const payload = input.payload ?? {};
  const eventTimestamp = input.eventTimestamp ? new Date(input.eventTimestamp) : new Date();

  if (!isPoolAvailable()) {
    if (!isDev) {
      throw new Error('Database unavailable for ProjectX activity ingestion');
    }

    const id = memoryEventId;
    memoryEventId += 1;

    memoryEvents.push({
      userId,
      accountId: input.accountId,
      id,
      eventType: input.eventType,
      eventSource: input.eventSource ?? 'signalr',
      eventTimestamp: eventTimestamp.toISOString(),
      isTrade: Boolean(input.isTrade),
      symbol: input.symbol ?? null,
      side: input.side ?? null,
      quantity: typeof input.quantity === 'number' ? input.quantity : null,
      price: typeof input.price === 'number' ? input.price : null,
      realizedPnl: typeof input.realizedPnl === 'number' ? input.realizedPnl : null,
      eventWeight: typeof input.eventWeight === 'number' ? input.eventWeight : 1,
      payload,
    });

    return id;
  }

  const result = await query<{ id: number }>(
    `
    INSERT INTO projectx_activity_events (
      user_id,
      account_id,
      event_type,
      event_source,
      event_timestamp,
      is_trade,
      symbol,
      side,
      quantity,
      price,
      realized_pnl,
      event_weight,
      payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb
    )
    RETURNING id
    `,
    [
      userId,
      input.accountId,
      input.eventType,
      input.eventSource ?? 'signalr',
      eventTimestamp,
      Boolean(input.isTrade),
      input.symbol ?? null,
      input.side ?? null,
      input.quantity ?? null,
      input.price ?? null,
      input.realizedPnl ?? null,
      input.eventWeight ?? 1,
      JSON.stringify(payload),
    ]
  );

  return result.rows[0]?.id ?? null;
}

export async function recordActivityEvents(
  userId: string,
  events: ProjectXActivityEventInput[]
): Promise<number> {
  let inserted = 0;
  for (const event of events) {
    const id = await recordActivityEvent(userId, event);
    if (id !== null) inserted += 1;
  }
  return inserted;
}

export async function getActivity(
  userId: string,
  accountId: number,
  options?: { windowMinutes?: number; limit?: number; overtradingThreshold?: number }
): Promise<{ events: ProjectXActivityEventRecord[]; summary: ProjectXActivitySummary }> {
  const windowMinutes = Math.max(1, Math.floor(options?.windowMinutes ?? 60));
  const limit = Math.max(1, Math.min(200, Math.floor(options?.limit ?? 50)));
  const overtradingThreshold = Math.max(1, Number(options?.overtradingThreshold ?? 5));

  if (!isPoolAvailable()) {
    const cutoff = Date.now() - windowMinutes * 60_000;
    const events = memoryEvents
      .filter((event) => event.userId === userId && event.accountId === accountId)
      .filter((event) => new Date(event.eventTimestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime())
      .slice(0, limit)
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        eventSource: event.eventSource,
        eventTimestamp: event.eventTimestamp,
        isTrade: event.isTrade,
        symbol: event.symbol,
        side: event.side,
        quantity: event.quantity,
        price: event.price,
        realizedPnl: event.realizedPnl,
        eventWeight: event.eventWeight,
        payload: event.payload,
      }));

    const tradeCount = events.filter((event) => event.isTrade).length;
    const weightedTradeCount = events
      .filter((event) => event.isTrade)
      .reduce((sum, event) => sum + (event.eventWeight ?? 1), 0);
    const realizedPnl = events.reduce((sum, event) => sum + (event.realizedPnl ?? 0), 0);

    return {
      events,
      summary: {
        accountId,
        windowMinutes,
        eventCount: events.length,
        tradeCount,
        weightedTradeCount,
        overtradingPenalty: calculateOvertradingPenalty(weightedTradeCount, overtradingThreshold),
        realizedPnl,
        lastEventAt: events[0]?.eventTimestamp ?? null,
      },
    };
  }

  const [summaryResult, eventsResult] = await Promise.all([
    query<{
      event_count: number;
      trade_count: number;
      weighted_trade_count: number;
      realized_pnl: number;
      last_event_at: string | null;
    }>(
      `
      SELECT
        COUNT(*)::int AS event_count,
        COUNT(*) FILTER (WHERE is_trade = true)::int AS trade_count,
        COALESCE(SUM(CASE WHEN is_trade = true THEN COALESCE(event_weight, 1) ELSE 0 END), 0) AS weighted_trade_count,
        COALESCE(SUM(COALESCE(realized_pnl, 0)), 0) AS realized_pnl,
        MAX(event_timestamp) AS last_event_at
      FROM projectx_activity_events
      WHERE user_id = $1
        AND account_id = $2
        AND event_timestamp >= NOW() - ($3::text || ' minutes')::interval
      `,
      [userId, accountId, windowMinutes]
    ),
    query<{
      id: number;
      event_type: string;
      event_source: string;
      event_timestamp: string;
      is_trade: boolean;
      symbol: string | null;
      side: string | null;
      quantity: number | null;
      price: number | null;
      realized_pnl: number | null;
      event_weight: number | null;
      payload: Record<string, unknown> | null;
    }>(
      `
      SELECT
        id,
        event_type,
        event_source,
        event_timestamp,
        is_trade,
        symbol,
        side,
        quantity,
        price,
        realized_pnl,
        event_weight,
        payload
      FROM projectx_activity_events
      WHERE user_id = $1
        AND account_id = $2
      ORDER BY event_timestamp DESC
      LIMIT $3
      `,
      [userId, accountId, limit]
    ),
  ]);

  const summaryRow = summaryResult.rows[0];
  const weightedTradeCount = toNumber(summaryRow?.weighted_trade_count);

  return {
    events: eventsResult.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      eventSource: row.event_source,
      eventTimestamp: row.event_timestamp,
      isTrade: Boolean(row.is_trade),
      symbol: row.symbol,
      side: row.side,
      quantity: row.quantity !== null ? toNumber(row.quantity, 0) : null,
      price: row.price !== null ? toNumber(row.price, 0) : null,
      realizedPnl: row.realized_pnl !== null ? toNumber(row.realized_pnl, 0) : null,
      eventWeight: row.event_weight !== null ? toNumber(row.event_weight, 1) : null,
      payload: row.payload ?? {},
    })),
    summary: {
      accountId,
      windowMinutes,
      eventCount: toNumber(summaryRow?.event_count),
      tradeCount: toNumber(summaryRow?.trade_count),
      weightedTradeCount,
      overtradingPenalty: calculateOvertradingPenalty(weightedTradeCount, overtradingThreshold),
      realizedPnl: toNumber(summaryRow?.realized_pnl),
      lastEventAt: summaryRow?.last_event_at ?? null,
    },
  };
}

export async function checkOvertrading(
  userId: string,
  options?: { windowMinutes?: number; threshold?: number }
): Promise<{
  isOvertrading: boolean;
  tradesInWindow: number;
  weightedTrades: number;
  threshold: number;
  penalty: number;
  warning?: string;
}> {
  const windowMinutes = Math.max(1, Math.floor(options?.windowMinutes ?? 15));
  const threshold = Math.max(1, Number(options?.threshold ?? 5));

  if (!isPoolAvailable()) {
    const cutoff = Date.now() - windowMinutes * 60_000;
    const trades = memoryEvents.filter(
      (event) => event.userId === userId && event.isTrade && new Date(event.eventTimestamp).getTime() >= cutoff
    );
    const weightedTrades = trades.reduce((sum, event) => sum + (event.eventWeight ?? 1), 0);
    const penalty = calculateOvertradingPenalty(weightedTrades, threshold);

    return {
      isOvertrading: weightedTrades >= threshold,
      tradesInWindow: trades.length,
      weightedTrades,
      threshold,
      penalty,
      warning:
        weightedTrades >= threshold
          ? `Overtrading detected: ${weightedTrades.toFixed(2)} weighted trades in ${windowMinutes}m`
          : undefined,
    };
  }

  const result = await query<{ trades_in_window: number; weighted_trades: number }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE is_trade = true)::int AS trades_in_window,
      COALESCE(SUM(CASE WHEN is_trade = true THEN COALESCE(event_weight, 1) ELSE 0 END), 0) AS weighted_trades
    FROM projectx_activity_events
    WHERE user_id = $1
      AND event_timestamp >= NOW() - ($2::text || ' minutes')::interval
    `,
    [userId, windowMinutes]
  );

  const row = result.rows[0];
  const tradesInWindow = toNumber(row?.trades_in_window);
  const weightedTrades = toNumber(row?.weighted_trades);
  const penalty = calculateOvertradingPenalty(weightedTrades, threshold);

  return {
    isOvertrading: weightedTrades >= threshold,
    tradesInWindow,
    weightedTrades,
    threshold,
    penalty,
    warning:
      weightedTrades >= threshold
        ? `Overtrading detected: ${weightedTrades.toFixed(2)} weighted trades in ${windowMinutes}m`
        : undefined,
  };
}
