import { createHash } from 'node:crypto';
import { APIError, type CollectionBeforeOperationHook } from 'payload';

const WINDOW_SECONDS = 60;
const MAX_PER_WINDOW = 3;

function extractIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export const rateLimitFormSubmissions: CollectionBeforeOperationHook = async ({
  operation,
  req,
  args,
}) => {
  if (operation !== 'create') return;

  const ip = extractIp(req.headers as Headers);
  const ipHash = hashIp(ip);
  const userAgent = (req.headers as Headers).get('user-agent') ?? '';

  // Mutate args.data in place — buildBeforeOperation passes args by reference,
  // so mutation propagates to the operation even when the hook returns void.
  const createArgs = args as { data: Record<string, unknown> };
  createArgs.data = {
    ...(createArgs.data ?? {}),
    ipHash,
    userAgent,
  };

  const cutoff = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();
  const recent = await req.payload.find({
    collection: 'form-submissions',
    where: {
      ipHash: { equals: ipHash },
      createdAt: { greater_than: cutoff },
    },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  });

  if (recent.totalDocs >= MAX_PER_WINDOW) {
    throw new APIError(
      'Rate limit exceeded. Please wait a minute and try again.',
      429,
    );
  }
};
