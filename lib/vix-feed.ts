// [claude-code 2026-03-09] VIX feed hardening: staleness tracking, fallback chain (Yahoo -> backend -> cached -> degraded), status getter
// VIX Feed — polls Yahoo Finance for real-time VIX data
// Singleton with subscribe/start/stop pattern

export interface VIXDataPoint {
  time: number;
  value: number;
}

export type VIXFeedStatus = 'live' | 'stale' | 'degraded' | 'loading';
export type VIXSource = 'yahoo' | 'backend' | 'cached';

export interface VIXData {
  value: number;
  change: number;
  changePercent: number;
  timestamp: number;
  intraday: VIXDataPoint[];
  /** Where the data was sourced from */
  source?: VIXSource;
}

type VIXListener = (data: VIXData) => void;
type StatusListener = (status: VIXFeedStatus) => void;

const POLL_MS = 30_000;
const STALE_THRESHOLD_MS = 120_000; // 2 minutes without fresh data = stale
const YF_URL =
  'https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1m&range=1d';
const BACKEND_VIX_URL = '/api/market/vix';

class VIXFeed {
  private listeners = new Set<VIXListener>();
  private statusListeners = new Set<StatusListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private latest: VIXData | null = null;
  private lastSuccessfulPoll = 0;
  private consecutiveFailures = 0;
  private _status: VIXFeedStatus = 'loading';

  get current() {
    return this.latest;
  }

  get status(): VIXFeedStatus {
    return this._status;
  }

  subscribe(fn: VIXListener) {
    this.listeners.add(fn);
    if (this.latest) fn(this.latest);
    return () => {
      this.listeners.delete(fn);
    };
  }

  subscribeStatus(fn: StatusListener) {
    this.statusListeners.add(fn);
    fn(this._status);
    return () => {
      this.statusListeners.delete(fn);
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

  private setStatus(next: VIXFeedStatus) {
    if (next === this._status) return;
    this._status = next;
    for (const fn of this.statusListeners) {
      try { fn(next); } catch { /* swallow */ }
    }
  }

  private notify(data: VIXData) {
    this.latest = data;
    for (const fn of this.listeners) {
      try { fn(data); } catch { /* swallow listener errors */ }
    }
  }

  private async poll() {
    // Try Yahoo Finance first
    const yahooData = await this.pollYahoo();
    if (yahooData) {
      this.lastSuccessfulPoll = Date.now();
      this.consecutiveFailures = 0;
      this.setStatus('live');
      this.notify({ ...yahooData, source: 'yahoo' });
      return;
    }

    // Fallback: backend /api/market/vix
    const backendData = await this.pollBackend();
    if (backendData) {
      this.lastSuccessfulPoll = Date.now();
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures); // keep counting Yahoo failures
      this.setStatus('live');
      this.notify({ ...backendData, source: 'backend' });
      return;
    }

    // Both sources failed
    this.consecutiveFailures++;
    const msSinceSuccess = this.lastSuccessfulPoll > 0
      ? Date.now() - this.lastSuccessfulPoll
      : Infinity;

    if (this.latest) {
      // Serve stale cached data
      const nextStatus = msSinceSuccess > STALE_THRESHOLD_MS ? 'stale' : 'live';
      this.setStatus(nextStatus);
      // Re-notify with cached source tag so consumers update their status awareness
      if (nextStatus === 'stale') {
        this.notify({ ...this.latest, source: 'cached' });
      }
    } else {
      // No data at all
      this.setStatus('degraded');
    }

    console.warn(`[VIX] All sources failed (failures: ${this.consecutiveFailures})`);
  }

  private async pollYahoo(): Promise<VIXData | null> {
    try {
      const res = await fetch(YF_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const price = meta.regularMarketPrice ?? 0;
      if (price <= 0) return null;

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

      return { value: price, change, changePercent, timestamp: Date.now(), intraday };
    } catch (err) {
      console.warn('[VIX] Yahoo poll failed:', err);
      return null;
    }
  }

  private async pollBackend(): Promise<VIXData | null> {
    try {
      const res = await fetch(BACKEND_VIX_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const json = await res.json();

      const level = json?.level ?? json?.data?.level;
      if (typeof level !== 'number' || level <= 0) return null;

      const previousLevel = json?.previousLevel ?? json?.data?.previousLevel ?? level;
      const change = level - previousLevel;
      const changePercent = previousLevel ? (change / previousLevel) * 100 : 0;

      return {
        value: level,
        change,
        changePercent,
        timestamp: Date.now(),
        intraday: this.latest?.intraday ?? [], // preserve existing intraday if available
      };
    } catch {
      return null;
    }
  }
}

export const vixFeed = new VIXFeed();
