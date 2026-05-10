import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, XCircle, Clock, CalendarClock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { api, type Reminder, type Client } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/reminders")({
  component: Reminders,
  head: () => ({ meta: [{ title: "Reminder · DentAI" }] }),
});

const statusBadge = (s: Reminder["status"]) => {
  switch (s) {
    case "sent": return <Badge className="bg-success/15 text-success hover:bg-success/15"><CheckCircle2 className="size-3 mr-1" />Inviato</Badge>;
    case "pending": return <Badge className="bg-warning/20 text-warning-foreground"><Clock className="size-3 mr-1" />In attesa</Badge>;
    case "failed": return <Badge className="bg-destructive/15 text-destructive"><XCircle className="size-3 mr-1" />Fallito</Badge>;
    case "confirmed": return <Badge className="bg-info/15 text-info">Confermato</Badge>;
    case "cancelled": return <Badge variant="outline">Disdetto</Badge>;
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
      return rems.map((r) => ({ ...r, client: r.client_id ? map.get(r.client_id) ?? null : null }));
    },
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayRem = reminders.filter((r) => { const d = new Date(r.scheduled_at); return d >= today && d < new Date(today.getTime() + 86400000); });
  const r24 = todayRem.filter((r) => r.type === "24h");
  const r2 = todayRem.filter((r) => r.type === "2h");

  const sent = todayRem.filter((r) => r.status === "sent").length;
  const confirmed = todayRem.filter((r) => r.status === "confirmed").length;
  const cancelled = todayRem.filter((r) => r.status === "cancelled").length;

  const reschedule = async (r: Reminder & { client: Client | null }) => {
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

      <div className="grid lg:grid-cols-2 gap-6">
        <ReminderList title="Reminder 24h" subtitle="Inviati il giorno prima dell'appuntamento" items={r24} onReschedule={reschedule} />
        <ReminderList title="Reminder 2h" subtitle="Inviati 2 ore prima dell'appuntamento" items={r2} onReschedule={reschedule} />
      </div>
    </AppLayout>
  );
}

function ReminderList({ title, subtitle, items, onReschedule }: {
  title: string; subtitle: string;
  items: (Reminder & { client: Client | null })[];
  onReschedule: (r: Reminder & { client: Client | null }) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h3 className="font-semibold flex items-center gap-2"><Bell className="size-4 text-primary" />{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center"><Bell className="size-4 text-muted-foreground" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{r.client ? `${r.client.first_name} ${r.client.last_name}` : "Paziente sconosciuto"}</div>
              <div className="text-xs text-muted-foreground">{new Date(r.scheduled_at).toLocaleString("it", { dateStyle: "short", timeStyle: "short" })}</div>
            </div>
            {statusBadge(r.status)}
            {r.status === "cancelled" && (
              <Button size="sm" variant="outline" onClick={() => onReschedule(r)}><CalendarClock className="size-3.5 mr-1" />Riprogramma</Button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nessun reminder previsto</p>}
      </div>
    </Card>
  );
}
