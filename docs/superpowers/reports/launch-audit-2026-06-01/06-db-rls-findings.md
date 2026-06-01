# DB / RLS / Migrations / Storage — Launch Readiness Findings

**Project:** `pnhd-studio-clone` (Supabase id `almfjmiygtnzngkayhdv`, region `eu-central-1`)
**Date:** 2026-06-01
**Scope:** §6 of launch-readiness-audit spec — RLS coverage, policies, indexes, cron jobs, migrations sync, storage policies, constraints, backup posture.
**Mode:** Read-only. No write operations executed.

---

## TL;DR

| Severity | Count | Highlights |
|---|---|---|
| 🔴 Blockers | 3 | Payload migrations not applied to prod (form-builder broken), `is_admin()` SECURITY DEFINER still executable by `anon` via PUBLIC grant, two unused legacy auth migration files diverged from prod schema |
| 🟡 Warnings | 6 | Missing `>= 0` CHECKs on `products.price` / `product_sizes.qty`, `payload-media` bucket allows public listing, no leaked-password protection in Supabase Auth, `cleanup-user-uploads` cron success unverified (only HTTP 200 logged), `cdn.pnhd.ru` legacy host whitelisted, `leads_source_idx` low-utility |
| 🟢 Nice-to-have | 4 | Cron `rate-limit-log-cleanup` runs every 5 min (excessive log churn), `rate_limit_log` has RLS-on-no-policy, schema-grade `payload` is opaque to anon (advisor false-positive but worth keeping documented), legacy public catalog tables still write-policied to dead `is_admin()` |

Backup strategy is **out of band** — Supabase plan info not queryable via MCP; flagged as 🟡 verification needed.

---

## 🔴 BLOCKERS

### B1. Payload migrations divergent — 3 unapplied migrations on production

Local `src/migrations/index.ts` registers 8 migrations. Production `payload.payload_migrations` table has only 5 applied:

| Local file | Applied to prod? |
|---|---|
| `20260528_232600` | yes (batch 1) |
| `20260530_062122_payload_seo_meta` | yes (batch 2) |
| `20260530_064450_payload_redirects` | yes (batch 3) |
| `20260530_071720_order_customer_note` | yes (batch 4) |
| `20260530_075057_pages_drafts_versions` | yes (batch 5) |
| `20260601_101348_payload_plugin_import_export` | **NO** |
| `20260601_102621_payload_plugin_form_builder` | **NO** |
| `20260601_110001_payload_form_submissions_extra_fields` | **NO** |

**Production impact:** the form-builder plugin tables (`forms`, `form_submissions`) **do not exist** in `payload` schema — confirmed:

```sql
select table_name from information_schema.tables
where table_schema = 'payload' and (table_name like '%form%' or table_name like '%submission%');
-- returns: [] (empty)
```

Per CLAUDE.md §11 ("Сделано (батч 2026-06-01, payload-plugins)") the lead-pipeline was migrated to Payload form-builder hooks with submissions in `form-submissions` collection. If this code is currently deployed on `main`, every form submission to `/api/form-submissions` **will 500** because the table doesn't exist — full lead-capture outage.

Aligns with CLAUDE.md §13 release-checklist: "Если задеплоить раньше чем применить миграции — submission endpoint вернёт 500 на каждый запрос пока column missing."

**Remediation (block launch):** run `npm run payload migrate` against production DATABASE_URI before next deploy, then run `npx tsx --env-file=.env.production scripts/seed-forms.ts`. Verify with:

```sql
select * from payload.forms;  -- expect 5 seeded form documents
select * from payload."form_submissions" limit 1;  -- table exists, may be empty
```

Files: [src/migrations/index.ts](../../../../src/migrations/index.ts), [src/migrations/20260601_102621_payload_plugin_form_builder.ts](../../../../src/migrations/20260601_102621_payload_plugin_form_builder.ts), [src/migrations/20260601_110001_payload_form_submissions_extra_fields.ts](../../../../src/migrations/20260601_110001_payload_form_submissions_extra_fields.ts), [scripts/seed-forms.ts](../../../../scripts/seed-forms.ts).

