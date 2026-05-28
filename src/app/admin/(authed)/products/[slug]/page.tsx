import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../../_lib/require-admin';
import { ProductForm } from '../ProductForm';
import type { ProductInput } from '../../../_lib/schemas';

export const dynamic = 'force-dynamic';

async function loadProduct(slug: string): Promise<ProductInput | null> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: prod } = await admin
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
    if (!prod) return null;

    const [{ data: sizes }, { data: photos }, { data: links }] = await Promise.all([
        admin.from('product_sizes')
            .select('id, name, qty, sort_order')
            .eq('product_id', prod.id)
            .order('sort_order'),
        admin.from('product_gallery_photos')
            .select('id, url, sort_order')
            .eq('product_id', prod.id)
            .order('sort_order'),
        admin.from('product_links')
            .select('linked_product_id')
            .eq('product_id', prod.id),
    ]);

    return {
        id: prod.id,
        slug: prod.slug,
        name: prod.name,
        description: prod.description,
        type: prod.type,
        price: prod.price,
        stock: prod.stock ?? 'in_stock',
        color: prod.color,
        stage_color: prod.stage_color,
        category: prod.category,
        is_sale: prod.is_sale,
        is_for_printing: prod.is_for_printing,
        image_url: prod.image_url,
        editor_front_view:   prod.editor_front_view,
        editor_back_view:    prod.editor_back_view,
        editor_lsleeve_view: prod.editor_lsleeve_view,
        editor_rsleeve_view: prod.editor_rsleeve_view,
        shipping_weight: prod.shipping_weight,
        shipping_width:  prod.shipping_width,
        shipping_length: prod.shipping_length,
        shipping_depth:  prod.shipping_depth,
        meta_title:       prod.meta_title,
        meta_description: prod.meta_description,
        sizes:     sizes ?? [],
        photos:    photos ?? [],
        linkedIds: (links ?? []).map((l) => l.linked_product_id),
    };
}

export default async function EditProductPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const product = await loadProduct(params.slug);
    if (!product) notFound();
    return <ProductForm initial={product} />;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    return { title: params.slug };
}
