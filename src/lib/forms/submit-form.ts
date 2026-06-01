export type SubmitFieldValue = string | boolean;

export type SubmitFormPayload = {
  formId: string;
  fields: Record<string, SubmitFieldValue>;
};

export async function submitForm({ formId, fields }: SubmitFormPayload): Promise<{ id: string }> {
  const submissionData = Object.entries(fields)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([field, value]) => ({ field, value: String(value) }));

  const res = await fetch('/api/form-submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ form: formId, submissionData }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error('rate-limit');
    const text = await res.text().catch(() => '');
    throw new Error(`Submission failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as { doc?: { id: string } };
  return { id: body.doc?.id ?? '' };
}
