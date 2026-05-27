// Supabase Edge Function: create-lead
// Public endpoint (verify_jwt=false) — принимает заявки из форм клона pnhd-studio.
//
// Поведение (после PR #2 / 152-ФЗ migration):
//   - Если задан BITRIX_WEBHOOK_URL → лид уходит ТОЛЬКО в Bitrix24 (РФ),
//     `public.leads` НЕ пишется (data-minimal, 152-ФЗ-compliant).
//   - Если BITRIX_WEBHOOK_URL не задан → fallback: пишем в `public.leads`,
//     чтобы заявка не потерялась пока владелец не настроит webhook.
//     В этом режиме 152-ФЗ-compliance НЕ обеспечена — это страховка на time-in-transit.
//
// Rate-limit: всегда через таблицу `public.rate_limit_log` (sha256(ip) + ts, не ПДн),
// не зависит от наличия leads-таблицы.
//
// Env:
//   SUPABASE_URL                — выставляется автоматически
//   SUPABASE_SERVICE_ROLE_KEY   — выставляется автоматически
//   BITRIX_WEBHOOK_URL          — опц.; если задан → переходим в Bitrix-only режим
//   TELEGRAM_BOT_TOKEN          — опц.
//   TELEGRAM_CHAT_ID            — опц.
//   ALLOWED_ORIGINS             — опц. CSV; если не задан, используется встроенный список.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type LeadAttachment = {
  side?: string;
  url?: string;
  filename?: string;
};

type LeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  comment?: string;
  reference_url?: string;
  source?: string;
  roistat_visit?: string;
  attachments?: LeadAttachment[];
};

const ALLOWED_SOURCES = new Set([
  'footer',
  'popup',
  'shop-no-model',
  'product-page',
  'methods-consultation',
  'checkout',
]);

const LIMITS = {
  name: 100,
  phone: 32,
  email: 200,
  comment: 2000,
  reference_url: 500,
  source: 32,
  roistat_visit: 128,
  attachment_url: 500,
  attachment_filename: 200,
  attachment_side: 32,
};

const MAX_ATTACHMENTS = 12;

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 3;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://studio.pnhd.ru',
  'https://pnhd-studio-clone-margolinilya-creates-projects.vercel.app',
  'https://pnhd-studio-clone-git-main-margolinilya-creates-projects.vercel.app',
  'http://localhost:3000',
];
const allowedOriginsEnv = Deno.env.get('ALLOWED_ORIGINS');
const ALLOWED_ORIGINS = allowedOriginsEnv
  ? allowedOriginsEnv.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

function matchOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  // Allow Vercel preview deploys на наш проект: pnhd-studio-clone-*.vercel.app
  if (/^https:\/\/pnhd-studio-clone-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = matchOrigin(origin) ?? '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Нормализация: убирает управляющие символы / переводы строк и обрезает по лимиту.
function sanitize(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // control chars → space
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?\d[\d\s\-()]{6,30}\d$/;
const URL_RE = /^https?:\/\/[^\s<>"']{1,490}$/i;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Извлекаем client IP исключительно из `cf-connecting-ip`.
// См. PR #1 для обоснования (header-probe / Cloudflare behaviour).
function extractIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  return 'unknown';
}

type SanitizedAttachment = { side: string; url: string; filename?: string };

function sanitizeAttachments(raw: unknown): SanitizedAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: SanitizedAttachment[] = [];
  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!item || typeof item !== 'object') continue;
    const rawSide = sanitize((item as LeadAttachment).side, LIMITS.attachment_side);
    const url = sanitize((item as LeadAttachment).url, LIMITS.attachment_url);
    if (!url || !URL_RE.test(url)) continue;
    const side = rawSide || 'file';
    const filename = sanitize(
      (item as LeadAttachment).filename,
      LIMITS.attachment_filename,
    );
    out.push({ side, url, filename: filename || undefined });
  }
  return out;
}

