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
      label: 'Пустая корзина',
      fields: [
        {
          name: 'emptyCartTitle',
          type: 'text',
          required: true,
          defaultValue: 'Корзина пуста',
          label: 'Заголовок empty-state',
        },
        {
          name: 'emptyCartSubtitle',
          type: 'text',
          required: false,
          defaultValue:
            'Похоже, вы ещё не выбрали ни одной позиции. Откройте каталог и подберите модель.',
          label: 'Подзаголовок empty-state',
        },
        {
          name: 'emptyCartCtaLabel',
          type: 'text',
          required: true,
          defaultValue: 'Перейти в каталог',
          label: 'Текст основной кнопки',
        },
        {
          name: 'emptyCartCtaHref',
          type: 'text',
          required: true,
          defaultValue: '/shop',
          label: 'Куда ведёт основная кнопка',
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Пустой чекаут',
      fields: [
        {
          name: 'emptyCheckoutTitle',
          type: 'text',
          required: true,
          defaultValue: 'Нечего оформлять',
          label: 'Заголовок empty-state',
        },
        {
          name: 'emptyCheckoutSubtitle',
          type: 'text',
          required: false,
          defaultValue:
            'В корзине пока ничего нет. Сначала выберите модели в каталоге.',
          label: 'Подзаголовок empty-state',
        },
        {
          name: 'emptyCheckoutCtaLabel',
          type: 'text',
          required: true,
          defaultValue: 'Перейти в каталог',
          label: 'Текст кнопки',
        },
        {
          name: 'emptyCheckoutCtaHref',
          type: 'text',
          required: true,
          defaultValue: '/shop',
          label: 'Куда ведёт кнопка',
        },
      ],
    },
    {
      type: 'collapsible',
      label: '404 — Страница не найдена',
      fields: [
        {
          name: 'notFoundTitle',
          type: 'text',
          required: true,
          defaultValue: 'Страница не найдена',
          label: 'Заголовок 404',
        },
        {
          name: 'notFoundSubtitle',
          type: 'text',
          required: false,
          defaultValue:
            'Возможно, ссылка устарела или товар больше не доступен. Загляните в каталог — там точно найдётся то, что вам нужно.',
          label: 'Подзаголовок 404',
        },
        {
          name: 'notFoundPrimaryCtaLabel',
          type: 'text',
          required: true,
          defaultValue: 'Перейти в каталог',
          label: 'Основная кнопка — текст',
        },
        {
          name: 'notFoundPrimaryCtaHref',
          type: 'text',
          required: true,
          defaultValue: '/shop',
          label: 'Основная кнопка — куда ведёт',
        },
        {
          name: 'notFoundSecondaryCtaLabel',
          type: 'text',
          required: false,
          defaultValue: 'На главную',
          label: 'Вторая кнопка — текст (опц.)',
        },
        {
          name: 'notFoundSecondaryCtaHref',
          type: 'text',
          required: false,
          defaultValue: '/',
          label: 'Вторая кнопка — куда ведёт (опц.)',
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
