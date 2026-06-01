// Закрывает audit W-SEO-01 — раньше домен был зашит как 'studio.pnhd.ru'
// (домен оригинального сайта), все canonical/og:url/JSON-LD `url` указывали на
// чужой сайт → текущий Vercel-deployment effectively не индексируется поисковиками.
//
// Источник правды:
// 1. NEXT_PUBLIC_SITE_URL — явный env var (Vercel должен его выставить на cutover)
// 2. NEXT_PUBLIC_VERCEL_URL — авто-Vercel domain без protocol (fallback для preview)
// 3. 'https://studio.pnhd.ru' — final fallback на момент cutover'а
const resolveDomain = (): string => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    return 'https://studio.pnhd.ru';
};

export const SITE_INFO = {
    domain: resolveDomain(),
    name: 'PINHEAD STUDIO',
    legal_name: 'ООО ПИНХЭД СТУДИО',
}
export const CONTACTS = {
    phone: {
        formatted: '+7 (812) 904 61 56',
        raw: '+78129046156'
    },
    email: "studio@pnhd.ru",
    address: {
        street: "ул. Чапыгина, д. 1",
        locality: "Санкт-Петербург",
        postal_code: "197022",
    },
    inn: 7810463916,
    kpp: 781301001
}