
-- Estendi can_manage_any per includere il ruolo support
CREATE OR REPLACE FUNCTION public.can_manage_any(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role IN ('super_admin', 'authorized_admin', 'support')
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_authorizations
      WHERE admin_user_id = _user_id
    );
$$;

-- Estendi can_access_studio per dare al support accesso a tutti gli studi
CREATE OR REPLACE FUNCTION public.can_access_studio(_studio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _studio_id IS NOT NULL
    AND (
      public.is_super_admin(auth.uid())
      OR public.has_role(auth.uid(), 'support')
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

-- Consenti ad Admin Autorizzato e Supporto di creare e modificare studi (no delete)
DROP POLICY IF EXISTS "studios insert managers" ON public.studios;
CREATE POLICY "studios insert managers"
ON public.studios
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_any(auth.uid()));

DROP POLICY IF EXISTS "studios update managers" ON public.studios;
CREATE POLICY "studios update managers"
ON public.studios
FOR UPDATE
TO authenticated
USING (public.can_manage_any(auth.uid()) AND public.can_access_studio(id))
WITH CHECK (public.can_manage_any(auth.uid()) AND public.can_access_studio(id));

-- Protezione ruolo Super Admin: impedisci a chiunque non sia Super Admin
-- di inserire/aggiornare/cancellare righe con role = 'super_admin'
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un Super Admin può assegnare il ruolo Super Admin';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
       AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un Super Admin può modificare ruoli Super Admin';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Solo un Super Admin può rimuovere un Super Admin';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_protect_super_admin_role ON public.user_roles;
CREATE TRIGGER trg_protect_super_admin_role
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();
