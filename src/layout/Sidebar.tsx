import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, CheckSquare, FolderKanban, BarChart3, Users, Settings, LogOut, ShieldCheck,
  PanelLeftClose, PanelLeftOpen, CalendarDays, Activity, FileText, Bell, GitBranch, Workflow,
  ShieldAlert, BarChart4, ChevronDown, Trash2, MessageSquare, NotebookPen,
} from "lucide-react";
import { Logo } from "@/components/portal/Logo";
import { WorkspaceSwitcher } from "@/components/portal/WorkspaceSwitcher";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import type { ModuleKey } from "@/data/mock";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type Item = { to: string; icon: any; label: string; module: ModuleKey; adminOnly?: boolean };
type Section = { key: string; label: string; items: Item[] };

const dashboardItem: Item = { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", module: "dashboard" };

const sections: Section[] = [
  {
    key: "work",
    label: "Work Management",
    items: [
      { to: "/tasks", icon: CheckSquare, label: "Tasks", module: "tasks" },
      { to: "/projects", icon: FolderKanban, label: "Projects", module: "projects" },
      { to: "/calendar", icon: CalendarDays, label: "Calendar", module: "calendar" },
      { to: "/workload", icon: BarChart4, label: "Workload", module: "workload" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    items: [
      { to: "/reports", icon: BarChart3, label: "Reports", module: "reports" },
      { to: "/activity", icon: Activity, label: "Activity Logs", module: "activity" },
      { to: "/notifications", icon: Bell, label: "Notifications", module: "notifications" },
    ],
  },
  {
    key: "collaboration",
    label: "Collaboration",
    items: [
      { to: "/chat", icon: MessageSquare, label: "Chat", module: "chat" },
      { to: "/teams", icon: Users, label: "Teams", module: "teams" },
      { to: "/documents", icon: FileText, label: "Documents", module: "documents" },
      { to: "/approvals", icon: GitBranch, label: "Approvals", module: "approvals" },
    ],
  },
  {
    key: "personal",
    label: "Personal",
    items: [
      { to: "/notes", icon: NotebookPen, label: "Notes", module: "notes" },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { to: "/automations", icon: Workflow, label: "Automations", module: "automations" },
      { to: "/users", icon: ShieldCheck, label: "User Management", module: "users", adminOnly: true },
      { to: "/recycle-bin", icon: Trash2, label: "Recycle Bin", module: "recycle", adminOnly: true },
      { to: "/settings", icon: Settings, label: "Settings", module: "settings" },
      { to: "/admin", icon: ShieldAlert, label: "Admin Panel", module: "admin", adminOnly: true },
    ],
  },
];

const STORAGE_KEY = "tgo.sidebar.openSections";

type SidebarInnerProps = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onNavigate?: () => void;
  /** Hide the desktop collapse toggle (used inside mobile drawer) */
  hideCollapseToggle?: boolean;
};

const SidebarInner = ({ collapsed, setCollapsed, onNavigate, hideCollapseToggle }: SidebarInnerProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccess, can, isAdmin, signOut, activeWorkspace } = useAuth();
  const { unreadChatCount } = useData();

  const visibleSections = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) =>
            i.to === "/activity"
              ? can("audit.view")
              : (i.adminOnly ? isAdmin : canAccess(i.module))
          ),
        }))
        .filter((s) => s.items.length > 0),
    [isAdmin, canAccess, can]
  );

  const dashboardVisible = canAccess(dashboardItem.module);

  // Persisted open state — default: section containing active route is open
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const initial: Record<string, boolean> = {};
    sections.forEach((s) => {
      initial[s.key] = s.items.some((i) => location.pathname.startsWith(i.to));
    });
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openMap));
    } catch {}
  }, [openMap]);

  // Auto-open the section containing the active route
  useEffect(() => {
    const activeSection = sections.find((s) => s.items.some((i) => location.pathname.startsWith(i.to)));
    if (activeSection && !openMap[activeSection.key]) {
      setOpenMap((m) => ({ ...m, [activeSection.key]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  const renderItem = (item: Item, indented = false) => {
    const active = isActive(item.to);
    const link = (
      <NavLink
        key={item.to}
        to={item.to}
        title={collapsed ? item.label : undefined}
        onClick={() => onNavigate?.()}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg py-2 text-[13px] font-medium transition-smooth",
          collapsed ? "px-3 justify-center" : indented ? "pl-9 pr-3" : "px-3",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary animate-scale-in" />
        )}
        <item.icon className={cn("h-[17px] w-[17px] shrink-0", active && "text-sidebar-primary")} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {item.to === "/chat" && unreadChatCount > 0 && (
          <span className={cn(
            "inline-flex rounded-full bg-accent",
            collapsed ? "absolute right-2 top-2 h-2.5 w-2.5" : "ml-auto h-2.5 w-2.5"
          )} />
        )}
      </NavLink>
    );

    if (!collapsed) return link;
    return (
      <Tooltip key={item.to} delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "group/sidebar relative flex flex-col bg-sidebar border-r border-sidebar-border transition-[width] duration-300 ease-out",
          collapsed ? "w-[72px]" : "w-64",
          hideCollapseToggle && "w-full border-r-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border/60">
          <Logo collapsed={collapsed} />
        </div>

        {!collapsed && (
          <div className="border-b border-sidebar-border/60 px-3 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              Active Workspace
            </p>
            <WorkspaceSwitcher compact className="border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent" />
            {activeWorkspace && (
              <p className="mt-2 text-[11px] leading-relaxed text-sidebar-foreground/60">
                {activeWorkspace.isCompanyWide
                  ? `Viewing ${activeWorkspace.name} data and updates.`
                  : `Scoped to ${activeWorkspace.name}.`}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-3 pr-2 space-y-1.5">
          {/* Dashboard — always top-level */}
          {dashboardVisible && <div className="space-y-0.5">{renderItem(dashboardItem)}</div>}

          {visibleSections.map((section) => {
            const open = !!openMap[section.key];
            const sectionActive = section.items.some((i) => isActive(i.to));

            if (collapsed) {
              return (
                <div key={section.key} className="pt-2">
                  <div className="mx-3 mb-1 h-px bg-sidebar-border/40" />
                  <div className="space-y-0.5">{section.items.map((i) => renderItem(i))}</div>
                </div>
              );
            }

            return (
              <div key={section.key} className="pt-1">
                <button
                  type="button"
                  onClick={() => setOpenMap((m) => ({ ...m, [section.key]: !m[section.key] }))}
                  aria-expanded={open}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md px-3 py-1.5 transition-smooth",
                    "text-[10px] font-semibold uppercase tracking-[0.12em]",
                    sectionActive
                      ? "text-sidebar-foreground/70"
                      : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                  )}
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out",
                      open ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    open ? "grid-rows-[1fr] opacity-100 mt-0.5" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0.5 py-0.5">
                      {section.items.map((i) => renderItem(i, true))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border/60 p-3 space-y-1">
          {hideCollapseToggle ? null : collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 transition-smooth"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Hide sidebar"
              className="w-full flex items-center gap-3 rounded-full border border-sidebar-foreground/20 bg-sidebar px-4 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-smooth"
            >
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              <span>Hide Sidebar</span>
            </button>
          )}
          <button
            onClick={() => { signOut(); onNavigate?.(); toast.success("Signed out"); navigate("/login"); }}
            className={cn(
              "w-full flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-smooth",
              collapsed ? "px-0 justify-center" : "px-3"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
};

/** Desktop sidebar — hidden on mobile (<md). */
export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="hidden md:flex">
      <SidebarInner collapsed={collapsed} setCollapsed={setCollapsed} />
    </div>
  );
};

/** Mobile drawer — slide-in overlay sidebar, controlled by Topbar hamburger. */
export const MobileSidebar = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar border-sidebar-border md:hidden [&>button]:text-sidebar-foreground [&>button]:opacity-80"
      >
        <SidebarInner
          collapsed={false}
          setCollapsed={() => {}}
          onNavigate={() => onOpenChange(false)}
          hideCollapseToggle
        />
      </SheetContent>
    </Sheet>
  );
};
