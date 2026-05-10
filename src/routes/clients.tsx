import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Download, Search, Upload } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Client } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { ImportClientsDialog } from "@/components/ImportClientsDialog";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({ meta: [{ title: "Clienti · DentAI" }] }),
});

const departments = ["Igiene", "Ortodonzia", "Implantologia", "Estetica", "Endodonzia", "Pediatrica"];

function Clients() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await api.clients();
      if (error) throw error;
      return data as Client[];
    },
  });

  const filtered = clients.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (deptFilter !== "all" && c.department !== deptFilter) return false;
    if (!q) return true;
    const s = `${c.first_name} ${c.last_name} ${c.phone} ${c.email ?? ""} ${c.family_id ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    inactive: clients.filter((c) => c.status === "inactive").length,
  };

  const openClient = (c: Client) => navigate({ to: "/clients/$clientId", params: { clientId: c.id } });

  const createClient = async () => {
    const first = prompt("Nome:"); if (!first) return;
    const last = prompt("Cognome:") || ""; const phone = prompt("Telefono:") || "";
    if (!phone) return;
    const { error } = await supabase.from("clients").insert({ first_name: first, last_name: last, phone, status: "active" });
    if (error) toast.error(error.message); else { toast.success("Cliente creato"); qc.invalidateQueries({ queryKey: ["clients"] }); }
  };

  return (
    <AppLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Totale pazienti</div><div className="text-2xl font-semibold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Attivi</div><div className="text-2xl font-semibold text-success">{stats.active}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Inattivi</div><div className="text-2xl font-semibold text-warning">{stats.inactive}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Reparti</div><div className="text-2xl font-semibold">{departments.length}</div></Card>
      </div>

      <Card className="p-3 mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca per nome, telefono, email…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="inactive">Inattivi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Reparto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i reparti</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><Filter className="size-4 mr-1.5" />Segmenti</Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="size-4 mr-1.5" />Importa database</Button>
        <Button variant="outline" size="sm"><Download className="size-4 mr-1.5" />Esporta</Button>
        <Button size="sm" className="bg-gradient-primary" onClick={createClient}><Plus className="size-4 mr-1.5" />Nuovo</Button>
      </Card>

      <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} onDone={() => qc.invalidateQueries({ queryKey: ["clients"] })} />

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
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => openClient(c)} className="hover:bg-muted/30 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{c.first_name[0]}{c.last_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.first_name} {c.last_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="text-xs">{c.phone}</div><div className="text-xs text-muted-foreground">{c.email}</div></td>
                  <td className="px-4 py-3"><Badge variant="outline">{c.family_id ?? "—"}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="secondary">{c.department ?? "—"}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.last_visit ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={c.status === "active" ? "bg-success/15 text-success hover:bg-success/15" : "bg-warning/20 text-warning-foreground hover:bg-warning/20"}>
                      {c.status === "active" ? "Attivo" : "Inattivo"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">Nessun paziente trovato</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

    </AppLayout>
  );
}
