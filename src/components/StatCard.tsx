import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "info";
}) {
  const tones = {
    default: "bg-muted text-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info",
  };
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="p-5 shadow-soft hover:shadow-elevated transition-shadow border-border/60">
      <div className="flex items-start justify-between">
        <div className={cn("size-10 rounded-lg flex items-center justify-center", tones[tone])}>
          <Icon className="size-5" />
        </div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "text-xs font-medium flex items-center gap-0.5 px-2 py-0.5 rounded-full",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </Card>
  );
}
