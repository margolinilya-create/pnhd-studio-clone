-- Таблица допущенных в админку пользователей.
-- Подключается к auth.users через user_id; email хранится для удобства отображения и audit'а.
create table public.admin_users (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    email      text not null unique,
    created_at timestamptz not null default now()
);

-- RLS на самой таблице: только сам админ видит свою запись (через service_role читаем серверно).
alter table public.admin_users enable row level security;

create policy "admin_users self read" on public.admin_users
    for select to authenticated
    using (user_id = auth.uid());

-- Helper-функция для RLS-политик на остальных таблицах и для guard'а в Server Actions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists(
        select 1 from public.admin_users
        where user_id = auth.uid()
    );
$$;

comment on function public.is_admin is 'True если auth.uid() есть в admin_users. Используется в RLS-политиках всех write-таблиц.';
