import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, Search, Phone, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Conversation, type Message, type Client } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => ({ meta: [{ title: "Chat AI · DentAI" }] }),
});

type ConvWithClient = Conversation & { client: Client | null };

function Chat() {
  const qc = useQueryClient();
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: convs = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await api.conversations();
      if (error) throw error;
      return data as ConvWithClient[];
    },
  });

  useEffect(() => {
    if (!active && convs.length) setActive(convs[0].id);
  }, [convs, active]);

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

  // Realtime subscription
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

  const thread = convs.find((c) => c.id === active);

  const send = async (asAi: boolean) => {
    if (!active || (!asAi && !input.trim())) return;
    setSending(true);
    try {
      if (!asAi) {
        await supabase.from("messages").insert({ conversation_id: active, sender: "operator", content: input.trim() });
        setInput("");
        await qc.invalidateQueries({ queryKey: ["messages", active] });
      }
      // Trigger AI response
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active }),
      });
      if (!res.ok) throw new Error(await res.text());
      await qc.invalidateQueries({ queryKey: ["messages", active] });
      await qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch (e) {
      toast.error("AI non disponibile: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout>
      <Card className="overflow-hidden h-[calc(100vh-12rem)] flex">
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cerca conversazione" className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convs.map((t) => {
              const name = t.client ? `${t.client.first_name} ${t.client.last_name}` : "Sconosciuto";
              return (
                <button key={t.id} onClick={() => setActive(t.id)} className={cn(
                  "w-full text-left p-3 border-b hover:bg-muted/40 transition-colors flex gap-3",
                  active === t.id && "bg-accent/40",
                )}>
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] mt-1 h-4 py-0">
                      {t.status === "ai" ? "AI attiva" : t.status === "operator" ? "Operatore" : t.status === "booked" ? "Prenotato" : "Chiusa"}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-muted/20">
          <div className="h-16 border-b bg-card flex items-center px-5 gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {thread?.client ? `${thread.client.first_name[0]}${thread.client.last_name[0]}` : "—"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-sm">{thread?.client ? `${thread.client.first_name} ${thread.client.last_name}` : "—"}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-success" /> WhatsApp · {thread?.client?.phone}
              </div>
            </div>
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
                    fromClient
                      ? "bg-card text-card-foreground rounded-bl-sm border"
                      : "bg-primary text-primary-foreground rounded-br-sm",
                  )}>
                    {m.sender === "ai" && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 mb-1">
                        <Sparkles className="size-3" />Sofia AI
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <div className={cn("text-[10px] mt-1", fromClient ? "text-muted-foreground" : "text-primary-foreground/70")}>
                      {new Date(m.created_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
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
            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> Premi "AI" per generare una risposta automatica con Sofia.
            </div>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
