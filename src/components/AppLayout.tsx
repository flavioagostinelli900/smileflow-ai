import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { LogOut, Settings as SettingsIcon, Menu, X } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import {
  LayoutDashboard, Users, MessageSquareHeart, PhoneMissed, MessagesSquare,
  UserCog, Calendar, Gift, Settings, ClipboardPlus, Sparkles, Bell, Search, TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePermissions } from "@/lib/usePermissions";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import { SupportWidget } from "@/components/SupportWidget";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { useState } from "react";

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

function NavList({
  items, current, onNavigate,
}: {
  items: typeof nav;
  current: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {items.map((item) => {
        const active =
          item.to === "/" ? current === "/" : current.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="p-5 flex items-center gap-2.5 border-b border-sidebar-border">
      <div className="size-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
        <Sparkles className="size-5 text-primary-foreground" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="font-semibold text-sidebar-accent-foreground text-sm">DentAI</span>
        <span className="text-[11px] text-sidebar-foreground/60">Smart Patient OS</span>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isAuthorizedAdmin, isSupport, loading: permissionsLoading } = usePermissions();
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdminNav = !permissionsLoading && (isSuperAdmin || isAuthorizedAdmin || isSupport);
  const fullNav = showAdminNav
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
    <PWAInstallBanner />
    <div className="flex min-h-screen bg-gradient-subtle">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <Brand />
        <NavList items={fullNav} current={location.pathname} />
        <div className="p-3 m-3 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-sidebar-primary" />
            <span className="text-xs font-medium text-sidebar-accent-foreground">AI attiva</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/70 backdrop-blur-md sticky top-0 z-30 flex items-center px-3 md:px-8 gap-2 md:gap-4">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="md:hidden size-9 rounded-md hover:bg-muted flex items-center justify-center"
                aria-label="Apri menu"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border [&>button]:hidden flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-sidebar-border">
                <Brand />
                <SheetClose asChild>
                  <button
                    className="mr-3 size-9 rounded-md hover:bg-sidebar-accent/60 flex items-center justify-center text-sidebar-foreground"
                    aria-label="Chiudi menu"
                  >
                    <X className="size-5" />
                  </button>
                </SheetClose>
              </div>
              <NavList
                items={fullNav}
                current={location.pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1 flex items-center gap-3 min-w-0">
            <h1 className="text-base md:text-lg font-semibold tracking-tight truncate">
              {current?.label ?? "DentAI"}
            </h1>
          </div>
          <div className="hidden md:flex relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Cerca paziente, conversazione…" className="pl-9 bg-background" />
          </div>
          <button className="relative size-9 rounded-md hover:bg-muted flex items-center justify-center transition-colors">
            <Bell className="size-4" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-primary" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none rounded-full focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-9 cursor-pointer">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-medium">
                  {initials || "DR"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex items-center gap-3 py-2">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-medium">{initials || "DR"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user?.user_metadata?.full_name || user?.email}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {isSuperAdmin ? "Super Admin" : isAuthorizedAdmin ? "Admin Autorizzato" : "Account Studio"}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
                <SettingsIcon className="size-4 mr-2" /> Impostazioni account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={async () => {
                  if (typeof window !== "undefined") {
                    sessionStorage.removeItem("dentai_session_alive");
                    localStorage.removeItem("dentai_remember");
                  }
                  await supabase.auth.signOut();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="size-4 mr-2" /> Disconnetti
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <ImpersonationBar />
        <main className="flex-1 p-4 md:p-8 min-w-0">{children}</main>
      </div>
      <SupportWidget />
    </div>
    </AuthGate>
  );
}
