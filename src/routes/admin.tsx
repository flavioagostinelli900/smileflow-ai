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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, setImpersonatedStudioId, type AppRole } from "@/lib/usePermissions";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, Pause, Play, Plus, Pencil, Trash2, Info, UserPlus, Copy, Mail, Check } from "lucide-react";
import { AdminSupportTickets } from "@/components/AdminSupportTickets";
import { useServerFn } from "@tanstack/react-start";
import { createStudioAccount } from "@/lib/studios.functions";
import { deleteStudio as deleteStudioFn } from "@/lib/delete-studio.functions";
import { generateTempPassword } from "@/lib/password-utils";
import {
  PLAN_IDS as PLAN_OPTIONS,
  PLAN_LABELS,
  MESSAGE_TIERS,
  MAX_OPERATORS,
  SETUP_FEE,
  planLabel,
  priceForTier,
  type PlanId,
} from "@/lib/plans";


export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ title: "Admin · DentAI" }] }),
});

type Studio = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  owner_name: string | null;
  plan: string;
  billing_cycle: string;
  message_tier: number | null;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  status: string;
  created_at: string;
};
type AuditRow = {
  id: string; user_id: string | null; studio_id: string | null;
  action: string; entity: string; entity_id: string | null; created_at: string;
};
type StaffRow = {
  user_id: string;
  full_name: string | null;
  roles: AppRole[];
  studio_ids: string[];
};

const CYCLE_OPTIONS = ["monthly", "annual"] as const;
const STAFF_ROLE_OPTIONS: AppRole[] = ["super_admin", "authorized_admin", "support"];


function renewalBadge(expires: string | null) {
  if (!expires) return <Badge variant="outline">—</Badge>;
  const days = Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000);
  const label = new Date(expires).toLocaleDateString("it-IT");
  if (days <= 7) return <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 hover:bg-red-500/15">{label}</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/15">{label}</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15">{label}</Badge>;
}

function roleLabel(r: AppRole) {
  return r === "super_admin" ? "Super Admin" : r === "authorized_admin" ? "Admin Autorizzato" : r === "support" ? "Supporto" : "Studio";
}

