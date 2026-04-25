import { Check, ChevronsUpDown, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import { TeamIcon } from "@/components/portal/TeamIcon";

const workspaceLabel = (name: string, shortName: string, isCompanyWide?: boolean) =>
  isCompanyWide ? name : shortName || name.replace(/^TGO\s+/, "");

export const WorkspaceSwitcher = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const { activeWorkspace, accessibleWorkspaces, isAdmin, setActiveWorkspaceId } = useAuth();

  if (!activeWorkspace || isAdmin || accessibleWorkspaces.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between gap-2 border-border/70 bg-background/70",
            compact ? "h-9 w-full px-3 text-left" : "h-9 min-w-[220px] px-3",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {activeWorkspace.isCompanyWide ? (
              <Globe2 className="h-4 w-4 shrink-0 text-primary" />
            ) : (
              <TeamIcon team={activeWorkspace.teamIds[0] ?? "all"} className="text-primary" size={16} />
            )}
            <span className="truncate text-xs font-semibold">
              {workspaceLabel(activeWorkspace.name, activeWorkspace.shortName, activeWorkspace.isCompanyWide)}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(22rem,calc(100vw-1rem))]">
        <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {accessibleWorkspaces.map((workspace) => (
          <DropdownMenuItem key={workspace.id} className="items-start gap-3 py-2.5" onClick={() => setActiveWorkspaceId(workspace.id)}>
            {workspace.isCompanyWide ? (
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            ) : (
              <TeamIcon team={workspace.teamIds[0] ?? "all"} className="mt-0.5 text-primary" size={16} />
            )}
            <span className="flex-1">
              <span className="block text-sm font-medium">{workspaceLabel(workspace.name, workspace.shortName, workspace.isCompanyWide)}</span>
              <span className="block text-xs text-muted-foreground">{workspace.description}</span>
            </span>
            <Check className={cn("mt-0.5 h-4 w-4", activeWorkspace.id === workspace.id ? "opacity-100 text-primary" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
