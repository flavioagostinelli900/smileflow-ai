import { Shield } from "lucide-react";

export function ReadOnlyBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 ${className}`}>
      <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Shield className="size-4 text-primary" />
      </div>
      <div className="text-sm text-foreground/80 leading-snug">
        Queste impostazioni sono gestite dal team DentAI per garantire le massime performance del tuo sistema.
      </div>
    </div>
  );
}
