import type { Block } from 'payload';

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Hero-блоки' },
  fields: [
    {
      name: 'rotatingTitles',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      label: 'Ротирующиеся заголовки (большие фразы слева сверху)',
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'methodsList',
      type: 'array',
      label: 'Список методов (шелкография, вышивка, DTF, DTG, …)',
      minRows: 0,
      maxRows: 8,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'featureBullets',
      type: 'array',
      label: 'Feature-буллеты (> Наносим принты от 300Р, …)',
      minRows: 0,
      maxRows: 6,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'CTA — текст ссылки на каталог',
      defaultValue: 'перейти в каталог',
    },
    {
      name: 'ctaHref',
      type: 'text',
      label: 'CTA — URL (по умолчанию /shop)',
      defaultValue: '/shop',
    },
    {
      name: 'showLoyaltyBanner',
      type: 'checkbox',
      defaultValue: true,
      label: 'Показывать баннер программы лояльности под hero',
    },
    {
      name: 'loyaltyEyebrow',
      type: 'text',
      defaultValue: 'Программа лояльности Pinhead Studio',
      label: 'Loyalty: подзаголовок',
    },
    {
      name: 'loyaltyTitle',
      type: 'text',
      defaultValue: 'Оплачивайте до 50% заказа бонусами',
      label: 'Loyalty: заголовок',
    },
    {
      name: 'loyaltyHref',
      type: 'text',
      defaultValue: '/loyalty',
      label: 'Loyalty: URL',
    },
  ],
};
