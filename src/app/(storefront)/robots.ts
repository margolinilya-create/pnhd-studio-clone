import type { MetadataRoute } from 'next';
import { resolveDomain } from '@/lib/site/domain';

export default function robots(): MetadataRoute.Robots {
    const domain = resolveDomain();
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
        sitemap: `${domain}/sitemap.xml`,
        host: domain,
    };
}
