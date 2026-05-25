// Server-side helper to authenticate /api/* routes via Bearer JWT.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function authenticateRequest(request: Request): Promise<
  | { ok: true; userId: string; supabase: ReturnType<typeof createClient<Database>> }
  | { ok: false; response: Response }
> {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }

  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) {
    return { ok: false, response: new Response("Server misconfigured", { status: 500 }) };
  }

  const supabase = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return { ok: false, response: new Response("Unauthorized", { status: 401 }) };
  }
  return { ok: true, userId: data.claims.sub, supabase };
}

export function genericError(): Response {
  return new Response(JSON.stringify({ error: "INTERNAL_ERROR" }), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
}
