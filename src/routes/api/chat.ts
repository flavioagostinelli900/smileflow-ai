import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

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

          const client = (conv as { client?: { first_name?: string; last_name?: string; department?: string } } | null)?.client;
          const system = `Sei Sofia, assistente AI di uno studio dentistico italiano. Tono professionale, caldo, empatico. Rispondi BREVE (max 2 frasi). Quando opportuno proponi 2 slot di appuntamento. Mai consigli medici. Paziente: ${client?.first_name ?? ""} ${client?.last_name ?? ""}, reparto: ${client?.department ?? "—"}.`;

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
