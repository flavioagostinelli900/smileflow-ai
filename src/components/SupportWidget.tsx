import { useEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, X, Send, ChevronDown, ChevronUp, Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
type SofiaMsg = { role: "user" | "assistant"; content: string; ts: number };

const CATEGORIES: Record<string, string> = {
  technical: "Problema tecnico",
  plan: "Domanda sul piano",
  feature: "Richiesta funzionalità",
  other: "Altro",
};

const FAQ: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: "Generale",
    items: [
      { q: "Cos'è DentAI e come funziona?", a: "DentAI è una piattaforma AI che gestisce per te WhatsApp, prenotazioni, follow-up e recupero pazienti dello studio dentistico, riducendo il carico di segreteria." },
      { q: "Come posso iniziare a usare la piattaforma?", a: "Dopo il login, vai in Configurazione: collega WhatsApp, imposta orari di apertura e tipi di visita, poi importa i tuoi pazienti. In pochi minuti l'AI è operativa." },
      { q: "DentAI si integra con il mio gestionale?", a: "Supportiamo integrazioni con i principali gestionali italiani via API. Contatta il supporto per attivare la sincronizzazione." },
      { q: "I dati dei miei pazienti sono al sicuro?", a: "Sì. I dati sono cifrati in transito e a riposo, ospitati in datacenter europei conformi al GDPR. Solo gli utenti autorizzati del tuo studio possono accedervi." },
    ],
  },
  {
    section: "WhatsApp e messaggi",
    items: [
      { q: "Come collego WhatsApp a DentAI?", a: "In Configurazione › WhatsApp puoi scegliere tra numero dedicato DentAI o usare il numero esistente dello studio tramite WhatsApp Business API." },
      { q: "Quanti messaggi posso inviare al mese?", a: "Dipende dal piano: Base 1.000, Pro 5.000, Business illimitati. Puoi acquistare pacchetti extra in qualsiasi momento." },
      { q: "Cosa succede se finisco i messaggi disponibili?", a: "Riceverai una notifica al 80% e al 100%. Puoi acquistare un pacchetto extra dalla sezione Abbonamento o aspettare il rinnovo mensile." },
      { q: "Posso usare il numero WhatsApp già esistente dello studio?", a: "Sì, tramite WhatsApp Business API. Ti guidiamo passo-passo nella verifica del numero." },
    ],
  },
  {
    section: "Prenotazioni e calendario",
    items: [
      { q: "Come funziona la prenotazione automatica AI?", a: "Sofia AI propone slot disponibili al paziente in chat. Quando il paziente conferma, l'appuntamento viene creato automaticamente nel calendario." },
      { q: "Posso gestire più operatori sul calendario?", a: "Sì. In Operatori puoi aggiungere staff, definire orari e tipi di visita supportati per ognuno." },
      { q: "Come gestisce DentAI le disdette?", a: "L'AI propone automaticamente nuovi slot al paziente che disdice e libera lo slot per altri appuntamenti." },
      { q: "Cosa succede in caso di no-show?", a: "L'AI invia un follow-up al paziente, e dopo conferma genera una nuova proposta di appuntamento o lo segnala alla segreteria." },
    ],
  },
  {
    section: "Follow-up e automazioni",
    items: [
      { q: "Come funzionano i workflow di follow-up?", a: "Dalla sezione Follow-up AI scegli un trigger (es. inattività >6 mesi) e una sequenza di messaggi. L'AI invia e gestisce le risposte." },
      { q: "Posso personalizzare i messaggi automatici?", a: "Sì, ogni step della sequenza ha un template editabile, con variabili dinamiche come nome, ultima visita, reparto." },
      { q: "Come viene identificato un paziente inattivo?", a: "In base alla data dell'ultima visita e al reparto. La soglia è configurabile per ogni workflow." },
      { q: "Posso mettere in pausa un workflow?", a: "Sì, ogni workflow ha un toggle Attivo/Pausa nella lista. La pausa è immediata." },
    ],
  },
  {
    section: "Abbonamento e pagamenti",
    items: [
      { q: "Come funziona il pagamento?", a: "Il pagamento è ricorrente, mensile o annuale, tramite carta. La fatturazione è automatica e le ricevute disponibili in Account › Abbonamento." },
      { q: "Posso cambiare piano in qualsiasi momento?", a: "Sì. Il cambio è immediato e la differenza viene calcolata pro-rata sui giorni rimanenti del periodo in corso." },
      { q: "Come cancello l'abbonamento?", a: "Dalla sezione Abbonamento puoi disattivare il rinnovo. L'accesso resta attivo fino alla scadenza del periodo già pagato." },
      { q: "Dove trovo le mie fatture?", a: "In Account › Abbonamento › Scarica fatture trovi lo storico completo in PDF." },
    ],
  },
];

