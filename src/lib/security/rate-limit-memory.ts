import { createHash } from 'node:crypto';

// Lightweight in-memory rate-limiter для non-form public endpoints (`/api/orders/create`).
// На Vercel serverless каждый function instance имеет своё state — это значит лимит
// per-instance, не глобальный. Для burst-protection этого достаточно: один атакующий
// IP всё равно упирается в свой instance pool. Для глобальной защиты нужна
// distributed-store (Upstash/Redis), но это next step.
//
// form-submissions использует DB-based лимит через payload.find() — это надёжнее,
// но дорого по RTT. Для orders'а где `ipHash` пока не в схеме — in-memory быстрее
// добавить, без миграций. См. audit B4.

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitInMemory(
  key: string,
  maxPerWindow: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= maxPerWindow) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}

export function ipHashFromHeaders(headers: Headers): string {
  const vercelFwd = headers.get('x-vercel-forwarded-for');
  const real = headers.get('x-real-ip');
  const fwd = headers.get('x-forwarded-for');
  const ip =
    (vercelFwd && vercelFwd.split(',')[0].trim()) ||
    real ||
    (fwd && fwd.split(',')[0].trim()) ||
    'unknown';
  return createHash('sha256').update(ip).digest('hex');
}
