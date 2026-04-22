import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, actions, className }: PageHeaderProps) => (
  <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
    <div className="space-y-1 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 animate-fade-in">{actions}</div>}
  </div>
);
