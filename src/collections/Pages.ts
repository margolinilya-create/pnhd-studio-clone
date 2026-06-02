import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  PREVIEW_BREAKPOINTS,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS_PER_DOC,
} from '../lib/payload/shared-config.ts';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'pageType', '_status', 'publishedAt'],
    livePreview: {
      url: ({ data }) => {
        const slug = (data as { slug?: string; pageType?: string }).slug ?? '';
        const pageType = (data as { pageType?: string }).pageType ?? 'landing';
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pnhd-studio-clone.vercel.app';
        const path = pageType === 'blog' ? `/blog/${slug}` : `/${slug}`;
        return `${base}${path}?preview=true`;
      },
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  versions: VERSIONS_WITH_DRAFTS_PER_DOC,
  access: {
    read: publicReadOrDraftAccess,
    create: hasRole('admin', 'marketing'),
    update: hasRole('admin', 'marketing'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'pageType',
      type: 'select',
      required: true,
      defaultValue: 'blog',
      options: [
        { label: 'Блог', value: 'blog' },
        { label: 'Лендинг', value: 'landing' },
      ],
    },
    {
      name: 'subtitle',
      type: 'text',
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'text',
      defaultValue: 'PNHD STUDIO',
    },
    {
      name: 'hashtags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Содержимое (Lexical, для новых постов)',
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      label: 'HTML-содержимое (legacy, для миграции из старого блога)',
      admin: {
        description:
          'Сохраняется как есть и рендерится через dangerouslySetInnerHTML. Используется только если body пустой.',
      },
    },
    {
      name: 'likes',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'legacyPostId',
      type: 'number',
      label: 'Legacy post_id (для совместимости с UI)',
      admin: {
        description: 'Заполняется ETL-скриптом. Для новых постов — null.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
    },
    // Structured array fields for specific static pages.
    // admin.condition hides irrelevant fields on pages where slug doesn't match.
    {
      name: 'loyaltyLevels',
      type: 'array',
      label: 'Уровни лояльности (только для slug=loyalty)',
      admin: {
        condition: (data) =>
          (data as { slug?: string } | undefined)?.slug === 'loyalty',
        description: 'Cashback-уровни. Используется только на странице /loyalty.',
      },
      fields: [
        {
          name: 'level',
          type: 'text',
          required: true,
          label: 'Название уровня (например "Уровень 1")',
        },
        {
          name: 'sum',
          type: 'text',
          required: true,
          label: 'Порог трат (текст, например "от 3 000 ₽")',
        },
        {
          name: 'cashback',
          type: 'text',
          required: false,
          label: 'Cashback (текст, например "5%"). Пусто = без кешбэка.',
        },
        {
          name: 'label',
          type: 'text',
          required: false,
          label: 'Бейдж/подпись (например "базовый")',
        },
      ],
    },
    {
      name: 'howtoSteps',
      type: 'array',
      label: 'Шаги (только для slug=howto)',
      admin: {
        condition: (data) =>
          (data as { slug?: string } | undefined)?.slug === 'howto',
        description: 'Sequential steps. Используется только на странице /howto.',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          label: 'Заголовок шага',
        },
        {
          name: 'body',
          type: 'richText',
          required: true,
          editor: lexicalEditor({}),
          label: 'Описание шага',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: false,
          label: 'Картинка к шагу (опционально)',
        },
      ],
    },
    {
      name: 'sizeChartItems',
      type: 'array',
      label: 'Размеры (только для slug=size_chart)',
      admin: {
        condition: (data) =>
          (data as { slug?: string } | undefined)?.slug === 'size_chart',
        description:
          'Размерные таблицы для типов одежды. Используется только на странице /size_chart.',
      },
      fields: [
        {
          name: 'type',
          type: 'text',
          required: true,
          label: 'Тип одежды (например "Футболки CLASSIC")',
        },
        {
          name: 'label',
          type: 'text',
          required: false,
          label: 'Подпись (например "мужские размеры")',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: false,
          label: 'Картинка размерной таблицы',
        },
      ],
    },
  ],
};
