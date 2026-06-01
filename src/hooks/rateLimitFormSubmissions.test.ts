import { describe, expect, it, vi } from 'vitest';
import { MAX_PER_WINDOW, rateLimitFormSubmissions } from './rateLimitFormSubmissions';

function makeReq(ip: string, headerName: 'x-vercel-forwarded-for' | 'x-forwarded-for' | 'x-real-ip' = 'x-vercel-forwarded-for') {
  return {
    headers: new Headers({ [headerName]: ip, 'user-agent': 'test-agent' }),
    payload: {
      find: vi.fn(),
    },
  } as any;
}

describe('rateLimitFormSubmissions', () => {
  it('passes through non-create operations', async () => {
    const req = makeReq('1.2.3.4');
    await expect(
      rateLimitFormSubmissions({ operation: 'read', req, args: {} } as any),
    ).resolves.toBeUndefined();
    expect(req.payload.find).not.toHaveBeenCalled();
  });

  it('allows first submission for a fresh IP', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 0 });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).resolves.toBeUndefined();

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'form-submissions',
        where: expect.objectContaining({
          ipHash: expect.objectContaining({ equals: expect.any(String) }),
          createdAt: expect.objectContaining({ greater_than: expect.any(String) }),
        }),
      }),
    );
  });

  it('allows last submission below the limit (boundary: totalDocs = MAX_PER_WINDOW - 1)', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: MAX_PER_WINDOW - 1 });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).resolves.toBeUndefined();
  });

  it('throws when count reaches MAX_PER_WINDOW (boundary: totalDocs = MAX_PER_WINDOW)', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: MAX_PER_WINDOW });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).rejects.toThrow(/rate limit/i);
  });

  it('does NOT mutate args.data when rate-limit throws', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: MAX_PER_WINDOW });

    const args: any = { data: { form: 'form-id' } };
    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args } as any),
    ).rejects.toThrow();

    expect(args.data.ipHash).toBeUndefined();
    expect(args.data.userAgent).toBeUndefined();
    expect(args.data.form).toBe('form-id');
  });

  it('writes ipHash and userAgent into args.data', async () => {
    const req = makeReq('5.6.7.8');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 0 });

    const args: any = { data: { form: 'form-id' } };
    await rateLimitFormSubmissions({ operation: 'create', req, args } as any);

    expect(args.data.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.data.userAgent).toBe('test-agent');
  });

  it('uses unknown ipHash when no IP header present', async () => {
    const req = {
      headers: new Headers(),
      payload: { find: vi.fn().mockResolvedValueOnce({ totalDocs: 0 }) },
    } as any;
    const args: any = { data: {} };

    await rateLimitFormSubmissions({ operation: 'create', req, args } as any);

    expect(args.data.ipHash).toBeDefined();
  });

  it('prefers x-vercel-forwarded-for over user-controlled x-forwarded-for (B7 spoof-resistance)', async () => {
    const req = {
      headers: new Headers({
        'x-forwarded-for': '6.6.6.6',
        'x-vercel-forwarded-for': '1.2.3.4',
        'user-agent': 'test',
      }),
      payload: { find: vi.fn().mockResolvedValueOnce({ totalDocs: 0 }) },
    } as any;
    const argsSpoofed: any = { data: {} };
    await rateLimitFormSubmissions({ operation: 'create', req, args: argsSpoofed } as any);

    const req2 = {
      headers: new Headers({
        'x-vercel-forwarded-for': '1.2.3.4',
        'user-agent': 'test',
      }),
      payload: { find: vi.fn().mockResolvedValueOnce({ totalDocs: 0 }) },
    } as any;
    const argsClean: any = { data: {} };
    await rateLimitFormSubmissions({ operation: 'create', req: req2, args: argsClean } as any);

    // Same Vercel IP → same hash, regardless of spoofed `x-forwarded-for`
    expect(argsSpoofed.data.ipHash).toBe(argsClean.data.ipHash);
  });
});
