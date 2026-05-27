-- supabase/migrations/20260527000010_user_uploads_sweeper.sql
--
-- pg_cron вызывает Edge Function cleanup-user-uploads ежедневно в 03:30 UTC.
-- Секрет хранится в Vault, не в коде миграции.
--
-- ВАЖНО: перед применением миграции — секрет CLEANUP_SECRET должен быть
-- создан в vault:
--   select vault.create_secret('<CLEANUP_SECRET_VALUE>', 'edge_function_cleanup_secret');
-- Это делается вручную через Supabase Dashboard SQL Editor отдельно от миграции,
-- чтобы значение секрета не попадало в git.
--
-- Rollback: select cron.unschedule('cleanup-user-uploads');

create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-user-uploads') then
    perform cron.unschedule('cleanup-user-uploads');
  end if;
end $$;

select cron.schedule(
  'cleanup-user-uploads',
  '30 3 * * *',
  $cron$
    select net.http_post(
      url := 'https://almfjmiygtnzngkayhdv.supabase.co/functions/v1/cleanup-user-uploads',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Cleanup-Secret', (
          select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_cleanup_secret'
        )
      )
    ) as request_id;
  $cron$
);
