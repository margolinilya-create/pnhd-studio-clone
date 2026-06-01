import type { CollectionAfterChangeHook, PayloadRequest } from 'payload';

type SubmissionField = { field: string; value: string };

const BITRIX_SOURCE_ID = 'WEB';
const MAX_ERROR_LENGTH = 500;
// Без AbortController зависший Bitrix upstream блокировал submission-response
// до Vercel function-timeout (~60s). Юзер видел "вращающийся submit" минуту.
// См. audit B10 / code-review C4.
const FETCH_TIMEOUT_MS = 5000;

function getField(data: SubmissionField[], name: string): string {
  return data.find((f) => f.field === name)?.value ?? '';
}

/**
 * Безопасный write-back в submission. Best-effort hook contract: даже если
 * запись в БД упадёт (например, БД недоступна), хук НЕ должен throw'ить —
 * иначе исходный submission уже сохранён, но ошибка всплывёт в caller'е.
 * Логируем через payload.logger и идём дальше.
 */
async function safeUpdateSubmission(
  req: PayloadRequest,
  id: string | number,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await req.payload.update({
      collection: 'form-submissions',
      id,
      data,
      depth: 0,
    });
  } catch (updateErr) {
    req.payload.logger.warn(
      { err: updateErr, submissionId: id, fields: Object.keys(data) },
      'notifyBitrix: failed to write outcome to submission',
    );
  }
}

export const notifyBitrix: CollectionAfterChangeHook = async ({ operation, doc, req }) => {
  if (operation !== 'create') return;

  const url = process.env.BITRIX_WEBHOOK_URL;
  if (!url) return;

  const submissionData: SubmissionField[] = doc.submissionData ?? [];
  const name = getField(submissionData, 'name');
  const phone = getField(submissionData, 'phone');
  const email = getField(submissionData, 'email');
  const comment = getField(submissionData, 'comment');
  const referenceUrl = getField(submissionData, 'referenceUrl');

  const fields = {
    NAME: name || 'Без имени',
    PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : undefined,
    EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
    COMMENTS: [comment, referenceUrl && `Референс: ${referenceUrl}`]
      .filter(Boolean)
      .join('\n\n'),
    SOURCE_ID: BITRIX_SOURCE_ID,
    TITLE: `Лид с сайта (submission ${doc.id})`,
  };

  const endpoint = url.endsWith('/') ? `${url}crm.lead.add.json` : `${url}/crm.lead.add.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      await safeUpdateSubmission(req, doc.id, {
        bitrixError: `HTTP ${res.status}: ${text.slice(0, MAX_ERROR_LENGTH)}`,
      });
      return;
    }

    const body = (await res.json()) as { result?: number | string; error?: string; error_description?: string };

    // Bitrix24 возвращает { error, error_description } с HTTP 200 при ошибках валидации/токена.
    // Эта ветка также покрывает body.result === undefined.
    if (body.error || body.result === undefined) {
      const reason = body.error_description ?? body.error ?? JSON.stringify(body);
      await safeUpdateSubmission(req, doc.id, {
        bitrixError: `Bitrix error: ${reason.slice(0, MAX_ERROR_LENGTH)}`,
      });
      return;
    }

    await safeUpdateSubmission(req, doc.id, {
      bitrixLeadId: String(body.result),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const message = isAbort
      ? `Bitrix timeout (${FETCH_TIMEOUT_MS}ms)`
      : err instanceof Error
        ? err.message
        : String(err);
    await safeUpdateSubmission(req, doc.id, {
      bitrixError: message.slice(0, MAX_ERROR_LENGTH),
    });
  }
};
