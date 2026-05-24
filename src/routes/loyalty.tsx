import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Gift, Tag, Clock, TrendingUp, Sparkles } from "lucide-react";
import { usePermissions } from "@/lib/usePermissions";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Reward, type Client } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty")({
  component: Loyalty,
  head: () => ({ meta: [{ title: "Fedeltà · DentAI" }] }),
});

type RewardRow = Reward & { client: Client | null };

function Loyalty() {
  const { canManage, loading: permissionsLoading } = usePermissions();
  const qc = useQueryClient();
  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ["rewards"],
    queryFn: async () => {
      const { data, error } = await api.rewards();
      if (error) throw error;
      return (data ?? []) as RewardRow[];
    },
  });

  if (permissionsLoading) {
    return <AppLayout><div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4 animate-pulse text-primary" />Caricamento permessi…</div></AppLayout>;
  }

  const now = Date.now();
  const in7 = now + 7 * 24 * 60 * 60 * 1000;
  const active = rewards.filter((r) => !r.used && (!r.expires_at || new Date(r.expires_at).getTime() > now));
  const used = rewards.filter((r) => r.used).length;
  const expiringSoon = active.filter((r) => r.expires_at && new Date(r.expires_at).getTime() <= in7).length;

  const toggleReward = async (r: RewardRow) => {
    const { error } = await supabase.from("loyalty_rewards").update({ used: !r.used }).eq("id", r.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["rewards"] });
  };

  return (
    <AppLayout>
      {!canManage && <ReadOnlyBanner className="mb-4" />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-5">
          <Gift className="size-5 text-primary mb-3" />
          <div className="text-2xl font-semibold">{active.length}</div>
          <div className="text-xs text-muted-foreground">Premi attivi</div>
        </Card>
        <Card className="p-5">
          <Tag className="size-5 text-info mb-3" />
          <div className="text-2xl font-semibold">{used}</div>
          <div className="text-xs text-muted-foreground">Coupon utilizzati</div>
        </Card>
        <Card className="p-5">
          <Clock className="size-5 text-warning mb-3" />
          <div className="text-2xl font-semibold">{expiringSoon}</div>
          <div className="text-xs text-muted-foreground">In scadenza 7gg</div>
        </Card>
        <Card className="p-5">
          <TrendingUp className="size-5 text-success mb-3" />
          <div className="text-2xl font-semibold">{rewards.length}</div>
          <div className="text-xs text-muted-foreground">Totale emessi</div>
        </Card>
      </div>

      <Card>
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Programma fedeltà</h3>
            <p className="text-xs text-muted-foreground">Premi e scontistiche automatiche via WhatsApp</p>
          </div>
          {canManage && <Button className="bg-gradient-primary" size="sm">Nuovo premio</Button>}
        </div>
        <div className="divide-y">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Caricamento…</div>
          ) : rewards.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nessun premio configurato.</div>
          ) : rewards.map((r) => {
            const target = r.client ? `${r.client.first_name} ${r.client.last_name}` : "Tutti";
            const expires = r.expires_at ? new Date(r.expires_at).toLocaleDateString("it", { day: "2-digit", month: "short" }) : "Mai";
            const isActive = !r.used && (!r.expires_at || new Date(r.expires_at).getTime() > now);
            return (
              <div key={r.id} className="p-4 flex items-center gap-4">
                <div className="size-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                  <Gift className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{target} · scade {expires}{r.discount_percent ? ` · -${r.discount_percent}%` : ""}</div>
                </div>
                <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success/15 text-success hover:bg-success/15" : ""}>
                  {isActive ? "Attivo" : r.used ? "Usato" : "Scaduto"}
                </Badge>
                <Switch checked={isActive} disabled={!canManage} onCheckedChange={() => toggleReward(r)} />
              </div>
            );
          })}
        </div>
      </Card>
    </AppLayout>
  );
}
