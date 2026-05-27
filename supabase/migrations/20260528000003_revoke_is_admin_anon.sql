-- PR #6 (security hardening): отзываем EXECUTE на public.is_admin() у anon/authenticated.
--
-- Контекст:
--   public.is_admin() — SECURITY DEFINER функция, проверяющая по auth.uid() наличие
--   текущего user'а в admin_users. Используется в RLS-policy'ях admin-таблиц.
--   По умолчанию EXECUTE на функцию доступна всем (anon, authenticated, service_role).
--   anon никогда не должен дёргать эту функцию напрямую — RLS-движок сам её вызывает
--   при проверке policy. Прямой EXECUTE — лишняя поверхность атаки.

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_admin() from authenticated;
-- service_role остаётся: используется в Server Actions при requireAdmin().
