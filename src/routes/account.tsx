import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/useAuth";
import { usePermissions } from "@/lib/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  User as UserIcon, Shield, Bell, CreditCard, Camera, Smartphone, LogOut as LogOutIcon,
  Download, AlertTriangle, Check, Sparkles, X as XIcon,
} from "lucide-react";
import { PASSWORD_RULES, passwordMeetsRules } from "@/lib/password-utils";
import {
  PLAN_IDS, PLAN_LABELS, MESSAGE_TIER_PRICES, MESSAGE_TIERS, MAX_OPERATORS,
  priceForTier, type PlanId,
} from "@/lib/plans";


export const Route = createFileRoute("/account")({
  component: AccountPage,
  head: () => ({ meta: [{ title: "Impostazioni account · DentAI" }] }),
});

type Tab = "account" | "security" | "notifications" | "subscription";

const NOTIF_KEY = "dentai_notif_prefs";
const NOTIF_EVENTS = [
  { id: "new_booking", label: "Nuova prenotazione ricevuta", desc: "Quando l'AI prenota un nuovo appuntamento" },
  { id: "missed_call", label: "Chiamata persa rilevata", desc: "Quando il sistema intercetta una chiamata senza risposta" },
  { id: "cancel", label: "Disdetta appuntamento", desc: "Quando un paziente disdice tramite reminder" },
  { id: "no_show", label: "Paziente non presentato", desc: "Quando un paziente viene segnato come no-show" },
  { id: "new_msg", label: "Nuovo messaggio in chat", desc: "Quando arriva un messaggio da un paziente" },
  { id: "followup_done", label: "Follow-up completato", desc: "Quando un workflow di follow-up si conclude" },
  { id: "upsell_ok", label: "Upsell accettato", desc: "Quando un paziente accetta un'offerta upsell" },
  { id: "sub_expiring", label: "Abbonamento in scadenza", desc: "Quando mancano meno di 7 giorni al rinnovo" },
];

function passwordStrength(pw: string): { label: string; value: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Debole", value: 25, color: "bg-destructive" };
  if (score === 2) return { label: "Media", value: 60, color: "bg-yellow-500" };
  return { label: "Forte", value: 100, color: "bg-green-500" };
}

