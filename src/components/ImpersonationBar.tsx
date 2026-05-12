import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/lib/usePermissions";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ImpersonationBar() {
  const { impersonatedStudioId, setImpersonated, isSuperAdmin, isAuthorizedAdmin } = usePermissions();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    if (!impersonatedStudioId) return;
    supabase.from("studios").select("name").eq("id", impersonatedStudioId).maybeSingle()
      .then(({ data }) => setName((data as { name?: string } | null)?.name ?? ""));
  }, [impersonatedStudioId]);

  if (!impersonatedStudioId || !(isSuperAdmin || isAuthorizedAdmin)) return null;

  return (
    <div className="flex items-center gap-2 px-4 md:px-8 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
      <Eye className="size-4" />
      <span>Stai gestendo lo studio: <strong>{name || impersonatedStudioId}</strong></span>
      <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setImpersonated(null)}>
        <X className="size-3.5 mr-1" /> Esci
      </Button>
    </div>
  );
}
