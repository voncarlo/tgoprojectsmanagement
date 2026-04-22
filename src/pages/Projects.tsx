import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Calendar, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { teams, projectStatusColor } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { QuickAddDialog } from "@/components/portal/QuickAddDialog";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { toast } from "sonner";

const Projects = () => {
  const { visibleTeams, isAdmin, can } = useAuth();
  const { projects, tasks, toggleMilestone, removeProject } = useData();
  const teamsVisible = teams.filter((t) => visibleTeams.includes(t.id));
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const list = projects.filter((p) => visibleTeams.includes(p.team) && (filter === "all" || p.team === filter));
  const canDeleteProjects = can("project.delete");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track delivery health, milestones, and progress across teams."
        actions={
          <Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground gap-1.5">
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "ghost"} onClick={() => setFilter("all")} className={cn("gap-1.5", filter === "all" && "gradient-primary text-primary-foreground")}>
          <TeamIcon team="all" size={14} className={cn(filter === "all" ? "text-primary-foreground" : "text-muted-foreground")} />
          All teams
        </Button>
        {teamsVisible.map((t) => (
          <Button key={t.id} size="sm" variant={filter === t.id ? "default" : "ghost"} onClick={() => setFilter(t.id)} className={cn("gap-1.5", filter === t.id && "gradient-primary text-primary-foreground")}>
            <TeamIcon team={t.id} size={14} className={cn(filter === t.id ? "text-primary-foreground" : "text-muted-foreground")} />
            {t.name}
          </Button>
        ))}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const team = teams.find((t) => t.id === p.team)!;
          const linked = tasks.filter((t) => t.project === p.name).length;
          return (
            <Card key={p.id} className="p-5 hover:shadow-elegant transition-smooth gradient-card">
              <div className="flex items-start justify-between mb-3">
                <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground border-border">
                  <TeamIcon team={team.id} size={11} className="text-muted-foreground" />
                  {team.name}
                </Badge>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", projectStatusColor[p.status])}>{p.status}</Badge>
                  {canDeleteProjects && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(event) => {
                        event.stopPropagation();
                        const confirmed = window.confirm(`Delete "${p.name}"? You can restore it later from the Recycle Bin.`);
                        if (!confirmed) return;
                        removeProject(p.id);
                        toast.success("Project moved to Recycle Bin");
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-base mb-1">{p.name}</h3>
              <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{p.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{p.progress}%</span>
                </div>
                <Progress value={p.progress} className="h-2" />
              </div>

              <div className="space-y-1.5 mb-4">
                {p.milestones.map((m) => (
                  <button
                    type="button"
                    key={m.name}
                    onClick={() => toggleMilestone(p.id, m.name)}
                    className="flex w-full items-center gap-2 text-xs rounded-md p-1 -mx-1 hover:bg-muted/50 transition-smooth text-left"
                  >
                    {m.done
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className={cn(m.done && "text-muted-foreground line-through")}>{m.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{p.owner.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <span className="text-xs text-muted-foreground">{p.owner}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{linked} tasks</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.end.slice(5)}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <QuickAddDialog open={open} onOpenChange={setOpen} defaultTab="project" />
    </div>
  );
};

export default Projects;
