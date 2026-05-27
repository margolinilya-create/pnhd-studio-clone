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
            {
                protocol: 'https',
                hostname: 'pnhdstudioapi.ru',
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
        ],
    },
};

export default nextConfig;