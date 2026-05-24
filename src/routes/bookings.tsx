import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, type Operator, type Appointment, type Client, type StudioSettings } from "@/lib/api";
import { PATIENT_GROUP_EMOJI, PATIENT_GROUP_LABEL } from "@/lib/age";

export const Route = createFileRoute("/bookings")({
  component: Bookings,
  head: () => ({ meta: [{ title: "Prenotazioni · DentAI" }] }),
});

const HOURS = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const OP_PALETTE: { bg: string; dot: string }[] = [
  { bg: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  { bg: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  { bg: "bg-warning/20 text-warning-foreground border-warning/40", dot: "bg-warning" },
  { bg: "bg-accent text-accent-foreground border-primary/30", dot: "bg-primary" },
  { bg: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  { bg: "bg-muted text-foreground border-border", dot: "bg-muted-foreground" },
];
const paletteFor = (i: number) => OP_PALETTE[i % OP_PALETTE.length];

const ALL = "__all__";

type ApptRow = Appointment & { client: Client | null; operator: Operator | null };

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  x.setDate(x.getDate() + diff);
  return x;
}

function Bookings() {
  const [selectedOp, setSelectedOp] = useState<string>(ALL);

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart); d.setDate(d.getDate() + 5); return d;
  }, [weekStart]);

  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return { date: d, key: d.toISOString().slice(0, 10), label: `${DAY_LABELS[d.getDay()]} ${d.getDate()}` };
  }), [weekStart]);

  const { data: ops = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["studio-settings"],
    queryFn: async () => {
      const { data, error } = await api.studioSettings();
      if (error) throw error;
      return data as StudioSettings | null;
    },
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["appointments", weekStart.toISOString(), weekEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await api.appointments();
      if (error) throw error;
      return (data ?? []) as ApptRow[];
    },
  });

  const opMeta = useMemo(() => {
    const m = new Map<string, { name: string; palette: { bg: string; dot: string } }>();
    ops.forEach((o, i) => m.set(o.id, { name: o.name, palette: paletteFor(i) }));
    return m;
  }, [ops]);

  // Bucket appointments by day-key + hour
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

  const selectedOpName = selectedOp === ALL ? null : opMeta.get(selectedOp)?.name ?? null;
  const title = selectedOpName ? `Prenotazioni — ${selectedOpName}` : "Prenotazioni";

  const visitTypes = settings?.visit_types ?? [];

  return (
    <AppLayout>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h2 className="text-xl font-semibold tracking-tight truncate">{title}</h2>
          <Select value={selectedOp} onValueChange={setSelectedOp}>
            <SelectTrigger className="w-[220px]">
              <Users className="size-4 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Operatore" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti gli operatori</SelectItem>
              {ops.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.online ? "🟢" : "🔴"} {PATIENT_GROUP_EMOJI[o.patient_group ?? "all"]} {o.name}{!o.online && " — Non disponibile"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedOp === ALL && ops.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ops.map((o, i) => (
              <div key={o.id} className={`flex items-center gap-1.5 text-xs ${o.online ? "text-muted-foreground" : "text-muted-foreground/50 line-through"}`}>
                <span className={`size-2.5 rounded-full ${paletteFor(i).dot}`} />
                <span>{o.name}</span>
                {!o.online && <span className="not-italic no-underline">🔴</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">
              Settimana {weekStart.getDate()} — {new Date(weekEnd.getTime() - 86400000).getDate()}{" "}
              {weekStart.toLocaleDateString("it", { month: "long" })}
            </h3>
            <Button className="bg-gradient-primary" size="sm"><Plus className="size-4 mr-1.5" />Nuova prenotazione</Button>
          </div>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] text-xs">
              <div className="bg-muted/60 border-b border-r p-3" />
              {days.map((d) => (
                <div key={d.key} className="bg-muted/60 border-b border-r last:border-r-0 p-3 text-center font-medium">{d.label}</div>
              ))}
              {HOURS.map((h) => (
                <Fragment key={h}>
                  <div className="border-b border-r p-3 text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Clock className="size-3" />{h}
                  </div>
                  {days.map((d) => {
                    const cell = bookingsByCell.get(`${d.key}-${h}`) ?? [];
                    const visible = selectedOp === ALL ? cell : cell.filter((a) => a.operator_id === selectedOp);
                    if (visible.length === 0) {
                      return <div key={`${d.key}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14" />;
                    }
                    return (
                      <div key={`${d.key}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14 space-y-1">
                        {visible.map((a) => {
                          const meta = a.operator_id ? opMeta.get(a.operator_id) : null;
                          const tone = meta?.palette.bg ?? "bg-muted text-foreground border-border";
                          const name = a.client ? `${a.client.first_name[0]}. ${a.client.last_name}` : "—";
                          return (
                            <div key={a.id} className={`rounded-md border px-2 py-1.5 text-[11px] ${tone}`}>
                              <div className="font-medium">{name}</div>
                              <div className="opacity-80">
                                {a.visit_type}
                                {selectedOp === ALL && meta && <> · {meta.name}</>}
                              </div>
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
        </div>

        <div>
          <h3 className="font-semibold mb-4">Tipologie visita</h3>
          <Card className="divide-y">
            {visitTypes.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">Nessuna tipologia configurata. Vai in Impostazioni.</div>
            ) : visitTypes.map((v, i) => (
              <div key={v.name} className="p-3 flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${paletteFor(i).dot}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.minutes} min{v.avg_price ? ` · €${v.avg_price}` : ""}</div>
                </div>
                {v.ai_booking && <Badge variant="outline" className="text-[10px]">AI</Badge>}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
