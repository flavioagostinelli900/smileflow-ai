import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Sparkles, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/followup")({
  component: FollowUp,
  head: () => ({ meta: [{ title: "Follow-up AI · DentAI" }] }),
});

const sequences = [
  { name: "Recupero pazienti inattivi", target: "Inattivi >6 mesi", steps: 4, active: true, conv: "32%", sent: 412 },
  { name: "Richiamo igiene 6 mesi", target: "Post igiene", steps: 3, active: true, conv: "58%", sent: 287 },
  { name: "Post-visita feedback", target: "Visita +2gg", steps: 2, active: true, conv: "71%", sent: 198 },
  { name: "Promemoria appuntamento", target: "App. -24h", steps: 1, active: true, conv: "92%", sent: 624 },
  { name: "Fidelizzazione VIP", target: "Top 10%", steps: 5, active: false, conv: "45%", sent: 86 },
];

const conversations = [
  { name: "Giulia Romano", last: "Sì, va bene martedì mattina alle 10", time: "2 min", status: "open", seq: "Igiene" },
  { name: "Marco Bianchi", last: "Posso spostare al pomeriggio?", time: "8 min", status: "operator", seq: "Inattivi" },
  { name: "Sara Conti", last: "Grazie, confermo!", time: "1h", status: "booked", seq: "Igiene" },
  { name: "Paolo Greco", last: "Mandatemi più info per favore", time: "3h", status: "open", seq: "Inattivi" },
];

function FollowUp() {
  return (
    <AppLayout>
      <Tabs defaultValue="sequences" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="sequences">Sequenze</TabsTrigger>
            <TabsTrigger value="conversations">Conversazioni</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <Button size="sm" className="bg-gradient-primary"><Plus className="size-4 mr-1.5" />Nuova sequenza</Button>
        </div>

        <TabsContent value="sequences" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4 mb-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><Sparkles className="size-3.5" />Sequenze attive</div>
              <div className="text-2xl font-semibold">4</div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><MessageSquare className="size-3.5" />Messaggi inviati 30gg</div>
              <div className="text-2xl font-semibold">1.607</div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2"><CheckCircle2 className="size-3.5" />Conversioni medie</div>
              <div className="text-2xl font-semibold text-success">53%</div>
            </Card>
          </div>

          <Card>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Sequenza</th>
                  <th className="text-left font-medium px-4 py-3">Target</th>
                  <th className="text-left font-medium px-4 py-3">Step</th>
                  <th className="text-left font-medium px-4 py-3">Inviati</th>
                  <th className="text-left font-medium px-4 py-3">Conversione</th>
                  <th className="text-left font-medium px-4 py-3">Attiva</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sequences.map((s) => (
                  <tr key={s.name} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.target}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{s.steps} step</Badge></td>
                    <td className="px-4 py-3">{s.sent}</td>
                    <td className="px-4 py-3 text-success font-medium">{s.conv}</td>
                    <td className="px-4 py-3"><Switch defaultChecked={s.active} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="conversations" className="space-y-2">
          {conversations.map((c) => (
            <Card key={c.name} className="p-4 flex items-center gap-4 hover:shadow-soft transition-shadow">
              <div className="size-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{c.seq}</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{c.last}</p>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{c.time}</div>
              <Badge className={
                c.status === "booked" ? "bg-success/15 text-success hover:bg-success/15"
                : c.status === "operator" ? "bg-warning/20 text-warning-foreground hover:bg-warning/20"
                : "bg-accent text-accent-foreground hover:bg-accent"
              }>
                {c.status === "booked" ? "Prenotato" : c.status === "operator" ? "Operatore" : "AI attiva"}
              </Badge>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-12 text-center text-muted-foreground">
            <Sparkles className="size-8 mx-auto mb-3 text-primary" />
            Analytics dettagliate disponibili dopo i primi 7 giorni di attività.
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
