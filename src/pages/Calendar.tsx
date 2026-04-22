import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, MapPin, Users, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { teams, type CalendarEvent } from "@/data/mock";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";

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

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const Calendar = () => {
  const { visibleTeams } = useAuth();
  const { calendarEvents, addCalendarEvent } = useData();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [filterType, setFilterType] = useState<CalendarEvent["type"] | "all">("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("Meeting");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState<string>("none");

  const events = useMemo(
    () => calendarEvents.filter((event) => (!event.team || visibleTeams.includes(event.team)) && (filterType === "all" || event.type === filterType)),
    [calendarEvents, filterType, visibleTeams]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const existing = map.get(event.date) ?? [];
      map.set(event.date, [...existing, event]);
    });
    return map;
  }, [events]);

  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const first = startOfMonth(cursor);
  const total = daysInMonth(cursor);
  const offset = first.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let day = 1; day <= total; day += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const createEvent = () => {
    if (!title.trim()) return toast.error("Event title is required");
    addCalendarEvent({
      title: title.trim(),
      type: eventType,
      date,
      team: teamId === "none" ? undefined : teamId as CalendarEvent["team"],
    });
    setTitle("");
    setEventType("Meeting");
    setDate(new Date().toISOString().slice(0, 10));
    setTeamId("none");
    setOpen(false);
    toast.success("Event created");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Deadlines, meetings, milestones and team schedules in one view."
        actions={
          <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New event</Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="text-base font-semibold tracking-tight min-w-[160px] text-center">{monthLabel}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="ml-2 h-8" onClick={() => setCursor(new Date())}>Today</Button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {(["month", "week", "agenda"] as const).map((nextView) => (
              <button
                key={nextView}
                onClick={() => setView(nextView)}
                className={cn("px-3 h-7 rounded-md text-xs font-medium capitalize transition-smooth", view === nextView ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
              >
                {nextView}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {(["all", "Deadline", "Meeting", "Milestone", "Leave"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as typeof filterType)}
                className={cn("h-7 px-2.5 rounded-full border text-xs font-medium transition-smooth flex items-center gap-1.5", filterType === type ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}
              >
                {type !== "all" && <span className={cn("h-1.5 w-1.5 rounded-full", TYPE_DOT[type as CalendarEvent["type"]])} />}
                {type === "all" ? "All" : type}
              </button>
            ))}
          </div>
        </div>

        {view === "month" && (
          <div>
            <div className="grid grid-cols-7 gap-px text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="px-2 py-1.5">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {cells.map((value, index) => {
                if (!value) return <div key={index} className="bg-muted/20 min-h-[110px]" />;
                const iso = value.toISOString().slice(0, 10);
                const dayEvents = byDate.get(iso) ?? [];
                const isToday = value.getTime() === today.getTime();
                return (
                  <div key={index} className={cn("bg-background min-h-[110px] p-2 transition-smooth hover:bg-muted/30", isToday && "ring-2 ring-primary/40 ring-inset")}>
                    <div className={cn("text-xs font-medium mb-1", isToday ? "text-primary" : "text-foreground")}>{value.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className={cn("text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer hover:opacity-80 transition", TYPE_TONE[event.type])}>
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view !== "month" && (
          <div className="space-y-2">
            {events.map((event) => {
              const team = teams.find((item) => item.id === event.team);
              return (
                <div key={event.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-smooth">
                  <div className={cn("h-8 w-1 rounded-full", TYPE_DOT[event.type])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {event.date}</span>
                      {team && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {team.name}</span>}
                      {event.attendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.attendees.length}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[event.type])}>{event.type}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New calendar event</DialogTitle>
            <DialogDescription>Add a deadline, meeting, milestone, or leave block.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quarterly review meeting" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEvent["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["Deadline", "Meeting", "Milestone", "Leave"] as const).map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teams.filter((team) => visibleTeams.includes(team.id)).map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={createEvent}>Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
