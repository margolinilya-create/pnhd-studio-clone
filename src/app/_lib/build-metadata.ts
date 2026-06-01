import 'server-only';
import type { Metadata } from 'next';

import { resolveDomain } from '@/lib/site/domain';
import { getSiteSettings } from '@/lib/queries/site-settings';

export interface BuildMetadataParams {
    title: string;
    description: string;
    path: string;
    image?: string;
    /**
     * Семантический тип страницы. Для OpenGraph 'product' даунгрейдится в 'website'
     * (OG не имеет 'product' в whitelist'е), schema.org Product → JSON-LD отдельно.
     */
    type?: 'website' | 'article' | 'product';
}

/**
 * Унифицированный билдер Next-metadata: canonical + OpenGraph + Twitter card.
 *
 * Async — читает siteName из Payload SiteSettings global, domain — из env через
 * resolveDomain(). Используется только через generateMetadata() (sync-форма
 * `export const metadata` несовместима с async builder).
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return await buildMetadata({ title: '...', description: '...', path: '/...' });
 *   }
 */
export async function buildMetadata({
    title,
    description,
    path,
    image,
    type = 'website',
}: BuildMetadataParams): Promise<Metadata> {
    const settings = await getSiteSettings();
    const domain = resolveDomain();
    const siteName = settings?.siteName ?? 'PINHEAD STUDIO';

    const absoluteUrl = `${domain}${path.startsWith('/') ? path : `/${path}`}`;
    const absoluteImage = image
        ? image.startsWith('http')
            ? image
            : `${domain}${image.startsWith('/') ? image : `/${image}`}`
        : undefined;

    return {
        title,
        description,
        metadataBase: new URL(domain),
        alternates: {
            canonical: path,
        },
        openGraph: {
            title,
            description,
            url: absoluteUrl,
            siteName,
            type: type === 'article' ? 'article' : 'website',
            locale: 'ru_RU',
            images: absoluteImage
                ? [{ url: absoluteImage, width: 1200, height: 630, alt: title }]
                : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: absoluteImage ? [absoluteImage] : undefined,
        },
    };
}
