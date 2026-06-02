import type { Block } from 'payload';

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: 'CTA-блок', plural: 'CTA-блоки' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Подзаголовок (eyebrow)' },
    { name: 'title', type: 'text', required: true, label: 'Заголовок' },
    { name: 'subtitle', type: 'text', label: 'Доп. строка под заголовком (опц.)' },
    { name: 'description', type: 'textarea', label: 'Описание' },
    { name: 'ctaLabel', type: 'text', required: true, label: 'Текст кнопки' },
    { name: 'ctaHref', type: 'text', required: true, label: 'URL' },
    {
      name: 'isExternal',
      type: 'checkbox',
      defaultValue: false,
      label: 'Открывать в новой вкладке',
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'shop',
      label: 'Визуальный variant',
      options: [
        { label: 'Shop Lead (зелёная плашка с изображением)', value: 'shop' },
        { label: 'Form Screen (лидоформа справа от картинки)', value: 'form' },
        { label: 'Generic (общий CTA)', value: 'generic' },
      ],
    },
  ],
};
