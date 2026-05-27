# Supabase Vault secrets — manual setup

These secrets are stored in `vault.secrets` and decrypted via `vault.decrypted_secrets`.
They are NOT in git — values must be set manually via Dashboard SQL Editor.

## edge_function_cleanup_secret

Used by migration `20260527000010_user_uploads_sweeper.sql` (pg_cron job
`cleanup-user-uploads`) to authenticate against the Edge Function of the
same name.

Setup (one-time):

```sql
select vault.create_secret(
  '<HEX_VALUE>',  -- openssl rand -hex 32
  'edge_function_cleanup_secret',
  'Secret for invoking cleanup-user-uploads Edge Function from pg_cron'
);
```

The same hex value must also be set as the `CLEANUP_SECRET` env in
Supabase Dashboard → Edge Functions → Secrets so the function can
verify the header.

To rotate:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'edge_function_cleanup_secret'),
  '<NEW_HEX_VALUE>'
);
```

And update `CLEANUP_SECRET` env on the function side to match.