function AccountPage() {
  const [tab, setTab] = useState<Tab>("account");
  const { user } = useAuth();
  const { isSuperAdmin, isAuthorizedAdmin, roles } = usePermissions();

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isAuthorizedAdmin
      ? "Admin Autorizzato"
      : roles.includes("support")
        ? "Supporto"
        : "Account Studio";

  const tabs = [
    { id: "account" as Tab, label: "Il mio account", icon: UserIcon },
    { id: "security" as Tab, label: "Sicurezza", icon: Shield },
    { id: "notifications" as Tab, label: "Notifiche", icon: Bell },
    { id: "subscription" as Tab, label: "Abbonamento", icon: CreditCard },
  ];

  return (
    <AppLayout>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          <div className="px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Impostazioni</div>
            <div className="text-xs text-muted-foreground mt-1">{roleLabel}</div>
          </div>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground/80"
                }`}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </aside>

        <div>
          {tab === "account" && <AccountSection user={user} />}
          {tab === "security" && <SecuritySection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "subscription" && <SubscriptionSection />}
        </div>
      </div>
    </AppLayout>
  );
}

function AccountSection({ user }: { user: any }) {
  const [first, setFirst] = useState(user?.user_metadata?.first_name ?? "");
  const [last, setLast] = useState(user?.user_metadata?.last_name ?? "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone ?? user?.phone ?? "");
  useEffect(() => {
    if (!user) return;
    const fn: string = user.user_metadata?.full_name ?? "";
    if (!first && !last && fn) {
      const [f, ...r] = fn.split(" ");
      setFirst(f ?? ""); setLast(r.join(" "));
    }
  }, [user]);

  const initials = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? "U");

  const save = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { first_name: first, last_name: last, phone, full_name: `${first} ${last}`.trim() },
    });
    if (error) toast.error(error.message);
    else toast.success("Profilo aggiornato");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Il mio account</h2>
        <p className="text-sm text-muted-foreground">Gestisci le informazioni del tuo profilo</p>
      </div>
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-20">
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={() => toast.info("Caricamento foto disponibile a breve")}>
            <Camera className="size-4 mr-1.5" /> Cambia foto
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Nome</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
          <div><Label>Cognome</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
          <div><Label>Email</Label><Input value={user?.email ?? ""} readOnly className="bg-muted/40" /></div>
          <div><Label>Numero di telefono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 ..." /></div>
        </div>
        <Button onClick={save} className="bg-gradient-primary">Salva modifiche</Button>
      </Card>
    </div>
  );
}

function SecuritySection() {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const strength = useMemo(() => passwordStrength(pw), [pw]);
  const allOk = passwordMeetsRules(pw);
  const matches = pw.length > 0 && pw === pw2;
  const canSubmit = allOk && matches;
  const [twoFA, setTwoFA] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const updatePw = async () => {
    if (!canSubmit) return;
    const { error } = await supabase.auth.updateUser({
      password: pw,
      data: { requires_password_change: false },
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Password aggiornata");
      setCur(""); setPw(""); setPw2("");
      if (typeof window !== "undefined") sessionStorage.setItem("dentai_pw_banner_dismissed", "1");
    }
  };

  const sessions = [
    { device: "Chrome · macOS", location: "Milano, Italia", last: "Ora" },
    { device: "Safari · iPhone", location: "Milano, Italia", last: "Ieri" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Sicurezza</h2>
        <p className="text-sm text-muted-foreground">Gestisci password e accessi al tuo account</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Password</h3>
          <p className="text-sm text-muted-foreground">Aggiorna regolarmente la tua password per mantenere l'account sicuro</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Password attuale</Label><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div />
          <div><Label>Nuova password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <div><Label>Conferma nuova password</Label><Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        </div>
        {pw && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Forza password</span><span className="font-medium">{strength.label}</span></div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.value}%` }} />
            </div>
          </div>
        )}
        <ul className="space-y-1 text-sm">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(pw);
            return (
              <li key={r.id} className="flex items-center gap-2">
                {ok ? <Check className="size-3.5 text-green-600" /> : <XIcon className="size-3.5 text-destructive" />}
                <span className={ok ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
              </li>
            );
          })}
          {pw2.length > 0 && (
            <li className="flex items-center gap-2">
              {matches ? <Check className="size-3.5 text-green-600" /> : <XIcon className="size-3.5 text-destructive" />}
              <span className={matches ? "text-foreground" : "text-muted-foreground"}>Le password coincidono</span>
            </li>
          )}
        </ul>
        <Button onClick={updatePw} disabled={!canSubmit} className="bg-gradient-primary">Salva nuova password</Button>
      </Card>


      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">Autenticazione a due fattori
              <Badge variant={twoFA ? "default" : "outline"} className={twoFA ? "bg-green-500/15 text-green-600 hover:bg-green-500/15" : ""}>{twoFA ? "Attiva" : "Non attiva"}</Badge>
            </h3>
            <p className="text-sm text-muted-foreground">Aggiungi un livello di sicurezza extra al tuo account</p>
          </div>
          <Button variant={twoFA ? "destructive" : "default"} onClick={() => { setTwoFA(!twoFA); setShowQR(!twoFA); }}>
            {twoFA ? "Disattiva 2FA" : "Attiva 2FA"}
          </Button>
        </div>
        {twoFA && showQR && (
          <div className="border rounded-lg p-4 flex items-center gap-4 bg-muted/30">
            <div className="size-32 bg-white border rounded grid place-items-center text-[10px] text-muted-foreground p-2 text-center">
              QR code<br/>(scansiona con Google Authenticator)
            </div>
            <div className="text-sm text-muted-foreground">
              Scansiona il codice QR con Google Authenticator e inserisci il codice generato per completare l'attivazione.
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Sessioni attive</h3>
          <p className="text-sm text-muted-foreground">Controlla i dispositivi connessi al tuo account</p>
        </div>
        <div className="divide-y">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-3">
              <div className="flex items-center gap-3">
                <Smartphone className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{s.device}</div>
                  <div className="text-xs text-muted-foreground">{s.location} · {s.last}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => toast.success("Sessione disconnessa")}>Disconnetti</Button>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full" onClick={async () => { await supabase.auth.signOut(); toast.success("Disconnesso da tutti i dispositivi"); }}>
          <LogOutIcon className="size-4 mr-1.5" /> Disconnetti da tutti i dispositivi
        </Button>
      </Card>
    </div>
  );
}

