type RateLimitEntry = {
  attempts: number;
  resetAt: number;
};

const entries = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }
}

export function consumeRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (entries.size > 10000) cleanupExpiredEntries(now);
  const entry = entries.get(key);

  if (!entry || entry.resetAt <= now) {
    entries.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.attempts >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.attempts += 1;
  entries.set(key, entry);
  return { allowed: true, retryAfterSeconds: 0 };
}