function AdminPanel() {
  const { isSuperAdmin, isAuthorizedAdmin, loading } = usePermissions();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canAccess = isSuperAdmin || isAuthorizedAdmin;
  const createAccount = useServerFn(createStudioAccount);
  const deleteStudioRpc = useServerFn(deleteStudioFn);
  const [credentials, setCredentials] = useState<null | { studio_name: string; first_name: string; email: string; password: string }>(null);
  const [deleteTarget, setDeleteTarget] = useState<Studio | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingStudio, setDeletingStudio] = useState(false);


  useEffect(() => {
    if (!loading && !canAccess) navigate({ to: "/" });
  }, [loading, canAccess, navigate]);

  const { data: studios } = useQuery({
    queryKey: ["admin-studios"],
    enabled: !loading && canAccess,
    queryFn: async () => {
      const { data, error } = await supabase.from("studios").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Studio[];
    },
  });

  const { data: audit } = useQuery({
    queryKey: ["admin-audit"],
    enabled: !loading && canAccess,
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as AuditRow[];
    },
  });

  const { data: staff } = useQuery({
    queryKey: ["admin-staff"],
    enabled: !loading && canAccess,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role, studio_id")
        .in("role", ["super_admin", "authorized_admin", "support"]);
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const { data: auths } = await supabase
        .from("admin_authorizations")
        .select("admin_user_id, studio_id")
        .in("admin_user_id", ids);
      const map = new Map<string, StaffRow>();
      (roles ?? []).forEach((r) => {
        const cur = map.get(r.user_id) ?? {
          user_id: r.user_id,
          full_name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? null,
          roles: [],
          studio_ids: [],
        };
        if (!cur.roles.includes(r.role as AppRole)) cur.roles.push(r.role as AppRole);
        if (r.studio_id && !cur.studio_ids.includes(r.studio_id)) cur.studio_ids.push(r.studio_id);
        map.set(r.user_id, cur);
      });
      (auths ?? []).forEach((a) => {
        const cur = map.get(a.admin_user_id);
        if (cur && !cur.studio_ids.includes(a.studio_id)) cur.studio_ids.push(a.studio_id);
      });
      return Array.from(map.values());
    },
  });

  // ---- Studio dialogs ----
  const emptyStudio = {
    name: "", email: "", phone: "", owner_name: "",
    plan: "silver" as typeof PLAN_OPTIONS[number],
    billing_cycle: "monthly",
    message_tier: MESSAGE_TIERS.silver[0],
    subscription_started_at: new Date().toISOString().slice(0, 10),
    status: "active",
  };
  const [studioForm, setStudioForm] = useState(emptyStudio);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);

  const openCreate = () => { setEditingId(null); setStudioForm(emptyStudio); setStudioOpen(true); };
  const openEdit = (s: Studio) => {
    setEditingId(s.id);
    const plan = (PLAN_OPTIONS as readonly string[]).includes(s.plan) ? (s.plan as typeof PLAN_OPTIONS[number]) : "silver";
    setStudioForm({
      name: s.name, email: s.email ?? "", phone: s.phone ?? "", owner_name: s.owner_name ?? "",
      plan,
      billing_cycle: s.billing_cycle ?? "monthly",
      message_tier: s.message_tier ?? MESSAGE_TIERS[plan][0],
      subscription_started_at: s.subscription_started_at ?? new Date().toISOString().slice(0, 10),
      status: s.status,
    });
    setStudioOpen(true);
  };

  const saveStudio = async () => {
    if (!studioForm.name) return toast.error("Inserisci il nome");
    if (!editingId && !studioForm.email) return toast.error("Email obbligatoria per creare l'account");
    const payload = {
      name: studioForm.name,
      email: studioForm.email || null,
      phone: studioForm.phone || null,
      owner_name: studioForm.owner_name || null,
      plan: studioForm.plan,
      billing_cycle: studioForm.billing_cycle,
      message_tier: studioForm.message_tier,
      subscription_started_at: studioForm.subscription_started_at || null,
      status: studioForm.status,
    };
    if (editingId) {
      // Check if plan downgrade would exceed operator limit
      const newMax = MAX_OPERATORS[studioForm.plan];
      const { count: opCount } = await supabase
        .from("operators")
        .select("id", { count: "exact", head: true });
      const current = opCount ?? 0;
      if (current > newMax) {
        const ok = window.confirm(
          `Lo studio ha ${current} operatori attivi ma il nuovo piano ${PLAN_LABELS[studioForm.plan]} prevede massimo ${newMax} operatori.\n\nProcedendo, gli ultimi ${current - newMax} operatori aggiunti verranno disattivati (impostati offline). Vuoi procedere comunque?`,
        );
        if (!ok) return;
        // Disable the most recently created operators above the limit
        const { data: extras } = await supabase
          .from("operators")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(current - newMax);
        if (extras && extras.length > 0) {
          await supabase.from("operators").update({ online: false }).in("id", extras.map((e) => e.id));
        }
      }
      const { error } = await supabase.from("studios").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Studio aggiornato — modifiche in tempo reale");
      setStudioOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-studios"] });
      qc.invalidateQueries({ queryKey: ["my-studio-plan"] });
      qc.invalidateQueries({ queryKey: ["operators"] });
      return;
    }
    // Create studio + auth account
    const { data: inserted, error } = await supabase.from("studios").insert(payload).select("id").single();
    if (error || !inserted) return toast.error(error?.message ?? "Errore creazione studio");
    const tempPassword = generateTempPassword(12);
    try {
      await createAccount({
        data: {
          studio_id: inserted.id,
          email: studioForm.email,
          password: tempPassword,
          first_name: studioForm.owner_name || studioForm.name,
        },
      });
    } catch (e: any) {
      toast.error(`Studio creato, ma errore nell'account: ${e.message}. Puoi riprovare dalla scheda studio.`);
      setStudioOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-studios"] });
      return;
    }
    setStudioOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-studios"] });
    setCredentials({
      studio_name: studioForm.name,
      first_name: studioForm.owner_name || studioForm.name,
      email: studioForm.email,
      password: tempPassword,
    });
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

  const confirmDeleteStudio = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.name) return;
    setDeletingStudio(true);
    try {
      await deleteStudioRpc({ data: { studio_id: deleteTarget.id } });
      toast.success(`Studio ${deleteTarget.name} eliminato con successo.`);
      setDeleteTarget(null);
      setDeleteConfirmText("");
      qc.invalidateQueries({ queryKey: ["admin-studios"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Errore durante l'eliminazione");
    } finally {
      setDeletingStudio(false);
    }
  };

  // ---- Staff dialogs ----
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState<AppRole>("support");
  const [staffStudios, setStaffStudios] = useState<string[]>([]);
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);

  const studioIndex = useMemo(() => new Map(studios?.map((s) => [s.id, s.name])), [studios]);

  const resetStaffForm = () => { setStaffEmail(""); setStaffRole("support"); setStaffStudios([]); setEditStaff(null); };

  const openAddStaff = () => { resetStaffForm(); setStaffOpen(true); };
  const openEditStaff = (row: StaffRow) => {
    setEditStaff(row);
    setStaffEmail(row.full_name ?? "");
    setStaffRole((row.roles.find((r) => r !== "studio") ?? "support"));
    setStaffStudios(row.studio_ids);
    setStaffOpen(true);
  };

  const saveStaff = async () => {
    if (!isSuperAdmin) return toast.error("Solo Super Admin può gestire lo staff");
    let userId = editStaff?.user_id ?? null;
    if (!userId) {
      if (!staffEmail) return toast.error("Email utente richiesta");
      const { data: prof } = await supabase
        .from("profiles").select("id, full_name").ilike("full_name", `%${staffEmail}%`).limit(1).maybeSingle();
      if (!prof?.id) return toast.error("Utente non trovato. Deve essersi già registrato.");
      userId = prof.id;
    }
    // Reset existing staff roles + auths
    await supabase.from("user_roles").delete().eq("user_id", userId).in("role", ["super_admin", "authorized_admin", "support"]);
    await supabase.from("admin_authorizations").delete().eq("admin_user_id", userId);
    // Insert new role
    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: userId, role: staffRole });
    if (roleErr) return toast.error(roleErr.message);
    // Authorize for selected studios
    if (staffStudios.length && (staffRole === "authorized_admin" || staffRole === "support")) {
      const rows = staffStudios.map((studio_id) => ({ admin_user_id: userId!, studio_id }));
      const { error: authErr } = await supabase.from("admin_authorizations").insert(rows);
      if (authErr) return toast.error(authErr.message);
    }
    toast.success(editStaff ? "Membro staff aggiornato" : "Membro staff aggiunto");
    setStaffOpen(false); resetStaffForm();
    qc.invalidateQueries({ queryKey: ["admin-staff"] });
  };

  const removeStaff = async (row: StaffRow) => {
    if (!isSuperAdmin) return toast.error("Solo Super Admin può rimuovere lo staff");
    if (!confirm(`Rimuovere ${row.full_name ?? row.user_id} dallo staff?`)) return;
    await supabase.from("admin_authorizations").delete().eq("admin_user_id", row.user_id);
    await supabase.from("user_roles").delete().eq("user_id", row.user_id).in("role", ["super_admin", "authorized_admin", "support"]);
    await supabase.from("user_roles").insert({ user_id: row.user_id, role: "studio" });
    toast.success("Membro rimosso");
    qc.invalidateQueries({ queryKey: ["admin-staff"] });
  };

  if (loading) {
    return <AppLayout><div className="text-sm text-muted-foreground">Caricamento permessi…</div></AppLayout>;
  }
  if (!canAccess) return null;

  return (
    <AppLayout>
      <TooltipProvider>
      <Tabs defaultValue="studios" className="space-y-6">
        <TabsList>
          <TabsTrigger value="studios">Studi</TabsTrigger>
          <TabsTrigger value="staff">Staff interno</TabsTrigger>
          <TabsTrigger value="tickets">Ticket supporto</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        {/* ---------- TAB STUDI ---------- */}
        <TabsContent value="studios">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h3 className="font-semibold">Account studio</h3>
              <Button size="sm" className="bg-gradient-primary" onClick={openCreate}>
                <Plus className="size-4 mr-1.5" />Nuovo studio
              </Button>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Titolare</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefono</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead>Fascia msg</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1">
                        Rinnovo
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            Dati di fatturazione gestiti tramite Stripe. Integrazione disponibile nella versione Pro di DentAI.
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studios?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.owner_name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{s.email ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{s.phone ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{planLabel(s.plan)} · {s.billing_cycle === "annual" ? "Annuale" : "Mensile"}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.message_tier ? `${s.message_tier.toLocaleString("it-IT")} msg` : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {priceForTier(s.plan, s.message_tier) != null
                          ? <span className="font-medium">€{priceForTier(s.plan, s.message_tier)}<span className="text-xs text-muted-foreground font-normal">/mese</span></span>
                          : <span className="text-muted-foreground">—</span>}
                        <div className="text-[10px] text-muted-foreground">Setup €{SETUP_FEE[(["silver","gold","platinum"].includes(s.plan) ? s.plan : "silver") as PlanId]}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {s.subscription_expires_at ? new Date(s.subscription_expires_at).toLocaleDateString("it-IT") : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{renewalBadge(s.subscription_expires_at)}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "active" ? "default" : "secondary"}>
                          {s.status === "active" ? "Attivo" : "Sospeso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => manage(s)}><Eye className="size-3.5 mr-1" />Gestisci</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="size-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(s)}>
                          {s.status === "active" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDeleteTarget(s); setDeleteConfirmText(""); }}
                            title="Elimina studio"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------- TAB STAFF ---------- */}
        <TabsContent value="staff">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold">Staff interno DentAI</h3>
                <p className="text-xs text-muted-foreground">Membri con accesso amministrativo separati dagli account studio.</p>
              </div>
              {isSuperAdmin && (
                <Button size="sm" className="bg-gradient-primary" onClick={openAddStaff}>
                  <UserPlus className="size-4 mr-1.5" />Aggiungi membro staff
                </Button>
              )}
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Studi assegnati</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff?.length ? staff.map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell className="font-medium">{row.full_name ?? row.user_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.roles.filter((r) => r !== "studio").map((r) => (
                            <Badge key={r} variant="outline">{roleLabel(r)}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.roles.includes("super_admin") ? "Tutti" :
                          row.studio_ids.length ? row.studio_ids.map((id) => studioIndex.get(id) ?? id.slice(0, 6)).join(", ") : "—"}
                      </TableCell>
                      <TableCell><Badge>Attivo</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {isSuperAdmin && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => openEditStaff(row)}><Pencil className="size-3.5 mr-1" />Modifica ruolo</Button>
                            <Button size="sm" variant="ghost" onClick={() => removeStaff(row)}><Trash2 className="size-3.5 mr-1" />Rimuovi</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nessun membro staff</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------- TAB TICKETS ---------- */}
        <TabsContent value="tickets">
          <AdminSupportTickets studios={studios?.map((s) => ({ id: s.id, name: s.name }))} />
        </TabsContent>

        {/* ---------- TAB AUDIT ---------- */}
        <TabsContent value="audit">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Audit log — ultime 50 modifiche</h3>
            <div className="overflow-x-auto -mx-6 px-6">
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
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- DIALOG STUDIO ---------- */}
      <Dialog open={studioOpen} onOpenChange={setStudioOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Modifica studio" : "Nuovo account studio"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Nome studio</Label><Input value={studioForm.name} onChange={(e) => setStudioForm({ ...studioForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={studioForm.email} onChange={(e) => setStudioForm({ ...studioForm, email: e.target.value })} /></div>
              <div><Label>Telefono studio</Label><Input value={studioForm.phone} onChange={(e) => setStudioForm({ ...studioForm, phone: e.target.value })} /></div>
            </div>
            <div><Label>Nome titolare/rappresentante</Label><Input value={studioForm.owner_name} onChange={(e) => setStudioForm({ ...studioForm, owner_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Piano</Label>
                <select className="w-full h-10 border rounded-md px-2 bg-background capitalize" value={studioForm.plan} onChange={(e) => {
                  const plan = e.target.value as typeof PLAN_OPTIONS[number];
                  setStudioForm({ ...studioForm, plan, message_tier: MESSAGE_TIERS[plan][0] });
                }}>
                  {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
              <div>
                <Label>Fascia messaggi / mese</Label>
                <select className="w-full h-10 border rounded-md px-2 bg-background" value={studioForm.message_tier ?? ""} onChange={(e) => setStudioForm({ ...studioForm, message_tier: Number(e.target.value) })}>
                  {MESSAGE_TIERS[studioForm.plan].map((t) => <option key={t} value={t}>{t.toLocaleString("it-IT")} msg — €{priceForTier(studioForm.plan, t)}/mese</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Limite operatori del piano {PLAN_LABELS[studioForm.plan]}: massimo <strong>{MAX_OPERATORS[studioForm.plan]}</strong> operatori. Il sistema blocca automaticamente la creazione oltre il limite.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo abbonamento</Label>
                <select className="w-full h-10 border rounded-md px-2 bg-background" value={studioForm.billing_cycle} onChange={(e) => setStudioForm({ ...studioForm, billing_cycle: e.target.value })}>
                  {CYCLE_OPTIONS.map((c) => <option key={c} value={c}>{c === "annual" ? "Annuale" : "Mensile"}</option>)}
                </select>
              </div>
              <div>
                <Label>Data inizio abbonamento</Label>
                <Input type="date" value={studioForm.subscription_started_at} onChange={(e) => setStudioForm({ ...studioForm, subscription_started_at: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Stato</Label>
              <select className="w-full h-10 border rounded-md px-2 bg-background" value={studioForm.status} onChange={(e) => setStudioForm({ ...studioForm, status: e.target.value })}>
                <option value="active">Attivo</option>
                <option value="suspended">Sospeso</option>
              </select>
            </div>

            <p className="text-xs text-muted-foreground">La data di scadenza viene calcolata automaticamente: +30 giorni se mensile, +365 giorni se annuale.</p>
          </div>
          <DialogFooter><Button onClick={saveStudio}>{editingId ? "Salva modifiche" : "Crea studio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- DIALOG STAFF ---------- */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editStaff ? "Modifica membro staff" : "Aggiungi membro staff"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editStaff && (
              <div>
                <Label>Email utente (deve essere già registrato)</Label>
                <Input value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="utente@email.it" />
              </div>
            )}
            <div>
              <Label>Ruolo</Label>
              <select className="w-full h-10 border rounded-md px-2 bg-background" value={staffRole} onChange={(e) => setStaffRole(e.target.value as AppRole)}>
                {STAFF_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
            {staffRole !== "super_admin" && (
              <div>
                <Label>Studi assegnati</Label>
                <div className="border rounded-md p-2 max-h-44 overflow-y-auto space-y-1">
                  {studios?.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={staffStudios.includes(s.id)} onChange={(e) => {
                        setStaffStudios((prev) => e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                      }} />
                      {s.name}
                    </label>
                  ))}
                  {!studios?.length && <p className="text-xs text-muted-foreground">Nessuno studio disponibile.</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button onClick={saveStaff}>{editStaff ? "Salva" : "Aggiungi"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- CREDENZIALI APPENA CREATE ---------- */}
      <CredentialsDialog data={credentials} onClose={() => setCredentials(null)} />
      </TooltipProvider>
    </AppLayout>
  );
}

function CredentialsDialog({
  data,
  onClose,
}: {
  data: null | { studio_name: string; first_name: string; email: string; password: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!data) return null;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const emailBody =
    `Ciao ${data.first_name},\n\n` +
    `il tuo account DentAI è stato attivato.\n` +
    `Accedi su ${appUrl} con:\n\n` +
    `Email: ${data.email}\n` +
    `Password temporanea: ${data.password}\n\n` +
    `Ti consigliamo di cambiare la password al primo accesso.`;
  const subject = "Il tuo account DentAI è pronto";
  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };
  const sendEmail = () => {
    const mailto = `mailto:${encodeURIComponent(data.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailto;
    toast.success("Apertura client email…");
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account creato</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Puoi inviare le credenziali allo studio quando sei pronto. Non è stata mandata nessuna email automatica.
        </p>
        <div className="space-y-2 mt-2">
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between text-sm">
              <div><span className="text-muted-foreground">Studio:</span> <span className="font-medium">{data.studio_name}</span></div>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="truncate"><span className="text-muted-foreground">Email:</span> <span className="font-mono">{data.email}</span></div>
              <Button size="sm" variant="ghost" onClick={() => copy("email", data.email)}>
                {copied === "email" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="truncate"><span className="text-muted-foreground">Password:</span> <span className="font-mono">{data.password}</span></div>
              <Button size="sm" variant="ghost" onClick={() => copy("pw", data.password)}>
                {copied === "pw" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Chiudi</Button>
          <Button className="bg-gradient-primary" onClick={sendEmail}>
            <Mail className="size-4 mr-1.5" /> Invia credenziali ora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

