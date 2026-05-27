import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { GalleryGrid } from './GalleryGrid';
import type { GalleryItem } from './actions';

export const metadata = { title: 'Принты' };
export const dynamic = 'force-dynamic';

async function loadGallery(): Promise<GalleryItem[]> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
        .from('gallery_images')
        .select('id, src, alt, sort_order')
        .order('sort_order', { ascending: true });
    if (error) {
        console.error('[admin/gallery] load error:', error);
        return [];
    }
    return data ?? [];
}

export default async function GalleryPage() {
    const items = await loadGallery();
    return <GalleryGrid initial={items} />;
}
