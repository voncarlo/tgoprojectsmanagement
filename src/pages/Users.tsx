import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, KeyRound, Pencil, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { teams, type ModuleKey, type Role, type TeamId, type User } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/portal/PageHeader";
import { ALL_ROLES, ROLE_MODULES } from "@/auth/permissions";
import { RoleBadge } from "@/components/rbac/RoleBadge";

const ALL_MODULES: { id: ModuleKey; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "reports", label: "Reports" },
  { id: "teams", label: "Teams" },
  { id: "users", label: "User Management" },
  { id: "settings", label: "Settings" },
];

const ROLES: Role[] = ALL_ROLES;

const emptyUser = (): User => ({
  id: "u" + Math.random().toString(36).slice(2, 8),
  name: "",
  email: "",
  role: "Staff",
  team: "dispatch",
  teams: [],
  modules: ["dashboard", "tasks", "projects", "teams"],
  status: "Active",
  initials: "··",
  lastActive: "Never",
});

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "··";

const Users = () => {
  const { isAdmin, isSuperAdmin, userList, setUserList, currentUser } = useAuth();
  const [q, setQ] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [pwd, setPwd] = useState("");

  const filtered = useMemo(
    () =>
      userList.filter(
        (u) =>
          (q === "" || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())) &&
          (teamFilter === "all" || u.teams.includes(teamFilter as TeamId)) &&
          (roleFilter === "all" || u.role === roleFilter)
      ),
    [userList, q, teamFilter, roleFilter]
  );

  const upsert = (u: User) => {
    const next = { ...u, initials: initialsOf(u.name) };
    if (next.teams.length === 0) next.teams = [next.team];
    if (!next.teams.includes(next.team)) next.team = next.teams[0];
    const exists = userList.some((x) => x.id === u.id);
    setUserList(exists ? userList.map((x) => (x.id === u.id ? next : x)) : [...userList, next]);
    toast.success(exists ? "User updated" : "User created");
    setEditing(null);
  };

  const toggleStatus = (u: User) => {
    if (u.id === currentUser.id) return toast.error("You cannot deactivate your own account.");
    setUserList(userList.map((x) => (x.id === u.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)));
    toast.success(`Account ${u.status === "Active" ? "deactivated" : "reactivated"}`);
  };

  const doReset = () => {
    if (!resetting || pwd.length < 6) return toast.error("Password must be at least 6 characters.");
    toast.success(`Password reset for ${resetting.name}`);
    setResetting(null);
    setPwd("");
  };

  const removeUser = (user: User) => {
    if (user.id === currentUser.id) return toast.error("You cannot remove your own account.");
    const confirmed = window.confirm(`Delete ${user.name}'s account? This cannot be undone.`);
    if (!confirmed) return;
    setUserList(userList.filter((item) => item.id !== user.id));
    toast.success("User account deleted");
  };

  if (!isAdmin) {
    return (
      <Card className="p-10 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <h2 className="text-lg font-semibold">Restricted area</h2>
        <p className="text-sm text-muted-foreground">User Management is available to Admins and Super Admins only.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage accounts, roles, departments, and module access."
        actions={
          <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setEditing(emptyUser())}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or email…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any role</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Departments</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Last active</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{u.initials}</AvatarFallback></Avatar>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.role === "Super Admin" && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><RoleBadge role={u.role} /></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 max-w-[260px]">
                      {u.teams.map((tid) => {
                        const t = teams.find((x) => x.id === tid)!;
                        return (
                          <Badge key={tid} variant="outline" className="text-[10px]" style={{ borderColor: `hsl(${t.color} / 0.3)`, color: `hsl(${t.color})` }}>
                            {t.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", u.status === "Active" ? "bg-success" : "bg-muted-foreground")} />
                      <span className="text-xs">{u.status}</span>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{u.lastActive ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setResetting(u); setPwd(""); }}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => removeUser(u)} disabled={u.id === currentUser.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={u.status === "Active"}
                        onCheckedChange={() => toggleStatus(u)}
                        disabled={u.id === currentUser.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No users match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit / Add dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{userList.some((x) => x.id === editing.id) ? "Edit user" : "Add new user"}</DialogTitle>
                <DialogDescription>Manage profile, role, departments and module access.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={editing.role}
                    onValueChange={(v) => setEditing({ ...editing, role: v as Role })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} disabled={r === "Super Admin" && !isSuperAdmin}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary department</Label>
                  <Select
                    value={editing.team}
                    onValueChange={(v) => setEditing({ ...editing, team: v as TeamId })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Assigned departments</Label>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 rounded-lg border border-border p-3">
                    {teams.map((t) => {
                      const checked = editing.teams.includes(t.id);
                      return (
                        <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const teamsNext = v
                                ? [...editing.teams, t.id]
                                : editing.teams.filter((x) => x !== t.id);
                              setEditing({ ...editing, teams: teamsNext });
                            }}
                          />
                          <span className="h-2 w-2 rounded-full" style={{ background: `hsl(${t.color})` }} />
                          {t.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Module access</Label>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 rounded-lg border border-border p-3">
                    {ALL_MODULES.map((m) => {
                      const checked = editing.modules.includes(m.id);
                      return (
                        <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...editing.modules, m.id]
                                : editing.modules.filter((x) => x !== m.id);
                              setEditing({ ...editing, modules: next });
                            }}
                          />
                          {m.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
                  <div>
                    <div className="text-sm font-medium">Account active</div>
                    <div className="text-xs text-muted-foreground">Inactive users cannot sign in.</div>
                  </div>
                  <Switch
                    checked={editing.status === "Active"}
                    onCheckedChange={(v) => setEditing({ ...editing, status: v ? "Active" : "Inactive" })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button className="gradient-primary text-primary-foreground" onClick={() => upsert(editing)}>Save user</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {resetting?.name}. They will be required to sign in again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New password</Label>
            <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={doReset}>Update password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
