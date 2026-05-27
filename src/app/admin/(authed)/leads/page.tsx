import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { LeadsTable, type LeadRow } from './LeadsTable';

export const metadata = { title: 'Заявки' };
export const dynamic = 'force-dynamic';

async function loadLeads(): Promise<LeadRow[]> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('leads')
        .select('id, name, phone, email, status, created_at, source')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[admin/leads] load error:', error);
        return [];
    }
    return (data ?? []) as LeadRow[];
}

export default async function LeadsPage() {
    const leads = await loadLeads();
    return <LeadsTable leads={leads} />;
}
