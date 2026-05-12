-- Tighten admin permission helpers: studio owners are read-only, not managers
CREATE OR REPLACE FUNCTION public.can_manage_studio(_user_id uuid, _studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_authorizations
      WHERE admin_user_id = _user_id AND studio_id = _studio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'authorized_admin'
        AND (studio_id = _studio_id OR studio_id IS NULL)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_any(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('super_admin', 'authorized_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_authorizations
      WHERE admin_user_id = _user_id
    );
$$;

-- Let authorized admins read role rows needed by the admin panel, without allowing studios to change roles
DROP POLICY IF EXISTS "roles read self or admin" ON public.user_roles;
CREATE POLICY "roles read self or admin" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.can_manage_any(auth.uid()));

-- Configuration tables: everyone authenticated can read, only managers can write
DROP POLICY IF EXISTS "settings all auth" ON public.studio_settings;
CREATE POLICY "settings read auth" ON public.studio_settings
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "settings write managers" ON public.studio_settings
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "settings update managers" ON public.studio_settings
FOR UPDATE TO authenticated
USING (public.can_manage_any(auth.uid()))
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "settings delete managers" ON public.studio_settings
FOR DELETE TO authenticated
USING (public.can_manage_any(auth.uid()));

DROP POLICY IF EXISTS "seq all auth" ON public.followup_sequences;
CREATE POLICY "seq read auth" ON public.followup_sequences
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "seq write managers" ON public.followup_sequences
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "seq update managers" ON public.followup_sequences
FOR UPDATE TO authenticated
USING (public.can_manage_any(auth.uid()))
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "seq delete managers" ON public.followup_sequences
FOR DELETE TO authenticated
USING (public.can_manage_any(auth.uid()));

DROP POLICY IF EXISTS "operators all auth" ON public.operators;
CREATE POLICY "operators read auth" ON public.operators
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "operators write managers" ON public.operators
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "operators update managers" ON public.operators
FOR UPDATE TO authenticated
USING (public.can_manage_any(auth.uid()))
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "operators delete managers" ON public.operators
FOR DELETE TO authenticated
USING (public.can_manage_any(auth.uid()));

DROP POLICY IF EXISTS "loy all auth" ON public.loyalty_rewards;
CREATE POLICY "loy read auth" ON public.loyalty_rewards
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "loy write managers" ON public.loyalty_rewards
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "loy update managers" ON public.loyalty_rewards
FOR UPDATE TO authenticated
USING (public.can_manage_any(auth.uid()))
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "loy delete managers" ON public.loyalty_rewards
FOR DELETE TO authenticated
USING (public.can_manage_any(auth.uid()));

DROP POLICY IF EXISTS "upsell_rules all auth" ON public.upsell_rules;
CREATE POLICY "upsell_rules read auth" ON public.upsell_rules
FOR SELECT TO authenticated
USING (true);
CREATE POLICY "upsell_rules write managers" ON public.upsell_rules
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "upsell_rules update managers" ON public.upsell_rules
FOR UPDATE TO authenticated
USING (public.can_manage_any(auth.uid()))
WITH CHECK (public.can_manage_any(auth.uid()));
CREATE POLICY "upsell_rules delete managers" ON public.upsell_rules
FOR DELETE TO authenticated
USING (public.can_manage_any(auth.uid()));