import { useEffect, useMemo, useState } from "react";
import { HelpCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed" | string;
  created_at: string;
  created_by: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_user_id: string;
  sender_role: string;
  content: string;
  created_at: string;
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

export function SupportWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("new");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");

  const { data: tickets } = useQuery({
    queryKey: ["my-tickets", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ticket[];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["ticket-messages", activeTicket?.id],
    enabled: !!activeTicket,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", activeTicket!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TicketMessage[];
    },
  });

  const unreadCount = useMemo(() => 0, []); // placeholder for backend-driven unread count

  const submitTicket = async () => {
    if (!user) return toast.error("Devi essere loggato");
    if (!subject.trim() || !description.trim()) return toast.error("Compila tutti i campi");
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ created_by: user.id, subject: subject.trim(), category, status: "open" })
      .select()
      .single();
    if (error || !ticket) return toast.error(error?.message || "Errore");
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_user_id: user.id,
      sender_role: "studio",
      content: description.trim(),
    });
    toast.success("Ticket inviato. Riceverai una risposta entro 24 ore.");
    setSubject(""); setDescription(""); setCategory("technical");
    qc.invalidateQueries({ queryKey: ["my-tickets"] });
    setTab("list");
  };

  const sendReply = async () => {
    if (!user || !activeTicket || !reply.trim()) return;
    await supabase.from("support_ticket_messages").insert({
      ticket_id: activeTicket.id,
      sender_user_id: user.id,
      sender_role: "studio",
      content: reply.trim(),
    });
    setReply("");
    qc.invalidateQueries({ queryKey: ["ticket-messages", activeTicket.id] });
  };

  const markResolved = async () => {
    if (!activeTicket) return;
    await supabase.from("support_tickets").update({ status: "resolved" }).eq("id", activeTicket.id);
    toast.success("Ticket segnato come risolto");
    qc.invalidateQueries({ queryKey: ["my-tickets"] });
    setActiveTicket({ ...activeTicket, status: "resolved" });
  };

  // Hide on auth pages
  if (typeof window !== "undefined" && /\/(login|forgot-password|reset-password)/.test(window.location.pathname)) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(true)}
                className="fixed bottom-5 right-5 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-elevated hover:scale-105 transition-transform flex items-center justify-center"
                aria-label="Assistenza"
              >
                <HelpCircle className="size-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Assistenza</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] max-h-[80vh] bg-card border rounded-xl shadow-elevated flex flex-col overflow-hidden">
          <div className="p-4 bg-gradient-primary text-primary-foreground flex items-start gap-3">
            <div className="size-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">D</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Supporto DentAI</div>
              <div className="text-[11px] opacity-90 leading-snug">
                Disponibili Lun–Ven 9:00–18:00. Di solito rispondiamo entro poche ore.
              </div>
            </div>
            <button onClick={() => { setOpen(false); setActiveTicket(null); }} className="text-primary-foreground/80 hover:text-primary-foreground" aria-label="Chiudi">
              <X className="size-5" />
            </button>
          </div>

          {activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between gap-2">
                <button onClick={() => setActiveTicket(null)} className="text-xs text-muted-foreground hover:underline">← Indietro</button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{activeTicket.ticket_number}</span>
                  {statusBadge(activeTicket.status)}
                </div>
              </div>
              <div className="px-4 py-2 border-b">
                <div className="font-medium text-sm truncate">{activeTicket.subject}</div>
                <div className="text-[11px] text-muted-foreground">{CATEGORIES[activeTicket.category] ?? activeTicket.category}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages?.map((m) => {
                  const mine = m.sender_user_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}>{m.content}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("it-IT")}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={reply} onChange={(e) => setReply(e.target.value)}
                    placeholder="Scrivi un messaggio…"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  />
                  <Button size="icon" onClick={sendReply} disabled={!reply.trim()}><Send className="size-4" /></Button>
                </div>
                {activeTicket.status !== "resolved" && (
                  <Button variant="outline" size="sm" className="w-full" onClick={markResolved}>
                    Segna come risolto
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-2 mx-3 mt-3">
                <TabsTrigger value="new">Nuovo ticket</TabsTrigger>
                <TabsTrigger value="list">I miei ticket</TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="flex-1 overflow-y-auto p-4 space-y-3 m-0">
                <div className="space-y-1.5">
                  <Label>Oggetto</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Descrizione</Label>
                  <Textarea
                    rows={5}
                    placeholder="Descrivi il problema nel dettaglio…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button className="w-full bg-gradient-primary" onClick={submitTicket}>Invia ticket</Button>
              </TabsContent>

              <TabsContent value="list" className="flex-1 overflow-y-auto p-3 space-y-2 m-0">
                {tickets?.length ? tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">#{t.ticket_number}</span>
                      {statusBadge(t.status)}
                    </div>
                    <div className="font-medium text-sm truncate">{t.subject}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("it-IT")} · {CATEGORIES[t.category] ?? t.category}
                    </div>
                  </button>
                )) : (
                  <div className="text-center text-sm text-muted-foreground py-10 px-4">
                    Non hai ancora aperto nessun ticket.<br />Siamo qui se hai bisogno di aiuto!
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </>
  );
}
