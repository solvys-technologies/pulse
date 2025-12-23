// Simple in-memory cache implementation
// For production, consider using Redis or another distributed cache
const cache = new Map<string, any>();

export async function get<T = any>(key: string): Promise<T | null> {
  const value = cache.get(key);
  if (value === undefined) {
    return null;
  }
  return value as T;
}

export async function set(key: string, value: any, ttl?: number): Promise<void> {
  cache.set(key, value);
  
  if (ttl) {
    setTimeout(() => {
      cache.delete(key);
    }, ttl * 1000);
  }
}

export async function del(key: string): Promise<void> {
  cache.delete(key);
}

export async function clear(): Promise<void> {
  cache.clear();
}
