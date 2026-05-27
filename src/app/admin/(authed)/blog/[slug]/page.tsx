import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin-server';
import { requireAdmin } from '../../../_lib/require-admin';
import { BlogForm } from '../BlogForm';
import type { BlogPostInput } from '../../../_lib/blog-schemas';

export const dynamic = 'force-dynamic';

async function loadPost(slug: string): Promise<BlogPostInput | null> {
    await requireAdmin();
    const admin = createAdminClient();
    const { data } = await admin
        .from('blog_posts')
        .select('id, slug, title, subtitle, cover, author, hashtags, body_html')
        .eq('slug', slug)
        .maybeSingle();
    return data ?? null;
}

export default async function EditPostPage({ params }: { params: { slug: string } }) {
    const post = await loadPost(params.slug);
    if (!post) notFound();
    return <BlogForm initial={post} />;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
    return { title: params.slug };
}
