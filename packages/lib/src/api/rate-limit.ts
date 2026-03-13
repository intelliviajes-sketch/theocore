type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const CLEANUP_INTERVAL_MS = 30_000;
const MAX_RATE_LIMIT_KEYS = 10_000;

declare global {
  var __apiRateLimitStore__: Map<string, RateLimitEntry> | undefined;
  var __apiRateLimitLastCleanupAt__: number | undefined;
}

function getStore() {
  if (!globalThis.__apiRateLimitStore__) {
    globalThis.__apiRateLimitStore__ = new Map<string, RateLimitEntry>();
  }
  return globalThis.__apiRateLimitStore__;
}

function cleanupStore(store: Map<string, RateLimitEntry>, now: number) {
  const lastCleanupAt = globalThis.__apiRateLimitLastCleanupAt__ ?? 0;
  const shouldCleanup =
    now - lastCleanupAt >= CLEANUP_INTERVAL_MS || store.size > MAX_RATE_LIMIT_KEYS;
  if (!shouldCleanup) return;

  for (const [storeKey, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(storeKey);
    }
  }

  while (store.size > MAX_RATE_LIMIT_KEYS) {
    const firstKey = store.keys().next().value as string | undefined;
    if (!firstKey) break;
    store.delete(firstKey);
  }

  globalThis.__apiRateLimitLastCleanupAt__ = now;
}

export function takeRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  const safeKey = key.trim().slice(0, 256) || "unknown";
  cleanupStore(store, now);
  const current = store.get(safeKey);

  if (!current || current.resetAt <= now) {
    store.set(safeKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  const next = {
    ...current,
    count: current.count + 1,
  };
  store.set(safeKey, next);

  return {
    ok: true,
    remaining: Math.max(0, limit - next.count),
    retryAfterSeconds: 0,
  };
}
