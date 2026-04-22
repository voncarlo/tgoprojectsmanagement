import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Wallet, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";

const CHECKLIST = [
  { label: "Import timesheets", done: true },
  { label: "Validate overtime entries", done: true },
  { label: "Apply tax tables", done: true },
  { label: "Run pre-flight check", done: false },
  { label: "Manager approvals", done: false },
  { label: "Submit to bank", done: false },
];

const ISSUES = [
  { who: "Marco D.", issue: "Missing 4h on Apr 16", severity: "High" },
  { who: "Lila K.", issue: "Overtime threshold flagged", severity: "Medium" },
  { who: "Theo R.", issue: "PTO not yet approved", severity: "Low" },
];

const SEV_TONE: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-muted text-muted-foreground",
};

const Payroll = () => {
  const done = CHECKLIST.filter((c) => c.done).length;
  const pct = Math.round((done / CHECKLIST.length) * 100);
  return (
    <div className="space-y-6">
      <PageHeader title="Payroll" description="Processing checklist, timesheet approvals and salary status." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Cycle progress" value={`${pct}%`} icon={Wallet} tone="text-primary" />
        <StatTile label="Pending timesheets" value={6} icon={Clock} tone="text-warning" />
        <StatTile label="Open issues" value={ISSUES.length} icon={AlertTriangle} tone="text-destructive" />
        <StatTile label="Cleared this cycle" value={42} icon={CheckCircle2} tone="text-success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">April cycle checklist</h3><Badge variant="outline" className="text-[10px]">{done}/{CHECKLIST.length}</Badge></div>
          <Progress value={pct} className="h-2 mb-4" />
          <div className="space-y-2">
            {CHECKLIST.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-sm"><div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center", c.done ? "bg-primary border-primary" : "border-border")}>{c.done && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}</div><span className={cn(c.done && "line-through text-muted-foreground")}>{c.label}</span></div>
            ))}
          </div>
          <Button className="w-full mt-4 gradient-primary text-primary-foreground">Continue cycle</Button>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Open payroll issues</h3>
          <div className="space-y-2">
            {ISSUES.map((i) => (
              <div key={i.who} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-smooth">
                <div><p className="text-sm font-medium">{i.who}</p><p className="text-[11px] text-muted-foreground">{i.issue}</p></div>
                <Badge variant="outline" className={cn("text-[10px]", SEV_TONE[i.severity])}>{i.severity}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Payroll;