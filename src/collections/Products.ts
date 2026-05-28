import type { CollectionConfig } from 'payload';

import { hasRole } from '../access/hasRole.ts';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'status', 'channels'],
  },
  access: {
    read: () => true,
    create: hasRole('admin', 'brand_manager'),
    update: hasRole('admin', 'brand_manager'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'tshirt',
      options: [
        { label: 'Футболка', value: 'tshirt' },
        { label: 'Худи', value: 'hoodie' },
        { label: 'Лонгслив', value: 'longsleeve' },
        { label: 'Свитшот', value: 'sweatshirt' },
        { label: 'Кепка', value: 'cap' },
        { label: 'Шоппер', value: 'totebag' },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'channels',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['b2c'],
      options: [
        { label: 'B2C (studio.pnhd.ru)', value: 'b2c' },
        { label: 'B2B (pnhd.ru)', value: 'b2b' },
      ],
    },
    {
      name: 'printMethods',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'DTG (прямая печать)', value: 'dtg' },
        { label: 'DTF (термотрансфер)', value: 'dtf' },
        { label: 'Шелкография', value: 'silkscreen' },
        { label: 'Вышивка', value: 'embroidery' },
        { label: 'Термоперенос', value: 'thermo' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликован', value: 'published' },
        { label: 'В архиве', value: 'archived' },
      ],
    },
    {
      name: 'coverMedia',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'galleryMedia',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'editorViews',
      type: 'group',
      label: 'Виды для конструктора (3D mockup)',
      fields: [
        { name: 'frontView', type: 'upload', relationTo: 'media' },
        { name: 'backView', type: 'upload', relationTo: 'media' },
        { name: 'lsleeveView', type: 'upload', relationTo: 'media' },
        { name: 'rsleeveView', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'shippingParams',
      type: 'group',
      label: 'Параметры доставки',
      fields: [
        { name: 'weight', type: 'number', label: 'Вес, г' },
        { name: 'width', type: 'number', label: 'Ширина, см' },
        { name: 'length', type: 'number', label: 'Длина, см' },
        { name: 'depth', type: 'number', label: 'Высота, см' },
      ],
    },
    {
      name: 'friendsProducts',
      type: 'array',
      label: 'Товары вместе с этим',
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
      name: 'isSale',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'isForPrinting',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'color',
      type: 'text',
      label: 'Цвет (отображаемый)',
    },
    {
      name: 'stageColor',
      type: 'text',
      label: 'Цвет фона (3D сцена)',
    },
  ],
};
