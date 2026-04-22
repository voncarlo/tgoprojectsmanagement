import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Workflow, Plus, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { automations as seed, type AutomationRule } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Automations = () => {
  const [rules, setRules] = useState<AutomationRule[]>(seed);

  const toggle = (id: string) => {
    setRules((s) => s.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const r = rules.find((x) => x.id === id);
    toast.success(r?.enabled ? "Automation paused" : "Automation enabled");
  };

  const totalRuns = rules.reduce((a, b) => a + b.runs, 0);
  const errors = rules.reduce((a, b) => a + b.errors, 0);
  const enabled = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Trigger-based workflows, scheduled rules, and run logs."
        actions={<Button className="gradient-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> New automation</Button>}
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Active rules" value={enabled} icon={Zap} tone="text-primary" />
        <StatTile label="Total runs" value={totalRuns} icon={Workflow} tone="text-info" />
        <StatTile label="Errors (7d)" value={errors} icon={AlertTriangle} tone="text-destructive" />
        <StatTile label="Healthy rules" value={rules.length - errors} icon={CheckCircle2} tone="text-success" />
      </div>

      <div className="grid gap-3">
        {rules.map((r) => (
          <Card key={r.id} className="p-4 flex items-start gap-4">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
              r.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <Workflow className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{r.name}</p>
                {r.errors > 0 && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{r.errors} error</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">When:</span> {r.trigger}</p>
              <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Then:</span> {r.action}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last run {r.lastRun}</span>
                <span>{r.runs} total runs</span>
              </div>
            </div>
            <Switch checked={r.enabled} onCheckedChange={() => toggle(r.id)} />
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Automations;