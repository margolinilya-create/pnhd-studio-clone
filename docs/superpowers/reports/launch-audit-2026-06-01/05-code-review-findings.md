# Code-level Bugs — Launch Readiness Findings

**Project:** `pnhd-studio-clone` (next.js 14 + Payload + Redux storefront)
**Date:** 2026-06-01
**Scope:** §5 of launch-readiness-audit spec — lead pipeline (Payload form-builder), cart (Redux + listener middleware), admin server actions, edge cases.
**Mode:** Read-only. No write operations executed.

---

## TL;DR

| Severity | Count | Highlights |
|---|---|---|
| 🔴 Blockers | 4 | `LeadForm` never sends `agreement` to forms that mark it required; Vercel preview origins drop POST `/api/form-submissions` on CSRF when `ALLOWED_ORIGINS` missing; `Order` row created without rollback if any `order-items.create` fails; `notifyBitrix`/`notifyTelegram` hung fetch blocks form-submission response for full Vercel timeout |
| 🟡 Warnings | 7 | Spoofable rate-limit via `x-forwarded-for`; race on concurrent rate-limit check (no transactional claim); upload `<input>` `value` never reset (re-uploading same file no-op); pre-cart orphan leak when user replaces in-place; `setPrintFile`/`setPrintLocation` not in orphan-cleanup matcher (latent dead reducers); UploadSlot orphan leak when component unmounts mid-upload; mobile menu open state survives programmatic navigation |
| 🟢 Nice-to-have | 5 | `paymentUrl` dead state field; commented-out redirect logic in CartIcon; brittle `args.data` mutation contract; checkout error mapping ignores network failure; missing tests for race conditions |

The §15 admin Server Actions referenced in the task brief are **no longer present in the codebase** — admin migrated to Payload built-in admin (`src/app/(payload)/admin/[[...segments]]`). Atomicity / DOMPurify / Storage orphan concerns now apply to the custom POST `/api/orders/create` endpoint and Payload form-builder hooks instead.

---

## 🔴 BLOCKERS

### C1. `LeadForm` does not send `agreement` field — required field check may reject submissions

**Severity:** 🔴
**Location:** `src/components/shared-components/lead-form/lead-form.tsx:40-51` and `scripts/seed-forms.ts:46,57`
**Issue:** The `Footer Lead` and `Popup Lead` form schemas (seeded by `scripts/seed-forms.ts`) declare `agreement` as `blockType: 'checkbox', required: true`. `LeadForm.submitHandler` only includes `name`, `phone`, `source`, `roistatVisit` in `fields` — never `agreement`. The `isAgreedWithPrivacyPolicy` flag is consumed only as a client-side gate (`if (!isAgreedWithPrivacyPolicy) return;`) and never sent to the server.

Today this happens to work because `@payloadcms/plugin-form-builder`'s `form-submissions` collection does **not** validate `submissionData` against the form's field schema (verified in `node_modules/@payloadcms/plugin-form-builder/dist/collections/FormSubmissions/index.js:36-63` — the `validate` only enforces field-shape, not presence of required form fields). The submission is accepted, but compliance / audit-wise we never persist proof of consent. The instant Payload adds field-level validation (or a custom `beforeOperation` is written), every footer/popup submission starts 4xx-ing in production.

Beyond the compliance angle: marketing later filtering by `submissionData WHERE field='agreement' AND value='true'` would falsely show **all** footer leads as non-consenting.

**Repro:** submit the footer form. Inspect the resulting `form_submissions` row — `submissionData` contains `name`, `phone`, `source`, optionally `roistatVisit`. No `agreement`.
**Fix:**
```ts
// lead-form.tsx
await submitForm({
  formId,
  fields: {
    name: name.trim(),
    phone: phone.replaceAll(' ', ''),
    agreement: isAgreedWithPrivacyPolicy,  // ← new
    source,
    ...(roistat ? { roistatVisit: roistat } : {}),
  },
});
```
`submit-form.ts` already coerces booleans via `String(value)` (line 11) → "true"/"false". Either keep that or special-case booleans server-side.

