import { useEffect, useRef } from "react";
import { Bell, CalendarClock, FileText, FolderKanban, MessageSquare, ShieldAlert, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const previewIcon = (topic?: string) => {
  switch (topic) {
    case "chat":
    case "mention":
      return MessageSquare;
    case "deadline":
    case "calendar":
      return CalendarClock;
    case "project":
    case "status":
      return FolderKanban;
    case "approval":
      return ShieldAlert;
    case "comment":
    case "task":
      return FileText;
    default:
      return Bell;
  }
};

const playNotificationSound = () => {
  if (typeof window === "undefined") return;
  const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.02;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
  oscillator.onended = () => {
    void audioContext.close().catch(() => undefined);
  };
};

export const NotificationPreviewHost = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { notifications, markNotificationRead } = useData();
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    seenNotificationIds.current = new Set(notifications.map((notification) => notification.id));
    initializedRef.current = true;
  }, [notifications]);

  useEffect(() => {
    const popupPreviewsEnabled = currentUser.notificationSettings?.enabled !== false && currentUser.notificationSettings?.popupPreviews !== false;
    if (!popupPreviewsEnabled) {
      notifications.forEach((notification) => seenNotificationIds.current.add(notification.id));
      return;
    }

    const newNotifications = notifications.filter((notification) => !seenNotificationIds.current.has(notification.id));
    if (newNotifications.length === 0) return;

    newNotifications.forEach((notification) => {
      seenNotificationIds.current.add(notification.id);

      const openNotification = () => {
        markNotificationRead(notification.id);
        navigate(notification.link ?? "/notifications");
      };

      const Icon = previewIcon(notification.topic);

      toast.custom(
        (toastId) => (
          <div
            role="button"
            tabIndex={0}
            onClick={openNotification}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openNotification();
              }
            }}
            className={cn(
              "pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] cursor-pointer gap-3 rounded-2xl border border-border bg-background/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-smooth"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{notification.title ?? "Notification"}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {notification.preview ?? `${notification.user} ${notification.action} ${notification.target}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    toast.dismiss(toastId);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{notification.workspaceLabel ?? "Company"}</span>
                <span>Just now</span>
              </div>
            </div>
          </div>
        ),
        {
          id: notification.id,
          duration: 5000,
        }
      );

      if (currentUser.notificationSettings?.notificationSound) {
        try {
          playNotificationSound();
        } catch {
          // Ignore audio errors when autoplay is blocked.
        }
      }

      if (
        currentUser.notificationSettings?.browserPush &&
        typeof window !== "undefined" &&
        document.hidden &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const browserNotification = new Notification(notification.title ?? "Notification", {
          body: notification.preview ?? `${notification.user} ${notification.action} ${notification.target}`,
          tag: notification.id,
        });
        browserNotification.onclick = () => {
          window.focus();
          openNotification();
          browserNotification.close();
        };
      }
    });
  }, [currentUser.notificationSettings, markNotificationRead, navigate, notifications]);

  return null;
};
