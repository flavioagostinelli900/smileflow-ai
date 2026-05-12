import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Sparkles, Clock, MessageSquare, CheckCircle2, Zap, GitBranch, CalendarCheck, Bot, Trash2, ArrowDown, Play, TrendingUp, Database, PlayCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type FollowupSequence, type WorkflowStep, type PatientBlock } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/usePermissions";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";

export const Route = createFileRoute("/followup")({
  component: FollowUp,
  head: () => ({ meta: [{ title: "Workflow AI · DentAI" }] }),
});

const stepMeta: Record<WorkflowStep["type"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  trigger:    { icon: Zap,           color: "from-amber-400 to-orange-500", label: "Trigger" },
  message:    { icon: MessageSquare, color: "from-emerald-400 to-teal-500", label: "Messaggio" },
  wait:       { icon: Clock,         color: "from-slate-400 to-slate-600", label: "Attesa" },
  ai_chat:    { icon: Bot,           color: "from-violet-400 to-purple-600", label: "AI conversa" },
  booking:    { icon: CalendarCheck, color: "from-blue-400 to-cyan-500",   label: "Prenotazione" },
  condition:  { icon: GitBranch,     color: "from-pink-400 to-rose-500",   label: "Condizione" },
};

const triggerOptions = [
  { value: "inactive_clients", label: "Cliente inattivo" },
  { value: "post_hygiene",     label: "Post igiene" },
  { value: "post_visit",       label: "Post visita" },
  { value: "reminder",         label: "Promemoria appuntamento" },
  { value: "missed_call",      label: "Chiamata persa" },
  { value: "vip",              label: "Cliente VIP" },
];

