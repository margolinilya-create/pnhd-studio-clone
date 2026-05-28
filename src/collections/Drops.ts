import type { CollectionConfig } from 'payload';

import { hasRole } from '@/access/hasRole';

export const Drops: CollectionConfig = {
  slug: 'drops',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'releaseAt', 'status'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return { status: { in: ['teaser', 'live'] } };
    },
    create: hasRole('admin', 'marketing'),
    update: hasRole('admin', 'marketing'),
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
      name: 'description',
      type: 'richText',
    },
    {
      name: 'coverMedia',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'releaseAt',
      type: 'date',
    },
    {
      name: 'products',
      type: 'array',
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'teaser',
      options: [
        { label: 'Тизер', value: 'teaser' },
        { label: 'В продаже', value: 'live' },
        { label: 'Распродан', value: 'sold_out' },
        { label: 'В архиве', value: 'archived' },
      ],
    },
  ],
};
