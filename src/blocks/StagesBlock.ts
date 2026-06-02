import type { Block } from 'payload';

export const StagesBlock: Block = {
  slug: 'stages',
  labels: { singular: 'Этапы работы', plural: 'Блоки этапов' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue:
        'почувствуй себя дизайнером и собери мерч в онлайн-конструкторе',
      label: 'Заголовок секции',
    },
    {
      name: 'ctaHref',
      type: 'text',
      defaultValue: '/shop',
      label: 'URL CTA-стрелки',
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 8,
      label: 'Шаги (карточки)',
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Заголовок шага' },
        { name: 'text', type: 'textarea', required: true, label: 'Описание' },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: false,
          label: 'Фото шага (опционально)',
        },
        {
          name: 'imageSlug',
          type: 'select',
          required: false,
          options: [
            { label: 'Stage 1 (default)', value: 'stage1' },
            { label: 'Stage 2 (default)', value: 'stage2' },
            { label: 'Stage 3 (default)', value: 'stage3' },
            { label: 'Stage 4 (default)', value: 'stage4' },
          ],
          label: 'Иконка из default-набора',
        },
      ],
    },
  ],
};
