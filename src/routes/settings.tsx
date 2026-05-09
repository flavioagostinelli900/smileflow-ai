import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Phone, MessageSquare, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Configurazione · DentAI" }] }),
});

const templates = [
  { name: "Recupero inattivo", text: "Ciao {nome}! Sono passati {mesi} mesi dall'ultima visita…" },
  { name: "Promemoria appuntamento", text: "Ciao {nome}, ti ricordiamo l'appuntamento del {data} alle {ora}…" },
  { name: "Richiamo igiene", text: "{nome}, sono passati 6 mesi! È il momento dell'igiene 🦷" },
  { name: "Post visita", text: "Ciao {nome}, come stai dopo la visita di ieri? Tutto bene?" },
];

const automations = [
  { name: "Risposta chiamata persa", desc: "WhatsApp automatico entro 60 secondi", on: true },
  { name: "Promemoria 24h prima", desc: "Conferma appuntamento via WhatsApp", on: true },
  { name: "Recupero inattivi mensile", desc: "Sequenza per pazienti >6 mesi", on: true },
  { name: "Auguri compleanno", desc: "Messaggio personalizzato + sconto", on: false },
];

function Settings() {
  return (
    <AppLayout>
      <Tabs defaultValue="numbers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="numbers">Numeri & WhatsApp</TabsTrigger>
          <TabsTrigger value="templates">Template messaggi</TabsTrigger>
          <TabsTrigger value="automations">Automazioni</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="numbers" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">Numero AI dedicato</h3>
                <p className="text-xs text-muted-foreground">Twilio · gestito automaticamente</p>
              </div>
              <Badge className="ml-auto bg-success/15 text-success hover:bg-success/15">Attivo</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Numero AI</Label>
                <Input value="+39 02 9988 7766" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Twilio Account SID</Label>
                <Input value="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" readOnly />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-lg bg-success/15 text-success flex items-center justify-center">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">WhatsApp Studio (storico)</h3>
                <p className="text-xs text-muted-foreground">Numero originale dello studio</p>
              </div>
              <Badge className="ml-auto bg-success/15 text-success hover:bg-success/15">Connesso</Badge>
            </div>
            <div className="space-y-1.5">
              <Label>Numero WhatsApp</Label>
              <Input value="+39 02 1234 5678" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-3">
          {templates.map((t) => (
            <Card key={t.name} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{t.name}</h4>
                <Button variant="ghost" size="sm">Modifica</Button>
              </div>
              <Textarea value={t.text} readOnly className="resize-none" rows={2} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="automations" className="space-y-3">
          {automations.map((a) => (
            <Card key={a.name} className="p-5 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Zap className="size-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{a.name}</h4>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
              <Switch defaultChecked={a.on} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ai">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="size-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="size-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Personalità AI</h3>
                <p className="text-xs text-muted-foreground">Tono di voce e regole conversazione</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome assistente</Label>
              <Input defaultValue="Sofia · Studio Rossi" />
            </div>
            <div className="space-y-1.5">
              <Label>Tono</Label>
              <Input defaultValue="Professionale, caldo, empatico" />
            </div>
            <div className="space-y-1.5">
              <Label>Lingue supportate</Label>
              <div className="flex gap-2">
                {["IT", "EN", "ES", "FR", "DE"].map((l) => (
                  <Badge key={l} variant={l === "IT" || l === "EN" ? "default" : "outline"}>{l}</Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Istruzioni custom</Label>
              <Textarea
                rows={4}
                defaultValue="Rispondi sempre in modo professionale. Proponi sempre 2 slot disponibili. Non dare mai consigli medici. Per emergenze, indirizza al numero studio."
              />
            </div>
            <div className="pt-2">
              <Button className="bg-gradient-primary">Salva configurazione</Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
