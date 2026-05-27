'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type LeadStatus = 'new' | 'contacted' | 'done' | 'spam';

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('leads').update({ status }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/leads');
    return { ok: true };
}
