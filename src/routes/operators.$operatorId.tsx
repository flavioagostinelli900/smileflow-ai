import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Clock, TrendingUp, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Operator, Appointment } from "@/lib/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/operators/$operatorId")({
  component: OperatorDetail,
  head: () => ({ meta: [{ title: "Operatore · DentAI" }] }),
});

const days = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

type Avail = { id?: string; operator_id: string; day_of_week: number; start_time: string; end_time: string; active: boolean };
type Dur = { id?: string; operator_id: string; visit_type: string; minutes: number };

function OperatorDetail() {
  const { operatorId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: op } = useQuery({
    queryKey: ["operator", operatorId],
    queryFn: async () => {
      const { data } = await supabase.from("operators").select("*").eq("id", operatorId).single();
      return data as Operator;
    },
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["op-appts", operatorId],
    queryFn: async () => {
      const { data } = await supabase.from("appointments").select("*, client:clients(*)").eq("operator_id", operatorId).order("starts_at");
      return (data ?? []) as (Appointment & { client: { first_name: string; last_name: string } | null })[];
    },
  });

  const { data: availData = [] } = useQuery({
    queryKey: ["op-avail", operatorId],
    queryFn: async () => {
      const { data } = await supabase.from("operator_availability").select("*").eq("operator_id", operatorId);
      return (data ?? []) as Avail[];
    },
  });

  const { data: durData = [] } = useQuery({
    queryKey: ["op-dur", operatorId],
    queryFn: async () => {
      const { data } = await supabase.from("operator_visit_durations").select("*").eq("operator_id", operatorId);
      return (data ?? []) as Dur[];
    },
  });

  const [avail, setAvail] = useState<Avail[]>([]);
  const [durs, setDurs] = useState<Dur[]>([]);
  useEffect(() => { setAvail(availData); }, [availData]);
  useEffect(() => { setDurs(durData); }, [durData]);

  if (!op) return <AppLayout><div className="text-muted-foreground">Caricamento…</div></AppLayout>;

  const weekAppts = appts.filter((a) => {
    const d = new Date(a.starts_at);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= -7 && diff <= 7;
  });

  const presence = appts.length ? Math.round((appts.filter((a) => a.status === "completed").length / appts.length) * 100) : 92;
  const avgPerDay = (weekAppts.length / 7).toFixed(1);

  const saveAvail = async () => {
    for (const a of avail) {
      if (a.id) {
        await supabase.from("operator_availability").update({ start_time: a.start_time, end_time: a.end_time, active: a.active }).eq("id", a.id);
      }
    }
    toast.success("Disponibilità salvata");
    qc.invalidateQueries({ queryKey: ["op-avail", operatorId] });
  };

  const saveDurs = async () => {
    for (const d of durs) {
      if (d.id) await supabase.from("operator_visit_durations").update({ minutes: d.minutes }).eq("id", d.id);
    }
    toast.success("Durate salvate");
  };

  // Group appts by day for week calendar
  const startWeek = new Date(); startWeek.setDate(startWeek.getDate() - startWeek.getDay() + 1); startWeek.setHours(0, 0, 0, 0);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startWeek); d.setDate(d.getDate() + i); return d; });

  return (
    <AppLayout>
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/operators" })} className="mb-4 -ml-2">
        <ArrowLeft className="size-4 mr-1.5" />Torna agli operatori
      </Button>

      <Card className="p-6 mb-6 bg-gradient-to-br from-card to-muted/30">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar className="size-20"><AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">{op.name.split(" ").slice(-2).map((n) => n[0]).join("")}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl font-semibold">{op.name}</h1>
            <p className="text-sm text-muted-foreground mb-3">{op.role ?? "Operatore"}</p>
            <div className="flex flex-wrap gap-1.5">
              {(op.departments ?? []).map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              <Badge className={op.online ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>● {op.online ? "Online" : "Offline"}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar className="size-3.5" />App. settimana</div><div className="text-2xl font-semibold">{weekAppts.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><TrendingUp className="size-3.5" />Tasso presenza</div><div className="text-2xl font-semibold text-success">{presence}%</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><Clock className="size-3.5" />Media giorno</div><div className="text-2xl font-semibold">{avgPerDay}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground mb-1">Totale appuntamenti</div><div className="text-2xl font-semibold">{appts.length}</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="size-4 text-primary" />Calendario settimanale</h3>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d, i) => {
              const dayAppts = appts.filter((a) => { const ad = new Date(a.starts_at); return ad.toDateString() === d.toDateString(); });
              return (
                <div key={i} className="border rounded-lg p-2 min-h-[140px]">
                  <div className="text-[10px] uppercase text-muted-foreground">{days[i]}</div>
                  <div className="text-lg font-semibold">{d.getDate()}</div>
                  <div className="space-y-1 mt-2">
                    {dayAppts.slice(0, 4).map((a) => (
                      <div key={a.id} className="text-[10px] p-1.5 rounded bg-primary/10 text-primary border border-primary/20">
                        <div className="font-medium">{new Date(a.starts_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}</div>
                        <div className="truncate">{a.client?.first_name} {a.client?.last_name}</div>
                      </div>
                    ))}
                    {dayAppts.length > 4 && <div className="text-[10px] text-muted-foreground">+{dayAppts.length - 4}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="size-4 text-primary" />Disponibilità settimanale</h3>
          <div className="space-y-2">
            {avail.sort((a, b) => a.day_of_week - b.day_of_week).map((a, idx) => (
              <div key={a.id ?? idx} className="flex items-center gap-2">
                <div className="w-12 text-xs font-medium">{days[a.day_of_week - 1]}</div>
                <Input type="time" value={a.start_time.slice(0, 5)} onChange={(e) => setAvail(avail.map((x) => x.id === a.id ? { ...x, start_time: e.target.value } : x))} className="h-8" />
                <Input type="time" value={a.end_time.slice(0, 5)} onChange={(e) => setAvail(avail.map((x) => x.id === a.id ? { ...x, end_time: e.target.value } : x))} className="h-8" />
              </div>
            ))}
            {avail.length === 0 && <p className="text-xs text-muted-foreground">Nessuna disponibilità configurata</p>}
          </div>
          <Button onClick={saveAvail} size="sm" className="mt-3 w-full bg-gradient-primary"><Save className="size-3.5 mr-1.5" />Salva disponibilità</Button>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold mb-4">Durate per tipo visita</h3>
          <div className="space-y-2">
            {durs.map((d, idx) => (
              <div key={d.id ?? idx} className="flex items-center gap-3">
                <span className="flex-1 text-sm">{d.visit_type}</span>
                <Input type="number" value={d.minutes} onChange={(e) => setDurs(durs.map((x) => x.id === d.id ? { ...x, minutes: Number(e.target.value) } : x))} className="h-8 w-20" />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            ))}
            {durs.length === 0 && <p className="text-xs text-muted-foreground">Nessuna durata personalizzata</p>}
          </div>
          <Button onClick={saveDurs} size="sm" className="mt-3 w-full bg-gradient-primary"><Save className="size-3.5 mr-1.5" />Salva durate</Button>
        </Card>
      </div>
    </AppLayout>
  );
}
