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

Deno.serve(async (req) => {
  // Auth: единственный валидный вызов — c X-Cleanup-Secret matching env
  if (!CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'CLEANUP_SECRET not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const provided = req.headers.get('X-Cleanup-Secret');
  if (provided !== CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: objects, error: listErr } = await supabase
    .storage.from(BUCKET)
    .list(PREFIX, { limit: LIST_LIMIT, sortBy: { column: 'created_at', order: 'asc' } });

  if (listErr) {
    return new Response(JSON.stringify({ error: `list failed: ${listErr.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!objects) {
    return new Response(JSON.stringify({ deleted: 0, note: 'empty bucket' }), { status: 200 });
  }

  // TODO: paginate если objects.length === LIST_LIMIT. За 14 дней реалистично не наберём.
  if (objects.length === LIST_LIMIT) {
    console.warn(`[cleanup-user-uploads] list hit limit ${LIST_LIMIT}, pagination not implemented`);
  }

  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const toDelete = objects
    .filter((o) => o.created_at && new Date(o.created_at) < cutoff)
    .map((o) => `${PREFIX}/${o.name}`);

  if (toDelete.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }), { status: 200 });
  }

  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(toDelete);
  if (rmErr) {
    return new Response(JSON.stringify({ error: `remove failed: ${rmErr.message}`, attempted: toDelete.length }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ deleted: toDelete.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
