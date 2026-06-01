import React from 'react';
import { notFound } from 'next/navigation';

export const revalidate = 60;

import styles from './page.module.scss';
import classNames from 'classnames/bind';
import { getAllPostSlugs, getPostBySlug, getPostSeoBySlug } from '@/lib/queries/blog';
import type { Media } from '@/payload-types';
import { resolveDomain } from "@/lib/site/domain";
import { Metadata } from "next";
import { buildMetadata } from "@/app/_lib/build-metadata";
import { getSiteSettings } from "@/lib/queries/site-settings";
import MarkupScript from "@/components/shared-components/markup-script/markup-script";

const cx = classNames.bind(styles);

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseRuDate(formatted: string): string {
    // formatted = dd.mm.yyyy → ISO yyyy-mm-dd
    const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(formatted);
    if (!m) return new Date().toISOString();
    return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`).toISOString();
}

export async function generateMetadata(
    props: {
        params: Promise<{ post: string }>;
    }
): Promise<Metadata> {
    const params = await props.params;
    const [post, seo, settings] = await Promise.all([
        getPostBySlug(params.post),
        getPostSeoBySlug(params.post),
        getSiteSettings(),
    ]);
    const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
    if (!post) {
        return await buildMetadata({
            title: `Статья | ${siteName}`,
            description: `Блог ${siteName}`,
            path: `/blog/${params.post}`,
        });
    }

    const metaTitle = seo?.meta?.title;
    const metaDescription = seo?.meta?.description;
    const metaImage = seo?.meta?.image && typeof seo.meta.image === 'object'
        ? (seo.meta.image as Media).url ?? undefined
        : undefined;

    const fallbackDescription = post.subtitle
        ? post.subtitle
        : stripHtml(post.blog.__html ?? '').slice(0, 200);

    return await buildMetadata({
        title: metaTitle ?? `${post.title} | ${siteName}`,
        description: metaDescription ?? fallbackDescription,
        path: `/blog/${params.post}`,
        image: metaImage ?? post.cover ?? undefined,
        type: 'article',
    });
}

export const generateStaticParams = async () => {
    const slugs = await getAllPostSlugs();
    return slugs.map((slug) => ({ post: slug }));
}
export const dynamicParams = true;

function articleJsonLd(
    post: NonNullable<Awaited<ReturnType<typeof getPostBySlug>>>,
    slug: string,
    base: string,
    siteName: string,
    legalName: string,
) {
    const url = `${base}/blog/${slug}`;
    const datePublished = parseRuDate(post.createdAt);
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.subtitle || stripHtml(post.blog.__html ?? '').slice(0, 200),
        image: post.cover ? [post.cover] : undefined,
        datePublished,
        dateModified: datePublished,
        author: post.author
            ? { '@type': 'Person', name: post.author }
            : { '@type': 'Organization', name: siteName },
        publisher: {
            '@type': 'Organization',
            name: legalName,
            logo: { '@type': 'ImageObject', url: `${base}/main_screen_shape_one.svg` },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        keywords: post.hashtags?.join(', '),
        url,
    };
}

const PostPage = async (props: {
    params: Promise<{ post: string }>;
    searchParams?: Promise<{ preview?: string }>;
}) => {
    const params = await props.params;
    const searchParams = (await props.searchParams) ?? {};
    const preview = searchParams.preview === 'true';
    const [post, settings] = await Promise.all([
        getPostBySlug(params.post, { preview }),
        getSiteSettings(),
    ]);
    if (!post) notFound();
    const base = resolveDomain();
    const siteName = settings?.siteName ?? 'PINHEAD STUDIO';
    const legalName = settings?.legalName ?? 'ООО ПИНХЭД СТУДИО';

    return (
        <>
            <MarkupScript jsonLd={articleJsonLd(post, params.post, base, siteName, legalName) as unknown as Record<string, unknown>} />
            <section className={cx('postPage')}>
                <div className={cx('postPage__head')}>
                    <div className={cx('postPage__head-block', 'postPage__head-block_left')}>
                        <div className="">
                            <p className={cx('postPage__post-info-text')}># 00{post.post_id}</p>
                            <h1 className={cx('postPage__post-title')}>{post.title}</h1>
                            <p className={cx('postPage__post-subtitle')}>{post.subtitle}</p>
                        </div>
                        <div className="">
                            <p className={cx('postPage__post-info-text')}>{'>> '}</p>
                            <p className={cx('postPage__post-info-text')}>{post.createdAt}</p>
                            <p className={cx('postPage__post-info-text')}>Автор: {post.author}</p>
                            <p className={cx('postPage__post-info-text')}>{post.hashtags}</p>
                        </div>
                    </div>
                    <div className={cx('postPage__head-block', 'postPage__head-block_right')}>
                        <div>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={post.cover} alt={`Обложка статьи «${post.title}»`} />
                        </div>
                    </div>
                </div>

                <div className={cx('postPage__main-text-block')} dangerouslySetInnerHTML={post.blog}>
                </div>
            </section>
        </>
    );
};

export default PostPage;
