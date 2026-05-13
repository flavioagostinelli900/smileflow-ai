
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'open',
  ticket_number serial NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'studio',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets read own or staff" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.can_manage_any(auth.uid()));

CREATE POLICY "tickets insert own" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "tickets update staff or owner" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.can_manage_any(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.can_manage_any(auth.uid()));

CREATE POLICY "ticket msgs read participants" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    public.can_manage_any(auth.uid())
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
  );

CREATE POLICY "ticket msgs insert participants" ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid() AND (
      public.can_manage_any(auth.uid())
      OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
    )
  );

CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id);
