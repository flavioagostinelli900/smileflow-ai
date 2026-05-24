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
import { api, type Operator } from "@/lib/api";
import { PATIENT_GROUP_EMOJI, PATIENT_GROUP_LABEL } from "@/lib/age";

export const Route = createFileRoute("/bookings")({
  component: Bookings,
  head: () => ({ meta: [{ title: "Prenotazioni · DentAI" }] }),
});

const days = ["Lun 10", "Mar 11", "Mer 12", "Gio 13", "Ven 14"];
const hours = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];

// Color palette assigned deterministically per operator (Tailwind tokens).
const OP_PALETTE: { bg: string; dot: string }[] = [
  { bg: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  { bg: "bg-success/15 text-success border-success/30", dot: "bg-success" },
  { bg: "bg-warning/20 text-warning-foreground border-warning/40", dot: "bg-warning" },
  { bg: "bg-accent text-accent-foreground border-primary/30", dot: "bg-primary" },
  { bg: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  { bg: "bg-muted text-foreground border-border", dot: "bg-muted-foreground" },
];

function paletteFor(index: number) {
  return OP_PALETTE[index % OP_PALETTE.length];
}

type Booking = { name: string; type: string; opName: string };

// Mock bookings keyed by day-hour; opName is matched against fetched operators
// (by last name, falls back gracefully) so the demo colors track real data.
const bookings: Record<string, Booking> = {
  "Lun 10-09:00": { name: "G. Romano", type: "Igiene", opName: "Conti" },
  "Lun 10-11:00": { name: "M. Bianchi", type: "Conservativa", opName: "Ferri" },
  "Mar 11-10:00": { name: "G. Romano", type: "Igiene", opName: "Conti" },
  "Mar 11-15:00": { name: "L. De Santis", type: "Implantologia", opName: "Rossi" },
  "Mer 12-09:00": { name: "S. Conti", type: "Ortodonzia", opName: "Greco" },
  "Mer 12-16:00": { name: "P. Greco", type: "Endodonzia", opName: "Ferri" },
  "Gio 13-10:00": { name: "E. Ferri", type: "Igiene", opName: "Conti" },
  "Gio 13-17:00": { name: "C. Moretti", type: "Sbiancamento", opName: "Conti" },
  "Ven 14-11:00": { name: "L. De Santis", type: "Controllo", opName: "Rossi" },
};

const visitTypes = [
  { name: "Igiene dentale", duration: "45 min", color: "bg-info" },
  { name: "Conservativa", duration: "60 min", color: "bg-primary" },
  { name: "Implantologia", duration: "90 min", color: "bg-success" },
  { name: "Ortodonzia", duration: "30 min", color: "bg-warning" },
  { name: "Sbiancamento", duration: "60 min", color: "bg-info" },
  { name: "Controllo", duration: "20 min", color: "bg-muted-foreground" },
];

const ALL = "__all__";

function Bookings() {
  const [selectedOp, setSelectedOp] = useState<string>(ALL);

  const { data: ops = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  // Map operator id -> palette index (stable across renders)
  const opMeta = useMemo(() => {
    const m = new Map<string, { name: string; palette: { bg: string; dot: string } }>();
    ops.forEach((o, i) => m.set(o.id, { name: o.name, palette: paletteFor(i) }));
    return m;
  }, [ops]);

  // Resolve mock booking opName (e.g. "Rossi") to a real operator id.
  function resolveOpId(opName: string): string | null {
    const hit = ops.find((o) => o.name.toLowerCase().includes(opName.toLowerCase()));
    return hit?.id ?? null;
  }

  const selectedOpName =
    selectedOp === ALL ? null : opMeta.get(selectedOp)?.name ?? null;

  const title = selectedOpName ? `Prenotazioni — ${selectedOpName}` : "Prenotazioni";

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
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedOp === ALL && ops.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ops.map((o, i) => (
              <div key={o.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-2.5 rounded-full ${paletteFor(i).dot}`} />
                <span>{o.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Settimana 10 — 14 Giugno</h3>
            <Button className="bg-gradient-primary" size="sm"><Plus className="size-4 mr-1.5" />Nuova prenotazione</Button>
          </div>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] text-xs">
              <div className="bg-muted/60 border-b border-r p-3" />
              {days.map((d) => (
                <div key={d} className="bg-muted/60 border-b border-r last:border-r-0 p-3 text-center font-medium">{d}</div>
              ))}
              {hours.map((h) => (
                <Fragment key={h}>
                  <div className="border-b border-r p-3 text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Clock className="size-3" />{h}
                  </div>
                  {days.map((d) => {
                    const b = bookings[`${d}-${h}`];
                    if (!b) return <div key={`${d}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14" />;
                    const opId = resolveOpId(b.opName);
                    if (selectedOp !== ALL && opId !== selectedOp) {
                      return <div key={`${d}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14" />;
                    }
                    const palette = opId ? opMeta.get(opId)?.palette : null;
                    const tone = palette?.bg ?? "bg-muted text-foreground border-border";
                    return (
                      <div key={`${d}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14">
                        <div className={`rounded-md border px-2 py-1.5 text-[11px] ${tone}`}>
                          <div className="font-medium">{b.name}</div>
                          <div className="opacity-80">
                            {b.type}
                            {selectedOp === ALL && <> · {b.opName}</>}
                          </div>
                        </div>
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
            {visitTypes.map((v) => (
              <div key={v.name} className="p-3 flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${v.color}`} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.duration}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">Auto</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
