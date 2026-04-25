import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, Calendar as CalendarIcon, MessageSquare, LayoutGrid, Rows3, ListChecks,
  AlertTriangle, CheckCircle2, Clock, Flame, Filter, X, MoreHorizontal, Paperclip, Send, Trash2,
  ShieldCheck, ShieldAlert, ShieldX, RotateCcw, Lock,
} from "lucide-react";
import { teams, priorityColor, statusColor, type TaskStatus, type Task, type Priority, type TeamId, type TaskApprovalStatus } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { QuickAddDialog } from "@/components/portal/QuickAddDialog";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { ReactionBar } from "@/components/portal/ReactionBar";
import { insertMentionAtCursor, MENTION_QUERY_REGEX, renderMentionText } from "@/lib/social";

const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Waiting Review", "On Hold", "Blocked", "Completed"];
const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent", "Critical"];

const statusDot: Record<TaskStatus, string> = {
  "Not Started": "bg-muted-foreground/50",
  "In Progress": "bg-info",
  "Waiting Review": "bg-primary",
  "On Hold": "bg-warning",
  "Blocked": "bg-destructive",
  "Completed": "bg-success",
  "Cancelled": "bg-muted-foreground/30",
};

const approvalTone: Record<TaskApprovalStatus, string> = {
  "Pending Approval": "bg-warning/10 text-warning border border-warning/20",
  "Approved": "bg-success/10 text-success border border-success/20",
  "Rejected": "bg-destructive/10 text-destructive border border-destructive/20",
  "Returned for Revision": "bg-info/10 text-info border border-info/20",
};

