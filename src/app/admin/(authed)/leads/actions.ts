'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';

export type LeadStatus = 'new' | 'contacted' | 'done' | 'spam';

export type ActionResult = { ok: true } | { ok: false; error: string };

const StatusSchema = z.enum(['new', 'contacted', 'done', 'spam']);
const IdSchema = z.string().uuid();

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<ActionResult> {
    await requireAdmin();

    // PR #6: zod валидация на server-action входе. Server Actions Next-а — публичный
    // endpoint, любой клиент (включая curl) может вызвать с произвольным payload.
    // TypeScript на runtime не существует — нужна explicit-валидация.
    const parsedId = IdSchema.safeParse(id);
    if (!parsedId.success) {
        return { ok: false, error: 'invalid_lead_id' };
    }
    const parsedStatus = StatusSchema.safeParse(status);
    if (!parsedStatus.success) {
        return { ok: false, error: 'invalid_status' };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from('leads')
        .update({ status: parsedStatus.data })
        .eq('id', parsedId.data);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/leads');
    return { ok: true };
}
