import { useEffect, useState } from "react";
import { Bell, Search, Plus, CheckCheck, Sun, Moon, Command as CommandIcon, Menu, MessageSquare, LogOut, Settings, Sparkles, UserCircle2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { teams } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { QuickAddDialog } from "@/components/portal/QuickAddDialog";
import { CommandPalette } from "@/components/portal/CommandPalette";
import { FloatingChat } from "@/components/portal/FloatingChat";
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
  "/chat": { title: "Team Chat", subtitle: "Message teammates without leaving the portal." },
  "/notes": { title: "Notes", subtitle: "Your personal workspace for reminders, plans, and task notes." },
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
  "/recycle-bin": { title: "Recycle Bin", subtitle: "Restore or permanently remove deleted records." },
  "/admin": { title: "Admin Panel", subtitle: "System control, permissions and storage." },
  "/settings": { title: "Settings", subtitle: "Account, permissions, and preferences." },
};

export const Topbar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const meta = titles[pathname] ?? titles["/dashboard"];
  const { currentUser, signOut } = useAuth();
  const { notifications, unreadCount, markAllRead } = useData();
  const { theme, toggleTheme } = useTheme();
  const team = teams.find((item) => item.id === currentUser.team)?.name ?? currentUser.team;
  const [quickOpen, setQuickOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [floatingChatOpen, setFloatingChatOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
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
            <span className="flex-1">Search anything...</span>
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
            onClick={() => setFloatingChatOpen((open) => !open)}
            aria-label="Open chat"
            title="Open chat"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
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
                  onClick={(e) => {
                    e.preventDefault();
                    markAllRead();
                    toast.success("All notifications marked as read");
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 && (
                <div className="p-4 text-xs text-center text-muted-foreground">You're all caught up.</div>
              )}
              {notifications.slice(0, 8).map((item) => (
                <DropdownMenuItem key={item.id} className="flex items-start gap-2 py-2.5">
                  {!item.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />}
                  <div className="flex flex-col items-start gap-0.5 flex-1">
                    <span className="text-xs">
                      <span className="font-medium text-foreground">{item.user}</span>{" "}
                      <span className="text-muted-foreground">{item.action}</span>{" "}
                      <span className="font-medium text-foreground">{item.target}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.time}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted transition-smooth">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{currentUser.initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-0 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl">
              <DropdownMenuLabel className="border-b border-border/70 bg-muted/35 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-border/70 shadow-sm">
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">{currentUser.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{currentUser.name}</span>
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                    </div>
                    <p className="mt-1 text-xs font-normal text-muted-foreground">{currentUser.role} · {team}</p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                      Account center
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <div className="p-2">
                <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-xl px-3 py-3 focus:bg-muted/70">
                  <UserCircle2 className="mr-3 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Profile</span>
                    <span className="text-[11px] text-muted-foreground">Account details and picture</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-xl px-3 py-3 focus:bg-muted/70">
                  <Settings className="mr-3 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Preferences</span>
                    <span className="text-[11px] text-muted-foreground">Notifications, theme, and settings</span>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-border/70" />
              <div className="p-2">
                <DropdownMenuItem onClick={toggleTheme} className="rounded-xl px-3 py-3 focus:bg-muted/70">
                  {theme === "dark" ? <Sun className="mr-3 h-4 w-4 text-primary" /> : <Moon className="mr-3 h-4 w-4 text-primary" />}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                    <span className="text-[11px] text-muted-foreground">Switch the portal appearance</span>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator className="bg-border/70" />
              <div className="p-2">
                <DropdownMenuItem
                  onClick={() => { signOut(); navigate("/login"); }}
                  className="rounded-xl px-3 py-3 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Sign out</span>
                    <span className="text-[11px] text-muted-foreground">Leave this session safely</span>
                  </div>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <QuickAddDialog open={quickOpen} onOpenChange={setQuickOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onQuickAdd={() => setQuickOpen(true)} />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <FloatingChat open={floatingChatOpen} onOpenChange={setFloatingChatOpen} />
    </>
  );
};
