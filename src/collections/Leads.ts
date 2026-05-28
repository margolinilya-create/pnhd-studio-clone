import type { CollectionConfig } from 'payload';

import { hasRole } from '@/access/hasRole';

export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'source', 'status', 'createdAt'],
  },
  access: {
    create: () => true,
    read: hasRole('admin', 'operations', 'marketing'),
    update: hasRole('admin', 'operations', 'marketing'),
    delete: hasRole('admin'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      maxLength: 32,
    },
    {
      name: 'email',
      type: 'email',
    },
    {
      name: 'comment',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      name: 'referenceUrl',
      type: 'text',
      maxLength: 500,
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: [
        { label: 'Footer', value: 'footer' },
        { label: 'Popup', value: 'popup' },
        { label: 'Shop — no model', value: 'shop-no-model' },
        { label: 'Product page', value: 'product-page' },
        { label: 'Methods consultation', value: 'methods-consultation' },
        { label: 'Checkout', value: 'checkout' },
      ],
    },
    {
      name: 'roistatVisit',
      type: 'text',
      admin: { description: 'Cookie roistat_visit, для трекинга источника' },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'attachments',
      type: 'array',
      label: 'Прикреплённые принт-файлы',
      fields: [
        { name: 'side', type: 'text' },
        { name: 'url', type: 'text', required: true },
        { name: 'filename', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'В работе', value: 'contacted' },
        { label: 'Готов', value: 'done' },
        { label: 'Спам', value: 'spam' },
      ],
    },
  ],
};
