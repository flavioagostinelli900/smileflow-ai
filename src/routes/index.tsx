import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, UserCheck, PhoneIncoming, Send, MessagesSquare, Sparkles, Calendar, KeyRound, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getDashboardRevenue } from "@/lib/revenue.functions";
import { supabase } from "@/integrations/supabase/client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { useEffect, useMemo, useState } from "react";
import { it } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "DentAI · Dashboard" },
      {
        name: "description",
        content:
          "Piattaforma AI per studi dentistici: follow-up automatici, recupero pazienti, prenotazioni WhatsApp e gestione chiamate perse.",
      },
    ],
  }),
});

const PRESETS = [
  { key: "7", label: "7gg", days: 7 },
  { key: "30", label: "30gg", days: 30 },
  { key: "90", label: "90gg", days: 90 },
] as const;

const STORAGE_KEY = "dentai_dashboard_range";

function rangeFromDays(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

function fmt(d: Date) { return d.toLocaleDateString("it-IT"); }

function Dashboard() {
  const [preset, setPreset] = useState<string>(() => {
    if (typeof window === "undefined") return "7";
    return sessionStorage.getItem(STORAGE_KEY) || "7";
  });
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [appliedCustom, setAppliedCustom] = useState<DateRange | undefined>(undefined);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_KEY, preset);
  }, [preset]);

  const range = useMemo(() => {
    if (preset === "custom" && appliedCustom?.from && appliedCustom?.to) {
      return { from: appliedCustom.from, to: appliedCustom.to };
    }
    const days = PRESETS.find((p) => p.key === preset)?.days ?? 7;
    return rangeFromDays(days);
  }, [preset, appliedCustom]);

  const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000) + 1);

  const fromIso = useMemo(() => {
    const d = new Date(range.from); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, [range.from]);
  const toIso = useMemo(() => {
    const d = new Date(range.to); d.setHours(23, 59, 59, 999); return d.toISOString();
  }, [range.to]);

  const fetchRevenue = useServerFn(getDashboardRevenue);
  const { data: revenueData } = useQuery({
    queryKey: ["dashboard-revenue", fromIso, toIso],
    queryFn: () => fetchRevenue({ data: { from: fromIso, to: toIso } }),
  });
  const realRevenue = revenueData?.total ?? 0;
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Real-time stats from Supabase scoped to selected range
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics", fromIso, toIso],
    queryFn: async () => {
      const [appts, missed, msgs, convos, recentConvosRes, apptList] = await Promise.all([
        supabase.from("appointments").select("id, visit_type, starts_at, source", { count: "exact" })
          .gte("starts_at", fromIso).lte("starts_at", toIso),
        supabase.from("missed_calls").select("id, status", { count: "exact" })
          .gte("called_at", fromIso).lte("called_at", toIso),
        supabase.from("messages").select("id", { count: "exact", head: true })
          .gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("conversations").select("id, status", { count: "exact" })
          .gte("last_message_at", fromIso).lte("last_message_at", toIso),
        supabase.from("conversations")
          .select("id, status, tags, last_message_at, client:clients(first_name,last_name), messages(content,created_at)")
          .order("last_message_at", { ascending: false })
          .limit(5),
        supabase.from("appointments").select("starts_at, visit_type, source")
          .gte("starts_at", fromIso).lte("starts_at", toIso),
      ]);
      const apptsRows = (apptList.data ?? []) as { starts_at: string; visit_type: string; source: string | null }[];
      const recovered = (missed.data ?? []).filter((m) => m.status === "converted").length;
      return {
        apptsCount: appts.count ?? 0,
        recovered,
        callsCount: missed.count ?? 0,
        msgsCount: msgs.count ?? 0,
        convosCount: convos.count ?? 0,
        apptsRows,
        recent: (recentConvosRes.data ?? []) as Array<{
          id: string; status: string; tags: string[]; last_message_at: string;
          client: { first_name: string; last_name: string } | null;
          messages: { content: string; created_at: string }[] | null;
        }>,
      };
    },
  });

  const stats = {
    appts: metrics?.apptsCount ?? 0,
    recovered: metrics?.recovered ?? 0,
    calls: metrics?.callsCount ?? 0,
    msgs: metrics?.msgsCount ?? 0,
    convos: metrics?.convosCount ?? 0,
    revenue: realRevenue >= 1000 ? `${(realRevenue / 1000).toFixed(1)}k` : realRevenue.toFixed(0),
    response: metrics && metrics.callsCount > 0
      ? Math.round((metrics.recovered / metrics.callsCount) * 100)
      : 0,
  };

  const trend = useMemo(() => {
    const rows = metrics?.apptsRows ?? [];
    const len = Math.min(14, Math.max(3, days));
    const buckets: { d: string; appt: number; recovered: number }[] = [];
    for (let i = len - 1; i >= 0; i--) {
      const d = new Date(range.to); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayLabel = len <= 7
        ? ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"][d.getDay()]
        : `${d.getDate()}/${d.getMonth() + 1}`;
      const inDay = rows.filter((r) => {
        const t = new Date(r.starts_at).getTime();
        return t >= d.getTime() && t < next.getTime();
      });
      buckets.push({
        d: dayLabel,
        appt: inDay.length,
        recovered: inDay.filter((r) => r.source === "ai_chat").length,
      });
    }
    return buckets;
  }, [metrics?.apptsRows, days, range.to]);

  const channels = useMemo(() => {
    const rows = metrics?.apptsRows ?? [];
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.visit_type, (map.get(r.visit_type) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, v]) => ({ name, v }));
  }, [metrics?.apptsRows]);

  const recentConvos = useMemo(() => {
    return (metrics?.recent ?? []).map((c) => {
      const name = c.client ? `${c.client.first_name} ${c.client.last_name}` : "Sconosciuto";
      const last = (c.messages ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      const tag = c.tags?.[0] ?? "Conversazione";
      const status = c.status === "booked" ? "Convertito" : c.status === "operator" ? "Operatore" : "AI";
      return { name, msg: last?.content ?? "—", tag, status };
    });
  }, [metrics?.recent]);


  const rangeLabel = preset === "custom" && appliedCustom?.from && appliedCustom?.to
    ? `${fmt(appliedCustom.from)} - ${fmt(appliedCustom.to)}`
    : `Ultimi ${PRESETS.find((p) => p.key === preset)?.days ?? 7} giorni`;

  return (
    <AppLayout>
      <PasswordChangeBanner />
      {/* Hero strip */}
      <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 md:p-8 mb-4 shadow-elevated relative overflow-hidden">

        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-xs bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-3">
              <Sparkles className="size-3" /> AI Assistant attivo
            </div>
            <h2 className="text-xl md:text-3xl font-semibold tracking-tight">
              Benvenuto, Studio Dentistico Rossi
            </h2>
            <p className="text-primary-foreground/80 mt-1 text-sm">
              Nel periodo selezionato l'AI ha generato {stats.appts} prenotazioni e recuperato {stats.recovered} pazienti.
            </p>
          </div>
          <div className="flex gap-6 shrink-0">
            <div>
              <div className="text-2xl md:text-3xl font-semibold">{stats.response}%</div>
              <div className="text-xs text-primary-foreground/70">Tasso risposta</div>
            </div>
            <button
              onClick={() => setBreakdownOpen(true)}
              className="text-left rounded-lg px-2 -mx-2 py-1 -my-1 hover:bg-white/10 transition-colors"
              title="Vedi breakdown fatturato"
            >
              <div className="text-2xl md:text-3xl font-semibold">€{stats.revenue}</div>
              <div className="text-xs text-primary-foreground/70">Recuperato</div>
            </button>
          </div>
        </div>
      </div>

      {/* Date pill selector */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-full bg-muted/60 border max-w-full">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                preset === p.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
          <Popover open={popoverOpen} onOpenChange={(v) => { setPopoverOpen(v); if (v) setDraftRange(appliedCustom); }}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  preset === "custom"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarIcon className="size-3.5" />
                {preset === "custom" && appliedCustom?.from && appliedCustom?.to
                  ? `${fmt(appliedCustom.from)} – ${fmt(appliedCustom.to)}`
                  : "Personalizza"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="range"
                numberOfMonths={isMobile ? 1 : 2}
                selected={draftRange}
                onSelect={setDraftRange}
                locale={it}
                disabled={{ after: new Date() }}
                className={cn("p-3 pointer-events-auto")}
              />
              <div className="flex justify-end gap-2 p-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => {
                  setDraftRange(undefined);
                  setAppliedCustom(undefined);
                  setPreset("7");
                  setPopoverOpen(false);
                }}>Cancella</Button>
                <Button size="sm" onClick={() => {
                  if (draftRange?.from && draftRange?.to) {
                    setAppliedCustom(draftRange);
                    setPreset("custom");
                    setPopoverOpen(false);
                  }
                }}>Applica</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
        <StatCard label="Appuntamenti generati" value={String(stats.appts)} delta={12} icon={Calendar} tone="primary" />
        <StatCard label="Clienti recuperati" value={String(stats.recovered)} delta={8} icon={UserCheck} tone="success" />
        <StatCard label="Chiamate recuperate" value={String(stats.calls)} delta={-3} icon={PhoneIncoming} tone="warning" />
        <StatCard label="Messaggi inviati" value={stats.msgs.toLocaleString("it-IT")} delta={22} icon={Send} tone="info" />
        <StatCard label="Conversazioni attive" value={String(stats.convos)} delta={5} icon={MessagesSquare} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold">Appuntamenti & recuperi</h3>
              <p className="text-xs text-muted-foreground truncate">{rangeLabel}</p>
            </div>
            <Badge variant="outline" className="text-xs whitespace-nowrap">+18% vs periodo precedente</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="d" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }} />
              <Area type="monotone" dataKey="appt" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="recovered" stroke="var(--color-success)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-6">
          <h3 className="font-semibold mb-1">Canali AI</h3>
          <p className="text-xs text-muted-foreground mb-4 truncate">{rangeLabel}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channels} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent convos */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold">Conversazioni recenti</h3>
            <p className="text-xs text-muted-foreground">Stato live delle chat AI</p>
          </div>
        </div>
        <div className="divide-y">
          {recentConvos.map((c, i) => (
            <div key={i} className="py-3 flex items-center gap-3 min-w-0">
              <div className="size-9 shrink-0 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate max-w-[60%]">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 h-4 shrink-0">{c.tag}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 whitespace-nowrap",
                  c.status === "Convertito"
                    ? "bg-success/15 text-success hover:bg-success/15"
                    : c.status === "AI"
                      ? "bg-accent text-accent-foreground hover:bg-accent"
                      : "bg-info/15 text-info hover:bg-info/15",
                )}
              >
                {c.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={breakdownOpen} onOpenChange={setBreakdownOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Breakdown fatturato — {rangeLabel}</DialogTitle>
            <DialogDescription>
              Stima del fatturato generato dagli appuntamenti prenotati via AI, con sconti upsell applicati.
            </DialogDescription>
          </DialogHeader>

          {!revenueData || revenueData.breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nessun appuntamento AI nel periodo selezionato.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border divide-y">
                {revenueData.breakdown.map((row) => (
                  <div key={row.visit_type} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{row.visit_type}</div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {row.variable ? (
                          <div>Prezzo variabile · non incluso nel totale</div>
                        ) : (
                          <>
                            <div>Prezzo pieno: €{row.full_price.toFixed(2)}</div>
                            {row.discount_percent > 0 && (
                              <div>
                                Sconto upsell: -{row.discount_percent}% (→ €{row.effective_price.toFixed(2)})
                              </div>
                            )}
                          </>
                        )}
                        <div>Appuntamenti: {row.appointments}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">
                        {row.variable ? "—" : `€${row.subtotal.toFixed(2)}`}
                      </div>
                      <div className="text-xs text-muted-foreground">Subtotale</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                {revenueData.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Sconto totale applicato da upsell</span>
                    <span>-€{revenueData.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                {revenueData.variableCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {revenueData.variableCount} appuntamenti con prezzo variabile esclusi dal totale.
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t">
                  <span className="font-semibold">Totale stimato incassato</span>
                  <span className="text-xl font-semibold text-primary">
                    €{revenueData.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function PasswordChangeBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const needs = user?.user_metadata?.requires_password_change === true;
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("dentai_pw_banner_dismissed") === "1") setDismissed(true);
  }, []);
  if (!needs || dismissed) return null;
  const close = () => {
    sessionStorage.setItem("dentai_pw_banner_dismissed", "1");
    setDismissed(true);
  };
  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3">
      <KeyRound className="size-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="text-foreground">
          Per la tua sicurezza ti consigliamo di cambiare la password.{" "}
        </span>
        <Link to="/account" className="text-primary underline underline-offset-2 font-medium">
          Vai su Impostazioni → Sicurezza
        </Link>
      </div>
      <button onClick={close} className="text-muted-foreground hover:text-foreground" aria-label="Chiudi">
        <X className="size-4" />
      </button>
    </div>
  );
}

