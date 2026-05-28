import type { CollectionConfig } from 'payload';

import { hasRole } from '@/access/hasRole';

export const OrderItems: CollectionConfig = {
  slug: 'order-items',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['order', 'product', 'variant', 'quantity', 'lineTotal'],
  },
  access: {
    create: hasRole('admin'),
    read: hasRole('admin', 'operations'),
    update: hasRole('admin', 'operations'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      required: true,
      index: true,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
    },
    {
      name: 'variant',
      type: 'relationship',
      relationTo: 'variants',
      required: true,
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 1,
      defaultValue: 1,
    },
    {
      name: 'pricePerUnit',
      type: 'number',
      required: true,
      label: 'Цена за единицу (snapshot), копейки',
    },
    {
      name: 'printConfig',
      type: 'json',
      label: 'Конфиг принта: { location, files: [{ side, url, filename }] }',
    },
    {
      name: 'lineTotal',
      type: 'number',
      required: true,
      label: 'Сумма позиции, копейки',
    },
  ],
};
