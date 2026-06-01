import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

const previewUrl = () => {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pnhd-studio-clone.vercel.app';
  const secret = process.env.PREVIEW_SECRET ?? '';
  return `${base}/api/preview?secret=${secret}&path=/`;
};

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings (Глобальные настройки)',
  admin: {
    group: 'Settings',
    description:
      'Контактные данные, лейблы CTA, аналитика и social-ссылки. Видно на каждой странице сайта.',
    livePreview: {
      url: previewUrl,
      breakpoints: [
        { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
        { name: 'tablet', label: 'Tablet', width: 768, height: 1024 },
        { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
      ],
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return { _status: { equals: 'published' } };
    },
    update: hasRole('admin', 'marketing'),
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
      schedulePublish: true,
    },
    max: 20,
  },
  fields: [
    // === Business info ===
    {
      type: 'collapsible',
      label: 'Бизнес-информация',
      fields: [
        { name: 'businessHours', type: 'text', required: true, defaultValue: 'ежедневно, 11:00–20:00', label: 'Часы работы (показано в шапке)' },
        { name: 'phone', type: 'text', required: true, defaultValue: '+7 (812) 904 61 56', label: 'Телефон' },
        { name: 'siteName', type: 'text', required: true, defaultValue: 'PINHEAD STUDIO', label: 'Название сайта (OG / meta)' },
        { name: 'legalName', type: 'text', required: true, defaultValue: 'ООО ПИНХЭД СТУДИО', label: 'Юр. название (в подвале)' },
        { name: 'inn', type: 'text', required: true, defaultValue: '7810463916', label: 'ИНН' },
        { name: 'kpp', type: 'text', required: true, defaultValue: '781301001', label: 'КПП' },
        { name: 'copyrightStartYear', type: 'text', required: true, defaultValue: '2021', label: 'Год запуска (для copyright)' },
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
