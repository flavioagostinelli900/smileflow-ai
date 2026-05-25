-- 1) Restrict studios SELECT to own/managed studios (super_admin still sees all via can_access_studio).
DROP POLICY IF EXISTS "studios read auth" ON public.studios;
CREATE POLICY "studios read scoped"
  ON public.studios FOR SELECT TO authenticated
  USING (public.can_access_studio(id));

-- 2) Restrict admin_authorizations SELECT to super_admins or the admin themself.
DROP POLICY IF EXISTS "auth read auth" ON public.admin_authorizations;
CREATE POLICY "auth read scoped"
  ON public.admin_authorizations FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR admin_user_id = auth.uid());

-- 3) Restrict profiles SELECT to self + staff (super_admin/authorized_admin/support).
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles read scoped"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_manage_any(auth.uid()));

-- 4) Restrict audit_log INSERT: only for studios the user can access.
DROP POLICY IF EXISTS "audit insert auth" ON public.audit_log;
CREATE POLICY "audit insert scoped"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (
    studio_id IS NULL AND public.is_super_admin(auth.uid())
    OR studio_id IS NOT NULL AND public.can_access_studio(studio_id)
  );

-- 5) Close NULL-studio_id bypass in can_access_studio.
CREATE OR REPLACE FUNCTION public.can_access_studio(_studio_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    _studio_id IS NOT NULL
    AND (
      public.is_super_admin(auth.uid())
      OR _studio_id = public.current_user_studio_id()
      OR EXISTS (
        SELECT 1 FROM public.admin_authorizations
        WHERE admin_user_id = auth.uid() AND studio_id = _studio_id
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'authorized_admin'
          AND (studio_id = _studio_id OR studio_id IS NULL)
      )
    );
$$;

-- 6) Lock SECURITY DEFINER helpers: revoke from anon, keep authenticated.
REVOKE EXECUTE ON FUNCTION public.can_access_studio(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_any(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_studio(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_studio_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_studio_cascade(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_access_studio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_any(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_studio(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_studio_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_studio_cascade(uuid) TO authenticated;

-- 7) Fix search_path on functions that were missing it.
ALTER FUNCTION public.compute_age_group(date) SET search_path = public;
ALTER FUNCTION public.clients_set_age_group() SET search_path = public;
ALTER FUNCTION public.compute_subscription_expiry(date, text) SET search_path = public;
ALTER FUNCTION public.studios_set_expiry() SET search_path = public;