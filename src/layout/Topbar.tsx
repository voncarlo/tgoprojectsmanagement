import { useEffect, useState } from "react";
import { Bell, Search, Plus, CheckCheck, Sun, Moon, Command as CommandIcon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { users as allUsers, teams } from "@/data/mock";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { QuickAddDialog } from "@/components/portal/QuickAddDialog";
import { CommandPalette } from "@/components/portal/CommandPalette";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "sonner";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import { MobileSidebar } from "./Sidebar";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "A snapshot of work happening across TGO." },
  "/tasks": { title: "Tasks", subtitle: "Plan, assign, and track day-to-day work." },
  "/projects": { title: "Projects", subtitle: "Strategic initiatives across departments." },
  "/calendar": { title: "Calendar", subtitle: "Deadlines, meetings, milestones and team schedules." },
  "/workload": { title: "Workload", subtitle: "Capacity, utilisation, and resource allocation." },
  "/reports": { title: "Reports", subtitle: "Performance and productivity insights." },
  "/documents": { title: "Documents", subtitle: "Files, SOPs, contracts and templates." },
  "/notifications": { title: "Notifications", subtitle: "Mentions, assignments and approval requests." },
  "/activity": { title: "Activity Logs", subtitle: "Audit trail across users, files and projects." },
  "/approvals": { title: "Approvals", subtitle: "Multi-step approval workflows." },
  "/automations": { title: "Automations", subtitle: "Trigger-based workflows and scheduled rules." },
  "/dispatch": { title: "Dispatch Operations", subtitle: "DVIC, route sheets, load board and DA performance." },
  "/recruitment": { title: "Recruitment", subtitle: "Pipeline, interviews, and hiring stages." },
  "/sales": { title: "Sales", subtitle: "Leads, opportunities, proposals and analytics." },
  "/payroll": { title: "Payroll", subtitle: "Processing, timesheets and approvals." },
  "/bookkeeping": { title: "Bookkeeping", subtitle: "Invoices, budgets and monthly closing." },
  "/clients": { title: "Clients", subtitle: "Accounts, relationships and onboarding." },
  "/teams": { title: "Teams", subtitle: "Departments, leads, and live workload." },
  "/users": { title: "User Management", subtitle: "Accounts, roles and access control." },
  "/admin": { title: "Admin Panel", subtitle: "System control, permissions and storage." },
  "/settings": { title: "Settings", subtitle: "Account, permissions, and preferences." },
};

export const Topbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = titles[pathname] ?? titles["/dashboard"];
  const { currentUser, setCurrentUser, userList } = useAuth();
  const { notifications, unreadCount, markAllRead } = useData();
  const { theme, toggleTheme } = useTheme();
  const team = teams.find((t) => t.id === currentUser.team)?.name ?? currentUser.team;
  const [quickOpen, setQuickOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global keyboard shortcuts: ⌘K / Ctrl+K opens palette, "n" opens quick-add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden -ml-2"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{meta.title}</h1>
        <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
      </div>
      <RoleBadge role={currentUser.role} className="hidden md:inline-flex" />

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden md:flex items-center gap-2 h-9 w-[280px] pl-3 pr-2 rounded-lg bg-muted/50 hover:bg-muted text-left text-sm text-muted-foreground border border-transparent hover:border-border transition-smooth"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1">Search anything…</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            <CommandIcon className="h-3 w-3" />K
          </kbd>
        </button>

        <Button size="sm" onClick={() => setQuickOpen(true)} className="gap-1.5 gradient-primary text-primary-foreground shadow-soft hover:opacity-95">
          <Plus className="h-4 w-4" /> Quick add
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <button
                onClick={(e) => { e.preventDefault(); markAllRead(); toast.success("All notifications marked as read"); }}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 && (
              <div className="p-4 text-xs text-center text-muted-foreground">You're all caught up.</div>
            )}
            {notifications.slice(0, 8).map((a) => (
              <DropdownMenuItem key={a.id} className="flex items-start gap-2 py-2.5">
                {!a.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                <div className="flex flex-col items-start gap-0.5 flex-1">
                  <span className="text-xs"><span className="font-medium text-foreground">{a.user}</span> <span className="text-muted-foreground">{a.action}</span> <span className="font-medium text-foreground">{a.target}</span></span>
                  <span className="text-[10px] text-muted-foreground">{a.time}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-smooth">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{currentUser.initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium">{currentUser.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{currentUser.role} · {team}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Switch demo user</DropdownMenuLabel>
            {(userList.length ? userList : allUsers).map((u) => (
              <DropdownMenuItem key={u.id} onClick={() => { setCurrentUser(u); toast.success(`Signed in as ${u.name}`); }} className="text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-semibold mr-2">{u.initials}</span>
                {u.name} <span className="ml-auto text-[10px] text-muted-foreground">{u.role}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")}>Preferences</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/login")}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <QuickAddDialog open={quickOpen} onOpenChange={setQuickOpen} />
    <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onQuickAdd={() => setQuickOpen(true)} />
    <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
};
