import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().trim().min(1).max(160),
  role: z.enum(["super_admin", "authorized_admin", "support"]),
  studio_ids: z.array(z.string().uuid()).max(200).optional().default([]),
});

/**
 * Crea un account staff interno usando la Admin API.
 * - super_admin: può creare super_admin, authorized_admin, support
 * - authorized_admin: può creare solo authorized_admin e support
 */
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verifica permessi del chiamante
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(`Verifica permessi fallita: ${rolesErr.message}`);
    const callerRoles = (roles ?? []).map((r) => r.role);
    const isSuper = callerRoles.includes("super_admin");
    const isAuthorized = callerRoles.includes("authorized_admin");
    if (!isSuper && !isAuthorized) {
      throw new Error("Permessi insufficienti per creare membri staff");
    }
    if (data.role === "super_admin" && !isSuper) {
      throw new Error("Solo Super Admin può creare altri Super Admin");
    }


    // Crea utente Auth con password preimpostata ed email pre-confermata
    let newUserId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        requires_password_change: true,
        staff_role: data.role,
      },
    });

    if (createErr) {
      if (/already (registered|exists)|duplicate/i.test(createErr.message)) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) throw new Error(`Lookup utente fallito: ${listErr.message}`);
        const existing = list.users.find(
          (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );
        if (!existing) throw new Error(`Creazione utente fallita: ${createErr.message}`);
        newUserId = existing.id;
        const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: data.password,
          email_confirm: true,
          user_metadata: {
            ...(existing.user_metadata ?? {}),
            full_name: data.full_name,
            requires_password_change: true,
            staff_role: data.role,
          },
        });
        if (updErr) throw new Error(`Aggiornamento password fallito: ${updErr.message}`);
      } else {
        throw new Error(`Creazione utente fallita: ${createErr.message}`);
      }
    } else {
      newUserId = created.user?.id ?? null;
    }
    if (!newUserId) throw new Error("Creazione utente fallita: id mancante");

    // Profilo
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.full_name });

    // Reset ruoli precedenti staff e assegna il nuovo ruolo
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId)
      .in("role", ["super_admin", "authorized_admin", "support", "studio"]);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: data.role });
    if (roleErr) throw new Error(`Assegnazione ruolo fallita: ${roleErr.message}`);

    // Autorizzazioni per gli studi selezionati
    await supabaseAdmin.from("admin_authorizations").delete().eq("admin_user_id", newUserId);
    if (data.studio_ids.length > 0) {
      const rows = data.studio_ids.map((studio_id) => ({
        admin_user_id: newUserId!,
        studio_id,
        granted_by: userId,
      }));
      const { error: authErr } = await supabaseAdmin
        .from("admin_authorizations")
        .insert(rows);
      if (authErr) throw new Error(`Autorizzazioni studi fallite: ${authErr.message}`);
    }

    return { user_id: newUserId };
  });
