
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS age_group text NOT NULL DEFAULT 'unspecified';

ALTER TABLE public.operators
  ADD COLUMN IF NOT EXISTS patient_group text NOT NULL DEFAULT 'all';

CREATE OR REPLACE FUNCTION public.compute_age_group(_birth date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _birth IS NULL THEN 'unspecified'
    WHEN (EXTRACT(YEAR FROM age(_birth)))::int < 18 THEN 'pediatric'
    ELSE 'adult'
  END;
$$;

CREATE OR REPLACE FUNCTION public.clients_set_age_group()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.birth_date IS DISTINCT FROM OLD.birth_date OR TG_OP = 'INSERT' THEN
    IF NEW.age_group IS NULL OR NEW.age_group = '' OR NEW.birth_date IS NOT NULL THEN
      NEW.age_group := public.compute_age_group(NEW.birth_date);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS clients_age_group_trg ON public.clients;
CREATE TRIGGER clients_age_group_trg
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.clients_set_age_group();
