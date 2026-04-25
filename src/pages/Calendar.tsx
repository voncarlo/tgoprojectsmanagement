import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, Trash2, User, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { teams, type CalendarEvent, type CalendarEventType } from "@/data/mock";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const EVENT_TYPES: CalendarEventType[] = ["PTO", "Call-out", "Meeting", "Event", "Deadline", "Birthday", "Anniversary", "Training", "Announcement"];
type CalendarScope = "company" | "workspace";

const TYPE_TONE: Record<CalendarEvent["type"], string> = {
  PTO: "bg-warning/10 text-warning border-warning/20",
  "Call-out": "bg-destructive/10 text-destructive border-destructive/20",
  Meeting: "bg-info/10 text-info border-info/20",
  Event: "bg-primary/10 text-primary border-primary/20",
  Deadline: "bg-destructive/10 text-destructive border-destructive/20",
  Birthday: "bg-primary/10 text-primary border-primary/20",
  Anniversary: "bg-warning/10 text-warning border-warning/20",
  Training: "bg-info/10 text-info border-info/20",
  Announcement: "bg-primary/10 text-primary border-primary/20",
};

const TYPE_DOT: Record<CalendarEvent["type"], string> = {
  PTO: "bg-warning",
  "Call-out": "bg-destructive",
  Meeting: "bg-info",
  Event: "bg-primary",
  Deadline: "bg-destructive",
  Birthday: "bg-primary",
  Anniversary: "bg-warning",
  Training: "bg-info",
  Announcement: "bg-primary",
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const Calendar = () => {
  const { visibleTeams, currentUser, isManager, isAdmin, isSuperAdmin, activeWorkspace } = useAuth();
  const isMobile = useIsMobile();
  const data = useData();
  const {
    calendarEvents,
    allCalendarEvents,
    approvals: approvalItems,
    addCalendarEvent: createCalendarEvent,
    removeCalendarEvent: deleteCalendarEvent,
    requestCalendarPto,
  } = data;
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [filterType, setFilterType] = useState<CalendarEvent["type"] | "all">("all");
  const [scope, setScope] = useState<CalendarScope>("workspace");
  const [open, setOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("Meeting");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState<string>("none");

  const companyEvents = useMemo(
    () => allCalendarEvents.filter((event) => !event.team && (filterType === "all" || event.type === filterType)),
    [allCalendarEvents, filterType]
  );

  const workspaceEvents = useMemo(
    () => calendarEvents.filter((event) => event.team && visibleTeams.includes(event.team) && (filterType === "all" || event.type === filterType)),
    [calendarEvents, filterType, visibleTeams]
  );

  const events = scope === "company" ? companyEvents : workspaceEvents;

  const pendingPtoRequests = useMemo(
    () =>
          approvalItems.filter(
        (approval) =>
          approval.type === "Leave" &&
          (approval.status === "Pending" || approval.status === "Under Review") &&
          visibleTeams.includes(approval.team)
      ),
    [approvalItems, visibleTeams]
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

  useEffect(() => {
    if (isMobile) {
      setView((currentView) => (currentView === "month" ? "agenda" : currentView));
    }
  }, [isMobile]);

  const createEvent = () => {
    if (!title.trim()) return toast.error("Event title is required");

    const eventDraft: Omit<CalendarEvent, "id"> = {
      title: title.trim(),
      type: eventType,
      date,
      team: teamId === "none" ? undefined : (teamId as CalendarEvent["team"]),
      createdById: currentUser.id,
      createdByName: currentUser.name,
    };

    if (eventType === "PTO") {
      requestCalendarPto(eventDraft);
      toast.success("PTO request submitted for approval");
    } else {
      createCalendarEvent(eventDraft);
      toast.success("Event created");
    }

    setTitle("");
    setEventType("Meeting");
    setDate(new Date().toISOString().slice(0, 10));
    setTeamId("none");
    setOpen(false);
  };

  const canDeleteEvent =
    !!selectedEvent &&
    (selectedEvent.createdById === currentUser.id || isManager || isAdmin || isSuperAdmin);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="PTO, call-outs, meetings, events, and deadlines in one calendar. PTO entries require approval before they appear here."
        actions={
          <Button className="gradient-primary w-full gap-1.5 text-primary-foreground sm:w-auto" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New entry</Button>
        }
      />

      {pendingPtoRequests.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-medium">Pending PTO requests</p>
          <p className="text-xs text-muted-foreground mt-1">
            PTO entries are posted to the calendar only after manager, admin, or super admin approval.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingPtoRequests.map((approval) => (
              <Badge key={approval.id} variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                {approval.requester} · {approval.submitted}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <h2 className="min-w-[160px] flex-1 text-center text-base font-semibold tracking-tight sm:flex-none">{monthLabel}</h2>
            <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="ml-2 h-8" onClick={() => setCursor(new Date())}>Today</Button>
          </div>

          <div className="flex w-full items-center gap-1 rounded-lg bg-muted/50 p-1 sm:w-auto">
            {([
              { key: "workspace", label: activeWorkspace?.shortName ? `${activeWorkspace.shortName} Calendar` : "Team Calendar" },
              { key: "company", label: "Company Calendar" },
            ] as const).map((option) => (
              <button
                key={option.key}
                onClick={() => setScope(option.key)}
                className={cn("h-7 flex-1 rounded-md px-3 text-xs font-medium transition-smooth sm:flex-none", scope === option.key ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex w-full items-center gap-1 rounded-lg bg-muted/50 p-1 sm:w-auto">
            {(["month", "week", "agenda"] as const).map((nextView) => (
              <button
                key={nextView}
                onClick={() => setView(nextView)}
                className={cn("h-7 flex-1 rounded-md px-3 text-xs font-medium capitalize transition-smooth sm:flex-none", view === nextView ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
              >
                {nextView}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {(["all", ...EVENT_TYPES] as const).map((type) => (
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
          <div className={cn(isMobile && "overflow-x-auto pb-2")}>
            <div className="grid grid-cols-7 gap-px text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className={cn("px-2 py-1.5", isMobile && "min-w-[6rem]")}>{day}</div>)}
            </div>
            <div className={cn("grid grid-cols-7 gap-px rounded-lg bg-border overflow-hidden", isMobile && "min-w-[42rem]")}>
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
                        <button
                          type="button"
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={cn("w-full text-left text-[10px] px-1.5 py-0.5 rounded border hover:opacity-80 transition", TYPE_TONE[event.type])}
                        >
                          <div className="truncate">{event.title}</div>
                          <div className="truncate opacity-80">by {event.createdByName}</div>
                        </button>
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
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-smooth text-left"
                >
                  <div className={cn("h-8 w-1 rounded-full", TYPE_DOT[event.type])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {event.date}</span>
                  {team ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {team.name}</span> : <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Company-wide</span>}
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {event.createdByName}</span>
                      {event.attendees && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.attendees.length}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[event.type])}>{event.type}</Badge>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New calendar entry</DialogTitle>
            <DialogDescription>Add a PTO request, call-out, meeting, event, or deadline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quarterly review meeting" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEvent["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((value) => (
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
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              {eventType === "PTO"
                ? "PTO requests go to Approvals first. They will only appear on the calendar after approval by a manager, admin, or super admin."
                : `This ${eventType.toLowerCase()} entry will be posted immediately and shown with your name.`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={createEvent}>
              {eventType === "PTO" ? "Submit for approval" : "Save entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!selectedEvent} onOpenChange={(isOpen) => !isOpen && setSelectedEvent(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedEvent.title}</SheetTitle>
                <SheetDescription>{selectedEvent.type} on {selectedEvent.date}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]", TYPE_TONE[selectedEvent.type])}>{selectedEvent.type}</Badge>
                </div>
                <div className="text-sm space-y-2">
                  <p className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Posted by <span className="text-foreground font-medium">{selectedEvent.createdByName}</span></p>
                  <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="h-4 w-4" /> {selectedEvent.date}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {selectedEvent.team ? teams.find((team) => team.id === selectedEvent.team)?.name : "Company-wide"}</p>
                </div>
                {canDeleteEvent && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      deleteCalendarEvent(selectedEvent.id);
                      toast.success("Calendar entry deleted");
                      setSelectedEvent(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete entry
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Calendar;
