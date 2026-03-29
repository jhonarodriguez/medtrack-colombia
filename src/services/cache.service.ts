import NodeCache from "node-cache";

export const TTL = {
  PRECIOS: parseInt(process.env.CACHE_PRICES_TTL ?? "1800"),
  INVIMA: parseInt(process.env.CACHE_INVIMA_TTL ?? "604800"),
  GEO: parseInt(process.env.CACHE_GEO_TTL ?? "604800"),
  SEDES: 86400,
} as const;

const cache = new NodeCache({ useClones: false });

export const cacheService = {
  get<T>(key: string): T | undefined {
    return cache.get<T>(key);
  },

  set<T>(key: string, value: T, ttlSeconds: number): void {
    cache.set(key, value, ttlSeconds);
  },
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    const cached = cache.get<T>(key);
    if (cached !== undefined) return cached;

    const fresh = await factory();
    cache.set(key, fresh, ttlSeconds);
    return fresh;
  },

  del(key: string): void {
    cache.del(key);
  },

  flush(): void {
    cache.flushAll();
  },

  stats() {
    return cache.getStats();
  },
};
