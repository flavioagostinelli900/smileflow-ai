ALTER TABLE public.studio_settings
  ADD COLUMN IF NOT EXISTS followup_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'discount_enabled', false,
    'discount_percent', 15,
    'discount_validity_days', 7,
    'visit_type_scope', 'all'
  );