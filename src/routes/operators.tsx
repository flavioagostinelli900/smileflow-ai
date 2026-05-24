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
import { Switch } from "@/components/ui/switch";
import { Plus, Calendar as CalendarIcon, Sparkles, AlertTriangle, Crown, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import type { DateRange } from "react-day-picker";
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

  // Toggle online/offline con durata
  const [pendingToggle, setPendingToggle] = useState<{ op: Operator; nextOnline: boolean } | null>(null);
  const [durationMode, setDurationMode] = useState<"always" | "custom">("always");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Auto-revert: quando status_until è passato, ribalta lo stato
  useEffect(() => {
    if (!ops.length) return;
    const now = Date.now();
    const expired = ops.filter((o) => {
      const u = (o as any).status_until as string | null | undefined;
      return u && new Date(u).getTime() <= now;
    });
    if (!expired.length) return;
    (async () => {
      for (const o of expired) {
        await supabase.from("operators").update({ online: !o.online, status_until: null }).eq("id", o.id);
      }
      qc.invalidateQueries({ queryKey: ["operators"] });
    })();
    const next = ops
      .map((o) => (o as any).status_until as string | null | undefined)
      .filter(Boolean)
      .map((u) => new Date(u!).getTime())
      .filter((t) => t > now);
    if (!next.length) return;
    const soonest = Math.min(...next);
    const timeout = setTimeout(() => qc.invalidateQueries({ queryKey: ["operators"] }), Math.max(1000, soonest - now + 500));
    return () => clearTimeout(timeout);
  }, [ops, qc]);

  const openToggleDialog = (op: Operator, nextOnline: boolean) => {
    setPendingToggle({ op, nextOnline });
    setDurationMode("always");
    setDateRange(undefined);
  };

  const confirmToggle = async () => {
    if (!pendingToggle) return;
    const { op, nextOnline } = pendingToggle;
    let status_until: string | null = null;
    if (durationMode === "custom") {
      if (!dateRange?.to) {
        toast.error("Seleziona una data di fine");
        return;
      }
      const end = new Date(dateRange.to);
      end.setHours(23, 59, 59, 999);
      status_until = end.toISOString();
    }
    const { error } = await supabase.from("operators").update({ online: nextOnline, status_until }).eq("id", op.id);
    if (error) return toast.error(error.message);
    toast.success(
      `${nextOnline ? "Online" : "Offline"}${status_until ? ` fino al ${format(new Date(status_until), "d MMM yyyy", { locale: it })}` : " (sempre)"}`,
    );
    setPendingToggle(null);
    qc.invalidateQueries({ queryKey: ["operators"] });
  };

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
      patient_group: patientGroup,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Operatore creato");
    setName(""); setRole(""); setPatientGroup("all");
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
            <p className="text-xs text-muted-foreground mb-2">{o.role ?? "—"}</p>
            <Badge variant="outline" className="text-[10px] mb-3">
              {PATIENT_GROUP_EMOJI[o.patient_group ?? "all"]} {PATIENT_GROUP_LABEL[o.patient_group ?? "all"]}
            </Badge>
            <div className="flex flex-wrap gap-1 mb-4">
              {(o.departments ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Switch
                  checked={!!o.online}
                  onCheckedChange={(checked) => {
                    if (!canManage) return;
                    openToggleDialog(o, checked);
                  }}
                  disabled={!canManage}
                  aria-label="Toggle online"
                />
                <Badge className={o.online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
                  ● {o.online ? "🟢 Online" : "🔴 Offline"}
                </Badge>
                {(o as any).status_until && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Clock className="size-3" />
                    fino al {format(new Date((o as any).status_until), "d MMM", { locale: it })}
                  </Badge>
                )}
              </div>
              <Link to="/operators/$operatorId" params={{ operatorId: o.id }}>
                <Button variant="outline" size="sm"><CalendarIcon className="size-3.5 mr-1" />Apri</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Dialog scelta durata stato */}
      <Dialog open={!!pendingToggle} onOpenChange={(o) => !o && setPendingToggle(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Imposta {pendingToggle?.nextOnline ? "🟢 Online" : "🔴 Offline"}
            </DialogTitle>
            <DialogDescription>
              {pendingToggle?.op.name} — per quanto tempo?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={durationMode === "always" ? "default" : "outline"}
                onClick={() => setDurationMode("always")}
                className={durationMode === "always" ? "bg-gradient-primary" : ""}
              >
                Sempre
              </Button>
              <Button
                variant={durationMode === "custom" ? "default" : "outline"}
                onClick={() => setDurationMode("custom")}
                className={durationMode === "custom" ? "bg-gradient-primary" : ""}
              >
                Personalizzato
              </Button>
            </div>
            {durationMode === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 size-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>{format(dateRange.from, "d MMM", { locale: it })} – {format(dateRange.to, "d MMM yyyy", { locale: it })}</>
                      ) : (
                        format(dateRange.from, "d MMM yyyy", { locale: it })
                      )
                    ) : (
                      <span>Seleziona periodo</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    locale={it}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
            {durationMode === "custom" && dateRange?.to && (
              <p className="text-xs text-muted-foreground">
                Al termine ({format(dateRange.to, "d MMM yyyy", { locale: it })}) tornerà automaticamente {pendingToggle?.nextOnline ? "Offline" : "Online"}.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingToggle(null)}>Annulla</Button>
            <Button onClick={confirmToggle} className="bg-gradient-primary">Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuovo operatore</DialogTitle>
            <DialogDescription>{count + 1}/{maxOperators} dopo la creazione</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Dr. Rossi" /></div>
            <div><Label>Ruolo</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Es. Igienista" /></div>
            <div>
              <Label>Fascia pazienti</Label>
              <Select value={patientGroup} onValueChange={(v) => setPatientGroup(v as PatientGroup)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adults">👤 Adulti</SelectItem>
                  <SelectItem value="children">👶 Bambini (Pediatrico)</SelectItem>
                  <SelectItem value="all">👥 Tutti</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
