import { NextRequest, NextResponse } from 'next/server';

// Redirect handling через Payload `redirects` collection (@payloadcms/plugin-redirects).
// Триггерится на storefront-роутах; admin/API/статика проскакивают через matcher.
//
// Запрос на Payload REST API для каждого визита HTML-страницы. Добавляет ~50ms
// latency, но кеш Vercel должен большую часть смягчить. Если станет узким местом —
// перенесём в edge-cache.

const isStaticAsset = (pathname: string): boolean => {
  // Файлы (.js, .css, .png и т.д.) и Next.js internals.
  return pathname.includes('.') || pathname.startsWith('/_next/');
};

type RedirectDoc = {
  from: string;
  to?: {
    type?: 'reference' | 'custom' | null;
    url?: string | null;
    reference?: {
      relationTo: 'pages' | 'products';
      value: number | { slug: string; pageType?: string };
    } | null;
  };
};

const resolveTarget = (doc: RedirectDoc): string | null => {
  if (!doc?.to) return null;
  if (doc.to.type === 'custom' && doc.to.url) {
    return doc.to.url;
  }
  if (doc.to.type === 'reference' && doc.to.reference) {
    const ref = doc.to.reference;
    if (typeof ref.value !== 'object' || !ref.value) return null;
    const slug = ref.value.slug;
    if (!slug) return null;
    if (ref.relationTo === 'pages') {
      return ref.value.pageType === 'blog' ? `/blog/${slug}` : `/${slug}`;
    }
    if (ref.relationTo === 'products') {
      return `/shop/${slug}`;
    }
  }
  return null;
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isStaticAsset(pathname)) return NextResponse.next();

  try {
    const apiUrl = `${req.nextUrl.origin}/api/redirects?where[from][equals]=${encodeURIComponent(
      pathname,
    )}&depth=1&limit=1`;
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) return NextResponse.next();
    const data = (await res.json()) as { docs?: RedirectDoc[] };
    const doc = data.docs?.[0];
    if (!doc) return NextResponse.next();

    const target = resolveTarget(doc);
    if (!target) return NextResponse.next();

    const targetUrl = target.startsWith('http')
      ? target
      : new URL(target, req.nextUrl.origin).toString();
    return NextResponse.redirect(targetUrl, 301);
  } catch {
    return NextResponse.next();
  }
}

// Skip API/admin/payload-routes/static/Next-internals.
export const config = {
  matcher: ['/((?!api|admin|_next|graphql|graphql-playground).*)'],
};
