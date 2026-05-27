'use server';

import { createAuthServerClient } from '@/lib/supabase/auth-server';
import { redirect } from 'next/navigation';

export async function signOut() {
    const supabase = createAuthServerClient();
    await supabase.auth.signOut();
    redirect('/admin/login');
}