type NotifPrefs = Record<string, { email: boolean; push: boolean; in_app: boolean }>;

function NotificationsSection() {
  const defaults: NotifPrefs = useMemo(() => Object.fromEntries(
    NOTIF_EVENTS.map((e) => [e.id, { email: true, push: false, in_app: true }])
  ), []);
  const [prefs, setPrefs] = useState<NotifPrefs>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, [defaults]);

  const toggle = (id: string, k: "email" | "push" | "in_app", v: boolean) =>
    setPrefs((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));

  const save = () => { localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)); toast.success("Preferenze salvate"); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Notifiche</h2>
        <p className="text-sm text-muted-foreground">Scegli come e quando vuoi essere avvisato</p>
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_70px_70px] px-5 py-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <div>Evento</div><div className="text-center">Email</div><div className="text-center">Push</div><div className="text-center">In-app</div>
        </div>
        {NOTIF_EVENTS.map((ev) => (
          <div key={ev.id} className="grid grid-cols-[1fr_70px_70px_70px] items-center px-5 py-3 border-b last:border-0">
            <div>
              <div className="text-sm font-medium">{ev.label}</div>
              <div className="text-xs text-muted-foreground">{ev.desc}</div>
            </div>
            <div className="flex justify-center"><Switch checked={prefs[ev.id]?.email} onCheckedChange={(v) => toggle(ev.id, "email", v)} /></div>
            <div className="flex justify-center"><Switch checked={prefs[ev.id]?.push} onCheckedChange={(v) => toggle(ev.id, "push", v)} /></div>
            <div className="flex justify-center"><Switch checked={prefs[ev.id]?.in_app} onCheckedChange={(v) => toggle(ev.id, "in_app", v)} /></div>
          </div>
        ))}
      </Card>
      <Button onClick={save} className="bg-gradient-primary">Salva preferenze</Button>
    </div>
  );
}

