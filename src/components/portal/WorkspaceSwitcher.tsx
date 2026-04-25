import { Check, ChevronsUpDown, Globe2, LockKeyhole } from "lucide-react";
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

export const WorkspaceSwitcher = ({ compact = false, className }: { compact?: boolean; className?: string }) => {
  const { activeWorkspace, accessibleWorkspaces, setActiveWorkspaceId } = useAuth();

  if (!activeWorkspace) return null;

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
            {activeWorkspace.isCompanyWide ? <Globe2 className="h-4 w-4 text-primary" /> : <LockKeyhole className="h-4 w-4 text-primary" />}
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">{activeWorkspace.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {activeWorkspace.isCompanyWide ? "Company-wide visibility" : activeWorkspace.shortName}
              </span>
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
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: `hsl(${workspace.color})` }}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">{workspace.name}</span>
              <span className="block text-xs text-muted-foreground">{workspace.description}</span>
            </span>
            <Check className={cn("mt-0.5 h-4 w-4", activeWorkspace.id === workspace.id ? "opacity-100 text-primary" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
