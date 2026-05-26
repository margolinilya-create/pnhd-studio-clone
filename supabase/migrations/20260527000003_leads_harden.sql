-- 1) Rate-limit / abuse tracking column (SHA-256 of IP, not raw IP — PII-safe).
alter table public.leads add column if not exists ip_hash text;
create index if not exists leads_ip_hash_recent_idx
    on public.leads (ip_hash, created_at desc)
    where ip_hash is not null;

-- 2) Drop direct anon-insert RLS policy on leads. All writes must go through the
--    Edge Function (which uses service_role); the anon-insert path bypasses
--    validation/Bitrix routing and is therefore an abuse surface.
drop policy if exists "leads anon insert" on public.leads;

-- 3) Tighten the user-uploads bucket: drop SVG (XSS via inline JS) and remove
--    the catch-all anon-insert policy in favour of a path-prefix policy.
update storage.buckets
    set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
    where id = 'user-uploads';

drop policy if exists "user-uploads anon insert" on storage.objects;
create policy "user-uploads anon insert prints"
    on storage.objects for insert
    to anon
    with check (
        bucket_id = 'user-uploads'
        and (storage.foldername(name))[1] = 'prints'
    );
