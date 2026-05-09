import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/operators")({
  component: Operators,
  head: () => ({ meta: [{ title: "Operatori · DentAI" }] }),
});

const ops = [
  { name: "Dr. Marco Rossi", role: "Implantologo", tags: ["Implantologia", "Chirurgia"], appts: 14, color: "bg-primary" },
  { name: "Dr.ssa Laura Conti", role: "Igienista", tags: ["Igiene", "Sbiancamento"], appts: 22, color: "bg-info" },
  { name: "Dr. Andrea Ferri", role: "Conservativa", tags: ["Conservativa", "Endodonzia"], appts: 11, color: "bg-success" },
  { name: "Dr.ssa Sofia Greco", role: "Ortodontista", tags: ["Ortodonzia", "Pediatrica"], appts: 9, color: "bg-warning" },
];

function Operators() {
  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{ops.length} collaboratori</p>
        <Button className="bg-gradient-primary" size="sm"><Plus className="size-4 mr-1.5" />Nuovo operatore</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ops.map((o) => (
          <Card key={o.name} className="p-5 hover:shadow-elevated transition-shadow">
            <Avatar className="size-14 mb-3">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {o.name.split(" ").slice(-2).map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{o.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{o.role}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {o.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold">{o.appts}</div>
                <div className="text-[10px] text-muted-foreground uppercase">App. settimana</div>
              </div>
              <Button variant="outline" size="sm"><Calendar className="size-3.5 mr-1" />Calendario</Button>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