### B2. `public.is_admin()` SECURITY DEFINER callable by `anon` and `authenticated` via `/rest/v1/rpc/is_admin`

The function is `SECURITY DEFINER`. Migration `20260527224137_revoke_is_admin_anon` does `revoke execute … from anon` and `from authenticated`, but **the PUBLIC grant remains**:

```sql
select has_function_privilege('anon', oid, 'EXECUTE'),
       has_function_privilege('authenticated', oid, 'EXECUTE'),
       has_function_privilege('public', oid, 'EXECUTE')
from pg_proc where proname = 'is_admin' and pronamespace = 'public'::regnamespace;
-- → true, true, true
```

`anon` inherits EXECUTE from `PUBLIC`. Anyone with the anon key can call `POST /rest/v1/rpc/is_admin` to probe whether the current `auth.uid()` is in `admin_users`. With anon session (no JWT) it returns `false`, but with a forged/captured signed-in session it leaks admin status. Confirmed by Supabase advisor `0028_anon_security_definer_function_executable`.

**Why this passed unnoticed:** the migration revokes from individual roles but Postgres role membership means `anon` and `authenticated` are members of `public`. Need `revoke execute … from public` for it to stick.

**Practical risk:** medium. Function only reveals admin status, doesn't leak data. But it's an exposed RPC surface with no rate limit. Combined with B3 (admin_users still exists), an attacker can enumerate admin user_ids via timing/probing.

