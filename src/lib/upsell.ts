import { supabase } from "@/integrations/supabase/client";

export type UpsellRule = {
  id: string;
  name: string;
  treatment: string;
  discount_percent: number;
  trigger_type: "igiene_count" | "visit_count" | "family_id" | "inactive_months";
  threshold: number;
  validity_days: number;
  active: boolean;
  message_template: string | null;
};

export type UpsellOffer = {
  id: string;
  client_id: string | null;
  rule_id: string | null;
  appointment_id: string | null;
  treatment: string;
  discount_percent: number;
  status: "active" | "used" | "expired" | "refused";
  sent_at: string;
  expires_at: string;
  used_at: string | null;
  revenue_generated: number | null;
  created_at: string;
};

type ClientLite = { id: string; first_name: string; last_name: string; family_id: string | null; last_visit: string | null };
type ApptLite = { id: string; visit_type: string; status: string };

/**
 * Evaluate which upsell rule (if any) applies after an appointment is COMPLETED.
 * Rules:
 * - Min 3 visite nello storico
 * - Mai a clienti nuovi
 * - Mai durante visite di "Controllo"
 * - Mai prima della conferma appuntamento
 * - Mai due volte nello stesso appuntamento
 * - Una sola offerta attiva per cliente
 */
export async function evaluateUpsell(clientId: string, appointmentId?: string): Promise<{ rule: UpsellRule; offer: UpsellOffer } | null> {
  const [{ data: client }, { data: appts }, { data: activeOffers }, { data: rules }, { data: usedForAppt }] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name, family_id, last_visit").eq("id", clientId).single(),
    supabase.from("appointments").select("id, visit_type, status").eq("client_id", clientId),
    supabase.from("upsell_offers").select("*").eq("client_id", clientId).eq("status", "active"),
    supabase.from("upsell_rules").select("*").eq("active", true),
    appointmentId ? supabase.from("upsell_offers").select("id").eq("appointment_id", appointmentId).limit(1) : Promise.resolve({ data: [] }),
  ]);

  if (!client) return null;
  const c = client as ClientLite;
  const list = (appts ?? []) as ApptLite[];
  const completed = list.filter((a) => a.status === "completed" || a.status === "scheduled");

  if (completed.length < 3) return null; // mai a clienti nuovi
  if ((activeOffers ?? []).length > 0) return null; // 1 sola attiva
  if ((usedForAppt ?? []).length > 0) return null; // mai stesso appuntamento

  // Get current appt (the trigger)
  const currentAppt = appointmentId ? list.find((a) => a.id === appointmentId) : null;
  if (currentAppt && currentAppt.visit_type.toLowerCase().includes("controllo")) return null;
  if (currentAppt && currentAppt.status !== "completed") return null;

  const igieneCount = completed.filter((a) => a.visit_type.toLowerCase().includes("igiene")).length;
  const monthsInactive = c.last_visit ? Math.floor((Date.now() - new Date(c.last_visit).getTime()) / (30 * 86400000)) : 0;

  const rs = ((rules ?? []) as UpsellRule[]).filter((r) => r.active);

  // Priority: inactive > visit count > igiene > family
  const priority: UpsellRule["trigger_type"][] = ["inactive_months", "visit_count", "igiene_count", "family_id"];
  for (const trigger of priority) {
    const r = rs.find((x) => x.trigger_type === trigger);
    if (!r) continue;
    let match = false;
    if (trigger === "igiene_count" && igieneCount >= r.threshold) match = true;
    if (trigger === "visit_count" && completed.length >= r.threshold) match = true;
    if (trigger === "family_id" && c.family_id) match = true;
    if (trigger === "inactive_months" && monthsInactive >= r.threshold) match = true;
    if (!match) continue;

    const expires = new Date(); expires.setDate(expires.getDate() + r.validity_days);
    const { data: offer, error } = await supabase.from("upsell_offers").insert({
      client_id: clientId, rule_id: r.id, appointment_id: appointmentId ?? null,
      treatment: r.treatment, discount_percent: r.discount_percent,
      status: "active", expires_at: expires.toISOString(),
    }).select().single();
    if (error || !offer) return null;
    return { rule: r, offer: offer as UpsellOffer };
  }
  return null;
}

export function nextEligibleRule(client: ClientLite, allAppts: ApptLite[], rules: UpsellRule[]): UpsellRule | null {
  const completed = allAppts.filter((a) => a.status === "completed" || a.status === "scheduled");
  const igieneCount = completed.filter((a) => a.visit_type.toLowerCase().includes("igiene")).length;
  const monthsInactive = client.last_visit ? Math.floor((Date.now() - new Date(client.last_visit).getTime()) / (30 * 86400000)) : 0;

  const candidates = rules.filter((r) => r.active);
  for (const r of candidates) {
    if (r.trigger_type === "igiene_count" && igieneCount + 1 >= r.threshold) return r;
    if (r.trigger_type === "visit_count" && completed.length + 1 >= r.threshold) return r;
    if (r.trigger_type === "family_id" && client.family_id) return r;
    if (r.trigger_type === "inactive_months" && monthsInactive >= r.threshold) return r;
  }
  return null;
}

export async function expireOldOffers() {
  await supabase.from("upsell_offers").update({ status: "expired" }).eq("status", "active").lt("expires_at", new Date().toISOString());
}
