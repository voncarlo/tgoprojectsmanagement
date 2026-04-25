import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle2, Circle, Lock, Plus, RotateCcw, ShieldCheck, ShieldX, Trash2, UserPlus, X } from "lucide-react";
import { QuickAddDialog } from "@/components/portal/QuickAddDialog";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { teams, projectStatusColor, type Project, type ProjectStatus, type Subtask } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { canFullyAccessProject, getProjectMembers } from "@/lib/project-access";
import { useSearchParams } from "react-router-dom";

const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "At Risk", "Delayed", "On Hold", "Waiting Review", "Completed"];

const approvalTone = {
  "Pending Approval": "bg-warning/10 text-warning border border-warning/20",
  Approved: "bg-success/10 text-success border border-success/20",
  Rejected: "bg-destructive/10 text-destructive border border-destructive/20",
  "Returned for Revision": "bg-info/10 text-info border border-info/20",
} as const;

const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
const getProjectProgress = (project: Pick<Project, "milestones" | "subtasks">) => {
  const trackedItems = project.subtasks?.length ? project.subtasks : project.milestones;
  const total = trackedItems.length;
  if (!total) return 0;
  return Math.round((trackedItems.filter((item) => item.done).length / total) * 100);
};
const getNextProjectStatus = (project: Pick<Project, "status" | "milestones" | "subtasks">): ProjectStatus => {
  const progress = getProjectProgress(project);
  if (progress === 100) return "Completed";
  if (project.status === "Completed" || (project.status === "Planning" && progress > 0)) return "Active";
  return project.status;
};
const canManageProjectWork = (project: Project, userName: string, isManager: boolean) =>
  isManager || project.owner === userName || (project.coOwners ?? []).includes(userName);
const sortProjectSubtasks = (subtasks: Subtask[]) => [...subtasks].sort((left, right) => Number(left.done) - Number(right.done));
const normalizeProjectForView = (project: Project): Project => ({
  ...project,
  subtasks: project.subtasks ? sortProjectSubtasks(project.subtasks) : project.subtasks,
});