**Remediation:** either (a) `revoke execute on function public.is_admin() from public`, or (b) recreate as `SECURITY INVOKER` (RLS will see anon's empty `auth.uid()` and return false anyway, eliminating the SECURITY DEFINER attack surface). Option (b) is cleaner.

Function definition:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    select exists(select 1 from public.admin_users where user_id = auth.uid());
$function$
```

### B3. Schema drift — `20260529000002_drop_admin_auth.sql` never applied; dead admin-auth surface remains live

Local file [supabase/migrations/20260529000002_drop_admin_auth.sql](../../../../supabase/migrations/20260529000002_drop_admin_auth.sql) intends to drop everything related to Supabase admin auth (now superseded by Payload Users collection). But `supabase_migrations.schema_migrations` shows last applied is `20260529000001_payload_media_bucket` — version `20260529000002` is **not** in the table.

Consequences of this drift, all currently live in production:

1. `public.admin_users` table still exists (with 1 row — `mib@pnhd.ru` per CLAUDE.md §15)
2. `public.is_admin()` function still exists (see B2)
3. Storage policies `admin write blog-images`, `admin write gallery-images`, `admin write product-images` all reference `is_admin()` and grant ALL to `authenticated` on those buckets
4. `public.leads` has policies `leads admin read` + `leads admin update` referencing `is_admin()`
5. `public.products`, `product_sizes`, `product_gallery_photos`, `product_links`, `blog_posts`, `gallery_images` all have `admin write` policies referencing `is_admin()` (qual+with_check)

If `admin_users` is empty/dropped, every `is_admin()` call returns false → policies deny → harmless. But the surface is non-zero:
- An attacker with an `authenticated` JWT (e.g. via Supabase password sign-up if open registration exists) can probe these RPCs
- The legacy `/admin/*` Supabase login pages may still be reachable if `next.config.mjs` / middleware don't block them after Payload cutover
- Storage bucket write policies on `blog-images` etc. allow ALL ops if `is_admin()` is true; with B2 fix this becomes a non-issue, but the policies should be dropped per the local migration

**Remediation:** decide whether to apply `20260529000002_drop_admin_auth.sql` (full cutover, recommended per the migration's own comment "Phase 2b cutover") or rename it / delete it and document that the legacy admin coexistence is intentional. Currently it's a half-state: the file says "drop everything" but production says "keep everything".

---

## 🟡 WARNINGS

### W1. Missing `CHECK (price >= 0)` and `CHECK (qty >= 0)` constraints

- `public.products.price` (numeric, NOT NULL) — no positive-only check
- `public.product_sizes.qty` (integer, NOT NULL, default 0) — no `>= 0` check

Result: admin can insert negative price via UI bug, ETL import bug, or hand-craft. Stock out indicator uses `qty = 0` semantics; `qty < 0` would render UI inconsistencies.

`payload.products` (the new schema-of-truth post-Phase-4) also lacks explicit positivity constraints — only `NOT NULL`. Check Payload field validators in `src/collections/Products.ts` and `src/collections/Variants.ts`.

### W2. Cron job `cleanup-user-uploads` (jobid 2) — success status is misleading

`cron.job_run_details` shows `status='succeeded'`, `return_message='1 row'` for the last 5 daily runs. **However**, `return_message='1 row'` is the result of `pg_net.http_post` returning 1 row (the request_id), NOT the HTTP response status of the Edge Function. The function could be returning 401/500 silently.

`storage.objects` in `user-uploads` has 4 total objects, 0 older than 14 days — so we can't tell from the data whether sweeping is actually happening or never had a chance to run (no data older than 14 days yet).

**Remediation:** check Edge Function logs via Supabase Dashboard → Edge Functions → `cleanup-user-uploads` → Logs. Verify return body of the cron HTTP call:

```sql
-- Add this to the cron command for observability:
select net.http_post(...) as request_id;
-- … and in a follow-up cron job, log the response:
-- select * from net._http_response where id = ...;
```

Or simpler: convert the sweeper to a SQL function called directly by cron (no Edge Function), eliminating the HTTP gap.

### W3. `payload-media` bucket allows public listing

Supabase advisor `public_bucket_allows_listing` flags policy `payload_media_public_read`:
```sql
CREATE POLICY payload_media_public_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'payload-media');
```

A `select` on `storage.objects WHERE bucket_id='payload-media'` from anon will return ALL filenames. Public-read on object URLs doesn't require this — only path traversal. Risk: enumeration of internal media filenames (potentially including admin-uploaded private references).

Other public-read buckets (`product-images`, `blog-images`, `gallery-images`) use the same pattern via policy `public read admin image buckets` — same listing exposure. Lower risk since those are public catalogue images by design, but the listing surface is unnecessary.

**Remediation per Supabase doc:** restrict to specific path prefixes or remove SELECT policy on `storage.objects` (URL-based access via Storage API/CDN bypasses RLS for public buckets).

### W4. Supabase Auth — leaked-password protection disabled

Advisor `auth_leaked_password_protection`: HaveIBeenPwned integration off. Admin users (`mib@pnhd.ru` and any future Payload Users) can register with compromised passwords. Enable in Supabase Dashboard → Authentication → Policies.

### W5. `next.config.mjs` whitelists `cdn.pnhd.ru` (legacy origin)

Per CLAUDE.md §9 — 10/25 products still reference `https://cdn.pnhd.ru/<slug>_<n>.jpg`. The host is whitelisted in `next.config.mjs:images.remotePatterns` for the legacy catalog photos. As of audit date this is not a DB issue, but it's a future-launch-day surface — when the origin disappears (already 502 per CLAUDE.md), `<Image>` will fail closed (404 on the source) but Next/Image optimizer may still 200 the cached version misleadingly. **DB-side mitigation:** add a CI check that no `products.image_url` references `cdn.pnhd.ru` after Phase 7 cutover.

### W6. `leads_source_idx` low-utility for current cardinality

Source has 5 enum values across (currently 0) rows. Use `idx_scan = 1` total since stat reset. Once data grows past ~10k leads it'll help admin filters; for launch readiness it's neutral. Not blocking.

---

## 🟢 NICE-TO-HAVE

### N1. Cron `rate-limit-log-cleanup` runs every 5 min — log churn

Job 3 schedule: `*/5 * * * *`. Each run is "DELETE 0" (empty table). With autovacuum that's fine, but `cron.job_run_details` is filling with rows. Currently the last 30 results are all from job 3. Either:
- Increase interval to `*/30 * * * *` (still well within retention window)
- Or accept churn and ensure `cron.job_run_details` itself has retention (Supabase enforces this via `cron.alter_job_set_retention` or similar — verify)

### N2. `public.rate_limit_log` — RLS enabled, no policies

Advisor `rls_enabled_no_policy`: table is locked down for anon/authenticated by RLS-no-policy semantics (deny-all). Currently writes happen via service_role (used by `notifyBitrix`/`rateLimitFormSubmissions` Payload hooks, see CLAUDE.md §6) which bypasses RLS — so this is correct posture. Add a comment policy explicitly stating "deny all to anon/authenticated" for clarity, or `revoke select, insert from anon, authenticated` at table-grant level to make the intent explicit.

### N3. `payload` schema USAGE not granted to anon/authenticated — RLS=false is mitigated

Supabase advisor flagged 34 payload.* tables as "RLS disabled, fully exposed to anon". **False positive**: schema-level `USAGE` privilege is denied (`has_schema_privilege('anon', 'payload', 'USAGE')` returns false). PostgREST cannot expose these tables without schema USAGE — confirmed by querying `has_table_privilege` for each (all `false`).

Recommendation: keep this documented in repo (CLAUDE.md or a SECURITY.md) so future audits don't re-trigger. Optionally also enable RLS on Payload tables defensively (deny-all) to silence advisor and add belt-and-suspenders if schema USAGE is ever accidentally granted. Payload itself doesn't need RLS because it connects via direct PG with its own user.

### N4. Legacy `public.{products, product_sizes, product_gallery_photos, product_links, blog_posts, gallery_images}` still RLS-policied to dead `is_admin()`

Per CLAUDE.md §6 "Legacy `Leads` collection: `access.create: false`, group `Legacy`" — same pattern applies to other legacy public.* tables. After Payload Phase 4 the storefront reads from `payload.products`. The `public.products` table still has 25 rows and `anon read` policy, which is fine for backwards compat. The admin-write policies are dead code (no admin sign-in path via Supabase Auth anymore). When B3 is resolved these go away anyway.

---

## Verification log

All queries executed read-only via Supabase MCP `execute_sql` against project `almfjmiygtnzngkayhdv`.

### RLS coverage
- `public.*`: RLS enabled on all 9 tables (`admin_users`, `blog_posts`, `gallery_images`, `leads`, `product_gallery_photos`, `product_links`, `product_sizes`, `products`, `rate_limit_log`).
- `payload.*`: RLS disabled on all 34 tables — mitigated by schema USAGE denial (see N3).
- Anon/authenticated table grants on `public.{admin_users, leads, products}`: `select/insert/update/delete = true` (RLS gates the rows, but base grants are wide — this is normal Supabase pattern, not a finding).

### Policies (sensitive)
- `public.leads`: 3 policies — `admin read` (auth + is_admin()), `admin update` (auth + is_admin()), `service_role ALL`. **No anon policy → anon cannot SELECT/INSERT/UPDATE/DELETE.** ✅
- `public.admin_users`: 1 policy — `self read` (authenticated, `user_id = auth.uid()`). **No anon access, no admin update/delete via RLS** (only service_role from server-actions). ✅
- `storage.objects`: 6 policies. `user-uploads` anon-insert restricted to `prints/` prefix only. ✅

### Indexes (critical)
- `products_slug_key` UNIQUE ✅ (3037 scans — hot path)
- `leads_ip_hash_recent_idx` partial on `(ip_hash, created_at desc) where ip_hash is not null` ✅
- `leads_created_at_idx` DESC ✅
- `leads_status_idx` ✅
- Payload: `products_slug_idx` UNIQUE ✅, `pages_slug_idx` UNIQUE ✅, `redirects_from_idx` UNIQUE ✅, `orders_order_number_idx` UNIQUE ✅, `variants_sku_idx` UNIQUE ✅, `promos_code_idx` UNIQUE ✅.

### Constraints
- `products.price`: NOT NULL ✅ but no `>= 0` CHECK (W1)
- `products.slug`: UNIQUE ✅
- `product_sizes.qty`: NOT NULL default 0 ✅ but no `>= 0` CHECK (W1)
- `product_sizes (product_id, name)` UNIQUE ✅
- `leads.name`, `leads.phone`: NOT NULL ✅
- `leads.status`: NOT NULL default 'new' + CHECK enum (`new`/`contacted`/`done`/`spam`) ✅
- FK `product_sizes.product_id → products.id` ✅

### Storage buckets
| Bucket | Public | Size limit | MIME |
|---|---|---|---|
| `blog-images` | yes | 5 MB | png/jpeg/webp/avif ✅ |
| `gallery-images` | yes | 5 MB | png/jpeg/webp/**svg+xml** (XSS surface if user-controllable, but admin-only write — accepted) |
| `payload-media` | yes | 20 MB | png/jpeg/webp/svg+xml/avif |
| `product-images` | yes | 10 MB | png/jpeg/webp/avif ✅ |
| `user-uploads` | yes | 20 MB | png/jpeg/webp ✅ (SVG removed per `20260527000003_leads_harden`) |

### Cron jobs
| jobid | name | schedule | active | last run |
|---|---|---|---|---|
| 1 | `cleanup-old-leads` | `0 3 * * *` (daily 03:00 UTC) | true | 2026-06-01 03:00, status succeeded, "DELETE 0" |
| 2 | `cleanup-user-uploads` | `30 3 * * *` (daily 03:30 UTC) | true | 2026-06-01 03:30, status succeeded, "1 row" (HTTP request fired; actual function result not in cron log — W2) |
| 3 | `rate-limit-log-cleanup` | `*/5 * * * *` | true | runs every 5 min, "DELETE 0" each time (no rate-limit log entries currently) |

All jobs `active=true`. Cron-side execution is healthy. The semantic question for job 2 is in W2.

### Migrations applied
- `supabase_migrations.schema_migrations` last: `20260529000001_payload_media_bucket`. **Local file `20260529000002_drop_admin_auth.sql` not applied** (B3).
- `payload.payload_migrations` last: `20260530_075057_pages_drafts_versions` (batch 5). **3 local files unapplied** (B1).

### Data counts
- `public.leads`: 0 total (testing-grade)
- `public.products`: 25
- `public.product_sizes`: 74
- `public.blog_posts`: 3
- `payload.products`: 25
- `payload.variants`: 74
- `payload.prices`: 74
- `payload.media`: 9
- `payload.pages`: 6
- `payload.leads`: 0
- `payload.users`: 1
- `storage.objects (user-uploads)`: 4 objects, 0 over 14d old

### Backup
Supabase MCP doesn't expose plan/backup info via available tools. **Verification needed manually:** Supabase Dashboard → Database → Backups. Free tier = 7-day point-in-time auto-backups; Pro tier = configurable retention. With production lead-capture + Payload state, Pro tier minimum is recommended. Flagged as 🟡 verification.

### Connection pool
DATABASE_URI is set on Vercel and not queryable from MCP, but per CLAUDE.md §13 + memory it uses transaction pooler `:6543` with `pgbouncer=true` params. Sane configuration. No abnormal long-running queries observed in queryable stats.

---

## Appendices

### A1. Full `pg_policies` snapshot (public + storage)

```
public.admin_users         "admin_users self read"        authenticated  SELECT  (user_id = auth.uid())
public.blog_posts          "blog_posts admin write"       authenticated  ALL     is_admin()
public.blog_posts          "public read blog_posts"       anon,auth      SELECT  true
public.gallery_images      "gallery_images admin write"   authenticated  ALL     is_admin()
public.gallery_images      "public read gallery_images"   anon,auth      SELECT  true
public.leads               "leads admin read"             authenticated  SELECT  is_admin()
public.leads               "leads admin update"           authenticated  UPDATE  is_admin()
public.leads               "leads service all"            service_role   ALL     true
public.product_gallery_photos "product_gallery_photos admin write"     authenticated ALL  is_admin()
public.product_gallery_photos "public read product_gallery_photos"     anon,auth SELECT true
public.product_links       "product_links admin write"    authenticated  ALL     is_admin()
public.product_links       "public read product_links"    anon,auth      SELECT  true
public.product_sizes       "product_sizes admin write"    authenticated  ALL     is_admin()
public.product_sizes       "public read product_sizes"    anon,auth      SELECT  true
public.products            "products admin write"         authenticated  ALL     is_admin()
public.products            "public read products"         anon,auth      SELECT  true

storage.objects "admin write blog-images"          authenticated  ALL     (bucket_id='blog-images'    AND is_admin())
storage.objects "admin write gallery-images"       authenticated  ALL     (bucket_id='gallery-images' AND is_admin())
storage.objects "admin write product-images"       authenticated  ALL     (bucket_id='product-images' AND is_admin())
storage.objects "payload_media_public_read"        public         SELECT  (bucket_id='payload-media')
storage.objects "public read admin image buckets"  public         SELECT  (bucket_id IN ('product-images','blog-images','gallery-images'))
storage.objects "user-uploads anon insert prints"  anon           INSERT  with_check: (bucket_id='user-uploads' AND foldername(name)[1]='prints')
```

### A2. Payload migrations gap

```
LOCAL (src/migrations/index.ts):
  20260528_232600
  20260530_062122_payload_seo_meta
  20260530_064450_payload_redirects
  20260530_071720_order_customer_note
  20260530_075057_pages_drafts_versions
  20260601_101348_payload_plugin_import_export        ← MISSING IN PROD
  20260601_102621_payload_plugin_form_builder         ← MISSING IN PROD  (breaks lead capture)
  20260601_110001_payload_form_submissions_extra_fields ← MISSING IN PROD

PROD (payload.payload_migrations):
  20260528_232600                          batch 1
  20260530_062122_payload_seo_meta         batch 2
  20260530_064450_payload_redirects        batch 3
  20260530_071720_order_customer_note      batch 4
  20260530_075057_pages_drafts_versions    batch 5
```

### A3. is_admin() function privileges

```
proname:    is_admin
prosecdef:  true (SECURITY DEFINER)
search_path: public
anon EXECUTE:          true   ← via PUBLIC inheritance (B2)
authenticated EXECUTE: true   ← via PUBLIC inheritance
public EXECUTE:        true   ← default Postgres grant
```

### A4. Cron history (jobs 1 & 2, last 5 runs)

```
runid 1230  jobid 2  succeeded  "1 row"      2026-06-01 03:30:00
runid 1223  jobid 1  succeeded  "DELETE 0"   2026-06-01 03:00:00
runid 940   jobid 2  succeeded  "1 row"      2026-05-31 03:30:00
runid 933   jobid 1  succeeded  "DELETE 0"   2026-05-31 03:00:00
runid 650   jobid 2  succeeded  "1 row"      2026-05-30 03:30:00
runid 643   jobid 1  succeeded  "DELETE 0"   2026-05-30 03:00:00
runid 360   jobid 2  succeeded  "1 row"      2026-05-29 03:30:00
runid 353   jobid 1  succeeded  "DELETE 0"   2026-05-29 03:00:00
runid 70    jobid 2  succeeded  "1 row"      2026-05-28 03:30:00
runid 63    jobid 1  succeeded  "DELETE 0"   2026-05-28 03:00:00
```

Job 2's `"1 row"` is `pg_net.http_post` returning request_id, not the HTTP response.

### A5. Index usage stats (post-stat-reset, indicative only)

```
products_slug_key       idx_scan=3037   ← hottest
products_type_idx       idx_scan=803
products_pkey           idx_scan=203
leads_status_idx        idx_scan=43
leads_created_at_idx    idx_scan=11
leads_pkey              idx_scan=2
leads_source_idx        idx_scan=1
leads_ip_hash_recent_idx idx_scan=0     ← will spike on real traffic with rate-limiting
products_category_idx   idx_scan=0     ← unused currently
```

`leads_ip_hash_recent_idx` having 0 scans is expected — `notifyBitrix`/`rateLimitFormSubmissions` hooks now use `rate_limit_log` table not `leads.ip_hash`, so the index targets a query path that's no longer in use. Candidate for removal post-launch, but it's tiny and a defensible "in case we need to query leads by IP" index. 🟢 not blocking.
