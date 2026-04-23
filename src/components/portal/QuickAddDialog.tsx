import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShieldCheck, X } from "lucide-react";
import { teams, type Priority, type ProjectStatus, type Subtask, type TaskStatus, type TeamId } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"];
const DIRECT_TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "On Hold", "Completed"];
const REQUEST_TASK_STATUSES: TaskStatus[] = ["Not Started", "In Progress", "On Hold"];
const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "At Risk", "Completed"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTab?: "task" | "project";
  defaultTeam?: TeamId;
  defaultStatus?: TaskStatus;
}

export const QuickAddDialog = ({ open, onOpenChange, defaultTab = "task", defaultTeam, defaultStatus }: Props) => {
  const { currentUser, visibleTeams, userList, can } = useAuth();
  const { addTask, addProject } = useData();
  const teamsAvailable = teams.filter((team) => visibleTeams.includes(team.id));
  const initialTeam = defaultTeam ?? (teamsAvailable[0]?.id ?? currentUser.team);
  const creatorNeedsApproval = currentUser.role === "Staff";

  const [tab, setTab] = useState<"task" | "project">(defaultTab);
  const [tTitle, setTTitle] = useState("");
  const [tAssignee, setTAssignee] = useState(currentUser.name);
  const [tTeam, setTTeam] = useState<TeamId>(initialTeam);
  const [tPriority, setTPriority] = useState<Priority>("Medium");
  const [tStatus, setTStatus] = useState<TaskStatus>(defaultStatus ?? "Not Started");
  const [tDue, setTDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [tNotes, setTNotes] = useState("");

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pSubtasks, setPSubtasks] = useState<Subtask[]>([]);
  const [pSubtaskDraft, setPSubtaskDraft] = useState("");
  const [pTeam, setPTeam] = useState<TeamId>(initialTeam);
  const [pOwner, setPOwner] = useState(currentUser.name);
  const [pMembers, setPMembers] = useState<string[]>([]);
  const [pMemberDraft, setPMemberDraft] = useState("");
  const [pStatus, setPStatus] = useState<ProjectStatus>("Planning");
  const [pStart, setPStart] = useState(new Date().toISOString().slice(0, 10));
  const [pEnd, setPEnd] = useState(new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setTTeam(defaultTeam ?? initialTeam);
      setTStatus((defaultStatus ?? "Not Started") === "Completed" && !can("task.create") ? "Not Started" : (defaultStatus ?? "Not Started"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTab, defaultTeam, defaultStatus, can]);

  useEffect(() => {
    setPMembers((current) => current.filter((member) => member !== pOwner));
    if (pMemberDraft === pOwner) setPMemberDraft("");
  }, [pMemberDraft, pOwner]);

  const reset = () => {
    setTTitle("");
    setTNotes("");
    setPName("");
    setPDesc("");
    setPSubtaskDraft("");
    setPSubtasks([]);
    setPMembers([]);
    setPMemberDraft("");
  };

  const submitTask = () => {
    if (!tTitle.trim()) return toast.error("Task title is required");
    const createdTask = addTask({
      title: tTitle.trim(),
      assignedBy: currentUser.name,
      assignee: tAssignee,
      team: tTeam,
      priority: tPriority,
      status: tStatus,
      due: tDue,
      notes: tNotes || undefined,
      approvalStatus: undefined,
      approvalHistory: [],
    });
    toast.success(createdTask ? "Task created" : "Task request sent for approval");
    reset();
    onOpenChange(false);
  };

  const submitProject = () => {
    if (!pName.trim()) return toast.error("Project name is required");
    const createdProject = addProject({
      name: pName.trim(),
      description: pDesc || "-",
      team: pTeam,
      owner: pOwner,
      coOwners: pMembers,
      status: pStatus,
      progress: 0,
      start: pStart,
      end: pEnd,
      subtasks: pSubtasks,
    });
    toast.success("Project created");
    reset();
    onOpenChange(false);
  };

  const availableMembers = userList.filter((user) => user.name !== pOwner && !pMembers.includes(user.name));
  const taskStatuses = can("task.create") ? DIRECT_TASK_STATUSES : REQUEST_TASK_STATUSES;

  const addProjectSubtask = () => {
    if (!pSubtaskDraft.trim()) return;
    setPSubtasks((current) => [...current, { id: `sub-${Date.now()}`, title: pSubtaskDraft.trim(), done: false }]);
    setPSubtaskDraft("");
  };

  const addProjectMember = () => {
    if (!pMemberDraft) return;
    setPMembers((current) => [...current, pMemberDraft]);
    setPMemberDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick add</DialogTitle>
          <DialogDescription>Create a task or project in seconds.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as "task" | "project")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task">Task</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input autoFocus value={tTitle} onChange={(event) => setTTitle(event.target.value)} placeholder="What needs to be done?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Assigned by</Label>
                <Input value={currentUser.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <Select value={tAssignee} onValueChange={setTAssignee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {userList.map((user) => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={tTeam} onValueChange={(value) => setTTeam(value as TeamId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teamsAvailable.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={tPriority} onValueChange={(value) => setTPriority(value as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={tStatus} onValueChange={(value) => setTStatus(value as TaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Due date</Label>
                <Input type="date" value={tDue} onChange={(event) => setTDue(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={tNotes} onChange={(event) => setTNotes(event.target.value)} placeholder="Optional context..." />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{can("task.create") ? "Task permissions" : "Request approval"}</p>
                  <p className="text-xs text-muted-foreground">
                    {can("task.create")
                      ? "Admins, managers, and super admins can create tasks directly. Only they can mark tasks as completed."
                      : "Staff task requests go to Approvals first and stay off the Tasks page until approved."}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submitTask}>{can("task.create") ? "Create task" : "Request task"}</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="project" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input autoFocus value={pName} onChange={(event) => setPName(event.target.value)} placeholder="Project name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={pDesc} onChange={(event) => setPDesc(event.target.value)} placeholder="Brief description" />
            </div>
            <div className="space-y-2">
              <Label>Subtasks</Label>
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex gap-2">
                  <Input
                    value={pSubtaskDraft}
                    onChange={(event) => setPSubtaskDraft(event.target.value)}
                    placeholder="Add a subtask bullet"
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" className="gap-1.5" onClick={addProjectSubtask} disabled={!pSubtaskDraft.trim()}>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {pSubtasks.length > 0 ? (
                    pSubtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
                        <span className="text-muted-foreground">•</span>
                        <span className="flex-1">{subtask.title}</span>
                        <button
                          type="button"
                          onClick={() => setPSubtasks((current) => current.filter((item) => item.id !== subtask.id))}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${subtask.title}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No subtasks yet. Add them one bullet at a time.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={pTeam} onValueChange={(value) => setPTeam(value as TeamId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teamsAvailable.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team Lead</Label>
                <Select value={pOwner} onValueChange={setPOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {userList.map((user) => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Members</Label>
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex gap-2">
                    <Select value={pMemberDraft} onValueChange={setPMemberDraft}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder={availableMembers.length > 0 ? "Select a member" : "No available members"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers.map((user) => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" className="gap-1.5" onClick={addProjectMember} disabled={!pMemberDraft}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pMembers.length > 0 ? (
                      pMembers.map((member) => (
                        <Badge key={member} variant="outline" className="gap-1.5 px-2 py-1">
                          {member}
                          <button
                            type="button"
                            onClick={() => setPMembers((current) => current.filter((item) => item !== member))}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label={`Remove ${member}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No members selected yet.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={pStatus} onValueChange={(value) => setPStatus(value as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="date" value={pStart} onChange={(event) => setPStart(event.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>End</Label>
                <Input type="date" value={pEnd} onChange={(event) => setPEnd(event.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Completion approval</p>
                  <p className="text-xs text-muted-foreground">
                    {creatorNeedsApproval
                      ? "Staff-created projects go to any manager, admin, or super admin when marked complete."
                      : "Projects created by managers, admins, and super admins can be completed without extra approval."}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submitProject}>Create project</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
