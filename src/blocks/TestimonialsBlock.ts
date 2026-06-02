import type { Block } from 'payload';

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: { singular: 'Отзывы', plural: 'Блоки отзывов' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue: 'когда говорят о топовых принтах и заботливом сервисе, говорят о нас',
      label: 'Заголовок блока',
    },
    {
      name: 'ratingValue',
      type: 'text',
      defaultValue: '5,0',
      label: 'Числовое значение рейтинга',
    },
    {
      name: 'ratingText',
      type: 'text',
      defaultValue: 'Оценка на Yandex и Google',
      label: 'Подпись под рейтингом',
    },
    {
      name: 'yandexUrl',
      type: 'text',
      defaultValue: 'https://yandex.ru/profile/183887374171',
      label: 'Ссылка на Yandex Отзывы',
    },
    {
      name: 'googleUrl',
      type: 'text',
      defaultValue: 'https://maps.app.goo.gl/vhWL7yY1VUQUGZ5SA',
      label: 'Ссылка на Google Отзывы',
    },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 20,
      label: 'Отзывы',
      fields: [
        { name: 'author', type: 'text', required: true, label: 'Имя клиента' },
        { name: 'text', type: 'textarea', required: true, label: 'Текст отзыва' },
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
          defaultValue: 5,
          label: 'Звёзды (1-5)',
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          required: false,
          label: 'Фото клиента (опционально)',
        },
      ],
    },
  ],
};
