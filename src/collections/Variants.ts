import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Variants: CollectionConfig = {
  slug: 'variants',
  admin: {
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'product', 'size', 'stockQty'],
  },
  access: {
    read: () => true,
    create: hasRole('admin', 'brand_manager'),
    update: hasRole('admin', 'brand_manager', 'operations'),
    delete: hasRole('admin', 'brand_manager'),
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
    },
    {
      name: 'size',
      type: 'text',
      required: true,
      label: 'Размер (S, M, XL, 128-134 см, ONE SIZE...)',
    },
    {
      name: 'color',
      type: 'text',
      label: 'Цвет (если разные цвета — отдельный variant)',
    },
    {
      name: 'sku',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'stockQty',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Количество на складе',
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
    },
  ],
};
