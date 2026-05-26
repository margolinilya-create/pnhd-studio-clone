import { getSupabaseClient } from '../supabase/client';

export type GalleryImage = { id: string; src: string; alt: string };

export async function fetchGalleryImages(): Promise<GalleryImage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('gallery_images')
        .select('id, src, alt')
        .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as GalleryImage[];
}
