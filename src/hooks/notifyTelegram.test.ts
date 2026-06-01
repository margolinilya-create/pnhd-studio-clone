import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notifyTelegram } from './notifyTelegram';

function makeDoc() {
  return {
    id: 'sub-1',
    submissionData: [
      { field: 'name', value: 'Иван' },
      { field: 'phone', value: '+79991234567' },
      { field: 'comment', value: 'тест-комментарий' },
    ],
  };
}

function makeReq() {
  return {
    payload: { logger: { warn: vi.fn(), info: vi.fn() } },
  } as any;
}

describe('notifyTelegram', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('no-ops when env not set', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no-ops on non-create', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'update', doc: makeDoc(), req: makeReq() } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to Telegram Bot API on create', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await notifyTelegram({ operation: 'create', doc: makeDoc(), req: makeReq() } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botTOKEN/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.chat_id).toBe('123');
    expect(body.text).toContain('Иван');
    expect(body.text).toContain('+79991234567');
    // Comment present → blank line separator before "Комментарий:", no embedded \n in line content.
    expect(body.text).toMatch(/Телефон: \+79991234567\n\nКомментарий: тест-комментарий/);
    expect(body.text).not.toMatch(/\n\n\n/); // no triple-newlines anywhere
  });

  it('logs warn on HTTP failure without throwing', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));

    const req = makeReq();
    await expect(
      notifyTelegram({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();
    expect(req.payload.logger.warn).toHaveBeenCalled();
  });

  it('logs warn on fetch network exception without throwing', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN';
    process.env.TELEGRAM_CHAT_ID = '123';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('DNS failure')));

    const req = makeReq();
    await expect(
      notifyTelegram({ operation: 'create', doc: makeDoc(), req } as any),
    ).resolves.toBeUndefined();
    expect(req.payload.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error), submissionId: 'sub-1' }),
      expect.stringContaining('Telegram fetch threw'),
    );
  });
});
