import type { Access } from 'payload';

/**
 * Доступ для любого залогиненного юзера, без проверки конкретной роли.
 * Используется для read-операций на коллекциях, где видимость данных
 * открыта для всех сотрудников (orders, leads, promos, form-submissions, etc.),
 * а ограничения по mutation'ам сохраняются на уровне create/update/delete.
 */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user);
