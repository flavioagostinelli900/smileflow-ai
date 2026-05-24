
-- =============================================
-- 1. HELPERS
-- =============================================
CREATE OR REPLACE FUNCTION public.current_user_studio_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.studios WHERE owner_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_studio(_studio_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    _studio_id IS NULL
    OR public.is_super_admin(auth.uid())
    OR _studio_id = public.current_user_studio_id()
    OR EXISTS (SELECT 1 FROM public.admin_authorizations WHERE admin_user_id = auth.uid() AND studio_id = _studio_id)
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'authorized_admin' AND (studio_id = _studio_id OR studio_id IS NULL));
$$;

-- =============================================
-- 2. ADD studio_id COLUMNS
-- =============================================
ALTER TABLE public.clients              ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.appointments         ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.conversations        ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.messages             ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.operators            ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.followup_sequences   ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.reminders            ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.loyalty_rewards      ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.upsell_offers        ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.upsell_rules         ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.missed_calls         ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.patient_blocks       ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.studio_settings      ADD COLUMN IF NOT EXISTS studio_id uuid;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_studio              ON public.clients(studio_id);
CREATE INDEX IF NOT EXISTS idx_appointments_studio         ON public.appointments(studio_id);
CREATE INDEX IF NOT EXISTS idx_conversations_studio        ON public.conversations(studio_id);
CREATE INDEX IF NOT EXISTS idx_messages_studio             ON public.messages(studio_id);
CREATE INDEX IF NOT EXISTS idx_operators_studio            ON public.operators(studio_id);
CREATE INDEX IF NOT EXISTS idx_followup_sequences_studio   ON public.followup_sequences(studio_id);
CREATE INDEX IF NOT EXISTS idx_reminders_studio            ON public.reminders(studio_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_studio      ON public.loyalty_rewards(studio_id);
CREATE INDEX IF NOT EXISTS idx_upsell_offers_studio        ON public.upsell_offers(studio_id);
CREATE INDEX IF NOT EXISTS idx_upsell_rules_studio         ON public.upsell_rules(studio_id);
CREATE INDEX IF NOT EXISTS idx_missed_calls_studio         ON public.missed_calls(studio_id);
CREATE INDEX IF NOT EXISTS idx_patient_blocks_studio       ON public.patient_blocks(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_settings_studio      ON public.studio_settings(studio_id);

-- =============================================
-- 3. BACKFILL existing rows to first studio
-- =============================================
DO $$
DECLARE first_studio uuid;
BEGIN
  SELECT id INTO first_studio FROM public.studios ORDER BY created_at LIMIT 1;
  IF first_studio IS NOT NULL THEN
    UPDATE public.clients            SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.appointments       SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.conversations      SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.messages           SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.operators          SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.followup_sequences SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.reminders          SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.loyalty_rewards    SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.upsell_offers      SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.upsell_rules       SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.missed_calls       SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.patient_blocks     SET studio_id = first_studio WHERE studio_id IS NULL;
    UPDATE public.studio_settings    SET studio_id = first_studio WHERE studio_id IS NULL;
  END IF;
END $$;

-- =============================================
-- 4. AUTO-FILL trigger for new inserts
-- =============================================
CREATE OR REPLACE FUNCTION public.set_studio_id_default()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.studio_id IS NULL THEN
    NEW.studio_id := public.current_user_studio_id();
  END IF;
  RETURN NEW;
END $$;

-- Attach trigger to all tenant-scoped tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','appointments','conversations','messages','operators',
    'followup_sequences','reminders','loyalty_rewards','upsell_offers',
    'upsell_rules','missed_calls','patient_blocks','studio_settings'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_studio_id_default ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_studio_id_default BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_studio_id_default()', t);
  END LOOP;
END $$;

-- Special: messages.studio_id derived from conversation if not provided
CREATE OR REPLACE FUNCTION public.set_message_studio_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.studio_id IS NULL AND NEW.conversation_id IS NOT NULL THEN
    SELECT studio_id INTO NEW.studio_id FROM public.conversations WHERE id = NEW.conversation_id;
  END IF;
  IF NEW.studio_id IS NULL THEN
    NEW.studio_id := public.current_user_studio_id();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS set_studio_id_default ON public.messages;
DROP TRIGGER IF EXISTS set_message_studio_id ON public.messages;
CREATE TRIGGER set_message_studio_id BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_message_studio_id();

-- =============================================
-- 5. REPLACE RLS with tenant-scoped policies
-- =============================================

-- CLIENTS
DROP POLICY IF EXISTS "clients all auth" ON public.clients;
CREATE POLICY "clients tenant access" ON public.clients FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- APPOINTMENTS
DROP POLICY IF EXISTS "appt all auth" ON public.appointments;
CREATE POLICY "appt tenant access" ON public.appointments FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- CONVERSATIONS
DROP POLICY IF EXISTS "conv all auth" ON public.conversations;
CREATE POLICY "conv tenant access" ON public.conversations FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- MESSAGES
DROP POLICY IF EXISTS "msg all auth" ON public.messages;
CREATE POLICY "msg tenant access" ON public.messages FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- OPERATORS (studio owners can manage their own operators)
DROP POLICY IF EXISTS "operators read auth" ON public.operators;
DROP POLICY IF EXISTS "operators write managers" ON public.operators;
DROP POLICY IF EXISTS "operators update managers" ON public.operators;
DROP POLICY IF EXISTS "operators delete managers" ON public.operators;
CREATE POLICY "operators tenant access" ON public.operators FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- FOLLOWUP SEQUENCES
DROP POLICY IF EXISTS "seq read auth" ON public.followup_sequences;
DROP POLICY IF EXISTS "seq write managers" ON public.followup_sequences;
DROP POLICY IF EXISTS "seq update managers" ON public.followup_sequences;
DROP POLICY IF EXISTS "seq delete managers" ON public.followup_sequences;
CREATE POLICY "seq tenant access" ON public.followup_sequences FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- REMINDERS
DROP POLICY IF EXISTS "reminders all auth" ON public.reminders;
CREATE POLICY "reminders tenant access" ON public.reminders FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- LOYALTY
DROP POLICY IF EXISTS "loy read auth" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "loy write managers" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "loy update managers" ON public.loyalty_rewards;
DROP POLICY IF EXISTS "loy delete managers" ON public.loyalty_rewards;
CREATE POLICY "loy tenant access" ON public.loyalty_rewards FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- UPSELL OFFERS
DROP POLICY IF EXISTS "upsell_offers all auth" ON public.upsell_offers;
CREATE POLICY "upsell_offers tenant access" ON public.upsell_offers FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- UPSELL RULES
DROP POLICY IF EXISTS "upsell_rules read auth" ON public.upsell_rules;
DROP POLICY IF EXISTS "upsell_rules write managers" ON public.upsell_rules;
DROP POLICY IF EXISTS "upsell_rules update managers" ON public.upsell_rules;
DROP POLICY IF EXISTS "upsell_rules delete managers" ON public.upsell_rules;
CREATE POLICY "upsell_rules tenant access" ON public.upsell_rules FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- MISSED CALLS
DROP POLICY IF EXISTS "calls all auth" ON public.missed_calls;
CREATE POLICY "calls tenant access" ON public.missed_calls FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- PATIENT BLOCKS
DROP POLICY IF EXISTS "blocks all auth" ON public.patient_blocks;
CREATE POLICY "blocks tenant access" ON public.patient_blocks FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- STUDIO SETTINGS
DROP POLICY IF EXISTS "settings read auth" ON public.studio_settings;
DROP POLICY IF EXISTS "settings write managers" ON public.studio_settings;
DROP POLICY IF EXISTS "settings update managers" ON public.studio_settings;
DROP POLICY IF EXISTS "settings delete managers" ON public.studio_settings;
CREATE POLICY "settings tenant access" ON public.studio_settings FOR ALL TO authenticated
  USING (public.can_access_studio(studio_id)) WITH CHECK (public.can_access_studio(studio_id));

-- Operator-related child tables: scope via parent operator
DROP POLICY IF EXISTS "op_avail all auth" ON public.operator_availability;
CREATE POLICY "op_avail tenant access" ON public.operator_availability FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)));