async function sendToBitrix(
  webhookBase: string,
  payload: {
    name: string;
    phone: string;
    email?: string;
    comment?: string;
    reference_url?: string;
    source: string;
    roistat_visit?: string;
    attachments?: SanitizedAttachment[];
  },
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const url = webhookBase.replace(/\/+$/, '') + '/crm.lead.add.json';
  const fields: Record<string, unknown> = {
    TITLE: `Сайт pnhd: ${payload.source} — ${payload.name}`,
    NAME: payload.name,
    PHONE: [{ VALUE: payload.phone, VALUE_TYPE: 'WORK' }],
    SOURCE_DESCRIPTION: payload.source,
  };
  if (payload.email) {
    fields.EMAIL = [{ VALUE: payload.email, VALUE_TYPE: 'WORK' }];
  }
  const commentParts: string[] = [];
  if (payload.comment) commentParts.push(payload.comment);
  if (payload.reference_url) commentParts.push(`Референс: ${payload.reference_url}`);
  if (payload.roistat_visit) commentParts.push(`roistat_visit: ${payload.roistat_visit}`);
  if (payload.attachments && payload.attachments.length > 0) {
    commentParts.push('');
    commentParts.push('Файлы принтов:');
    for (const a of payload.attachments) {
      const label = a.filename ? `${a.side} (${a.filename})` : a.side;
      commentParts.push(`• ${label}: ${a.url}`);
    }
  }
  if (commentParts.length > 0) fields.COMMENTS = commentParts.join('\n');

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    const json = (await r.json()) as { result?: number; error_description?: string };
    if (!r.ok || typeof json.result !== 'number') {
      return { ok: false, error: json.error_description ?? `HTTP ${r.status}` };
    }
    return { ok: true, id: json.result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function notifyTelegram(
  payload: {
    name: string;
    phone: string;
    email?: string;
    comment?: string;
    reference_url?: string;
    source: string;
    attachments?: SanitizedAttachment[];
  },
  leadRef: string,
): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  const text = [
    `Новая заявка ${leadRef}`,
    `Источник: ${payload.source}`,
    `Имя: ${payload.name}`,
    `Телефон: ${payload.phone}`,
    payload.email ? `Email: ${payload.email}` : '',
    payload.comment ? `Комментарий: ${payload.comment}` : '',
    payload.reference_url ? `Референс: ${payload.reference_url}` : '',
    payload.attachments && payload.attachments.length > 0
      ? `Файлов: ${payload.attachments.length}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    /* silent */
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405, origin);
  }

  // Browser-инициированные запросы должны идти с разрешённого Origin.
  // server-to-server вызовы (без Origin) пропускаем — это наш собственный фронт SSR.
  if (origin && !matchOrigin(origin)) {
    return jsonResponse({ ok: false, error: 'origin_not_allowed' }, 403, origin);
  }

  let raw: LeadPayload;
  try {
    raw = (await req.json()) as LeadPayload;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400, origin);
  }

  const name = sanitize(raw.name, LIMITS.name);
  const phone = sanitize(raw.phone, LIMITS.phone);
  const email = sanitize(raw.email, LIMITS.email);
  const comment = sanitize(raw.comment, LIMITS.comment);
  const reference_url = sanitize(raw.reference_url, LIMITS.reference_url);
  const source = sanitize(raw.source, LIMITS.source);
  const roistat_visit = sanitize(raw.roistat_visit, LIMITS.roistat_visit);
  const attachments = sanitizeAttachments(raw.attachments);

  if (!name || !phone) {
    return jsonResponse({ ok: false, error: 'name_and_phone_required' }, 400, origin);
  }
  if (!PHONE_RE.test(phone)) {
    return jsonResponse({ ok: false, error: 'invalid_phone' }, 400, origin);
  }
  if (email && !EMAIL_RE.test(email)) {
    return jsonResponse({ ok: false, error: 'invalid_email' }, 400, origin);
  }
  if (reference_url && !URL_RE.test(reference_url)) {
    return jsonResponse({ ok: false, error: 'invalid_reference_url' }, 400, origin);
  }
  if (!source || !ALLOWED_SOURCES.has(source)) {
    return jsonResponse({ ok: false, error: 'invalid_source' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('supabase_env_missing');
    return jsonResponse({ ok: false, error: 'internal' }, 500, origin);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ip = extractIp(req);
  const ipHash = await sha256Hex(ip);

  // Rate-limit через выделенную таблицу rate_limit_log (не ПДн).
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000,
  ).toISOString();
  const { count: recentCount, error: rateError } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', windowStart);

  if (rateError) {
    console.error('rate_limit_query_failed', rateError);
    return jsonResponse({ ok: false, error: 'internal' }, 500, origin);
  }
  if ((recentCount ?? 0) >= RATE_LIMIT_MAX_PER_WINDOW) {
    return jsonResponse({ ok: false, error: 'rate_limited' }, 429, origin);
  }

  // Регистрируем попытку в rate_limit_log (best-effort: ошибка не блокирует).
  const { error: rateInsertError } = await supabase
    .from('rate_limit_log')
    .insert({ ip_hash: ipHash });
  if (rateInsertError) {
    console.warn('rate_limit_log_insert_failed', rateInsertError);
  }

  const bitrixBase = Deno.env.get('BITRIX_WEBHOOK_URL');

  // ----- Режим A: Bitrix-only (152-ФЗ compliant) -----
  if (bitrixBase) {
    const bitrixResult = await sendToBitrix(bitrixBase, {
      name,
      phone,
      email: email || undefined,
      comment: comment || undefined,
      reference_url: reference_url || undefined,
      source,
      roistat_visit: roistat_visit || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (!bitrixResult.ok) {
      console.error('bitrix_send_failed', bitrixResult.error);
      // Telegram-нотификация даже при сбое Bitrix — менеджер не теряет заявку.
      notifyTelegram(
        {
          name,
          phone,
          email: email || undefined,
          comment: comment || undefined,
          reference_url: reference_url || undefined,
          source,
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        `(Bitrix FAIL: ${bitrixResult.error.slice(0, 80)})`,
      );
      return jsonResponse({ ok: false, error: 'bitrix_send_failed' }, 502, origin);
    }

    notifyTelegram(
      {
        name,
        phone,
        email: email || undefined,
        comment: comment || undefined,
        reference_url: reference_url || undefined,
        source,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      `#${bitrixResult.id}`,
    );

    return jsonResponse({ ok: true, leadId: String(bitrixResult.id) }, 200, origin);
  }

  // ----- Режим B: Bitrix не настроен → fallback в public.leads -----
  // Страховка на time-in-transit: PR #2 безопасно мержится до того как владелец
  // настроит BITRIX_WEBHOOK_URL. Когда secret выставлен — этот блок не выполняется.
  console.warn('bitrix_webhook_url_missing — falling back to public.leads insert');

  const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 500) || null;

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert({
      name,
      phone,
      email: email || null,
      comment: comment || null,
      reference_url: reference_url || null,
      source,
      roistat_visit: roistat_visit || null,
      user_agent: userAgent,
      ip_hash: ipHash,
      bitrix_lead_id: null,
      bitrix_error: 'bitrix_webhook_url_missing',
    })
    .select('id')
    .single();

  if (insertError || !lead) {
    console.error('lead_insert_failed', insertError);
    return jsonResponse({ ok: false, error: 'internal' }, 500, origin);
  }

  notifyTelegram(
    {
      name,
      phone,
      email: email || undefined,
      comment: comment || undefined,
      reference_url: reference_url || undefined,
      source,
      attachments: attachments.length > 0 ? attachments : undefined,
    },
    `#${lead.id.slice(0, 8)} (fallback)`,
  );

  return jsonResponse({ ok: true, leadId: lead.id }, 200, origin);
});
