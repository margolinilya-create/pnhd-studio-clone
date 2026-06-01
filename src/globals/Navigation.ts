import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS,
} from '../lib/payload/shared-config.ts';

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation (Меню)',
  admin: {
    group: 'Settings',
    description:
      'Единый список пунктов меню для шапки / подвала / мобильного меню. Visibility-флаги контролируют где элемент показывается. Порядок в массиве = порядок отображения.',
    livePreview: {
      url: () => buildPreviewUrl('/'),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
  },
  access: {
    read: publicReadOrDraftAccess,
    update: hasRole('admin', 'marketing'),
  },
  versions: VERSIONS_WITH_DRAFTS,
  fields: [
    {
      name: 'items',
      type: 'array',
      label: 'Пункты меню',
      minRows: 1,
      maxRows: 16,
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Текст ссылки' },
        {
          name: 'href',
          type: 'text',
          required: true,
          label: 'URL или путь',
          admin: {
            description: 'Внутренние: /shop, /contacts. Внешние: https://… (поставь isExternal).',
          },
        },
        {
          name: 'hash',
          type: 'text',
          label: 'Якорь (без #)',
          admin: {
            description: 'Опционально: например feedback → /?#feedback',
          },
        },
        { name: 'isExternal', type: 'checkbox', defaultValue: false, label: 'Внешняя ссылка (target=_blank)' },
        { name: 'showInHeader', type: 'checkbox', defaultValue: true, label: 'Показывать в шапке' },
        { name: 'showInFooter', type: 'checkbox', defaultValue: true, label: 'Показывать в подвале' },
        { name: 'showInMobile', type: 'checkbox', defaultValue: true, label: 'Показывать в мобильном меню' },
      ],
    },
  ],
};