function statusBadge(s: string) {
  if (s === "open") return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15">Aperto</Badge>;
  if (s === "in_progress") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/15">In lavorazione</Badge>;
  if (s === "resolved") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15">Risolto</Badge>;
  return <Badge variant="secondary">Chiuso</Badge>;
}

function isWorkingHours(d = new Date()) {
  const day = d.getDay(); // 0=Sun, 6=Sat
  const h = d.getHours();
  return day >= 1 && day <= 5 && h >= 9 && h < 18;
}

function wantsHumanOperator(text: string) {
  const t = text.toLowerCase();
  return /(parlare|contattare|sentire).{0,20}(operatore|umano|persona|team|assistenza)/.test(t)
    || /voglio.{0,15}operatore/.test(t)
    || /operatore (umano|vero)/.test(t)
    || /assistenza umana/.test(t);
}

const SOFIA_WELCOME =
  "Ciao! Sono Sofia, l'assistente virtuale di DentAI 🙂\n\n" +
  "Sono qui per aiutarti a risolvere qualsiasi dubbio sulla piattaforma in modo rapido e professionale. " +
  "Gestisco la maggior parte delle richieste in autonomia.\n\n" +
  "Se preferisci parlare con un operatore umano, scrivi semplicemente: 'Voglio parlare con un operatore' " +
  "e ti metterò in contatto con il nostro team.";

