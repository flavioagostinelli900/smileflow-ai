import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { authenticateRequest, genericError } from "@/lib/api-auth";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

export const Route = createFileRoute("/api/sofia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = await authenticateRequest(request);
          if (!auth.ok) return auth.response;

          const json = await request.json().catch(() => null);
          const parsed = BodySchema.safeParse(json);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({ error: "INVALID_INPUT" }),
              { status: 400, headers: { "content-type": "application/json" } },
            );
          }
          const { messages } = parsed.data;

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
