import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight, FolderKanban, ListTodo, CheckCircle2, AlertTriangle, TrendingUp,
  Sparkles, CalendarClock, ShieldCheck, Flame, Activity as ActivityIcon, Users2,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar, Legend, RadialBarChart, RadialBar } from "recharts";
import { productivityTrend, teams, priorityColor } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";

const Stat = ({ icon: Icon, label, value, delta, tone }: { icon: any; label: string; value: string; delta: string; tone: string }) => (
  <Card className="relative overflow-hidden p-5 hover:shadow-elegant transition-smooth gradient-card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <ArrowUpRight className="h-3 w-3 text-success" />
          <span className="font-medium text-success">{delta}</span>
          <span className="text-muted-foreground">vs last week</span>
        </div>
      </div>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const { visibleTeams, currentUser, isAdmin } = useAuth();
  const { tasks, projects, notifications, approvals } = useData();
  const role = currentUser.role;
  const isExecutive = role === "Super Admin" || role === "Admin";
  const myTasks = tasks.filter(t => visibleTeams.includes(t.team));
  const myProjects = projects.filter(p => visibleTeams.includes(p.team));
  const teamWorkload = teams
    .filter((team) => visibleTeams.includes(team.id))
    .map((team) => ({
      team: team.name,
      active: myTasks.filter((task) => task.team === team.id && task.status !== "Completed").length,
      done: myTasks.filter((task) => task.team === team.id && task.status === "Completed").length,
    }));
  const upcoming = [...myTasks].filter(t => t.status !== "Completed").sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const activeProjects = myProjects.filter(p => p.status === "Active" || p.status === "At Risk").length;
  const pending = myTasks.filter(t => t.status !== "Completed").length;
  const completed = myTasks.filter(t => t.status === "Completed").length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = myTasks.filter(t => t.status !== "Completed" && t.due < todayIso).length;
  const myAssignedTasks = tasks.filter(t => t.assignee === currentUser.name && t.status !== "Completed");
  const myUrgent = myAssignedTasks.filter(t => t.priority === "Urgent" || t.priority === "Critical");
  const myDueToday = myAssignedTasks.filter(t => t.due === todayIso);
  const pendingApprovals = approvals.filter(
    (approval) =>
      visibleTeams.includes(approval.team) &&
      (approval.status === "Pending" || approval.status === "Under Review")
  );
  const teamUtil = Math.min(100, Math.round((pending / Math.max(1, pending + completed)) * 100));
  const healthSummary = [
    { name: "Healthy", value: myProjects.filter(p => p.status === "Active" || p.status === "Completed").length, fill: "hsl(var(--success))" },
    { name: "At Risk", value: myProjects.filter(p => p.status === "At Risk").length, fill: "hsl(var(--warning))" },
    { name: "Delayed", value: myProjects.filter(p => p.status === "Delayed").length, fill: "hsl(var(--destructive))" },
    { name: "Planning", value: myProjects.filter(p => p.status === "Planning" || p.status === "On Hold").length, fill: "hsl(var(--muted-foreground))" },
  ];
  const statusBreakdown = [
    { name: "Completed", value: myTasks.filter((t) => t.status === "Completed").length, color: "hsl(var(--success))" },
    { name: "In Progress", value: myTasks.filter((t) => t.status === "In Progress").length, color: "hsl(var(--info))" },
    { name: "Not Started", value: myTasks.filter((t) => t.status === "Not Started").length, color: "hsl(var(--muted-foreground))" },
    { name: "On Hold", value: myTasks.filter((t) => t.status === "On Hold").length, color: "hsl(var(--warning))" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${currentUser ? `, ${currentUser.name.split(" ")[0]}` : ""}`}
        description={isExecutive ? "Executive overview — projects, teams, approvals and AI insights." : "Your work, deadlines and team activity at a glance."}
        actions={
          <>
            <Badge variant="outline" className="hidden sm:inline-flex">{role}</Badge>
            <Button asChild size="sm" variant="outline"><Link to="/approvals">Approvals · {pendingApprovals.length}</Link></Button>
            <Button asChild size="sm"><Link to="/tasks">Open my work</Link></Button>
          </>
        }
      />

      {/* AI Insights strip */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI Insights</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {overdue > 0
                  ? `You have ${overdue} overdue item${overdue > 1 ? "s" : ""} across ${visibleTeams.length} team${visibleTeams.length > 1 ? "s" : ""}. `
                  : "No overdue items — great pace. "}
                {pendingApprovals.length > 0 && `${pendingApprovals.length} approvals awaiting review. `}
                Productivity trending <span className="font-medium text-success">+24%</span> this week.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost"><Link to="/reports">View report</Link></Button>
            <Button asChild size="sm" variant="outline"><Link to="/automations">Tune automations</Link></Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FolderKanban} label="Active Projects" value={String(activeProjects)} delta="+12%" tone="bg-primary/10 text-primary" />
        <Stat icon={ListTodo} label="Pending Tasks" value={String(pending)} delta="+4%" tone="bg-info/10 text-info" />
        <Stat icon={CheckCircle2} label={isAdmin ? "Completed (all)" : "My completed"} value={String(completed)} delta="+18%" tone="bg-success/10 text-success" />
        <Stat icon={AlertTriangle} label="Overdue Items" value={String(overdue)} delta="-22%" tone="bg-destructive/10 text-destructive" />
      </div>

      {/* My Work Today */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> My Work Today</h3>
              <p className="text-xs text-muted-foreground">Tasks, approvals and urgent items assigned to you</p>
            </div>
            <Badge variant="secondary">{myAssignedTasks.length} open</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><ListTodo className="h-3.5 w-3.5" /> My tasks</div>
              <p className="mt-2 text-2xl font-semibold">{myAssignedTasks.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5 text-destructive" /> Urgent</div>
              <p className="mt-2 text-2xl font-semibold">{myUrgent.length}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5 text-warning" /> Due today</div>
              <p className="mt-2 text-2xl font-semibold">{myDueToday.length}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {myAssignedTasks.slice(0, 4).map((t) => (
              <Link key={t.id} to="/tasks" className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted/40 transition-smooth">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.status} · Due {t.due}</p>
                </div>
                <Badge className={cn("text-[10px]", priorityColor[t.priority])} variant="outline">{t.priority}</Badge>
              </Link>
            ))}
            {myAssignedTasks.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">You're all caught up. 🎉</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-1"><ShieldCheck className="h-4 w-4 text-primary" /> Pending Approvals</h3>
          <p className="text-xs text-muted-foreground mb-4">Awaiting your review</p>
          <div className="space-y-2">
            {pendingApprovals.slice(0, 4).map((a) => (
              <Link key={a.id} to="/approvals" className="block rounded-md border border-border p-3 hover:bg-muted/40 transition-smooth">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">{a.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{a.requester} · {a.submitted}</p>
              </Link>
            ))}
            {pendingApprovals.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No pending approvals.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Productivity trend</h3>
              <p className="text-xs text-muted-foreground">Tasks created vs. completed over 6 weeks</p>
            </div>
            <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" />+24%</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={productivityTrend}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="completed" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="created" stroke="hsl(var(--accent))" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold">Task status</h3>
          <p className="text-xs text-muted-foreground mb-2">Live breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {statusBreakdown.map((s) => <Cell key={s.name} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statusBreakdown.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Team workload</h3>
            <Badge variant="outline" className="text-[10px]">5 departments</Badge>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={teamWorkload}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="active" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="done" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><ActivityIcon className="h-4 w-4 text-primary" /> Recent activity</h3>
          <div className="space-y-4">
            {notifications.slice(0, 6).map((a) => (
              <Link to="/tasks" key={a.id} className="flex items-start gap-3 rounded-lg p-1 -m-1 hover:bg-muted/40 transition-smooth">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {a.user.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-xs leading-relaxed">
                  <span className="font-medium text-foreground">{a.user}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium text-foreground">{a.target}</span>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{a.time}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Project health summary + Team utilization */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Project health summary</h3>
          <p className="text-xs text-muted-foreground mb-2">Portfolio at a glance</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart innerRadius="40%" outerRadius="100%" data={healthSummary} startAngle={90} endAngle={-270}>
              <RadialBar background dataKey="value" cornerRadius={6} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {healthSummary.map((h) => (
              <div key={h.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: h.fill }} />
                  <span className="text-muted-foreground">{h.name}</span>
                </div>
                <span className="font-medium">{h.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-1"><Users2 className="h-4 w-4 text-primary" /> Team utilization</h3>
          <p className="text-xs text-muted-foreground mb-4">Active load per department</p>
          <div className="space-y-3">
            {teamWorkload.slice(0, 6).map((t) => {
              const total = t.active + t.done || 1;
              const pct = Math.round((t.active / total) * 100);
              return (
                <div key={t.team}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{t.team}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1">Weekly completion</h3>
          <p className="text-xs text-muted-foreground mb-2">Last 6 weeks</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg / week</span>
            <span className="font-semibold text-success">35 tasks</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upcoming deadlines</h3>
            <Badge variant="secondary">{upcoming.length}</Badge>
          </div>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <Link to="/tasks" key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/40 transition-smooth">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.assignee} · Due {t.due}</p>
                </div>
                <Badge className={cn("text-[10px]", priorityColor[t.priority])} variant="outline">{t.priority}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Project health</h3>
          <div className="space-y-4">
            {myProjects.slice(0, 5).map((p) => {
              const team = teams.find(t => t.id === p.team)!;
              return (
                <Link to="/projects" key={p.id} className="block rounded-md p-1 -m-1 hover:bg-muted/40 transition-smooth">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <TeamIcon team={team.id} size={14} />
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-2" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
