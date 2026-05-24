import { supabase } from "@/integrations/supabase/client";

export type AgeGroup = "adult" | "pediatric" | "unspecified";
export type PatientGroup = "adults" | "children" | "all";

export type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  family_id: string | null;
  department: string | null;
  operator_id: string | null;
  last_visit: string | null;
  status: "active" | "inactive";
  notes: string | null;
  tags: string[];
  birth_date: string | null;
  age_group: AgeGroup;
};

export type Operator = {
  id: string;
  name: string;
  role: string | null;
  departments: string[];
  online: boolean;
  patient_group: PatientGroup;
};

export type Conversation = {
  id: string;
  client_id: string | null;
  status: "ai" | "operator" | "booked" | "closed";
  assigned_operator_id: string | null;
  last_message_at: string;
  channel: string;
  tags: string[];
  internal_notes: string | null;
};

export type WorkflowStep = {
  id: string;
  type: "trigger" | "wait" | "message" | "ai_chat" | "booking" | "condition";
  label: string;
  config?: Record<string, string | number>;
};

export type FollowupSequence = {
  id: string;
  name: string;
  target: string;
  trigger_type: string;
  steps: number;
  active: boolean;
  messages_sent: number;
  conversion_rate: number;
  steps_config: WorkflowStep[];
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: "client" | "ai" | "operator" | "system";
  content: string;
  created_at: string;
};

export type MissedCall = {
  id: string;
  client_id: string | null;
  phone: string;
  caller_name: string | null;
  called_at: string;
  status: "pending" | "contacted" | "converted" | "closed";
  conversation_id: string | null;
  auto_message_sent: boolean;
};

export type Appointment = {
  id: string;
  client_id: string | null;
  operator_id: string | null;
  visit_type: string;
  duration_minutes: number;
  starts_at: string;
  status: string;
  source: string | null;
  notes: string | null;
};

export type PatientBlock = {
  id: string;
  block_number: number;
  status: "pending" | "in_progress" | "completed";
  scheduled_for: string | null;
  total: number;
  contacted: number;
};

export type ProposedSlot = { starts_at: string; operator_id?: string | null; visit_type?: string };
export type Reminder = {
  id: string;
  client_id: string | null;
  appointment_id: string | null;
  type: "24h" | "2h";
  status: "pending" | "sent" | "failed" | "confirmed" | "cancelled";
  scheduled_at: string;
  sent_at: string | null;
  proposed_slots: ProposedSlot[];
  cancellation_state: "cancelled" | "slots_proposed" | "rescheduled" | "no_response" | null;
  new_appointment_id: string | null;
};

export type OpeningHour = { day: string; open: string; close: string; active: boolean };
export type VisitType = { name: string; minutes: number; ai_booking: boolean };
export type FollowupConfig = {
  discount_enabled: boolean;
  discount_percent: number;
  discount_validity_days: number;
  visit_type_scope: "all" | "hygiene" | "checkup" | "custom";
  custom_visit_types?: string[];
};
export const DEFAULT_FOLLOWUP_CONFIG: FollowupConfig = {
  discount_enabled: false,
  discount_percent: 15,
  discount_validity_days: 7,
  visit_type_scope: "all",
};
export type StudioSettings = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp_ai: string | null;
  whatsapp_studio: string | null;
  whatsapp_mode: "dedicated" | "studio";
  opening_hours: OpeningHour[];
  visit_types: VisitType[];
  message_templates: Record<string, string>;
  followup_config: FollowupConfig;
};


export type Reward = {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  discount_percent: number | null;
  code: string | null;
  expires_at: string | null;
  used: boolean;
};

export const api = {
  clients: () => supabase.from("clients").select("*").order("created_at", { ascending: false }),
  operators: () => supabase.from("operators").select("*").order("name"),
  conversations: () =>
    supabase.from("conversations").select("*, client:clients(*)").order("last_message_at", { ascending: false }),
  messages: (conversationId: string) =>
    supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at"),
  missedCalls: () => supabase.from("missed_calls").select("*, client:clients(*)").order("called_at", { ascending: false }),
  appointments: () =>
    supabase
      .from("appointments")
      .select("*, client:clients(*), operator:operators(*)")
      .order("starts_at"),
  sequences: () => supabase.from("followup_sequences").select("*").order("created_at"),
  rewards: () => supabase.from("loyalty_rewards").select("*, client:clients(*)").order("created_at", { ascending: false }),
  patientBlocks: () => supabase.from("patient_blocks").select("*").order("block_number"),
  reminders: () => supabase.from("reminders").select("*").order("scheduled_at"),
  studioSettings: () => supabase.from("studio_settings").select("*").limit(1).maybeSingle(),
};
