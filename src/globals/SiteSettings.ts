import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS,
} from '../lib/payload/shared-config.ts';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings (Глобальные настройки)',
  admin: {
    group: 'Settings',
    description:
      'Контактные данные, лейблы CTA, аналитика и social-ссылки. Видно на каждой странице сайта.',
    livePreview: {
      url: () => buildPreviewUrl('/'),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  access: {
    read: publicReadOrDraftAccess,
    update: hasRole('admin', 'marketing'),
  },
  versions: VERSIONS_WITH_DRAFTS,
  fields: [
    // === Business info ===
    {
      type: 'collapsible',
      label: 'Бизнес-информация',
      fields: [
        { name: 'businessHours', type: 'text', required: true, defaultValue: 'ежедневно, 11:00–20:00', label: 'Часы работы (показано в шапке)' },
        {
          name: 'openingHours',
          type: 'text',
          required: true,
          defaultValue: 'Пн-Пт 11:00-20:00',
          label: 'Часы работы (для JSON-LD, формат "Пн-Пт 11:00-20:00")',
          admin: {
            description: 'Формат для schema.org openingHours. businessHours выше — для display в шапке.',
          },
        },
        { name: 'phone', type: 'text', required: true, defaultValue: '+7 (812) 904 61 56', label: 'Телефон' },
        { name: 'siteName', type: 'text', required: true, defaultValue: 'PINHEAD STUDIO', label: 'Название сайта (OG / meta)' },
        { name: 'legalName', type: 'text', required: true, defaultValue: 'ООО ПИНХЭД СТУДИО', label: 'Юр. название (в подвале)' },
        { name: 'inn', type: 'text', required: true, defaultValue: '7810463916', label: 'ИНН' },
        { name: 'kpp', type: 'text', required: true, defaultValue: '781301001', label: 'КПП' },
        { name: 'copyrightStartYear', type: 'text', required: true, defaultValue: '2021', label: 'Год запуска (для copyright)' },
      ],
    },
    // === Contacts / Geo ===
    {
      type: 'collapsible',
      label: 'Контактные данные',
      fields: [
        {
          type: 'group',
          name: 'contacts',
          label: 'Контакты (для JSON-LD и страницы /contacts)',
          fields: [
            { name: 'email', type: 'text', required: true, defaultValue: 'studio@pnhd.ru', label: 'Email' },
            {
              type: 'group',
              name: 'address',
              label: 'Адрес',
              fields: [
                { name: 'street', type: 'text', required: true, defaultValue: 'ул. Чапыгина, д. 1', label: 'Улица + дом' },
                { name: 'locality', type: 'text', required: true, defaultValue: 'Санкт-Петербург', label: 'Город' },
                { name: 'postalCode', type: 'text', required: true, defaultValue: '197022', label: 'Индекс' },
                { name: 'country', type: 'text', required: true, defaultValue: 'RU', label: 'Страна (ISO-код)' },
              ],
            },
          ],
        },
        {
          type: 'group',
          name: 'geo',
          label: 'Гео-координаты (для LocalBusiness JSON-LD)',
          admin: {
            description: 'Координаты для schema.org GeoCoordinates. Использовать [yandex.maps.ru](https://yandex.ru/maps) → правый клик → "Что здесь?" для получения точки.',
          },
          fields: [
            { name: 'latitude', type: 'number', required: true, defaultValue: 59.972, label: 'Широта (latitude)' },
            { name: 'longitude', type: 'number', required: true, defaultValue: 30.318, label: 'Долгота (longitude)' },
          ],
        },
      ],
    },
    // === CTA / Popup ===
    {
      type: 'collapsible',
      label: 'CTA и popup',
      fields: [
        { name: 'headerCTALabel', type: 'text', required: true, defaultValue: 'Сделать заказ', label: 'Header — текст кнопки' },
        { name: 'mobileCTALabel', type: 'text', required: true, defaultValue: 'проконсультироваться', label: 'Mobile — текст CTA' },
        { name: 'defaultPopupTitle', type: 'text', required: true, defaultValue: 'Воплощай смелые идеи с любым методом нанесения', label: 'Default — заголовок popup-формы' },
      ],
    },
    // === Trust / branding ===
    {
      type: 'collapsible',
      label: 'Footer: trust-сигналы',
      fields: [
        { name: 'madeinRussiaLabel', type: 'text', defaultValue: 'Сделано в России', label: '«Сделано в России» — подпись' },
        { name: 'madeinRussiaEnabled', type: 'checkbox', defaultValue: true, label: 'Показывать блок «Сделано в России»' },
      ],
    },
    // === PDP Trust block ===
    {
      type: 'collapsible',
      label: 'PDP: Trust блок под CTA',
      admin: { description: 'Иконки + текст под кнопкой «В корзину» на карточке товара. До 4 пунктов.' },
      fields: [
        {
          name: 'trustItems',
          type: 'array',
          label: 'Пункты доверия',
          maxRows: 4,
          admin: { initCollapsed: true },
          fields: [
            {
              name: 'icon',
              type: 'select',
              label: 'Иконка',
              required: true,
              options: [
                { label: 'Производство', value: 'factory' },
                { label: 'Возврат', value: 'return' },
                { label: 'Гарантия качества', value: 'quality' },
                { label: 'Доставка', value: 'shipping' },
              ],
            },
            { name: 'text', type: 'text', required: true, label: 'Текст пункта' },
          ],
        },
      ],
    },
    // === External URL ===
    {
      type: 'collapsible',
      label: 'Внешние ссылки',
      fields: [
        { name: 'wholesaleUrl', type: 'text', required: true, defaultValue: 'https://pnhd.ru', label: 'Оптовый отдел — URL' },
      ],
    },
    // === Social links ===
    {
      type: 'group',
      name: 'social',
      label: 'Social links',
      fields: [
        { name: 'telegramUrl', type: 'text', defaultValue: 'https://t.me/pnhd_studio', label: 'Telegram URL' },
        { name: 'telegramLabel', type: 'text', defaultValue: 'Написать в Телеграм', label: 'Telegram — подпись' },
        { name: 'whatsappUrl', type: 'text', defaultValue: 'https://wa.me/79313566552', label: 'WhatsApp URL' },
        { name: 'whatsappLabel', type: 'text', defaultValue: 'Написать в Ватсап', label: 'WhatsApp — подпись' },
        { name: 'maxUrl', type: 'text', defaultValue: '', label: 'MAX URL (пусто = скрыть)' },
        { name: 'maxLabel', type: 'text', defaultValue: 'Написать в MAX', label: 'MAX — подпись' },
      ],
    },
    // === Analytics ===
    {
      type: 'group',
      name: 'analytics',
      label: 'Аналитика и верификация',
      admin: { description: 'IDs сторонних трекеров. Пусто = не подключать.' },
      fields: [
        { name: 'roistatId', type: 'text', defaultValue: '', label: 'Roistat project ID' },
        { name: 'yandexMetricaId', type: 'text', defaultValue: '', label: 'Yandex Metrica counter' },
        { name: 'uiscomKey', type: 'text', defaultValue: '', label: 'uiscom.ru tracking key' },
        { name: 'yandexVerification', type: 'text', defaultValue: '', label: 'Yandex Webmaster verification' },
      ],
    },
    // === SEO ===
    {
      type: 'group',
      name: 'seo',
      label: 'SEO defaults',
      fields: [
        { name: 'defaultOGImage', type: 'upload', relationTo: 'media', required: false, label: 'Default OG image (1200×630px)' },
        { name: 'siteLang', type: 'select', defaultValue: 'ru', options: [{ label: 'Русский (ru)', value: 'ru' }, { label: 'English (en)', value: 'en' }], label: '<html lang="…">' },
      ],
    },
  ],
};
