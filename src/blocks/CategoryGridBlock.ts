import type { Block } from 'payload';

export const CategoryGridBlock: Block = {
  slug: 'category-grid',
  labels: { singular: 'Сетка категорий', plural: 'Сетки категорий' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue: 'Каталог одежды',
      label: 'Заголовок',
    },
    {
      name: 'subtitle',
      type: 'text',
      defaultValue: 'отражай индивидуальность в мерче',
      label: 'Подзаголовок',
    },
    {
      name: 'items',
      type: 'array',
      label: 'Карточки категорий',
      minRows: 1,
      maxRows: 12,
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Текст (например "> Футболки")' },
        { name: 'href', type: 'text', required: true, label: 'URL категории (например /futbolki)' },
        {
          name: 'bgColor',
          type: 'text',
          required: true,
          defaultValue: '#F3F4F3',
          label: 'Фон карточки (HEX)',
        },
        {
          name: 'color',
          type: 'select',
          required: true,
          defaultValue: 'black',
          options: [
            { label: 'Чёрный текст', value: 'black' },
            { label: 'Белый текст', value: 'white' },
          ],
          label: 'Цвет текста',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: false,
          label: 'Картинка категории (опционально, иначе используется default из ассетов)',
        },
        {
          name: 'imageSlug',
          type: 'select',
          required: false,
          options: [
            { label: 'Футболка (tshirt)', value: 'tshirt' },
            { label: 'Свитшот (sweatshirt)', value: 'sweatshirt' },
            { label: 'Худи (hoodie)', value: 'hoodie' },
            { label: 'Толстовка (pullover)', value: 'pullover' },
            { label: 'Шоппер (totebag)', value: 'totebag' },
            { label: 'Кепка (cap)', value: 'cap' },
          ],
          label: 'Иконка из набора assets (если не загружено своё фото)',
        },
      ],
    },
  ],
};
