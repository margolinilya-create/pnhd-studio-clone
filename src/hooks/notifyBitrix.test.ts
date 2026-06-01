import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notifyBitrix } from './notifyBitrix';

function makeDoc(overrides: Partial<any> = {}) {
  return {
    id: 'sub-1',
    submissionData: [
      { field: 'name', value: 'Иван' },
      { field: 'phone', value: '+79991234567' },
      { field: 'email', value: 'iv@ex.com' },
      { field: 'comment', value: 'тест' },
    ],
    ...overrides,
  };
}

function makeReq() {
  return {
    payload: {
      update: vi.fn().mockResolvedValue({}),
      logger: { warn: vi.fn(), info: vi.fn() },
    },
  } as any;
}

describe('notifyBitrix', () => {
  beforeEach(() => {
    // vi.restoreAllMocks() возвращает spies, vi.unstubAllGlobals() убирает stubGlobal —
    // нужны оба, иначе fetch-стаб из предыдущего теста остаётся живым и no-op тест ложно проходит.
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.BITRIX_WEBHOOK_URL;
  });

  it('no-ops when BITRIX_WEBHOOK_URL not set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyBitrix({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips non-create operations', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyBitrix({ operation: 'update', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to crm.lead.add.json on create', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 99 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.bitrix24.ru/rest/1/abc/crm.lead.add.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.fields.NAME).toBe('Иван');
    expect(body.fields.PHONE).toEqual([{ VALUE: '+79991234567', VALUE_TYPE: 'WORK' }]);
    expect(body.fields.EMAIL).toEqual([{ VALUE: 'iv@ex.com', VALUE_TYPE: 'WORK' }]);
    expect(body.fields.COMMENTS).toContain('тест');
  });

  it('writes bitrixLeadId on success', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 42 }),
    }));

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'form-submissions',
      id: 'sub-1',
      data: { bitrixLeadId: '42' },
      depth: 0,
    });
  });

  it('writes bitrixError on HTTP failure without throwing', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error',
    }));

    const req = makeReq();
    await expect(
      notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();

    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bitrixError: expect.stringContaining('500'),
        }),
      }),
    );
  });

  it('writes bitrixError on network exception', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bitrixError: expect.stringContaining('network down') }),
      }),
    );
  });

  it('writes bitrixError with error_description when Bitrix returns 200 + error envelope', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'INVALID_TOKEN', error_description: 'токен истёк' }),
    }));

    const req = makeReq();
    await notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any);

    expect(req.payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bitrixError: expect.stringContaining('токен истёк') }),
      }),
    );
  });

  it('does not throw when secondary payload.update also fails (best-effort contract)', async () => {
    process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.ru/rest/1/abc/';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const req = makeReq();
    req.payload.update.mockRejectedValueOnce(new Error('db unreachable'));

    await expect(
      notifyBitrix({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();

    expect(req.payload.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: 'sub-1' }),
      expect.stringContaining('failed to write outcome'),
    );
  });
});
