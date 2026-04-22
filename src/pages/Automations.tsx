import { useState } from "react";
import { Workflow, Plus, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useData } from "@/store/DataContext";

const Automations = () => {
  const { automations, toggleAutomation } = useData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");

  const rules = automations;
  const totalRuns = rules.reduce((sum, rule) => sum + rule.runs, 0);
  const errors = rules.reduce((sum, rule) => sum + rule.errors, 0);
  const enabled = rules.filter((rule) => rule.enabled).length;

  const createRule = () => {
    if (!name.trim() || !trigger.trim() || !action.trim()) {
      return toast.error("Name, trigger, and action are required.");
    }
    toast.message("Automation creation UI is ready; persistence for custom rules is next.");
    setName("");
    setTrigger("");
    setAction("");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automations"
        description="Trigger-based workflows, scheduled rules, and run logs."
        actions={<Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New automation</Button>}
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Active rules" value={enabled} icon={Zap} tone="text-primary" />
        <StatTile label="Total runs" value={totalRuns} icon={Workflow} tone="text-info" />
        <StatTile label="Errors (7d)" value={errors} icon={AlertTriangle} tone="text-destructive" />
        <StatTile label="Healthy rules" value={rules.length - errors} icon={CheckCircle2} tone="text-success" />
      </div>

      <div className="grid gap-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-4 flex items-start gap-4">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", rule.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <Workflow className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium">{rule.name}</p>
                {rule.errors > 0 && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">{rule.errors} error</Badge>}
              </div>
              <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">When:</span> {rule.trigger}</p>
              <p className="text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Then:</span> {rule.action}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last run {rule.lastRun}</span>
                <span>{rule.runs} total runs</span>
              </div>
            </div>
            <Switch checked={rule.enabled} onCheckedChange={() => { toggleAutomation(rule.id); toast.success(rule.enabled ? "Automation paused" : "Automation enabled"); }} />
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New automation</DialogTitle>
            <DialogDescription>Draft a workflow rule for the portal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Notify finance on overdue invoice" />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Input value={trigger} onChange={(e) => setTrigger(e.target.value)} placeholder="Invoice overdue > 24h" />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Send alert to bookkeeping lead" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={createRule}>Save draft</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Automations;
