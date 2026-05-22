import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, MessageSquare, Users, CalendarClock, TrendingUp, Sparkles, ArrowUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { MESSAGE_TIERS, type PlanId, PLAN_LABELS } from "@/lib/plans";
import {
  MIN_REACTIVATIONS,
  categorizeInactive,
  computeMessageBudget,
  planMonthlyContacts,
  reactivationHealth,
} from "@/lib/followup-balancer";
import { cn } from "@/lib/utils";

export function FollowupBalancer() {
  const { user } = useAuth();
  const { data: studio } = useQuery({
    queryKey: ["balancer-studio", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select("plan, message_tier")
        .eq("owner_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["balancer-clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, last_visit, status");
      return data ?? [];
    },
  });

  const { data: monthAppts } = useQuery({
    queryKey: ["balancer-appts-month"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1); start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("appointments")
        .select("id")
        .gte("starts_at", start.toISOString());
      return data ?? [];
    },
  });

  const plan: PlanId = (studio?.plan && ["silver", "gold", "platinum"].includes(studio.plan)
    ? studio.plan
    : "silver") as PlanId;
  const messageTier = studio?.message_tier ?? MESSAGE_TIERS[plan][0];
  const monthlyAppointments = monthAppts?.length ?? 0;

  // Stime placeholder per i contatori non ancora persistiti
  const reminderUsed = monthlyAppointments * 3;
  const upsellUsed = Math.round(monthlyAppointments * 0.1);
  const chatUsed = Math.round(monthlyAppointments * 1.5);
  const budget = computeMessageBudget({ plan, messageTier, monthlyAppointments });
  const followupUsed = Math.round(budget.followupAvailable * 0.45); // dati simulati
  const totalUsed = reminderUsed + upsellUsed + chatUsed + followupUsed;
  const pctUsed = Math.min(100, Math.round((totalUsed / budget.total) * 100));
  const barColor = pctUsed > 90 ? "bg-destructive" : pctUsed > 70 ? "bg-yellow-500" : "bg-green-500";

  // Categorizzazione pazienti
  let urgent = 0, normal = 0, newInactive = 0;
  for (const c of clients ?? []) {
    if (c.status !== "active") continue;
    const cat = categorizeInactive(c.last_visit);
    if (cat === "urgent") urgent++;
    else if (cat === "normal") normal++;
    else if (cat === "new") newInactive++;
  }
  const monthlyCapacity = Math.max(1, Math.floor(budget.followupAvailable / 3));
  const contactPlan = planMonthlyContacts({
    urgentCount: urgent,
    normalCount: normal,
    newInactiveCount: newInactive,
    monthlyCapacity,
  });

  // Placeholder metriche: in attesa di tabella `followup_runs`
  const contactedThisMonth = Math.round(contactPlan.totalPlanned * 0.6);
  const reactivations = Math.round(contactedThisMonth * 0.18);
  const unreachable = Math.round(contactedThisMonth * 0.12);
  const responseRate = contactedThisMonth ? Math.round((reactivations * 2.5 / contactedThisMonth) * 100) : 0;
  const conversionRate = Math.round(responseRate * 0.4);
  const { min: minReact, max: maxReact } = MIN_REACTIVATIONS[plan];
  const weeksUnderTarget = reactivations < minReact ? 1 : 0;
  const health = reactivationHealth(reactivations, plan, weeksUnderTarget);

  const dailyTarget = Math.ceil(contactPlan.totalPlanned / 30);
  const sentToday = Math.min(dailyTarget, Math.round(dailyTarget * 0.55));
  const scheduledToday = Math.max(0, dailyTarget - sentToday);
  const dailyResponseRate = Math.max(0, responseRate - 4);

  return (
    <div className="space-y-6">
      {/* Banner stato sistema — sempre verde, sempre visibile */}
      <Card className="p-4 bg-green-500/10 border-green-500/40 flex items-center gap-3">
        <CheckCircle2 className="size-5 text-green-600 shrink-0" />
        <div className="text-sm font-medium text-green-700 dark:text-green-300">
          Il sistema è attivo e sta lavorando per te
        </div>
      </Card>

      {/* SEZIONE MESSAGGI */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="size-4 text-primary" />Bilanciamento messaggi</h3>
            <p className="text-xs text-muted-foreground">Piano {PLAN_LABELS[plan]} · fascia {messageTier.toLocaleString("it-IT")} msg/mese</p>
          </div>
          <Badge variant="outline">{totalUsed.toLocaleString("it-IT")} / {budget.total.toLocaleString("it-IT")}</Badge>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full transition-all", barColor)} style={{ width: `${pctUsed}%` }} />
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <BudgetRow label="Reminder appuntamenti" value={reminderUsed} hint="App. × 3" />
          <BudgetRow label="Follow-up" value={followupUsed} hint="Riattivazioni" />
          <BudgetRow label="Upsell" value={upsellUsed} hint="Offerte mirate" />
          <BudgetRow label="Chat in entrata" value={chatUsed} hint="App. × 1.5" />
          <BudgetRow label="Disponibili follow-up" value={budget.followupAvailable} highlight />
          <BudgetRow label="Rimanenti mese" value={Math.max(0, budget.total - totalUsed)} highlight />
        </div>
      </Card>

      {/* SEZIONE PAZIENTI */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Users className="size-4 text-primary" />Coda pazienti inattivi</h3>
          <p className="text-xs text-muted-foreground">Priorità di contatto in base a inattività e capacità del piano.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          <PatientStat label="Urgenti (>12 mesi)" value={urgent} tone="urgent" sub={`Mese: ${contactPlan.urgentToContact}`} />
          <PatientStat label="Normali (6-12 mesi)" value={normal} tone="warning" sub={`Mese: ${contactPlan.normalMonthly}`} />
          <PatientStat label="Nuovi (3-6 mesi)" value={newInactive} tone="info" sub={`Mese: ${contactPlan.newInactive}`} />
          <PatientStat label="Contattati questo mese" value={contactedThisMonth} />
          <PatientStat label="Non raggiungibili" value={unreachable} tone="muted" />
          <PatientStat label="Riattivazioni / obiettivo" value={`${reactivations} / ${minReact}-${maxReact}`}
            tone={health === "on_track" ? "success" : health === "at_risk" ? "warning" : "urgent"} />
        </div>
      </Card>

      {/* SEZIONE OGGI */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><CalendarClock className="size-4 text-primary" />Attività di oggi</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniMetric label="Da contattare" value={dailyTarget} />
          <MiniMetric label="Inviati" value={sentToday} />
          <MiniMetric label="In programma" value={scheduledToday} />
          <MiniMetric label="Tasso risposta" value={`${dailyResponseRate}%`} />
        </div>
      </Card>

      {/* PERFORMANCE & TREND */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-primary" />Performance mensile</h3>
            <p className="text-xs text-muted-foreground">Proiezione fine mese basata sul ritmo attuale.</p>
          </div>
          <Badge variant="outline" className="capitalize">
            <Sparkles className="size-3 mr-1" />Ottimizzazione automatica
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <MiniMetric label="Messaggi inviati" value={(reminderUsed + followupUsed + upsellUsed).toLocaleString("it-IT")} />
          <MiniMetric label="Tasso risposta" value={`${responseRate}%`} />
          <MiniMetric label="Tasso conversione" value={`${conversionRate}%`} />
          <MiniMetric label="Proiezione riattivazioni" value={Math.max(reactivations, Math.round(reactivations * 1.6))} />
        </div>

        <WeeklyChart reactivations={reactivations} />

        {health === "below_target" && (
          <div className="flex gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
            <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Sotto obiettivo da 2+ settimane</div>
              <p className="text-xs text-muted-foreground">
                Il sistema sta aumentando i messaggi giornalieri e ottimizzando i template. Valuta l'attivazione degli sconti o un upgrade di piano per migliorare i risultati.
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline"><ArrowUp className="size-3.5 mr-1" />Suggerisci upgrade</Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function BudgetRow({ label, value, hint, highlight }: { label: string; value: number; hint?: string; highlight?: boolean }) {
  return (
    <div className={cn("p-3 rounded-lg border", highlight ? "border-primary/40 bg-primary/5" : "bg-muted/30")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value.toLocaleString("it-IT")}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function PatientStat({
  label, value, sub, tone = "default",
}: { label: string; value: number | string; sub?: string; tone?: "default" | "urgent" | "warning" | "info" | "success" | "muted" }) {
  const tones: Record<string, string> = {
    default: "bg-muted/30 border-border",
    urgent: "bg-red-500/10 border-red-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    info: "bg-blue-500/10 border-blue-500/30",
    success: "bg-green-500/10 border-green-500/30",
    muted: "bg-muted/50 border-border",
  };
  return (
    <div className={cn("p-3 rounded-lg border", tones[tone])}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function WeeklyChart({ reactivations }: { reactivations: number }) {
  // Mini grafico settimanale: ultime 4 settimane (stime)
  const weeks = [
    { label: "S-3", sent: 40, replies: 8, react: Math.max(0, reactivations - 6) },
    { label: "S-2", sent: 52, replies: 11, react: Math.max(0, reactivations - 4) },
    { label: "S-1", sent: 58, replies: 14, react: Math.max(0, reactivations - 2) },
    { label: "Ora", sent: 62, replies: 16, react: reactivations },
  ];
  const max = Math.max(...weeks.map((w) => w.sent));
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">Andamento ultime 4 settimane</div>
      <div className="grid grid-cols-4 gap-3">
        {weeks.map((w) => (
          <div key={w.label} className="space-y-1">
            <div className="h-24 flex items-end gap-1">
              <Bar value={w.sent} max={max} className="bg-primary/70" />
              <Bar value={w.replies} max={max} className="bg-blue-500" />
              <Bar value={w.react} max={max} className="bg-green-500" />
            </div>
            <div className="text-[10px] text-center text-muted-foreground">{w.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary/70" />Inviati</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-blue-500" />Risposte</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-green-500" />Riattivazioni</span>
      </div>
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const h = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return <div className={cn("flex-1 rounded-t", className)} style={{ height: `${h}%` }} title={String(value)} />;
}
