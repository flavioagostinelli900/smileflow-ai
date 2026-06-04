import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus, Clock, ChevronLeft, ChevronRight, CalendarIcon, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Appointment, type Client, type Operator } from "@/lib/api";

export const Route = createFileRoute("/bookings")({
  component: Bookings,
  head: () => ({ meta: [{ title: "Prenotazioni · DentAI" }] }),
});

const HOURS = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

type ApptRow = Appointment & { client: Client | null; operator: Operator | null };

// Sources considered "imported / synced from gestionale" → gray
const IMPORTED_SOURCES = new Set(["import", "sync", "gestionale", "external", "pms"]);
const isImported = (a: ApptRow) => !!a.source && IMPORTED_SOURCES.has(a.source.toLowerCase());

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  x.setDate(x.getDate() + diff);
  return x;
}

function Bookings() {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return { date: d, key: d.toISOString().slice(0, 10), label: `${DAY_LABELS[i]} ${d.getDate()}` };
  }), [weekStart]);
  const weekEnd = days[6].date;

  const { data: appts = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await api.appointments();
      if (error) throw error;
      return (data ?? []) as ApptRow[];
    },
  });

  const bookingsByCell = useMemo(() => {
    const map = new Map<string, ApptRow[]>();
    for (const a of appts) {
      const d = new Date(a.starts_at);
      const dayKey = d.toISOString().slice(0, 10);
      const hour = `${String(d.getHours()).padStart(2, "0")}:00`;
      const key = `${dayKey}-${hour}`;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appts]);

  const platformThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(); const m = now.getMonth();
    return appts.filter((a) => {
      const d = new Date(a.starts_at);
      return d.getFullYear() === y && d.getMonth() === m && !isImported(a);
    }).length;
  }, [appts]);

  const shiftWeek = (delta: number) => {
    const d = new Date(anchor); d.setDate(d.getDate() + delta * 7); setAnchor(d);
  };

  const monthFmt = weekStart.toLocaleDateString("it", { month: "long", year: "numeric" });

  return (
    <AppLayout>
      {/* KPI */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Prenotazioni generate questo mese</div>
              <div className="text-2xl font-semibold tracking-tight">{platformThisMonth}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Oggi</Button>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={() => shiftWeek(-1)} aria-label="Settimana precedente">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => shiftWeek(1)} aria-label="Settimana successiva">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="size-4" />
                <span className="capitalize">{monthFmt}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={anchor}
                onSelect={(d) => { if (d) { setAnchor(d); setPickerOpen(false); } }}
                weekStartsOn={1}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="text-sm text-muted-foreground ml-2">
            {weekStart.getDate()} {weekStart.toLocaleDateString("it", { month: "short" })} — {weekEnd.getDate()} {weekEnd.toLocaleDateString("it", { month: "short" })}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /> Piattaforma</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted-foreground/40" /> Gestionale</span>
          </div>
          <Button className="bg-gradient-primary" size="sm"><Plus className="size-4 mr-1.5" />Nuova prenotazione</Button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] text-xs">
          <div className="bg-muted/60 border-b border-r p-3" />
          {days.map((d) => {
            const isToday = d.key === new Date().toISOString().slice(0, 10);
            return (
              <div key={d.key} className={cn("bg-muted/60 border-b border-r last:border-r-0 p-3 text-center font-medium", isToday && "text-primary")}>
                {d.label}
              </div>
            );
          })}
          {HOURS.map((h) => (
            <Fragment key={h}>
              <div className="border-b border-r p-3 text-muted-foreground flex items-center gap-1 text-[11px]">
                <Clock className="size-3" />{h}
              </div>
              {days.map((d) => {
                const cell = bookingsByCell.get(`${d.key}-${h}`) ?? [];
                if (cell.length === 0) {
                  return <div key={`${d.key}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14" />;
                }
                return (
                  <div key={`${d.key}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14 space-y-1">
                    {cell.map((a) => {
                      const imported = isImported(a);
                      const tone = imported
                        ? "bg-muted text-foreground border-border"
                        : "bg-primary/10 text-primary border-primary/30";
                      const name = a.client ? `${a.client.first_name[0]}. ${a.client.last_name}` : "—";
                      return (
                        <div key={a.id} className={cn("rounded-md border px-2 py-1.5 text-[11px]", tone)}>
                          <div className="font-medium truncate">{name}</div>
                          <div className="opacity-80 truncate">{a.visit_type}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
