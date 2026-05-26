import 'server-only';
import { getSupabaseServer } from '../supabase/server';
import type { TBlogPosts } from '@/app/utils/types';

type Post = TBlogPosts['posts'][number];

type PostRow = {
    post_id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    cover: string | null;
    author: string | null;
    likes: number;
    hashtags: string[] | null;
    body_html: string | null;
    created_at: string;
};

const COLUMNS = 'post_id, slug, title, subtitle, cover, author, likes, hashtags, body_html, created_at';

function formatDate(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
}

function mapPost(row: PostRow): Post {
    return {
        post_id: row.post_id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle ?? '',
        cover: row.cover ?? '',
        author: row.author ?? '',
        likes: row.likes,
        hashtags: row.hashtags ?? [],
        blog: { __html: row.body_html ?? '' },
        createdAt: formatDate(row.created_at),
    };
}

export async function getAllPosts(): Promise<TBlogPosts> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
        .from('blog_posts')
        .select(COLUMNS)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return { posts: (data as unknown as PostRow[]).map(mapPost) };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
        .from('blog_posts')
        .select(COLUMNS)
        .eq('slug', slug)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPost(data as unknown as PostRow);
}

export async function getAllPostSlugs(): Promise<string[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from('blog_posts').select('slug');
    if (error) throw error;
    return (data ?? []).map((r: { slug: string }) => r.slug);
}
