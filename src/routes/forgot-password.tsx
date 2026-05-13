import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
  head: () => ({ meta: [{ title: "Recupero password · DentAI" }] }),
});

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
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

        {sent ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="size-12 text-success mx-auto" />
            <h1 className="text-xl font-semibold">Email inviata</h1>
            <p className="text-sm text-muted-foreground">
              Controlla la tua casella e segui le istruzioni per reimpostare la password.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
              Torna al login
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Recupero password</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ti invieremo un link per reimpostare la password all'indirizzo email del tuo account.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
              Invia link di recupero
            </Button>
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to="/login">Torna al login</Link>
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
