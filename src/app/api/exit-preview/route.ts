import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') ?? '/';

  const draft = await draftMode();
  draft.disable();

  redirect(path);
}
