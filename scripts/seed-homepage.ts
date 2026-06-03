/**
 * Idempotent seed for HomePage Global.
 *
 * Populates `sections` array with all content currently hardcoded in
 * /src/components/pages-components/main-page/* + /src/app/utils/constants.ts.
 *
 * Skips if `sections` already has data.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/seed-homepage.ts
 */
import 'dotenv/config';
import { getPayload } from 'payload';

import config from '../src/payload.config';

// Data extracted from current hardcoded sources, see comments per block.
const SECTIONS = [
  // ─── HERO ──────────────────────────────────────────────────────────────
  // Source: src/components/pages-components/main-page/main-screen/main-screen.tsx
  //   rotatingTitles → lines 27-33 (4 titles)
  //   methodsList    → lines 73-76 (4 methods)
  //   featureBullets → lines 121-128 (4 bullets)
  //   loyalty banner → loyalty-banner.tsx
  {
    blockType: 'hero',
    rotatingTitles: [
      { text: 'Напечатаем даже самый безумный рисунок' },
      { text: 'Напечатаем фразу, которую будет видно издалека' },
      { text: 'Напечатаем для тебя, друзей и всей семьи' },
      { text: 'Напечатаем на стильной одежде' },
    ],
    methodsList: [
      { text: 'шелкография' },
      { text: 'вышивка' },
      { text: 'dtf' },
      { text: 'dtg' },
    ],
    featureBullets: [
      { text: 'Наносим принты от 300Р.' },
      { text: 'Доставляем по всей России СДЭКом' },
      { text: 'Помогаем подобрать метод нанесения' },
      { text: 'Корректируем расположение рисунка с дизайнером бесплатно' },
    ],
    ctaLabel: 'перейти в каталог',
    ctaHref: '/shop',
    showLoyaltyBanner: true,
    loyaltyEyebrow: 'Программа лояльности Pinhead Studio',
    loyaltyTitle: 'Оплачивайте до 50% заказа бонусами',
    loyaltyHref: '/loyalty',
  },

  // ─── CATEGORY GRID ─────────────────────────────────────────────────────
  // Source: catalogLeadScreen.tsx → const config (lines 14-57)
  {
    blockType: 'category-grid',
    sectionTitle: 'Каталог одежды',
    subtitle: 'отражай индивидуальность в мерче',
    items: [
      { title: '> Футболки',  href: '/futbolki',   bgColor: '#F3F4F3', color: 'black', imageSlug: 'tshirt' },
      { title: '> Свитшоты',  href: '/svitshoty',  bgColor: '#393939', color: 'white', imageSlug: 'sweatshirt' },
      { title: '> Толстовки', href: '/longslivy',  bgColor: '#F3F4F3', color: 'black', imageSlug: 'pullover' },
      { title: '> Худи',      href: '/hudi',       bgColor: '#393939', color: 'white', imageSlug: 'hoodie' },
      { title: '> Шопперы',   href: '/shoppery',   bgColor: '#F3F4F3', color: 'black', imageSlug: 'totebag' },
      { title: '> Кепки',     href: '/kepki',      bgColor: '#393939', color: 'white', imageSlug: 'cap' },
    ],
  },

  // ─── METHODS LIST ──────────────────────────────────────────────────────
  // Source: print-methods-screen.tsx — all 5 methods rendered by default.
  // Block is a thin wrapper that drives heading/subheading + which methods to skip.
  {
    blockType: 'methods-list',
    sectionTitle: 'воплощай смелые идеи',
    sectionSubtitle: 'с любым методом нанесения',
    excludedSlugs: '',
  },

  // ─── CTA: SHOP LEAD ────────────────────────────────────────────────────
  // Source: shop-lead-screen.tsx
  {
    blockType: 'cta',
    title: 'открой каталог и закажи одежду с уникальными',
    subtitle: 'принтами',
    ctaLabel: 'перейти в каталог',
    ctaHref: '/shop',
    isExternal: false,
    variant: 'shop',
  },

  // ─── STAGES ────────────────────────────────────────────────────────────
  // Source: stages-screen.tsx (4 cards inline)
  {
    blockType: 'stages',
    sectionTitle: 'почувствуй себя дизайнером и собери мерч за 4 шага',
    ctaHref: '/shop',
    items: [
      {
        title: 'Выбери одежду из каталога',
        text: 'Открой каталог и выбери текстиль нужного фасона, размера и цвета',
        imageSlug: 'stage1',
      },
      {
        title: 'Расположи принт на вещи и узнай стоимость',
        text: 'Прямо на странице товара выбери расположение принта и загрузи свой макет',
        imageSlug: 'stage2',
      },
      {
        title: 'Оформи заказ',
        text: 'Отправь контактные данные, мы позвоним и расскажем, как забрать мерч',
        imageSlug: 'stage3',
      },
      {
        title: 'Дождись, когда сработает магия, и забери мерч',
        text: 'Приди в пункт выдачи после прибытия посылки и порази всех новой вещью',
        imageSlug: 'stage4',
      },
    ],
  },

  // ─── PRICING TABLE ─────────────────────────────────────────────────────
  // Source: constants.ts → prices[] (lines 10-115) + price-block.tsx → getCaption().
  // Note: 4 methods × variable formats; captions encoded per method.
  {
    blockType: 'pricing-table',
    sectionTitle: 'Рассчитайте стоимость уникального мерча',
    sectionSubtitle:
      'Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.',
    mainBlockText: 'Скидки на тиражи от 10 штук уточняй у менеджеров',
    mainBlockCtaLabel: 'Заказать срочную печать',
    mainBlockPopupTitle: 'Срочный тираж — обсудим сроки и стоимость',
    sideInfoText: 'При печати на своей вещи стоимость не увеличивается',
    rows: [
      {
        method: 'DTG',
        caption: 'На белом / цветном',
        cells: [
          { format: 'А6',  price: '400 Р. / 500 Р.' },
          { format: 'А5',  price: '500 Р. / 650 Р.' },
          { format: 'А4',  price: '650 Р. / 800 Р.' },
          { format: 'А3',  price: '800 Р. / 900 Р.' },
          { format: 'А3+', price: '900 Р. / 1100 Р.' },
        ],
      },
      {
        method: 'DTF',
        caption: 'Стоимость',
        cells: [
          { format: 'mini', price: '400 Р.' },
          { format: 'А6',   price: '450 Р.' },
          { format: 'А5',   price: '550 Р.' },
          { format: 'А4',   price: '700 Р.' },
          { format: 'А3',   price: '850 Р.' },
          { format: 'А3+',  price: '1050 Р.' },
        ],
      },
      {
        method: 'ТЕРМОПЕРЕНОС',
        caption: 'Стоимость',
        cells: [
          { format: 'mini', price: '400 Р.' },
          { format: 'А6',   price: '550 Р.' },
          { format: 'А5',   price: '700 Р.' },
          { format: 'А4',   price: '950 Р.' },
          { format: 'А3',   price: '1050 Р.' },
          { format: 'А3+',  price: '1200 Р.' },
        ],
      },
      {
        method: 'ВЫШИВКА',
        caption: 'Стоимость (от 10 штук)',
        cells: [
          { format: 'А6', price: '900 Р.' },
          { format: 'А5', price: '1100 Р.' },
          { format: 'А4', price: '1600 Р.' },
          { format: 'А3', price: '2100 Р.' },
        ],
      },
    ],
  },

  // ─── ABOUT (since 2015) ────────────────────────────────────────────────
  // Source: sinceScreen.tsx
  {
    blockType: 'about',
    title: 'Создаем мерч с 2015 года',
    highlight: '2015',
    subtitle:
      'Мы не просто наносим принты — мы воплощаем ваши идеи. От безумных рисунков до личных фраз, которые будут видны издалека. Создаём стильную одежду для вас, ваших друзей и всей семьи, используя передовые технологии.',
    items: [
      {
        title: 'Ваша фантазия — наш главный ориентир',
        text: 'Напечатаем даже самый смелый и нестандартный рисунок.',
      },
      {
        title: 'Никто не пройдёт мимо',
        text: 'Сделаем вашу фразу или логотип максимально яркими и заметными.',
      },
      {
        title: 'Заботимся о вас',
        text: 'Печатаем только на качественной и комфортной одежде, приятной телу.',
      },
    ],
  },

  // ─── CTA: FORM SCREEN ──────────────────────────────────────────────────
  // Source: FormScreen.tsx
  {
    blockType: 'cta',
    title: 'Рассчитаем стоимость нанесения за 15 минут',
    description:
      'Есть логотип для нанесения? Отправьте заявку и получите готовый расчёт по цене и срокам в телефонном режиме. Мы перезвоним в течение 15 минут.',
    ctaLabel: 'Оставить заявку',
    ctaHref: '#lead-form',
    isExternal: false,
    variant: 'form',
  },

  // ─── TESTIMONIALS ──────────────────────────────────────────────────────
  // Source: constants.ts → feedbackArr (lines 118-154)
  {
    blockType: 'testimonials',
    sectionTitle: 'когда говорят о топовых принтах и заботливом сервисе, говорят о нас',
    ratingValue: '5,0',
    ratingText: 'Оценка на Yandex и Google',
    yandexUrl: 'https://yandex.ru/profile/183887374171',
    googleUrl: 'https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA',
    items: [
      { author: 'наташа п.',    rating: 5, text: 'Делала худи подарок. Качество огонь, клиент доволен :)' },
      { author: 'дарья т.',     rating: 5, text: 'Отличные футболки, особенно порадовал оверсайз (обычно его никто не делает) ну и качество печати!' },
      { author: 'ира м.',       rating: 5, text: 'Стирала толстовку уже раз 10. Печать как новая!' },
      { author: 'саша м.',      rating: 5, text: 'Ребята, спасибо! Очень выручили когда нужно было срочно напечатать! Качество отличное!' },
      { author: 'елизавета к.', rating: 5, text: 'Хорошее место и очень приветливая девушка-администратор. Все показала, рассказала об уходе и красиво запаковала.' },
      { author: 'дарья м.',     rating: 5, text: 'Очень понравился сервис и результат печати. Всё качественно, быстро.' },
      { author: 'соня к.',      rating: 5, text: 'Обалденные ребята. Сделали качественно, недорого. Я считаю, что могли бы даже побольше взять…Однозначно рекомендую' },
    ],
  },

  // ─── FAQ ───────────────────────────────────────────────────────────────
  // Source: constants.ts → faqArr (lines 157-188)
  {
    blockType: 'faq',
    sectionTitle: 'frequently asked questions',
    items: [
      {
        question: 'В какие дни работает студия?',
        answer: 'Ежедневно с 11 до 20 часа. Без выходных',
      },
      {
        question: 'Как к вам проехать?',
        answer:
          'Повернуть с Каменноостровского проспекта на улицу Чапыгина и пройти к следующему крыльцу после Wildberries',
      },
      {
        question: 'Можно ли сделать шелкографию на 1 штуку?',
        answer:
          'Шелкография — тиражный метод печати, делаем её только для заказов от 50 штук. Ближайший аналог — DTF',
      },
      {
        question: 'Есть ли доставка?',
        answer:
          'По СПб можно вызвать к нам курьера любой службы. Укажи номер заказа в комментариях и вызови доставку до двери. По РФ доставляем через СДЭК. Если нужна другая транспортная компания, то её можно вызвать самостоятельно',
      },
      {
        question: 'Можно ли вышить/напечатать логотип известного бренда?',
        answer:
          'Мы можем отказать в печати логотипа бренда, чтобы не нарушать авторские права, либо запросить подтверждение прав',
      },
    ],
  },
];

async function main() {
  const payload = await getPayload({ config });

  const existing = await payload.findGlobal({ slug: 'home-page' });
  if (existing.sections && existing.sections.length > 0) {
    console.log(
      `[seed-homepage] sections has ${existing.sections.length} block(s) — skipping (idempotent).`,
    );
    process.exit(0);
  }

  await payload.updateGlobal({
    slug: 'home-page',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { sections: SECTIONS as any, _status: 'published' as const },
  });

  console.log(
    `[seed-homepage] Seeded ${SECTIONS.length} sections (status=published).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-homepage] Failed:', err);
  process.exit(1);
});
