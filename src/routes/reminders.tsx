import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, XCircle, Clock, CalendarClock, MessageCircle, Sparkles, ArrowRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { api, type Reminder, type Client } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/reminders")({
  component: Reminders,
  head: () => ({ meta: [{ title: "Reminder · DentAI" }] }),
});

type ReminderRow = Reminder & { client: Client | null };

const statusBadge = (s: Reminder["status"]) => {
  switch (s) {
    case "sent": return <Badge className="bg-success/15 text-success hover:bg-success/15"><CheckCircle2 className="size-3 mr-1" />Inviato</Badge>;
    case "pending": return <Badge className="bg-warning/20 text-warning-foreground"><Clock className="size-3 mr-1" />In attesa</Badge>;
    case "failed": return <Badge className="bg-destructive/15 text-destructive"><XCircle className="size-3 mr-1" />Fallito</Badge>;
    case "confirmed": return <Badge className="bg-info/15 text-info">Confermato</Badge>;
    case "cancelled": return <Badge variant="outline">Disdetto</Badge>;
  }
};

const flowBadge = (s: Reminder["cancellation_state"]) => {
  switch (s) {
    case "cancelled": return <Badge variant="outline">Annullato</Badge>;
    case "slots_proposed": return <Badge className="bg-primary/15 text-primary">Slot proposti</Badge>;
    case "rescheduled": return <Badge className="bg-success/15 text-success">Riprogrammato</Badge>;
    case "no_response": return <Badge className="bg-warning/20 text-warning-foreground">Da riprogrammare</Badge>;
    default: return null;
  }
};

