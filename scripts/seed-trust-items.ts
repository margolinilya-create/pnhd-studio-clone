import { getPayload } from 'payload';
import config from '../src/payload.config';

async function main() {
  const payload = await getPayload({ config });
  const existing = await payload.findGlobal({ slug: 'site-settings' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((existing as any).trustItems?.length > 0) {
    console.log('[seed-trust-items] already seeded — skipping.');
    process.exit(0);
  }
  await payload.updateGlobal({
    slug: 'site-settings',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { trustItems: [
      { icon: 'factory', text: 'Производство СПб' },
      { icon: 'return',  text: 'Возврат 14 дней' },
      { icon: 'quality', text: 'Гарантия 40 стирок' },
      { icon: 'shipping', text: 'Доставка по России' },
    ] } as any,
  });
  console.log('[seed-trust-items] seeded 4 items.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