**Verification:** integration test that submits LeadForm and asserts the resulting `form-submissions.submissionData` array contains an entry `{ field: 'agreement', value: 'true' }`.

---

### C2. CSRF default origins block Vercel preview / production-alias submissions

**Severity:** 🔴
**Location:** `src/payload.config.ts:184-189`
**Issue:**
```ts
cors: process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:3000', 'https://studio.pnhd.ru'],
csrf: process.env.ALLOWED_ORIGINS
  ? ... same fallback ...
  : ['http://localhost:3000', 'https://studio.pnhd.ru'],
```
`CLAUDE.md` claims the fallback "uses встроенный list (studio.pnhd.ru, наши Vercel-aliases, localhost:3000, regex pnhd-studio-clone-*.vercel.app)" — but **the code does not match that documentation**. Only the two literal origins are whitelisted when env is missing.

Production prod-alias is `pnhd-studio-clone-margolinilya-creates-projects.vercel.app` (per CLAUDE.md §13), and every PR preview gets `pnhd-studio-clone-*-margolinilya-creates-projects.vercel.app`. If `ALLOWED_ORIGINS` is not set in Vercel (Production / Preview), Payload's CSRF middleware will reject `POST /api/form-submissions` (and the existing `POST /api/orders/create` from `checkoutClient.tsx`) for every visitor that lands on the Vercel alias rather than the apex domain. Forms silently 403.

**Repro:** unset `ALLOWED_ORIGINS` in Vercel → visit `https://pnhd-studio-clone-margolinilya-creates-projects.vercel.app/` → submit footer form → 403.
**Fix:** either (a) set `ALLOWED_ORIGINS` to a comma-separated list including all live aliases, or (b) widen the fallback in code:
```ts
const fallback = [
  'http://localhost:3000',
  'https://studio.pnhd.ru',
  'https://pnhd-studio-clone-margolinilya-creates-projects.vercel.app',
  // …all known production hosts
];
```
Payload CSRF supports a function for dynamic origin matching, but for our small set a static list is fine.

**Verification:** smoke-test from each Vercel alias. Network tab shows 201 (not 403) on `/api/form-submissions` POST.

---

### C3. `POST /api/orders/create` is non-atomic — partial order ↔ order-items state on any item failure

**Severity:** 🔴
**Location:** `src/app/(payload)/api/orders/create/route.ts:169-207`
**Issue:** The endpoint creates the `Order` row in one `payload.create` call, then loops `for (const it of resolvedItems) await payload.create({collection:'order-items', ...})`. There is no transaction wrapper. If the loop fails halfway (DB blip, Payload validation rejection on item 3 of 5), the user gets a 500 but **the `Order` row plus N-1 items are committed**, leaving an inconsistent order in the system (status `draft`, paymentStatus `unpaid`, lineTotal subtotal matches all 5, but only 2 line items exist).

This is also reachable via the more practical path: `payload.create('orders', ...)` fires the form-builder/Sentry `afterChange` hooks that issue external HTTP calls. If those plugins throw downstream (Sentry currently does NOT, but a future hook could), the order persists while the API surface to the client looks "failed".

**Repro:** intentionally inject a constraint error on order-items table or crash mid-loop → check `payload.orders` table — orphan row.
**Fix:** wrap in Payload's `payload.db.beginTransaction()` / `commitTransaction()` / `rollbackTransaction()` (Postgres adapter supports it):
```ts
const transactionID = await payload.db.beginTransaction();
try {
  const order = await payload.create({ collection: 'orders', data, req: { transactionID } });
  for (const it of resolvedItems) {
    await payload.create({ collection: 'order-items', data: { ...it, order: order.id }, req: { transactionID } });
  }
  await payload.db.commitTransaction(transactionID);
} catch (err) {
  await payload.db.rollbackTransaction(transactionID);
  throw err;
}
```
Same pattern is missing for promo apply — if the promo-find succeeded but order create races against a concurrent promo `validUntil` update, you'd still apply the discount.

