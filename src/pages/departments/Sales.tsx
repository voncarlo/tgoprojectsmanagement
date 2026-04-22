import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, FileSignature, DollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const PIPELINE = [
  { name: "Acme Corp", stage: "Proposal", value: 84000, prob: 70, owner: "Von Carlo" },
  { name: "Northwind Logistics", stage: "Negotiation", value: 132000, prob: 85, owner: "Von Carlo" },
  { name: "Globex Inc.", stage: "Discovery", value: 56000, prob: 30, owner: "Daniel Park" },
  { name: "Initech LLC", stage: "Proposal", value: 41000, prob: 60, owner: "Von Carlo" },
  { name: "Stark Industries", stage: "Closing", value: 220000, prob: 92, owner: "James Steffan" },
];

const STAGE_TONE: Record<string, string> = {
  Discovery: "bg-muted text-muted-foreground",
  Proposal: "bg-info/10 text-info border-info/20",
  Negotiation: "bg-warning/10 text-warning border-warning/20",
  Closing: "bg-primary/10 text-primary border-primary/20",
};

const TREND = [
  { week: "W1", revenue: 84 }, { week: "W2", revenue: 92 }, { week: "W3", revenue: 110 },
  { week: "W4", revenue: 102 }, { week: "W5", revenue: 138 }, { week: "W6", revenue: 156 },
];

const Sales = () => {
  const total = PIPELINE.reduce((a, b) => a + b.value, 0);
  const weighted = PIPELINE.reduce((a, b) => a + (b.value * b.prob) / 100, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" description="Leads, opportunities, proposals and analytics." actions={<Button className="gradient-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> New opportunity</Button>} />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatTile label="Open pipeline" value={`$${(total / 1000).toFixed(0)}k`} icon={DollarSign} tone="text-primary" />
        <StatTile label="Weighted" value={`$${(weighted / 1000).toFixed(0)}k`} icon={TrendingUp} tone="text-info" />
        <StatTile label="Q2 target" value="$680k" icon={Target} tone="text-warning" delta="62% to goal" />
        <StatTile label="Proposals out" value={4} icon={FileSignature} tone="text-success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold mb-4">Revenue trend ($k)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={TREND}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Quota attainment</h3>
          <div className="space-y-3">
            {[
              { name: "Von Carlo Asinas", pct: 92 },
              { name: "Daniel Park", pct: 71 },
              { name: "James Steffan", pct: 58 },
            ].map((q) => (
              <div key={q.name}>
                <div className="flex items-center justify-between text-xs mb-1"><span>{q.name}</span><span className={cn("font-medium", q.pct >= 90 ? "text-success" : q.pct >= 60 ? "text-info" : "text-warning")}>{q.pct}%</span></div>
                <Progress value={q.pct} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3 font-medium">Opportunity</th>
              <th className="text-left p-3 font-medium">Stage</th>
              <th className="text-left p-3 font-medium">Owner</th>
              <th className="text-right p-3 font-medium">Probability</th>
              <th className="text-right p-3 font-medium">Value</th>
              <th className="text-right p-3 font-medium">Weighted</th>
            </tr>
          </thead>
          <tbody>
            {PIPELINE.map((p) => (
              <tr key={p.name} className="border-t border-border hover:bg-muted/30 transition-smooth">
                <td className="p-3 font-medium text-sm">{p.name}</td>
                <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", STAGE_TONE[p.stage])}>{p.stage}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{p.owner}</td>
                <td className="p-3 text-xs text-right">{p.prob}%</td>
                <td className="p-3 text-xs text-right font-medium">${p.value.toLocaleString()}</td>
                <td className="p-3 text-xs text-right text-muted-foreground">${Math.round(p.value * p.prob / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Sales;