import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    // audit Sec — SVG удалён из allowed mimeTypes (XSS-vector с supabase.co
    // origin'а). bucket-level allowed_mime_types тоже не пускает SVG (B14).
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 800, height: undefined, position: 'centre' },
      { name: 'hero', width: 1920, height: undefined, position: 'centre' },
    ],
  },
  access: {
    read: () => true,
    // audit Sec — marketing убрана из create/update Media. Media — это
    // bulk-asset slot который часто требуется для blog/landing редактуры.
    // Но загрузка svg + произвольных файлов от marketing-role это потенциал
    // XSS-injection в admin UI (alt-text + filename идут в render).
    // Brand_manager + admin сохраняют доступ; marketing просит admin/BM upload.
    create: hasRole('admin', 'brand_manager'),
    update: hasRole('admin', 'brand_manager'),
    delete: hasRole('admin', 'brand_manager'),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt-текст',
    },
    {
      name: 'tag',
      type: 'select',
      label: 'Тег (для группировки в админке)',
      defaultValue: 'misc',
      options: [
        { label: 'Товар', value: 'product' },
        { label: 'Блог', value: 'blog' },
        { label: 'Галерея принтов', value: 'gallery_prints' },
        { label: 'Дроп', value: 'drops' },
        { label: 'Прочее', value: 'misc' },
      ],
    },
  ],
};
