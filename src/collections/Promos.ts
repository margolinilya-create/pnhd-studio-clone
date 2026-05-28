import type { CollectionConfig } from 'payload';

import { hasRole } from '@/access/hasRole';

export const Promos: CollectionConfig = {
  slug: 'promos',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'discountType', 'discountValue', 'validFrom', 'validUntil', 'usageCount'],
  },
  access: {
    read: hasRole('admin', 'marketing', 'operations'),
    create: hasRole('admin', 'marketing'),
    update: hasRole('admin', 'marketing'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      defaultValue: 'percent',
      options: [
        { label: 'Процент (%)', value: 'percent' },
        { label: 'Фиксированная сумма (RUB)', value: 'fixed' },
      ],
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
      min: 0,
      label: 'Размер скидки (% или копейки в зависимости от типа)',
    },
    {
      name: 'validFrom',
      type: 'date',
    },
    {
      name: 'validUntil',
      type: 'date',
    },
    {
      name: 'usageLimit',
      type: 'number',
      label: 'Лимит использований (пусто = безлимит)',
    },
    {
      name: 'usageCount',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'appliesTo',
      type: 'array',
      label: 'Распространяется на товары (пусто = все)',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
      ],
    },
  ],
};
