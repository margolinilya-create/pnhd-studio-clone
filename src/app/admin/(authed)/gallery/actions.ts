'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { uploadImage } from '../../_lib/upload-image';

export type ActionResult<T = unknown> =
    | ({ ok: true } & T)
    | { ok: false; error: string };

export interface GalleryItem {
    id: string;
    src: string;
    alt: string | null;
    sort_order: number;
}

export async function uploadGalleryItem(formData: FormData): Promise<ActionResult<{ item: GalleryItem }>> {
    await requireAdmin();
    const file = formData.get('file');
    if (!(file instanceof File)) return { ok: false, error: 'Файл не передан' };

    try {
        const uniq = crypto.randomUUID();
        const upload = await uploadImage({ bucket: 'gallery-images', path: uniq, file });

        const admin = createAdminClient();
        const { data: maxRow } = await admin
            .from('gallery_images').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
        const nextOrder = (maxRow?.sort_order ?? -1) + 1;

        const { data, error } = await admin
            .from('gallery_images')
            .insert({ src: upload.url, alt: '', sort_order: nextOrder })
            .select('id, src, alt, sort_order')
            .single();
        if (error || !data) return { ok: false, error: error?.message ?? 'Ошибка insert' };

        revalidatePath('/admin/gallery');
        return { ok: true, item: data };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Ошибка загрузки' };
    }
}

export async function updateGalleryItemAlt(id: string, alt: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from('gallery_images').update({ alt }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/admin/gallery');
    return { ok: true };
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: row } = await admin.from('gallery_images').select('src').eq('id', id).maybeSingle();
    const { error } = await admin.from('gallery_images').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    if (row?.src) {
        const m = row.src.match(/\/gallery-images\/(.+)$/);
        if (m?.[1]) {
            await admin.storage.from('gallery-images').remove([m[1]]).catch(() => {});
        }
    }

    revalidatePath('/admin/gallery');
    return { ok: true };
}

export async function reorderGallery(orderedIds: string[]): Promise<ActionResult> {
    await requireAdmin();
    const admin = createAdminClient();

    for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await admin.from('gallery_images').update({ sort_order: i }).eq('id', orderedIds[i]);
        if (error) return { ok: false, error: error.message };
    }
    revalidatePath('/admin/gallery');
    return { ok: true };
}
