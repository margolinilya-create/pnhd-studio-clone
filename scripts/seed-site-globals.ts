/**
 * Idempotent seed: populates Navigation global with 8 default items if items is empty.
 * SiteSettings and CookieBar self-bootstrap from defaultValue: declarations — no seed needed.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-site-globals.ts
 */
import 'dotenv/config';
import { getPayload } from 'payload';

import config from '../src/payload.config';

const DEFAULT_NAV_ITEMS = [
  { label: 'каталог', href: '/', hash: 'catalog', isExternal: false, showInHeader: true, showInFooter: false, showInMobile: true },
  { label: 'методы нанесения', href: '/', hash: 'methods', isExternal: false, showInHeader: true, showInFooter: true, showInMobile: true },
  { label: 'этапы работы', href: '/', hash: 'stages', isExternal: false, showInHeader: true, showInFooter: true, showInMobile: true },
  { label: 'отзывы', href: '/', hash: 'feedback', isExternal: false, showInHeader: true, showInFooter: true, showInMobile: true },
  { label: 'FAQ', href: '/', hash: 'faq', isExternal: false, showInHeader: true, showInFooter: true, showInMobile: true },
  { label: 'контакты', href: '/contacts', isExternal: false, showInHeader: true, showInFooter: true, showInMobile: true },
  { label: 'бонусы', href: '/loyalty', isExternal: false, showInHeader: true, showInFooter: false, showInMobile: true },
  { label: 'оптовый отдел', href: 'https://pnhd.ru', isExternal: true, showInHeader: true, showInFooter: false, showInMobile: true },
];

async function main() {
  const payload = await getPayload({ config });

  const existing = await payload.findGlobal({ slug: 'navigation' });
  if (existing.items && existing.items.length > 0) {
    console.log(`[seed-site-globals] Navigation has ${existing.items.length} item(s) — skipping.`);
    process.exit(0);
  }

  await payload.updateGlobal({
    slug: 'navigation',
    data: { items: DEFAULT_NAV_ITEMS, _status: 'published' },
  });

  console.log(`[seed-site-globals] Seeded ${DEFAULT_NAV_ITEMS.length} nav items (status=published).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-site-globals] Failed:', err);
  process.exit(1);
});
