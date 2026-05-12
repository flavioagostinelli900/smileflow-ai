import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { TrendingUp, Sparkles, CheckCircle2, XCircle, Clock, Send, Euro } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { UpsellOffer, UpsellRule } from "@/lib/upsell";
import { expireOldOffers } from "@/lib/upsell";
import { useEffect } from "react";
import { toast } from "sonner";
import type { Client } from "@/lib/api";
import { usePermissions } from "@/lib/usePermissions";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";

export const Route = createFileRoute("/upsell")({
  component: UpsellPage,
  head: () => ({ meta: [{ title: "Upsell · DentAI" }] }),
});

const TRIGGER_LABELS: Record<UpsellRule["trigger_type"], string> = {
  igiene_count: "Dopo N igieni",
  visit_count: "Dopo N visite",
  family_id: "Famiglia",
  inactive_months: "Inattivo da N mesi",
};

const statusBadge = (s: UpsellOffer["status"]) => {
  switch (s) {
    case "active": return <Badge className="bg-primary/15 text-primary"><Clock className="size-3 mr-1" />Attiva</Badge>;
    case "used": return <Badge className="bg-success/15 text-success"><CheckCircle2 className="size-3 mr-1" />Utilizzata</Badge>;
    case "expired": return <Badge variant="outline">Scaduta</Badge>;
    case "refused": return <Badge className="bg-destructive/15 text-destructive"><XCircle className="size-3 mr-1" />Rifiutata</Badge>;
  }
};

function UpsellPage() {
  const qc = useQueryClient();
  const { canManage } = usePermissions();

  useEffect(() => { expireOldOffers().then(() => qc.invalidateQueries({ queryKey: ["upsell-offers"] })); }, [qc]);

  const { data: rules = [] } = useQuery({
    queryKey: ["upsell-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("upsell_rules").select("*").order("created_at");
      return (data ?? []) as UpsellRule[];
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["upsell-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("upsell_offers").select("*").order("sent_at", { ascending: false });
      const ids = Array.from(new Set((data ?? []).map((o) => o.client_id).filter(Boolean) as string[]));
      const { data: clients } = ids.length ? await supabase.from("clients").select("*").in("id", ids) : { data: [] as Client[] };
      const map = new Map((clients ?? []).map((c) => [c.id, c as Client]));
      return ((data ?? []) as UpsellOffer[]).map((o) => ({ ...o, client: o.client_id ? map.get(o.client_id) ?? null : null }));
    },
  });

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthOffers = offers.filter((o) => new Date(o.sent_at) >= monthStart);
  const accepted = monthOffers.filter((o) => o.status === "used");
  const conversionRate = monthOffers.length > 0 ? Math.round((accepted.length / monthOffers.length) * 100) : 0;
  const revenue = accepted.reduce((sum, o) => sum + (Number(o.revenue_generated) || 0), 0);

  const toggleRule = async (r: UpsellRule, active: boolean) => {
    await supabase.from("upsell_rules").update({ active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["upsell-rules"] });
  };

  const updateRule = async (r: UpsellRule, patch: Partial<UpsellRule>) => {
    await supabase.from("upsell_rules").update(patch).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["upsell-rules"] });
  };

  const markUsed = async (o: UpsellOffer) => {
    const revenue = prompt("Fatturato generato (€):", "150");
    if (revenue == null) return;
    await supabase.from("upsell_offers").update({ status: "used", used_at: new Date().toISOString(), revenue_generated: Number(revenue) || 0 }).eq("id", o.id);
    toast.success("Offerta segnata come utilizzata");
    qc.invalidateQueries({ queryKey: ["upsell-offers"] });
  };

  const refuseOffer = async (o: UpsellOffer) => {
    await supabase.from("upsell_offers").update({ status: "refused" }).eq("id", o.id);
    qc.invalidateQueries({ queryKey: ["upsell-offers"] });
  };

  return (
    <AppLayout>
      {!canManage && <ReadOnlyBanner className="mb-4" />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Send className="size-3.5" />Inviate (mese)</div><div className="text-2xl font-semibold">{monthOffers.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Accettate</div><div className="text-2xl font-semibold text-success">{accepted.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><TrendingUp className="size-3.5" />Conversione</div><div className="text-2xl font-semibold">{conversionRate}%</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Euro className="size-3.5" />Fatturato</div><div className="text-2xl font-semibold">€ {revenue.toFixed(0)}</div></Card>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="p-5 lg:col-span-3">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles className="size-4 text-primary" />Offerte attive e recenti</h3>
          <div className="space-y-2">
            {offers.slice(0, 20).map((o) => (
              <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="size-9 rounded-lg bg-gradient-primary/10 flex items-center justify-center"><TrendingUp className="size-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{o.client ? `${o.client.first_name} ${o.client.last_name}` : "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.treatment} · −{o.discount_percent}%</div>
                </div>
                <div className="text-xs text-muted-foreground hidden md:block">scade {new Date(o.expires_at).toLocaleDateString("it")}</div>
                {statusBadge(o.status)}
                {o.status === "active" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => markUsed(o)}>Usa</Button>
                    <Button size="sm" variant="ghost" onClick={() => refuseOffer(o)}>×</Button>
                  </div>
                )}
              </div>
            ))}
            {offers.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nessuna offerta inviata</p>}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles className="size-4 text-primary" />Configurazione regole</h3>
          <fieldset disabled={!canManage} className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{TRIGGER_LABELS[r.trigger_type]} · soglia {r.threshold}</div>
                  </div>
                  <Switch checked={r.active} onCheckedChange={(v) => toggleRule(r, v)} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <label className="space-y-1"><span className="text-muted-foreground">Sconto %</span>
                    <Input type="number" defaultValue={r.discount_percent} onBlur={(e) => updateRule(r, { discount_percent: Number(e.target.value) })} className="h-8" />
                  </label>
                  <label className="space-y-1"><span className="text-muted-foreground">Soglia</span>
                    <Input type="number" defaultValue={r.threshold} onBlur={(e) => updateRule(r, { threshold: Number(e.target.value) })} className="h-8" />
                  </label>
                  <label className="space-y-1"><span className="text-muted-foreground">Validità (gg)</span>
                    <Input type="number" defaultValue={r.validity_days} onBlur={(e) => updateRule(r, { validity_days: Number(e.target.value) })} className="h-8" />
                  </label>
                </div>
                <div className="text-[11px] text-muted-foreground truncate">→ {r.treatment}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
