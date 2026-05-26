import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware-client';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (!pathname.startsWith('/admin')) return NextResponse.next();
    if (PUBLIC_ADMIN_PATHS.includes(pathname)) return NextResponse.next();

    const res = NextResponse.next();
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
    matcher: ['/admin/:path*'],
};