**Verification:** unit-test the route with a payload mock that throws on the 3rd `payload.create('order-items')` and assert that no orders row remains (check via separate read).

---

### C4. `notifyBitrix` / `notifyTelegram` block form-submission response for full Vercel timeout on hung upstream

**Severity:** 🔴
**Location:** `src/hooks/notifyBitrix.ts:64-99` and `src/hooks/notifyTelegram.ts:34-47`
**Issue:** Both hooks run as `afterChange` (sequentially per `payload.config.ts:141`) and `await fetch(...)` without `AbortController` or timeout. Node's `undici` `fetch` **has no default timeout**. If Bitrix24 or `api.telegram.org` is slow or hung (network partition, DDOS, rate-limit hold), the entire submission response is delayed until Vercel kills the function (~10s on Hobby, 60s on Pro for serverless functions).

User experience: clicks "Отправить" → spinner for up to 60s → either eventually succeeds or 504s. The submission itself was already committed in DB (afterChange runs after create), so lead is captured — but UX impression is broken, and there's a real chance of duplicate submits if the user reloads.

Equally bad: with `notifyBitrix` running first, a 60s Bitrix hang means `notifyTelegram` (line 141 in config: `afterChange: [notifyBitrix, notifyTelegram]`) never even fires.

**Repro:** point `BITRIX_WEBHOOK_URL` at `http://10.0.0.1:81/` (unroutable) → submit form → measure response time.
**Fix:** add per-request timeout via `AbortSignal.timeout(5000)`:
```ts
const ctrl = AbortSignal.timeout(5000);
const res = await fetch(endpoint, { ..., signal: ctrl });
```
And consider running both in parallel via `Promise.allSettled` instead of sequential `afterChange`:
```ts
afterChange: [async (ctx) => {
  await Promise.allSettled([notifyBitrix(ctx), notifyTelegram(ctx)]);
}],
```
But Payload doesn't natively support parallel `afterChange` — the cleanest fix is per-hook timeout + accept sequential.

**Verification:** add a test that stubs `fetch` to return a Promise that resolves after 30s, and asserts the hook itself rejects/returns within ~6s.

---

## 🟡 WARNINGS

### C5. Rate-limit IP extraction trusts unverified `x-forwarded-for` — spoofable bypass

**Severity:** 🟡
**Location:** `src/hooks/rateLimitFormSubmissions.ts:7-13`
**Issue:**
```ts
function extractIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  ...
}
```
On Vercel, `x-forwarded-for` is **appended-to** by Vercel's edge — i.e., if a client sends `X-Forwarded-For: 1.2.3.4` in their own request, Vercel produces a final header like `X-Forwarded-For: 1.2.3.4, <real-client-ip>, <vercel-edge>`. Splitting on `,` and taking `[0]` returns the **client-supplied (spoofed)** IP, not Vercel's authoritative one.

Attacker rotates the spoofed `X-Forwarded-For` value on every request → each request hashes to a different `ipHash` → rate-limit is bypassed entirely. The 3/min cap collapses to ∞/min.

**Repro:** `curl -X POST .../api/form-submissions -H 'X-Forwarded-For: 8.8.8.8' ... ` 10 times, each with a different IP → all succeed.
**Fix:** prefer `x-vercel-forwarded-for` (Vercel-controlled, not client-spoofable) on Vercel, fall back to `x-real-ip`, then `x-forwarded-for` only with the LAST element of the list (closest hop) rather than the first:
```ts
function extractIp(h: Headers): string {
  const vercel = h.get('x-vercel-forwarded-for'); if (vercel) return vercel.split(',')[0].trim();
  const real = h.get('x-real-ip'); if (real) return real;
  const fwd = h.get('x-forwarded-for'); if (fwd) {
    const parts = fwd.split(',').map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || 'unknown';   // last hop = closest to us
  }
  return 'unknown';
}
```

**Verification:** existing tests pass. Add new test simulating multi-hop XFF asserting we choose the last element.

---

