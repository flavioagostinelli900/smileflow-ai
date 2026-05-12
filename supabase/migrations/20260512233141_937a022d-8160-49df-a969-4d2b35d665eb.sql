
-- Enum ruoli
CREATE TYPE public.app_role AS ENUM ('super_admin', 'authorized_admin', 'studio');

-- Tabella studios
CREATE TABLE public.studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  owner_user_id uuid,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- Studio di default
INSERT INTO public.studios (id, name, email, plan, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Studio Default', NULL, 'pro', 'active');

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  studio_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, studio_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- admin_authorizations
CREATE TABLE public.admin_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  studio_id uuid NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, studio_id)
);
ALTER TABLE public.admin_authorizations ENABLE ROW LEVEL SECURITY;

-- audit_log
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  studio_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Funzioni security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_studio(_user_id uuid, _studio_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_authorizations
      WHERE admin_user_id = _user_id AND studio_id = _studio_id
    )
    OR EXISTS (
      SELECT 1 FROM public.studios WHERE id = _studio_id AND owner_user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_any(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','authorized_admin'))
    OR EXISTS (SELECT 1 FROM public.admin_authorizations WHERE admin_user_id = _user_id);
$$;

-- RLS policies
CREATE POLICY "studios read auth" ON public.studios FOR SELECT TO authenticated USING (true);
CREATE POLICY "studios manage super" ON public.studios FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "roles read self or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "roles manage super" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "auth read auth" ON public.admin_authorizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage super" ON public.admin_authorizations FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "audit read managers" ON public.audit_log FOR SELECT TO authenticated
  USING (public.can_manage_any(auth.uid()));
CREATE POLICY "audit insert auth" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Promozione automatica del primo utente a super_admin
CREATE OR REPLACE FUNCTION public.promote_first_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'studio');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.promote_first_user();

-- Promuovi utenti esistenti: il più vecchio diventa super_admin, gli altri studio
INSERT INTO public.user_roles (user_id, role)
SELECT id, CASE WHEN row_number() OVER (ORDER BY created_at) = 1 THEN 'super_admin'::app_role ELSE 'studio'::app_role END
FROM auth.users
ON CONFLICT DO NOTHING;
