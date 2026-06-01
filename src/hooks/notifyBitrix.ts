import type { CollectionAfterChangeHook } from 'payload';

type SubmissionField = { field: string; value: string };

function getField(data: SubmissionField[], name: string): string {
  return data.find((f) => f.field === name)?.value ?? '';
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
    SOURCE_ID: 'WEB',
    TITLE: `Лид с сайта (submission ${doc.id})`,
  };

  const endpoint = url.endsWith('/') ? `${url}crm.lead.add.json` : `${url}/crm.lead.add.json`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const text = await res.text();
      await req.payload.update({
        collection: 'form-submissions',
        id: doc.id,
        data: { bitrixError: `HTTP ${res.status}: ${text.slice(0, 500)}` },
        depth: 0,
      });
      return;
    }

    const body = (await res.json()) as { result?: number | string; error?: string };
    if (body.result === undefined) {
      await req.payload.update({
        collection: 'form-submissions',
        id: doc.id,
        data: { bitrixError: `Bitrix returned no result: ${JSON.stringify(body).slice(0, 500)}` },
        depth: 0,
      });
      return;
    }

    await req.payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: { bitrixLeadId: String(body.result) },
      depth: 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await req.payload.update({
      collection: 'form-submissions',
      id: doc.id,
      data: { bitrixError: message.slice(0, 500) },
      depth: 0,
    });
  }
};
