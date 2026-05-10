import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

const CLINICAL_SPECIFIC_PATTERNS = [
  /impiant[io]/i,
  /implantologia/i,
  /osso|rigenerazione|innesto/i,
  /dolore|gonfiore|sanguin|infezion|ascesso/i,
  /antibiotic|farmac|medicin/i,
  /diagnos|terapia|preventivo preciso/i,
  /radiografia|tac|ortopanoramica/i,
];

function isClinicalSpecificQuestion(message: string) {
  const text = message.trim();
  if (!text) return false;
  return CLINICAL_SPECIFIC_PATTERNS.some((pattern) => pattern.test(text));
}

async function createControlVisitAndReply({
  supabase,
  conversationId,
  clientId,
  clientName,
  futureControl,
}: {
  supabase: ReturnType<typeof createClient>;
  conversationId: string;
  clientId: string;
  clientName?: string;
  futureControl?: { starts_at?: string | null } | null;
}) {
  if (futureControl?.starts_at) {
    return `Certo${clientName ? ` ${clientName}` : ""}, per queste informazioni serve prima una visita di controllo. Ho già una prenotazione aperta per te il ${new Date(futureControl.starts_at).toLocaleString("it", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}.`;
  }

  const starts = new Date();
  starts.setDate(starts.getDate() + 2);
  starts.setHours(10, 0, 0, 0);

  const { data: operator } = await supabase.from("operators").select("id").limit(1).maybeSingle();
  await supabase.from("appointments").insert({
    client_id: clientId,
    operator_id: operator?.id ?? null,
    visit_type: "Controllo",
    duration_minutes: 30,
    starts_at: starts.toISOString(),
    status: "scheduled",
    source: "ai_chat",
    notes: `Prenotazione automatica da chat ${conversationId}: nuovo cliente con richiesta clinica specifica.`,
  });

  return `Certo${clientName ? ` ${clientName}` : ""}, per queste informazioni serve prima una visita di controllo. Ti ho prenotato un controllo per ${starts.toLocaleString("it", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}; se preferisci un altro orario ti richiama la segreteria.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { conversationId } = (await request.json()) as { conversationId: string };
          if (!conversationId) return new Response("conversationId required", { status: 400 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const supabase = createClient(
            process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
          );

          const { data: conv } = await supabase
            .from("conversations")
            .select("*, client:clients(*)")
            .eq("id", conversationId)
            .single();
          const { data: msgs } = await supabase
            .from("messages")
            .select("sender, content")
            .eq("conversation_id", conversationId)
            .order("created_at");

          const client = (conv as { client_id?: string | null; tags?: string[]; internal_notes?: string | null; client?: { id?: string; first_name?: string; last_name?: string; department?: string } } | null)?.client;
          const clientId = (conv as { client_id?: string | null } | null)?.client_id ?? client?.id ?? null;
          const { data: appts } = clientId
            ? await supabase.from("appointments").select("id, starts_at, status, visit_type").eq("client_id", clientId).order("starts_at", { ascending: false })
            : { data: [] };
          const lastClientMessage = [...(msgs ?? [])].reverse().find((m) => m.sender === "client")?.content ?? "";
          const asksClinicalSpecifics = isClinicalSpecificQuestion(lastClientMessage);
          const completedVisits = (appts ?? []).filter((a) => String(a.status).toLowerCase() === "completed").length;
          const futureControl = (appts ?? []).find((a) => new Date(a.starts_at) > new Date() && String(a.status).toLowerCase() !== "cancelled");

          if (asksClinicalSpecifics) {
            const reply = clientId && completedVisits === 0
              ? await createControlVisitAndReply({ supabase, conversationId, clientId, clientName: client?.first_name, futureControl })
              : "Capisco, per domande così specifiche è meglio parlare al telefono con la segreteria prima di procedere. Ti faccio richiamare così raccogliamo bene le informazioni e fissiamo il percorso corretto.";

            await supabase.from("messages").insert({ conversation_id: conversationId, sender: "ai", content: reply });
            await supabase.from("conversations").update({
              status: clientId && completedVisits === 0 ? "booked" : "operator",
              tags: Array.from(new Set([...(conv as { tags?: string[] } | null)?.tags ?? [], "richiesta-clinica", ...(clientId && completedVisits === 0 ? ["nuovo-cliente", "controllo-prenotato"] : ["richiamare-segreteria"])])),
              internal_notes: `${(conv as { internal_notes?: string | null } | null)?.internal_notes ?? ""}\nRichiesta clinica specifica intercettata dall'AI: richiamo telefonico segreteria.`.trim(),
              last_message_at: new Date().toISOString(),
            }).eq("id", conversationId);

            return Response.json({ reply });
          }

          const system = `Sei Sofia, assistente AI di uno studio dentistico italiano. Tono professionale, caldo, empatico. Rispondi BREVE (max 2 frasi). Quando opportuno proponi 2 slot di appuntamento. Mai consigli medici. Se il paziente chiede dettagli clinici specifici su impianti, dolore, infezioni, farmaci, diagnosi o descrive un problema complesso, non spiegare la terapia: passa alla segreteria telefonica. Se è un nuovo cliente, indirizza a una visita di controllo. Paziente: ${client?.first_name ?? ""} ${client?.last_name ?? ""}, reparto: ${client?.department ?? "—"}. Visite completate: ${completedVisits}.`;

          const history = (msgs ?? [])
            .map((m) => `${m.sender === "client" ? "Paziente" : m.sender === "ai" ? "Sofia" : m.sender}: ${m.content}`)
            .join("\n");

          const gateway = createLovableAiGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system,
            prompt: `Conversazione finora:\n${history}\n\nRispondi come Sofia al messaggio più recente del paziente.`,
          });

          await supabase.from("messages").insert({ conversation_id: conversationId, sender: "ai", content: text });
          await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

          return Response.json({ reply: text });
        } catch (e) {
          console.error("AI error", e);
          return new Response((e as Error).message, { status: 500 });
        }
      },
    },
  },
});
