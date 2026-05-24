-- Enable realtime broadcasts for all primary data tables so any change
-- propagates to every connected client.
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.operators REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.followup_sequences REPLICA IDENTITY FULL;
ALTER TABLE public.studio_settings REPLICA IDENTITY FULL;
ALTER TABLE public.studios REPLICA IDENTITY FULL;
ALTER TABLE public.reminders REPLICA IDENTITY FULL;
ALTER TABLE public.patient_blocks REPLICA IDENTITY FULL;
ALTER TABLE public.loyalty_rewards REPLICA IDENTITY FULL;
ALTER TABLE public.upsell_rules REPLICA IDENTITY FULL;
ALTER TABLE public.upsell_offers REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'clients','operators','appointments','followup_sequences',
    'studio_settings','studios','reminders','patient_blocks',
    'loyalty_rewards','upsell_rules','upsell_offers'
  ]) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;