const isOverdue = (t: Task) => t.status !== "Completed" && new Date(t.due) < new Date();
const dueLabel = (d: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff}d`;
  return d.slice(5);
};

const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2);
const canMoveTaskToStatus = (task: Task, status: TaskStatus, options: { canEditTask: boolean; canMarkCompleted: boolean }) => {
  if (!options.canEditTask) return false;
  if (status === "Completed") return options.canMarkCompleted;
  return true;
};
const Tasks = () => {
  const { visibleTeams, currentUser, can, userList } = useAuth();
  const { tasks, taskComments, updateTask, removeTask, addTask, decideTaskApproval, addTaskApprovalComment, addTaskComment, toggleTaskCommentReaction } = useData();
  const { isManager } = useAuth();
  const teamsVisible = teams.filter((t) => visibleTeams.includes(t.id));
  const canDeleteTask = can("task.delete");

  const [q, setQ] = useState("");
  const [activeTeams, setActiveTeams] = useState<string[]>([]);
  const [activePriorities, setActivePriorities] = useState<Priority[]>([]);
  const [scope, setScope] = useState<"all" | "mine" | "overdue">("all");
  const [view, setView] = useState<"kanban" | "table" | "cards">("kanban");
  const [open, setOpen] = useState<Task | null>(null);
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [comment, setComment] = useState("");
  const commentMentionQuery = comment.match(MENTION_QUERY_REGEX)?.[1]?.trim().toLowerCase() ?? "";
  const mentionSuggestions = commentMentionQuery
    ? userList.filter((user) => user.id !== currentUser.id && user.name.toLowerCase().includes(commentMentionQuery)).slice(0, 5)
    : [];

  const visible = useMemo(() => tasks.filter((t) => visibleTeams.includes(t.team)), [tasks, visibleTeams]);
  const commentCountByTask = useMemo(
    () =>
      taskComments.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.taskId] = (acc[entry.taskId] ?? 0) + 1;
        return acc;
      }, {}),
    [taskComments]
  );
  const openComments = useMemo(
    () => (open ? taskComments.filter((entry) => entry.taskId === open.id) : []),
    [open, taskComments]
  );

  const filtered = useMemo(() => visible.filter((t) =>
    (q === "" || t.title.toLowerCase().includes(q.toLowerCase()) || t.assignee.toLowerCase().includes(q.toLowerCase()))
    && (activeTeams.length === 0 || activeTeams.includes(t.team))
    && (activePriorities.length === 0 || activePriorities.includes(t.priority))
    && (scope !== "mine" || t.assignee === currentUser.name)
    && (scope !== "overdue" || isOverdue(t))
  ), [visible, q, activeTeams, activePriorities, scope, currentUser.name]);

  const stats = useMemo(() => ({
    total: visible.length,
    inProgress: visible.filter((t) => t.status === "In Progress").length,
    overdue: visible.filter(isOverdue).length,
    completed: visible.filter((t) => t.status === "Completed").length,
    urgent: visible.filter((t) => t.priority === "Urgent" && t.status !== "Completed").length,
    dueToday: visible.filter((t) => dueLabel(t.due) === "Today").length,
  }), [visible]);

  const toggleTeam = (id: string) => setActiveTeams((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const togglePriority = (p: Priority) => setActivePriorities((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const clearFilters = () => { setActiveTeams([]); setActivePriorities([]); setQ(""); setScope("all"); };
  const filterCount = activeTeams.length + activePriorities.length + (scope !== "all" ? 1 : 0) + (q ? 1 : 0);

  const addQuick = (status: TaskStatus) => {
    const title = (quickAdd[status] || "").trim();
    if (!title) return;
    if (status === "Completed" && !isManager) {
      toast.error("Only managers, admins, and super admins can mark tasks as completed.");
      return;
    }
    const teamId = (activeTeams[0] as TeamId) || teamsVisible[0]?.id;
    if (!teamId) {
      toast.error("No department is available for this task.");
      return;
    }
    const createdTask = addTask({
      title,
      assignedBy: currentUser.name,
      assignee: currentUser.name,
      team: teamId,
      priority: "Medium",
      status,
      due: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    });
    setQuickAdd((s) => ({ ...s, [status]: "" }));
    toast.success(createdTask ? "Task created" : "Task request sent for approval");
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent, col: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(col);
  };
  const onDrop = (col: TaskStatus) => {
    if (dragId) {
      const t = tasks.find((x) => x.id === dragId);
      if (t && t.status !== col) {
        const canEditTask = can("task.edit.any") || t.assignee === currentUser.name;
        if (!canMoveTaskToStatus(t, col, { canEditTask, canMarkCompleted: isManager })) {
          toast.error(col === "Completed" ? "Only managers, admins, and super admins can mark tasks as completed." : "You cannot change this task status.");
        } else {
          updateTask(dragId, { status: col });
        }
      }
    }
    setDragId(null);
    setDragOverCol(null);
  };

  const submitComment = () => {
    if (!comment.trim() || !open) return;
    addTaskComment(open.id, comment);
    toast.success("Comment posted");
    setComment("");
  };

  const insertMention = (userName: string) => {
    setComment((current) => insertMentionAtCursor(current, userName));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Plan, prioritise, and track work across boards, lists, and timelines. Staff task requests stay in Approvals until a manager, admin, or super admin approves them."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary w-full gap-1.5 text-primary-foreground sm:w-auto">
            <Plus className="h-4 w-4" /> New task
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="All tasks" value={stats.total} icon={ListChecks} tone="text-foreground" />
        <StatTile label="In progress" value={stats.inProgress} icon={Clock} tone="text-info" />
        <StatTile label="Due today" value={stats.dueToday} icon={CalendarIcon} tone="text-primary" />
        <StatTile label="Urgent" value={stats.urgent} icon={Flame} tone="text-destructive" />
        <StatTile label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="text-warning" />
        <StatTile label="Completed" value={stats.completed} icon={CheckCircle2} tone="text-success" />
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks or people…" className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="flex w-full items-center gap-1 rounded-lg bg-muted/50 p-1 sm:w-auto">
          {([
            { k: "all", label: "All" },
            { k: "mine", label: "Assigned to me" },
            { k: "overdue", label: "Overdue" },
          ] as const).map((s) => (
            <button
              key={s.k}
              onClick={() => setScope(s.k)}
              className={cn("h-7 flex-1 rounded-md px-3 text-xs font-medium transition-smooth sm:flex-none",
                scope === s.k ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {([
            { k: "kanban", icon: LayoutGrid },
            { k: "table", icon: Rows3 },
            { k: "cards", icon: ListChecks },
          ] as const).map((v) => (
            <button
              key={v.k}
              onClick={() => setView(v.k)}
              className={cn("h-7 w-8 rounded-md flex items-center justify-center transition-smooth",
                view === v.k ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
              aria-label={v.k}
            >
              <v.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <Button onClick={() => setDialogOpen(true)} className="gradient-primary h-9 w-full gap-1.5 text-primary-foreground sm:w-auto"><Plus className="h-4 w-4" /> New task</Button>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium"><Filter className="h-3 w-3" /> Filters</span>
        {teamsVisible.map((t) => {
          const active = activeTeams.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggleTeam(t.id)}
              className={cn("h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth flex items-center gap-1.5",
                active ? "shadow-soft" : "border-border hover:bg-muted")}
              style={active ? { background: `hsl(${t.color} / 0.12)`, borderColor: `hsl(${t.color} / 0.4)`, color: `hsl(${t.color})` } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: `hsl(${t.color})` }} />
              {t.name}
            </button>
          );
        })}
        <Separator orientation="vertical" className="h-5 mx-1" />
        {PRIORITIES.map((p) => {
          const active = activePriorities.includes(p);
          return (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={cn("h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth",
                active ? cn(priorityColor[p], "shadow-soft") : "border-border text-muted-foreground hover:bg-muted")}
            >
              {p}
            </button>
          );
        })}
        {filterCount > 0 && (
          <button onClick={clearFilters} className="ml-auto h-7 px-2.5 rounded-full text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="h-3 w-3" /> Clear ({filterCount})
          </button>
        )}
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList className="hidden">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-0">
          <div className="grid auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto pb-2 md:auto-cols-auto md:grid-flow-row md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {STATUSES.map((col) => {
              const items = filtered.filter((t) => t.status === col);
              const isOver = dragOverCol === col;
              return (
                <div
                  key={col}
                  onDragOver={(e) => onDragOver(e, col)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => onDrop(col)}
                  className={cn(
                    "rounded-xl border flex flex-col min-h-[420px] transition-smooth",
                    isOver ? "bg-primary/5 border-primary/40" : "bg-muted/40 border-border/50"
                  )}
                >
                  <div className="flex items-center justify-between px-3 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", statusDot[col])} />
                      <span className="text-xs font-semibold uppercase tracking-wider">{col}</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{items.length}</Badge>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                  </div>

                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={quickAdd[col] || ""}
                        onChange={(e) => setQuickAdd((s) => ({ ...s, [col]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addQuick(col)}
                        placeholder="Add task…"
                        className="w-full h-8 pl-7 pr-2 text-xs rounded-md bg-background/60 border border-transparent hover:border-border focus:border-primary/40 focus:bg-background outline-none transition-smooth"
                      />
                    </div>
                  </div>

                  <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto">
                    {items.map((t) => {
                      const team = teams.find((x) => x.id === t.team)!;
                      const overdue = isOverdue(t);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, t.id)}
                          onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                          onClick={() => setOpen(t)}
                          className={cn(
                            "group cursor-pointer w-full text-left bg-background rounded-lg border border-border/60 p-3 hover:shadow-elegant hover:border-border transition-smooth active:cursor-grabbing",
                            dragId === t.id && "opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            <TeamIcon team={team.id} size={12} />
                            <span className="text-[10px] font-medium text-muted-foreground truncate">{team.name}</span>
                            <Badge variant="outline" className={cn("ml-auto text-[9px] h-4 px-1.5", priorityColor[t.priority])}>{t.priority}</Badge>
                          </div>
                          <p className="text-xs font-medium leading-snug mb-3 text-foreground line-clamp-2">{t.title}</p>
                          {t.approvalStatus && (
                            <div className="mb-2">
                              <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 gap-1", approvalTone[t.approvalStatus])}>
                                <ShieldCheck className="h-2.5 w-2.5" />
                                {t.approvalStatus}
                              </Badge>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <Avatar className="h-6 w-6 ring-2 ring-background"><AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">{initials(t.assignee)}</AvatarFallback></Avatar>
                            <div className={cn("flex items-center gap-1 text-[10px]", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                              <CalendarIcon className="h-3 w-3" />
                              {dueLabel(t.due)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="text-center py-8 text-[11px] text-muted-foreground/60">Drop tasks here</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-0">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium">Task</th>
                    <th className="text-left p-3 font-medium">Assignee</th>
                    <th className="text-left p-3 font-medium">Team</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const team = teams.find((x) => x.id === t.team)!;
                    const overdue = isOverdue(t);
                    return (
                      <tr key={t.id} onClick={() => setOpen(t)} className="border-t border-border hover:bg-muted/30 transition-smooth cursor-pointer">
                        <td className="p-3 font-medium">{t.title}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(t.assignee)}</AvatarFallback></Avatar>
                            <span className="text-xs">{t.assignee}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TeamIcon team={team.id} size={13} />
                            {team.name}
                          </span>
                        </td>
                        <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", priorityColor[t.priority])}>{t.priority}</Badge></td>
                        <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", statusColor[t.status])}>{t.status}</Badge></td>
                        <td className={cn("p-3 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>{dueLabel(t.due)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="mt-0">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => {
              const team = teams.find((x) => x.id === t.team)!;
              const overdue = isOverdue(t);
              return (
                <Card key={t.id} onClick={() => setOpen(t)} className="p-4 hover:shadow-elegant transition-smooth cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <TeamIcon team={team.id} size={12} />
                      {team.name}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", priorityColor[t.priority])}>{t.priority}</Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1 leading-snug">{t.title}</h4>
                  {t.project && <p className="text-xs text-muted-foreground mb-3">{t.project}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(t.assignee)}</AvatarFallback></Avatar>
                      <span className="text-xs text-muted-foreground">{t.assignee}</span>
                    </div>
                    <div className={cn("flex items-center gap-3 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{dueLabel(t.due)}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{commentCountByTask[t.id] ?? 0}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <QuickAddDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultTab="task" />

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {open && (() => {
            const team = teams.find((x) => x.id === open.team)!;
            const overdue = isOverdue(open);
            const canEditTask = can("task.edit.any") || open.assignee === currentUser.name;
            const canMarkCompleted = isManager;
            return (
              <div className="space-y-5">
                <SheetHeader className="text-left space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: `hsl(${team.color} / 0.4)`, color: `hsl(${team.color})`, background: `hsl(${team.color} / 0.08)` }}>{team.name}</Badge>
                    <Badge variant="outline" className={cn("text-[10px]", priorityColor[open.priority])}>{open.priority}</Badge>
                    <Badge variant="outline" className={cn("text-[10px]", statusColor[open.status])}>{open.status}</Badge>
                    {open.approvalStatus && (
                      <Badge variant="outline" className={cn("text-[10px] gap-1", approvalTone[open.approvalStatus])}>
                        <ShieldCheck className="h-3 w-3" />
                        {open.approvalStatus}
                      </Badge>
                    )}
                    {open.requiresApproval && !open.approvalStatus && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5">
                        <ShieldCheck className="h-3 w-3" />
                        Approval required
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-lg leading-tight">{open.title}</SheetTitle>
                  {open.project && <SheetDescription>Part of <span className="font-medium text-foreground">{open.project}</span></SheetDescription>}
                </SheetHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Assigned by">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(open.assignedBy ?? "NA")}</AvatarFallback></Avatar>
                      <span className="text-xs">{open.assignedBy ?? "Not specified"}</span>
                    </div>
                  </DetailRow>
                  <DetailRow label="Assignee">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(open.assignee)}</AvatarFallback></Avatar>
                      <span className="text-xs">{open.assignee}</span>
                    </div>
                  </DetailRow>
                  <DetailRow label="Due">
                    <span className={cn("text-xs flex items-center gap-1.5", overdue ? "text-destructive font-medium" : "")}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {open.due} · {dueLabel(open.due)}
                    </span>
                  </DetailRow>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Move to status</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        disabled={!canMoveTaskToStatus(open, s, { canEditTask, canMarkCompleted })}
                        onClick={() => {
                          if (!canMoveTaskToStatus(open, s, { canEditTask, canMarkCompleted })) return;
                          updateTask(open.id, { status: s });
                          setOpen({ ...open, status: s });
                        }}
                        className={cn("h-9 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-smooth",
                          open.status === s ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-border hover:bg-muted/50",
                          !canMoveTaskToStatus(open, s, { canEditTask, canMarkCompleted }) && "opacity-50 cursor-not-allowed")}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[s])} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Priority</p>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        disabled={!canEditTask}
                        onClick={() => { updateTask(open.id, { priority: p }); setOpen({ ...open, priority: p }); }}
                        className={cn("h-8 min-w-[88px] rounded-md border px-3 text-[11px] font-medium transition-smooth",
                          open.priority === p ? cn(priorityColor[p], "shadow-soft") : "border-border text-muted-foreground hover:bg-muted",
                          !canEditTask && "opacity-50 cursor-not-allowed")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {open.requiresApproval && (
                  <ApprovalPanel
                    task={open}
                    canDecide={isManager}
                    onDecide={(decision, c) => {
                      decideTaskApproval(open.id, decision, c);
                      const nextStatus =
                        decision === "Approved" ? "Completed" : decision === "Rejected" ? "Cancelled" : "In Progress";
                      setOpen({
                        ...open,
                        status: nextStatus as TaskStatus,
                        approvalStatus: decision,
                      });
                      toast.success(`Task ${decision.toLowerCase()}`);
                    }}
                    onComment={(c) => {
                      addTaskApprovalComment(open.id, c);
                      toast.success("Comment added");
                    }}
                  />
                )}

                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Comments</p>
                    <span className="text-[11px] text-muted-foreground">{openComments.length}</span>
                  </div>
                  {openComments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet. Start the thread below.</p>
                  ) : (
                    <div className="space-y-3">
                      {openComments.map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-border bg-background/80 p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(entry.authorName)}</AvatarFallback></Avatar>
                            <div>
                              <p className="text-xs font-medium">{entry.authorName}</p>
                              <p className="text-[11px] text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-foreground">{renderMentionText(entry.body)}</p>
                          <ReactionBar
                            reactions={entry.reactions}
                            currentUserId={currentUser.id}
                            onToggle={(emoji) => toggleTaskCommentReaction(entry.id, emoji)}
                            resolveUserName={(userId) => userList.find((user) => user.id === userId)?.name ?? "Unknown user"}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[9px] bg-primary text-primary-foreground">{currentUser.initials}</AvatarFallback></Avatar>
                  <div className="relative flex-1">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitComment()}
                      placeholder="Write a comment… Use @Name to mention someone"
                      className="w-full h-9 pl-3 pr-16 text-xs rounded-lg bg-muted/40 border border-transparent focus:bg-background focus:border-border outline-none"
                    />
                    {mentionSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-11 z-10 rounded-lg border border-border bg-background shadow-elegant">
                        {mentionSuggestions.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => insertMention(user.name)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/40"
                          >
                            <span className="font-medium text-foreground">{user.name}</span>
                            <span className="text-muted-foreground">{user.teams.length === 0 ? "Company-level access" : teams.find((team) => team.id === user.team)?.name ?? user.team}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <button className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"><Paperclip className="h-3.5 w-3.5" /></button>
                      <button onClick={submitComment} className="h-7 w-7 rounded-md text-primary hover:bg-primary/10 flex items-center justify-center"><Send className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t border-border">
                  {canDeleteTask ? (
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                      const confirmed = window.confirm(`Delete "${open.title}"? This cannot be undone.`);
                      if (!confirmed) return;
                      removeTask(open.id);
                      toast.success("Task deleted");
                      setOpen(null);
                    }}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                  ) : <div />}
                  <Button size="sm" variant="outline" onClick={() => setOpen(null)}>Close</Button>
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const StatTile = ({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) => (
  <Card className="p-4 hover:shadow-elegant transition-smooth">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <Icon className={cn("h-4 w-4", tone)} />
    </div>
    <p className="text-2xl font-semibold tracking-tight">{value}</p>
  </Card>
);

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{label}</p>
    {children}
  </div>
);

const ApprovalPanel = ({
  task,
  canDecide,
  onDecide,
  onComment,
}: {
  task: Task;
  canDecide: boolean;
  onDecide: (decision: "Approved" | "Rejected" | "Returned for Revision", comment?: string) => void;
  onComment: (comment: string) => void;
}) => {
  const [comment, setComment] = useState("");
  const status = task.approvalStatus;
  const history = task.approvalHistory ?? [];
  const showActions = canDecide && status === "Pending Approval";

  const submit = (decision: "Approved" | "Rejected" | "Returned for Revision") => {
    onDecide(decision, comment.trim() || undefined);
    setComment("");
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">Approval workflow</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Task approvals can be reviewed by any manager, admin, or super admin.
            </p>
          </div>
        </div>
        {status && (
          <Badge variant="outline" className={cn("text-[10px] shrink-0", approvalTone[status])}>{status}</Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {history.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">History</p>
            <ol className="relative border-l border-border ml-2 space-y-2.5">
              {history.map((h) => (
                <li key={h.id} className="ml-3 text-xs">
                  <span className={cn(
                    "absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background",
                    h.action === "Approved" && "bg-success",
                    h.action === "Rejected" && "bg-destructive",
                    h.action === "Returned for Revision" && "bg-info",
                    h.action === "Submitted" && "bg-primary",
                    h.action === "Comment" && "bg-muted-foreground/40",
                  )} />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-medium text-foreground">{h.actor}</span>
                    <span className="text-muted-foreground">{h.action.toLowerCase()}</span>
                    <span className="text-muted-foreground/60 ml-auto">{h.at}</span>
                  </div>
                  {h.comment && <p className="text-muted-foreground mt-0.5">"{h.comment}"</p>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {showActions ? (
          <div className="space-y-2">
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment for the requester (optional)…"
              className="text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 flex-1 min-w-[110px]" onClick={() => submit("Approved")}>
                <ShieldCheck className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 min-w-[110px]" onClick={() => submit("Returned for Revision")}>
                <RotateCcw className="h-3.5 w-3.5" /> Return
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive min-w-[110px]" onClick={() => submit("Rejected")}>
                <ShieldX className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          </div>
        ) : status === "Pending Approval" ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Awaiting approval from any manager, admin, or super admin.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-primary" />
            This task requires approval before it can be finalized.
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
