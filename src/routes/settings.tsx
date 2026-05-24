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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, Clock, Stethoscope, Phone, MessageSquare, Save, Plus, Trash2, Sparkles } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type StudioSettings, type OpeningHour, type VisitType, type FollowupConfig, DEFAULT_FOLLOWUP_CONFIG } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/lib/usePermissions";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";

export const Route = createFileRoute("/settings")({
  component: Settings,
  head: () => ({ meta: [{ title: "Configurazione · DentAI" }] }),
});

const templateLabels: Record<string, string> = {
  followup_1: "Follow-up messaggio 1",
  followup_2: "Follow-up messaggio 2",
  followup_3: "Follow-up messaggio 3",
  reminder_24h: "Reminder 24h",
  reminder_2h: "Reminder 2h",
  post_visit: "Post-visita / recensione",
};

function Settings() {
  const qc = useQueryClient();
  const { canManage, loading: permissionsLoading } = usePermissions();
  const ro = !canManage;
  const { data: settings } = useQuery({
    queryKey: ["studio-settings"],
    queryFn: async () => {
      const { data, error } = await api.studioSettings();
      if (error) throw error;
      return data as StudioSettings | null;
    },
  });

  const [draft, setDraft] = useState<StudioSettings | null>(null);
  useEffect(() => { if (settings) setDraft(settings); }, [settings]);

  if (!draft) return <AppLayout><div className="text-muted-foreground">Caricamento…</div></AppLayout>;
  if (permissionsLoading) return <AppLayout><div className="text-muted-foreground">Caricamento permessi…</div></AppLayout>;

  const save = async (patch: Partial<StudioSettings>) => {
    if (!canManage) return;
    const { error } = await supabase.from("studio_settings").update(patch).eq("id", draft.id);
    if (error) toast.error(error.message); else { toast.success("Configurazione salvata"); qc.invalidateQueries({ queryKey: ["studio-settings"] }); }
  };

  const updateDay = (i: number, patch: Partial<OpeningHour>) => {
    const hours = [...draft.opening_hours]; hours[i] = { ...hours[i], ...patch };
    setDraft({ ...draft, opening_hours: hours });
  };
  const updateVisit = (i: number, patch: Partial<VisitType>) => {
    const v = [...draft.visit_types]; v[i] = { ...v[i], ...patch };
    setDraft({ ...draft, visit_types: v });
  };
  const addVisit = () => setDraft({ ...draft, visit_types: [...draft.visit_types, { name: "Nuova visita", minutes: 30, ai_booking: false, suitable_for: "all", avg_price: 0 }] });
  const removeVisit = (i: number) => setDraft({ ...draft, visit_types: draft.visit_types.filter((_, idx) => idx !== i) });

  return (
    <AppLayout>
      {ro && <ReadOnlyBanner className="mb-4" />}
      <Tabs defaultValue="studio" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="studio"><Building2 className="size-3.5 mr-1.5" />Dati studio</TabsTrigger>
          <TabsTrigger value="hours"><Clock className="size-3.5 mr-1.5" />Orari</TabsTrigger>
          <TabsTrigger value="visits"><Stethoscope className="size-3.5 mr-1.5" />Durate visite</TabsTrigger>
          <TabsTrigger value="whatsapp"><Phone className="size-3.5 mr-1.5" />WhatsApp</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="size-3.5 mr-1.5" />Messaggi</TabsTrigger>
          <TabsTrigger value="followup"><Sparkles className="size-3.5 mr-1.5" />Follow-up</TabsTrigger>
        </TabsList>
        <fieldset disabled={ro} className={ro ? "opacity-90" : ""}>

        <TabsContent value="studio">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold mb-2">Dati studio</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Nome studio</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label>Indirizzo</Label><Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></div>
              <div><Label>Numero fisso</Label><Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
              <div><Label>WhatsApp AI</Label><Input value={draft.whatsapp_ai ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_ai: e.target.value })} /></div>
            </div>
            {canManage && <Button onClick={() => save({ name: draft.name, address: draft.address, phone: draft.phone, whatsapp_ai: draft.whatsapp_ai })} className="bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva</Button>}
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Orari di apertura</h3>
            <div className="space-y-3">
              {draft.opening_hours.map((d, i) => (
                <div key={d.day} className="grid grid-cols-[110px_1fr_1fr_auto] items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="font-medium text-sm">{d.day}</div>
                  <div><Input type="time" value={d.open} onChange={(e) => updateDay(i, { open: e.target.value })} disabled={!d.active} /></div>
                  <div><Input type="time" value={d.close} onChange={(e) => updateDay(i, { close: e.target.value })} disabled={!d.active} /></div>
                  <div className="flex items-center gap-2">
                    <Switch checked={d.active} onCheckedChange={(v) => updateDay(i, { active: v })} />
                    <span className="text-xs text-muted-foreground w-12">{d.active ? "Aperto" : "Chiuso"}</span>
                  </div>
                </div>
              ))}
            </div>
            {canManage && <Button onClick={() => save({ opening_hours: draft.opening_hours })} className="mt-4 bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva orari</Button>}
          </Card>
        </TabsContent>

        <TabsContent value="visits">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Durate visite</h3>
              {canManage && <Button size="sm" variant="outline" onClick={addVisit}><Plus className="size-4 mr-1.5" />Tipo visita</Button>}
            </div>
            <div className="space-y-3">
              {draft.visit_types.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_180px_auto] items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Input value={v.name} onChange={(e) => updateVisit(i, { name: e.target.value })} placeholder="Nome visita" />
                  <div className="flex items-center gap-2">
                    <Input type="number" value={v.minutes} onChange={(e) => updateVisit(i, { minutes: Number(e.target.value) })} className="w-20" />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={v.ai_booking} onCheckedChange={(b) => updateVisit(i, { ai_booking: b })} />
                    <span className="text-xs text-muted-foreground">Prenotazione AI</span>
                  </div>
                  {canManage && <Button size="icon" variant="ghost" onClick={() => removeVisit(i)} className="text-destructive"><Trash2 className="size-4" /></Button>}
                </div>
              ))}
            </div>
            {canManage && <Button onClick={() => save({ visit_types: draft.visit_types })} className="mt-4 bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva</Button>}
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Numero WhatsApp</h3>
            <RadioGroup value={draft.whatsapp_mode} onValueChange={(v) => setDraft({ ...draft, whatsapp_mode: v as "dedicated" | "studio" })} className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="dedicated" className="mt-1" />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">Numero dedicato AI <Badge className="bg-primary/15 text-primary">Consigliato</Badge></div>
                  <p className="text-xs text-muted-foreground mt-1">Un nuovo numero gestito al 100% dall'AI per follow-up, recupero clienti e prenotazioni automatiche, senza interferire con il numero storico dello studio.</p>
                  <Input className="mt-2" value={draft.whatsapp_ai ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_ai: e.target.value })} placeholder="+39 ..." />
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="studio" className="mt-1" />
                <div className="flex-1">
                  <div className="font-medium">Numero storico studio</div>
                  <p className="text-xs text-muted-foreground mt-1">L'AI risponde sul numero esistente dello studio. I pazienti vedono il numero che già conoscono, ma operatore e AI condividono lo stesso canale.</p>
                  <Input className="mt-2" value={draft.whatsapp_studio ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp_studio: e.target.value })} placeholder="+39 ..." />
                </div>
              </label>
            </RadioGroup>
            {canManage && <Button onClick={() => save({ whatsapp_mode: draft.whatsapp_mode, whatsapp_ai: draft.whatsapp_ai, whatsapp_studio: draft.whatsapp_studio })} className="mt-4 bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva</Button>}
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-3">
          {Object.keys(templateLabels).map((k) => (
            <Card key={k} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{templateLabels[k]}</h4>
                <Badge variant="outline" className="text-[10px] font-mono">{`{nome} {ora} {data}`}</Badge>
              </div>
              <Textarea value={draft.message_templates?.[k] ?? ""}
                onChange={(e) => setDraft({ ...draft, message_templates: { ...draft.message_templates, [k]: e.target.value } })}
                rows={2} />
            </Card>
          ))}
          {canManage && <Button onClick={() => save({ message_templates: draft.message_templates })} className="bg-gradient-primary"><Save className="size-4 mr-1.5" />Salva messaggi</Button>}
        </TabsContent>

        <TabsContent value="followup">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold">Sconto pazienti non rispondenti</h3>
              <p className="text-xs text-muted-foreground">Configura lo sconto inviato al terzo messaggio quando un paziente inattivo non risponde alle prime due email/WhatsApp.</p>
            </div>

            {(() => {
              const cfg: FollowupConfig = { ...DEFAULT_FOLLOWUP_CONFIG, ...(draft.followup_config ?? {}) };
              const setCfg = (patch: Partial<FollowupConfig>) =>
                setDraft({ ...draft, followup_config: { ...cfg, ...patch } });
              return (
                <>
                  <label className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div>
                      <div className="font-medium text-sm">Abilita sconto per non rispondenti</div>
                      <p className="text-xs text-muted-foreground">Quando attivo, al 3° messaggio viene proposto uno sconto.</p>
                    </div>
                    <Switch checked={cfg.discount_enabled} onCheckedChange={(v) => setCfg({ discount_enabled: v })} />
                  </label>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Percentuale sconto (%)</Label>
                      <Input type="number" min={1} max={100} value={cfg.discount_percent}
                        onChange={(e) => setCfg({ discount_percent: Number(e.target.value) })}
                        disabled={!cfg.discount_enabled} />
                    </div>
                    <div>
                      <Label>Validità sconto (giorni)</Label>
                      <Input type="number" min={1} max={90} value={cfg.discount_validity_days}
                        onChange={(e) => setCfg({ discount_validity_days: Number(e.target.value) })}
                        disabled={!cfg.discount_enabled} />
                    </div>
                  </div>

                  <div>
                    <Label>Tipo visita</Label>
                    <select
                      className="w-full h-10 border rounded-md px-2 bg-background"
                      value={cfg.visit_type_scope}
                      onChange={(e) => setCfg({ visit_type_scope: e.target.value as FollowupConfig["visit_type_scope"] })}
                      disabled={!cfg.discount_enabled}
                    >
                      <option value="all">Tutti</option>
                      <option value="hygiene">Solo igiene</option>
                      <option value="checkup">Solo controllo</option>
                      <option value="custom">Personalizzato</option>
                    </select>
                  </div>

                  {cfg.visit_type_scope === "custom" && (
                    <div>
                      <Label>Tipi visita inclusi (separati da virgola)</Label>
                      <Input
                        value={(cfg.custom_visit_types ?? []).join(", ")}
                        onChange={(e) => setCfg({ custom_visit_types: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        disabled={!cfg.discount_enabled}
                        placeholder="Es. Sbiancamento, Ortodonzia"
                      />
                    </div>
                  )}

                  <Card className="p-4 bg-muted/40 text-xs text-muted-foreground">
                    <div className="font-medium text-foreground mb-1">Anteprima messaggio (3° invio)</div>
                    {cfg.discount_enabled ? (
                      <>
                        Ciao [Nome] 🙂<br />
                        Per te abbiamo riservato uno sconto speciale del {cfg.discount_percent}% sulla prossima visita.<br />
                        Valido fino al [data + {cfg.discount_validity_days} giorni].<br />
                        Vuoi approfittarne?
                      </>
                    ) : (
                      <>Ciao [Nome], capisco che potresti essere occupato. Siamo qui quando vuoi 🙂</>
                    )}
                  </Card>

                  {canManage && (
                    <Button onClick={() => save({ followup_config: cfg })} className="bg-gradient-primary">
                      <Save className="size-4 mr-1.5" />Salva configurazione follow-up
                    </Button>
                  )}
                </>
              );
            })()}
          </Card>
        </TabsContent>
        </fieldset>
      </Tabs>
    </AppLayout>
  );
}
