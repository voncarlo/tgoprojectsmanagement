import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileBarChart, Users as UsersIcon, AlertCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { productivityTrend, teams } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";
import { PageHeader } from "@/components/portal/PageHeader";

const RANGE_DAYS = { "7": 7, "30": 30, "90": 90 } as const;

const Reports = () => {
  const { visibleTeams, isAdmin, userList } = useAuth();
  const { tasks } = useData();
  const teamsVisible = teams.filter((t) => visibleTeams.includes(t.id));

  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [range, setRange] = useState<keyof typeof RANGE_DAYS>("30");

  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - RANGE_DAYS[range]);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const inScope = useMemo(
    () =>
      tasks.filter(
        (t) =>
          visibleTeams.includes(t.team) &&
          (teamFilter === "all" || t.team === teamFilter) &&
          t.due >= cutoff
      ),
    [tasks, visibleTeams, teamFilter, cutoff]
  );

  const teamPerf = useMemo(
    () =>
      teamsVisible
        .filter((t) => teamFilter === "all" || t.id === teamFilter)
        .map((t) => {
          const total = inScope.filter((x) => x.team === t.id).length;
          const done = inScope.filter((x) => x.team === t.id && x.status === "Completed").length;
          return { team: t.name, color: t.color, completion: total ? Math.round((done / total) * 100) : 0 };
        }),
    [teamsVisible, inScope, teamFilter]
  );

  const staffProd = useMemo(
    () =>
      userList
        .filter((u) => u.teams.some((tid) => visibleTeams.includes(tid)))
        .map((u) => ({
          name: u.name.split(" ")[0],
          done: inScope.filter((t) => t.assignee === u.name && t.status === "Completed").length,
          active: inScope.filter((t) => t.assignee === u.name && t.status !== "Completed").length,
        })),
    [userList, inScope, visibleTeams]
  );

  const topStats = useMemo(() => {
    const total = inScope.length || 1;
    const done = inScope.filter((t) => t.status === "Completed").length;
    const overdue = inScope.filter((t) => t.status !== "Completed" && new Date(t.due) < new Date()).length;
    const topTeam = teamPerf.slice().sort((a, b) => b.completion - a.completion)[0];
    return {
      avg: Math.round((done / total) * 100),
      top: topTeam?.team ?? "—",
      overdue,
    };
  }, [inScope, teamPerf]);

  const exportCsv = () => {
    if (!inScope.length) return toast.error("No tasks in current filter");
    const header = ["id", "title", "assignee", "team", "priority", "status", "due"];
    const rows = inScope.map((t) => header.map((k) => `"${String((t as any)[k] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tgo-tasks-${range}d-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${inScope.length} tasks`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analyse productivity, workload distribution, and team performance."
        actions={
          <Button onClick={exportCsv} className="gap-1.5" variant="outline">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAdmin ? "All teams" : "My teams"}</SelectItem>
            {teamsVisible.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={range} onValueChange={(v) => setRange(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last quarter</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px]">{inScope.length} tasks in scope</Badge>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: FileBarChart, label: "Avg completion rate", value: `${topStats.avg}%`, tone: "text-success" },
          { icon: UsersIcon, label: "Top team", value: topStats.top, tone: "text-info" },
          { icon: AlertCircle, label: "Overdue items", value: String(topStats.overdue), tone: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="p-5 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted"><s.icon className={`h-5 w-5 ${s.tone}`} /></div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Team performance</h3>
          <p className="text-xs text-muted-foreground mb-4">Completion rate by department</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={teamPerf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis type="category" dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="completion" radius={[0, 6, 6, 0]}>
                {teamPerf.map((p, i) => <Cell key={i} fill={`hsl(${p.color})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1">Staff productivity</h3>
          <p className="text-xs text-muted-foreground mb-4">Tasks completed per staff member</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={staffProd}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="done" name="Completed" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="active" name="Active" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Task velocity</h3>
              <p className="text-xs text-muted-foreground">Created vs completed across the company</p>
            </div>
            <Badge variant="secondary">6 weeks</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="created" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
