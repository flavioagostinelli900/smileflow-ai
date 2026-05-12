import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  MessageSquareHeart,
  PhoneMissed,
  MessagesSquare,
  UserCog,
  Calendar,
  Gift,
  Settings,
  ClipboardPlus,
  Sparkles,
  Bell,
  Search,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck } from "lucide-react";
import { usePermissions } from "@/lib/usePermissions";
import { ImpersonationBar } from "@/components/ImpersonationBar";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clienti", icon: Users },
  { to: "/followup", label: "Follow-up AI", icon: MessageSquareHeart },
  { to: "/missed-calls", label: "Chiamate perse", icon: PhoneMissed },
  { to: "/chat", label: "Chat AI", icon: MessagesSquare },
  { to: "/operators", label: "Operatori", icon: UserCog },
  { to: "/bookings", label: "Prenotazioni", icon: Calendar },
  { to: "/reminders", label: "Reminder", icon: Bell },
  { to: "/loyalty", label: "Fedeltà", icon: Gift },
  { to: "/upsell", label: "Upsell", icon: TrendingUp },
  { to: "/reception", label: "Segreteria", icon: ClipboardPlus },
  { to: "/settings", label: "Configurazione", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isAuthorizedAdmin } = usePermissions();
  const fullNav = (isSuperAdmin || isAuthorizedAdmin)
    ? [...nav, { to: "/admin", label: "Admin", icon: ShieldCheck }]
    : nav;
  const current = fullNav.find((n) =>
    n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to),
  );
  const initials = (user?.user_metadata?.full_name || user?.email || "DR")
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  return (
    <AuthGate>
    <div className="flex min-h-screen bg-gradient-subtle">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <div className="p-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-sidebar-accent-foreground text-sm">DentAI</span>
            <span className="text-[11px] text-sidebar-foreground/60">Smart Patient OS</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {fullNav.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 m-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="size-3.5 text-sidebar-primary" />
            <span className="text-xs font-medium text-sidebar-accent-foreground">AI attiva</span>
          </div>
          <p className="text-[11px] text-sidebar-foreground/70 leading-snug">
            142 conversazioni gestite oggi · 28 prenotazioni
          </p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/70 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-8 gap-4">
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">{current?.label ?? "DentAI"}</h1>
          </div>
          <div className="hidden md:flex relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Cerca paziente, conversazione…" className="pl-9 bg-background" />
          </div>
          <button className="relative size-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/login" });
            }}
            className="size-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground"
            title="Esci"
          >
            <LogOut className="size-4" />
          </button>
          <Avatar className="size-9">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-medium">
              {initials || "DR"}
            </AvatarFallback>
          </Avatar>
        </header>
        <ImpersonationBar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
    </AuthGate>
  );
}
