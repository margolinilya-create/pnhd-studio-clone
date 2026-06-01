import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { GlobalConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';
import {
  buildPreviewUrl,
  PREVIEW_BREAKPOINTS_SIMPLE,
  publicReadOrDraftAccess,
  VERSIONS_WITH_DRAFTS,
} from '../lib/payload/shared-config.ts';

export const CheckoutMessages: GlobalConfig = {
  slug: 'checkout-messages',
  label: 'Checkout Messages (Cart / Checkout / Thanks)',
  admin: {
    group: 'Settings',
    description:
      'Тексты для корзины, чекаута и страницы благодарности. Меняем wording без редеплоя.',
    livePreview: {
      url: () => buildPreviewUrl('/thanks'),
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
      type: 'collapsible',
      label: 'Корзина',
      fields: [
        {
          name: 'cartPageTitle',
          type: 'text',
          required: true,
          defaultValue: 'Корзина покупок',
          label: 'Заголовок страницы / metadata title',
        },
        {
          name: 'cartManagerDisclaimer',
          type: 'text',
          required: false,
          defaultValue: 'Стоимость печати рассчитывается менеджером',
          label: 'Disclaimer о расчёте принта',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Чекаут',
      fields: [
        {
          name: 'checkoutSubmitLabel',
          type: 'text',
          required: true,
          defaultValue: 'Оформить заявку',
          label: 'Текст submit-кнопки',
        },
        {
          name: 'checkoutDisclaimer',
          type: 'text',
          required: false,
          defaultValue:
            'Стоимость печати рассчитается менеджером по вашему макету. Финальная цена будет согласована перед оплатой.',
          label: 'Disclaimer о финальной цене',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Страница благодарности',
      fields: [
        {
          name: 'thanksHeading',
          type: 'text',
          required: true,
          defaultValue: 'СПАСИБО!',
          label: 'Большой заголовок',
        },
        {
          name: 'thanksBody',
          type: 'richText',
          required: true,
          editor: lexicalEditor({}),
          label: 'Текст благодарности (richText)',
        },
        {
          name: 'thanksCallbackPromiseMinutes',
          type: 'number',
          required: false,
          defaultValue: 30,
          label: 'Через сколько минут перезвонит менеджер (если используется в thanksBody)',
        },
        {
          type: 'array',
          name: 'thanksCTAs',
          label: 'CTA-кнопки',
          minRows: 0,
          maxRows: 4,
          defaultValue: [
            { label: 'На главную', href: '/' },
            { label: 'Вернуться в каталог', href: '/shop' },
          ],
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
};