### C6. Rate-limit `find` → `throw` is non-transactional — concurrent requests can both pass the gate

**Severity:** 🟡
**Location:** `src/hooks/rateLimitFormSubmissions.ts:31-48`
**Issue:** Classic check-then-act race. Two concurrent submissions from the same IP both run `payload.find({ where: { ipHash, createdAt > cutoff } })` simultaneously. Both see `totalDocs = MAX_PER_WINDOW - 1 = 2` (e.g. user already at 2). Both pass the `>=` check (`2 >= 3` is false). Both proceed to create, ending with **4 submissions in the window** instead of the allowed 3.

Probability is low for organic traffic but trivially exploitable by a bot. The mitigation that exists in production is just CSRF + the storefront flow gating, neither of which the rate-limit hook can rely on.

**Repro:** `xargs -P 20` parallel `curl POST /api/form-submissions` from same IP → count rows in `form_submissions` for that ipHash in the last 60s → exceeds 3.
**Fix:** the cheapest correct fix is to insert a `rate_limit_log` row inside the SAME transaction as the rate-check (Postgres `SELECT count() ... FOR UPDATE` is awkward through Payload; use raw `payload.db.drizzle.transaction` or a small SQL function `rate_limit_claim(ipHash text, window_seconds int, max int) returns bool`). Lighter touch: accept the 1-2 extra submissions per minute as cost, since downstream sieve (Bitrix dedup, manual review) catches it.

**Verification:** unit-test that fires N concurrent invocations and asserts at most `MAX_PER_WINDOW` succeed (Promise.all + count APIError rejections).

---

### C7. `UploadSlot` does not reset `<input>` value after upload — uploading the same filename twice is a no-op

**Severity:** 🟡
**Location:** `src/components/pages-components/shop-page/product-info/upload-slot.tsx:104-110`
**Issue:** The `<input type="file" />` element is rendered above the conditional. After a successful upload, the slot enters the `file ? ...` branch (line 111). User clicks `×` to clear (line 120-130) — `onClear()` removes the file from print-config — UI returns to the picker branch. The `<input>` element is the same DOM node (React keys it the same), still with `files[0]` set to the previously chosen file. **If the user picks the same file path again** (e.g. drags the same image), `onChange` does not fire because `e.target.value` is unchanged.

Same problem after `error` state — user sees "Файл больше 20 МБ", drags a smaller file with the same name → no-op.

**Repro:** upload `logo.png` → clear it → drag `logo.png` again → nothing happens.
**Fix:**
```ts
onChange={(e) => {
  handleFile(e.target.files?.[0]);
  e.target.value = '';   // reset so a same-named pick re-fires onChange
}}
```
And in `onClear`'s handler add `if (inputRef.current) inputRef.current.value = '';`.

**Verification:** RTL test that fires `change` on the input twice with the same `File` instance and asserts `onUpload` is called twice.

---

### C8. Pre-cart orphan leak: replacing a file in `UploadSlot` before clicking "В корзину" abandons the prior upload

**Severity:** 🟡
**Location:** `src/components/pages-components/shop-page/product-info/product-info.tsx:96-106` and `src/lib/storage/upload-print.ts`
**Issue:** Flow:
1. User uploads file A → `uploadPrintFile(A)` writes to `user-uploads/prints/<uuid-a>.png` → returns ref-A → local state `printConfig.files.front = ref-A`.
2. User changes their mind, drags file B → state now `files.front = ref-B` → `<uuid-a>.png` is still in Storage with **no Redux reference**, no cart entry, no orphan-cleanup trigger.
3. User clicks "В корзину" → `addToCart` dispatched with ref-B. ref-A is permanently orphaned until the nightly `cleanup-user-uploads` sweeper picks it up (14-day cutoff).

`cart-orphan-cleanup.ts` only watches Redux actions (line 28-36): `clearPrintFile`, `clearAllPrints`, `deleteItemFromCart`, `resetCart`, `updateCartItem`. The pre-cart state lives in React `useState`, so the middleware never sees the prior path.

