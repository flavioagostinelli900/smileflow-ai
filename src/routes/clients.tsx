import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Filter, Download, Search, Phone, Mail, Calendar, MessageSquare, Activity, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Client, type Appointment, type Conversation } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({ meta: [{ title: "Clienti · DentAI" }] }),
});

const departments = ["Igiene", "Ortodonzia", "Implantologia", "Estetica", "Endodonzia", "Pediatrica"];

function Clients() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Client | null>(null);
  const [draft, setDraft] = useState<Partial<Client>>({});

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

  const openClient = (c: Client) => { setSelected(c); setDraft(c); setOpen(true); };

  const saveClient = async () => {
    if (!selected) return;
    const { error } = await supabase.from("clients").update({
      first_name: draft.first_name, last_name: draft.last_name, phone: draft.phone, email: draft.email,
      department: draft.department, status: draft.status, notes: draft.notes,
    }).eq("id", selected.id);
    if (error) toast.error(error.message);
    else { toast.success("Cliente aggiornato"); qc.invalidateQueries({ queryKey: ["clients"] }); }
  };

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
        <Button variant="outline" size="sm"><Download className="size-4 mr-1.5" />Esporta</Button>
        <Button size="sm" className="bg-gradient-primary" onClick={createClient}><Plus className="size-4 mr-1.5" />Nuovo</Button>
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

      <ClientDrawer open={open} onOpenChange={setOpen} client={selected} draft={draft} setDraft={setDraft} onSave={saveClient} />
    </AppLayout>
  );
}

function ClientDrawer({ open, onOpenChange, client, draft, setDraft, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; client: Client | null;
  draft: Partial<Client>; setDraft: (d: Partial<Client>) => void; onSave: () => void;
}) {
  const { data: appts = [] } = useQuery({
    queryKey: ["client-appts", client?.id],
    queryFn: async () => {
      if (!client) return [];
      const { data, error } = await supabase.from("appointments").select("*").eq("client_id", client.id).order("starts_at", { ascending: false });
      if (error) throw error; return data as Appointment[];
    }, enabled: !!client && open,
  });

  const { data: convs = [] } = useQuery({
    queryKey: ["client-convs", client?.id],
    queryFn: async () => {
      if (!client) return [];
      const { data, error } = await supabase.from("conversations").select("*").eq("client_id", client.id).order("last_message_at", { ascending: false });
      if (error) throw error; return data as Conversation[];
    }, enabled: !!client && open,
  });

  if (!client) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">{client.first_name[0]}{client.last_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <SheetTitle>{client.first_name} {client.last_name}</SheetTitle>
              <div className="flex gap-2 mt-1.5">
                <Badge variant="secondary">{client.department ?? "—"}</Badge>
                <Badge className={client.status === "active" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}>
                  {client.status === "active" ? "Attivo" : "Inattivo"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" />{client.phone}</div>
            <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" />{client.email ?? "—"}</div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profilo</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
            <TabsTrigger value="appts" className="flex-1">Appuntamenti</TabsTrigger>
            <TabsTrigger value="convs" className="flex-1">Conversazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome" value={draft.first_name ?? ""} onChange={(v) => setDraft({ ...draft, first_name: v })} />
              <Field label="Cognome" value={draft.last_name ?? ""} onChange={(v) => setDraft({ ...draft, last_name: v })} />
              <Field label="Telefono" value={draft.phone ?? ""} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <Field label="Email" value={draft.email ?? ""} onChange={(v) => setDraft({ ...draft, email: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Reparto</label>
                <Select value={draft.department ?? ""} onValueChange={(v) => setDraft({ ...draft, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleziona reparto" /></SelectTrigger>
                  <SelectContent>{departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Stato</label>
                <Select value={draft.status ?? "active"} onValueChange={(v) => setDraft({ ...draft, status: v as Client["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Attivo</SelectItem><SelectItem value="inactive">Inattivo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Note</label>
              <Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={4} />
            </div>
            <Button onClick={onSave} className="w-full bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva modifiche</Button>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {appts.map((a) => (
                <TimelineItem key={a.id} icon={<Calendar className="size-3" />} title={a.visit_type}
                  meta={new Date(a.starts_at).toLocaleString("it")} badge={a.status} />
              ))}
              {convs.map((c) => (
                <TimelineItem key={c.id} icon={<MessageSquare className="size-3" />} title={`Conversazione ${c.channel}`}
                  meta={new Date(c.last_message_at).toLocaleString("it")} badge={c.status} />
              ))}
              {client.last_visit && <TimelineItem icon={<Activity className="size-3" />} title="Ultima visita" meta={client.last_visit} />}
              {appts.length + convs.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nessuna attività</p>}
            </div>
          </TabsContent>

          <TabsContent value="appts" className="mt-4 space-y-2">
            {appts.map((a) => (
              <Card key={a.id} className="p-3 flex items-center gap-3">
                <Calendar className="size-4 text-primary" />
                <div className="flex-1"><div className="text-sm font-medium">{a.visit_type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.starts_at).toLocaleString("it")} · {a.duration_minutes} min</div></div>
                <Badge variant="outline">{a.status}</Badge>
              </Card>
            ))}
            {appts.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nessun appuntamento</p>}
          </TabsContent>

          <TabsContent value="convs" className="mt-4 space-y-2">
            {convs.map((c) => (
              <Card key={c.id} className="p-3 flex items-center gap-3">
                <MessageSquare className="size-4 text-primary" />
                <div className="flex-1"><div className="text-sm font-medium capitalize">{c.channel}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleString("it")}</div></div>
                <Badge variant="outline">{c.status}</Badge>
              </Card>
            ))}
            {convs.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nessuna conversazione</p>}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TimelineItem({ icon, title, meta, badge }: { icon: React.ReactNode; title: string; meta: string; badge?: string }) {
  return (
    <div className="flex gap-3 relative">
      <div className="size-3.5 rounded-full bg-primary mt-1 ring-4 ring-background shrink-0 flex items-center justify-center text-primary-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{meta}</div>
        {badge && <Badge variant="outline" className="text-[10px] mt-1">{badge}</Badge>}
      </div>
    </div>
  );
}
