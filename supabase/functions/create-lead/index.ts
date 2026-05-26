// Supabase Edge Function: create-lead
// Принимает заявки из форм клона pnhd-studio, пишет в public.leads,
// опционально проксирует в Bitrix24 incoming webhook (если задан BITRIX_WEBHOOK_URL).
//
// Env:
//   SUPABASE_URL                — выставляется автоматически
//   SUPABASE_SERVICE_ROLE_KEY   — выставляется автоматически
//   BITRIX_WEBHOOK_URL          — опц. https://<portal>.bitrix24.ru/rest/<user>/<token>/
//                                 (заполнять без crm.lead.add — функция добавит сама)
//   TELEGRAM_BOT_TOKEN          — опц.
//   TELEGRAM_CHAT_ID            — опц.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type LeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  comment?: string;
  reference_url?: string;
  source?: string;
  roistat_visit?: string;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function sendToBitrix(
  webhookBase: string,
  payload: LeadPayload,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const url = webhookBase.replace(/\/+$/, '') + '/crm.lead.add.json';
  const fields = {
    TITLE: `Сайт pnhd: ${payload.source ?? 'lead'} — ${payload.name ?? ''}`,
    NAME: payload.name ?? '',
    PHONE: [{ VALUE: payload.phone ?? '', VALUE_TYPE: 'WORK' }],
    EMAIL: payload.email
      ? [{ VALUE: payload.email, VALUE_TYPE: 'WORK' }]
      : undefined,
    COMMENTS: [
      payload.comment ?? '',
      payload.reference_url ? `\nРеференс: ${payload.reference_url}` : '',
      payload.roistat_visit ? `\nroistat_visit: ${payload.roistat_visit}` : '',
    ]
      .filter(Boolean)
      .join(''),
    SOURCE_DESCRIPTION: payload.source ?? '',
  };

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

async function notifyTelegram(payload: LeadPayload, leadId: string): Promise<void> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;
  const text = [
    `Новая заявка #${leadId.slice(0, 8)}`,
    `Источник: ${payload.source ?? '—'}`,
    `Имя: ${payload.name ?? '—'}`,
    `Телефон: ${payload.phone ?? '—'}`,
    payload.email ? `Email: ${payload.email}` : '',
    payload.comment ? `Комментарий: ${payload.comment}` : '',
    payload.reference_url ? `Референс: ${payload.reference_url}` : '',
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
    // тихо: уведомление не критично
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
  }

  let payload: LeadPayload;
  try {
    payload = (await req.json()) as LeadPayload;
  } catch {
    return jsonResponse({ ok: false, error: 'invalid_json' }, 400);
  }

  const name = (payload.name ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  if (!name || !phone) {
    return jsonResponse({ ok: false, error: 'name_and_phone_required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ ok: false, error: 'supabase_env_missing' }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userAgent = req.headers.get('user-agent') ?? null;
  const insertRow = {
    name,
    phone,
    email: payload.email?.trim() || null,
    comment: payload.comment?.trim() || null,
    reference_url: payload.reference_url?.trim() || null,
    source: payload.source?.trim() || null,
    roistat_visit: payload.roistat_visit?.trim() || null,
    user_agent: userAgent,
    bitrix_lead_id: null as number | null,
    bitrix_error: null as string | null,
  };

  const { data: lead, error: insertError } = await supabase
    .from('leads')
    .insert(insertRow)
    .select('id')
    .single();

  if (insertError || !lead) {
    return jsonResponse(
      { ok: false, error: insertError?.message ?? 'insert_failed' },
      500,
    );
  }

  // Optional: Bitrix24 webhook
  const bitrixBase = Deno.env.get('BITRIX_WEBHOOK_URL');
  if (bitrixBase) {
    const bitrixResult = await sendToBitrix(bitrixBase, { ...payload, name, phone });
    if (bitrixResult.ok) {
      await supabase
        .from('leads')
        .update({ bitrix_lead_id: bitrixResult.id })
        .eq('id', lead.id);
    } else {
      await supabase
        .from('leads')
        .update({ bitrix_error: bitrixResult.error })
        .eq('id', lead.id);
    }
  }

  // Optional: Telegram notification (не блокирует ответ)
  notifyTelegram({ ...payload, name, phone }, lead.id);

  return jsonResponse({ ok: true, leadId: lead.id });
});
