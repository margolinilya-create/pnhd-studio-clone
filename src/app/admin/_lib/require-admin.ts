import 'server-only';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export class UnauthorizedError extends Error {
    constructor() { super('Unauthorized'); this.name = 'UnauthorizedError'; }
}

export class ForbiddenError extends Error {
    constructor() { super('Forbidden'); this.name = 'ForbiddenError'; }
}

/**
 * Вызывать первой строкой в каждом admin Server Action.
 * Бросает UnauthorizedError/ForbiddenError — Server Action возвращает их как
 * ошибку формы (Next.js перехватывает throw в server actions).
 */
export async function requireAdmin() {
    const supabase = createAuthServerClient();

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new UnauthorizedError();

    const { data, error } = await supabase
        .from('admin_users')
        .select('user_id, email')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new ForbiddenError();

    return { user, admin: data };
}
