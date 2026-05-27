import type { MetadataRoute } from 'next';
import { SITE_INFO } from '@/app/constants';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/api/',
                    '/_next/',
                    '/cart',
                    '/checkout',
                    '/thanks',
                    '/*?id=',
                    '/*?utm_',
                ],
            },
        ],
        sitemap: `${SITE_INFO.domain}/sitemap.xml`,
        host: SITE_INFO.domain,
    };
}
