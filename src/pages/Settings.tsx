import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  { id: "chat", label: "Chat" },
  { id: "notes", label: "Notes" },
  { id: "teams", label: "Teams" },
  { id: "users", label: "User Management" },
  { id: "recycle", label: "Recycle Bin" },
  { id: "settings", label: "Settings" },
];

const ROLE_DEFAULTS: Record<Role, ModuleKey[]> = {
  "Super Admin": ["dashboard", "tasks", "projects", "reports", "chat", "notes", "teams", "users", "recycle", "settings"],
  "Admin":       ["dashboard", "tasks", "projects", "reports", "chat", "notes", "teams", "users", "recycle", "settings"],
  "Manager":     ["dashboard", "tasks", "projects", "reports", "chat", "notes", "teams"],
  "Staff":       ["dashboard", "tasks", "projects", "chat", "notes", "teams"],
};

const cropImageToSquare = (src: string, zoom: number, offsetX: number, offsetY: number, outputSize = 256) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Canvas is not available."));

      const baseScale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight);
      const scaledWidth = image.naturalWidth * baseScale * zoom;
      const scaledHeight = image.naturalHeight * baseScale * zoom;
      const maxShiftX = Math.max(0, (scaledWidth - outputSize) / 2);
      const maxShiftY = Math.max(0, (scaledHeight - outputSize) / 2);
      const drawX = (outputSize - scaledWidth) / 2 + (offsetX / 100) * maxShiftX;
      const drawY = (outputSize - scaledHeight) / 2 + (offsetY / 100) * maxShiftY;

      context.clearRect(0, 0, outputSize, outputSize);
      context.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Could not process that image."));
    image.src = src;
  });

const Settings = () => {
  const { currentUser, updateCurrentUser, isAdmin, isSuperAdmin, userList, updatePassword: savePassword, getTeamLeadNames } = useAuth();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl ?? "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [savingAvatar, setSavingAvatar] = useState(false);

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

  const [notif, setNotif] = useState(currentUser.notificationSettings ?? { enabled: true, digest: true, mentions: true, projects: true, deadlines: true });
  const [twoFA, setTwoFA] = useState(false);
  const [compact, setCompact] = useState(false);
  const [weekly, setWeekly] = useState(true);

  const [pwdOld, setPwdOld] = useState("");
  const [pwdNew, setPwdNew] = useState("");

  const saveProfile = () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
    updateCurrentUser({
      name: name.trim(),
      email: email.trim(),
      avatarUrl: avatarUrl || undefined,
      initials: name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase(),
      notificationSettings: notif,
    });
    toast.success("Profile saved");
  };

  const onAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Please choose an image under 2MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = typeof reader.result === "string" ? reader.result : "";
      if (!nextUrl) return toast.error("Could not read that image.");
      setPendingAvatarUrl(nextUrl);
      setAvatarZoom(1);
      setAvatarOffsetX(0);
      setAvatarOffsetY(0);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const applyAvatarCrop = async () => {
    if (!pendingAvatarUrl) return;
    setSavingAvatar(true);
    try {
      const croppedAvatarUrl = await cropImageToSquare(pendingAvatarUrl, avatarZoom, avatarOffsetX, avatarOffsetY);
      setAvatarUrl(croppedAvatarUrl);
      setCropOpen(false);
      setPendingAvatarUrl("");
      toast.success("Profile picture updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that photo.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const updatePassword = () => {
    if (pwdOld.length < 1) return toast.error("Enter your current password");
    if (pwdNew.length < 8) return toast.error("New password must be at least 8 characters");
    const result = savePassword(pwdOld, pwdNew);
    if (!result.ok) return toast.error(result.message ?? "Password update failed");
    setPwdOld(""); setPwdNew("");
    toast.success("Password updated");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-5">
        <Section title="Profile" desc="Update your account details and contact info.">
          <div className="flex items-center gap-4 mb-5">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl} alt={currentUser.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">{currentUser.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Change photo</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAvatarUrl(""); toast.success("Profile picture removed"); }}>Remove photo</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelect} />
              <p className="text-xs text-muted-foreground mt-1">JPG or PNG, up to 2MB. You can zoom and reposition before saving.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Primary department</Label><Input defaultValue={isAdmin ? "Company-level access" : teams.find((t) => t.id === currentUser.team)?.name ?? ""} disabled /></div>
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
                      <div className="text-xs text-muted-foreground">Lead: {getTeamLeadNames(t.id).join(", ") || "Unassigned"}</div>
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
            { k: "enabled", l: "Notifications", d: "Master switch for all in-app notifications" },
            { k: "digest", l: "Email digest", d: "Daily summary of activity" },
            { k: "mentions", l: "Mentions", d: "When someone @mentions you" },
            { k: "projects", l: "Project updates", d: "Status changes on your projects" },
            { k: "deadlines", l: "Deadline reminders", d: "Upcoming task and project due dates" },
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
                    const next = { ...notif, [n.k]: v };
                    setNotif(next);
                    updateCurrentUser({ notificationSettings: next });
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

      <Dialog open={cropOpen} onOpenChange={(open) => {
        if (!savingAvatar) {
          setCropOpen(open);
          if (!open) setPendingAvatarUrl("");
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust profile photo</DialogTitle>
            <DialogDescription>Zoom and reposition your photo before saving it to the profile circle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="relative h-64 w-64 overflow-hidden rounded-full border border-border bg-muted">
                {pendingAvatarUrl ? (
                  <img
                    src={pendingAvatarUrl}
                    alt="Profile crop preview"
                    className="absolute inset-0 h-full w-full select-none object-cover"
                    style={{
                      transform: `translate(${avatarOffsetX}%, ${avatarOffsetY}%) scale(${avatarZoom})`,
                      transformOrigin: "center",
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="avatar-zoom">Zoom</Label>
                <Input
                  id="avatar-zoom"
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.01"
                  value={avatarZoom}
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-offset-x">Move left / right</Label>
                <Input
                  id="avatar-offset-x"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={avatarOffsetX}
                  onChange={(event) => setAvatarOffsetX(Number(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar-offset-y">Move up / down</Label>
                <Input
                  id="avatar-offset-y"
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={avatarOffsetY}
                  onChange={(event) => setAvatarOffsetY(Number(event.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCropOpen(false); setPendingAvatarUrl(""); }} disabled={savingAvatar}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={applyAvatarCrop} disabled={savingAvatar}>
              {savingAvatar ? "Saving..." : "Use photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
