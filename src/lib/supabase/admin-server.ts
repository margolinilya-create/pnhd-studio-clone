import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role клиент. Обходит RLS. ВЫЗЫВАТЬ ТОЛЬКО из Server Actions / API routes,
 * после проверки requireAdmin(). Никогда не импортировать в client component.
 */
export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            'Admin client env missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'
        );
    }

    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-pnhd-admin': '1' } },
    });
}