function SubscriptionSection() {
  const { user } = useAuth();
  const { data: studio } = useQueryStudio(user?.id);

  const plan: PlanId = (studio?.plan && (PLAN_IDS as string[]).includes(studio.plan) ? studio.plan : "silver") as PlanId;
  const tier = studio?.message_tier ?? MESSAGE_TIERS[plan][0];
  const price = priceForTier(plan, tier) ?? 0;
  const cycle = studio?.billing_cycle === "annual" ? "Annuale" : "Mensile";
  const renewal = studio?.subscription_expires_at
    ? new Date(studio.subscription_expires_at).toLocaleDateString("it-IT")
    : "—";
  const statusLabel =
    studio?.status === "suspended" ? "Sospeso"
    : (studio?.subscription_expires_at && new Date(studio.subscription_expires_at).getTime() - Date.now() < 7 * 86400000) ? "In scadenza"
    : "Attivo";
  const statusBadgeClass = statusLabel === "Attivo"
    ? "bg-green-500/15 text-green-600 hover:bg-green-500/15"
    : statusLabel === "In scadenza"
      ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/15"
      : "bg-red-500/15 text-red-600 hover:bg-red-500/15";

  // Placeholder utilizzo (collegabile a metriche reali in seguito)
  const used = 720;
  const total = tier;
  const pct = Math.min(100, Math.round((used / total) * 100));
  const barColor = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

  const opTotal = MAX_OPERATORS[plan];
  const opUsed = Math.min(opTotal, 2);
  const opPct = Math.round((opUsed / opTotal) * 100);
  const opColor = opPct >= 100 ? "bg-destructive" : opPct >= 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Abbonamento</h2>
        <p className="text-sm text-muted-foreground">Monitora il tuo piano e gestisci il pagamento</p>
      </div>

      <Card className="p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold">Piano {PLAN_LABELS[plan]}</h3>
            <Badge className={statusBadgeClass}>{statusLabel}</Badge>
            <Badge variant="outline">{cycle}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">€{price}/mese · rinnovo il {renewal}</p>
        </div>
        <Sparkles className="size-8 text-primary opacity-60" />
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Messaggi WhatsApp / SMS</h3>
          <p className="text-sm text-muted-foreground">{used.toLocaleString("it-IT")} su {total.toLocaleString("it-IT")} messaggi questo mese</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <UpgradeMessagesSection plan={plan} currentTier={tier} userId={user?.id} />
        <BuyMessagesDialog />
      </Card>

      <Card className="p-6 space-y-3">
        <div>
          <h3 className="font-semibold">Operatori collegati</h3>
          <p className="text-sm text-muted-foreground">{opUsed} operatori attivi su {opTotal} disponibili (piano {PLAN_LABELS[plan]})</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${opColor} transition-all`} style={{ width: `${opPct}%` }} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Prossimo rinnovo</h3>
          <div className="text-sm text-muted-foreground mt-1">
            <div>Data: {renewal}</div>
            <div>Importo: €{price}/mese</div>
            <div>Tipo: {cycle}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <UpgradeDialog currentPlan={plan} />
          <ManagePaymentDialog />
          <InvoicesDialog />
          <Button variant="outline" asChild>
            <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Accordo di licenza"); }}>Accordo di licenza</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function useQueryStudio(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-studio", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select("plan, message_tier, billing_cycle, subscription_expires_at, status")
        .eq("owner_user_id", userId!)
        .maybeSingle();
      return data;
    },
  });
}


function BuyMessagesDialog() {
  const packs = [
    { qty: 500, price: 19, desc: "Ideale per studi con basso volume", popular: false },
    { qty: 1000, price: 35, desc: "Il più scelto dai nostri studi", popular: true },
    { qty: 2000, price: 65, desc: "Per studi ad alto volume di pazienti", popular: false },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Acquista messaggi extra</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pacchetti messaggi extra</DialogTitle>
          <DialogDescription>Scegli il pacchetto più adatto alle tue esigenze</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-4 py-2">
          {packs.map((p) => (
            <Card key={p.qty} className={`p-5 relative ${p.popular ? "border-primary shadow-elegant" : ""}`}>
              {p.popular && <Badge className="absolute -top-2 right-4 bg-primary">Più popolare</Badge>}
              <div className="text-2xl font-bold">{p.qty.toLocaleString("it-IT")} <span className="text-sm font-normal text-muted-foreground">messaggi</span></div>
              <div className="text-3xl font-semibold mt-1">€{p.price}</div>
              <p className="text-xs text-muted-foreground mt-2 mb-4">{p.desc}</p>
              <Button className="w-full" variant={p.popular ? "default" : "outline"} onClick={() => toast.success(`Pacchetto ${p.qty} richiesto`)}>Acquista</Button>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          I messaggi extra si aggiungono al tuo piano mensile e non hanno scadenza fino al termine dell'abbonamento. Il pagamento verrà addebitato sulla carta collegata.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ManagePaymentDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Gestisci pagamento</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Metodo di pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="font-medium">Carta collegata: •••• •••• •••• 4242</div>
            <div className="text-muted-foreground">Scadenza: 09/27</div>
            <div className="text-muted-foreground">Prossimo addebito: 13/06/2026 · €49</div>
          </div>
          <Button className="w-full" onClick={() => toast.info("Aggiornamento carta")}>Aggiorna carta</Button>
          <Separator />
          <Button variant="destructive" className="w-full" onClick={() => toast.warning("Cancellazione abbonamento richiesta")}>Cancella abbonamento</Button>
          <div className="flex gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>Cancellando l'abbonamento perderai accesso a DentAI al termine del periodo già pagato. I tuoi dati verranno conservati per 30 giorni.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UpgradeDialog({ currentPlan }: { currentPlan: PlanId }) {
  const plans: { id: PlanId; opsRange: string; popular: boolean }[] = [
    { id: "silver", opsRange: "1-2 operatori", popular: false },
    { id: "gold", opsRange: "3-4 operatori", popular: true },
    { id: "platinum", opsRange: "5-6 operatori", popular: false },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild><Button>Upgrade piano</Button></DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Scegli il tuo piano</DialogTitle>
          <DialogDescription>Tre piani Silver, Gold e Platinum con diverse fasce di messaggi e operatori</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-3 gap-4 py-2">
          {plans.map((p) => {
            const tiers = MESSAGE_TIERS[p.id];
            const minPrice = Math.min(...Object.values(MESSAGE_TIER_PRICES[p.id]));
            const current = p.id === currentPlan;
            const features = [
              p.opsRange,
              `Scegli tra ${tiers.map((t) => t.toLocaleString("it-IT")).join(" / ")} msg/mese`,
              "Tutte le funzionalità incluse",
              "Numero WhatsApp dedicato",
            ];
            return (
              <Card key={p.id} className={`p-5 relative ${p.popular ? "border-primary shadow-elegant" : ""}`}>
                {p.popular && <Badge className="absolute -top-2 right-4 bg-primary">Più popolare</Badge>}
                <div className="text-lg font-semibold">{PLAN_LABELS[p.id]}</div>
                <div className="text-3xl font-bold mt-1">da €{minPrice}<span className="text-sm font-normal text-muted-foreground">/mese</span></div>
                <ul className="space-y-1.5 my-4 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" /><span>{f}</span></li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  disabled={current}
                  variant={p.popular && !current ? "default" : "outline"}
                  onClick={() => toast.info("Contatta il supporto DentAI per cambiare piano")}
                >
                  {current ? "Piano attuale" : `Passa a ${PLAN_LABELS[p.id]}`}
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Il cambio piano viene gestito dal team DentAI. Contattaci tramite il supporto per procedere.
        </p>
      </DialogContent>
    </Dialog>
  );
}


function InvoicesDialog() {
  const invoices = [
    { date: "13/05/2026", amount: 49, status: "Pagata" },
    { date: "13/04/2026", amount: 49, status: "Pagata" },
    { date: "13/03/2026", amount: 49, status: "Pagata" },
  ];
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Scarica fatture</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Storico fatture</DialogTitle>
          <DialogDescription>Scarica le tue fatture in formato PDF</DialogDescription>
        </DialogHeader>
        <div className="divide-y">
          {invoices.map((inv, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm font-medium">{inv.date}</div>
                <div className="text-xs text-muted-foreground">€{inv.amount} · <span className="text-green-600">{inv.status}</span></div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Download avviato")}>
                <Download className="size-4 mr-1.5" /> Scarica PDF
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Le fatture vengono generate automaticamente ad ogni rinnovo del piano.</p>
      </DialogContent>
    </Dialog>
  );
}

function UpgradeMessagesSection({
  plan, currentTier, userId,
}: { plan: PlanId; currentTier: number; userId: string | undefined }) {
  const tiers = MESSAGE_TIERS[plan];
  const [pending, setPending] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!pending || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("studios")
      .update({ message_tier: pending })
      .eq("owner_user_id", userId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Fascia aggiornata a ${pending.toLocaleString("it-IT")} msg/mese`);
    setPending(null);
  };

  const pendingPrice = pending ? MESSAGE_TIER_PRICES[plan][pending] : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-medium">Aumenta i tuoi messaggi mensili</div>
          <div className="text-xs text-muted-foreground">
            Cambia la fascia messaggi senza modificare gli operatori. Il cambio è immediato.
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {tiers.map((t) => {
          const active = t === currentTier;
          return (
            <button
              key={t}
              type="button"
              disabled={active}
              onClick={() => setPending(t)}
              className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                active
                  ? "border-primary bg-primary/10 cursor-default"
                  : "border-border hover:border-primary hover:bg-primary/5"
              }`}
            >
              <div className="font-medium">{t.toLocaleString("it-IT")} msg</div>
              <div className="text-xs text-muted-foreground">€{MESSAGE_TIER_PRICES[plan][t]}/mese</div>
              {active && <Badge className="mt-1 bg-primary/15 text-primary hover:bg-primary/15">Attiva</Badge>}
            </button>
          );
        })}
      </div>

      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Conferma cambio fascia</DialogTitle>
            <DialogDescription>
              Vuoi passare a {pending?.toLocaleString("it-IT")} messaggi/mese a €{pendingPrice}?
              Il cambio è immediato e verrà addebitato sulla tua carta collegata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>Annulla</Button>
            <Button onClick={confirm} disabled={saving} className="bg-gradient-primary">
              {saving ? "Salvataggio…" : "Conferma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
