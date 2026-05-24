import { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Sparkles, Shield, Layers, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TAGS = ["IGIENE", "CONTROLLO", "CHIRURGIA", "ORTODONZIA", "IMPLANTOLOGIA", "CONSERVATIVA"];
const BLOCK_SIZE = 50;

type Row = {
  first_name: string;
  last_name: string;
  phone: string;
  last_visit: string | null;
  birth_date: string | null;
  notes: string;
  tag?: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const findKey = (obj: Record<string, unknown>, candidates: string[]) => {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const k = keys.find((k) => norm(k).includes(norm(c)));
    if (k) return k;
  }
  return null;
};

const parseDate = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const normalizeRow = (raw: Record<string, unknown>): Row | null => {
  const nameKey = findKey(raw, ["nome", "name"]);
  const phoneKey = findKey(raw, ["telefono", "numero", "phone", "cellulare"]);
  const dateKey = findKey(raw, ["ultimavisita", "lastvisit", "datavisita"]);
  const birthKey = findKey(raw, ["datanascita", "nascita", "birthdate", "birth", "dob"]);
  const notesKey = findKey(raw, ["note", "notes", "appunti"]);
  if (!nameKey || !phoneKey) return null;
  const fullName = String(raw[nameKey] ?? "").trim();
  const [first, ...rest] = fullName.split(/\s+/);
  return {
    first_name: first || fullName || "—",
    last_name: rest.join(" "),
    phone: String(raw[phoneKey] ?? "").trim(),
    last_visit: parseDate(raw[dateKey ?? ""]),
    birth_date: birthKey ? parseDate(raw[birthKey]) : null,
    notes: notesKey ? String(raw[notesKey] ?? "").trim() : "",
  };
};

export function ImportClientsDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [blocksCreated, setBlocksCreated] = useState(0);

  const reset = () => { setStep(1); setRows([]); setBlocksCreated(0); };
  const close = () => { onOpenChange(false); setTimeout(reset, 300); };

  const handleFile = async (file: File) => {
    setLoading(true);
    try {
      let parsed: Record<string, unknown>[] = [];
      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const res = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsed = res.data as Record<string, unknown>[];
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        parsed = XLSX.utils.sheet_to_json(sheet);
      }
      const normalized = parsed.map(normalizeRow).filter((r): r is Row => !!r && !!r.phone);
      if (normalized.length === 0) {
        toast.error("Nessuna riga valida. Verifica le colonne: Nome, Telefono, Data ultima visita, Note");
        return;
      }
      setRows(normalized);
      toast.success(`${normalized.length} righe caricate`);
    } catch (e) {
      toast.error("Errore lettura file: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runAI = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tag-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rows.map((r) => ({ name: `${r.first_name} ${r.last_name}`, notes: r.notes })) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { tags } = (await res.json()) as { tags: string[] };
      setRows((prev) => prev.map((r, i) => ({ ...r, tag: tags[i] || "CONTROLLO" })));
      setStep(2);
    } catch (e) {
      toast.error("AI error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const confirmPrivacy = () => {
    setRows((prev) => prev.map((r) => ({ ...r, notes: "" })));
    setStep(3);
  };

  const importAndCreateBlocks = async () => {
    setLoading(true);
    try {
      const payload = rows.map((r) => ({
        first_name: r.first_name,
        last_name: r.last_name,
        phone: r.phone,
        last_visit: r.last_visit,
        birth_date: r.birth_date,
        tags: r.tag ? [r.tag] : [],
        status: "active",
      }));
      const { data: inserted, error } = await supabase.from("clients").insert(payload).select("id");
      if (error) throw error;

      const total = inserted?.length ?? 0;
      const numBlocks = Math.ceil(total / BLOCK_SIZE);
      const { data: existing } = await supabase.from("patient_blocks").select("block_number").order("block_number", { ascending: false }).limit(1);
      const startNum = ((existing?.[0]?.block_number as number | undefined) ?? 0) + 1;
      const blocks = Array.from({ length: numBlocks }, (_, i) => ({
        block_number: startNum + i,
        total: Math.min(BLOCK_SIZE, total - i * BLOCK_SIZE),
        status: "pending",
        contacted: 0,
      }));
      if (blocks.length > 0) {
        const { error: bErr } = await supabase.from("patient_blocks").insert(blocks);
        if (bErr) throw bErr;
      }
      setBlocksCreated(numBlocks);
      setStep(4);
      onDone();
    } catch (e) {
      toast.error("Import error: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const activateFirstBlock = async () => {
    setLoading(true);
    try {
      const { data: blocks } = await supabase.from("patient_blocks").select("id, block_number").eq("status", "pending").order("block_number").limit(1);
      if (blocks?.[0]) {
        await supabase.from("patient_blocks").update({ status: "in_progress", scheduled_for: new Date().toISOString().slice(0, 10) }).eq("id", blocks[0].id);
        toast.success(`Blocco ${blocks[0].block_number} attivato`);
      }
      close();
    } finally {
      setLoading(false);
    }
  };

  const tagCounts = rows.reduce<Record<string, number>>((acc, r) => { if (r.tag) acc[r.tag] = (acc[r.tag] || 0) + 1; return acc; }, {});

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5" /> Importa database pazienti
          </DialogTitle>
        </DialogHeader>

        {/* stepper */}
        <div className="flex items-center gap-2 my-4 text-xs">
          {[
            { n: 1, label: "Carica", icon: Upload },
            { n: 2, label: "Analisi AI", icon: Sparkles },
            { n: 3, label: "Privacy", icon: Shield },
            { n: 4, label: "Blocchi", icon: Layers },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div className={`size-7 rounded-full flex items-center justify-center font-medium ${step >= s.n ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {step > s.n ? <Check className="size-3.5" /> : <s.icon className="size-3.5" />}
              </div>
              <span className={step >= s.n ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
              {i < 3 && <div className={`flex-1 h-px ${step > s.n ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="p-8 border-dashed border-2 text-center">
              <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
              <div className="text-sm font-medium mb-1">Carica file Excel (.xlsx) o CSV</div>
              <div className="text-xs text-muted-foreground mb-4">Colonne richieste: Nome, Numero telefono, Data ultima visita, Note</div>
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="max-w-xs mx-auto" />
            </Card>
            {rows.length > 0 && (
              <Card className="p-4">
                <div className="text-xs font-medium mb-2">Anteprima ({rows.length} righe totali)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground"><tr><th className="text-left py-1">Nome</th><th className="text-left py-1">Telefono</th><th className="text-left py-1">Ultima visita</th><th className="text-left py-1">Note</th></tr></thead>
                    <tbody>{rows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t"><td className="py-1.5">{r.first_name} {r.last_name}</td><td>{r.phone}</td><td>{r.last_visit ?? "—"}</td><td className="truncate max-w-[200px]">{r.notes || "—"}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-3">
                  <Button onClick={runAI} disabled={loading} className="bg-gradient-primary">
                    {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}Analizza con AI
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <Card className="p-3 bg-primary/5 border-primary/20 text-xs flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> AI ha assegnato un tag a ciascun paziente. Modifica se necessario prima di confermare.
            </Card>
            <Card className="p-0 max-h-[40vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0"><tr><th className="text-left p-2">Nome</th><th className="text-left p-2">Telefono</th><th className="text-left p-2">Ultima visita</th><th className="text-left p-2">Tag AI</th></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.first_name} {r.last_name}</td>
                    <td className="p-2">{r.phone}</td>
                    <td className="p-2">{r.last_visit ?? "—"}</td>
                    <td className="p-2">
                      <Select value={r.tag} onValueChange={(v) => setRows((prev) => prev.map((p, j) => j === i ? { ...p, tag: v } : p))}>
                        <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Indietro</Button>
              <Button onClick={confirmPrivacy} className="bg-gradient-primary"><Shield className="size-4 mr-2" />Conferma e procedi</Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="p-6 text-center border-success/30 bg-success/5">
              <Shield className="size-10 mx-auto mb-3 text-success" />
              <div className="font-medium mb-1">Note eliminate. Solo dati essenziali mantenuti.</div>
              <div className="text-xs text-muted-foreground">Vengono conservati solo: nome, numero, tag, data ultima visita.</div>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(tagCounts).map(([t, c]) => (
                <Card key={t} className="p-3 flex items-center justify-between"><Badge variant="secondary">{t}</Badge><span className="font-semibold">{c}</span></Card>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Indietro</Button>
              <Button onClick={importAndCreateBlocks} disabled={loading} className="bg-gradient-primary">
                {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Layers className="size-4 mr-2" />}Importa e crea blocchi
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-transparent">
              <Check className="size-10 mx-auto mb-3 text-success" />
              <div className="text-lg font-semibold mb-1">Import completato</div>
              <div className="text-xs text-muted-foreground">Sistema diviso in blocchi da {BLOCK_SIZE} pazienti per gestire il follow-up AI in modo controllato.</div>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center"><div className="text-xs text-muted-foreground">Pazienti</div><div className="text-2xl font-semibold">{rows.length}</div></Card>
              <Card className="p-4 text-center"><div className="text-xs text-muted-foreground">Tag assegnati</div><div className="text-2xl font-semibold">{Object.keys(tagCounts).length}</div></Card>
              <Card className="p-4 text-center"><div className="text-xs text-muted-foreground">Blocchi creati</div><div className="text-2xl font-semibold">{blocksCreated}</div></Card>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={close}>Chiudi</Button>
              <Button onClick={activateFirstBlock} disabled={loading} className="bg-gradient-primary">
                {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}Attiva blocco 1
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
