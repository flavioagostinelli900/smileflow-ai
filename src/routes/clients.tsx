import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Filter, Download, Search } from "lucide-react";

export const Route = createFileRoute("/clients")({
  component: Clients,
  head: () => ({ meta: [{ title: "Clienti · DentAI" }] }),
});

const clients = [
  { name: "Giulia Romano", phone: "+39 333 1234567", email: "giulia@mail.com", family: "F-102", tag: "Igiene", op: "Dr. Conti", last: "12 Mag 2025", status: "Attivo" },
  { name: "Marco Bianchi", phone: "+39 348 9988776", email: "marco.b@mail.com", family: "F-201", tag: "Conservativa", op: "Dr. Ferri", last: "02 Apr 2025", status: "Inattivo" },
  { name: "Sara Conti", phone: "+39 320 5544332", email: "sara.c@mail.com", family: "F-318", tag: "Ortodonzia", op: "Dr. Conti", last: "28 Mag 2025", status: "Attivo" },
  { name: "Luca De Santis", phone: "+39 366 1122334", email: "luca.ds@mail.com", family: "F-411", tag: "Implantologia", op: "Dr. Rossi", last: "15 Gen 2025", status: "Inattivo" },
  { name: "Elena Ferri", phone: "+39 339 7766554", email: "elena.f@mail.com", family: "F-102", tag: "Igiene", op: "Dr. Conti", last: "05 Giu 2025", status: "Attivo" },
  { name: "Paolo Greco", phone: "+39 347 8899001", email: "paolo.g@mail.com", family: "F-507", tag: "Endodonzia", op: "Dr. Ferri", last: "20 Feb 2025", status: "Inattivo" },
  { name: "Chiara Moretti", phone: "+39 327 4455667", email: "chiara.m@mail.com", family: "F-201", tag: "Igiene", op: "Dr. Rossi", last: "30 Mag 2025", status: "Attivo" },
];

function Clients() {
  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{clients.length} pazienti totali</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="size-4 mr-1.5" />Filtri</Button>
          <Button variant="outline" size="sm"><Download className="size-4 mr-1.5" />Esporta</Button>
          <Button size="sm" className="bg-gradient-primary"><Plus className="size-4 mr-1.5" />Nuovo cliente</Button>
        </div>
      </div>

      <Card className="p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Cerca per nome, telefono, ID famiglia…" className="pl-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-4 py-3">Paziente</th>
                <th className="text-left font-medium px-4 py-3">Contatti</th>
                <th className="text-left font-medium px-4 py-3">Famiglia</th>
                <th className="text-left font-medium px-4 py-3">Reparto</th>
                <th className="text-left font-medium px-4 py-3">Operatore</th>
                <th className="text-left font-medium px-4 py-3">Ultima visita</th>
                <th className="text-left font-medium px-4 py-3">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((c) => (
                <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{c.phone}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline">{c.family}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="secondary">{c.tag}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.op}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.last}</td>
                  <td className="px-4 py-3">
                    <Badge className={c.status === "Attivo" ? "bg-success/15 text-success hover:bg-success/15" : "bg-warning/20 text-warning-foreground hover:bg-warning/20"}>
                      {c.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppLayout>
  );
}
