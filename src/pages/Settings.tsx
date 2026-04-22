import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { teams, type ModuleKey, type Role } from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const Section = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
  <Card className="p-6">
    <div className="mb-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
    {children}
  </Card>
);

const MODULES: { id: ModuleKey; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "tasks", label: "Tasks" },
  { id: "projects", label: "Projects" },
  { id: "reports", label: "Reports" },
  { id: "teams", label: "Teams" },
  { id: "users", label: "User Management" },
  { id: "settings", label: "Settings" },
];

const ROLE_DEFAULTS: Record<Role, ModuleKey[]> = {
  "Super Admin": ["dashboard", "tasks", "projects", "reports", "teams", "users", "settings"],
  "Admin":       ["dashboard", "tasks", "projects", "reports", "teams", "users", "settings"],
  "Manager":     ["dashboard", "tasks", "projects", "reports", "teams"],
  "Team Lead":   ["dashboard", "tasks", "projects", "reports", "teams"],
  "Staff":       ["dashboard", "tasks", "projects", "teams"],
  "Viewer":      ["dashboard", "projects", "reports"],
};

const Settings = () => {
  const { currentUser, setCurrentUser, isAdmin, isSuperAdmin, userList, setUserList } = useAuth();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);

  const [permMatrix, setPermMatrix] = useState<Record<Role, Record<ModuleKey, boolean>>>(() => {
    const obj = {} as Record<Role, Record<ModuleKey, boolean>>;
    (Object.keys(ROLE_DEFAULTS) as Role[]).forEach((r) => {
      obj[r] = {} as Record<ModuleKey, boolean>;
      MODULES.forEach((m) => (obj[r][m.id] = ROLE_DEFAULTS[r].includes(m.id)));
    });
    return obj;
  });

  const [deptVisible, setDeptVisible] = useState<Record<string, boolean>>(
    () => Object.fromEntries(teams.map((t) => [t.id, true]))
  );

  const [notif, setNotif] = useState({ digest: true, mentions: true, projects: true, deadlines: false });
  const [twoFA, setTwoFA] = useState(false);
  const [compact, setCompact] = useState(false);
  const [weekly, setWeekly] = useState(true);

  const [pwdOld, setPwdOld] = useState("");
  const [pwdNew, setPwdNew] = useState("");

  const saveProfile = () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    const updated = { ...currentUser, name: name.trim(), email: email.trim(), initials: name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase() };
    setCurrentUser(updated);
    setUserList(userList.map((u) => (u.id === currentUser.id ? updated : u)));
    toast.success("Profile saved");
  };

  const updatePassword = () => {
    if (pwdOld.length < 1) return toast.error("Enter your current password");
    if (pwdNew.length < 8) return toast.error("New password must be at least 8 characters");
    setPwdOld(""); setPwdNew("");
    toast.success("Password updated");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <Section title="Profile" desc="Update your account details and contact info.">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{currentUser.initials}</AvatarFallback></Avatar>
            <div>
              <Button size="sm" variant="outline" onClick={() => toast("Avatar upload coming soon")}>Change avatar</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG or PNG, up to 2MB.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Primary department</Label><Input defaultValue={teams.find((t) => t.id === currentUser.team)?.name ?? ""} disabled /></div>
            <div className="space-y-2"><Label>Role</Label><Input defaultValue={currentUser.role} disabled /></div>
          </div>
          <div className="flex justify-end mt-5"><Button className="gradient-primary text-primary-foreground" onClick={saveProfile}>Save changes</Button></div>
        </Section>

        {isAdmin && (
          <Section title="Roles & permissions" desc="Default module access per role. Per-user overrides live in User Management.">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left p-2 font-medium">Role</th>
                    {MODULES.map((m) => <th key={m.id} className="p-2 font-medium text-center">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(ROLE_DEFAULTS) as Role[]).map((r) => (
                    <tr key={r} className="border-t border-border">
                      <td className="p-2 font-medium">{r}</td>
                      {MODULES.map((m) => (
                        <td key={m.id} className="p-2 text-center">
                          <Checkbox
                            checked={permMatrix[r][m.id]}
                            onCheckedChange={(v) => {
                              setPermMatrix((s) => ({ ...s, [r]: { ...s[r], [m.id]: !!v } }));
                              toast.success(`${r}: ${m.label} ${v ? "enabled" : "disabled"}`);
                            }}
                            disabled={r === "Super Admin" || (!isSuperAdmin && r === "Admin")}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">{userList.length} user accounts</div>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link to="/users"><ShieldCheck className="h-3.5 w-3.5" /> Open User Management</Link>
              </Button>
            </div>
          </Section>
        )}

        {isAdmin && (
          <Section title="Department access" desc="Control which departments are visible to each role.">
            <div className="space-y-2">
              {teams.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(${t.color})` }} />
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">Lead: {t.lead}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Visible to staff</span>
                    <Switch
                      checked={deptVisible[t.id]}
                      onCheckedChange={(v) => {
                        setDeptVisible((s) => ({ ...s, [t.id]: v }));
                        toast.success(`${t.name} ${v ? "visible" : "hidden"}`);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <div className="space-y-5">
        <Section title="Notifications" desc="Choose what updates you receive.">
          {[
            { k: "digest", l: "Email digest", d: "Daily summary of activity" },
            { k: "mentions", l: "Mentions", d: "When someone @mentions you" },
            { k: "projects", l: "Project updates", d: "Status changes on your projects" },
            { k: "deadlines", l: "Deadline reminders", d: "24h before any due date" },
          ].map((n, i, arr) => (
            <div key={n.k}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{n.l}</div>
                  <div className="text-xs text-muted-foreground">{n.d}</div>
                </div>
                <Switch
                  checked={(notif as any)[n.k]}
                  onCheckedChange={(v) => {
                    setNotif((s) => ({ ...s, [n.k]: v }));
                    toast.success(`${n.l} ${v ? "enabled" : "disabled"}`);
                  }}
                />
              </div>
              {i < arr.length - 1 && <Separator />}
            </div>
          ))}
        </Section>

        <Section title="Account security" desc="Change your password and session controls.">
          <div className="space-y-3">
            <div className="space-y-2"><Label>Current password</Label><Input type="password" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} placeholder="••••••••" /></div>
            <div className="space-y-2"><Label>New password</Label><Input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="Min 8 characters" /></div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-sm font-medium">Two-factor auth</div>
                <div className="text-xs text-muted-foreground">Extra layer at sign-in</div>
              </div>
              <Switch checked={twoFA} onCheckedChange={(v) => { setTwoFA(v); toast.success(`2FA ${v ? "enabled" : "disabled"}`); }} />
            </div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={updatePassword}>Update password</Button>
          </div>
        </Section>

        <Section title="Preferences" desc="System-wide configuration.">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium">Compact mode</div><div className="text-xs text-muted-foreground">Denser tables and lists</div></div>
              <Switch checked={compact} onCheckedChange={(v) => { setCompact(v); toast.success(`Compact mode ${v ? "on" : "off"}`); }} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div><div className="text-sm font-medium">Weekly report</div><div className="text-xs text-muted-foreground">Email Monday 8am</div></div>
              <Switch checked={weekly} onCheckedChange={(v) => { setWeekly(v); toast.success(`Weekly report ${v ? "enabled" : "disabled"}`); }} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default Settings;
