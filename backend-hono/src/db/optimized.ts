import { Pool, type PoolConfig, type QueryResult } from 'pg';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class LruCache<K, V> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly map: Map<K, CacheEntry<V>>;

  constructor(maxEntries: number, ttlMs: number) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.map = new Map();
  }

  get(key: K): V | null {
    const entry = this.map.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlOverride?: number) {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    const ttl = ttlOverride ?? this.ttlMs;
    this.map.set(key, { value, expiresAt: Date.now() + ttl });
    if (this.map.size > this.maxEntries) {
      const oldestKey = this.map.keys().next().value as K | undefined;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
  }
}

const buildPoolConfig = (): PoolConfig => ({
  connectionString: process.env.DATABASE_URL,
  max: Number.parseInt(process.env.DB_POOL_MAX ?? '10', 10),
  idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? '30000', 10),
  connectionTimeoutMillis: Number.parseInt(
    process.env.DB_CONNECT_TIMEOUT_MS ?? '5000',
    10,
  ),
});

const pool = new Pool(buildPoolConfig());

const cache = new LruCache<string, QueryResult>(200, 60_000);

const buildCacheKey = (text: string, params: readonly unknown[]) => {
  const serializedParams = params.length ? JSON.stringify(params) : '';
  return `${text}::${serializedParams}`;
};

export const dbPool = () => pool;

export async function cachedQuery<T = unknown>(
  text: string,
  params: readonly unknown[] = [],
  options: { cacheKey?: string; ttlMs?: number } = {},
): Promise<QueryResult<T>> {
  const key = options.cacheKey ?? buildCacheKey(text, params);
  const cached = cache.get(key);
  if (cached) {
    return cached as QueryResult<T>;
  }

  const result = await pool.query<T>(text, params as unknown[]);
  cache.set(key, result as QueryResult, options.ttlMs);
  return result;
}

export async function query<T = unknown>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}
