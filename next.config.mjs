/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['mui-tel-input'],
    webpack: (config) => {
        config.externals = [...config.externals, { canvas: 'canvas' }]; // required to make Konva & react-konva work
        return config;
    },
    async redirects() {
        return [
            {
                source: '/kak-stirat-futbolki-s-printom',
                destination: '/blog',
                permanent: true, // 308 redirect
            },
            {source: '/page23123483.html', destination: '/', permanent: true},
            {source: '/.well-known/apple-app-site-association', destination: '/', permanent: true},
            {source: '/shop%20%D0%BE%D1%82%D0%B7%D1%8B%D0%B2%D1%8B', destination: '/shop', permanent: true},
            {source: '/tproduct/1-352755267661-klassicheskii-hudi-kakao', destination: '/shop?type=hoodie', permanent: true},
            {source: '/.well-known/apple-app-site-association', destination: '/', permanent: true},
        ]
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
                hostname: '*.supabase.co',
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