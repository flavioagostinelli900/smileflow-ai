import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Sparkles, AlertTriangle, Crown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Operator, type PatientGroup } from "@/lib/api";
import { PATIENT_GROUP_EMOJI, PATIENT_GROUP_LABEL } from "@/lib/age";
import { usePermissions } from "@/lib/usePermissions";
import { useStudio } from "@/lib/useStudio";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/operators")({
  component: Operators,
  head: () => ({ meta: [{ title: "Operatori · DentAI" }] }),
});

function Operators() {
  const { canManage, loading: permissionsLoading } = usePermissions();
  const { planLabel, maxOperators, loading: studioLoading } = useStudio();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: ops = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  const [newOpen, setNewOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [patientGroup, setPatientGroup] = useState<PatientGroup>("all");
  const [saving, setSaving] = useState(false);

  if (permissionsLoading || studioLoading) {
    return <AppLayout><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4 animate-pulse text-primary" />Caricamento…</div></AppLayout>;
  }

  const count = ops.length;
  const atLimit = count >= maxOperators;
  const overLimit = count > maxOperators;

  const handleAddClick = () => {
    if (atLimit) {
      setLimitOpen(true);
      return;
    }
    setNewOpen(true);
  };

  const createOperator = async () => {
    if (!name.trim()) {
      toast.error("Inserisci un nome");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("operators").insert({
      name: name.trim(),
      role: role.trim() || null,
      online: false,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Operatore creato");
    setName(""); setRole("");
    setNewOpen(false);
    qc.invalidateQueries({ queryKey: ["operators"] });
  };

  return (
    <AppLayout>
      {!canManage && <ReadOnlyBanner className="mb-4" />}

      {overLimit && (
        <Card className="mb-4 p-4 border-amber-500/40 bg-amber-500/10">
          <div className="flex gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-amber-700 dark:text-amber-300">
                Attenzione: hai {count} operatori attivi ma il tuo piano {planLabel} prevede massimo {maxOperators} operatori.
              </div>
              <div className="text-amber-700/80 dark:text-amber-300/80 mt-1">
                Contatta il supporto DentAI per regolarizzare il tuo account.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">
            {count}/{maxOperators} operatori
            <span className="text-muted-foreground font-normal"> — Piano {planLabel}</span>
          </p>
          <p className="text-xs text-muted-foreground">Limite operatori del tuo piano</p>
        </div>
        {canManage && (
          <Button className="bg-gradient-primary" size="sm" onClick={handleAddClick}>
            <Plus className="size-4 mr-1.5" />Nuovo operatore
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ops.map((o) => (
          <Card key={o.id} className="p-5 hover:shadow-elevated transition-shadow">
            <Avatar className="size-14 mb-3">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {o.name.split(" ").slice(-2).map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{o.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{o.role ?? "—"}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {(o.departments ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <Badge className={o.online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                  ● {o.online ? "Online" : "Offline"}
                </Badge>
              </div>
              <Link to="/operators/$operatorId" params={{ operatorId: o.id }}>
                <Button variant="outline" size="sm"><Calendar className="size-3.5 mr-1" />Apri</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuovo operatore</DialogTitle>
            <DialogDescription>{count + 1}/{maxOperators} dopo la creazione</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Dr. Rossi" /></div>
            <div><Label>Ruolo</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Es. Igienista" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={saving}>Annulla</Button>
            <Button onClick={createOperator} disabled={saving} className="bg-gradient-primary">
              {saving ? "Creazione…" : "Crea operatore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="size-4 text-primary" /> Limite raggiunto
            </DialogTitle>
            <DialogDescription>
              Hai raggiunto il limite di operatori del tuo piano {planLabel} ({count}/{maxOperators}).
              Per aggiungere altri operatori effettua l'upgrade al piano superiore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLimitOpen(false)}>Annulla</Button>
            <Button
              className="bg-gradient-primary"
              onClick={() => { setLimitOpen(false); navigate({ to: "/account" }); }}
            >
              Upgrade piano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
