# CMS / Payload Sanity Findings

Прямые проверки против Supabase prod БД (project `almfjmiygtnzngkayhdv`) и Payload runtime на https://pnhd-studio-clone.vercel.app. Полностью пересекается с DB subagent findings ([06-db-rls-findings.md](./06-db-rls-findings.md)) — этот файл фокусируется на CMS-специфичных подтверждениях.

## 🔴 BLOCKERS

### CMS1. Payload form-builder migration НЕ применена на prod — `payload.forms` + `payload."form-submissions"` отсутствуют
**Severity:** 🔴
**Evidence:**
1. `mcp__claude_ai_Supabase__list_tables` schemas `["payload"]` → в списке таблиц **нет** `forms` и нет `form-submissions`.
2. `select name FROM payload.payload_migrations` → 5 рядов, последняя применённая — `payload_init_pages_drafts`. 3 локальные миграции **не дошли до прода**: `payload_plugin_import_export`, `payload_plugin_form_builder`, `payload_form_submissions_extra_fields`.
3. Live POST: `curl -X POST https://pnhd-studio-clone.vercel.app/api/form-submissions -d '{}'` → **500 `{"errors":[{"message":"Something went wrong."}]}`**
**Impact:** все 5 лид-форм на сайте (footer, popup, NoModelBlock, product-page, methods-consultation) submit'ят → 500 → юзер видит generic error → лид теряется. Лид-pipeline на проде сломан.
**Fix:**
```bash
# С production DATABASE_URI в .env.local:
npm run payload migrate
# Затем seed форм:
npx tsx --env-file=.env.production scripts/seed-forms.ts
```
Или вручную через Supabase SQL Editor — миграции в `src/migrations/` идут в виде up()/down() function exports, надо их транспилировать или просто применить эквивалентный SQL.
**Verification:**
- `select count(*) from payload.forms` → ≥ 5
- POST /api/form-submissions с валидным payload → 201
- Payload admin → Forms collection видит 5 seed-форм
- Footer form submit → success state на UI

### CMS2. Schema drift между local и prod (`drop_admin_auth` миграция не применена)
**Severity:** 🔴 (per DB subagent B3)
**Location:** `supabase/migrations/20260529000002_drop_admin_auth.sql` — на проде НЕ применена. `admin_users` table + `is_admin()` function + admin write-policies всё ещё живут.
**Impact:** Dead code в БД. Legacy `/admin/login` (которого больше нет в коде — security subagent подтвердил) raises риск что разработчик подумает что admin контроль работает, или что-то импортит мёртвую функцию.
**Fix:** применить миграцию через Supabase SQL Editor или MCP `apply_migration`.

## 🟡 WARNINGS

### CMS3. `is_admin()` callable by anon role
**Severity:** 🟡 (per DB B2)
**Evidence:** прямой POST подтверждён:
```bash
curl -X POST https://almfjmiygtnzngkayhdv.supabase.co/rest/v1/rpc/is_admin \
  -H "apikey: <anon>" -H "Content-Type: application/json" -d '{}'
# → 200 false
```
**Issue:** PUBLIC EXECUTE grant inheritance — миграция `20260527224137_revoke_is_admin_anon` revoke'ит от anon/authenticated, но PUBLIC всё ещё может EXECUTE. Anon role probe'ит admin endpoint.
**Fix (DB)**: `REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;` или дроп функции (если admin-flow всё мигрировал на Payload). Также см. CMS2 — если применить `drop_admin_auth` migration, `is_admin` будет удалён.

### CMS4. Payload migrations idempotency через CI
**Severity:** 🟡
**Issue:** Per CLAUDE.md §13 "Release checklist", Payload migrations нужно вручную применять перед каждым деплоем. CI этого не делает — `payload migrate` не в `ci.yml`. На каждой новой коллекции / поле — release-checklist обязателен. Если разработчик забудет (как было с form-builder) — endpoint падает 500.
**Fix:** добавить `payload migrate` step в Vercel deploy hook (preDeploy) или в CI workflow. Альтернатива — Payload может авто-применять миграции на boot (но это рискованно для production).
**Verification:** деплой с новой миграцией → миграции применены до того как первый user request приходит.

### CMS5. Latest production deployment основан на `feat/access-read-for-all-roles`, не на main
**Severity:** 🟡
**Evidence:** `mcp__claude_ai_Vercel__get_project` показал latestDeployment.url = `pnhd-studio-clone-ihfxgdapj-...` с GitHub ref `feat/access-read-for-all-roles`. Однако project domain `pnhd-studio-clone.vercel.app` указывает на этот deployment.
**Issue:** Конфигурация Vercel может быть нестандартной (или у этого preview deployment promoted). Hard to tell без углубления. Худший сценарий: prod domain серверит код фичевой ветки, не main.
**Fix:** verify в Vercel Dashboard → Deployments → найти "Production" target. Если фича-бранч промоутнут как production — это либо deliberate move, либо ошибка.

## 🟢 NICE-TO-HAVE

- 25 products в `payload.products` (синхронизированы с `public.products`). Storefront читает из `public.products` per `src/lib/queries/products.ts` — это duplicated data layer. После полной миграции на Payload — `public.*` каталог может быть удалён.
- `payload.payload_locked_documents` имеет 0 рядов — нет stale locks от прерванных edit-сессий.

## Verification log

- ✅ Payload migration state via `payload.payload_migrations` query
- ✅ Forms table existence: подтверждено отсутствие
- ✅ Live POST `/api/form-submissions` → 500 проверен
- ✅ `is_admin()` RPC callable by anon: подтверждено `200 false`
- ✅ Vercel deployment latest meta verified
- ⚠️ Payload admin manual sanity (login + Form collection edit) — НЕ выполнен interactively (потребовал бы credentials)
- ❌ Backup retention plan (Supabase Pro vs Free): не проверено через MCP, требует Dashboard check
- ❌ `DATABASE_URI` connection pool config (transaction pooler 6543): не проверено
