import { useEffect, useState } from "react";
import { Smartphone, X, Share, MoreVertical, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "dentai_pwa_installed";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

export function PWAInstallBanner() {
  const isMobile = useIsMobile();
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
    const stored = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    if (stored || isStandalone()) {
      setInstalled(true);
      if (!stored) localStorage.setItem(STORAGE_KEY, "1");
    }
    const onInstalled = () => {
      localStorage.setItem(STORAGE_KEY, "1");
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    const mql = window.matchMedia("(display-mode: standalone)");
    const onChange = () => { if (mql.matches) onInstalled(); };
    mql.addEventListener?.("change", onChange);
    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onChange);
    };
  }, []);

  if (!isMobile || installed) return null;

  return (
    <>
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-2.5 flex items-center gap-3 shadow-sm">
        <Smartphone className="size-4 shrink-0" />
        <p className="flex-1 text-xs leading-snug">
          📱 Aggiungi DentAI alla schermata home per un accesso più veloce
        </p>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 px-2.5 text-xs shrink-0"
          onClick={() => setOpen(true)}
        >
          Come si fa?
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          {platform === "ios" ? (
            <IosGuide />
          ) : platform === "android" ? (
            <AndroidGuide />
          ) : (
            <GenericGuide />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
        {n}
      </div>
      <div className="flex-1 text-sm pt-0.5">
        <div>{children}</div>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-muted-foreground text-xs">
          {icon}
        </div>
      </div>
    </div>
  );
}

function IosGuide() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Aggiungi DentAI al tuo iPhone</DialogTitle>
        <DialogDescription>Segui questi 3 passaggi su Safari</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <Step n={1} icon={<><Share className="size-4" /> Icona condivisione</>}>
          Tocca l'icona di <strong>condivisione</strong> in basso nel browser Safari
        </Step>
        <Step n={2} icon={<><Plus className="size-4" /> Aggiungi alla schermata Home</>}>
          Scorri verso il basso e tocca <strong>"Aggiungi alla schermata Home"</strong>
        </Step>
        <Step n={3} icon={<>Aggiungi</>}>
          Tocca <strong>"Aggiungi"</strong> in alto a destra
        </Step>
        <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm">
          <Check className="size-4" /> DentAI apparirà sulla tua schermata home!
        </div>
      </div>
    </>
  );
}

function AndroidGuide() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Aggiungi DentAI al tuo Android</DialogTitle>
        <DialogDescription>Segui questi 3 passaggi su Chrome</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <Step n={1} icon={<><MoreVertical className="size-4" /> Menu Chrome</>}>
          Tocca i <strong>3 puntini</strong> in alto a destra nel browser Chrome
        </Step>
        <Step n={2} icon={<><Plus className="size-4" /> Aggiungi alla schermata Home</>}>
          Tocca <strong>"Aggiungi alla schermata Home"</strong>
        </Step>
        <Step n={3} icon={<>Aggiungi</>}>
          Tocca <strong>"Aggiungi"</strong> per confermare
        </Step>
        <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm">
          <Check className="size-4" /> DentAI apparirà sulla tua schermata home!
        </div>
      </div>
    </>
  );
}

function GenericGuide() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Aggiungi DentAI al tuo dispositivo</DialogTitle>
        <DialogDescription>
          Apri il menu del browser e cerca "Aggiungi alla schermata Home" o "Installa app".
        </DialogDescription>
      </DialogHeader>
    </>
  );
}
