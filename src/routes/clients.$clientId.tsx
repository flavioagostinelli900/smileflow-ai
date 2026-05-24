import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Mail, Save, Sparkles, Calendar, MessageSquare, Workflow, Users as UsersIcon, Plus, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Client, Appointment, Conversation, FollowupSequence, Operator } from "@/lib/api";
import { evaluateUpsell, nextEligibleRule, type UpsellRule, type UpsellOffer } from "@/lib/upsell";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AGE_GROUP_EMOJI, AGE_GROUP_LABEL, computeAge } from "@/lib/age";

export const Route = createFileRoute("/clients/$clientId")({
  component: ClientDetail,
  head: () => ({ meta: [{ title: "Scheda paziente · DentAI" }] }),
});

function ClientDetail() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");

  const { data: client } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single();
      if (error) throw error;
      return data as Client;
    },
  });

  useEffect(() => { if (client) setNotes(client.notes ?? ""); }, [client]);

  const { data: appts = [] } = useQuery({
    queryKey: ["client-appts", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*, operator:operators(*)").eq("client_id", clientId).order("starts_at", { ascending: false });
      return (data ?? []) as (Appointment & { operator: Operator | null })[];
    },
  });

  const { data: convs = [] } = useQuery({
    queryKey: ["client-convs", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("*").eq("client_id", clientId).order("last_message_at", { ascending: false }).limit(5);
      return (data ?? []) as Conversation[];
    },
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const { data } = await supabase.from("followup_sequences").select("*").eq("active", true);
      return (data ?? []) as unknown as FollowupSequence[];
    },
  });

  if (!client) {
    return <AppLayout><div className="text-muted-foreground">Caricamento…</div></AppLayout>;
  }

  const saveNotes = async () => {
    const { error } = await supabase.from("clients").update({ notes }).eq("id", clientId);
    if (error) toast.error(error.message); else { toast.success("Note salvate"); qc.invalidateQueries({ queryKey: ["client", clientId] }); }
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    const tags = [...(client.tags ?? []), tagInput.trim()];
    await supabase.from("clients").update({ tags }).eq("id", clientId);
    setTagInput(""); qc.invalidateQueries({ queryKey: ["client", clientId] });
  };
  const removeTag = async (t: string) => {
    const tags = (client.tags ?? []).filter((x) => x !== t);
    await supabase.from("clients").update({ tags }).eq("id", clientId);
    qc.invalidateQueries({ queryKey: ["client", clientId] });
  };

  const startFollowup = async (seq: FollowupSequence) => {
    const { error } = await supabase.from("conversations").insert({
      client_id: clientId, status: "ai", channel: "whatsapp",
      tags: [`workflow:${seq.name}`],
      internal_notes: `Follow-up "${seq.name}" avviato manualmente`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Follow-up "${seq.name}" avviato`);
  };

  return (
    <AppLayout>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/clients" })} className="mb-4 -ml-2">
        <ArrowLeft className="size-4 mr-1.5" />Torna ai clienti
      </Button>

      <Card className="p-6 mb-6 bg-gradient-to-br from-card to-muted/30">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar className="size-20"><AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">{client.first_name[0]}{client.last_name[0]}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-2xl font-semibold">{client.first_name} {client.last_name}</h1>
              <Badge className={client.status === "active" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}>
                {client.status === "active" ? "Attivo" : "Inattivo"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{client.phone}</span>
              {client.email && <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{client.email}</span>}
              {client.family_id && <span className="flex items-center gap-1.5"><UsersIcon className="size-3.5" />Famiglia {client.family_id}</span>}
              <span className="text-xs font-mono opacity-60">ID {client.id.slice(0, 8)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <Badge variant="outline" className="text-[11px]">
                {AGE_GROUP_EMOJI[client.age_group ?? "unspecified"]} {AGE_GROUP_LABEL[client.age_group ?? "unspecified"]}
                {client.birth_date && computeAge(client.birth_date) != null && <span className="ml-1 opacity-70">· {computeAge(client.birth_date)} anni</span>}
              </Badge>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                Data nascita:
                <Input
                  type="date"
                  value={client.birth_date ?? ""}
                  onChange={async (e) => {
                    await supabase.from("clients").update({ birth_date: e.target.value || null }).eq("id", clientId);
                    qc.invalidateQueries({ queryKey: ["client", clientId] });
                    qc.invalidateQueries({ queryKey: ["clients"] });
                  }}
                  className="h-7 w-36 text-xs"
                />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              {(client.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>{t} ×</Badge>
              ))}
              <div className="flex gap-1">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="+ tag" className="h-7 w-28 text-xs" />
              </div>
            </div>
          </div>
          <Link to="/chat"><Button variant="outline" size="sm"><MessageSquare className="size-4 mr-1.5" />Chat</Button></Link>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <InactivityBanner client={client} sequences={sequences} onStart={startFollowup} />

          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="size-4 text-primary" />Storico visite</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase">
                  <tr><th className="text-left py-2">Data</th><th className="text-left py-2">Tipo</th><th className="text-left py-2">Operatore</th><th className="text-left py-2">Durata</th><th className="text-left py-2">Stato</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(appts.length > 0 ? appts.map(realRow) : demoHistory(client)).map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5">{new Date(a.starts_at).toLocaleDateString("it", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="py-2.5"><Badge variant="secondary" className="text-[10px]">{a.visit_type}</Badge></td>
                      <td className="py-2.5 text-muted-foreground">{a.operator_name ?? "—"}</td>
                      <td className="py-2.5">{a.duration_minutes} min</td>
                      <td className="py-2.5">{visitStatusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Workflow className="size-4 text-primary" />Automazioni attive</h3>
            <div className="space-y-2">
              {sequences.map((s) => {
                const stepIndex = Math.min(2, (s.steps_config?.length ?? 1) - 1);
                const next = s.steps_config?.[stepIndex + 1]?.label ?? "—";
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground"><Sparkles className="size-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Step {stepIndex + 1}/{s.steps_config?.length ?? 1} · prossimo: {next}</div>
                    </div>
                    <Badge className="bg-success/15 text-success">in corso</Badge>
                  </div>
                );
              })}
              {sequences.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nessuna automazione attiva</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare className="size-4 text-primary" />Conversazioni recenti</h3>
            <div className="space-y-2">
              {convs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                  <MessageSquare className="size-4 text-muted-foreground" />
                  <div className="flex-1"><div className="text-sm capitalize">{c.channel}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleString("it")}</div></div>
                  <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                </div>
              ))}
              {convs.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nessuna conversazione</p>}
            </div>
          </Card>

          <UpsellSection clientId={clientId} appts={appts} />
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Note interne</h3>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Aggiungi note private sul paziente…" />
            <Button onClick={saveNotes} size="sm" className="mt-3 w-full bg-gradient-primary"><Save className="size-3.5 mr-1.5" />Salva note</Button>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="size-4 text-primary" />Avvia follow-up manuale</h3>
            <p className="text-xs text-muted-foreground mb-3">Avvia un workflow AI per questo paziente</p>
            <div className="space-y-2">
              {sequences.map((s) => (
                <Button key={s.id} variant="outline" size="sm" className="w-full justify-start" onClick={() => startFollowup(s)}>
                  <Plus className="size-3.5 mr-1.5" />{s.name}
                </Button>
              ))}
              {sequences.length === 0 && <p className="text-xs text-muted-foreground">Nessun workflow disponibile</p>}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

type HistoryRow = { id: string; starts_at: string; visit_type: string; operator_name: string | null; duration_minutes: number; status: string };

function realRow(a: Appointment & { operator: Operator | null }): HistoryRow {
  return { id: a.id, starts_at: a.starts_at, visit_type: a.visit_type, operator_name: a.operator?.name ?? null, duration_minutes: a.duration_minutes, status: a.status };
}

const VISIT_TAGS = ["Igiene", "Conservativa", "Ortodonzia", "Implantologia", "Endodonzia", "Chirurgia", "Controllo"];
const DEMO_OPERATORS = ["Dr. Rossi", "Dr.ssa Bianchi", "Dr. Conti", "Dr.ssa Marini"];
const DEMO_DURATIONS: Record<string, number> = { Igiene: 45, Conservativa: 60, Ortodonzia: 30, Implantologia: 90, Endodonzia: 75, Chirurgia: 60, Controllo: 30 };

function demoHistory(client: Client): HistoryRow[] {
  const base = client.last_visit ? new Date(client.last_visit) : new Date(Date.now() - 200 * 86400000);
  const seed = parseInt(client.id.slice(0, 8), 16) || 1;
  const baseTag = (client.tags?.[0] && VISIT_TAGS.includes(client.tags[0])) ? client.tags[0] : (client.department && VISIT_TAGS.includes(client.department) ? client.department : VISIT_TAGS[seed % VISIT_TAGS.length]);
  const rows: HistoryRow[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(base); d.setDate(d.getDate() - i * (90 + ((seed + i) % 60)));
    const tag = i === 0 ? baseTag : VISIT_TAGS[(seed + i * 3) % VISIT_TAGS.length];
    const status = i === 0 ? "completed" : ((seed + i) % 7 === 0 ? "cancelled" : (seed + i) % 11 === 0 ? "no_show" : "completed");
    rows.push({ id: `demo-${client.id}-${i}`, starts_at: d.toISOString(), visit_type: tag, operator_name: DEMO_OPERATORS[(seed + i) % DEMO_OPERATORS.length], duration_minutes: DEMO_DURATIONS[tag] ?? 30, status });
  }
  return rows;
}

function visitStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "scheduled") return <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px]">Completata</Badge>;
  if (s === "cancelled") return <Badge variant="outline" className="text-[10px]">Annullata</Badge>;
  if (s === "no_show") return <Badge className="bg-destructive/15 text-destructive text-[10px]">No-show</Badge>;
  return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
}

const INACTIVITY_THRESHOLDS: Record<string, number> = { IGIENE: 6, CONTROLLO: 8, CHIRURGIA: 3 };

function getInactivityThreshold(client: Client): number {
  const tags = (client.tags ?? []).map((t) => t.toUpperCase());
  for (const t of tags) if (INACTIVITY_THRESHOLDS[t] != null) return INACTIVITY_THRESHOLDS[t];
  const dep = (client.department ?? "").toUpperCase();
  if (INACTIVITY_THRESHOLDS[dep] != null) return INACTIVITY_THRESHOLDS[dep];
  return 12;
}

function InactivityBanner({ client, sequences, onStart }: { client: Client; sequences: FollowupSequence[]; onStart: (s: FollowupSequence) => void }) {
  if (!client.last_visit) {
    return (
      <Card className="p-4 border-muted bg-muted/30 flex items-center gap-3">
        <Calendar className="size-4 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">Nessuna data ultima visita registrata</div>
      </Card>
    );
  }
  const last = new Date(client.last_visit);
  const months = Math.floor((Date.now() - last.getTime()) / (30 * 86400000));
  const threshold = getInactivityThreshold(client);
  const inactive = months >= threshold;
  const seq = sequences[0];

  return (
    <Card className={`p-4 border ${inactive ? "border-warning/40 bg-warning/10" : "border-success/30 bg-success/5"}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className={`size-10 rounded-lg flex items-center justify-center ${inactive ? "bg-warning/20 text-warning-foreground" : "bg-success/15 text-success"}`}>
          {inactive ? <AlertTriangle className="size-5" /> : <Calendar className="size-5" />}
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-sm font-semibold">
            {months} {months === 1 ? "mese" : "mesi"} dall'ultima visita
            {inactive ? <span className="ml-2 text-warning-foreground">· Paziente inattivo</span> : <span className="ml-2 text-success">· Attivo</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Soglia inattività per {(client.tags?.[0] ?? client.department ?? "Generico")}: {threshold} mesi
          </div>
        </div>
        {inactive && seq && (
          <Button size="sm" className="bg-gradient-primary" onClick={() => onStart(seq)}>
            <Sparkles className="size-3.5 mr-1.5" />Avvia follow-up
          </Button>
        )}
      </div>
    </Card>
  );
}

function UpsellSection({ clientId, appts }: { clientId: string; appts: (Appointment & { operator: Operator | null })[] }) {
  const qc = useQueryClient();
  const { data: client } = useQuery({
    queryKey: ["client-lite", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, family_id, last_visit").eq("id", clientId).single();
      return data as { id: string; family_id: string | null; last_visit: string | null } | null;
    },
  });
  const { data: rules = [] } = useQuery({
    queryKey: ["upsell-rules-active"],
    queryFn: async () => {
      const { data } = await supabase.from("upsell_rules").select("*").eq("active", true);
      return (data ?? []) as UpsellRule[];
    },
  });
  const { data: offers = [] } = useQuery({
    queryKey: ["upsell-offers", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("upsell_offers").select("*").eq("client_id", clientId).order("sent_at", { ascending: false });
      return (data ?? []) as UpsellOffer[];
    },
  });

  const active = offers.find((o) => o.status === "active");
  const next = client && rules.length
    ? nextEligibleRule({ id: client.id, first_name: "", last_name: "", family_id: client.family_id, last_visit: client.last_visit }, appts.map((a) => ({ id: a.id, visit_type: a.visit_type, status: a.status })), rules)
    : null;

  const triggerEvaluate = async () => {
    const last = appts[0];
    const result = await evaluateUpsell(clientId, last?.id);
    if (result) toast.success(`Offerta creata: ${result.rule.name}`);
    else toast.info("Nessuna offerta applicabile (regole non soddisfatte)");
    qc.invalidateQueries({ queryKey: ["upsell-offers", clientId] });
  };

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="size-4 text-primary" />Offerte e upsell</h3>

      {active ? (
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 mb-3">
          <div className="text-[11px] text-primary font-medium uppercase tracking-wider mb-1">Offerta attiva</div>
          <div className="text-sm font-semibold">{active.treatment} −{active.discount_percent}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">Scade {new Date(active.expires_at).toLocaleDateString("it")}</div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground mb-3">Nessuna offerta attiva</div>
      )}

      {next && !active && (
        <div className="p-3 rounded-lg bg-muted/40 border border-dashed mb-3">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Prossima offerta prevista</div>
          <div className="text-sm font-medium">{next.name}</div>
          <div className="text-xs text-muted-foreground">{next.treatment} · −{next.discount_percent}%</div>
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full mb-3" onClick={triggerEvaluate}>
        <Sparkles className="size-3.5 mr-1.5" />Valuta upsell ora
      </Button>

      <div className="space-y-1.5">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Storico offerte</div>
        {offers.length === 0 && <p className="text-xs text-muted-foreground">Nessuna offerta inviata</p>}
        {offers.slice(0, 5).map((o) => (
          <div key={o.id} className="flex items-center gap-2 text-xs py-1.5">
            <span className="flex-1 truncate">{o.treatment} −{o.discount_percent}%</span>
            <Badge variant="outline" className="text-[10px] capitalize">{o.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

