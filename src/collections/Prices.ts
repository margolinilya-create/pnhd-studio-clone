import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Prices: CollectionConfig = {
  slug: 'prices',
  admin: {
    useAsTitle: 'amount',
    defaultColumns: ['variant', 'amount', 'currency', 'validFrom', 'validUntil'],
  },
  access: {
    read: () => true,
    create: hasRole('admin', 'brand_manager'),
    update: hasRole('admin', 'brand_manager'),
    delete: hasRole('admin', 'brand_manager'),
  },
  fields: [
    {
      name: 'variant',
      type: 'relationship',
      relationTo: 'variants',
      required: true,
      index: true,
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'RUB',
      options: [
        { label: 'Рубль (RUB)', value: 'RUB' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Цена, копейки',
      min: 0,
    },
    {
      name: 'validFrom',
      type: 'date',
      label: 'Действует с',
    },
    {
      name: 'validUntil',
      type: 'date',
      label: 'Действует до',
    },
    // priceList (rel → priceLists) добавится в Phase 7 (B2B fundament).
  ],
};
