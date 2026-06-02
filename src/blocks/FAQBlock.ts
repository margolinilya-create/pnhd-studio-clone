import type { Block } from 'payload';

export const FAQBlock: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQ-блоки' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue: 'frequently asked questions',
      label: 'Заголовок секции',
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 20,
      label: 'Вопросы и ответы',
      fields: [
        { name: 'question', type: 'text', required: true, label: 'Вопрос' },
        { name: 'answer', type: 'textarea', required: true, label: 'Ответ' },
      ],
    },
  ],
};
