CREATE TABLE IF NOT EXISTS public.upsell_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  treatment text NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  trigger_type text NOT NULL,
  threshold integer NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  message_template text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upsell_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upsell_rules all auth" ON public.upsell_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.upsell_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  rule_id uuid,
  appointment_id uuid,
  treatment text NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revenue_generated numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upsell_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upsell_offers all auth" ON public.upsell_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS upsell_offers_client_idx ON public.upsell_offers(client_id);
CREATE INDEX IF NOT EXISTS upsell_offers_status_idx ON public.upsell_offers(status);

INSERT INTO public.upsell_rules (name, treatment, discount_percent, trigger_type, threshold, validity_days, message_template) VALUES
  ('Sbiancamento dopo 3 igieni', 'Sbiancamento dentale', 15, 'igiene_count', 3, 30, 'In questo periodo hai uno sconto del 15% sullo sbiancamento dentale 🙂 Valido fino al {scadenza}.'),
  ('Igiene gratuita 5 visite', 'Igiene professionale', 100, 'visit_count', 5, 30, 'Per ringraziarti della tua fedeltà ti regaliamo una seduta di igiene gratuita 🦷 Valida fino al {scadenza}.'),
  ('Sconto famiglia 10%', 'Visita controllo', 10, 'family_id', 1, 60, 'Sconto famiglia attivo: 10% su tutta la famiglia. Valido fino al {scadenza}.'),
  ('Welcome Back 20%', 'Visita di controllo', 20, 'inactive_months', 12, 30, 'Ci manchi! 🙂 Ti aspettiamo con uno sconto del 20% sulla prossima visita. Valido fino al {scadenza}.')
ON CONFLICT DO NOTHING;