import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware-client';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Прокидываем pathname в request headers, чтобы root layout мог понять,
    // на каком роуте находится, и не рендерить публичный header/footer на /admin.
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);
    const passthrough = () =>
        NextResponse.next({ request: { headers: requestHeaders } });

    if (!pathname.startsWith('/admin')) return passthrough();
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return passthrough();

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    const supabase = createMiddlewareSupabaseClient(req, res);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const url = req.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('next', pathname);
        return NextResponse.redirect(url);
    }

    const { data: admin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!admin) {
        const url = req.nextUrl.clone();
        url.pathname = '/admin/login';
        url.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(url);
    }

    return res;
}

export const config = {
    // Матчим всё, кроме статики Next.js и медиа-файлов — иначе x-pathname не выставится
    // и root layout не сможет различить публичные и admin-страницы.
    matcher: ['/((?!_next/static|_next/image|favicon|.*\\..*).*)'],
};
