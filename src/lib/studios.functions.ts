import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateStudioSchema = z.object({
  studio_id: z.string().uuid(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  first_name: z.string().trim().max(120).optional(),
});

/**
 * Crea l'utente Supabase Auth per uno studio appena creato, lo collega
 * alla riga studios e assegna il ruolo 'studio'. La password viene impostata
 * tramite Admin API e l'email è pre-confermata (nessuna mail di verifica).
 * Solo super_admin / authorized_admin possono invocare.
 */
export const createStudioAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateStudioSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verifica chiamante (super_admin o authorized_admin)
    const { data: roles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (rolesErr) throw new Error(`Verifica permessi fallita: ${rolesErr.message}`);
    const isStaff = (roles ?? []).some(
      (r) => r.role === "super_admin" || r.role === "authorized_admin",
    );
    if (!isStaff) throw new Error("Permesso negato");

    // Crea utente con password e email pre-confermata
    let newUserId: string | null = null;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.first_name ?? data.email.split("@")[0],
        requires_password_change: true,
        studio_id: data.studio_id,
      },
    });

    if (createErr) {
      // Email già registrata → recuperiamo l'utente esistente e ne aggiorniamo la password
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
            full_name: data.first_name ?? existing.user_metadata?.full_name ?? data.email,
            requires_password_change: true,
            studio_id: data.studio_id,
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

    // Profilo (handle_new_user di solito lo crea; upsert è sicuro)
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.first_name ?? data.email });

    // Imposta il ruolo 'studio' (rimuovendo eventuali ruoli del trigger)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "studio", studio_id: data.studio_id });
    if (roleErr) throw new Error(`Assegnazione ruolo fallita: ${roleErr.message}`);

    // Collega lo studio al proprietario
    const { error: linkErr } = await supabaseAdmin
      .from("studios")
      .update({ owner_user_id: newUserId })
      .eq("id", data.studio_id);
    if (linkErr) throw new Error(`Collegamento studio fallito: ${linkErr.message}`);

    return { user_id: newUserId };
  });
