-- PR #2 (152-ФЗ migration): отдельная таблица под rate-limit, чтобы перестать
-- использовать `public.leads` как rate-limit-стор и стать data-minimal.
--
-- Контекст:
--   После PR #2 Edge Function `create-lead` перестаёт писать ПДн в `public.leads`,
--   когда задан `BITRIX_WEBHOOK_URL` — лиды уходят прямиком в Bitrix24 (РФ).
--   Старая логика rate-limit делала COUNT по leads.ip_hash и работать перестанет.
--
--   `rate_limit_log` хранит только sha256(ip) + timestamp. ПДн не содержит
--   (по 152-ФЗ хэш необратим без брутфорса и не является ПДн), хранение
--   на EU-инфре допустимо.

create table if not exists public.rate_limit_log (
    id bigserial primary key,
    ip_hash text not null,
    created_at timestamptz not null default now()
);

create index if not exists rate_limit_log_ip_recent_idx
    on public.rate_limit_log (ip_hash, created_at desc);

create index if not exists rate_limit_log_created_at_idx
    on public.rate_limit_log (created_at);

-- RLS: только service_role (Edge Function) пишет и читает. anon — никакого доступа.
alter table public.rate_limit_log enable row level security;

-- pg_cron: чистим записи старше 10 минут каждые 5 минут.
-- Не нужны записи дольше окна rate-limit (60 сек) — берём 10× запас на отладку.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'rate-limit-log-cleanup') then
    perform cron.unschedule('rate-limit-log-cleanup');
  end if;
end $$;

select cron.schedule(
  'rate-limit-log-cleanup',
  '*/5 * * * *',
  $$delete from public.rate_limit_log where created_at < now() - interval '10 minutes'$$
);
