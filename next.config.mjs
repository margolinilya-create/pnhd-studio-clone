import { withSentryConfig } from '@sentry/nextjs';
import { withPayload } from '@payloadcms/next/withPayload';

// Content-Security-Policy в Report-Only режиме (PR #6).
// Через 1-2 недели после наблюдения за report'ами — переключить в enforce.
const CSP_REPORT_ONLY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cloud.roistat.com https://mc.yandex.ru https://app.uiscom.ru https://*.uiscom.ru https://browser.sentry-cdn.com https://*.sentry.io",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://cdn.pnhd.ru https://*.supabase.co https://mc.yandex.ru https://placehold.co https://yastatic.net",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://mc.yandex.ru https://cloud.roistat.com https://*.uiscom.ru https://*.sentry.io https://*.ingest.sentry.io",
    "frame-src 'self' https://www.youtube.com https://yandex.ru https://*.yandex.ru",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
                    { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
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
            {
                protocol: 'https',
                hostname: 'cdn.pnhd.ru',
                pathname: '/**',
            },
            // Supabase Storage public objects
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
            // (pnhdstudioapi.ru удалён из whitelist в PR #6 — host мёртв 502 + не используется)
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
