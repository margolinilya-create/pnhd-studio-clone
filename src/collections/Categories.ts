import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'parent'],
  },
  access: {
    read: () => true,
    create: hasRole('admin', 'brand_manager'),
    update: hasRole('admin', 'brand_manager'),
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
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
    },
  ],
};
