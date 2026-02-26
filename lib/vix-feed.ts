// VIX Feed — polls Yahoo Finance for real-time VIX data
// Singleton with subscribe/start/stop pattern

export interface VIXDataPoint {
  time: number;
  value: number;
}

export interface VIXData {
  value: number;
  change: number;
  changePercent: number;
  timestamp: number;
  intraday: VIXDataPoint[];
}

type VIXListener = (data: VIXData) => void;

const POLL_MS = 30_000;
const YF_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1m&range=1d';

class VIXFeed {
  private listeners = new Set<VIXListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private latest: VIXData | null = null;

  get current() {
    return this.latest;
  }

  subscribe(fn: VIXListener) {
    this.listeners.add(fn);
    if (this.latest) fn(this.latest);
    return () => {
      this.listeners.delete(fn);
    };
  }

  start() {
    if (this.timer) return;
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async poll() {
    try {
      const res = await fetch(YF_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) return;

      const meta = result.meta;
      const price = meta.regularMarketPrice ?? 0;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
      const change = price - prevClose;
      const changePercent = prevClose ? (change / prevClose) * 100 : 0;

      const timestamps: number[] = result.timestamp ?? [];
      const closes: (number | null)[] =
        result.indicators?.quote?.[0]?.close ?? [];

      const intraday: VIXDataPoint[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const v = closes[i];
        if (v != null) {
          intraday.push({ time: timestamps[i] * 1000, value: v });
        }
      }

      this.latest = {
        value: price,
        change,
        changePercent,
        timestamp: Date.now(),
        intraday,
      };

      for (const fn of this.listeners) {
        try {
          fn(this.latest);
        } catch {
          // swallow listener errors
        }
      }
    } catch (err) {
      console.warn('[VIX] poll failed:', err);
    }
  }
}

export const vixFeed = new VIXFeed();
