import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import { publicReadOrDraftAccess } from '../lib/payload/shared-config.ts';

export const PrintTypeItems: CollectionConfig = {
  slug: 'print-type-items',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'parentSlug', 'slug', 'typeSlug'],
    description:
      'Подстраницы методов печати (/methods/[slug]/[type]). Например: "Шелкография — Печать логотипа".',
  },
  access: {
    read: publicReadOrDraftAccess,
    create: hasRole('admin', 'marketing'),
    update: hasRole('admin', 'marketing'),
    delete: hasRole('admin', 'marketing'),
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Slug (уникальный ID)',
      admin: {
        description:
          'Уникальный ключ. Для одной записи — комбинация parentSlug+typeSlug. Используйте формат "parentSlug__typeSlug", например: "shelkografiya__pechat-logotipa-shelkografiej".',
      },
    },
    {
      name: 'parentSlug',
      type: 'text',
      required: true,
      label: 'Slug родительского метода',
      admin: {
        description:
          'Например: screenprinting, heat_transfer, DTF, DTG. Используется для группировки.',
      },
    },
    {
      name: 'typeSlug',
      type: 'text',
      required: true,
      label: 'Type slug (сегмент URL)',
      admin: {
        description:
          'Второй сегмент URL /methods/[slug]/[type]. Например: pechat-logotipa-shelkografiej.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок (название метода)',
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Подзаголовок (тип задачи)',
    },
    {
      name: 'mainText',
      type: 'textarea',
      label: 'Основной текст (КРАТКО)',
    },
    {
      name: 'pros',
      type: 'textarea',
      label: 'Плюсы (через запятую)',
      admin: {
        description: 'Каждый пункт через запятую. Например: "> Долговечно,> Низкая стоимость".',
      },
    },
    {
      name: 'cons',
      type: 'textarea',
      label: 'Минусы (через запятую)',
      admin: {
        description: 'Каждый пункт через запятую.',
      },
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      label: 'HTML контент страницы (robots text)',
      admin: {
        description:
          'Рендерится через dangerouslySetInnerHTML. Используется для SEO-контента внизу страницы.',
      },
    },
    {
      name: 'coverPath',
      type: 'text',
      label: 'Обложка — путь к /public файлу',
      admin: {
        description: 'Пример: /printingMethods/silk/main.webp',
      },
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Галерея',
      fields: [
        {
          name: 'path',
          type: 'text',
          label: 'Путь к /public файлу',
          admin: {
            description: 'Пример: /printingMethods/silk/1.webp',
          },
        },
      ],
    },
    {
      name: 'metaTitle',
      type: 'text',
      label: 'Meta Title',
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      label: 'Meta Description',
    },
    {
      name: 'metaKeywords',
      type: 'text',
      label: 'Meta Keywords',
    },
  ],
};
