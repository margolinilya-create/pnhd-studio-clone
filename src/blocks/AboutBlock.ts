import type { Block } from 'payload';

export const AboutBlock: Block = {
  slug: 'about',
  labels: { singular: 'About-блок', plural: 'About-блоки' },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'Создаем мерч с 2015 года',
      label: 'Заголовок (можно выделить год тегом <span>2015</span>)',
    },
    {
      name: 'highlight',
      type: 'text',
      label: 'Выделенный фрагмент заголовка (визуально подсвечивается)',
      defaultValue: '2015',
      admin: {
        description:
          'Если заголовок содержит этот фрагмент — он будет визуально выделен. Если пусто — заголовок целиком.',
      },
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Подзаголовок',
      defaultValue:
        'Мы не просто наносим принты — мы воплощаем ваши идеи. От безумных рисунков до личных фраз, которые будут видны издалека. Создаём стильную одежду для вас, ваших друзей и всей семьи, используя передовые технологии.',
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 6,
      label: 'Карточки преимуществ',
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Заголовок' },
        { name: 'text', type: 'textarea', required: true, label: 'Описание' },
      ],
    },
  ],
};
