type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var __apiRateLimitStore__: Map<string, RateLimitEntry> | undefined;
}

function getStore() {
  if (!globalThis.__apiRateLimitStore__) {
    globalThis.__apiRateLimitStore__ = new Map<string, RateLimitEntry>();
  }
  return globalThis.__apiRateLimitStore__;
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
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
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
  store.set(key, next);

  return {
    ok: true,
    remaining: Math.max(0, limit - next.count),
    retryAfterSeconds: 0,
  };
}
