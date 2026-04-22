import { Card } from "@/components/ui/card";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ShieldAlert, Users, HardDrive, Activity, Database, Server, Lock, Check, Minus,
} from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { useAuth } from "@/auth/AuthContext";
import { ALL_ROLES, CAPABILITY_GROUPS, ROLE_CAPABILITIES } from "@/auth/permissions";
import { RoleBadge } from "@/components/rbac/RoleBadge";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import { cn } from "@/lib/utils";
import { useData } from "@/store/DataContext";

const Admin = () => {
  const { can, userList } = useAuth();
  const { automations, documents, auditLog } = useData();
  if (!can("admin.access")) return <AccessDenied module="Admin Panel" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Panel" description="System-wide control, permissions, storage and audit." />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Users" value={userList.length} icon={Users} tone="text-primary" />
        <StatTile label="Automations" value={automations.length} icon={Activity} tone="text-info" />
        <StatTile label="Documents" value={documents.length} icon={HardDrive} tone="text-warning" />
        <StatTile label="Audit events" value={auditLog.length} icon={ShieldAlert} tone="text-success" />
      </div>

      {/* Permissions matrix */}
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
    </div>
  );
};

export default Admin;
