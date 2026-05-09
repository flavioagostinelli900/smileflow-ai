import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  UserCheck,
  PhoneIncoming,
  Send,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const trend = [
  { d: "Lun", appt: 18, recovered: 6 },
  { d: "Mar", appt: 24, recovered: 9 },
  { d: "Mer", appt: 22, recovered: 11 },
  { d: "Gio", appt: 31, recovered: 14 },
  { d: "Ven", appt: 28, recovered: 12 },
  { d: "Sab", appt: 16, recovered: 5 },
  { d: "Dom", appt: 9, recovered: 3 },
];

const channels = [
  { name: "Follow-up", v: 412 },
  { name: "Inattivi", v: 287 },
  { name: "Chiamate", v: 164 },
  { name: "Igiene", v: 198 },
  { name: "Post-visita", v: 124 },
];

const recentConvos = [
  { name: "Giulia Romano", msg: "Sì, va bene martedì mattina alle 10", tag: "Igiene", status: "AI" },
  { name: "Marco Bianchi", msg: "Posso spostare al pomeriggio?", tag: "Conservativa", status: "Operatore" },
  { name: "Sara Conti", msg: "Grazie, confermo l'appuntamento", tag: "Recupero", status: "Convertito" },
  { name: "Luca De Santis", msg: "Mi richiamate per favore?", tag: "Chiamata persa", status: "AI" },
  { name: "Elena Ferri", msg: "Perfetto, a giovedì!", tag: "Follow-up", status: "Convertito" },
];

function Dashboard() {
  return (
    <AppLayout>
      {/* Hero strip */}
      <div className="rounded-2xl bg-gradient-hero text-primary-foreground p-6 md:p-8 mb-8 shadow-elevated relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs bg-white/15 backdrop-blur px-3 py-1 rounded-full mb-3">
              <Sparkles className="size-3" /> AI Assistant attivo
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Benvenuto, Studio Dentistico Rossi
            </h2>
            <p className="text-primary-foreground/80 mt-1 text-sm">
              Oggi l'AI ha generato 28 prenotazioni e recuperato 14 pazienti inattivi.
            </p>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-3xl font-semibold">94%</div>
              <div className="text-xs text-primary-foreground/70">Tasso risposta</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">€12.4k</div>
              <div className="text-xs text-primary-foreground/70">Recuperato 30gg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Appuntamenti generati" value="148" delta={12} icon={Calendar} tone="primary" />
        <StatCard label="Clienti recuperati" value="62" delta={8} icon={UserCheck} tone="success" />
        <StatCard label="Chiamate recuperate" value="37" delta={-3} icon={PhoneIncoming} tone="warning" />
        <StatCard label="Messaggi inviati" value="1.284" delta={22} icon={Send} tone="info" />
        <StatCard label="Conversazioni attive" value="29" delta={5} icon={MessagesSquare} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Appuntamenti & recuperi</h3>
              <p className="text-xs text-muted-foreground">Ultimi 7 giorni</p>
            </div>
            <Badge variant="outline" className="text-xs">+18% vs settimana scorsa</Badge>
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
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="appt" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="recovered" stroke="var(--color-success)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1">Canali AI</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribuzione messaggi</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={channels} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={80} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="v" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent convos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Conversazioni recenti</h3>
            <p className="text-xs text-muted-foreground">Stato live delle chat AI</p>
          </div>
        </div>
        <div className="divide-y">
          {recentConvos.map((c, i) => (
            <div key={i} className="py-3 flex items-center gap-4">
              <div className="size-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                {c.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <Badge variant="secondary" className="text-[10px] py-0 h-4">{c.tag}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.msg}</p>
              </div>
              <Badge
                className={
                  c.status === "Convertito"
                    ? "bg-success/15 text-success hover:bg-success/15"
                    : c.status === "AI"
                      ? "bg-accent text-accent-foreground hover:bg-accent"
                      : "bg-info/15 text-info hover:bg-info/15"
                }
              >
                {c.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </AppLayout>
  );
}
