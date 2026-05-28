import type { Access, FieldAccess } from 'payload';

import type { User } from '../payload-types.ts';

const userIsAdmin = (user: User | null | undefined): boolean =>
  Array.isArray(user?.roles) && user.roles.includes('admin');

export const isAdmin: Access = ({ req: { user } }) =>
  userIsAdmin(user as unknown as User | null | undefined);

export const isAdminFieldAccess: FieldAccess = ({ req: { user } }) =>
  userIsAdmin(user as unknown as User | null | undefined);
