import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Filter, Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Client } from "@/lib/api";
import { useState } from "react";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({ meta: [{ title: "Clienti · DentAI" }] }),
});

function Clients() {
  const [q, setQ] = useState("");
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await api.clients();
      if (error) throw error;
      return data as Client[];
    },
  });
  const filtered = clients.filter((c) => {
    const s = `${c.first_name} ${c.last_name} ${c.phone} ${c.family_id ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <p className="text-sm text-muted-foreground">{filtered.length} pazienti totali</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="size-4 mr-1.5" />Filtri</Button>
          <Button variant="outline" size="sm"><Download className="size-4 mr-1.5" />Esporta</Button>
          <Button size="sm" className="bg-gradient-primary"><Plus className="size-4 mr-1.5" />Nuovo cliente</Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, telefono, ID famiglia…" className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-4 py-3">Paziente</th>
                <th className="text-left font-medium px-4 py-3">Contatti</th>
                <th className="text-left font-medium px-4 py-3">Famiglia</th>
                <th className="text-left font-medium px-4 py-3">Reparto</th>
                <th className="text-left font-medium px-4 py-3">Ultima visita</th>
                <th className="text-left font-medium px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const name = `${c.first_name} ${c.last_name}`;
                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                            {c.first_name[0]}{c.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{c.phone}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{c.family_id}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="secondary">{c.department}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.last_visit ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={c.status === "active" ? "bg-success/15 text-success hover:bg-success/15" : "bg-warning/20 text-warning-foreground hover:bg-warning/20"}>
                        {c.status === "active" ? "Attivo" : "Inattivo"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
