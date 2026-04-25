import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { teams, statusColor, priorityColor, projectStatusColor, type TeamId } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { useData } from "@/store/DataContext";
import { getProjectMembers } from "@/lib/project-access";

const Teams = () => {
  const { userList, setUserList, visibleTeams, isAdmin } = useAuth();
  const { tasks, projects } = useData();
  const visible = teams.filter(t => visibleTeams.includes(t.id));
  const [openTeam, setOpenTeam] = useState<TeamId | null>(null);

  const reassign = (userId: string, newTeam: TeamId) => {
    setUserList(userList.map(u => u.id === userId ? { ...u, team: newTeam, teams: u.teams.includes(newTeam) ? u.teams : [...u.teams, newTeam] } : u));
    toast.success("Member reassigned");
  };

  const activeTeam = openTeam ? teams.find(t => t.id === openTeam) ?? null : null;
  const activeTasks = activeTeam ? tasks.filter(t => t.team === activeTeam.id) : [];
  const activeProjects = activeTeam ? projects.filter(p => p.team === activeTeam.id) : [];

  return (
  <>
  <div className="space-y-6">
    <PageHeader
      title="Teams"
      description="Live workload, members, and project health for every department."
    />
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
    {visible.map(team => {
      const members = userList.filter(u => u.teams.includes(team.id));
      const teamTasks = tasks.filter(t => t.team === team.id);
      const teamProjects = projects.filter(p => p.team === team.id);
      const done = teamTasks.filter(t => t.status === "Completed").length;
      const rate = teamTasks.length ? Math.round((done / teamTasks.length) * 100) : 0;

      return (
        <Card key={team.id} className="p-6 hover:shadow-elegant transition-smooth gradient-card">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <TeamIcon team={team.id} size={22} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base">{team.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{team.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpenTeam(team.id)}
            className="grid grid-cols-3 gap-2 mb-4 w-full text-left group"
            aria-label={`View live workload for ${team.name}`}
          >
            <div className="rounded-lg bg-muted/50 p-2.5 group-hover:bg-muted transition-smooth">
              <div className="text-lg font-semibold">{members.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 group-hover:bg-muted transition-smooth">
              <div className="text-lg font-semibold">{teamProjects.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Projects</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 group-hover:bg-muted transition-smooth">
              <div className="text-lg font-semibold">{teamTasks.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tasks</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setOpenTeam(team.id)}
            className="mb-4 w-full text-left group"
            aria-label={`View live workload for ${team.name}`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground group-hover:text-foreground transition-smooth">Live workload · view details</span>
              <span className="font-semibold">{rate}%</span>
            </div>
            <Progress value={rate} className="h-2" />
          </button>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead</div>
              <div className="text-xs font-medium">{team.lead}</div>
            </div>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map(m => (
                <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-semibold">{m.initials}</AvatarFallback>
                </Avatar>
              ))}
              {members.length > 5 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium">+{members.length - 5}</div>
              )}
            </div>
          </div>

          {isAdmin && members.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reassign primary team</div>
              {members.slice(0, 4).map(m => (
                <div key={m.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs truncate flex-1">{m.name}</span>
                  <Select value={m.team} onValueChange={(v) => reassign(m.id, v as TeamId)}>
                    <SelectTrigger className="h-7 w-[130px] text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </Card>
      );
    })}
  </div>
  </div>

  <Sheet open={!!openTeam} onOpenChange={(o) => !o && setOpenTeam(null)}>
    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
      {activeTeam && (
        <>
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <TeamIcon team={activeTeam.id} size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <SheetTitle>{activeTeam.name} · Live workload</SheetTitle>
                <SheetDescription className="text-xs">{activeTeam.description}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="tasks" className="mt-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Tasks ({activeTasks.length})</TabsTrigger>
              <TabsTrigger value="projects">Projects ({activeProjects.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4 space-y-2">
              {activeTasks.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No tasks for this team yet.</div>
              )}
              {activeTasks.map(t => (
                <Card key={t.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-sm">{t.title}</div>
                    <Badge className={priorityColor[t.priority]} variant="outline">{t.priority}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.assignee} · Due {t.due}</span>
                    <Badge className={statusColor[t.status]} variant="outline">{t.status}</Badge>
                  </div>
                  {t.project && <div className="text-[11px] text-muted-foreground mt-1">Project: {t.project}</div>}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="projects" className="mt-4 space-y-2">
              {activeProjects.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">No projects for this team yet.</div>
              )}
              {activeProjects.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.owner} · {getProjectMembers(p).length} members</div>
                    </div>
                    <Badge className={projectStatusColor[p.status]} variant="outline">{p.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Summary view</span>
                    <span className="font-semibold ml-2">{p.progress}%</span>
                  </div>
                  <Progress value={p.progress} className="h-1.5" />
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </SheetContent>
  </Sheet>
  </>
  );
};

export default Teams;
