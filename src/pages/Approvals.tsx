import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { GitBranch, Check, X, RotateCcw, CalendarDays } from "lucide-react";
import { approvals as seed, teams, type Approval, type ApprovalStatus } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Can } from "@/components/rbac/Can";
import { Lock } from "lucide-react";

const STATUS_TONE: Record<ApprovalStatus, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "Under Review": "bg-info/10 text-info border-info/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Returned: "bg-muted text-muted-foreground border-border",
};

const TYPE_TONE = {
  Task: "bg-info/10 text-info",
  Leave: "bg-warning/10 text-warning",
  Budget: "bg-primary/10 text-primary",
  Change: "bg-destructive/10 text-destructive",
  Report: "bg-muted text-muted-foreground",
};

const Approvals = () => {
  const { visibleTeams, can } = useAuth();
  const canDecide = can("approval.decide");
  const [list, setList] = useState<Approval[]>(seed);
  const [filter, setFilter] = useState<ApprovalStatus | "All">("All");
  const [open, setOpen] = useState<Approval | null>(null);
  const [comment, setComment] = useState("");

  const visible = useMemo(() => list.filter((a) => visibleTeams.includes(a.team) && (filter === "All" || a.status === filter)), [list, visibleTeams, filter]);
  const counts = {
    pending: list.filter((a) => a.status === "Pending").length,
    review: list.filter((a) => a.status === "Under Review").length,
    approved: list.filter((a) => a.status === "Approved").length,
    rejected: list.filter((a) => a.status === "Rejected").length,
  };

  const decide = (id: string, status: ApprovalStatus) => {
    setList((s) => s.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`Marked ${status.toLowerCase()}`);
    setOpen(null);
    setComment("");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Approvals" description="Multi-step approvals across tasks, leave, budgets, changes and reports." />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Pending" value={counts.pending} icon={GitBranch} tone="text-warning" />
        <StatTile label="Under review" value={counts.review} icon={GitBranch} tone="text-info" />
        <StatTile label="Approved" value={counts.approved} icon={Check} tone="text-success" />
        <StatTile label="Rejected" value={counts.rejected} icon={X} tone="text-destructive" />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {(["All","Pending","Under Review","Approved","Rejected","Returned"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s as any)} className={cn("h-7 px-3 rounded-full border text-xs font-medium transition-smooth",
            filter === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>{s}</button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((a) => {
          const team = teams.find((t) => t.id === a.team)!;
          return (
            <Card key={a.id} onClick={() => setOpen(a)} className="p-4 cursor-pointer card-interactive">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[a.type])}>{a.type}</Badge>
                <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[a.status])}>{a.status}</Badge>
              </div>
              <p className="text-sm font-medium leading-snug mb-3">{a.title}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><TeamIcon team={team.id} size={11} /> {team.name}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {a.submitted}</span>
              </div>
              {a.amount && <p className="text-xs font-semibold text-foreground mt-2">${a.amount.toLocaleString()}</p>}
            </Card>
          );
        })}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.title}</SheetTitle>
                <SheetDescription>Requested by {open.requester} on {open.submitted}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[open.type])}>{open.type}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[open.status])}>{open.status}</Badge>
                </div>
                {open.amount && <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Amount</p><p className="text-2xl font-semibold">${open.amount.toLocaleString()}</p></div>}
                {open.notes && <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Notes</p><p className="text-sm">{open.notes}</p></div>}

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Approval timeline</p>
                  <ol className="relative border-l border-border ml-2 space-y-3">
                    <li className="ml-4 text-xs"><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-primary" /><b>Submitted</b> · {open.submitted}</li>
                    {open.status !== "Pending" && <li className="ml-4 text-xs"><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-info" /><b>Reviewed</b> · 2h after submit</li>}
                    <li className="ml-4 text-xs text-muted-foreground"><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-muted" /><b>Awaiting decision</b></li>
                  </ol>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Add a comment</p>
                  <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional feedback…" />
                </div>

                <Can
                  cap="approval.decide"
                  fallback={
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      You can view this approval but only Managers and above can decide.
                    </div>
                  }
                >
                  <div className="flex gap-2 pt-2">
                    <Button className="flex-1 gradient-primary text-primary-foreground gap-1.5" onClick={() => decide(open.id, "Approved")}><Check className="h-4 w-4" /> Approve</Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => decide(open.id, "Returned")}><RotateCcw className="h-4 w-4" /> Return</Button>
                    <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => decide(open.id, "Rejected")}><X className="h-4 w-4" /> Reject</Button>
                  </div>
                </Can>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Approvals;