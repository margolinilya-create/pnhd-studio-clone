import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const path = url.searchParams.get('path') ?? '/';

  const expectedSecret = process.env.NEXT_PUBLIC_PREVIEW_SECRET || process.env.PREVIEW_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response('Invalid preview secret', { status: 401 });
  }

  const draft = await draftMode();
  draft.enable();

  redirect(path);
}
