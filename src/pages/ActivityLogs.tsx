import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Activity as ActivityIcon } from "lucide-react";
import { auditLog, teams, type AuditEntry } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const CAT_TONE: Record<AuditEntry["category"], string> = {
  Task: "bg-info/10 text-info border-info/20",
  Project: "bg-primary/10 text-primary border-primary/20",
  User: "bg-warning/10 text-warning border-warning/20",
  File: "bg-muted text-muted-foreground border-border",
  Approval: "bg-success/10 text-success border-success/20",
  Login: "bg-info/10 text-info border-info/20",
  System: "bg-destructive/10 text-destructive border-destructive/20",
};

const CATS = ["All", "Task", "Project", "User", "File", "Approval", "Login", "System"] as const;

const ActivityLogs = () => {
  const { visibleTeams } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATS[number]>("All");

  const list = useMemo(() => auditLog.filter((a) =>
    (cat === "All" || a.category === cat)
    && (!a.team || visibleTeams.includes(a.team))
    && (q === "" || a.user.toLowerCase().includes(q.toLowerCase()) || a.action.toLowerCase().includes(q.toLowerCase()) || a.target.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, visibleTeams]);

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Logs" description="A complete audit trail across users, files, projects and the system." />

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" placeholder="Search by user, action or target…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn("h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth",
              cat === c ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{c}</button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Activity</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Team</th>
              <th className="text-left p-3 font-medium">When</th>
              <th className="text-left p-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const team = teams.find((t) => t.id === a.team);
              return (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                        {a.user.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs font-medium">{a.user}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs"><span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.target}</span></td>
                  <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", CAT_TONE[a.category])}>{a.category}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{team?.name ?? "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{a.time}</td>
                  <td className="p-3 text-[11px] text-muted-foreground font-mono">{a.ip ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default ActivityLogs;