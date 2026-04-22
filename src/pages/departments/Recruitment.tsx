import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, CalendarDays, Users, Award } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatTile } from "@/components/portal/StatTile";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "applied", label: "Applied", count: 48 },
  { id: "screen", label: "Phone Screen", count: 22 },
  { id: "interview", label: "Interview", count: 12 },
  { id: "offer", label: "Offer", count: 5 },
  { id: "hired", label: "Hired", count: 3 },
];

const CANDIDATES: Record<string, { name: string; role: string; rating: number }[]> = {
  applied: [
    { name: "Maya Chen", role: "Backend Eng", rating: 4 },
    { name: "Tomás Lin", role: "DevOps", rating: 3 },
    { name: "Aria Patel", role: "Backend Eng", rating: 5 },
  ],
  screen: [
    { name: "Ben Hart", role: "SRE", rating: 4 },
    { name: "Yuki Mori", role: "Backend Eng", rating: 5 },
  ],
  interview: [
    { name: "Olive Park", role: "Senior Backend", rating: 5 },
    { name: "Rafa Costa", role: "Backend Eng", rating: 4 },
  ],
  offer: [{ name: "Kira Schultz", role: "Senior Backend", rating: 5 }],
  hired: [{ name: "Jin Wu", role: "Backend Eng", rating: 5 }],
};

const Recruitment = () => (
  <div className="space-y-6">
    <PageHeader title="Recruitment" description="Pipeline, interviews and hiring stages." actions={<Button className="gradient-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> Add candidate</Button>} />

    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <StatTile label="Open roles" value={8} icon={UserPlus} tone="text-primary" />
      <StatTile label="In pipeline" value={CANDIDATES && Object.values(CANDIDATES).reduce((a, b) => a + b.length, 0)} icon={Users} tone="text-info" />
      <StatTile label="Interviews this week" value={12} icon={CalendarDays} tone="text-warning" />
      <StatTile label="Offers extended" value={5} icon={Award} tone="text-success" />
    </div>

    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
      {STAGES.map((s) => (
        <div key={s.id} className="rounded-xl border border-border/60 bg-muted/40 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
            <Badge variant="secondary" className="text-[10px] h-5">{s.count}</Badge>
          </div>
          <div className="space-y-2 flex-1">
            {(CANDIDATES[s.id] ?? []).map((c) => (
              <div key={c.name} className="bg-background border border-border/60 rounded-lg p-3 hover:shadow-elegant transition-smooth cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center">{c.name.split(" ").map((p) => p[0]).join("")}</div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{c.name}</p><p className="text-[10px] text-muted-foreground truncate">{c.role}</p></div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (<span key={i} className={cn("h-1.5 w-4 rounded-sm", i < c.rating ? "bg-primary" : "bg-muted")} />))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Recruitment;