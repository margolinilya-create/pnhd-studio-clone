// Phase 4: переключено на относительный baseURL — все RTK Query endpoints
// резолвятся в текущем Next.js приложении (Payload REST + custom endpoints).
// CDEK/promocodes endpoints пока не реализованы (вернут 404 — это TODO).
export const apiBaseUrl = '';

export const CDN_URL = 'https://cdn.pnhd.ru';

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


export const feedbackArr = [
    {
        id: 1,
        name: 'наташа п.',
        feedback: 'Делала худи подарок. Качество огонь, клиент доволен :)',
    },
    {
        id: 2,
        name: 'дарья т.',
        feedback: 'Отличные футболки, особенно порадовал оверсайз (обычно его никто не делает) ну и качество печати!',
    },
    {
        id: 3,
        name: 'ира м.',
        feedback: 'Стирала толстовку уже раз 10. Печать как новая!',
    },
    {
        id: 4,
        name: 'саша м.',
        feedback: 'Ребята, спасибо! Очень выручили когда нужно было срочно напечатать! Качество отличное!',
    },
    {
        id: 5,
        name: 'елизавета к.',
        feedback: 'Хорошее место и очень приветливая девушка-администратор. Все показала, рассказала об уходе и красиво запаковала.',
    },
    {
        id: 6,
        name: 'дарья м.',
        feedback: 'Очень понравился сервис и результат печати. Всё качественно, быстро.',
    },
    {
        id: 7,
        name: 'соня к.',
        feedback: 'Обалденные ребята. Сделали качественно, недорого. Я считаю, что могли бы даже побольше взять…Однозначно рекомендую',
    },
]


export const faqArr = [
    {
        title: 'В какие дни работает студия?',
        text: 'Ежедневно с 11 до 20 часа. Без выходных',
    },
    {
        title: 'Как к вам проехать?',
        text: 'Повернуть с Каменноостровского проспекта на улицу Чапыгина и пройти к следующему крыльцу после Wildberries',
    },
    {
        title: 'Можно ли сделать шелкографию на 1 штуку?',
        text: 'Шелкография — тиражный метод печати, делаем её только для заказов от 50 штук. Ближайший аналог — DTF',
    },
    {
        title: 'Есть ли доставка?',
        text: `По СПб можно вызвать к нам курьера
            любой службы. Укажи номер заказа
            в комментариях и вызови доставку
            до двери.
            
            По РФ доставляем через СДЭК.
            Если нужна другая транспортная
            компания, то её можно вызвать самостоятельно`,
    },
    {
        title: 'Можно ли вышить/напечатать логотип известного бренда?',
        text: `Мы можем отказать в печати
        логотипа бренда, чтобы не нарушать
        авторские права, либо запросить
        подтверждение прав`,
    },
]


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