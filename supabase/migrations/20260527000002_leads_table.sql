-- Лиды (заявки) с сайта. Edge Function `create-lead` пишет сюда, опционально
-- проксирует в Bitrix24 (если задан BITRIX_WEBHOOK_URL).
create table if not exists public.leads (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null,
    phone text not null,
    email text,
    comment text,
    reference_url text,
    source text,
    roistat_visit text,
    user_agent text,
    bitrix_lead_id bigint,
    bitrix_error text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_source_idx on public.leads (source);

alter table public.leads enable row level security;

drop policy if exists "leads anon insert" on public.leads;
create policy "leads anon insert"
    on public.leads for insert
    to anon
    with check (true);

drop policy if exists "leads service all" on public.leads;
create policy "leads service all"
    on public.leads for all
    to service_role
    using (true)
    with check (true);
