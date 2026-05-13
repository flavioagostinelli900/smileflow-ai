import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

export type AppRole = "super_admin" | "authorized_admin" | "studio" | "support";

const IMPERSONATE_KEY = "dentai_impersonate_studio";

export function getImpersonatedStudioId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(IMPERSONATE_KEY);
}

export function setImpersonatedStudioId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(IMPERSONATE_KEY, id);
  else localStorage.removeItem(IMPERSONATE_KEY);
  window.dispatchEvent(new Event("dentai-impersonate-change"));
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [authorizedStudios, setAuthorizedStudios] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonated, setImpersonated] = useState<string | null>(getImpersonatedStudioId());

  useEffect(() => {
    const onChange = () => setImpersonated(getImpersonatedStudioId());
    window.addEventListener("dentai-impersonate-change", onChange);
    return () => window.removeEventListener("dentai-impersonate-change", onChange);
  }, []);

  useEffect(() => {
    if (authLoading) { setLoading(true); return; }
    setRoles([]);
    setAuthorizedStudios([]);
    if (!user) { setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    (async () => {
      const [{ data: rolesData, error: rolesError }, { data: authData, error: authError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("admin_authorizations").select("studio_id").eq("admin_user_id", user.id),
      ]);
      if (cancel) return;
      setRoles(rolesError ? [] : (rolesData ?? []).map((r: { role: AppRole }) => r.role));
      setAuthorizedStudios(authError ? [] : (authData ?? []).map((a: { studio_id: string }) => a.studio_id));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [authLoading, user?.id]);

  const permissionsReady = !authLoading && !loading;
  const isSuperAdmin = permissionsReady && roles.includes("super_admin");
  const isAuthorizedAdmin = permissionsReady && (roles.includes("authorized_admin") || authorizedStudios.length > 0);
  const isStudio = permissionsReady && !isSuperAdmin && !isAuthorizedAdmin;

  // Quando un super admin impersona uno studio, l'UI si comporta come uno studio
  const effectiveCanManage = permissionsReady && isSuperAdmin && !impersonated
    ? true
    : isAuthorizedAdmin && !impersonated
      ? true
      : false;

  return {
    loading: !permissionsReady,
    roles,
    isSuperAdmin,
    isAuthorizedAdmin,
    isStudio,
    canManage: effectiveCanManage,
    impersonatedStudioId: impersonated,
    setImpersonated: setImpersonatedStudioId,
  };
}
