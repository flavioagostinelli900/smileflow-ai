import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { generateText } from "ai";
import { authenticateRequest, genericError } from "@/lib/api-auth";

const TAGS = ["IGIENE", "CONTROLLO", "CHIRURGIA", "ORTODONZIA", "IMPLANTOLOGIA", "CONSERVATIVA"];

export const Route = createFileRoute("/api/tag-clients")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const auth = await authenticateRequest(request);
          if (!auth.ok) return auth.response;

          const { rows } = (await request.json()) as { rows: { name: string; notes: string }[] };
          if (!Array.isArray(rows)) return new Response("rows required", { status: 400 });
          if (rows.length > 200) return new Response("too many rows", { status: 400 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return genericError();

          const gateway = createLovableAiGatewayProvider(key);
          const list = rows.map((r, i) => `${i}|${r.name}|${(r.notes || "").replace(/\n/g, " ").slice(0, 200)}`).join("\n");
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: `Sei un classificatore. Per ogni riga (indice|nome|note) assegna UN tag tra: ${TAGS.join(", ")}. Rispondi SOLO con righe formato "indice:TAG", una per riga, senza altro testo.`,
            prompt: list,
          });

          const map: Record<number, string> = {};
          text.split("\n").forEach((line) => {
            const m = line.match(/(\d+)\s*[:\-|]\s*([A-Z]+)/);
            if (m && TAGS.includes(m[2])) map[Number(m[1])] = m[2];
          });
          const tags = rows.map((_, i) => map[i] || "CONTROLLO");
          return Response.json({ tags });
        } catch (e) {
          console.error("tag error", e);
          return genericError();
        }
      },
    },
  },
});

