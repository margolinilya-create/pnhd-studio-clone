import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../_lib/require-admin';
import { BlogListPageClient } from './BlogListPageClient';

export const metadata = { title: 'Блог' };
export const dynamic = 'force-dynamic';

export interface BlogRow {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    cover: string | null;
    author: string | null;
    hashtags: string[];
    created_at: string;
}

async function loadPosts(): Promise<BlogRow[]> {
    await requireAdmin();
    const admin = createAdminClient();

    const { data, error } = await admin
        .from('blog_posts')
        .select('id, slug, title, subtitle, cover, author, hashtags, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[admin/blog] load error:', error);
        return [];
    }
    return data ?? [];
}

export default async function BlogListPage() {
    const posts = await loadPosts();
    return <BlogListPageClient posts={posts} />;
}
