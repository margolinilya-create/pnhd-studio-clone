import type { CollectionConfig } from 'payload';

import { isAdmin, isAdminFieldAccess } from '@/access/isAdmin';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles'],
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    admin: ({ req: { user } }) => {
      const roles = (user as unknown as { roles?: string[] } | null)?.roles;
      return Array.isArray(roles) && roles.length > 0;
    },
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['admin'],
      access: {
        update: isAdminFieldAccess,
      },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Brand Manager', value: 'brand_manager' },
        { label: 'Marketing', value: 'marketing' },
        { label: 'Operations', value: 'operations' },
        { label: 'Sales', value: 'sales' },
      ],
    },
  ],
};
