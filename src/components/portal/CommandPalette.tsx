import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, CheckSquare, FolderKanban, CalendarDays, BarChart4, BarChart3,
  FileText, Bell, Activity, GitBranch, Workflow, Users, ShieldCheck, ShieldAlert, Settings, Plus, Search, MessageSquare, NotebookPen,
} from "lucide-react";
import { useData } from "@/store/DataContext";
import { useAuth } from "@/auth/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onQuickAdd: () => void;
}

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, group: "Workspace" },
  { label: "Tasks", path: "/tasks", icon: CheckSquare, group: "Workspace" },
  { label: "Projects", path: "/projects", icon: FolderKanban, group: "Workspace" },
  { label: "Calendar", path: "/calendar", icon: CalendarDays, group: "Workspace" },
  { label: "Workload", path: "/workload", icon: BarChart4, group: "Workspace" },
  { label: "Reports", path: "/reports", icon: BarChart3, group: "Workspace" },
  { label: "Documents", path: "/documents", icon: FileText, group: "Collaboration" },
  { label: "Chat", path: "/chat", icon: MessageSquare, group: "Collaboration" },
  { label: "Notes", path: "/notes", icon: NotebookPen, group: "Personal" },
  { label: "Notifications", path: "/notifications", icon: Bell, group: "Workspace" },
  { label: "Activity Logs", path: "/activity", icon: Activity, group: "Workspace" },
  { label: "Approvals", path: "/approvals", icon: GitBranch, group: "Workspace" },
  { label: "Automations", path: "/automations", icon: Workflow, group: "Admin" },
  { label: "Teams", path: "/teams", icon: Users, group: "Admin" },
  { label: "User Management", path: "/users", icon: ShieldCheck, group: "Admin" },
  { label: "Admin Panel", path: "/admin", icon: ShieldAlert, group: "Admin" },
  { label: "Settings", path: "/settings", icon: Settings, group: "Admin" },
];

export const CommandPalette = ({ open, onOpenChange, onQuickAdd }: Props) => {
  const navigate = useNavigate();
  const { tasks, projects } = useData();
  const { canAccess, can, isAdmin } = useAuth();
  const [_, setTick] = useState(0);

  // Force command list to refresh when opening
  useEffect(() => { if (open) setTick((x) => x + 1); }, [open]);

  const allowed = useMemo(() =>
    navItems.filter((i) =>
      i.path === "/activity"
        ? can("audit.view")
        : i.path === "/users" || i.path === "/admin"
          ? isAdmin
          : canAccess(i.path.slice(1) as any)
    ),
  [canAccess, can, isAdmin]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof navItems> = {};
    allowed.forEach((i) => { (g[i.group] ||= []).push(i); });
    return g;
  }, [allowed]);

  const go = (path: string) => { navigate(path); onOpenChange(false); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, tasks, projects…  (⌘K)" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => { onOpenChange(false); onQuickAdd(); }}>
            <Plus className="h-4 w-4" /> Create new task or project
          </CommandItem>
          <CommandItem onSelect={() => go("/tasks")}>
            <Search className="h-4 w-4" /> Search all tasks
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />

        {Object.entries(grouped).map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((i) => (
              <CommandItem key={i.path} onSelect={() => go(i.path)}>
                <i.icon className="h-4 w-4" /> {i.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.slice(0, 6).map((t) => (
                <CommandItem key={t.id} onSelect={() => go("/tasks")}>
                  <CheckSquare className="h-4 w-4" /> {t.title}
                  <span className="ml-auto text-[10px] text-muted-foreground">{t.assignee}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.slice(0, 5).map((p) => (
              <CommandItem key={p.id} onSelect={() => go("/projects")}>
                <FolderKanban className="h-4 w-4" /> {p.name}
                <span className="ml-auto text-[10px] text-muted-foreground">{p.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};
