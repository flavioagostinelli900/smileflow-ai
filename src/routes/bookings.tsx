import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock } from "lucide-react";

export const Route = createFileRoute("/bookings")({
  component: Bookings,
  head: () => ({ meta: [{ title: "Prenotazioni · DentAI" }] }),
});

const days = ["Lun 10", "Mar 11", "Mer 12", "Gio 13", "Ven 14"];
const hours = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];

const bookings: Record<string, { name: string; type: string; op: string; tone: string }> = {
  "Lun 10-09:00": { name: "G. Romano", type: "Igiene", op: "Conti", tone: "bg-info/15 text-info border-info/30" },
  "Lun 10-11:00": { name: "M. Bianchi", type: "Conservativa", op: "Ferri", tone: "bg-accent text-accent-foreground border-primary/30" },
  "Mar 11-10:00": { name: "G. Romano", type: "Igiene", op: "Conti", tone: "bg-info/15 text-info border-info/30" },
  "Mar 11-15:00": { name: "L. De Santis", type: "Implantologia", op: "Rossi", tone: "bg-success/15 text-success border-success/30" },
  "Mer 12-09:00": { name: "S. Conti", type: "Ortodonzia", op: "Greco", tone: "bg-warning/20 text-warning-foreground border-warning/40" },
  "Mer 12-16:00": { name: "P. Greco", type: "Endodonzia", op: "Ferri", tone: "bg-accent text-accent-foreground border-primary/30" },
  "Gio 13-10:00": { name: "E. Ferri", type: "Igiene", op: "Conti", tone: "bg-info/15 text-info border-info/30" },
  "Gio 13-17:00": { name: "C. Moretti", type: "Sbiancamento", op: "Conti", tone: "bg-info/15 text-info border-info/30" },
  "Ven 14-11:00": { name: "L. De Santis", type: "Controllo", op: "Rossi", tone: "bg-success/15 text-success border-success/30" },
};

const visitTypes = [
  { name: "Igiene dentale", duration: "45 min", color: "bg-info" },
  { name: "Conservativa", duration: "60 min", color: "bg-primary" },
  { name: "Implantologia", duration: "90 min", color: "bg-success" },
  { name: "Ortodonzia", duration: "30 min", color: "bg-warning" },
  { name: "Sbiancamento", duration: "60 min", color: "bg-info" },
  { name: "Controllo", duration: "20 min", color: "bg-muted-foreground" },
];

function Bookings() {
  return (
    <AppLayout>
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
                <>
                  <div key={h} className="border-b border-r p-3 text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Clock className="size-3" />{h}
                  </div>
                  {days.map((d) => {
                    const b = bookings[`${d}-${h}`];
                    return (
                      <div key={`${d}-${h}`} className="border-b border-r last:border-r-0 p-1.5 min-h-14">
                        {b && (
                          <div className={`rounded-md border px-2 py-1.5 text-[11px] ${b.tone}`}>
                            <div className="font-medium">{b.name}</div>
                            <div className="opacity-80">{b.type} · {b.op}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
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
