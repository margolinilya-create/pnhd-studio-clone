import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import { publicReadOrDraftAccess } from '../lib/payload/shared-config.ts';

export const PrintsPages: CollectionConfig = {
  slug: 'prints-pages',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
    defaultColumns: ['title', 'slug'],
    description: 'Страницы типов принтов (/prints/[slug]). Например: "Печать логотипов".',
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
      label: 'Slug (URL сегмент)',
      admin: {
        description: 'Например: pechat-logotipov, pechat-printov.',
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Заголовок',
    },
    {
      name: 'subtitle',
      type: 'text',
      label: 'Подзаголовок',
    },
    {
      name: 'mainText',
      type: 'textarea',
      label: 'Основной текст (КРАТКО)',
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
