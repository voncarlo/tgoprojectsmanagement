import { Card } from "@/components/ui/card";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldAlert, Users, HardDrive, Activity, Database, Server, Lock, Check, Minus, LogIn, LogOut, Pencil, Plus, Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { useAuth } from "@/auth/AuthContext";
import { ALL_ROLES, CAPABILITY_GROUPS, ROLE_CAPABILITIES } from "@/auth/permissions";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { cn } from "@/lib/utils";
import { useData } from "@/store/DataContext";
import { teams, type TeamId } from "@/data/mock";
import type { Workspace } from "@/lib/workspaces";

const emptyWorkspace = (): Workspace => ({
  id: `workspace-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  shortName: "",
  description: "",
  kind: "custom",
  color: "221 83% 53%",
  teamIds: [],
});

const Admin = () => {
  const { can, isSuperAdmin, sessionLogs, userList, workspaces, upsertWorkspace, deleteWorkspace } = useAuth();
  const { automations, documents, auditLog } = useData();
  const [workspaceEditor, setWorkspaceEditor] = useState<Workspace | null>(null);
  if (!can("admin.access")) return <AccessDenied module="Admin Panel" />;

  const workspaceMembers = useMemo(
    () =>
      Object.fromEntries(
        workspaces.map((workspace) => [
          workspace.id,
          userList.filter((user) => (user.workspaceIds ?? []).includes(workspace.id)),
        ])
      ),
    [userList, workspaces]
  );

  const saveWorkspace = () => {
    if (!workspaceEditor) return;
    if (!workspaceEditor.name.trim() || workspaceEditor.teamIds.length === 0) return;
    upsertWorkspace({
      ...workspaceEditor,
      name: workspaceEditor.name.trim(),
      shortName: workspaceEditor.shortName.trim() || workspaceEditor.name.trim(),
      description: workspaceEditor.description.trim(),
    });
    setWorkspaceEditor(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="System-wide control, permissions, storage and audit." />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className={isSuperAdmin ? "grid w-full max-w-md grid-cols-2" : "grid w-full max-w-[220px] grid-cols-1"}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="sessions">User Sessions</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <StatTile label="Users" value={userList.length} icon={Users} tone="text-primary" />
            <StatTile label="Automations" value={automations.length} icon={Activity} tone="text-info" />
            <StatTile label="Documents" value={documents.length} icon={HardDrive} tone="text-warning" />
            <StatTile label="Audit events" value={auditLog.length} icon={ShieldAlert} tone="text-success" />
          </div>

          <Card className="overflow-hidden">
            <div className="p-6 border-b border-border flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Permissions matrix</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Capabilities granted to each role across the platform. Editable by Super Admins.</p>
              </div>
              <div className="flex items-center gap-2">
                {ALL_ROLES.map((r) => <RoleBadge key={r} role={r} />)}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3 font-medium w-[260px]">Capability</th>
                    {ALL_ROLES.map((r) => (
                      <th key={r} className="p-3 font-medium text-center whitespace-nowrap">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_GROUPS.map((g) => (
                    <Fragment key={g.group}>
                      <tr className="bg-muted/20 border-t border-border">
                        <td colSpan={ALL_ROLES.length + 1} className="px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
                          {g.group}
                        </td>
                      </tr>
                      {g.caps.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-smooth">
                          <td className="p-3">
                            <div className="text-sm font-medium">{c.label}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{c.id}</div>
                          </td>
                          {ALL_ROLES.map((r) => {
                            const has = ROLE_CAPABILITIES[r].includes(c.id);
                            return (
                              <td key={r} className="p-3 text-center">
                                <span className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-md",
                                  has ? "bg-success/15 text-success" : "bg-muted text-muted-foreground/40"
                                )}>
                                  {has ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-3">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-success/15 text-success"><Check className="h-3 w-3" /></span>
              Granted
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-muted text-muted-foreground/40 ml-2"><Minus className="h-3 w-3" /></span>
              Not granted
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6 lg:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Workspace management</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Create and edit workspaces here. User assignment and company-wide access are managed from User Management.
                  </p>
                </div>
                {can("workspace.manage") && (
                  <Button className="gap-1.5" onClick={() => setWorkspaceEditor(emptyWorkspace())}>
                    <Plus className="h-4 w-4" /> New workspace
                  </Button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {workspaces.map((workspace) => (
                  <div key={workspace.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `hsl(${workspace.color})` }} />
                          <p className="font-medium">{workspace.name}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{workspace.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {workspace.kind === "company" ? "Company-wide" : workspace.kind}
                      </Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {workspace.teamIds.map((teamId) => (
                        <Badge key={teamId} variant="outline" className="text-[10px]">
                          {teams.find((team) => team.id === teamId)?.name ?? teamId}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{workspaceMembers[workspace.id]?.length ?? 0} assigned user(s)</span>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWorkspaceEditor(workspace)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {workspace.kind === "custom" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              const confirmed = window.confirm(`Delete workspace "${workspace.name}"?`);
                              if (!confirmed) return;
                              deleteWorkspace(workspace.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-1">Storage</h3>
              <p className="text-xs text-muted-foreground mb-4">240 GB of 500 GB used</p>
              <Progress value={48} className="h-2 mb-4" />
              <div className="space-y-2 text-xs">
                {[
                  { label: "Documents", n: "120 GB", pct: 25 },
                  { label: "Project files", n: "80 GB", pct: 16 },
                  { label: "Backups", n: "30 GB", pct: 6 },
                  { label: "Other", n: "10 GB", pct: 2 },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-muted-foreground">
                    <span>{s.label}</span><span className="font-medium text-foreground">{s.n}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Module visibility</h3>
              <div className="space-y-3">
                {[
                  { name: "Documents", enabled: true },
                  { name: "Automations", enabled: true },
                  { name: "Approvals", enabled: true },
                  { name: "Workload", enabled: true },
                  { name: "Public sharing", enabled: false },
                ].map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="text-sm">{m.name}</span>
                    <Switch defaultChecked={m.enabled} />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Lock className="h-4 w-4" /> Security</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span>Require 2FA for admins</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><span>Session timeout (30 min)</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between"><span>IP allowlist</span><Switch /></div>
                <div className="flex items-center justify-between"><span>SSO (SAML)</span><Switch /></div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Server className="h-4 w-4" /> System health</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "API latency", value: "92 ms", tone: "text-success" },
                  { label: "Uptime (30d)", value: "99.98%", tone: "text-success" },
                  { label: "DB connections", value: "42 / 100", tone: "text-info" },
                  { label: "Background jobs", value: "0 stuck", tone: "text-success" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{s.label}</span>
                    <Badge variant="outline" className={`text-[10px] ${s.tone}`}>{s.value}</Badge>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5"><Database className="h-3.5 w-3.5" /> Run diagnostics</Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="sessions" className="space-y-6">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <StatTile
                label="Sign-ins"
                value={sessionLogs.filter((entry) => entry.action === "Signed in").length}
                icon={LogIn}
                tone="text-success"
              />
              <StatTile
                label="Sign-outs"
                value={sessionLogs.filter((entry) => entry.action === "Signed out").length}
                icon={LogOut}
                tone="text-warning"
              />
              <StatTile label="Tracked users" value={new Set(sessionLogs.map((entry) => entry.userId)).size} icon={Users} tone="text-primary" />
              <StatTile label="Session events" value={sessionLogs.length} icon={ShieldAlert} tone="text-info" />
            </div>

            <Card className="overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h3 className="font-semibold">User Session Logs</h3>
                <p className="mt-1 text-xs text-muted-foreground">Super Admin-only visibility for sign-ins and sign-outs across the portal.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 font-medium">User</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Event</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionLogs.length > 0 ? (
                      sessionLogs.map((entry) => {
                        const eventAt = new Date(entry.at);
                        return (
                          <tr key={entry.id} className="border-t border-border hover:bg-muted/20 transition-smooth">
                            <td className="p-3 font-medium">{entry.userName}</td>
                            <td className="p-3"><RoleBadge role={entry.userRole} /></td>
                            <td className="p-3">
                              <Badge variant="outline" className={cn("text-[10px]", entry.action === "Signed in" ? "text-success border-success/20 bg-success/10" : "text-warning border-warning/20 bg-warning/10")}>
                                {entry.action}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{eventAt.toLocaleDateString()}</td>
                            <td className="p-3 text-xs text-muted-foreground">{eventAt.toLocaleTimeString()}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                          No session activity recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!workspaceEditor} onOpenChange={(open) => !open && setWorkspaceEditor(null)}>
        <DialogContent className="max-w-2xl">
          {workspaceEditor && (
            <>
              <DialogHeader>
                <DialogTitle>{workspaces.some((workspace) => workspace.id === workspaceEditor.id) ? "Edit workspace" : "Create workspace"}</DialogTitle>
                <DialogDescription>
                  Department workspaces stay scoped to their assigned teams. Company-wide access should only be granted from User Management.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Workspace name</Label>
                  <Input value={workspaceEditor.name} onChange={(event) => setWorkspaceEditor({ ...workspaceEditor, name: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Short name</Label>
                  <Input value={workspaceEditor.shortName} onChange={(event) => setWorkspaceEditor({ ...workspaceEditor, shortName: event.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea rows={3} value={workspaceEditor.description} onChange={(event) => setWorkspaceEditor({ ...workspaceEditor, description: event.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Departments included</Label>
                  <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                    {teams.map((team) => {
                      const checked = workspaceEditor.teamIds.includes(team.id);
                      return (
                        <label key={team.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const teamIds = value
                                ? [...new Set([...workspaceEditor.teamIds, team.id])]
                                : workspaceEditor.teamIds.filter((item) => item !== team.id);
                              setWorkspaceEditor({ ...workspaceEditor, teamIds: teamIds as TeamId[] });
                            }}
                            disabled={workspaceEditor.kind === "company"}
                          />
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `hsl(${team.color})` }} />
                          {team.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setWorkspaceEditor(null)}>Cancel</Button>
                <Button onClick={saveWorkspace}>Save workspace</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