**Repro:** open `/shop/<slug>`, choose "На груди", upload `a.png`, then drag `b.png` over the same slot → check Supabase Storage `user-uploads/prints/` → both objects present, only one referenced.
**Fix:** in `product-info.tsx::handleUpload`, before setting state with the new ref, capture the previous ref-A path and fire a best-effort `supabase.storage.remove([oldPath])`:
```ts
const handleUpload = async (side, file) => {
  const oldRef = printConfig.files[side];
  const ref = await uploadPrintFile(file);
  setPrintConfig((prev) => ({ ...prev, files: { ...prev.files, [side]: ref } }));
  if (oldRef?.path) {
    getSupabaseClient().storage.from('user-uploads').remove([oldRef.path]).catch(() => {});
  }
  return ref;
};
```
Or punt this entirely to the sweeper — both are valid; doc-string the chosen path.

**Verification:** smoke test the flow, watch Storage bucket.

---

### C9. `setPrintFile` / `setPrintLocation` reducers are not in `cart-orphan-cleanup` matcher

**Severity:** 🟡
**Location:** `src/redux/middleware/cart-orphan-cleanup.ts:29-36`
**Issue:** The middleware watches `clearPrintFile, clearAllPrints, deleteItemFromCart, resetCart, updateCartItem`. The reducers `setPrintFile` and `setPrintLocation` are NOT in the matcher. Currently this isn't exploited because the new ProductInfo flow uses `addToCart` / `updateCartItem` (cart-page "edit" pattern), and `setPrintFile` is never dispatched at runtime — `grep -rn "setPrintFile"` shows only `cart.slice.ts`, `cart.slice.test.ts`, and `cart-persist.ts`. Latent dead code.

The risk: if anyone later wires up inline editing on the cart page (e.g. "change the print on this cart item without re-opening the product page"), dispatching `setPrintFile({ side: 'front', file: newRef })` over an existing `files.front = oldRef` will silently orphan `oldRef.path`. Same shape as C8, but in the middleware layer.

Same risk with `setPrintLocation`: changing `location` from `'both'` → `'front'` does not drop `files.back` (the reducer at `cart.slice.ts:108-117` only sets `location`, never touches `files`), so `back`'s ref-B is orphan but also still in the cart entry → next `clearPrintFile` won't clean it.

