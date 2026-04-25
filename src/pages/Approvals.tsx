import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, Check, EyeOff, GitBranch, RotateCcw, Trash2, X } from "lucide-react";
import { teams, type Approval, type ApprovalStatus } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Can } from "@/components/rbac/Can";
import { Lock } from "lucide-react";
import { useData } from "@/store/DataContext";

const STATUS_TONE: Record<ApprovalStatus, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  "Under Review": "bg-info/10 text-info border-info/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Returned: "bg-muted text-muted-foreground border-border",
};

const TYPE_TONE = {
  Task: "bg-info/10 text-info",
  Project: "bg-primary/10 text-primary",
  Leave: "bg-warning/10 text-warning",
  Budget: "bg-primary/10 text-primary",
  Change: "bg-destructive/10 text-destructive",
  Report: "bg-muted text-muted-foreground",
};

const FILTERS = ["All", "Pending", "Under Review", "Approved", "Rejected", "Returned"] as const;

const Approvals = () => {
  const { visibleTeams, canDecideTeamApprovals, hasAssignedTeamLead, isAdmin } = useAuth();
  const { approvals, decideApproval, hideApproval, removeApproval, clearApprovals } = useData();
  const [filter, setFilter] = useState<ApprovalStatus | "All">("All");
  const [open, setOpen] = useState<Approval | null>(null);
  const [comment, setComment] = useState("");

  const scopedApprovals = useMemo(
    () => approvals.filter((approval) => !approval.hidden && visibleTeams.includes(approval.team)),
    [approvals, visibleTeams]
  );

  const visible = useMemo(
    () => scopedApprovals.filter((approval) => filter === "All" || approval.status === filter),
    [scopedApprovals, filter]
  );

  const counts = {
    pending: scopedApprovals.filter((approval) => approval.status === "Pending").length,
    review: scopedApprovals.filter((approval) => approval.status === "Under Review").length,
    approved: scopedApprovals.filter((approval) => approval.status === "Approved").length,
    rejected: scopedApprovals.filter((approval) => approval.status === "Rejected").length,
  };

  const closeSheet = () => {
    setOpen(null);
    setComment("");
  };

  const decide = (id: string, status: ApprovalStatus) => {
    decideApproval(id, status, comment.trim() || undefined);
    toast.success(`Marked ${status.toLowerCase()}`);
    closeSheet();
  };

  const hideCurrentApproval = () => {
    if (!open) return;
    hideApproval(open.id);
    toast.success("Approval hidden");
    closeSheet();
  };

  const deleteCurrentApproval = () => {
    if (!open) return;
    removeApproval(open.id);
    toast.success("Approval deleted");
    closeSheet();
  };

  const clearAllApprovals = () => {
    const confirmed = window.confirm("Clear all approvals from the approval queue?");
    if (!confirmed) return;
    clearApprovals();
    toast.success("Approvals cleared");
    closeSheet();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Multi-step approvals across tasks, leave, budgets, changes and reports."
        actions={
          <Can
            cap="approval.decide"
            fallback={null}
          >
            {isAdmin ? (
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={clearAllApprovals}>
              <Trash2 className="h-4 w-4" /> Clear approvals
            </Button>
            ) : null}
          </Can>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Pending" value={counts.pending} icon={GitBranch} tone="text-warning" />
        <StatTile label="Under review" value={counts.review} icon={GitBranch} tone="text-info" />
        <StatTile label="Approved" value={counts.approved} icon={Check} tone="text-success" />
        <StatTile label="Rejected" value={counts.rejected} icon={X} tone="text-destructive" />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FILTERS.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as ApprovalStatus | "All")}
            className={cn(
              "h-7 px-3 rounded-full border text-xs font-medium transition-smooth",
              filter === status ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((approval) => {
          const team = teams.find((entry) => entry.id === approval.team)!;
          return (
            <Card key={approval.id} onClick={() => setOpen(approval)} className="p-4 cursor-pointer card-interactive">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[approval.type])}>{approval.type}</Badge>
                <Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[approval.status])}>{approval.status}</Badge>
              </div>
              <p className="text-sm font-medium leading-snug mb-3">{approval.title}</p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><TeamIcon team={team.id} size={11} /> {team.name}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {approval.submitted}</span>
              </div>
              {approval.amount && <p className="text-xs font-semibold text-foreground mt-2">${approval.amount.toLocaleString()}</p>}
            </Card>
          );
        })}
      </div>

      <Sheet open={!!open} onOpenChange={(value) => !value && closeSheet()}>
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
                {open.taskDraft && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Assigned by</p>
                      <p className="text-sm">{open.taskDraft.assignedBy ?? open.requester}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Assigned to</p>
                      <p className="text-sm">{open.taskDraft.assignee}</p>
                    </div>
                  </div>
                )}
                {open.projectDraft && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Team Lead</p>
                        <p className="text-sm">{open.projectDraft.owner}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Members</p>
                        <p className="text-sm">{open.projectDraft.coOwners?.length ? open.projectDraft.coOwners.join(", ") : "No members yet"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Start</p>
                        <p className="text-sm">{open.projectDraft.start}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">End</p>
                        <p className="text-sm">{open.projectDraft.end}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Subtasks</p>
                      <div className="space-y-1.5">
                        {open.projectDraft.subtasks?.length ? (
                          open.projectDraft.subtasks.map((subtask) => (
                            <div key={subtask.id} className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
                              {subtask.title}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No subtasks added.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                  <Textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional feedback..." />
                </div>

                {!hasAssignedTeamLead(open.team) && isAdmin && (
                  <div className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                    No Manager or Team Lead is assigned to this department yet. Admins and Super Admins can still approve this request.
                  </div>
                )}

                <Can
                  cap="approval.decide"
                  fallback={
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      You can view this approval but only the assigned Manager or Team Lead, plus Admins and Super Admins, can decide.
                    </div>
                  }
                >
                  {canDecideTeamApprovals(open.team) ? (
                    <>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button className="flex-1 gradient-primary text-primary-foreground gap-1.5" onClick={() => decide(open.id, "Approved")}><Check className="h-4 w-4" /> Approve</Button>
                        <Button variant="outline" className="gap-1.5" onClick={() => decide(open.id, "Returned")}><RotateCcw className="h-4 w-4" /> Return</Button>
                        <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => decide(open.id, "Rejected")}><X className="h-4 w-4" /> Reject</Button>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" className="flex-1 gap-1.5" onClick={hideCurrentApproval}>
                            <EyeOff className="h-4 w-4" /> Hide
                          </Button>
                          <Button variant="outline" className="flex-1 gap-1.5 text-destructive hover:text-destructive" onClick={deleteCurrentApproval}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      You can view this approval but only the assigned Manager or Team Lead, plus Admins and Super Admins, can decide.
                    </div>
                  )}
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
