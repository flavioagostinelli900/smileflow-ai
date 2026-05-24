-- Operator status history: registers every online/offline change
CREATE TABLE IF NOT EXISTS public.operator_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL,
  online BOOLEAN NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_op_status_hist_operator ON public.operator_status_history(operator_id, changed_at DESC);

ALTER TABLE public.operator_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_status_hist read auth" ON public.operator_status_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "op_status_hist insert auth" ON public.operator_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Trigger: record status changes on operators.online
CREATE OR REPLACE FUNCTION public.log_operator_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (NEW.online IS DISTINCT FROM OLD.online) THEN
    INSERT INTO public.operator_status_history (operator_id, online, changed_by)
    VALUES (NEW.id, COALESCE(NEW.online, false), auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_operators_status_change ON public.operators;
CREATE TRIGGER trg_operators_status_change
AFTER INSERT OR UPDATE OF online ON public.operators
FOR EACH ROW EXECUTE FUNCTION public.log_operator_status_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_status_history;