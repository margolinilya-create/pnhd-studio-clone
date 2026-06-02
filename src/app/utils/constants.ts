// Phase 4: переключено на относительный baseURL — все RTK Query endpoints
// резолвятся в текущем Next.js приложении (Payload REST + custom endpoints).
// CDEK/promocodes endpoints пока не реализованы (вернут 404 — это TODO).
export const apiBaseUrl = '';

export const ACQUIRE_RATIO = 0.965; //комиссия эквайринга

export const tumblers = [ 'DTG', 'DTF', 'ТЕРМОПЕРЕНОС', 'ВЫШИВКА' ];

export const prices = [
    {
        name: 'DTG',
        prices: [
            {
                format: 'А6',
                price: '400 Р. / 500 Р.'
            },
            {
                format: 'А5',
                price: '500 Р. / 650 Р.'
            },
            {
                format: 'А4',
                price: '650 Р. / 800 Р.'
            },
            {
                format: 'А3',
                price: '800 Р. / 900 Р.'
            },
            {
                format: 'А3+',
                price: '900 Р. / 1100 Р.'
            },
        ]
    },
    {
        name: 'DTF',
        prices: [
            {
                format: 'mini',
                price: '400 Р.'
            },
            {
                format: 'А6',
                price: '450 Р.'
            },
            {
                format: 'А5',
                price: '550 Р.'
            },
            {
                format: 'А4',
                price: '700 Р.'
            },
            {
                format: 'А3',
                price: '850 Р.'
            },
            {
                format: 'А3+',
                price: '1050 Р.'
            },
        ]
    },
    {
        name: 'ТЕРМОПЕРЕНОС',
        prices: [
            {
                format: 'mini',
                price: '400 Р.'
            },
            {
                format: 'А6',
                price: '550 Р.'
            },
            {
                format: 'А5',
                price: '700 Р.'
            },
            {
                format: 'А4',
                price: '950 Р.'
            },
            {
                format: 'А3',
                price: '1050 Р.'
            },
            {
                format: 'А3+',
                price: '1200 Р.'
            },
        ]
    },
    {
        name: 'ВЫШИВКА',
        prices: [
            {
                format: 'А6',
                price: '900 Р.'
            },
            {
                format: 'А5',
                price: '1100 Р.'
            },
            {
                format: 'А4',
                price: '1600 Р.'
            },
            {
                format: 'А3',
                price: '2100 Р.'
            },
        ]
    },
]


// feedbackArr → migrated to Payload HomePage Global (testimonials block) on 2026-06-02.
//   See scripts/seed-homepage.ts for the seed values.
// faqArr      → migrated to Payload HomePage Global (faq block) on 2026-06-02.
//   Both sections are now rendered via Payload data with fallback defaults
//   embedded in the screen components themselves.


export function getCookie(cookie: string) {
    return cookie.split('; ').reduce((acc, item) => {
      const [name, value] = item.split('=')
      //@ts-ignore
      acc[name] = value
      return acc
    }, {})
}


export const urlQueryStringToObject = (searchParams: string) => {
    let obj = {};
    if (searchParams.includes('#')) {
        searchParams = searchParams.substring(0, searchParams.indexOf('#'));
    }
    const paramsArr = searchParams.split('&');
    paramsArr.forEach((param) => {
        const keyValueArr = param.split('=')
        if (keyValueArr[0].includes('utm') ||
            keyValueArr[0].includes('rs') ||
            keyValueArr[0].includes('roistat')
        ) {
            obj = {
                ...obj,
                [keyValueArr[0]]: keyValueArr[1]
            }
        }
    })
    return obj;
}

export const getCurrentUrl = (pathname: string, searchParams?: URLSearchParams) => {
    const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
    return `${pathname}${search}`;
}


/*
{
  "post_id": 001,
  "title": "TEST POST",
  "subtitle": "Test subtitle",
  "slug": "test-slug",
  "createdAt": "27.07.2024",
  "cover": "https://pnhdstudioapi.ru/images/classic_tee/white_main.jpg",
  "likes": 300,
  "hashtags": ["#test1","test2","test3"],
  "author": "Mike Starina",
  "blog": {"__html": ""}
}
*/