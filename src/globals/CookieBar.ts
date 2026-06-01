import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS_SIMPLE,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS,
} from '../lib/payload/shared-config.ts';

export const CookieBar: GlobalConfig = {
  slug: 'cookie-bar',
  label: 'Cookie Bar (Cookies-уведомление)',
  admin: {
    group: 'Settings',
    description:
      'Текст и кнопка cookie-уведомления. excludedRoutes (на каких страницах не показывать) — захардкожены в коде.',
    livePreview: {
      url: () => buildPreviewUrl('/'),
      breakpoints: PREVIEW_BREAKPOINTS_SIMPLE,
    },
  },
  access: {
    read: publicReadOrDraftAccess,
    update: hasRole('admin', 'marketing'),
  },
  versions: VERSIONS_WITH_DRAFTS,
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Показывать cookie bar',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'МЫ СОБИРАЕМ КУКИ!',
      label: 'Заголовок',
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      editor: lexicalEditor({}),
      label: 'Текст (richText, можно inline-ссылку на /privacy)',
    },
    {
      name: 'buttonLabel',
      type: 'text',
      required: true,
      defaultValue: 'ПОНЯЛ, СОГЛАСЕН!',
      label: 'Текст кнопки',
    },
  ],
};
