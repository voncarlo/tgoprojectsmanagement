import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, TrendingUp, Heart, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";

const ACCOUNTS = [
  { name: "Acme Corp", health: "Healthy", arr: 142000, owner: "Von Carlo", lastTouch: "2d ago" },
  { name: "Northwind Logistics", health: "At Risk", arr: 88000, owner: "Daniel Park", lastTouch: "9d ago" },
  { name: "Stark Industries", health: "Healthy", arr: 320000, owner: "Maria Santos", lastTouch: "Yesterday" },
  { name: "Globex Inc.", health: "Healthy", arr: 56000, owner: "Von Carlo", lastTouch: "1w ago" },
  { name: "Initech LLC", health: "Churn risk", arr: 41000, owner: "Daniel Park", lastTouch: "3w ago" },
];

const TONE: Record<string, string> = {
  Healthy: "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Churn risk": "bg-destructive/10 text-destructive border-destructive/20",
};

const Clients = () => (
  <div className="space-y-6">
    <PageHeader title="Clients" description="Accounts, health, ARR, and relationship history." actions={<Button className="gradient-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> New account</Button>} />
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <StatTile label="Active accounts" value={ACCOUNTS.length} icon={Building2} tone="text-primary" />
      <StatTile label="Total ARR" value={`$${(ACCOUNTS.reduce((a,b)=>a+b.arr,0)/1000).toFixed(0)}k`} icon={TrendingUp} tone="text-success" />
      <StatTile label="Healthy" value={ACCOUNTS.filter(a=>a.health==="Healthy").length} icon={Heart} tone="text-success" />
      <StatTile label="At risk" value={ACCOUNTS.filter(a=>a.health!=="Healthy").length} icon={AlertTriangle} tone="text-destructive" />
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ACCOUNTS.map((a) => (
        <Card key={a.name} className="p-5 card-interactive cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2"><div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Building2 className="h-4 w-4" /></div><div><p className="text-sm font-semibold">{a.name}</p><p className="text-[11px] text-muted-foreground">{a.owner}</p></div></div>
            <Badge variant="outline" className={cn("text-[10px]", TONE[a.health])}>{a.health}</Badge>
          </div>
          <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">ARR</p><p className="text-lg font-semibold">${a.arr.toLocaleString()}</p></div><span className="text-[11px] text-muted-foreground">Last touch {a.lastTouch}</span></div>
        </Card>
      ))}
    </div>
  </div>
);

export default Clients;
