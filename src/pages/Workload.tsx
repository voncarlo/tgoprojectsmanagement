import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { tasks as allTasks, users as allUsers, teams } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { useAuth } from "@/auth/AuthContext";
import { Users, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const Workload = () => {
  const { visibleTeams } = useAuth();
  const visibleTasks = useMemo(() => allTasks.filter((t) => visibleTeams.includes(t.team)), [visibleTeams]);

  const perUser = useMemo(() => {
    return allUsers.map((u) => {
      const mine = visibleTasks.filter((t) => t.assignee === u.name && t.status !== "Completed" && t.status !== "Cancelled");
      const overdue = mine.filter((t) => new Date(t.due) < new Date()).length;
      const capacity = 8; // pretend
      const load = Math.min(150, Math.round((mine.length / capacity) * 100));
      return { user: u, count: mine.length, overdue, load };
    }).sort((a, b) => b.load - a.load);
  }, [visibleTasks]);

  const teamLoad = useMemo(() => teams.filter(t => visibleTeams.includes(t.id)).map((t) => ({
    team: t.name,
    active: visibleTasks.filter((x) => x.team === t.id && x.status !== "Completed").length,
    review: visibleTasks.filter((x) => x.team === t.id && x.status === "Waiting Review").length,
    blocked: visibleTasks.filter((x) => x.team === t.id && x.status === "Blocked").length,
  })), [visibleTasks, visibleTeams]);

  const overloaded = perUser.filter((p) => p.load > 100).length;
  const available = perUser.filter((p) => p.load < 60).length;

  const heatmap = perUser.slice(0, 6).map((p) => ({
    name: p.user.name,
    days: Array.from({ length: 14 }).map(() => Math.floor(Math.random() * 5)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Workload" description="Capacity, utilisation and resource allocation across teams." />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="People tracked" value={perUser.length} icon={Users} />
        <StatTile label="Avg utilisation" value={`${Math.round(perUser.reduce((a, b) => a + b.load, 0) / Math.max(1, perUser.length))}%`} icon={Activity} tone="text-info" />
        <StatTile label="Overloaded" value={overloaded} icon={AlertTriangle} tone="text-destructive" />
        <StatTile label="Available capacity" value={available} icon={CheckCircle2} tone="text-success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-4">Team load distribution</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={teamLoad}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="team" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="active" name="Active" stackId="a" fill="hsl(var(--info))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="review" name="Review" stackId="a" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="blocked" name="Blocked" stackId="a" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Activity heatmap (14 days)</h3>
          <div className="space-y-2">
            {heatmap.map((row) => (
              <div key={row.name} className="flex items-center gap-2">
                <span className="text-[11px] w-20 truncate text-muted-foreground">{row.name}</span>
                <div className="flex gap-0.5 flex-1">
                  {row.days.map((v, i) => (
                    <div key={i} className={cn("h-3.5 flex-1 rounded-sm", v === 0 ? "bg-muted" : v < 2 ? "bg-primary/20" : v < 4 ? "bg-primary/50" : "bg-primary")} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Per-person workload</h3>
        <div className="space-y-3">
          {perUser.map((p) => {
            const team = teams.find((t) => t.id === p.user.team)!;
            const tone = p.load > 100 ? "text-destructive" : p.load > 80 ? "text-warning" : "text-success";
            return (
              <div key={p.user.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-44 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">{p.user.initials}</div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.user.name}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TeamIcon team={team.id} size={10} /> {team.name}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-muted-foreground">{p.count} active tasks</span>
                    <span className={cn("text-[11px] font-medium", tone)}>{p.load}%</span>
                  </div>
                  <Progress value={Math.min(100, p.load)} className="h-1.5" />
                </div>
                {p.overdue > 0 && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{p.overdue} overdue</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Workload;