**Repro:** N/A today (no callsite), but easily reachable from any future cart-page-inline-editor PR.
**Fix:** either delete the unused reducers entirely (preferred, since the new flow doesn't use them) or add them to the matcher. Document in `cart.slice.ts` which reducers are live and which are vestigial. If kept, `setPrintLocation` should also drop files for sides that became inactive (mirror of `product-info.tsx:84-94`).

**Verification:** grep for callsites; cart-orphan-cleanup test for `setPrintFile` replacement.

---

### C10. `UploadSlot` orphan when component unmounts mid-upload

**Severity:** 🟡
**Location:** `src/components/pages-components/shop-page/product-info/upload-slot.tsx:36-55`
**Issue:** `handleFile` is `async`, calls `await onUpload(raw)`. If the user navigates away (router.push, back button) **after** `supabase.storage.upload` resolves but before `setPrintConfig` runs (line 101-104 in `product-info.tsx`), the Storage object is committed but no Redux state holds a reference → orphan, untracked by `cart-orphan-cleanup`.

Probability is low (race window ~100-300ms) but real for slow uploads where users click around. Sweeper catches it after 14 days.

**Repro:** throttle network to 3G, start an upload, navigate to `/` before the spinner clears.
**Fix:** track an `AbortController` or `isMounted` ref in `UploadSlot`, and on unmount best-effort-remove from Storage if the upload completed after unmount. This is purist; acceptable to leave alone given the sweeper.

**Verification:** manual flake test; or schedule sweeper validation.

---

### C11. Mobile menu state persists across programmatic navigation

**Severity:** 🟡
**Location:** `src/components/shared-components/mobile-menu/mobile-menu.tsx` and `src/redux/utils-slice/utils.slice.ts`
**Issue:** `isMobileMenuActive` is Redux state. The mobile menu closes only when one of the in-menu `<Link>`s is clicked (each has `onClick={closeMenuHandler}`, line 38/47/56/...). It does NOT close on:
- Programmatic navigation via `router.push` (e.g. `handleAddToCart` redirects to `/cart`)
- Browser back/forward
- Clicking the in-menu "проконсультироваться" button (line 124 — has no onClick at all, the button does nothing)
- Clicking the external "корпоративный отдел" link to `pnhd.ru` (line 123 — no onClick)

So if a user opens the menu, then triggers a redirect by some other means (e.g. middleware redirect from `redirects` collection), they land on the new page with the menu overlay still open — needs an extra click to dismiss.

**Repro:** open mobile menu on `/`, click "проконсультироваться" — nothing happens, menu stays. Or trigger a redirect: open menu on `/old-slug`, observe redirect to `/new-slug` with menu still open.
**Fix:** mount a small `useEffect` listening to `usePathname()` changes in a layout-level component:
```ts
const pathname = usePathname();
useEffect(() => { dispatch(utilsActions.setMobileMenuActive(false)); }, [pathname]);
```

**Verification:** Playwright test: open menu → click consultation button → assert menu hidden. Open menu → trigger router.push → assert menu hidden.

---

## 🟢 NICE-TO-HAVE

### C12. `paymentUrl` cart state is dead-end

**Severity:** 🟢
**Location:** `src/redux/cart-slice/cart.slice.ts:59,189-191` and `src/components/shared-components/cart-icon/cart-icon.tsx:28-30`
**Issue:** `setPaymentURL` action exists, state field exists, but no callsite dispatches it. The CartIcon's commented-out `useEffect(() => paymentUrl && router.push(paymentUrl))` is dead. Remove the field + action + commented code to reduce cognitive load.

**Fix:** delete `paymentUrl`, `setPaymentURL`, the commented useEffect, and any imports.
**Verification:** typecheck passes (no consumers).

---

### C13. `args.data` mutation in `rateLimitFormSubmissions` relies on Payload not cloning `args`

**Severity:** 🟢
**Location:** `src/hooks/rateLimitFormSubmissions.ts:50-58`
**Issue:** The hook returns `undefined` (implicit). Payload's `buildBeforeOperation` (`node_modules/payload/.../buildBeforeOperation.js:11-22`) treats `undefined` as "no new args", keeping the previous `args` reference. The hook then mutates `args.data = { ... }` in place. This works only because Payload does not deep-clone `args` between hooks. If a future Payload version starts cloning (entirely reasonable hardening), the injected `ipHash` / `userAgent` silently disappear.

The robust fix: return the new args explicitly:
```ts
return {
  ...args,
  data: { ...((args as any).data ?? {}), ipHash, userAgent },
};
```

**Verification:** existing tests still pass; pin Payload version in `package.json` to known-good range.

---

### C14. `checkoutClient.tsx` error mapping does not handle network-failure error shape

**Severity:** 🟢
**Location:** `src/app/(storefront)/checkout/checkoutClient.tsx:104-117`
**Issue:** Maps `errCode = errAny?.data?.error ?? errAny?.error` and matches `'out_of_stock' | 'product_not_found' | …`. On a true network error (Vercel cold-start timeout, transient DNS), the RTK Query rejection shape is `{ status: 'FETCH_ERROR', error: '...' }` or `{ status: 502, data: '<html>...</html>' }`. Neither matches a known errCode, so the user gets the generic "Не удалось оформить заявку". Acceptable but not great — log the original error to Sentry from the catch.

**Fix:** wrap with `Sentry.captureException(err, { extra: { phase: 'order-create', errCode } })`.
**Verification:** trigger 502 from upstream, inspect Sentry.

---

### C15. `get-form-by-slug` module-level cache lives forever and is per-instance

**Severity:** 🟢
**Location:** `src/lib/forms/get-form-by-slug.ts:13-32`
**Issue:** `cache: Map<string, string>` lives for the lifetime of the Node process / Vercel function instance. On a Vercel serverless function, that's per-invocation-bundle (typically 5-15 min warm). Acceptable: form IDs **never change once seeded**. Acceptable: per-instance is fine.

The only real risk: someone re-seeds with `--purge` (currently impossible — `scripts/seed-forms.ts` is idempotent-by-title, never deletes), or runs migrations that resequence IDs. In either case, in-flight instances would serve stale IDs until cold-restart.

**Fix:** add a `TTL_MS = 60_000` to the cache entry. Or punt: this is a server-only lookup with zero perf pressure (5 forms, run once per page), so the cache is barely worth it. Could be deleted entirely without measurable impact.

**Verification:** N/A.

---

### C16. Missing test: `validate-stored-cart` does not reject malformed `files[side]` values

**Severity:** 🟢
**Location:** `src/lib/cart/validate-stored-cart.ts:23-33` and `validate-stored-cart.test.ts`
**Issue:** The validator only checks `typeof pc.files === 'object'` and `files !== null`. It does NOT check that each value in `files` is itself a valid `IPrintFileRef` (i.e. has `url` and `path` strings).

If an attacker (or a buggy v3.1 schema) writes `{"files": {"front": "not-a-ref"}}` to sessionStorage, validation passes, the cart restores, but rendering blows up later when `<img src={file.url}>` reads `.url` on a string.

Low impact because sessionStorage is client-only (no attacker without XSS), and a crash on the cart page is recoverable. Worth adding defense-in-depth + a test.

**Fix:**
```ts
function isValidPrintFileRef(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.url === 'string' && typeof r.path === 'string';
}
// inside isValidStoredCartEntry:
for (const val of Object.values(pc.files as Record<string, unknown>)) {
  if (!isValidPrintFileRef(val)) return false;
}
```
Add test: `expect(isValidStoredCart([{...entry, printConfig:{location:'front', files:{front:'garbage'}}}])).toBe(false)`.

**Verification:** new vitest.

---

## Out-of-scope items observed (not findings, just notes for tracker)

- The §15 "admin Server Actions" referenced in the audit brief no longer exist — admin migrated to Payload's built-in admin under `src/app/(payload)/admin/[[...segments]]/page.tsx`. DOMPurify on blog content is no longer in storefront-flow code (blog body is now Lexical-rendered, see `lexicalEditor()` in `payload.config.ts:46`). Re-scope: any "Server Actions atomicity" concern now applies to `src/app/(payload)/api/orders/create/route.ts` (covered in C3) and Payload form-builder hooks (covered in C1, C4, C6).
- `apiBaseUrl = ''` (`src/app/utils/constants.ts:4`) means RTK Query baseUrl is the empty string → relative URLs. The legacy `pnhdstudioapi.ru` is GONE from runtime — fine.
- `createOrder` mutation now hits a real endpoint (`/api/orders/create`), not a demo-alert. The CLAUDE.md ⚠ "checkout demo-alert" note in §3 is stale.
- `redirects` middleware uses 301 not the documented 308/307 (`src/middleware.ts:67`). Minor doc drift; 301 is fine for SEO but means browsers may cache it aggressively even after the doc is unpublished.

---

## Recommended sequencing for fixes

1. **C2** (CSRF) — single env var change in Vercel; unblocks all preview submissions today.
2. **C1** (agreement field) — 3-line PR to LeadForm; compliance + future-proofing.
3. **C3** (order atomicity) — wrap in transaction; ~20 lines.
4. **C4** (hook timeouts) — add `AbortSignal.timeout(5000)` to both notify hooks; ~6 lines.
5. **C7** (input reset) — 2 lines; high user-visibility.
6. **C5** (XFF spoofing) — change extractIp; ~10 lines, mind tests.
7. **C8** + **C10** + **C11** — UX polish, ship together.
8. **C9, C12, C13, C16** — dead-code/cleanup batch.

All four blockers are tractable in a single afternoon batch. The 🟡 list adds up to roughly a day.
