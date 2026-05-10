ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS proposed_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cancellation_state text,
  ADD COLUMN IF NOT EXISTS new_appointment_id uuid;