DROP POLICY IF EXISTS "op_dur all auth" ON public.operator_visit_durations;
CREATE POLICY "op_dur tenant access" ON public.operator_visit_durations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)));

DROP POLICY IF EXISTS "op_status_hist read auth" ON public.operator_status_history;
DROP POLICY IF EXISTS "op_status_hist insert auth" ON public.operator_status_history;
CREATE POLICY "op_status_hist read tenant" ON public.operator_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)));
CREATE POLICY "op_status_hist insert tenant" ON public.operator_status_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.operators o WHERE o.id = operator_id AND public.can_access_studio(o.studio_id)));

-- =============================================
-- 6. CASCADE DELETE for studio removal
-- =============================================
CREATE OR REPLACE FUNCTION public.delete_studio_cascade(_studio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo Super Admin può eliminare studi';
  END IF;
  DELETE FROM public.messages           WHERE studio_id = _studio_id;
  DELETE FROM public.conversations      WHERE studio_id = _studio_id;
  DELETE FROM public.reminders          WHERE studio_id = _studio_id;
  DELETE FROM public.appointments       WHERE studio_id = _studio_id;
  DELETE FROM public.upsell_offers      WHERE studio_id = _studio_id;
  DELETE FROM public.upsell_rules       WHERE studio_id = _studio_id;
  DELETE FROM public.loyalty_rewards    WHERE studio_id = _studio_id;
  DELETE FROM public.followup_sequences WHERE studio_id = _studio_id;
  DELETE FROM public.missed_calls       WHERE studio_id = _studio_id;
  DELETE FROM public.patient_blocks     WHERE studio_id = _studio_id;
  DELETE FROM public.clients            WHERE studio_id = _studio_id;
  DELETE FROM public.operator_availability     WHERE operator_id IN (SELECT id FROM public.operators WHERE studio_id = _studio_id);
  DELETE FROM public.operator_visit_durations  WHERE operator_id IN (SELECT id FROM public.operators WHERE studio_id = _studio_id);
  DELETE FROM public.operator_status_history   WHERE operator_id IN (SELECT id FROM public.operators WHERE studio_id = _studio_id);
  DELETE FROM public.operators          WHERE studio_id = _studio_id;
  DELETE FROM public.studio_settings    WHERE studio_id = _studio_id;
  DELETE FROM public.admin_authorizations WHERE studio_id = _studio_id;
  DELETE FROM public.user_roles         WHERE studio_id = _studio_id;
  INSERT INTO public.audit_log (user_id, studio_id, action, entity, entity_id)
    VALUES (auth.uid(), _studio_id, 'delete', 'studio', _studio_id::text);
  DELETE FROM public.studios            WHERE id = _studio_id;
END $$;
