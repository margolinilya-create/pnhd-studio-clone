'use server';

import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { redirect } from 'next/navigation';

export type LoginState = { error: string | null };

// Стриктно: /admin или /admin/<что-то>, без хитростей вроде /admin@evil.com или /admin.evil.com.
function safeNextPath(raw: string): string {
    if (raw === '/admin') return raw;
    if (raw.startsWith('/admin/')) return raw;
    return '/admin';
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const next = String(formData.get('next') || '/admin');

    if (!email || !password) {
        return { error: 'Введите email и пароль' };
    }

    const supabase = createAuthServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
        return { error: 'Неверный email или пароль' };
    }

    // Проверка allowlist: пускать дальше только подтверждённых админов.
    const { data: admin } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

    if (!admin) {
        await supabase.auth.signOut();
        return { error: 'Доступ запрещён' };
    }

    redirect(safeNextPath(next));
}
