'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/**
 * Anon-клиент с cookies-based сессией для admin client components
 * (login-форма, logout-кнопка). Singleton на client side.
 */
export function getAuthBrowserClient(): SupabaseClient {
    if (cached) return cached;
    cached = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return cached;
}
