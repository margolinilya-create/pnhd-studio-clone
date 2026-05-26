import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../_lib/require-admin';
import { DashboardCards } from './DashboardCards';

export const metadata = { title: 'Дашборд' };
export const dynamic = 'force-dynamic';

async function loadCounts() {
    await requireAdmin();
    const admin = createAdminClient();

    const [products, posts, gallery, newLeads] = await Promise.all([
        admin.from('products').select('id', { count: 'exact', head: true }),
        admin.from('blog_posts').select('id', { count: 'exact', head: true }),
        admin.from('gallery_images').select('id', { count: 'exact', head: true }),
        admin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);

    return {
        products: products.count ?? 0,
        posts:    posts.count ?? 0,
        gallery:  gallery.count ?? 0,
        newLeads: newLeads.count ?? 0,
    };
}

export default async function DashboardPage() {
    const counts = await loadCounts();

    const cards = [
        { label: 'Товары',          value: counts.products, href: '/admin/products' },
        { label: 'Блог-посты',      value: counts.posts,    href: '/admin/blog' },
        { label: 'Принты',          value: counts.gallery,  href: '/admin/gallery' },
        { label: 'Новые заявки',    value: counts.newLeads, href: '/admin/leads' },
    ];

    return <DashboardCards cards={cards} />;
}
