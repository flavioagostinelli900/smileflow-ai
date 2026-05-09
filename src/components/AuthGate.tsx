import { useAuth } from "@/lib/useAuth";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
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
