import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ClipboardPlus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/reception")({
  component: Reception,
  head: () => ({ meta: [{ title: "Segreteria · DentAI" }] }),
});

function Reception() {
  const [submitted, setSubmitted] = useState(false);
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
              <Button className="mt-6" onClick={() => setSubmitted(false)}>Nuovo appuntamento</Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-4"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome paziente</Label>
                  <Input placeholder="Mario Rossi" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefono</Label>
                  <Input placeholder="+39 333 1234567" required />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Reparto / tag</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleziona reparto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igiene">Igiene</SelectItem>
                      <SelectItem value="conservativa">Conservativa</SelectItem>
                      <SelectItem value="ortodonzia">Ortodonzia</SelectItem>
                      <SelectItem value="implantologia">Implantologia</SelectItem>
                      <SelectItem value="endodonzia">Endodonzia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Operatore</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Assegna operatore" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rossi">Dr. Rossi</SelectItem>
                      <SelectItem value="conti">Dr.ssa Conti</SelectItem>
                      <SelectItem value="ferri">Dr. Ferri</SelectItem>
                      <SelectItem value="greco">Dr.ssa Greco</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Data visita</Label>
                  <Input type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Ora visita</Label>
                  <Input type="time" required />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline">Annulla</Button>
                <Button type="submit" className="bg-gradient-primary">Crea appuntamento</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
