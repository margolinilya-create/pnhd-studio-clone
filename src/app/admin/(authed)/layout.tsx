import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { AdminShell } from '../_components/AdminShell';

export default async function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
    // Дублирует middleware на случай прямого RSC-вызова. Тащим email для шапки.
    const supabase = createAuthServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/admin/login');

    const { data: admin } = await supabase
        .from('admin_users').select('email').eq('user_id', user.id).maybeSingle();
    if (!admin) redirect('/admin/login?error=forbidden');

    return <AdminShell userEmail={admin.email}>{children}</AdminShell>;
}
