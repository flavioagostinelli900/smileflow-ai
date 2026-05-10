
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.patient_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_for date,
  total int NOT NULL DEFAULT 0,
  contacted int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks all auth" ON public.patient_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  appointment_id uuid,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders all auth" ON public.reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.studio_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Studio Dentistico',
  address text,
  phone text,
  whatsapp_ai text,
  whatsapp_studio text,
  whatsapp_mode text NOT NULL DEFAULT 'dedicated',
  opening_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  visit_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_templates jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings all auth" ON public.studio_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.operator_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL,
  day_of_week int NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.operator_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_avail all auth" ON public.operator_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.operator_visit_durations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL,
  visit_type text NOT NULL,
  minutes int NOT NULL DEFAULT 30
);
ALTER TABLE public.operator_visit_durations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op_dur all auth" ON public.operator_visit_durations FOR ALL TO authenticated USING (true) WITH CHECK (true);
