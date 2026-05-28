import 'server-only';

import { getPayload } from 'payload';

import config from '@/payload.config';

let cached: Awaited<ReturnType<typeof getPayload>> | null = null;

export const isPayloadConfigured = (): boolean =>
  Boolean(process.env.PAYLOAD_SECRET && process.env.DATABASE_URI);

export const getPayloadClient = async () => {
  if (!cached) {
    cached = await getPayload({ config });
  }
  return cached;
};
