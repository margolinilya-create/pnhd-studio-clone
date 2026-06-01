import { describe, expect, it, vi } from 'vitest';
import { rateLimitFormSubmissions } from './rateLimitFormSubmissions';

function makeReq(ip: string) {
  return {
    headers: new Headers({ 'x-forwarded-for': ip, 'user-agent': 'test-agent' }),
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

  it('throws when more than 3 submissions in last minute', async () => {
    const req = makeReq('1.2.3.4');
    req.payload.find.mockResolvedValueOnce({ totalDocs: 3 });

    await expect(
      rateLimitFormSubmissions({ operation: 'create', req, args: { data: {} } } as any),
    ).rejects.toThrow(/rate limit/i);
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
});
