import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: Props) => (
  <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border bg-muted/20", className)}>
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="text-sm font-medium text-foreground">{title}</h3>
    {description && <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);