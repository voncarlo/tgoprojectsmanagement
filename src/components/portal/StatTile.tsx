import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
}

export const StatTile = ({ label, value, icon: Icon, tone = "text-foreground", delta, trend }: Props) => (
  <Card className="p-4 hover:border-border/80 transition-smooth">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <Icon className={cn("h-4 w-4", tone)} />
    </div>
    <p className={cn("mt-2 text-2xl font-semibold tracking-tight", tone)}>{value}</p>
    {delta && (
      <p className={cn(
        "mt-1 text-[11px] font-medium",
        trend === "up" && "text-success",
        trend === "down" && "text-destructive",
        (!trend || trend === "flat") && "text-muted-foreground",
      )}>{delta}</p>
    )}
  </Card>
);