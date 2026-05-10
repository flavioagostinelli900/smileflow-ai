import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Sparkles, Search, Phone, Calendar, Tag, StickyNote, Activity, X, UserCog, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Conversation, type Message, type Client, type Operator, type Appointment } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => ({ meta: [{ title: "Chat AI · DentAI" }] }),
});

type ConvWithClient = Conversation & { client: Client | null };

const statusLabel: Record<string, string> = {
  ai: "AI attiva",
  operator: "Operatore",
  booked: "Prenotato",
  closed: "Chiusa",
};

function Chat() {
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagInput, setTagInput] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: convs = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await api.conversations();
      if (error) throw error;
      return data as ConvWithClient[];
    },
    refetchInterval: 8000,
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await api.operators();
      if (error) throw error;
      return data as Operator[];
    },
  });

  useEffect(() => { if (!active && convs.length) setActive(convs[0].id); }, [convs, active]);

  const thread = useMemo(() => convs.find((c) => c.id === active) ?? null, [convs, active]);

  // Sync notes when active changes
  useEffect(() => {
    setNotesDraft(thread?.internal_notes ?? "");
  }, [thread?.id, thread?.internal_notes]);

  const { data: msgs = [] } = useQuery({
    queryKey: ["messages", active],
    queryFn: async () => {
      if (!active) return [];
      const { data, error } = await api.messages(active);
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!active,
  });

  const { data: appts = [] } = useQuery({
    queryKey: ["appts-by-client", thread?.client_id],
    queryFn: async () => {
      if (!thread?.client_id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_id", thread.client_id)
        .order("starts_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!thread?.client_id,
  });

  // Realtime
  useEffect(() => {
    if (!active) return;
    const ch = supabase
      .channel(`msg-${active}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${active}` },
        () => qc.invalidateQueries({ queryKey: ["messages", active] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const filtered = convs.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!filter) return true;
    const name = c.client ? `${c.client.first_name} ${c.client.last_name}` : "";
    return (name + " " + (c.client?.phone ?? "") + " " + c.tags.join(" ")).toLowerCase().includes(filter.toLowerCase());
  });

  const send = async (asAi: boolean) => {
    if (!active) return;
    if (!asAi && !input.trim()) return;
    setSending(true);
    try {
      if (!asAi) {
        await supabase.from("messages").insert({ conversation_id: active, sender: "operator", content: input.trim() });
        await supabase.from("conversations").update({ status: "operator", last_message_at: new Date().toISOString() }).eq("id", active);
        setInput("");
        await qc.invalidateQueries({ queryKey: ["messages", active] });
        await qc.invalidateQueries({ queryKey: ["conversations"] });
      } else {
        const res = await fetch("/api/chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: active }),
        });
        if (!res.ok) throw new Error(await res.text());
        await qc.invalidateQueries({ queryKey: ["messages", active] });
        await qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    } catch (e) {
      toast.error("Errore: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const updateConv = async (patch: Partial<Conversation>) => {
    if (!active) return;
    const { error } = await supabase.from("conversations").update(patch).eq("id", active);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["conversations"] });
  };

  const addTag = async () => {
    if (!thread || !tagInput.trim()) return;
    const next = Array.from(new Set([...(thread.tags || []), tagInput.trim()]));
    setTagInput("");
    await updateConv({ tags: next });
  };
  const removeTag = async (t: string) => {
    if (!thread) return;
    await updateConv({ tags: thread.tags.filter((x) => x !== t) });
  };

  const saveNotes = async () => { await updateConv({ internal_notes: notesDraft }); toast.success("Note salvate"); };

  const initials = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <Card className="overflow-hidden h-[calc(100vh-9rem)] flex">
        {/* LEFT — conversations */}
        <div className="w-72 border-r flex flex-col bg-card">
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Cerca…" className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                <SelectItem value="ai">AI attiva</SelectItem>
                <SelectItem value="operator">Operatore</SelectItem>
                <SelectItem value="booked">Prenotate</SelectItem>
                <SelectItem value="closed">Chiuse</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((t) => {
              const name = t.client ? `${t.client.first_name} ${t.client.last_name}` : "Sconosciuto";
              const last = msgs.length && active === t.id ? msgs[msgs.length - 1].content : "";
              return (
                <button key={t.id} onClick={() => setActive(t.id)} className={cn(
                  "w-full text-left p-3 border-b hover:bg-muted/40 transition-colors flex gap-3",
                  active === t.id && "bg-accent/40",
                )}>
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{initials(name)}</AvatarFallback>
                    </Avatar>
                    {t.status === "ai" && <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-primary border-2 border-card flex items-center justify-center"><Sparkles className="size-2 text-primary-foreground" /></span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(t.last_message_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{last || t.client?.phone}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0">{statusLabel[t.status]}</Badge>
                      {t.tags.slice(0, 2).map((tg) => (
                        <Badge key={tg} variant="secondary" className="text-[9px] h-4 px-1.5 py-0">{tg}</Badge>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Nessuna conversazione</div>}
          </div>
        </div>

        {/* CENTER — chat */}
        <div className="flex-1 flex flex-col bg-muted/20 min-w-0">
          <div className="h-16 border-b bg-card flex items-center px-5 gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {thread?.client ? `${thread.client.first_name[0]}${thread.client.last_name[0]}` : "—"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{thread?.client ? `${thread.client.first_name} ${thread.client.last_name}` : "—"}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" /> WhatsApp · {thread?.client?.phone ?? "—"}
              </div>
            </div>
            {thread && (
              <Select value={thread.status} onValueChange={(v) => updateConv({ status: v as Conversation["status"] })}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI attiva</SelectItem>
                  <SelectItem value="operator">Operatore</SelectItem>
                  <SelectItem value="booked">Prenotato</SelectItem>
                  <SelectItem value="closed">Chiusa</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="icon" className="size-9"><Phone className="size-4" /></Button>
            <Button variant="outline" size="icon" className="size-9"><Calendar className="size-4" /></Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {msgs.map((m) => {
              const fromClient = m.sender === "client";
              return (
                <div key={m.id} className={cn("flex", fromClient ? "justify-start" : "justify-end")}>
                  <div className={cn(
                    "max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                    fromClient ? "bg-card text-card-foreground rounded-bl-sm border" : "bg-primary text-primary-foreground rounded-br-sm",
                  )}>
                    {m.sender === "ai" && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1"><Sparkles className="size-3" />Sofia AI</div>
                    )}
                    {m.sender === "operator" && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1"><UserCog className="size-3" />Operatore</div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className={cn("text-[10px] mt-1", fromClient ? "text-muted-foreground" : "text-primary-foreground/70")}>
                      {new Date(m.created_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-end">
                <div className="bg-primary/80 text-primary-foreground rounded-2xl px-4 py-2.5 text-sm shadow-soft animate-pulse">
                  <Sparkles className="size-3 inline mr-1" /> Sofia sta scrivendo…
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-card">
            <div className="flex gap-2">
              <Input
                placeholder="Scrivi come operatore o lascia rispondere l'AI…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !sending) send(false); }}
                className="flex-1"
                disabled={sending}
              />
              <Button variant="outline" disabled={sending || !active} onClick={() => send(true)}>
                <Sparkles className="size-4 mr-1.5" />AI
              </Button>
              <Button className="bg-gradient-primary" disabled={sending || !input.trim()} onClick={() => send(false)}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT — client card */}
        <div className="w-80 border-l bg-card overflow-y-auto hidden xl:flex flex-col">
          {thread?.client ? (
            <>
              <div className="p-5 border-b text-center">
                <Avatar className="size-16 mx-auto mb-3">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">
                    {thread.client.first_name[0]}{thread.client.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="font-semibold">{thread.client.first_name} {thread.client.last_name}</div>
                <div className="text-xs text-muted-foreground">{thread.client.phone}</div>
                <div className="text-xs text-muted-foreground">{thread.client.email}</div>
                <div className="flex gap-1.5 justify-center mt-3 flex-wrap">
                  <Badge variant="secondary">{thread.client.department ?? "—"}</Badge>
                  <Badge className={thread.client.status === "active" ? "bg-success/15 text-success hover:bg-success/15" : "bg-warning/20 text-warning-foreground hover:bg-warning/20"}>
                    {thread.client.status === "active" ? "Attivo" : "Inattivo"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-xs font-medium mb-2"><UserCog className="size-3.5" />Operatore</div>
                <Select value={thread.assigned_operator_id ?? ""} onValueChange={(v) => updateConv({ assigned_operator_id: v || null })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Non assegnato" /></SelectTrigger>
                  <SelectContent>
                    {operators.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-xs font-medium mb-2"><Tag className="size-3.5" />Tag</div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {thread.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button onClick={() => removeTag(t)} className="hover:text-destructive"><X className="size-2.5" /></button>
                    </Badge>
                  ))}
                  {thread.tags.length === 0 && <span className="text-xs text-muted-foreground">Nessun tag</span>}
                </div>
                <div className="flex gap-1.5">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Aggiungi tag" className="h-8 text-xs" />
                  <Button size="sm" variant="outline" className="h-8" onClick={addTag}>+</Button>
                </div>
              </div>

              <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-xs font-medium mb-2"><StickyNote className="size-3.5" />Note interne</div>
                <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={3} className="text-xs" placeholder="Note solo per il team…" />
                <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={saveNotes}>Salva note</Button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 text-xs font-medium mb-3"><Activity className="size-3.5" />Timeline attività</div>
                <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {appts.map((a) => (
                    <div key={a.id} className="flex gap-3 relative">
                      <div className="size-3.5 rounded-full bg-primary mt-0.5 ring-4 ring-card shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">{a.visit_type}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-2.5" />{new Date(a.starts_at).toLocaleString("it", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <Badge variant="outline" className="text-[9px] mt-0.5 h-4 py-0">{a.status}</Badge>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 relative">
                    <div className="size-3.5 rounded-full bg-success mt-0.5 ring-4 ring-card shrink-0 flex items-center justify-center"><CheckCircle2 className="size-2 text-success-foreground" /></div>
                    <div className="text-xs">
                      <div className="font-medium">Conversazione avviata</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(thread.last_message_at).toLocaleString("it")}</div>
                    </div>
                  </div>
                  {thread.client.last_visit && (
                    <div className="flex gap-3 relative">
                      <div className="size-3.5 rounded-full bg-muted mt-0.5 ring-4 ring-card shrink-0" />
                      <div className="text-xs">
                        <div className="font-medium">Ultima visita</div>
                        <div className="text-[10px] text-muted-foreground">{thread.client.last_visit}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">Seleziona una conversazione</div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
