import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneMissed, MessageSquare, CheckCircle2, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type MissedCall, type Client } from "@/lib/api";

export const Route = createFileRoute("/missed-calls")({
  component: MissedCalls,
  head: () => ({ meta: [{ title: "Chiamate perse · DentAI" }] }),
});

type MissedCallRow = MissedCall & { client: Client | null };

const STATUS_LABEL: Record<MissedCall["status"], string> = {
  pending: "In attesa",
  contacted: "Risposto",
  converted: "Convertito",
  closed: "Chiuso",
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Oggi ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ieri ${time}`;
  return d.toLocaleDateString("it", { day: "2-digit", month: "short" }) + " " + time;
}

function MissedCalls() {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["missed-calls"],
    queryFn: async () => {
      const { data, error } = await api.missedCalls();
      if (error) throw error;
      return (data ?? []) as MissedCallRow[];
    },
  });

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7 = calls.filter((c) => new Date(c.called_at).getTime() >= since);
  const sent = last7.filter((c) => c.auto_message_sent).length;
  const recovered = last7.filter((c) => c.status === "converted").length;
  const rate = last7.length ? Math.round((recovered / last7.length) * 100) : 0;

  const stats = [
    { label: "Chiamate perse 7gg", value: String(last7.length), icon: PhoneMissed, tone: "bg-destructive/10 text-destructive" },
    { label: "Messaggi inviati", value: String(sent), icon: MessageSquare, tone: "bg-info/15 text-info" },
    { label: "Recuperati", value: String(recovered), icon: CheckCircle2, tone: "bg-success/15 text-success" },
    { label: "Tasso conversione", value: `${rate}%`, icon: Phone, tone: "bg-accent text-accent-foreground" },
  ];

  return (
    <AppLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className={`size-10 rounded-lg flex items-center justify-center ${s.tone} mb-3`}>
              <s.icon className="size-5" />
            </div>
            <div className="text-2xl font-semibold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-5 border-b">
          <h3 className="font-semibold">Chiamate perse recenti</h3>
          <p className="text-xs text-muted-foreground">L'AI invia automaticamente un messaggio WhatsApp entro 60 secondi.</p>
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Caricamento…</div>
          ) : calls.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nessuna chiamata persa registrata.</div>
          ) : calls.map((c) => {
            const name = c.client ? `${c.client.first_name} ${c.client.last_name}` : (c.caller_name ?? "Sconosciuto");
            const msg = c.auto_message_sent ? "Messaggio WhatsApp inviato automaticamente" : "In attesa di invio messaggio";
            const label = STATUS_LABEL[c.status];
            return (
              <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                  <PhoneMissed className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg}</p>
                </div>
                <div className="text-xs text-muted-foreground">{formatWhen(c.called_at)}</div>
                <Badge className={
                  c.status === "converted" ? "bg-success/15 text-success hover:bg-success/15"
                  : c.status === "contacted" ? "bg-info/15 text-info hover:bg-info/15"
                  : "bg-warning/20 text-warning-foreground hover:bg-warning/20"
                }>
                  {label}
                </Badge>
                <Button size="sm" variant="outline">Apri</Button>
              </div>
            );
          })}
        </div>
      </Card>
    </AppLayout>
  );
}
