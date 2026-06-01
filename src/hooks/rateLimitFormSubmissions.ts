import { createHash } from 'node:crypto';
import { APIError, type CollectionBeforeOperationHook } from 'payload';

export const WINDOW_SECONDS = 60;
export const MAX_PER_WINDOW = 3;

function extractIp(headers: Headers): string {
  // На Vercel клиент-IP попадает в `x-vercel-forwarded-for` — этот заголовок
  // выставляет edge proxy после того как user-supplied `x-forwarded-for` уже
  // отброшен. `x-forwarded-for[0]` спуфится rotation'ом (см. audit B7) — лимит
  // обходился неограниченно. Падаем на `x-real-ip` только за пределами Vercel.
  const vercelFwd = headers.get('x-vercel-forwarded-for');
  if (vercelFwd) return vercelFwd.split(',')[0].trim();
  const real = headers.get('x-real-ip');
  if (real) return real;
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
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

  const headers = req.headers as Headers;
  const ip = extractIp(headers);
  const ipHash = hashIp(ip);
  const userAgent = headers.get('user-agent') ?? '';

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

  // Inject system fields only after the rate-limit check passes — мутируем args.data
  // (buildBeforeOperation passes args by reference). Если бы это шло до find(),
  // отброшенная попытка всё равно успела бы оставить ipHash в args для последующих хуков.
  const createArgs = args as { data: Record<string, unknown> };
  createArgs.data = {
    ...(createArgs.data ?? {}),
    ipHash,
    userAgent,
  };
};
