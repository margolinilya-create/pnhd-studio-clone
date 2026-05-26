# Bootstrap первого админа

> Эта процедура выполняется **один раз** при настройке нового окружения (production / preview).
> Источник правды для admin-доступа — таблица `public.admin_users`.

## Pre-requisites: переменные окружения

Перед первым входом в `/admin/login` нужно положить в `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<секрет из Supabase Dashboard → Project Settings → API → service_role>
```

И добавить в `.env.example` (для документации):

```
SUPABASE_SERVICE_ROLE_KEY=
```

В Vercel: Project Settings → Environment Variables → добавить `SUPABASE_SERVICE_ROLE_KEY` для Production + Preview + Development (значение **server-only**, без префикса `NEXT_PUBLIC_`).

## Шаги создания админа

1. **Supabase Dashboard → Authentication → Users → Add user → Create new user**
   - Email: целевой email админа (например, `margolinilya@gmail.com`)
   - Password: сгенерировать через `openssl rand -base64 24`, сохранить в менеджер паролей
   - Auto Confirm User: ✅ (иначе нужна email-верификация)

2. **Скопировать User UID** из созданной записи (вид: `8f3e1d2c-...`).

3. **Добавить в allowlist** (SQL Editor или через MCP `execute_sql`):

   ```sql
   insert into public.admin_users(user_id, email)
   values ('<USER_UID>', '<email>');
   ```

4. **Проверить вход** на `http://localhost:3000/admin/login`.

## Удаление админа

```sql
delete from public.admin_users where email = '<email>';
-- При необходимости полностью удалить юзера:
-- Supabase Dashboard → Authentication → Users → ... → Delete user
```

## Сброс пароля

Через Supabase Dashboard → Authentication → Users → `...` → Send password recovery.
В v1 self-service сброса нет.

## Что делать если забыл service_role key

Supabase Dashboard → Project Settings → API → service_role → `Reveal`. Ротация — там же через `Regenerate`.
**После ротации** обновить `.env.local` и Vercel env vars.