const Projects = () => {
  const { visibleTeams, currentUser, isManager, can, userList, canDecideTeamApprovals, hasAssignedTeamLead, isAdmin } = useAuth();
  const { allProjects, removeProject, updateProject, decideProjectApproval } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamsVisible = teams.filter((team) => visibleTeams.includes(team.id));
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [pendingCoOwner, setPendingCoOwner] = useState("");
  const list = allProjects.filter((project) => filter === "all" || project.team === filter);
  const canDeleteProjects = can("project.delete");
  const requestedProjectId = searchParams.get("project");

  const openProject = (project: Project) => {
    setSelectedProject(normalizeProjectForView(project));
    setApprovalComment("");
    setNewSubtaskTitle("");
    setPendingCoOwner("");
    setOpen(true);
  };

  const syncProject = (patch: Partial<Project>) => {
    if (!selectedProject) return;
    const nextProject = normalizeProjectForView({
      ...selectedProject,
      ...patch,
      subtasks: patch.subtasks ?? selectedProject.subtasks,
    });
    updateProject(selectedProject.id, patch);
    setSelectedProject(nextProject);
  };

  const handleApprovalDecision = (decision: "Approved" | "Rejected" | "Returned for Revision") => {
    if (!selectedProject) return;
    decideProjectApproval(selectedProject.id, decision, approvalComment.trim() || undefined);
    const nextStatus: ProjectStatus =
      decision === "Approved"
        ? "Completed"
        : decision === "Rejected"
          ? "On Hold"
          : "Active";
    setSelectedProject({
      ...selectedProject,
      status: nextStatus,
      approvalStatus: decision,
      approvalHistory: [
        ...(selectedProject.approvalHistory ?? []),
        {
          id: `local-${Date.now()}`,
          actor: currentUser.name,
          action: decision,
          comment: approvalComment.trim() || undefined,
          at: "Just now",
        },
      ],
    });
    setApprovalComment("");
    toast.success(`Project ${decision.toLowerCase()}`);
  };

  const updateSelectedSubtasks = (nextSubtasks: Subtask[], options?: { preserveStatus?: boolean; allowStatusChange?: boolean }) => {
    if (!selectedProject) return;
    const orderedSubtasks = sortProjectSubtasks(nextSubtasks);
    const nextStatus =
      options?.preserveStatus || options?.allowStatusChange === false
        ? selectedProject.status
        : getNextProjectStatus({ ...selectedProject, subtasks: orderedSubtasks });
    const progress = getProjectProgress({ ...selectedProject, subtasks: orderedSubtasks });
    syncProject({
      subtasks: orderedSubtasks,
      progress,
      ...(nextStatus !== selectedProject.status ? { status: nextStatus } : {}),
    });
  };

  useEffect(() => {
    if (!requestedProjectId) return;
    const requestedProject = allProjects.find((project) => project.id === requestedProjectId);
    if (!requestedProject) {
      toast.error("This item may have been deleted or is no longer available.");
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete("project");
        return next;
      }, { replace: true });
      return;
    }
    if (selectedProject?.id !== requestedProject.id || !open) openProject(requestedProject);
  }, [allProjects, open, requestedProjectId, selectedProject?.id, setSearchParams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track delivery health, ownership, timeline, and subtask progress across teams."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gradient-primary w-full gap-1.5 text-primary-foreground sm:w-auto">
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")} className={cn("gap-1.5", filter === "all" && "gradient-primary text-primary-foreground")}>
          <TeamIcon team="all" size={14} className={cn(filter === "all" ? "text-primary-foreground" : "text-muted-foreground")} />
          All teams
        </Button>
        {teamsVisible.map((team) => (
          <Button key={team.id} size="sm" variant={filter === team.id ? "default" : "ghost"} onClick={() => setFilter(team.id)} className={cn("gap-1.5", filter === team.id && "gradient-primary text-primary-foreground")}>
            <TeamIcon team={team.id} size={14} className={cn(filter === team.id ? "text-primary-foreground" : "text-muted-foreground")} />
            {team.name}
          </Button>
        ))}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((project) => {
          const team = teams.find((entry) => entry.id === project.team)!;
          const canManageWork = canManageProjectWork(project, currentUser.name, isManager);
          const canOpenFullProject = canFullyAccessProject(project, currentUser, isManager);
          const members = getProjectMembers(project);
          const memberCount = members.length;
          const isOutsideWorkspace = !visibleTeams.includes(project.team);

          return (
            <Card key={project.id} className="p-5 hover:shadow-elegant transition-smooth gradient-card cursor-pointer" onClick={() => openProject(project)}>
              <div className="flex items-start justify-between mb-3">
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border">
                  <TeamIcon team={team.id} size={11} className="text-muted-foreground" />
                  {team.name}
                </Badge>
                <div className="flex items-center gap-2">
                  {isOutsideWorkspace && (
                    <Badge variant="outline" className="text-[10px]">Limited</Badge>
                  )}
                  <Badge variant="outline" className={cn("text-[10px]", projectStatusColor[project.status])}>{project.status}</Badge>
                  {canDeleteProjects && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(event) => {
                        event.stopPropagation();
                        const confirmed = window.confirm(`Delete "${project.name}"? You can restore it later from the Recycle Bin.`);
                        if (!confirmed) return;
                        removeProject(project.id);
                        toast.success("Project moved to Recycle Bin");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{project.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                {canOpenFullProject ? project.description : "Limited project summary available."}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-2" />
              </div>

              <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Team lead</span>
                  <span className="font-medium">{project.owner}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Members</span>
                  <span className="font-medium">{memberCount}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {canOpenFullProject ? "Open to view tasks, members, approvals, and project details." : "Limited preview only. Open to view safe summary details."}
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(project.owner)}</AvatarFallback></Avatar>
                  <span className="truncate text-xs text-muted-foreground">{project.owner}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{memberCount} member{memberCount !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{project.end.slice(5)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <QuickAddDialog open={createOpen} onOpenChange={setCreateOpen} defaultTab="project" />

      <Sheet
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (isOpen || !requestedProjectId) return;
          setSearchParams((params) => {
            const next = new URLSearchParams(params);
            next.delete("project");
            return next;
          }, { replace: true });
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedProject && (() => {
            const team = teams.find((entry) => entry.id === selectedProject.team)!;
            const isProjectOwner = selectedProject.owner === currentUser.name;
            const isProjectCoOwner = (selectedProject.coOwners ?? []).includes(currentUser.name);
            const canManageWork = isProjectOwner || isProjectCoOwner;
            const canManageMembers = isProjectOwner || isAdmin;
            const canEditSubtasks = canManageProjectWork(selectedProject, currentUser.name, isManager);
            const canOpenFullProject = canFullyAccessProject(selectedProject, currentUser, isManager);
            const members = getProjectMembers(selectedProject);
            const canDecide = canDecideTeamApprovals(selectedProject.team);
            const showApprovalActions = canDecide && selectedProject.approvalStatus === "Pending Approval";
            const coOwnerCandidates = userList.filter((user) =>
              user.status === "Active" &&
              user.name.trim() &&
              user.name !== selectedProject.owner &&
              !(selectedProject.coOwners ?? []).includes(user.name)
            );

            return (
              <div className="space-y-5">
                <SheetHeader className="text-left space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: `hsl(${team.color} / 0.4)`, color: `hsl(${team.color})`, background: `hsl(${team.color} / 0.08)` }}>
                      {team.name}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", projectStatusColor[selectedProject.status])}>{selectedProject.status}</Badge>
                    {selectedProject.approvalStatus && (
                      <Badge variant="outline" className={cn("text-[10px] gap-1", approvalTone[selectedProject.approvalStatus])}>
                        <ShieldCheck className="h-3 w-3" />
                        {selectedProject.approvalStatus}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-lg leading-tight">{selectedProject.name}</SheetTitle>
                  <SheetDescription>{canOpenFullProject ? selectedProject.description : "Limited project preview"}</SheetDescription>
                </SheetHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Team Lead</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials(selectedProject.owner)}</AvatarFallback></Avatar>
                      <span>{selectedProject.owner}</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Access</p>
                    <p className="text-xs text-muted-foreground">
                      {canOpenFullProject
                        ? isProjectOwner
                          ? "You can manage status, timeline, and subtasks."
                          : canManageWork
                            ? "You can manage timeline and subtasks as a member."
                            : "You can fully view this project."
                        : "You can only view the project summary because you are not assigned to this project."}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">Members</p>
                  <div className="flex flex-wrap gap-2">
                    {members.map((member) => (
                      <Badge key={member} variant="outline">{member}</Badge>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{selectedProject.progress}%</span>
                  </div>
                  <Progress value={selectedProject.progress} className="h-2" />
                </div>

                {!canOpenFullProject && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Detailed project content is restricted. Only Team Leads, assigned members, Managers, Admins, and Super Admins can view subtasks, files, approval history, and internal project details.
                  </div>
                )}

                {canOpenFullProject && (
                  <>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Timeline</p>
                    {!canManageWork && <span className="text-[10px] text-muted-foreground">Team lead or members can edit</span>}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Start</label>
                      <Input
                        type="date"
                        value={selectedProject.start}
                        disabled={!canManageWork}
                        onChange={(event) => syncProject({ start: event.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">End</label>
                      <Input
                        type="date"
                        value={selectedProject.end}
                        disabled={!canManageWork}
                        onChange={(event) => syncProject({ end: event.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Members</p>
                    {!canManageMembers && <span className="text-[10px] text-muted-foreground">Only the project owner, Admin, or Super Admin can manage members</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedProject.coOwners?.length ?? 0) > 0 ? (
                      selectedProject.coOwners!.map((coOwner) => (
                        <Badge key={coOwner} variant="outline" className="gap-1.5 px-2 py-1">
                          {coOwner}
                          {canManageMembers && (
                            <button
                              type="button"
                              onClick={() => syncProject({ coOwners: (selectedProject.coOwners ?? []).filter((name) => name !== coOwner) })}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Remove ${coOwner}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Only the project owner is assigned.</span>
                    )}
                  </div>
                  {canManageMembers && (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select value={pendingCoOwner} onValueChange={setPendingCoOwner}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder={coOwnerCandidates.length > 0 ? "Select a member" : "No available users"} />
                        </SelectTrigger>
                        <SelectContent>
                          {coOwnerCandidates.map((user) => (
                            <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!pendingCoOwner}
                        onClick={() => {
                          syncProject({ coOwners: [...(selectedProject.coOwners ?? []), pendingCoOwner] });
                          setPendingCoOwner("");
                        }}
                      >
                        <UserPlus className="h-4 w-4" /> Add member
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Project status</p>
                    {!isProjectOwner && <span className="text-[10px] text-muted-foreground">Only the team lead can change status</span>}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PROJECT_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={!isProjectOwner || status === "Waiting Review"}
                        onClick={() => syncProject({ status })}
                        className={cn(
                          "h-9 rounded-lg text-xs font-medium border flex items-center justify-center transition-smooth",
                          selectedProject.status === status ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-border hover:bg-muted/50",
                          (!isProjectOwner || status === "Waiting Review") && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedProject.requiresApproval && (
                  <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-tight">Approval workflow</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Staff-created projects can be approved by any manager, admin, or super admin.
                          </p>
                        </div>
                      </div>
                      {selectedProject.approvalStatus && (
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", approvalTone[selectedProject.approvalStatus])}>{selectedProject.approvalStatus}</Badge>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {!hasAssignedTeamLead(selectedProject.team) && isAdmin && (
                        <div className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                          No Manager or Team Lead is assigned to this department yet. Admins and Super Admins can still approve this project.
                        </div>
                      )}
                      {selectedProject.approvalHistory && selectedProject.approvalHistory.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">History</p>
                          <ol className="relative border-l border-border ml-2 space-y-2.5">
                            {selectedProject.approvalHistory.map((entry) => (
                              <li key={entry.id} className="ml-3 text-xs">
                                <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-medium text-foreground">{entry.actor}</span>
                                  <span className="text-muted-foreground">{entry.action.toLowerCase()}</span>
                                  <span className="text-muted-foreground/60 ml-auto">{entry.at}</span>
                                </div>
                                {entry.comment && <p className="text-muted-foreground mt-0.5">"{entry.comment}"</p>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {showApprovalActions ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            value={approvalComment}
                            onChange={(event) => setApprovalComment(event.target.value)}
                            placeholder="Add a comment for the requester (optional)..."
                            className="text-xs"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 flex-1 min-w-[110px]" onClick={() => handleApprovalDecision("Approved")}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 min-w-[110px]" onClick={() => handleApprovalDecision("Returned for Revision")}>
                              <RotateCcw className="h-3.5 w-3.5" /> Return
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive min-w-[110px]" onClick={() => handleApprovalDecision("Rejected")}>
                              <ShieldX className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        </div>
                      ) : selectedProject.approvalStatus === "Pending Approval" ? (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" />
                          Awaiting approval from the assigned Manager or Team Lead, plus Admins and Super Admins.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                          Completion approval happens right before the project is marked complete.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Subtasks</p>
                    {!canEditSubtasks && <span className="text-[10px] text-muted-foreground">Team lead, members, or manager-level roles can update subtasks</span>}
                  </div>

                  {canEditSubtasks && (
                    <div className="flex gap-2">
                      <Input
                        value={newSubtaskTitle}
                        onChange={(event) => setNewSubtaskTitle(event.target.value)}
                        placeholder="Add a new subtask"
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!newSubtaskTitle.trim()}
                        onClick={() => {
                          updateSelectedSubtasks([
                            ...(selectedProject.subtasks ?? []),
                            { id: `sub-${Date.now()}`, title: newSubtaskTitle.trim(), done: false },
                          ], { allowStatusChange: isProjectOwner });
                          setNewSubtaskTitle("");
                        }}
                      >
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(selectedProject.subtasks?.length ?? 0) > 0 ? (
                      selectedProject.subtasks!.map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                          <span className="text-muted-foreground">•</span>
                          <button
                            type="button"
                            disabled={!canEditSubtasks}
                            onClick={() => {
                              const nextSubtasks = sortProjectSubtasks((selectedProject.subtasks ?? []).map((item) =>
                                item.id === subtask.id ? { ...item, done: !item.done } : item
                              ));
                              updateSelectedSubtasks(nextSubtasks, { allowStatusChange: isProjectOwner });
                            }}
                            className={cn("shrink-0", !canEditSubtasks && "cursor-not-allowed")}
                          >
                            {subtask.done
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                              : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          </button>
                          <Input
                            value={subtask.title}
                            disabled={!canEditSubtasks}
                            onChange={(event) => {
                              const nextSubtasks = (selectedProject.subtasks ?? []).map((item) =>
                                item.id === subtask.id ? { ...item, title: event.target.value } : item
                              );
                              updateSelectedSubtasks(nextSubtasks, { preserveStatus: true });
                            }}
                            className={cn("border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0", subtask.done && "line-through text-muted-foreground")}
                          />
                          {canEditSubtasks && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => updateSelectedSubtasks((selectedProject.subtasks ?? []).filter((item) => item.id !== subtask.id), { preserveStatus: true })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                        No subtasks yet.
                      </div>
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Projects;
