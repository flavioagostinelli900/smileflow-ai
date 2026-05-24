ALTER TABLE public.operators ADD COLUMN IF NOT EXISTS status_until timestamptz;
CREATE INDEX IF NOT EXISTS idx_operators_status_until ON public.operators(status_until) WHERE status_until IS NOT NULL;