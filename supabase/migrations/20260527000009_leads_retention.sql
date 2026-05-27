-- supabase/migrations/20260527000009_leads_retention.sql
--
-- Удерживаем лиды в public.leads 90 дней (152-ФЗ purpose-limited storage).
-- Cron-задача ежедневно в 03:00 UTC удаляет всё что старше cutoff.
--
-- Rollback: select cron.unschedule('cleanup-old-leads');

create extension if not exists pg_cron with schema extensions;

-- Drop существующего job'а (idempotent rerun миграции)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup-old-leads') then
    perform cron.unschedule('cleanup-old-leads');
  end if;
end $$;

select cron.schedule(
  'cleanup-old-leads',
  '0 3 * * *',
  $cron$delete from public.leads where created_at < now() - interval '90 days'$cron$
);
