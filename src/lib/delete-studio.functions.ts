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
    const { userId, supabase } = context;

    // Verifica super_admin lato server (difesa in profondità)
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(`Verifica permessi fallita: ${rolesErr.message}`);
    const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isSuper) throw new Error("Solo Super Admin può eliminare studi");

    // Recupera owner per cancellare account auth
    const { data: studio, error: stErr } = await supabaseAdmin
      .from("studios")
      .select("owner_user_id, name")
      .eq("id", data.studio_id)
      .maybeSingle();
    if (stErr) throw new Error(`Lettura studio fallita: ${stErr.message}`);
    if (!studio) throw new Error("Studio non trovato");

    // Cancellazione cascade dei dati via RPC SECURITY DEFINER.
    // IMPORTANTE: chiamiamo l'RPC con il client autenticato dell'utente,
    // perché la funzione verifica is_super_admin(auth.uid()). Con il
    // service-role client auth.uid() è NULL e il controllo fallirebbe.
    const { error: rpcErr } = await supabase.rpc("delete_studio_cascade", {
      _studio_id: data.studio_id,
    });
    if (rpcErr) throw new Error(`Eliminazione dati fallita: ${rpcErr.message}`);

    // Cancella account auth proprietario (best-effort, non blocchiamo se manca)
    if (studio.owner_user_id) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
        studio.owner_user_id,
      );
      if (authErr && !/not.?found/i.test(authErr.message)) {
        // Dati già eliminati: segnaliamo ma non rolliamo back.
        console.warn("[deleteStudio] deleteUser warning:", authErr.message);
      }
    }

    return { ok: true, name: studio.name };
  });
