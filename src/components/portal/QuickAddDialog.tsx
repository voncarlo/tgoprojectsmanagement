import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck } from "lucide-react";
import { teams, type Priority, type TaskStatus, type ProjectStatus, type TeamId } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Urgent"];
const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "On Hold", "Completed"];
const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "Active", "At Risk", "Completed"];

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
  const teamsAvailable = teams.filter((t) => visibleTeams.includes(t.id));
  const initialTeam = defaultTeam ?? (teamsAvailable[0]?.id ?? currentUser.team);
  const approverCandidates = userList.filter((u) =>
    ["Super Admin", "Admin", "Manager"].includes(u.role)
  );

  const [tab, setTab] = useState<"task" | "project">(defaultTab);
  const [tTitle, setTTitle] = useState("");
  const [tAssignee, setTAssignee] = useState(currentUser.name);
  const [tTeam, setTTeam] = useState<TeamId>(initialTeam);
  const [tPriority, setTPriority] = useState<Priority>("Medium");
  const [tStatus, setTStatus] = useState<TaskStatus>(defaultStatus ?? "Not Started");
  const [tDue, setTDue] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [tNotes, setTNotes] = useState("");
  const [tRequiresApproval, setTRequiresApproval] = useState(false);
  const [tApprover, setTApprover] = useState<string>(approverCandidates[0]?.name ?? "");

  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
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
    setTTitle(""); setTNotes("");
    setPName(""); setPDesc("");
  };

  const submitTask = () => {
    if (!tTitle.trim()) return toast.error("Task title is required");
    if (tRequiresApproval && !tApprover) return toast.error("Please select an approver");
    addTask({
      title: tTitle.trim(),
      assignee: tAssignee,
      team: tTeam,
      priority: tPriority,
      status: tStatus,
      due: tDue,
      notes: tNotes || undefined,
      requiresApproval: tRequiresApproval,
      approver: tRequiresApproval ? tApprover : undefined,
      approvalStatus: undefined,
      approvalHistory: [],
    });
    toast.success("Task created");
    reset();
    onOpenChange(false);
  };

  const submitProject = () => {
    if (!pName.trim()) return toast.error("Project name is required");
    addProject({
      name: pName.trim(),
      description: pDesc || "—",
      team: pTeam,
      owner: pOwner,
      status: pStatus,
      progress: 0,
      start: pStart,
      end: pEnd,
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task">Task</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input autoFocus value={tTitle} onChange={(e) => setTTitle(e.target.value)} placeholder="What needs to be done?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={tAssignee} onValueChange={setTAssignee}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {userList.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={tTeam} onValueChange={(v) => setTTeam(v as TeamId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teamsAvailable.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={tPriority} onValueChange={(v) => setTPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={tStatus} onValueChange={(v) => setTStatus(v as TaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Due date</Label>
                <Input type="date" value={tDue} onChange={(e) => setTDue(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={tNotes} onChange={(e) => setTNotes(e.target.value)} placeholder="Optional context…" />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Requires approval</p>
                    <p className="text-xs text-muted-foreground">
                      Marking complete will route this task to an approver before it closes.
                    </p>
                  </div>
                </div>
                <Switch checked={tRequiresApproval} onCheckedChange={setTRequiresApproval} />
              </div>
              {tRequiresApproval && (
                <div className="space-y-2">
                  <Label>Approver</Label>
                  <Select value={tApprover} onValueChange={setTApprover}>
                    <SelectTrigger><SelectValue placeholder="Select approver…" /></SelectTrigger>
                    <SelectContent>
                      {approverCandidates.map((u) => (
                        <SelectItem key={u.id} value={u.name}>
                          {u.name} · <span className="text-muted-foreground">{u.role}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={submitTask}>Create task</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="project" className="space-y-4 pt-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input autoFocus value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Project name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={pTeam} onValueChange={(v) => setPTeam(v as TeamId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teamsAvailable.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={pOwner} onValueChange={setPOwner}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {userList.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={pStatus} onValueChange={(v) => setPStatus(v as ProjectStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>End</Label>
                <Input type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} />
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
