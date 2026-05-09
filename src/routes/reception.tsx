import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ClipboardPlus } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Operator, type Client } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reception")({
  component: Reception,
  head: () => ({ meta: [{ title: "Segreteria · DentAI" }] }),
});

const departments = ["Igiene", "Conservativa", "Ortodonzia", "Implantologia", "Endodonzia", "Sbiancamento"];
const durations: Record<string, number> = { Igiene: 45, Conservativa: 60, Ortodonzia: 30, Implantologia: 90, Endodonzia: 60, Sbiancamento: 60 };

function Reception() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ first: "", last: "", phone: "", department: "", operatorId: "", date: "", time: "" });
  const [busy, setBusy] = useState(false);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department || !form.operatorId) return toast.error("Reparto e operatore obbligatori");
    setBusy(true);
    try {
      // Find or create client by phone
      const { data: existing } = await supabase.from("clients").select("*").eq("phone", form.phone).maybeSingle();
      let clientId = (existing as Client | null)?.id;
      if (!clientId) {
        const { data: c, error } = await supabase.from("clients").insert({
          first_name: form.first, last_name: form.last, phone: form.phone,
          department: form.department, operator_id: form.operatorId, status: "active",
        }).select().single();
        if (error) throw error;
        clientId = (c as Client).id;
      }
      const startsAt = new Date(`${form.date}T${form.time}`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        client_id: clientId, operator_id: form.operatorId,
        visit_type: form.department, duration_minutes: durations[form.department] ?? 30,
        starts_at: startsAt, status: "scheduled", source: "reception",
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <ClipboardPlus className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Inserimento rapido appuntamento</h2>
              <p className="text-sm text-muted-foreground">Form per la segreteria — compila in 30 secondi</p>
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-12">
              <div className="size-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="font-semibold text-lg">Appuntamento creato!</h3>
              <p className="text-sm text-muted-foreground mt-1">Il paziente riceverà conferma su WhatsApp.</p>
              <Button className="mt-6" onClick={() => { setSubmitted(false); setForm({ first: "", last: "", phone: "", department: "", operatorId: "", date: "", time: "" }); }}>
                Nuovo appuntamento
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Nome</Label><Input required value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Cognome</Label><Input required value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Telefono</Label><Input required placeholder="+39 333 1234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Reparto / tag <span className="text-destructive">*</span></Label>
                  <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleziona reparto" /></SelectTrigger>
                    <SelectContent>{departments.map((d) => (<SelectItem key={d} value={d}>{d} ({durations[d]} min)</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Operatore <span className="text-destructive">*</span></Label>
                  <Select value={form.operatorId} onValueChange={(v) => setForm({ ...form, operatorId: v })}>
                    <SelectTrigger><SelectValue placeholder="Assegna operatore" /></SelectTrigger>
                    <SelectContent>{operators.map((o) => (<SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Data visita</Label><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Ora visita</Label><Input type="time" required value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline">Annulla</Button>
                <Button type="submit" className="bg-gradient-primary" disabled={busy}>{busy ? "Salvataggio…" : "Crea appuntamento"}</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
