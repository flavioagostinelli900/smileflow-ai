import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Operator } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";

export const Route = createFileRoute("/operators")({
  component: Operators,
  head: () => ({ meta: [{ title: "Operatori · DentAI" }] }),
});

function Operators() {
  const { data: ops = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-muted-foreground">{ops.length} collaboratori</p>
        <Button className="bg-gradient-primary" size="sm"><Plus className="size-4 mr-1.5" />Nuovo operatore</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ops.map((o) => (
          <Card key={o.id} className="p-5 hover:shadow-elevated transition-shadow">
            <Avatar className="size-14 mb-3">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {o.name.split(" ").slice(-2).map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold">{o.name}</h3>
            <p className="text-xs text-muted-foreground mb-3">{o.role ?? "—"}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {(o.departments ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <Badge className={o.online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                  ● {o.online ? "Online" : "Offline"}
                </Badge>
              </div>
              <Link to="/operators/$operatorId" params={{ operatorId: o.id }}>
                <Button variant="outline" size="sm"><Calendar className="size-3.5 mr-1" />Apri</Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
