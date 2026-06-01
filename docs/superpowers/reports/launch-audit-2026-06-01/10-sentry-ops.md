# Sentry / Operational Findings

## Vercel runtime logs (last 7 days, production)

Query: `mcp__claude_ai_Vercel__get_runtime_logs` level=error,fatal since=7d limit=50

Результат: **3 error entries** за неделю — это весьма мало для production e-commerce. Признаки:

| Time | Method | Path | Status | Message (truncated) |
|---|---|---|---|---|
| 13:22:11 | GET | /privacy | 200 | StorefrontLayout: failed to... |
| 13:22:09 | GET | /oferta | 200 | StorefrontLayout: failed to... |
| 13:22:03 | GET | /blog | 200 | WARN: ... |

Note: query вернулась с warning `Runtime log query timed out before all pages were fetched` — возможно больше errors есть глубже, но MCP не достал. Full-text search `query="StorefrontLayout"` over 14d не дал результата — что странно, видимо log retention или search index не охватывает текущий период.

## 🟡 WARNINGS

### O1. Sentry активность не верифицирована — DSN status unknown
**Severity:** 🟡
**Location:** `instrumentation.ts` (server+edge) + `sentry.client.config.ts` (browser)
**Issue:** Этот audit не отправил test event в Sentry (требует DSN + дашборд для подтверждения). По CLAUDE.md §13 — если `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` не выставлены, Sentry no-op'ит везде. Не известно реально ли мониторинг работает.
**Fix:** ручной тест:
```js
// в browser DevTools на live сайте
window.Sentry?.captureMessage('[AUDIT] test ' + Date.now())
```
Если `window.Sentry` undefined → DSN не выставлен на client → fix через Vercel env.
Если есть → проверить в Sentry dashboard issues что event пришёл.
**Verification:** dashboard issue с `[AUDIT]` префиксом.

### O2. Vercel runtime logs возвращают partial results
**Severity:** 🟡 (наблюдательное)
**Issue:** MCP `get_runtime_logs` дважды warning'нул timeouts. Это означает что monitoring depth ограничен — нельзя за один запрос вытащить всю историю.
**Fix:** для launch'а — настроить интеграцию Sentry + Vercel + alerts. При reports'е поднимать вручную через `since=24h limit=100` и постранично.

### O3. CLAUDE.md context drift — несколько утверждений устарели
**Severity:** 🟡 (документация)
**Drift findings (from subagents):**
- CLAUDE.md §2: указывает Next.js 14.2.35 — реально на проде Next.js 15.4.11 + React 19 (per security subagent)
- CLAUDE.md §15 admin panel: легаси `/admin/login`, `safeNextPath`, `requireAdmin()` упоминаются как живые — реально удалены, заменены на Payload admin (per security + code-review subagents)
- CLAUDE.md §11: "checkout сейчас demo-alert" — реально `checkoutClient.tsx` делает реальный `createOrder` POST (per code-review subagent C3)
- CLAUDE.md §6 supabase functions: упоминает `create-lead` Edge Function как живую — реально удалена (CLAUDE.md §10 уже отметил, но §6 не sync'нут)
- CLAUDE.md §13 release checklist: говорит про Vercel aliases в CSRF whitelist — реально whitelist только `localhost:3000` + `studio.pnhd.ru` (per code-review C2)
**Impact:** новые ИИ-сессии (и люди) опираются на устаревший контекст → плохие решения. Например, аудиторы могут поверить что checkout demo'шный и пропустить crash на проде.
**Fix:** sync CLAUDE.md секции 2/6/11/13/15 с реальностью после фикса blocker'ов.
**Verification:** новый ИИ-сеанс с CLAUDE.md → grep ключевых утверждений совпадает с кодом.

## 🟢 NICE-TO-HAVE

- Performance / latency monitoring (P95/P99) на key endpoints — не настроено через MCP visible. Если нужно — Vercel Analytics + Sentry Performance.
- Uptime monitoring (alarm на 5xx burst, downtime) — не настроено. Recommend: Better Uptime / UptimeRobot.

## Verification log

- ✅ Vercel runtime logs scan за 7 дней
- ✅ Vercel project metadata (deployment, domains)
- ⚠️ Vercel logs query вернул partial (timeout warnings)
- ❌ Sentry test event: не отправлен (нет MCP для Sentry, требует manual browser action)
- ❌ Sentry dashboard inspection: требует UI access
- ❌ Bitrix CRM integration verification: env var `BITRIX_WEBHOOK_URL` не проверен (Vercel MCP не возвращает env values; косвенно не проверял потому что F1 — form-submissions endpoint 500 — блокирует test submission)
- ❌ Telegram bot integration verification: same reason
