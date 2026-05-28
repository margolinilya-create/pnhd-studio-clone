import 'server-only';
import type { Metadata } from 'next';
import { SITE_INFO } from '@/app/constants';

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
 * Использует абсолютные URL в OG, чтобы не зависеть от наследования metadataBase
 * от root layout (надёжнее при превью-деплоях и сторонних краулерах).
 */
export function buildMetadata({
    title,
    description,
    path,
    image,
    type = 'website',
}: BuildMetadataParams): Metadata {
    const absoluteUrl = `${SITE_INFO.domain}${path.startsWith('/') ? path : `/${path}`}`;
    const absoluteImage = image
        ? image.startsWith('http')
            ? image
            : `${SITE_INFO.domain}${image.startsWith('/') ? image : `/${image}`}`
        : undefined;

    return {
        title,
        description,
        metadataBase: new URL(SITE_INFO.domain),
        alternates: {
            canonical: path,
        },
        openGraph: {
            title,
            description,
            url: absoluteUrl,
            siteName: SITE_INFO.name,
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