function FollowUp() {
  const qc = useQueryClient();
  const { canManage, loading: permissionsLoading } = usePermissions();
  const [editing, setEditing] = useState<FollowupSequence | null>(null);

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const { data, error } = await api.sequences();
      if (error) throw error;
      return (data ?? []).map((s) => ({ ...s, steps_config: (s.steps_config as WorkflowStep[]) ?? [] })) as FollowupSequence[];
    },
  });

  const toggle = async (s: FollowupSequence) => {
    if (!canManage) return;
    await supabase.from("followup_sequences").update({ active: !s.active }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["sequences"] });
  };

  const createNew = async () => {
    if (!canManage) return;
    const { data, error } = await supabase.from("followup_sequences").insert({
      name: "Nuovo workflow", target: "Da definire", trigger_type: "inactive_clients", steps: 1, active: false,
      steps_config: [{ id: crypto.randomUUID(), type: "trigger", label: "Trigger evento" }],
    }).select().single();
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["sequences"] }); setEditing({ ...data, steps_config: data.steps_config as WorkflowStep[] } as FollowupSequence); }
  };

  const totalSent = sequences.reduce((a, s) => a + (s.messages_sent || 0), 0);
  const avgConv = sequences.length ? Math.round(sequences.reduce((a, s) => a + Number(s.conversion_rate || 0), 0) / sequences.length) : 0;

  if (permissionsLoading) {
    return <AppLayout><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4 animate-pulse text-primary" />Caricamento permessi…</div></AppLayout>;
  }

  return (
    <AppLayout>
      {!canManage && <ReadOnlyBanner className="mb-4" />}
      <Tabs defaultValue="workflows" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="workflows">Workflow</TabsTrigger>
            <TabsTrigger value="blocks"><Database className="size-3.5 mr-1.5" />Blocchi DB</TabsTrigger>
            <TabsTrigger value="analytics">Conversioni</TabsTrigger>
          </TabsList>
          {canManage && <Button size="sm" className="bg-gradient-primary" onClick={createNew}><Plus className="size-4 mr-1.5" />Nuovo workflow</Button>}
        </div>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <StatMini icon={<Sparkles className="size-3.5" />} label="Workflow attivi" value={sequences.filter((s) => s.active).length} />
            <StatMini icon={<MessageSquare className="size-3.5" />} label="Messaggi automatici" value={totalSent.toLocaleString("it")} />
            <StatMini icon={<TrendingUp className="size-3.5" />} label="Conversione media" value={`${avgConv}%`} accent />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {sequences.map((s) => (
              <WorkflowCard key={s.id} seq={s} canManage={canManage} onToggle={() => toggle(s)} onEdit={() => setEditing(s)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="blocks"><BlocksTab canManage={canManage} /></TabsContent>

        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Performance per workflow</h3>
            <div className="space-y-3">
              {sequences.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground"><Sparkles className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.messages_sent} messaggi · {s.target}</div>
                  </div>
                  <div className="w-40 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-success" style={{ width: `${Math.min(100, Number(s.conversion_rate))}%` }} />
                  </div>
                  <div className="text-sm font-semibold text-success w-12 text-right">{Math.round(Number(s.conversion_rate))}%</div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <WorkflowBuilder open={!!editing && canManage} onOpenChange={(v) => !v && setEditing(null)} sequence={editing} />
    </AppLayout>
  );
}

function BlocksTab({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const { data: blocks = [] } = useQuery({
    queryKey: ["patient-blocks"],
    queryFn: async () => {
      const { data, error } = await api.patientBlocks();
      if (error) throw error;
      return (data ?? []) as PatientBlock[];
    },
  });

  const totalContacted = blocks.reduce((a, b) => a + b.contacted, 0);
  const totalPatients = blocks.reduce((a, b) => a + b.total, 0);

  const activateNext = async () => {
    if (!canManage) return;
    const next = blocks.find((b) => b.status === "pending");
    if (!next) { toast.info("Nessun blocco in attesa"); return; }
    await supabase.from("patient_blocks").update({ status: "in_progress", scheduled_for: new Date().toISOString().slice(0, 10) }).eq("id", next.id);
    toast.success(`Blocco #${next.block_number} attivato`);
    qc.invalidateQueries({ queryKey: ["patient-blocks"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Pazienti contattati</div>
          <div className="text-2xl font-semibold">{totalContacted} <span className="text-sm text-muted-foreground font-normal">/ {totalPatients}</span></div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-primary to-success" style={{ width: `${totalPatients ? (totalContacted / totalPatients) * 100 : 0}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Blocchi attivi</div>
          <div className="text-2xl font-semibold">{blocks.filter((b) => b.status === "in_progress").length}</div>
        </Card>
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Prossimo blocco</div>
            <div className="text-sm font-semibold">#{blocks.find((b) => b.status === "pending")?.block_number ?? "—"}</div>
          </div>
          {canManage && <Button size="sm" className="bg-gradient-primary" onClick={activateNext}><PlayCircle className="size-4 mr-1.5" />Attiva ora</Button>}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Blocco</th>
              <th className="text-left px-4 py-3 font-medium">Stato</th>
              <th className="text-left px-4 py-3 font-medium">Data attivazione</th>
              <th className="text-left px-4 py-3 font-medium">Avanzamento</th>
              <th className="text-left px-4 py-3 font-medium">Pazienti</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {blocks.map((b) => {
              const pct = b.total ? Math.round((b.contacted / b.total) * 100) : 0;
              return (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">Blocco #{b.block_number}</td>
                  <td className="px-4 py-3">
                    {b.status === "completed" && <Badge className="bg-success/15 text-success">Completato</Badge>}
                    {b.status === "in_progress" && <Badge className="bg-info/15 text-info">In corso</Badge>}
                    {b.status === "pending" && <Badge variant="outline">In attesa</Badge>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{b.scheduled_for ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-success" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{b.contacted} / {b.total}</td>
                </tr>
              );
            })}
            {blocks.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">Nessun blocco configurato</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function StatMini({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">{icon}{label}</div>
      <div className={cn("text-2xl font-semibold", accent && "text-success")}>{value}</div>
    </Card>
  );
}

function WorkflowCard({ seq, canManage, onToggle, onEdit }: { seq: FollowupSequence; canManage: boolean; onToggle: () => void; onEdit: () => void }) {
  return (
    <Card className="p-5 hover:shadow-elegant transition-all group">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{seq.name}</h3>
            {seq.active ? <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px] h-4">● Attivo</Badge>
              : <Badge variant="outline" className="text-[10px] h-4">Pausato</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{seq.target}</p>
        </div>
        <Switch checked={seq.active} onCheckedChange={onToggle} disabled={!canManage} />
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {seq.steps_config.map((step, i) => {
          const meta = stepMeta[step.type];
          const Icon = meta?.icon ?? Sparkles;
          return (
            <div key={step.id} className="flex items-center gap-1 shrink-0">
              <div className={cn("size-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-soft", meta?.color)} title={step.label}>
                <Icon className="size-4" />
              </div>
              {i < seq.steps_config.length - 1 && <div className="w-3 h-px bg-border" />}
            </div>
          );
        })}
        {seq.steps_config.length === 0 && <span className="text-xs text-muted-foreground">Nessuno step configurato</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
        <div><div className="text-[10px] text-muted-foreground uppercase">Step</div><div className="text-sm font-semibold">{seq.steps_config.length}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Inviati</div><div className="text-sm font-semibold">{seq.messages_sent}</div></div>
        <div><div className="text-[10px] text-muted-foreground uppercase">Conversione</div><div className="text-sm font-semibold text-success">{Math.round(Number(seq.conversion_rate))}%</div></div>
      </div>

      {canManage && <Button variant="outline" size="sm" className="w-full mt-3" onClick={onEdit}><Play className="size-3.5 mr-1.5" />Modifica workflow</Button>}
    </Card>
  );
}

function WorkflowBuilder({ open, onOpenChange, sequence }: { open: boolean; onOpenChange: (v: boolean) => void; sequence: FollowupSequence | null }) {
  const qc = useQueryClient();
  const { canManage } = usePermissions();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [trigger, setTrigger] = useState("inactive_clients");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    if (sequence) {
      setName(sequence.name); setTarget(sequence.target);
      setTrigger(sequence.trigger_type ?? "inactive_clients");
      setSteps(sequence.steps_config ?? []);
    }
  }, [sequence]);

  if (!sequence) return null;

  const addStep = (type: WorkflowStep["type"]) => {
    setSteps([...steps, { id: crypto.randomUUID(), type, label: stepMeta[type].label }]);
  };
  const removeStep = (id: string) => setSteps(steps.filter((s) => s.id !== id));
  const updateStep = (id: string, patch: Partial<WorkflowStep>) => setSteps(steps.map((s) => s.id === id ? { ...s, ...patch } : s));

  const save = async () => {
    if (!canManage) return;
    const { error } = await supabase.from("followup_sequences").update({
      name, target, trigger_type: trigger, steps: steps.length, steps_config: steps,
    }).eq("id", sequence.id);
    if (error) toast.error(error.message);
    else { toast.success("Workflow salvato"); qc.invalidateQueries({ queryKey: ["sequences"] }); onOpenChange(false); }
  };

  const remove = async () => {
    if (!canManage) return;
    if (!confirm("Eliminare questo workflow?")) return;
    await supabase.from("followup_sequences").delete().eq("id", sequence.id);
    qc.invalidateQueries({ queryKey: ["sequences"] }); onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>Workflow Builder</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Nome</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className="text-xs text-muted-foreground">Target</label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="es. Inattivi >6 mesi" /></div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trigger</label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{triggerOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="border rounded-xl p-5 bg-gradient-subtle">
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><Zap className="size-4 text-primary" />Flusso visuale</h4>
            <div className="space-y-2">
              {steps.map((step, idx) => {
                const meta = stepMeta[step.type];
                const Icon = meta?.icon ?? Sparkles;
                return (
                  <div key={step.id}>
                    <Card className="p-3 flex items-center gap-3 group hover:shadow-soft transition-shadow">
                      <div className={cn("size-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0", meta?.color)}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{meta?.label}</div>
                        <Input value={step.label} onChange={(e) => updateStep(step.id, { label: e.target.value })} className="h-7 text-sm border-0 px-0 shadow-none focus-visible:ring-0" />
                      </div>
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => removeStep(step.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </Card>
                    {idx < steps.length - 1 && (
                      <div className="flex justify-center py-1"><ArrowDown className="size-3.5 text-muted-foreground" /></div>
                    )}
                  </div>
                );
              })}
              {steps.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Aggiungi il primo step ↓</p>}
            </div>

            <div className="mt-5 pt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Aggiungi step</div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(stepMeta) as WorkflowStep["type"][]).map((t) => {
                  const meta = stepMeta[t];
                  const Icon = meta.icon;
                  return (
                    <Button key={t} size="sm" variant="outline" onClick={() => addStep(t)} className="h-8">
                      <div className={cn("size-4 rounded bg-gradient-to-br flex items-center justify-center text-white mr-1.5", meta.color)}>
                        <Icon className="size-2.5" />
                      </div>
                      {meta.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} className="flex-1 bg-gradient-primary"><CheckCircle2 className="size-4 mr-1.5" />Salva workflow</Button>
            <Button variant="outline" onClick={remove} className="text-destructive"><Trash2 className="size-4" /></Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
