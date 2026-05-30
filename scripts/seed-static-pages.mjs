/**
 * Seed: создаёт Page-документы для статичных страниц /oferta и /privacy
 * из их текущих JSX-исходников (src/app/(storefront)/<slug>/page.tsx).
 *
 * Извлекает текст между <section>...</section>, конвертирует <br /><br />
 * в <p>...</p>, и заливает как pages.bodyHtml.
 *
 * Идемпотентен: skip-if-exists по slug. Запуск:
 *   node --env-file=.env.local scripts/seed-static-pages.mjs
 */

import { readFileSync } from 'node:fs';

const PAYLOAD_URL = process.env.PAYLOAD_URL ?? 'https://pnhd-studio-clone.vercel.app';
const ADMIN_EMAIL = process.env.PAYLOAD_BOOTSTRAP_EMAIL;
const ADMIN_PASSWORD = process.env.PAYLOAD_BOOTSTRAP_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: задай PAYLOAD_BOOTSTRAP_EMAIL и PAYLOAD_BOOTSTRAP_PASSWORD в .env.local');
  process.exit(1);
}

const PAGES = [
  {
    slug: 'oferta',
    title: 'Правила согласования изображения и печати',
    subtitle: 'Условия работы с макетами и текстилем',
    sourceFile: 'src/app/(storefront)/oferta/page.tsx',
  },
  {
    slug: 'privacy',
    title: 'Политика конфиденциальности',
    subtitle: 'Как мы собираем, используем и защищаем личные данные',
    sourceFile: 'src/app/(storefront)/privacy/page.tsx',
  },
];

const extractHtmlFromJsx = (jsxSource) => {
  // Берём содержимое первого <section> блока (там вся правовая текстовка).
  const sectionMatch = jsxSource.match(/<section[^>]*>([\s\S]*?)<\/section>/);
  if (!sectionMatch) {
    throw new Error('Не найден <section> блок в JSX-источнике');
  }
  const raw = sectionMatch[1];

  // Конвертируем JSX в HTML/text.
  const text = raw
    .replace(/<br\s*\/?>\s*<br\s*\/?>/g, '\n\n') // двойной br → break параграфа
    .replace(/<br\s*\/?>/g, '\n')                // одиночный br → newline
    .replace(/\{['"][^'"]*['"]\}/g, '')          // выкидываем выражения типа {' '}
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')                     // схлопываем горизонтальные пробелы
    .replace(/ *\n */g, '\n')                    // обрезаем пробелы вокруг \n
    .trim();

  // Разбиваем на параграфы по двойному переносу.
  const paragraphs = text.split(/\n{2,}/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);

  return paragraphs.map((p) => `<p>${p}</p>`).join('\n');
};

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
console.log(`OK login as ${ADMIN_EMAIL} @ ${PAYLOAD_URL}`);

const authJson = { 'Content-Type': 'application/json', Authorization: `JWT ${token}` };

const apiJson = async (path, opts = {}) => {
  const res = await fetch(`${PAYLOAD_URL}/api${path}`, {
    ...opts,
    headers: { ...authJson, ...(opts.headers ?? {}) },
  });
  const txt = await res.text();
  try {
    return { status: res.status, body: JSON.parse(txt) };
  } catch {
    return { status: res.status, body: txt };
  }
};

// 2. Per-page seed
let created = 0;
let skipped = 0;

for (const page of PAGES) {
  const slugEnc = encodeURIComponent(page.slug);
  const existing = await apiJson(`/pages?where[slug][equals]=${slugEnc}&limit=1`);
  if (existing.body?.docs?.length > 0) {
    skipped++;
    console.log(`= page (exists): ${page.slug}`);
    continue;
  }

  const jsx = readFileSync(page.sourceFile, 'utf-8');
  const bodyHtml = extractHtmlFromJsx(jsx);
  if (!bodyHtml || bodyHtml.length < 100) {
    console.warn(`! ${page.slug}: extracted HTML too short (${bodyHtml.length} chars), пропуск`);
    continue;
  }

  const res = await apiJson('/pages', {
    method: 'POST',
    body: JSON.stringify({
      title: page.title,
      slug: page.slug,
      pageType: 'landing',
      subtitle: page.subtitle,
      bodyHtml,
      author: 'PNHD STUDIO',
      status: 'published',
      publishedAt: new Date().toISOString(),
    }),
  });
  if (res.status >= 400) {
    console.warn(`! page failed: ${page.slug}`, res.body);
    continue;
  }
  created++;
  const paraCount = (bodyHtml.match(/<p>/g) ?? []).length;
  console.log(`+ page: ${page.slug} (${paraCount} paragraphs)`);
}

console.log(`\nDone. + ${created} pages, = ${skipped} existing`);
