import { resolveDomain } from '@/lib/site/domain';

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
