import type { Block } from 'payload';

export const MethodsListBlock: Block = {
  slug: 'methods-list',
  labels: { singular: 'Методы нанесения', plural: 'Блоки методов' },
  fields: [
    {
      name: 'sectionTitle',
      type: 'text',
      defaultValue: 'воплощай смелые идеи',
      label: 'Заголовок (основная строка)',
    },
    {
      name: 'sectionSubtitle',
      type: 'text',
      defaultValue: 'с любым методом нанесения',
      label: 'Подзаголовок',
    },
    {
      name: 'excludedSlugs',
      type: 'text',
      label: 'Скрыть методы (CSV slugов: shelkografiya,termotransfernaya-pechat,…)',
      admin: {
        description:
          'Если оставлено пустым — рендерятся все 5 методов. Например "shelkografiya" чтобы скрыть шелкографию.',
      },
    },
  ],
};
