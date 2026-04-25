import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, BellOff, Trash2 } from "lucide-react";
import { useData } from "@/store/DataContext";
import { PageHeader } from "@/components/portal/PageHeader";
import { EmptyState } from "@/components/portal/EmptyState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { Link } from "react-router-dom";

const Notifications = () => {
  const { currentUser } = useAuth();
  const { notifications, markAllRead, clearNotifications } = useData();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const notificationsEnabled = currentUser.notificationSettings?.enabled !== false;

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
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => { markAllRead(); toast.success("All notifications marked as read"); }}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
            <Button
              variant="outline"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => {
                clearNotifications();
                toast.success("Notifications cleared");
              }}
            >
              <Trash2 className="h-4 w-4" /> Clear notifications
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1 w-fit">
        {([["all", `All (${notifications.length})`], ["unread", `Unread (${unread})`], ["read", "Read"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={cn("px-3 h-7 rounded-md text-xs font-medium transition-smooth",
            filter === k ? "bg-background text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>{label}</button>
        ))}
      </div>

      {!notificationsEnabled && (
        <Card className="p-4 text-sm text-muted-foreground">
          Notifications are turned off for this account. You can turn them back on in Settings.
        </Card>
      )}

      {list.length === 0 ? (
        <EmptyState icon={BellOff} title="You're all caught up" description="New notifications will appear here." />
      ) : (
        <Card className="max-h-[70vh] overflow-y-auto divide-y divide-border">
          {list.map((n) => (
            <div key={n.id} className={cn("flex items-start gap-3 p-4 hover:bg-muted/30 transition-smooth", !n.read && "bg-primary/[0.03]")}>
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0",
                !n.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {n.user.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{n.title ?? "Notification"}</p>
                  <Badge variant="outline" className="text-[10px]">{n.workspaceLabel ?? "Company"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.preview ?? `${n.user} ${n.action} ${n.target}`}</p>
                <p className="mt-2 text-xs text-foreground">
                  Related item: <span className="font-medium">{n.target}</span>
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>By {n.user}</span>
                  <span>{n.time}</span>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link to={n.link ?? "/notifications"}>Open</Link>
              </Button>
              {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-2" />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default Notifications;
