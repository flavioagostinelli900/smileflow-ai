
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS internal_notes text;

ALTER TABLE public.followup_sequences
  ADD COLUMN IF NOT EXISTS steps_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'inactive_clients';
