import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [{ title: "Nuova password · DentAI" }] }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("La password deve avere almeno 6 caratteri");
    if (password !== confirm) return toast.error("Le password non coincidono");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password aggiornata. Effettua di nuovo l'accesso.");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">DentAI</span>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Imposta una nuova password</h1>
            <p className="text-sm text-muted-foreground mt-1">Scegli una password sicura per il tuo account.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Nuova password</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Conferma password</Label>
            <Input type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
            Salva nuova password
          </Button>
          <Button type="button" variant="ghost" className="w-full" asChild>
            <Link to="/login">Torna al login</Link>
          </Button>
        </form>
      </Card>
    </div>
  );
}
