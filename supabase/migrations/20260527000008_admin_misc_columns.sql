-- SEO-поля для админской формы товара.
alter table public.products
    add column if not exists meta_title       text,
    add column if not exists meta_description text;

-- Статус заявки для модуля /admin/leads.
alter table public.leads
    add column if not exists status text not null default 'new'
        check (status in ('new','contacted','done','spam'));

create index if not exists leads_status_idx on public.leads(status);
