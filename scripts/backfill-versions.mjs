/**
 * Backfill versions table после включения `versions: { drafts: true }` на
 * коллекции с существующими данными.
 *
 * Payload **не бэкфилит** автоматически: парент-документы есть в основной
 * таблице, но `<collection>_v` пустая → admin UI list view считает их
 * orphan'ами и не рендерит. Storefront тоже сломается если фильтрует по
 * _status (по умолчанию читает только версии с latest=true).
 *
 * Скрипт PATCH'ит каждый документ с `_status: 'published'` — Payload
 * создаёт version row с latest=true.
 *
 * Запуск:
 *   node --env-file=.env.local scripts/backfill-versions.mjs
 *   COLLECTION=products node --env-file=.env.local scripts/backfill-versions.mjs
 *   PAYLOAD_URL=http://localhost:3000 ... — для локального dev
 *
 * Требует:
 *   PAYLOAD_BOOTSTRAP_EMAIL + PAYLOAD_BOOTSTRAP_PASSWORD (admin login)
 */

const PAYLOAD_URL = process.env.PAYLOAD_URL ?? 'https://pnhd-studio-clone.vercel.app';
const COLLECTION = process.env.COLLECTION ?? 'pages';
const ADMIN_EMAIL = process.env.PAYLOAD_BOOTSTRAP_EMAIL;
const ADMIN_PASSWORD = process.env.PAYLOAD_BOOTSTRAP_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: задай PAYLOAD_BOOTSTRAP_EMAIL и PAYLOAD_BOOTSTRAP_PASSWORD в .env.local');
  process.exit(1);
}

// 1. Login
const loginRes = await fetch(`${PAYLOAD_URL}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
});
const loginBody = await loginRes.json();
if (!loginRes.ok || !loginBody.token) {
  console.error('Login failed:', loginRes.status, loginBody);
  process.exit(1);
}
const token = loginBody.token;
const auth = { 'Content-Type': 'application/json', Authorization: `JWT ${token}` };
console.log(`OK login as ${ADMIN_EMAIL} @ ${PAYLOAD_URL} → backfilling '${COLLECTION}'`);

// 2. Load all docs
const listRes = await fetch(`${PAYLOAD_URL}/api/${COLLECTION}?limit=1000&depth=0`, { headers: auth });
if (!listRes.ok) {
  console.error('List failed:', listRes.status, await listRes.text());
  process.exit(1);
}
const { docs } = await listRes.json();
console.log(`Found ${docs?.length ?? 0} documents`);
if (!docs?.length) process.exit(0);

// 3. PATCH each — triggers version creation with latest=true.
let ok = 0;
let failed = 0;
for (const doc of docs) {
  const slug = doc.slug ?? doc.name ?? doc.title ?? doc.id;
  const res = await fetch(`${PAYLOAD_URL}/api/${COLLECTION}/${doc.id}?draft=false`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ _status: 'published' }),
  });
  if (res.ok) {
    ok++;
    console.log(`  ✓ ${slug} (id=${doc.id})`);
  } else {
    failed++;
    const err = await res.text();
    console.warn(`  ✗ ${slug}: HTTP ${res.status} — ${err.slice(0, 200)}`);
  }
}

console.log(`\nDone. ✓ ${ok} backfilled, ✗ ${failed} failed`);
