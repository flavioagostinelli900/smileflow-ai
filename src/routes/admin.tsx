import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, setImpersonatedStudioId } from "@/lib/usePermissions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Pause, Play, ShieldPlus, Plus } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin · DentAI" }] }),
});

type Studio = {
  id: string; name: string; email: string | null; plan: string; status: string; created_at: string;
};
type AuditRow = {
  id: string; user_id: string | null; studio_id: string | null;
  action: string; entity: string; entity_id: string | null; created_at: string;
};

function AdminPanel() {
  const { isSuperAdmin, loading } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate({ to: "/" });
  }, [loading, isSuperAdmin, navigate]);

  const { data: studios } = useQuery({
    queryKey: ["admin-studios"],
    enabled: !loading && isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Studio[];
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["admin-audit"],
    enabled: !loading && isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as AuditRow[];
    },
  });

  const [newStudio, setNewStudio] = useState({ name: "", email: "", plan: "free" });
  const [authEmail, setAuthEmail] = useState("");
  const [authStudio, setAuthStudio] = useState<string>("");
  const [authOpen, setAuthOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const createStudio = async () => {
    if (!newStudio.name) return toast.error("Inserisci il nome");
    const { error } = await supabase.from("studios").insert({
      name: newStudio.name, email: newStudio.email || null, plan: newStudio.plan, status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Studio creato");
    setCreateOpen(false);
    setNewStudio({ name: "", email: "", plan: "free" });
    qc.invalidateQueries({ queryKey: ["admin-studios"] });
  };

  const toggleStatus = async (s: Studio) => {
    const next = s.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("studios").update({ status: next }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(`Studio ${next === "active" ? "riattivato" : "sospeso"}`);
    qc.invalidateQueries({ queryKey: ["admin-studios"] });
  };

  const manage = (s: Studio) => {
    setImpersonatedStudioId(s.id);
    toast.success(`Stai gestendo ${s.name}`);
    navigate({ to: "/" });
  };

  const authorizeAdmin = async () => {
    if (!authEmail || !authStudio) return toast.error("Compila tutti i campi");
    // Lookup user via profiles (full_name often contains the email at signup)
    const { data: prof } = await supabase.from("profiles").select("id, full_name").ilike("full_name", `%${authEmail}%`).limit(1).maybeSingle();
    if (!prof?.id) return toast.error("Utente non trovato. L'utente deve essersi già registrato.");
    const { error } = await supabase.from("admin_authorizations").insert({
      admin_user_id: prof.id, studio_id: authStudio,
    });
    if (error) return toast.error(error.message);
    await supabase.from("user_roles").insert({ user_id: prof.id, role: "authorized_admin", studio_id: authStudio });
    toast.success("Admin autorizzato");
    setAuthOpen(false); setAuthEmail(""); setAuthStudio("");
  };

  if (loading) {
    return <AppLayout><div className="text-sm text-muted-foreground">Caricamento permessi…</div></AppLayout>;
  }

  if (!isSuperAdmin) return null;

  return (
    <AppLayout>
      <Tabs defaultValue="studios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="studios">Studi</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="studios">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Account studio</h3>
              {isSuperAdmin && (
                <div className="flex gap-2">
                  <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><ShieldPlus className="size-4 mr-1.5" />Autorizza admin</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Autorizza un admin</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Email utente</Label><Input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="utente@email.it" /></div>
                        <div><Label>Studio</Label>
                          <select className="w-full h-10 border rounded-md px-2 bg-background" value={authStudio} onChange={(e) => setAuthStudio(e.target.value)}>
                            <option value="">Seleziona…</option>
                            {studios?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <DialogFooter><Button onClick={authorizeAdmin}>Autorizza</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-primary"><Plus className="size-4 mr-1.5" />Nuovo studio</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nuovo account studio</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Nome studio</Label><Input value={newStudio.name} onChange={(e) => setNewStudio({ ...newStudio, name: e.target.value })} /></div>
                        <div><Label>Email</Label><Input value={newStudio.email} onChange={(e) => setNewStudio({ ...newStudio, email: e.target.value })} /></div>
                        <div><Label>Piano</Label>
                          <select className="w-full h-10 border rounded-md px-2 bg-background" value={newStudio.plan} onChange={(e) => setNewStudio({ ...newStudio, plan: e.target.value })}>
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="business">Business</option>
                          </select>
                        </div>
                      </div>
                      <DialogFooter><Button onClick={createStudio}>Crea</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registrato</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Piano</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studios?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("it-IT")}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>
                        {s.status === "active" ? "Attivo" : "Sospeso"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{s.plan}</Badge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="outline" onClick={() => manage(s)}><Eye className="size-3.5 mr-1" />Gestisci</Button>
                      {isSuperAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(s)}>
                          {s.status === "active" ? <><Pause className="size-3.5 mr-1" />Sospendi</> : <><Play className="size-3.5 mr-1" />Riattiva</>}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Audit log — ultime 50 modifiche</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Azione</TableHead>
                  <TableHead>Entità</TableHead>
                  <TableHead>Utente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit?.length ? audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground text-xs">{new Date(a.created_at).toLocaleString("it-IT")}</TableCell>
                    <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                    <TableCell>{a.entity}{a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{a.user_id?.slice(0, 8) ?? "—"}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nessuna modifica registrata</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
