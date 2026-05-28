import type { CollectionConfig } from 'payload';

import { hasRole } from '@/access/hasRole';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 800, height: undefined, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined, position: 'centre' },
    ],
  },
  access: {
    read: () => true,
    create: hasRole('admin', 'brand_manager', 'marketing'),
    update: hasRole('admin', 'brand_manager', 'marketing'),
    delete: hasRole('admin', 'brand_manager'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
    },
  ],
};
