import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, genericError } from "@/lib/api-auth";


const CANCEL_KEYWORDS = ["no", "annullo", "annulla", "non posso", "disdico", "disdire", "cancella", "cancello"];
const CONFIRM_KEYWORDS = ["si", "sì", "ok", "confermo", "perfetto", "va bene"];

function detectIntent(msg: string): "cancel" | "confirm" | "slot1" | "slot2" | "unknown" {
  const m = msg.toLowerCase().trim();
  if (/\b(1|primo|prima|martedì|martedi)\b/.test(m)) return "slot1";
  if (/\b(2|secondo|seconda|giovedì|giovedi)\b/.test(m)) return "slot2";
  if (CANCEL_KEYWORDS.some((k) => m.includes(k))) return "cancel";
  if (CONFIRM_KEYWORDS.some((k) => m.includes(k))) return "confirm";
  return "unknown";
}

function buildSlots(): { starts_at: string; label: string }[] {
  const now = new Date();
  const a = new Date(now); a.setDate(a.getDate() + 2); a.setHours(15, 0, 0, 0);
  const b = new Date(now); b.setDate(b.getDate() + 4); b.setHours(18, 0, 0, 0);
  return [
    { starts_at: a.toISOString(), label: a.toLocaleDateString("it", { weekday: "long" }) + " alle " + a.toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" }) },
    { starts_at: b.toISOString(), label: b.toLocaleDateString("it", { weekday: "long" }) + " alle " + b.toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" }) },
  ];
}

export const Route = createFileRoute("/api/reminder-respond")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const auth = await authenticateRequest(request);
          if (!auth.ok) return auth.response;

          const { reminderId, message } = (await request.json()) as { reminderId: string; message: string };
          if (!reminderId || !message) return new Response("missing params", { status: 400 });

          // AuthZ: ensure caller can access this reminder via RLS.
          const { data: remAuth, error: remAuthErr } = await auth.supabase
            .from("reminders")
            .select("id, studio_id")
            .eq("id", reminderId)
            .maybeSingle();
          if (remAuthErr) return genericError();
          if (!remAuth) return new Response("Forbidden", { status: 403 });

          const supabase = createClient(
            process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
          );


          const { data: reminder } = await supabase.from("reminders").select("*, client:clients(*)").eq("id", reminderId).single();
          if (!reminder) return new Response("reminder not found", { status: 404 });
          const client = reminder.client as { id: string; first_name: string; last_name: string; phone: string } | null;

          const intent = detectIntent(message);

          // CASE 1: Cancellation - mark appointment cancelled, propose 2 slots
          if (intent === "cancel" && reminder.cancellation_state == null) {
            if (reminder.appointment_id) {
              await supabase.from("appointments").update({ status: "cancelled" }).eq("id", reminder.appointment_id);
            }
            const slots = buildSlots();
            await supabase.from("reminders").update({
              status: "cancelled",
              cancellation_state: "slots_proposed",
              proposed_slots: slots.map((s) => ({ starts_at: s.starts_at })),
            }).eq("id", reminderId);

            const reply = `Nessun problema ${client?.first_name ?? ""} 🙂 Ho già trovato altri orari disponibili per te:\n\n📅 ${slots[0].label}\n📅 ${slots[1].label}\n\nQuale preferisci?`;
            // Log in conversation if available
            const { data: conv } = await supabase.from("conversations").insert({
              client_id: client?.id, channel: "whatsapp", status: "ai", tags: ["reminder-cancel"],
              internal_notes: "Disdetta automatica reminder 24h",
            }).select().single();
            if (conv) {
              await supabase.from("messages").insert([
                { conversation_id: conv.id, sender: "client", content: message },
                { conversation_id: conv.id, sender: "ai", content: reply },
              ]);
            }
            return Response.json({ action: "slots_proposed", reply, slots });
          }

          // CASE 2: Slot selection -> create new appointment + reschedule reminders
          if ((intent === "slot1" || intent === "slot2") && reminder.cancellation_state === "slots_proposed") {
            const slots = (reminder.proposed_slots ?? []) as { starts_at: string }[];
            const chosen = slots[intent === "slot1" ? 0 : 1];
            if (!chosen) return new Response("no slot", { status: 400 });

            // Get original appointment to copy operator/visit type
            let visitType = "Controllo"; let operatorId: string | null = null; let duration = 30;
            if (reminder.appointment_id) {
              const { data: oldAppt } = await supabase.from("appointments").select("*").eq("id", reminder.appointment_id).single();
              if (oldAppt) { visitType = oldAppt.visit_type; operatorId = oldAppt.operator_id; duration = oldAppt.duration_minutes; }
            }

            const { data: newAppt } = await supabase.from("appointments").insert({
              client_id: client?.id, operator_id: operatorId, visit_type: visitType,
              duration_minutes: duration, starts_at: chosen.starts_at, status: "scheduled", source: "ai-reschedule",
            }).select().single();

            // schedule new reminders 24h / 2h before
            if (newAppt) {
              const start = new Date(chosen.starts_at);
              const r24 = new Date(start.getTime() - 24 * 3600 * 1000);
              const r2 = new Date(start.getTime() - 2 * 3600 * 1000);
              await supabase.from("reminders").insert([
                { client_id: client?.id, appointment_id: newAppt.id, type: "24h", scheduled_at: r24.toISOString(), status: "pending" },
                { client_id: client?.id, appointment_id: newAppt.id, type: "2h", scheduled_at: r2.toISOString(), status: "pending" },
              ]);
            }

            await supabase.from("reminders").update({
              cancellation_state: "rescheduled",
              new_appointment_id: newAppt?.id ?? null,
            }).eq("id", reminderId);

            const dateLabel = new Date(chosen.starts_at).toLocaleString("it", { dateStyle: "full", timeStyle: "short" });
            const reply = `Perfetto ${client?.first_name ?? ""}! ✅ Il tuo nuovo appuntamento è confermato per ${dateLabel}. Ti invieremo un promemoria il giorno prima.`;
            return Response.json({ action: "rescheduled", reply, appointment: newAppt });
          }

          return Response.json({ action: "ignored", reply: null });
        } catch (e) {
          console.error("reminder-respond error", e);
          return new Response((e as Error).message, { status: 500 });
        }
      },
    },
  },
});
