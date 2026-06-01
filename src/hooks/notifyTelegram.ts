import type { CollectionAfterChangeHook } from 'payload';

type SubmissionField = { field: string; value: string };

// Telegram fetch wrapped в AbortController — иначе зависший Bot-API
// блокировал submission-response. См. audit B10 / code-review C4.
const FETCH_TIMEOUT_MS = 5000;

function getField(data: SubmissionField[], name: string): string {
  return data.find((f) => f.field === name)?.value ?? '';
}

export const notifyTelegram: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  if (operation !== 'create') return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const data: SubmissionField[] = doc.submissionData ?? [];
  const name = getField(data, 'name');
  const phone = getField(data, 'phone');
  const email = getField(data, 'email');
  const comment = getField(data, 'comment');

  // Сборка через массив строк: пустая строка '' даёт визуальный отступ
  // (blank line) после `.join('\n')`. Никаких embedded '\n' в самих строках.
  const lines: string[] = [
    `🆕 Новая заявка (submission ${doc.id})`,
    `Имя: ${name || '—'}`,
    `Телефон: ${phone || '—'}`,
  ];
  if (email) lines.push(`Email: ${email}`);
  if (comment) lines.push('', `Комментарий: ${comment}`);
  const text = lines.join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      req.payload.logger.warn(
        { status: res.status, submissionId: doc.id },
        'Telegram notification failed',
      );
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    req.payload.logger.warn(
      { err, submissionId: doc.id, abort: isAbort, timeoutMs: FETCH_TIMEOUT_MS },
      isAbort ? 'Telegram fetch aborted (timeout)' : 'Telegram fetch threw',
    );
  }
};
