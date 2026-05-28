import type { Access } from 'payload';

import type { User } from '../payload-types.ts';

export type AppRole = NonNullable<User['roles']>[number];

export const hasRole = (...allowed: AppRole[]): Access => ({ req: { user } }) => {
  if (!user) return false;
  const roles = ((user as unknown as User).roles ?? []) as AppRole[];
  return roles.some((role) => allowed.includes(role));
};
