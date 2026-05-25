import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { authenticateRequest, genericError } from "@/lib/api-auth";

type ChatMsg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/sofia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await authenticateRequest(request);
          if (!auth.ok) return auth.response;

          const { messages } = (await request.json()) as { messages: ChatMsg[] };
          if (!Array.isArray(messages)) {
            return new Response("messages required", { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return genericError();

          const system =
            "Sei Sofia, l'assistente virtuale di DentAI, una piattaforma SaaS per studi dentistici. " +
            "Aiuti gli utenti (titolari e staff degli studi clienti) con domande sull'uso della piattaforma: " +
            "WhatsApp AI, prenotazioni, follow-up, fatturazione, configurazione. " +
            "Tono caldo, professionale, conciso (max 3-4 frasi). Usa l'italiano. " +
            "Non dare consigli clinici. Se l'utente chiede esplicitamente di parlare con un operatore umano, " +
            "rispondi che stai aprendo un ticket per il team.";

          const history = messages
            .map((m) => `${m.role === "user" ? "Utente" : "Sofia"}: ${m.content}`)
            .join("\n");

          const gateway = createLovableAiGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("google/gemini-2.5-flash"),
            system,
            prompt: `Conversazione finora:\n${history}\n\nRispondi come Sofia all'ultimo messaggio dell'utente.`,
          });
          return Response.json({ reply: text });
        } catch (e) {
          console.error("Sofia error", e);
          return genericError();
        }
      },
    },
  },
});