function Reminders() {
  const qc = useQueryClient();
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await api.reminders();
      if (error) throw error;
      const rems = (data ?? []) as unknown as Reminder[];
      const ids = Array.from(new Set(rems.map((r) => r.client_id).filter(Boolean) as string[]));
      const { data: clients } = ids.length
        ? await supabase.from("clients").select("*").in("id", ids)
        : { data: [] as Client[] };
      const map = new Map((clients ?? []).map((c) => [c.id, c as Client]));
      return rems.map((r) => ({ ...r, client: r.client_id ? map.get(r.client_id) ?? null : null })) as ReminderRow[];
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayRem = reminders.filter((r) => { const d = new Date(r.scheduled_at); return d >= today && d < new Date(today.getTime() + 86400000); });
  const r24 = todayRem.filter((r) => r.type === "24h");
  const r2 = todayRem.filter((r) => r.type === "2h");

  const sent = todayRem.filter((r) => r.status === "sent").length;
  const confirmed = todayRem.filter((r) => r.status === "confirmed").length;
  const cancelled = todayRem.filter((r) => r.status === "cancelled").length;

  const cancellationFlow = reminders.filter((r) => r.cancellation_state).slice(0, 12);

  const simulateMessage = async (r: ReminderRow, message: string) => {
    const { fetchWithAuth } = await import("@/lib/fetch-with-auth");
    const res = await fetchWithAuth("/api/reminder-respond", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderId: r.id, message }),
    });

    if (!res.ok) { toast.error("Errore: " + (await res.text())); return; }
    const json = await res.json() as { action: string; reply: string | null };
    if (json.action === "slots_proposed") toast.success("AI ha proposto 2 slot al paziente");
    else if (json.action === "rescheduled") toast.success("Appuntamento riprogrammato ✅");
    qc.invalidateQueries({ queryKey: ["reminders"] });
  };

  const sweepNoResponse = async () => {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("reminders")
      .update({ cancellation_state: "no_response" })
      .eq("cancellation_state", "slots_proposed")
      .lt("created_at", cutoff)
      .select();
    if (error) { toast.error(error.message); return; }
    // Push them into follow-up via conversation tag
    for (const rem of data ?? []) {
      if (rem.client_id) {
        await supabase.from("conversations").insert({
          client_id: rem.client_id, channel: "whatsapp", status: "ai",
          tags: ["Da riprogrammare", "follow-up"],
          internal_notes: "Spostato in follow-up: nessuna risposta 48h dopo proposta slot",
        });
      }
    }
    toast.success(`${data?.length ?? 0} pazienti spostati in follow-up`);
    qc.invalidateQueries({ queryKey: ["reminders"] });
  };

  const reschedule = async (r: ReminderRow) => {
    const time = prompt("Nuova data e ora (es. 2026-05-15 10:30):");
    if (!time) return;
    const newDate = new Date(time);
    if (isNaN(newDate.getTime())) { toast.error("Data non valida"); return; }
    await supabase.from("reminders").update({ scheduled_at: newDate.toISOString(), status: "pending" }).eq("id", r.id);
    toast.success("Reminder riprogrammato");
    qc.invalidateQueries({ queryKey: ["reminders"] });
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Bell className="size-3.5" />Totale oggi</div><div className="text-2xl font-semibold">{todayRem.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Inviati</div><div className="text-2xl font-semibold text-success">{sent}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Confermati</div><div className="text-2xl font-semibold text-info">{confirmed}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Disdette</div><div className="text-2xl font-semibold text-warning">{cancelled}</div></Card>
      </div>

      <Card className="p-5 mb-6 bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="size-10 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground"><Sparkles className="size-5" /></div>
          <div className="flex-1 min-w-[260px]">
            <h3 className="font-semibold flex items-center gap-2">Automazione disdette WhatsApp</h3>
            <p className="text-xs text-muted-foreground mt-1">
              L'AI rileva parole come "annullo", "non posso", "disdico" e propone 2 slot liberi automaticamente.
              Se il paziente non risponde entro 48h viene spostato nel Follow-up con tag <span className="font-mono">Da riprogrammare</span>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={sweepNoResponse}><Clock className="size-3.5 mr-1.5" />Sweep 48h no-response</Button>
        </div>

        {cancellationFlow.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Flusso disdette in corso</div>
            {cancellationFlow.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                <MessageCircle className="size-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.client ? `${r.client.first_name} ${r.client.last_name}` : "—"}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>Annullato</span><ArrowRight className="size-3" />
                    <span>{r.cancellation_state === "cancelled" ? "—" : "Slot proposti"}</span>
                    {r.cancellation_state === "rescheduled" && <><ArrowRight className="size-3" /><span>Riprogrammato ✓</span></>}
                    {r.cancellation_state === "no_response" && <><ArrowRight className="size-3" /><span>Follow-up</span></>}
                  </div>
                </div>
                {flowBadge(r.cancellation_state)}
                {r.cancellation_state === "slots_proposed" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => simulateMessage(r, "Martedì")}>Sim. scelta 1</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <ReminderList title="Reminder 24h" subtitle="Inviati il giorno prima dell'appuntamento" items={r24} onReschedule={reschedule} onSimulateCancel={(r) => simulateMessage(r, "Non posso, devo annullare")} />
        <ReminderList title="Reminder 2h" subtitle="Inviati 2 ore prima dell'appuntamento" items={r2} onReschedule={reschedule} onSimulateCancel={(r) => simulateMessage(r, "Non posso, devo annullare")} />
      </div>
    </AppLayout>
  );
}

function ReminderList({ title, subtitle, items, onReschedule, onSimulateCancel }: {
  title: string; subtitle: string;
  items: ReminderRow[];
  onReschedule: (r: ReminderRow) => void;
  onSimulateCancel: (r: ReminderRow) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Bell className="size-4 text-primary" />{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center"><Bell className="size-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.client ? `${r.client.first_name} ${r.client.last_name}` : "Paziente sconosciuto"}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.scheduled_at).toLocaleString("it", { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
            {statusBadge(r.status)}
            {r.status === "cancelled" ? (
              <Button size="sm" variant="outline" onClick={() => onReschedule(r)}><CalendarClock className="size-3.5 mr-1" />Riprogramma</Button>
            ) : r.cancellation_state == null && r.type === "24h" ? (
              <Button size="sm" variant="ghost" onClick={() => onSimulateCancel(r)} title="Simula disdetta WhatsApp">Sim. disdetta</Button>
            ) : null}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nessun reminder previsto</p>}
      </div>
    </Card>
  );
}
