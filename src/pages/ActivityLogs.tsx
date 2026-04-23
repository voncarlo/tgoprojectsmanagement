import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2 } from "lucide-react";
import { teams, type AuditEntry } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import { useData } from "@/store/DataContext";

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
  const { visibleTeams, can } = useAuth();
  const { auditLog, clearAuditLog } = useData();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATS[number]>("All");

  const list = useMemo(() => auditLog.filter((entry) =>
    (cat === "All" || entry.category === cat)
    && (!entry.team || visibleTeams.includes(entry.team))
    && (q === "" || entry.user.toLowerCase().includes(q.toLowerCase()) || entry.action.toLowerCase().includes(q.toLowerCase()) || entry.target.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, visibleTeams, auditLog]);

  const clearLogs = () => {
    const confirmed = window.confirm("Clear all activity logs?");
    if (!confirmed) return;
    clearAuditLog();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        description="A complete audit trail across users, files, projects and the system."
        actions={
          can("audit.view") ? (
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={clearLogs}>
              <Trash2 className="h-4 w-4" /> Clear logs
            </Button>
          ) : null
        }
      />

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" placeholder="Search by user, action or target..." value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATS.map((category) => (
            <button
              key={category}
              onClick={() => setCat(category)}
              className={cn(
                "h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth",
                cat === category ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {category}
            </button>
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
            {list.map((entry) => {
              const team = teams.find((item) => item.id === entry.team);
              return (
                <tr key={entry.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">
                        {entry.user.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs font-medium">{entry.user}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs"><span className="text-muted-foreground">{entry.action}</span> <span className="font-medium">{entry.target}</span></td>
                  <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", CAT_TONE[entry.category])}>{entry.category}</Badge></td>
                  <td className="p-3 text-xs text-muted-foreground">{team?.name ?? "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground">{entry.time}</td>
                  <td className="p-3 text-[11px] text-muted-foreground font-mono">{entry.ip ?? "-"}</td>
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
