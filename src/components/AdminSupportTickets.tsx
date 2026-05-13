import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  created_by: string;
  studio_id: string | null;
};
type Msg = {
  id: string; ticket_id: string; sender_user_id: string; sender_role: string;
  content: string; created_at: string;
};

const CATEGORIES: Record<string, string> = {
  technical: "Problema tecnico",
  plan: "Domanda sul piano",
  feature: "Richiesta funzionalità",
  other: "Altro",
};

function statusBadge(s: string) {
  if (s === "open") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15">Aperto</Badge>;
  if (s === "in_progress") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/15">In lavorazione</Badge>;
  if (s === "resolved") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15">Risolto</Badge>;
  return <Badge variant="secondary">Chiuso</Badge>;
}

export function AdminSupportTickets({ studios }: { studios?: { id: string; name: string }[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [studioFilter, setStudioFilter] = useState<string>("all");
  const [open, setOpen] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["admin-ticket-messages", open?.id],
    enabled: !!open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages").select("*")
        .eq("ticket_id", open!.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data as Msg[];
    },
  });

  const studioMap = useMemo(() => new Map((studios ?? []).map((s) => [s.id, s.name])), [studios]);

  const filtered = (tickets ?? []).filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (studioFilter !== "all" && t.studio_id !== studioFilter) return false;
    return true;
  });

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return {
      todayOpen: (tickets ?? []).filter((t) => new Date(t.created_at) >= today && t.status === "open").length,
      avgHours: "—",
      resolvedMonth: (tickets ?? []).filter((t) => t.status === "resolved" && new Date(t.created_at) >= monthStart).length,
    };
  }, [tickets]);

  const sendReply = async () => {
    if (!user || !open || !reply.trim()) return;
    await supabase.from("support_ticket_messages").insert({
      ticket_id: open.id, sender_user_id: user.id, sender_role: "support", content: reply.trim(),
    });
    if (open.status === "open") {
      await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", open.id);
    }
    setReply("");
    qc.invalidateQueries({ queryKey: ["admin-ticket-messages", open.id] });
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    toast.success("Risposta inviata");
  };

  const setStatus = async (s: string) => {
    if (!open) return;
    await supabase.from("support_tickets").update({ status: s }).eq("id", open.id);
    qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    setOpen({ ...open, status: s });
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Aperti oggi</div><div className="text-2xl font-semibold">{stats.todayOpen}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Tempo medio risposta</div><div className="text-2xl font-semibold">{stats.avgHours}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Risolti questo mese</div><div className="text-2xl font-semibold">{stats.resolvedMonth}</div></div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="open">Aperti</SelectItem>
            <SelectItem value="in_progress">In lavorazione</SelectItem>
            <SelectItem value="resolved">Risolti</SelectItem>
            <SelectItem value="closed">Chiusi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={studioFilter} onValueChange={setStudioFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli studi</SelectItem>
            {studios?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Studio</TableHead>
              <TableHead>Oggetto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground text-xs">#{t.ticket_number}</TableCell>
                <TableCell className="whitespace-nowrap">{t.studio_id ? studioMap.get(t.studio_id) ?? "—" : "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{t.subject}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{CATEGORIES[t.category] ?? t.category}</TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleDateString("it-IT")}</TableCell>
                <TableCell>{statusBadge(t.status)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setOpen(t)}>Rispondi</Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nessun ticket</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>#{open?.ticket_number}</span>
              <span className="font-normal truncate">{open?.subject}</span>
              {open && statusBadge(open.status)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
              {messages?.map((m) => {
                const fromStaff = m.sender_role !== "studio";
                return (
                  <div key={m.id} className={cn("flex flex-col gap-1", fromStaff ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      fromStaff ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}>{m.content}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("it-IT")} · {fromStaff ? "Staff" : "Studio"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Scrivi una risposta…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }} />
              <Button size="icon" onClick={sendReply} disabled={!reply.trim()}><Send className="size-4" /></Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Select value={open?.status ?? "open"} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aperto</SelectItem>
                  <SelectItem value="in_progress">In lavorazione</SelectItem>
                  <SelectItem value="resolved">Risolto</SelectItem>
                  <SelectItem value="closed">Chiuso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
