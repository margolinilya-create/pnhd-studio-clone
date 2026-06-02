import { withSentryConfig } from '@sentry/nextjs';
import { withPayload } from '@payloadcms/next/withPayload';

// audit Sec-warning: убран `unsafe-eval` из script-src. Yandex Metrica
// исторически просила его — современная версия (v.r) больше не использует
// eval. Если внезапно появятся report'ы — добавим `'wasm-unsafe-eval'`
// специально для нужного источника.
//
// Также убран Report-Only режим — теперь enforce. Один лишний listing в CI
// если найдётся новое нарушение, но лучше fail-fast чем silent leak.
const CSP_ENFORCE = [
    "default-src 'self'",
    // api-maps.yandex.ru — Yandex Maps SDK loader; yastatic.net — static bundles
    "script-src 'self' 'unsafe-inline' https://cloud.roistat.com https://mc.yandex.ru https://app.uiscom.ru https://*.uiscom.ru https://browser.sentry-cdn.com https://*.sentry.io https://api-maps.yandex.ru https://yastatic.net",
    "style-src 'self' 'unsafe-inline' https://yastatic.net",
    // *.maps.yandex.net — map tiles; yastatic.net — sprites/icons
    "img-src 'self' data: blob: https://*.supabase.co https://mc.yandex.ru https://placehold.co https://yastatic.net https://*.maps.yandex.net https://*.yandex.ru https://*.yandex.net",
    "font-src 'self' data: https://yastatic.net",
    // *.maps.yandex.net — geocoder/router API calls
    "connect-src 'self' https://*.supabase.co https://mc.yandex.ru https://cloud.roistat.com https://*.uiscom.ru https://*.sentry.io https://*.ingest.sentry.io https://api-maps.yandex.ru https://*.maps.yandex.net https://yastatic.net https://*.yandex.ru https://*.yandex.net",
    "frame-src 'self' https://www.youtube.com https://yandex.ru https://*.yandex.ru",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['mui-tel-input'],
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
                    // audit Sec — HSTS + preload (после cutover'а на свой домен можно добавить preload).
                    // 1 год = 31536000. includeSubDomains покрывает potential vercel subdomain'ы.
                    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
                    // audit Sec — CSP теперь enforce (был Report-Only). Без unsafe-eval.
                    { key: 'Content-Security-Policy', value: CSP_ENFORCE },
                ],
            },
            {
                // audit W-SEO-03 — Payload admin не должен попадать в индекс
                // (robots.ts уже Disallow'ит, но не-кооперативные боты могут
                // игнорировать robots.txt; X-Robots-Tag нужен defence-in-depth).
                // Также покрывает /admin/* и любые API-роуты Payload.
                source: '/admin/:path*',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
            {
                source: '/admin',
                headers: [
                    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
                ],
            },
        ];
    },
    async redirects() {
        return [
            // ─── Legacy «one-word URL» категории (старый pnhd.ru) → новые маршруты ───
            { source: '/pechat-na-futbolkah', destination: '/futbolki', permanent: true },
            { source: '/pechat-na-hudi', destination: '/hudi', permanent: true },
            { source: '/pechat-na-tolstovkah', destination: '/hudi', permanent: true },
            { source: '/pechat-na-svitshotah', destination: '/svitshoty', permanent: true },
            { source: '/pechat-na-kepkah', destination: '/kepki', permanent: true },
            { source: '/pechat-na-shopperah', destination: '/shoppery', permanent: true },

            // Принты → новые /prints/[slug]
            { source: '/pechat-printov', destination: '/prints/pechat-printov', permanent: true },
            { source: '/pechat-logotipa', destination: '/prints/pechat-logotipov', permanent: true },
            { source: '/pechat-nadpisej', destination: '/prints/pechat-nadpisej', permanent: true },
            { source: '/pechat-photo', destination: '/prints/pechat-photo', permanent: true },
            { source: '/pechat-familii', destination: '/prints/pechat-familii', permanent: true },

            // Методы печати → /methods/[slug]
            { source: '/shelkografiya', destination: '/methods/shelkografiya', permanent: true },
            { source: '/vishivka', destination: '/methods/vishivka', permanent: true },
            { source: '/dtf-pechat', destination: '/methods/dtf-pechat', permanent: true },
            { source: '/termotransfernaya-pechat', destination: '/methods/termotransfernaya-pechat', permanent: true },
            { source: '/pryamaya-dtg-pechat', destination: '/methods/pryamaya-dtg-pechat', permanent: true },

            // ─── Удалённый конструктор → product page ───
            { source: '/shop/:slug/constructor', destination: '/shop/:slug', permanent: true },
            { source: '/constructor/:rest*', destination: '/shop', permanent: true },

            // ─── Старые универсальные ───
            { source: '/store', destination: '/shop', permanent: true },
            { source: '/faq', destination: '/howto', permanent: true },
            { source: '/rules', destination: '/oferta', permanent: true },

            // ─── Tilda-артефакты ───
            { source: '/kak-stirat-futbolki-s-printom', destination: '/blog', permanent: true },
            { source: '/page23123483.html', destination: '/', permanent: true },
            { source: '/shop%20%D0%BE%D1%82%D0%B7%D1%8B%D0%B2%D1%8B', destination: '/shop', permanent: true },
            { source: '/tproduct/1-352755267661-klassicheskii-hudi-kakao', destination: '/shop?type=hoodie', permanent: true },
            { source: '/tproduct/1-974652062611-klassicheskii-hudi-chernii', destination: '/hudi', permanent: true },

            // ─── Прочее, что лучше схлопнуть в '/' ───
            { source: '/.well-known/apple-app-site-association', destination: '/', permanent: true },
            { source: '/zagitova', destination: '/', permanent: true },
            { source: '/game', destination: '/', permanent: true },
            { source: '/test', destination: '/', permanent: true },
            { source: '/undefined', destination: '/', permanent: true },
        ];
    },
    images: {
        remotePatterns: [
            // Supabase Storage public objects — основной источник product photos
            // (после 2026-06-01 wired в Payload Media + связаны с products).
            {
                protocol: 'https',
                hostname: 'almfjmiygtnzngkayhdv.supabase.co',
                pathname: '/storage/v1/object/public/**',
            },
            // Placeholder-картинки в сид-данных
            {
                protocol: 'https',
                hostname: 'placehold.co',
                pathname: '/**',
            },
        ],
    },
};

// Sentry-обёртка: активна только когда задан NEXT_PUBLIC_SENTRY_DSN/SENTRY_DSN
// (внутри instrumentation.ts / instrumentation-client.ts init выполняется условно).
// Без DSN — no-op. Source-maps загружаются только если задан SENTRY_AUTH_TOKEN.
export default withPayload(
    withSentryConfig(nextConfig, {
        silent: !process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        widenClientFileUpload: false,
    }),
    { devBundleServerPackages: false },
);
