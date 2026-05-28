/**
 * One-shot скрипт для создания bootstrap admin user'а в Payload.
 *
 * Использование:
 *   1. Заполни PAYLOAD_BOOTSTRAP_EMAIL + PAYLOAD_BOOTSTRAP_PASSWORD в .env.local
 *   2. Запусти: npm run payload:seed
 *
 * Идемпотентен: если user с таким email уже есть — no-op.
 */
import 'dotenv/config';

import { getPayload } from 'payload';

import config from '../src/payload.config';

const main = async () => {
  const email = process.env.PAYLOAD_BOOTSTRAP_EMAIL;
  const password = process.env.PAYLOAD_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.error('ERROR: задай PAYLOAD_BOOTSTRAP_EMAIL и PAYLOAD_BOOTSTRAP_PASSWORD в .env.local');
    process.exit(1);
  }

  const payload = await getPayload({ config });

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  });

  if (existing.totalDocs > 0) {
    console.log(`Admin user '${email}' уже существует — skip.`);
    process.exit(0);
  }

  await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      roles: ['admin'],
    },
  });

  console.log(`OK — создан admin '${email}'. Логинься на /admin-payload`);
  process.exit(0);
};

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
