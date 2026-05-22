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
 * Creates the auth user for a freshly-created studio, attaches it to the studio
 * row and assigns the 'studio' role. Email is pre-confirmed so no verification
 * mail is sent. Only super_admins / authorized admins may invoke this.
 */
export const createStudioAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateStudioSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // Verify caller is staff (super_admin or authorized_admin)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isStaff = (roles ?? []).some((r) => r.role === "super_admin" || r.role === "authorized_admin");
    if (!isStaff) throw new Error("Permesso negato");

    // Create the user without email confirmation flow
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // pre-confirmed: no verification email
      user_metadata: {
        full_name: data.first_name ?? data.email.split("@")[0],
        requires_password_change: true,
        studio_id: data.studio_id,
      },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Creazione utente fallita");

    const newUserId = created.user.id;

    // Ensure profile exists (handle_new_user trigger usually does this; upsert is safe)
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: newUserId, full_name: data.first_name ?? data.email });

    // Assign 'studio' role (replace whatever promote_first_user trigger inserted)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "studio", studio_id: data.studio_id });
    if (roleErr) throw new Error(roleErr.message);

    // Link studio -> owner
    await supabaseAdmin.from("studios").update({ owner_user_id: newUserId }).eq("id", data.studio_id);

    return { user_id: newUserId };
  });
