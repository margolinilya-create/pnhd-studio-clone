import type { MetadataRoute } from 'next';
import { SITE_INFO } from '@/app/constants';
import { getAllProductSlugs } from '@/lib/queries/products';
import { getAllPostSlugs } from '@/lib/queries/blog';

const STATIC_ROUTES: Array<{
    path: string;
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority?: number;
}> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/shop', changeFrequency: 'daily', priority: 0.9 },
    { path: '/blog', changeFrequency: 'daily', priority: 0.7 },
    { path: '/contacts', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/howto', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/loyalty', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/size_chart', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/oferta', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/futbolki', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/hudi', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/svitshoty', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/longslivy', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/kepki', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/shoppery', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/methods', changeFrequency: 'monthly', priority: 0.6 },
    // /prints + /textile удалены из sitemap (audit W-SEO-05): index-страницы
    // пустые, dynamic-страницы /prints/[slug] + /textile/[slug] добавлены ниже
    // через PRINT_SLUGS/TEXTILE_SLUGS.
];

// Локальные TS-данные для /methods/[slug], /prints/[slug], /textile/[slug]
const METHOD_SLUGS = [
    'shelkografiya',
    'pryamaya-dtg-pechat',
    'dtf-pechat',
    'termotransfernaya-pechat',
    'vishivka',
];
const PRINT_SLUGS = ['pechat-printov', 'pechat-logotipov', 'pechat-nadpisej', 'pechat-photo', 'pechat-familii'];
const TEXTILE_SLUGS = [
    'pechat-na-futbolkah',
    'pechat-na-tolstovkah',
    'pechat-na-hudi',
    'pechat-na-svitshotah',
];

function url(path: string): string {
    return `${SITE_INFO.domain}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const productSlugs = await getAllProductSlugs().catch(() => [] as string[]);
    const postSlugs = await getAllPostSlugs().catch(() => [] as string[]);

    const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
        url: url(r.path),
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));

    const productEntries: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
        url: url(`/shop/${slug}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    const postEntries: MetadataRoute.Sitemap = postSlugs.map((slug) => ({
        url: url(`/blog/${slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    const methodEntries: MetadataRoute.Sitemap = METHOD_SLUGS.map((slug) => ({
        url: url(`/methods/${slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
    }));

    const printEntries: MetadataRoute.Sitemap = PRINT_SLUGS.map((slug) => ({
        url: url(`/prints/${slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
    }));

    const textileEntries: MetadataRoute.Sitemap = TEXTILE_SLUGS.map((slug) => ({
        url: url(`/textile/${slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
    }));

    return [
        ...staticEntries,
        ...productEntries,
        ...postEntries,
        ...methodEntries,
        ...printEntries,
        ...textileEntries,
    ];
}
