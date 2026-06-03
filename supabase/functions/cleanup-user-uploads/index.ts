// supabase/functions/cleanup-user-uploads/index.ts
//
// Подметает orphan-файлы в bucket `user-uploads/prints/` старше 14 дней.
// Вызывается nightly через pg_cron + pg_net; авторизуется через X-Cleanup-Secret header.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET');

const BUCKET = 'user-uploads';
const PREFIX = 'prints';
const MAX_AGE_DAYS = 14;
const LIST_LIMIT = 1000;

// Constant-time string comparison via byte-by-byte XOR.
// Возвращает false если длины разные (без раннего exit, чтобы не утекать длину).
function timingSafeEqualStr(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  // Чтобы длины не утекали, всегда читаем max(len) байт.
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    const x = i < aBytes.length ? aBytes[i] : 0;
    const y = i < bBytes.length ? bBytes[i] : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  // Auth: единственный валидный вызов — c X-Cleanup-Secret matching env
  if (!CLEANUP_SECRET) {
    console.error('[cleanup-user-uploads] CLEANUP_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const provided = req.headers.get('X-Cleanup-Secret') ?? '';
  // PR #6: timing-safe compare через crypto.subtle (доступен в Deno runtime).
  // Защита от хитрых атак, угадывающих секрет побайтно по разнице времени ответа.
  if (!timingSafeEqualStr(provided, CLEANUP_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const toDelete: string[] = [];
  let totalScanned = 0;
  let skippedNoTimestamp = 0;

  // Полная пагинация: раньше брали только первую страницу (1000 объектов) — всё
  // сверху молча игнорировалось → файлы старше 14 дней за 1000-м объектом никогда
  // не удалялись (бесконечный рост + PII сверх retention).
  let offset = 0;
  for (;;) {
    const { data: page, error: listErr } = await supabase
      .storage.from(BUCKET)
      .list(PREFIX, { limit: LIST_LIMIT, offset, sortBy: { column: 'created_at', order: 'asc' } });

    if (listErr) {
      return new Response(JSON.stringify({ error: `list failed: ${listErr.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (!page || page.length === 0) break;

    totalScanned += page.length;
    for (const o of page) {
      // created_at может быть null (объекты, созданные через S3-протокол). Раньше
      // такие молча пропускались навсегда. Fallback на updated_at; если нет и его —
      // считаем возраст неопределённым и НЕ удаляем (чтобы не снести свежий файл),
      // но логируем, чтобы leak был виден.
      const ts = o.created_at ?? o.updated_at ?? null;
      if (!ts) {
        skippedNoTimestamp++;
        continue;
      }
      if (new Date(ts) < cutoff) {
        toDelete.push(`${PREFIX}/${o.name}`);
      }
    }

    if (page.length < LIST_LIMIT) break;
    offset += LIST_LIMIT;
  }

  if (skippedNoTimestamp > 0) {
    console.warn(`[cleanup-user-uploads] ${skippedNoTimestamp} objects had no timestamp, skipped`);
  }
  console.log(`[cleanup-user-uploads] scanned ${totalScanned} objects, ${toDelete.length} older than ${MAX_AGE_DAYS}d`);

  if (toDelete.length === 0) {
    return new Response(JSON.stringify({ deleted: 0, scanned: totalScanned }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Удаляем батчами — единичный remove() с очень большим массивом ненадёжен.
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += LIST_LIMIT) {
    const batch = toDelete.slice(i, i + LIST_LIMIT);
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove(batch);
    if (rmErr) {
      return new Response(
        JSON.stringify({ error: `remove failed: ${rmErr.message}`, deleted, attempted_count: toDelete.length }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }
    deleted += batch.length;
  }

  console.log(`[cleanup-user-uploads] deleted ${deleted} objects`);
  return new Response(JSON.stringify({ deleted, scanned: totalScanned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
