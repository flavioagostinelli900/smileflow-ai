import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Accedi · DentAI" }] }),
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const applyRememberFlag = () => {
    if (typeof window === "undefined") return;
    if (remember) localStorage.setItem("dentai_remember", "1");
    else localStorage.removeItem("dentai_remember");
    sessionStorage.setItem("dentai_session_alive", "1");
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      return toast.error(
        "Email o password non corretti. Verifica le tue credenziali e riprova o contatta il supporto DentAI.",
      );
    }
    applyRememberFlag();
    toast.success("Bentornato!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gradient-subtle">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="relative flex items-center gap-2.5">
          <div className="size-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <span className="font-semibold text-lg">DentAI</span>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight mb-3">
            La piattaforma AI che recupera i tuoi pazienti.
          </h2>
          <p className="text-primary-foreground/80 text-sm max-w-md">
            Follow-up automatici, chat WhatsApp intelligenti, recupero chiamate perse e
            prenotazioni gestite dall'AI. Tutto in un'unica dashboard.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Accedi al tuo studio</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci pazienti, chat AI e prenotazioni.
            </p>
          </div>

          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
                Ricordami per 30 giorni
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Password dimenticata?
              </Link>
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              Accedi
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-6">
            Gli account vengono creati esclusivamente dal team DentAI. Per richiedere un accesso
            contatta il supporto.
          </p>
        </Card>
      </div>
    </div>
  );
}
