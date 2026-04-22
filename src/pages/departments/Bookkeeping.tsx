import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calculator, FileSignature, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";

const INVOICES = [
  { id: "INV-2041", client: "Acme Corp", amount: 12400, status: "Paid", due: "2025-04-12" },
  { id: "INV-2042", client: "Northwind", amount: 8800, status: "Overdue", due: "2025-04-05" },
  { id: "INV-2043", client: "Globex Inc.", amount: 5600, status: "Sent", due: "2025-04-28" },
  { id: "INV-2044", client: "Stark Industries", amount: 31000, status: "Sent", due: "2025-05-02" },
  { id: "INV-2045", client: "Initech LLC", amount: 4100, status: "Draft", due: "2025-05-08" },
];

const STATUS_TONE: Record<string, string> = {
  Paid: "bg-success/10 text-success border-success/20",
  Sent: "bg-info/10 text-info border-info/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  Draft: "bg-muted text-muted-foreground",
};

const Bookkeeping = () => {
  const total = INVOICES.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Bookkeeping" description="Invoices, budget monitoring, monthly closing." />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="A/R outstanding" value={`$${(total / 1000).toFixed(0)}k`} icon={Calculator} tone="text-primary" />
        <StatTile label="Overdue" value={INVOICES.filter((i) => i.status === "Overdue").length} icon={AlertTriangle} tone="text-destructive" />
        <StatTile label="Sent" value={INVOICES.filter((i) => i.status === "Sent").length} icon={FileSignature} tone="text-info" />
        <StatTile label="Cleared" value={INVOICES.filter((i) => i.status === "Paid").length} icon={CheckCircle2} tone="text-success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-left p-3 font-medium">Invoice</th><th className="text-left p-3 font-medium">Client</th><th className="text-left p-3 font-medium">Status</th><th className="text-right p-3 font-medium">Due</th><th className="text-right p-3 font-medium">Amount</th></tr>
            </thead>
            <tbody>
              {INVOICES.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                  <td className="p-3 font-mono text-xs">{i.id}</td>
                  <td className="p-3 text-sm font-medium">{i.client}</td>
                  <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[i.status])}>{i.status}</Badge></td>
                  <td className="p-3 text-xs text-right text-muted-foreground">{i.due}</td>
                  <td className="p-3 text-xs text-right font-medium">${i.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Monthly close — April</h3>
          <Progress value={62} className="h-2 mb-4" />
          <div className="space-y-2 text-xs">
            {[["Bank reconciliation", true], ["Vendor invoices", true], ["Payroll posting", true], ["Revenue recognition", false], ["Variance review", false], ["Final review & lock", false]].map(([l, d]) => (
              <div key={l as string} className="flex items-center gap-2"><div className={cn("h-3.5 w-3.5 rounded-full border-2", d ? "bg-primary border-primary" : "border-border")} /><span className={cn(d && "line-through text-muted-foreground")}>{l}</span></div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Bookkeeping;