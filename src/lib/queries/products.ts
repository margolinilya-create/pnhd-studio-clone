import 'server-only';
import { getSupabaseServer } from '../supabase/server';
import type { IProduct } from '@/app/utils/types';

type ProductRow = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: string;
    price: number;
    stock: string | null;
    color: string | null;
    stage_color: string | null;
    category: string | null;
    is_sale: boolean;
    is_for_printing: boolean;
    image_url: string | null;
    editor_front_view: string | null;
    editor_back_view: string | null;
    editor_lsleeve_view: string | null;
    editor_rsleeve_view: string | null;
    shipping_weight: number | null;
    shipping_width: number | null;
    shipping_length: number | null;
    shipping_depth: number | null;
    friends: string | null;
    product_sizes: Array<{ name: string; qty: number; sort_order: number }>;
    product_gallery_photos: Array<{ url: string; sort_order: number }>;
};

const SELECT_COLUMNS = `
    id, slug, name, description, type, price, stock,
    color, stage_color, category, is_sale, is_for_printing,
    image_url, editor_front_view, editor_back_view, editor_lsleeve_view, editor_rsleeve_view,
    shipping_weight, shipping_width, shipping_length, shipping_depth, friends,
    product_sizes ( name, qty, sort_order ),
    product_gallery_photos ( url, sort_order )
`;

function mapProduct(row: ProductRow): IProduct {
    return {
        _id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description ?? '',
        links: [],
        type: row.type,
        price: Number(row.price),
        shippingParams: {
            weight: Number(row.shipping_weight ?? 0),
            width: Number(row.shipping_width ?? 0),
            length: Number(row.shipping_length ?? 0),
            depth: Number(row.shipping_depth ?? 0),
        },
        stock: row.stock ?? '',
        color: row.color ?? '',
        stageColor: row.stage_color ?? '',
        category: row.category ?? '',
        isSale: row.is_sale,
        isForPrinting: row.is_for_printing,
        image_url: row.image_url ?? '',
        galleryPhotos: (row.product_gallery_photos ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((p) => p.url),
        editor_front_view: row.editor_front_view ?? '',
        editor_back_view: row.editor_back_view ?? '',
        editor_lsleeve_view: row.editor_lsleeve_view ?? '',
        editor_rsleeve_view: row.editor_rsleeve_view ?? '',
        sizes: (row.product_sizes ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => ({ name: s.name, qty: s.qty })),
        friends: row.friends ?? '',
    };
}

export async function getAllProducts(filters?: { type?: string }): Promise<IProduct[]> {
    const supabase = getSupabaseServer();
    let q = supabase.from('products').select(SELECT_COLUMNS);
    if (filters?.type) q = q.eq('type', filters.type);
    const { data, error } = await q;
    if (error) throw error;
    return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<IProduct | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
        .from('products')
        .select(SELECT_COLUMNS)
        .eq('slug', slug)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapProduct(data as unknown as ProductRow);
}

export async function getAllProductSlugs(): Promise<string[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from('products').select('slug');
    if (error) throw error;
    return (data ?? []).map((r: { slug: string }) => r.slug);
}