export function SupportWidget() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ai");
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Sofia chat state
  const [sofiaMsgs, setSofiaMsgs] = useState<SofiaMsg[]>([
    { role: "assistant", content: SOFIA_WELCOME, ts: Date.now() },
  ]);
  const [sofiaInput, setSofiaInput] = useState("");
  const [sofiaLoading, setSofiaLoading] = useState(false);
  const sofiaScroll = useRef<HTMLDivElement>(null);

  // FAQ state
  const [faqQuery, setFaqQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // ticket reply
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

  useEffect(() => {
    sofiaScroll.current?.scrollTo({ top: sofiaScroll.current.scrollHeight, behavior: "smooth" });
  }, [sofiaMsgs, sofiaLoading]);

  const filteredFaq = useMemo(() => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.map((s) => ({
      ...s,
      items: s.items.filter((i) => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
    })).filter((s) => s.items.length > 0);
  }, [faqQuery]);

  const createTicketFromSofia = async (history: SofiaMsg[]) => {
    if (!user) return null;
    const transcript = history
      .map((m) => `${m.role === "user" ? "Utente" : "Sofia"} (${new Date(m.ts).toLocaleString("it-IT")}):\n${m.content}`)
      .join("\n\n");
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        created_by: user.id,
        subject: "Richiesta operatore umano",
        category: "other",
        status: "open",
      })
      .select()
      .single();
    if (error || !ticket) {
      toast.error("Errore nella creazione del ticket");
      return null;
    }
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_user_id: user.id,
      sender_role: "studio",
      content: `--- Cronologia chat con Sofia AI ---\n\n${transcript}`,
    });
    qc.invalidateQueries({ queryKey: ["my-tickets"] });
    return ticket as Ticket;
  };

  const sendToSofia = async () => {
    const text = sofiaInput.trim();
    if (!text || sofiaLoading) return;
    const userMsg: SofiaMsg = { role: "user", content: text, ts: Date.now() };
    const nextHistory = [...sofiaMsgs, userMsg];
    setSofiaMsgs(nextHistory);
    setSofiaInput("");

    if (wantsHumanOperator(text)) {
      const working = isWorkingHours();
      const handoffMsg: SofiaMsg = {
        role: "assistant",
        ts: Date.now(),
        content: working
          ? "Perfetto, ti metto subito in contatto con il nostro team 🙂\n\nSto creando il ticket con la cronologia della nostra conversazione. Un operatore ti risponderà a breve."
          : "Al momento i nostri operatori non sono disponibili. Il nostro team è attivo dal Lunedì al Venerdì dalle 9:00 alle 18:00.\n\nHo creato un ticket con la cronologia della nostra conversazione. Verrà preso in gestione non appena il team sarà disponibile 🙂",
      };
      setSofiaMsgs([...nextHistory, handoffMsg]);
      const ticket = await createTicketFromSofia([...nextHistory, handoffMsg]);
      if (ticket) {
        setSofiaMsgs((cur) => [...cur, {
          role: "assistant",
          ts: Date.now(),
          content: `Ticket #${ticket.ticket_number} creato con successo. Riceverai una risposta via email entro poche ore.`,
        }]);
      }
      return;
    }

    setSofiaLoading(true);
    try {
      const { fetchWithAuth } = await import("@/lib/fetch-with-auth");
      const r = await fetchWithAuth("/api/sofia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory.map(({ role, content }) => ({ role, content })),
        }),
      });

      const json = await r.json();
      const reply: SofiaMsg = { role: "assistant", content: json.reply ?? "Mi spiace, riprova.", ts: Date.now() };
      setSofiaMsgs([...nextHistory, reply]);
    } catch (e) {
      setSofiaMsgs([...nextHistory, {
        role: "assistant",
        content: "Mi spiace, c'è stato un problema. Riprova tra poco o apri un ticket.",
        ts: Date.now(),
      }]);
    } finally {
      setSofiaLoading(false);
    }
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
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Assistenza</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {open && (
        <div
          className={cn(
            "fixed z-50 bg-card border shadow-elevated flex flex-col overflow-hidden",
            "inset-x-0 bottom-0 top-0 sm:inset-auto sm:bottom-5 sm:right-5",
            "sm:rounded-xl sm:w-[420px] sm:h-[580px] sm:max-h-[85vh]",
          )}
        >
          {/* Header */}
          <div className="p-3 sm:p-4 bg-gradient-primary text-primary-foreground flex items-center gap-3 shrink-0">
            <div className="size-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm">D</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Centro Assistenza</div>
              <div className="text-[11px] opacity-90 leading-snug truncate">
                Sofia AI · disponibile 24/7
              </div>
            </div>
            <button
              onClick={() => { setOpen(false); setActiveTicket(null); }}
              className="size-8 rounded-md hover:bg-white/15 flex items-center justify-center"
              aria-label="Chiudi"
            >
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
              <TabsList className="grid grid-cols-3 mx-3 mt-3 shrink-0">
                <TabsTrigger value="ai">Assistente AI</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="tickets">Ticket</TabsTrigger>
              </TabsList>

              {/* TAB 1 — Sofia AI */}
              <TabsContent value="ai" className="flex-1 flex flex-col overflow-hidden m-0 mt-3">
                <div className="px-4 pb-3 border-b flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="size-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">AI</div>
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">Sofia — Assistente DentAI</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">
                      Sono qui per aiutarti, gestisco la maggior parte delle domande in tempo reale.
                    </div>
                  </div>
                </div>

                <div ref={sofiaScroll} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {sofiaMsgs.map((m, i) => (
                    <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role === "assistant" && (
                        <div className="size-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-semibold">
                          <Bot className="size-3.5" />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                        m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}>{m.content}</div>
                    </div>
                  ))}
                  {sofiaLoading && (
                    <div className="flex gap-2">
                      <div className="size-7 shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                        <Bot className="size-3.5" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                        <span className="inline-flex gap-1">
                          <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "120ms" }} />
                          <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "240ms" }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t flex gap-2 shrink-0">
                  <Input
                    value={sofiaInput}
                    onChange={(e) => setSofiaInput(e.target.value)}
                    placeholder="Scrivi un messaggio…"
                    disabled={sofiaLoading}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendToSofia(); } }}
                  />
                  <Button size="icon" onClick={sendToSofia} disabled={!sofiaInput.trim() || sofiaLoading}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2 — FAQ */}
              <TabsContent value="faq" className="flex-1 flex flex-col overflow-hidden m-0 mt-3">
                <div className="px-4 pb-3 shrink-0">
                  <div className="font-medium text-sm">Domande frequenti</div>
                  <div className="text-[11px] text-muted-foreground">Trova subito risposta ai dubbi più comuni</div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={faqQuery}
                      onChange={(e) => setFaqQuery(e.target.value)}
                      placeholder="Cerca tra le FAQ..."
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
                  {filteredFaq.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-10">
                      Nessun risultato. Prova a chiedere a Sofia o apri un ticket.
                    </div>
                  )}
                  {filteredFaq.map((s) => (
                    <div key={s.section}>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-1 mb-1">{s.section}</div>
                      <div className="border rounded-lg divide-y overflow-hidden bg-background">
                        {s.items.map((item) => {
                          const id = `${s.section}::${item.q}`;
                          const isOpen = openFaq === id;
                          return (
                            <div key={id}>
                              <button
                                onClick={() => setOpenFaq(isOpen ? null : id)}
                                className="w-full px-3 py-2.5 flex items-start justify-between gap-2 text-left hover:bg-muted/40 text-sm"
                              >
                                <span className="flex-1 min-w-0">{item.q}</span>
                                {isOpen ? <ChevronUp className="size-4 shrink-0 text-muted-foreground mt-0.5" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground mt-0.5" />}
                              </button>
                              {isOpen && (
                                <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground leading-relaxed">
                                  {item.a}
                                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-foreground">
                                    <span>Utile?</span>
                                    <button onClick={() => toast.success("Grazie per il feedback!")} className="hover:opacity-70">👍</button>
                                    <button onClick={() => setTab("ai")} className="hover:opacity-70">👎</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 3 — My tickets */}
              <TabsContent value="tickets" className="flex-1 overflow-y-auto p-3 space-y-2 m-0 mt-3">
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
