
ALTER TABLE public.studios
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS subscription_started_at date,
  ADD COLUMN IF NOT EXISTS subscription_expires_at date;

-- Helper: compute expiry from start + cycle
CREATE OR REPLACE FUNCTION public.compute_subscription_expiry(_start date, _cycle text)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _start IS NULL THEN NULL
    WHEN _cycle = 'annual' THEN _start + INTERVAL '365 days'
    ELSE _start + INTERVAL '30 days'
  END::date;
$$;

CREATE OR REPLACE FUNCTION public.studios_set_expiry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.subscription_expires_at := public.compute_subscription_expiry(NEW.subscription_started_at, NEW.billing_cycle);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_studios_expiry ON public.studios;
CREATE TRIGGER trg_studios_expiry
  BEFORE INSERT OR UPDATE OF subscription_started_at, billing_cycle ON public.studios
  FOR EACH ROW EXECUTE FUNCTION public.studios_set_expiry();

-- Staff role enum value already exists ('authorized_admin'). Add 'support' to app_role.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'support' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'support';
  END IF;
END $$;

-- Allow super admins to manage admin_authorizations (already covered by is_super_admin policy)
-- Add policy: authorized_admins cannot self-promote. user_roles policies already restrict to super_admin.
