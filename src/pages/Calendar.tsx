import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Users, Plus } from "lucide-react";
import { calendarEvents, teams, type CalendarEvent } from "@/data/mock";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";

const TYPE_TONE: Record<CalendarEvent["type"], string> = {
  Deadline: "bg-destructive/10 text-destructive border-destructive/20",
  Meeting: "bg-info/10 text-info border-info/20",
  Milestone: "bg-primary/10 text-primary border-primary/20",
  Leave: "bg-warning/10 text-warning border-warning/20",
};

const TYPE_DOT: Record<CalendarEvent["type"], string> = {
  Deadline: "bg-destructive",
  Meeting: "bg-info",
  Milestone: "bg-primary",
  Leave: "bg-warning",
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

const Calendar = () => {
  const { visibleTeams } = useAuth();
  const [cursor, setCursor] = useState(new Date(2025, 3, 1)); // April 2025
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [filterType, setFilterType] = useState<CalendarEvent["type"] | "all">("all");

  const events = useMemo(
    () => calendarEvents.filter((e) => (!e.team || visibleTeams.includes(e.team)) && (filterType === "all" || e.type === filterType)),
    [visibleTeams, filterType]
  );
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach((e) => { (m.get(e.date) ?? m.set(e.date, []).get(e.date)!).push(e); });
    return m;
  }, [events]);

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const first = startOfMonth(cursor);
  const total = daysInMonth(cursor);
  const offset = first.getDay(); // Sun = 0

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Deadlines, meetings, milestones and team schedules in one view."
        actions={
          <Button className="gradient-primary text-primary-foreground gap-1.5"><Plus className="h-4 w-4" /> New event</Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-base font-semibold tracking-tight min-w-[160px] text-center">{monthLabel}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="ml-2 h-8" onClick={() => setCursor(new Date(2025, 3, 1))}>Today</Button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {(["month","week","agenda"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("px-3 h-7 rounded-md text-xs font-medium capitalize transition-smooth",
                view === v ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>{v}</button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {(["all","Deadline","Meeting","Milestone","Leave"] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t as any)}
                className={cn("h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth flex items-center gap-1.5",
                  filterType === t ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                {t !== "all" && <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOT[t as CalendarEvent["type"]])} />}
                {t === "all" ? "All" : t}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <div>
            <div className="grid grid-cols-7 gap-px text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="px-2 py-1.5">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {cells.map((d, i) => {
                if (!d) return <div key={i} className="bg-muted/20 min-h-[110px]" />;
                const iso = d.toISOString().slice(0, 10);
                const evs = byDate.get(iso) ?? [];
                const isToday = d.getTime() === today.getTime();
                return (
                  <div key={i} className={cn("bg-background min-h-[110px] p-2 transition-smooth hover:bg-muted/30", isToday && "ring-2 ring-primary/40 ring-inset")}>
                    <div className={cn("text-xs font-medium mb-1", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</div>
                    <div className="space-y-1">
                      {evs.slice(0, 3).map((e) => (
                        <div key={e.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition", TYPE_TONE[e.type])}>
                          {e.title}
                        </div>
                      ))}
                      {evs.length > 3 && <div className="text-[10px] text-muted-foreground">+{evs.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view !== "month" && (
          <div className="space-y-2">
            {events.map((e) => {
              const team = teams.find((t) => t.id === e.team);
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-smooth">
                  <div className={cn("h-8 w-1 rounded-full", TYPE_DOT[e.type])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {e.date}</span>
                      {team && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {team.name}</span>}
                      {e.attendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.attendees.length}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[e.type])}>{e.type}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Calendar;