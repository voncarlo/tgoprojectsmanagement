import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Truck, MapPin, Phone, Clock, Package, Coffee, Smartphone, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";

const DRIVERS = [
  { name: "Marco D.", route: "Route 14", status: "On-route", onTime: 94, packages: 142, lunch: "12:18", gap: "00:08" },
  { name: "Lila K.", route: "Route 22", status: "On-route", onTime: 88, packages: 118, lunch: "12:42", gap: "00:14" },
  { name: "Theo R.", route: "Route 07", status: "Delayed", onTime: 71, packages: 95, lunch: "—", gap: "00:42" },
  { name: "Priya S.", route: "Route 33", status: "Returning", onTime: 97, packages: 156, lunch: "12:05", gap: "00:04" },
  { name: "Owen B.", route: "Route 19", status: "On-route", onTime: 91, packages: 134, lunch: "12:55", gap: "00:11" },
];

const STATUS_TONE: Record<string, string> = {
  "On-route": "bg-success/10 text-success border-success/20",
  "Delayed": "bg-destructive/10 text-destructive border-destructive/20",
  "Returning": "bg-info/10 text-info border-info/20",
};

const Dispatch = () => (
  <div className="space-y-6">
    <PageHeader
      title="Dispatch Operations"
      description="DVIC, route sheets, load board, DA performance and on-time delivery."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5"><FileSpreadsheet className="h-4 w-4" /> Generate route sheet</Button>
          <Button className="gradient-primary text-primary-foreground gap-1.5"><Download className="h-4 w-4" /> Export</Button>
        </div>
      }
    />

    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <StatTile label="DAs on-route" value={42} icon={Truck} tone="text-info" />
      <StatTile label="On-time %" value="91%" icon={Clock} tone="text-success" delta="+3%" trend="up" />
      <StatTile label="Packages" value="3,842" icon={Package} tone="text-primary" />
      <StatTile label="Time gaps > 30m" value={3} icon={AlertTriangle} tone="text-destructive" />
      <StatTile label="Lunch audit" value="98%" icon={Coffee} tone="text-success" />
      <StatTile label="Phones assigned" value={48} icon={Smartphone} tone="text-foreground" />
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Load board</h3>
          <Badge variant="outline" className="text-[10px]">Live</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Driver</th>
                <th className="text-left p-2 font-medium">Route</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-left p-2 font-medium">On-time</th>
                <th className="text-right p-2 font-medium">Pkgs</th>
                <th className="text-right p-2 font-medium">Lunch</th>
                <th className="text-right p-2 font-medium">Gap</th>
              </tr>
            </thead>
            <tbody>
              {DRIVERS.map((d) => (
                <tr key={d.name} className="border-t border-border hover:bg-muted/30 transition-smooth">
                  <td className="p-2"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">{d.name.split(" ").map((p) => p[0]).join("")}</div><span className="text-xs font-medium">{d.name}</span></div></td>
                  <td className="p-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {d.route}</span></td>
                  <td className="p-2"><Badge variant="outline" className={cn("text-[10px]", STATUS_TONE[d.status])}>{d.status}</Badge></td>
                  <td className="p-2"><div className="flex items-center gap-2"><Progress value={d.onTime} className="h-1.5 w-16" /><span className="text-[11px] text-muted-foreground">{d.onTime}%</span></div></td>
                  <td className="p-2 text-xs text-right">{d.packages}</td>
                  <td className="p-2 text-xs text-right text-muted-foreground">{d.lunch}</td>
                  <td className={cn("p-2 text-xs text-right font-mono", d.gap > "00:30" ? "text-destructive font-medium" : "text-muted-foreground")}>{d.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">DVIC checklist</h3>
        <div className="space-y-2">
          {[
            { label: "Pre-trip vehicle inspections", done: 42, total: 42 },
            { label: "Tire pressure logged", done: 40, total: 42 },
            { label: "Mileage start photo", done: 41, total: 42 },
            { label: "Phone & charger checked", done: 38, total: 42 },
            { label: "Route sheet acknowledged", done: 42, total: 42 },
          ].map((c) => {
            const pct = Math.round((c.done / c.total) * 100);
            return (
              <div key={c.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{c.label}</span><span className={cn("font-medium", pct === 100 ? "text-success" : pct >= 90 ? "text-warning" : "text-destructive")}>{c.done}/{c.total}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4 gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone list</Button>
      </Card>
    </div>
  </div>
);

export default Dispatch;