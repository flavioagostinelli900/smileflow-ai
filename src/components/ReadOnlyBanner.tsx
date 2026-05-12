import { Shield } from "lucide-react";

export function ReadOnlyBanner({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-accent bg-accent px-4 py-3 ${className}`}>
      <div className="size-8 rounded-md bg-background/70 flex items-center justify-center shrink-0">
        <Shield className="size-4 text-primary" />
      </div>
      <div className="text-sm text-accent-foreground leading-snug">
        Queste impostazioni sono gestite dal team DentAI per garantire le massime performance del tuo sistema.
      </div>
    </div>
  );
}
