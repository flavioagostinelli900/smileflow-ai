import { useAuth } from "@/lib/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [enforced, setEnforced] = useState(false);

  // Enforce "remember me": if user did not opt in, sign out when session is from a closed/new browser session.
  useEffect(() => {
    if (loading || enforced) return;
    if (typeof window === "undefined") { setEnforced(true); return; }
    const remember = localStorage.getItem("dentai_remember") === "1";
    const alive = sessionStorage.getItem("dentai_session_alive") === "1";
    if (session && !remember && !alive) {
      supabase.auth.signOut().finally(() => {
        setEnforced(true);
        navigate({ to: "/login" });
      });
      return;
    }
    if (session) sessionStorage.setItem("dentai_session_alive", "1");
    setEnforced(true);
  }, [loading, session, enforced, navigate]);

  useEffect(() => {
    if (!loading && enforced && !session) navigate({ to: "/login" });
  }, [loading, enforced, session, navigate]);

  if (loading || !enforced || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Sparkles className="size-5 animate-pulse text-primary" />
          <span className="text-sm">Caricamento DentAI…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
