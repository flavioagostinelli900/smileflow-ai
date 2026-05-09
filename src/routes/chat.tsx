import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Sparkles, Search, Phone, Calendar, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: Chat,
  head: () => ({ meta: [{ title: "Chat AI · DentAI" }] }),
});

const threads = [
  { id: 1, name: "Giulia Romano", last: "Sì, martedì alle 10 va benissimo", time: "2m", unread: 0, status: "AI", lang: "IT" },
  { id: 2, name: "Marco Bianchi", last: "Posso spostare al pomeriggio?", time: "8m", unread: 2, status: "Operatore", lang: "IT" },
  { id: 3, name: "Sara Conti", last: "Grazie mille!", time: "1h", unread: 0, status: "Chiusa", lang: "IT" },
  { id: 4, name: "John Smith", last: "What time is available?", time: "2h", unread: 1, status: "AI", lang: "EN" },
  { id: 5, name: "Paolo Greco", last: "Mandatemi info per favore", time: "3h", unread: 0, status: "AI", lang: "IT" },
];

const messages = [
  { from: "ai", text: "Buongiorno Giulia! Sono l'assistente AI dello Studio Rossi. Vedo che è passato un po' dall'ultima igiene dentale 🦷", time: "09:32" },
  { from: "user", text: "Sì in effetti, dovrei prenotare", time: "09:35" },
  { from: "ai", text: "Perfetto! Ho disponibilità martedì 11/06 alle 10:00 oppure giovedì 13/06 alle 15:30. Quale preferisce?", time: "09:35" },
  { from: "user", text: "Sì, va bene martedì mattina alle 10", time: "09:40" },
  { from: "ai", text: "Confermato! ✅ Le ho appena inviato il promemoria. A martedì 11 giugno alle 10:00 con la Dr.ssa Conti.", time: "09:40" },
];

function Chat() {
  const [active, setActive] = useState(1);
  const [input, setInput] = useState("");
  const thread = threads.find((t) => t.id === active)!;

  return (
    <AppLayout>
      <Card className="overflow-hidden h-[calc(100vh-12rem)] flex">
        {/* Threads */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cerca conversazione" className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "w-full text-left p-3 border-b hover:bg-muted/40 transition-colors flex gap-3",
                  active === t.id && "bg-accent/40",
                )}
              >
                <Avatar className="size-10">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">{t.last}</p>
                    {t.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-medium size-4 rounded-full flex items-center justify-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] mt-1 h-4 py-0">{t.status} · {t.lang}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-muted/20">
          <div className="h-16 border-b bg-card flex items-center px-5 gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                {thread.name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium text-sm">{thread.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-success" /> Online · WhatsApp
              </div>
            </div>
            <Button variant="outline" size="sm"><Sparkles className="size-3.5 mr-1.5" />AI</Button>
            <Button variant="outline" size="sm"><User className="size-3.5 mr-1.5" />Operatore</Button>
            <Button variant="outline" size="icon" className="size-9"><Phone className="size-4" /></Button>
            <Button variant="outline" size="icon" className="size-9"><Calendar className="size-4" /></Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-md rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                  m.from === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-card-foreground rounded-bl-sm border",
                )}>
                  {m.from === "ai" && (
                    <div className="flex items-center gap-1 text-[10px] text-primary mb-1">
                      <Sparkles className="size-3" />AI Assistant
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <div className={cn("text-[10px] mt-1", m.from === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t bg-card">
            <div className="flex gap-2">
              <Input
                placeholder="Scrivi un messaggio o lascia che l'AI risponda…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />
              <Button className="bg-gradient-primary"><Send className="size-4" /></Button>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
              <Sparkles className="size-3 text-primary" /> AI suggerisce: "Confermo l'appuntamento. A presto!"
            </div>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
