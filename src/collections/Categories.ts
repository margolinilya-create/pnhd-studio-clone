import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS_PER_DOC,
} from '../lib/payload/shared-config.ts';

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'isLanding', '_status'],
    livePreview: {
      url: ({ data }) => {
        const slug = (data as { slug?: string }).slug ?? '';
        return buildPreviewUrl(`/${slug}`);
      },
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  versions: VERSIONS_WITH_DRAFTS_PER_DOC,
  access: {
    read: publicReadOrDraftAccess,
    create: hasRole('admin', 'brand_manager', 'marketing'),
    update: hasRole('admin', 'brand_manager', 'marketing'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'name',
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
      name: 'h1',
      type: 'text',
      required: false,
      label: 'H1 (заголовок страницы)',
      admin: {
        description:
          'Используется на /<slug> landing page. Пусто = страница не используется как landing.',
      },
    },
    {
      name: 'metaTitle',
      type: 'text',
      required: false,
      label: 'Meta title (SEO)',
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      required: false,
      label: 'Meta description (SEO)',
    },
    {
      name: 'productType',
      type: 'text',
      required: false,
      label: 'Тип товаров для фильтрации (например "tshirt", "hoodie")',
      admin: {
        description: 'Используется для фильтрации в ProductCardsBlock',
      },
    },
    {
      name: 'faqSet',
      type: 'array',
      label: 'FAQ',
      minRows: 0,
      maxRows: 10,
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Вопрос' },
        { name: 'text', type: 'textarea', required: true, label: 'Ответ' },
      ],
    },
    {
      name: 'bodyContent',
      type: 'richText',
      required: false,
      editor: lexicalEditor({}),
      label: 'Body content (SEO-копи: H2 / списки / параграфы)',
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Hero image (опционально)',
    },
    {
      name: 'isLanding',
      type: 'checkbox',
      defaultValue: false,
      label: 'Используется как landing page',
      admin: {
        description:
          'Если включено — рендерится на /<slug>. Иначе категория только для tagging.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
    },
  ],
};
