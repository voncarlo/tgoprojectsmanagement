import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, BellOff } from "lucide-react";
import { useData } from "@/store/DataContext";
import { PageHeader } from "@/components/portal/PageHeader";
import { EmptyState } from "@/components/portal/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Notifications = () => {
  const { notifications, markAllRead } = useData();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const list = useMemo(() => notifications.filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.read : n.read
  ), [notifications, filter]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Mentions, assignments, approval requests and automation alerts."
        actions={
          <Button variant="outline" className="gap-1.5" onClick={() => { markAllRead(); toast.success("All notifications marked as read"); }}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {([["all", `All (${notifications.length})`], ["unread", `Unread (${unread})`], ["read", "Read"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("px-3 h-7 rounded-md text-xs font-medium transition-smooth",
            filter === k ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>{label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={BellOff} title="You're all caught up" description="New notifications will appear here." />
      ) : (
        <Card className="divide-y divide-border">
          {list.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 p-4 hover:bg-muted/30 transition-smooth", !n.read && "bg-primary/[0.03]")}>
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                !n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {n.user.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-foreground">{n.user}</span>{" "}
                  <span className="text-muted-foreground">{n.action}</span>{" "}
                  <span className="font-medium text-foreground">{n.target}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{n.time}</p>
              </div>
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default Notifications;