import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Gift, Tag, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/loyalty")({
  component: Loyalty,
  head: () => ({ meta: [{ title: "Fedeltà · DentAI" }] }),
});

const rewards = [
  { name: "Sconto 15% Sbiancamento", target: "Pazienti VIP", expires: "30 Giu", used: 24, total: 100, active: true },
  { name: "Igiene gratuita ogni 5 visite", target: "Tutti", expires: "Mai", used: 87, total: 200, active: true },
  { name: "Codice Famiglia -10%", target: "Famiglie", expires: "31 Dic", used: 12, total: 50, active: true },
  { name: "Welcome Back -20%", target: "Inattivi >12 mesi", expires: "15 Lug", used: 38, total: 100, active: false },
];

function Loyalty() {
  return (
    <AppLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <Gift className="size-5 text-primary mb-3" />
          <div className="text-2xl font-semibold">4</div>
          <div className="text-xs text-muted-foreground">Premi attivi</div>
        </Card>
        <Card className="p-5">
          <Tag className="size-5 text-info mb-3" />
          <div className="text-2xl font-semibold">161</div>
          <div className="text-xs text-muted-foreground">Coupon utilizzati</div>
        </Card>
        <Card className="p-5">
          <Clock className="size-5 text-warning mb-3" />
          <div className="text-2xl font-semibold">23</div>
          <div className="text-xs text-muted-foreground">In scadenza 7gg</div>
        </Card>
        <Card className="p-5">
          <TrendingUp className="size-5 text-success mb-3" />
          <div className="text-2xl font-semibold">+34%</div>
          <div className="text-xs text-muted-foreground">Riacquisto</div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Programma fedeltà</h3>
            <p className="text-xs text-muted-foreground">Premi e scontistiche automatiche via WhatsApp</p>
          </div>
          <Button className="bg-gradient-primary" size="sm">Nuovo premio</Button>
        </div>
        <div className="divide-y">
          {rewards.map((r) => (
            <div key={r.name} className="p-4 flex items-center gap-4">
              <div className="size-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Gift className="size-5" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.target} · scade {r.expires}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{r.used}/{r.total}</div>
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-gradient-primary" style={{ width: `${(r.used / r.total) * 100}%` }} />
                </div>
              </div>
              <Badge variant={r.active ? "default" : "secondary"} className={r.active ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                {r.active ? "Attivo" : "Pausa"}
              </Badge>
              <Switch defaultChecked={r.active} />
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
