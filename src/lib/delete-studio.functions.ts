import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({ studio_id: z.string().uuid() });

/**
 * Elimina definitivamente uno studio: tutti i dati associati e l'account
 * auth del proprietario. Solo super_admin.
 */
export const deleteStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Verifica super_admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) throw new Error("Solo Super Admin può eliminare studi");

    // Recupera owner per cancellare account auth
    const { data: studio } = await supabaseAdmin
      .from("studios")
      .select("owner_user_id, name")
      .eq("id", data.studio_id)
      .maybeSingle();
    if (!studio) throw new Error("Studio non trovato");

    // Cancellazione cascade dei dati via RPC SECURITY DEFINER
    const { error: rpcErr } = await supabaseAdmin.rpc("delete_studio_cascade", {
      _studio_id: data.studio_id,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    // Cancella account auth proprietario (best-effort)
    if (studio.owner_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(studio.owner_user_id).catch(() => {});
    }

    return { ok: true, name: studio.name };
  });
