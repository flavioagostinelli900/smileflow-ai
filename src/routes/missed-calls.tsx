import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneMissed, MessageSquare, CheckCircle2, Phone } from "lucide-react";

export const Route = createFileRoute("/missed-calls")({
  component: MissedCalls,
  head: () => ({ meta: [{ title: "Chiamate perse · DentAI" }] }),
});

const calls = [
  { num: "+39 333 1234567", name: "Giulia Romano", time: "Oggi 09:42", status: "Convertito", msg: "Inviato WhatsApp con disponibilità" },
  { num: "+39 348 7766554", name: "Sconosciuto", time: "Oggi 10:15", status: "In attesa", msg: "Messaggio inviato, no risposta" },
  { num: "+39 366 1122334", name: "Luca De Santis", time: "Oggi 11:30", status: "Risposto", msg: "Conversazione AI in corso" },
  { num: "+39 327 9988776", name: "Sconosciuto", time: "Ieri 17:50", status: "Convertito", msg: "Prenotato 14 Giu 15:00" },
  { num: "+39 339 5544332", name: "Elena Ferri", time: "Ieri 16:20", status: "Risposto", msg: "Richiesta info ortodonzia" },
];

const stats = [
  { label: "Chiamate perse 7gg", value: "47", icon: PhoneMissed, tone: "bg-destructive/10 text-destructive" },
  { label: "Messaggi inviati", value: "47", icon: MessageSquare, tone: "bg-info/15 text-info" },
  { label: "Recuperati", value: "31", icon: CheckCircle2, tone: "bg-success/15 text-success" },
  { label: "Tasso conversione", value: "66%", icon: Phone, tone: "bg-accent text-accent-foreground" },
];

function MissedCalls() {
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
          {calls.map((c, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <PhoneMissed className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.num}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
              </div>
              <div className="text-xs text-muted-foreground">{c.time}</div>
              <Badge className={
                c.status === "Convertito" ? "bg-success/15 text-success hover:bg-success/15"
                : c.status === "Risposto" ? "bg-info/15 text-info hover:bg-info/15"
                : "bg-warning/20 text-warning-foreground hover:bg-warning/20"
              }>
                {c.status}
              </Badge>
              <Button size="sm" variant="outline">Apri</Button>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
