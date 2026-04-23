import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck } from "lucide-react";
import { teams, type Priority, type ProjectStatus, type TaskStatus, type TeamId } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"];
const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "On Hold", "Completed"];
const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "At Risk", "Completed"];
const parseSubtasks = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((title, index) => ({ id: `sub-${Date.now()}-${index}`, title, done: false }));

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultTab?: "task" | "project";
  defaultTeam?: TeamId;
  defaultStatus?: TaskStatus;
}

export const QuickAddDialog = ({ open, onOpenChange, defaultTab = "task", defaultTeam, defaultStatus }: Props) => {
  const { currentUser, visibleTeams, userList } = useAuth();
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
  const [tSubtasks, setTSubtasks] = useState("");

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pTasks, setPTasks] = useState("");
  const [pSubtasks, setPSubtasks] = useState("");
  const [pTeam, setPTeam] = useState<TeamId>(initialTeam);
  const [pOwner, setPOwner] = useState(currentUser.name);
  const [pStatus, setPStatus] = useState<ProjectStatus>("Planning");
  const [pStart, setPStart] = useState(new Date().toISOString().slice(0, 10));
  const [pEnd, setPEnd] = useState(new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setTTeam(defaultTeam ?? initialTeam);
      setTStatus(defaultStatus ?? "Not Started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultTab, defaultTeam, defaultStatus]);

  const reset = () => {
    setTTitle("");
    setTNotes("");
    setTSubtasks("");
    setPName("");
    setPDesc("");
    setPTasks("");
    setPSubtasks("");
  };

  const submitTask = () => {
    if (!tTitle.trim()) return toast.error("Task title is required");
    addTask({
      title: tTitle.trim(),
      assignee: tAssignee,
      team: tTeam,
      priority: tPriority,
      status: tStatus,
      due: tDue,
      notes: tNotes || undefined,
      subtasks: parseSubtasks(tSubtasks),
      approvalStatus: undefined,
      approvalHistory: [],
    });
    toast.success("Task created");
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
      status: pStatus,
      progress: 0,
      start: pStart,
      end: pEnd,
      subtasks: parseSubtasks(pSubtasks),
    });
    parseSubtasks(pTasks).forEach((projectTask) => {
      addTask({
        title: projectTask.title,
        assignee: pOwner,
        team: pTeam,
        priority: "Medium",
        status: "Not Started",
        due: pEnd,
        notes: `Linked to project: ${createdProject.name}`,
        project: createdProject.name,
        subtasks: [],
        approvalStatus: undefined,
        approvalHistory: [],
      });
    });
    toast.success("Project created");
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
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
                <Label>Assignee</Label>
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
                    {STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
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
            <div className="space-y-2">
              <Label>Subtasks</Label>
              <Textarea rows={4} value={tSubtasks} onChange={(event) => setTSubtasks(event.target.value)} placeholder={"One subtask per line\nExample:\nDraft outline\nReview with manager\nSubmit final copy"} />
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
                      ? "Staff-created tasks go to any manager, admin, or super admin when marked complete."
                      : "Tasks created by managers, admins, and super admins can be completed without extra approval."}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submitTask}>Create task</Button>
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
              <Label>Project tasks</Label>
              <Textarea
                rows={4}
                value={pTasks}
                onChange={(event) => setPTasks(event.target.value)}
                placeholder={"One task per line\nExample:\nCollect requirements\nAssign stakeholders\nPrepare rollout plan"}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtasks</Label>
              <Textarea rows={4} value={pSubtasks} onChange={(event) => setPSubtasks(event.target.value)} placeholder={"One subtask per line\nExample:\nDefine scope\nAssign owners\nReview launch checklist"} />
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
                <Label>Owner</Label>
                <Select value={pOwner} onValueChange={setPOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {userList.map((user) => <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
