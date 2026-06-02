import type { Block } from 'payload';

export const PricingTableBlock: Block = {
  slug: 'pricing-table',
  labels: { singular: 'Таблица цен', plural: 'Таблицы цен' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue: 'Рассчитайте стоимость уникального мерча',
      label: 'Заголовок секции',
    },
    {
      name: 'sectionSubtitle',
      type: 'textarea',
      defaultValue:
        'Делаем яркие принты на любом текстиле: от скромного логотипа до сложных полноцветных изображений на всей поверхности вещи.',
      label: 'Подзаголовок',
    },
    {
      name: 'mainBlockText',
      type: 'textarea',
      defaultValue: 'Скидки на тиражи от 10 штук уточняй у менеджеров',
      label: 'Текст в зелёной плашке слева',
    },
    {
      name: 'mainBlockCtaLabel',
      type: 'text',
      defaultValue: 'Заказать срочную печать',
      label: 'CTA — текст',
    },
    {
      name: 'mainBlockPopupTitle',
      type: 'text',
      defaultValue: 'Срочный тираж — обсудим сроки и стоимость',
      label: 'Заголовок popup при клике на CTA',
    },
    {
      name: 'sideInfoText',
      type: 'textarea',
      defaultValue: 'При печати на своей вещи стоимость не увеличивается',
      label: 'Текст в боковой плашке',
    },
    {
      name: 'rows',
      type: 'array',
      label: 'Строки таблицы (метод × форматы)',
      minRows: 1,
      maxRows: 12,
      fields: [
        {
          name: 'method',
          type: 'text',
          required: true,
          label: 'Метод (DTG / DTF / ТЕРМОПЕРЕНОС / ВЫШИВКА)',
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Подпись столбца «Стоимость» (например "На белом / цветном")',
          admin: {
            description:
              'Если пусто — рендерим "Стоимость". Для DTG обычно "На белом / цветном", для ВЫШИВКА — "Стоимость (от 10 штук)".',
          },
        },
        {
          name: 'cells',
          type: 'array',
          label: 'Ячейки (формат → цена)',
          minRows: 1,
          maxRows: 10,
          fields: [
            { name: 'format', type: 'text', required: true, label: 'Формат (mini/А6/А5/А4/А3/А3+)' },
            { name: 'price', type: 'text', required: true, label: 'Цена (например "650 Р.")' },
          ],
        },
      ],
    },
  ],
};
