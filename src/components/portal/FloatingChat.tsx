import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Minimize2, Paperclip, Pencil, Search, Send, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { teams } from "@/data/mock";
import { ReactionBar } from "@/components/portal/ReactionBar";
import { insertMentionAtCursor, MENTION_QUERY_REGEX, renderMentionText } from "@/lib/social";

interface FloatingChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FloatingChat = ({ open, onOpenChange }: FloatingChatProps) => {
  const { currentUser, userList } = useAuth();
  const { chats, sendChatMessage, updateChatMessage, removeChatMessage, markChatsRead, getUnreadChatCountForContact, toggleChatReaction } = useData();
  const contacts = userList.filter((user) => user.id !== currentUser.id && user.status === "Active");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [view, setView] = useState<"chats" | "contacts">("chats");
  const [attachment, setAttachment] = useState<{ name: string; size: string; dataUrl?: string; mimeType?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const departmentLabel = (teamId?: string) => (teamId ? teams.find((team) => team.id === teamId)?.name ?? teamId : "Company-level access");
  const mentionQuery = message.match(MENTION_QUERY_REGEX)?.[1]?.trim().toLowerCase() ?? "";

  const downloadAttachment = (name: string, dataUrl?: string) => {
    if (!dataUrl) {
      toast.error("This attachment is not available to download.");
      return;
    }
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    link.click();
  };

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((user) => q === "" || user.name.toLowerCase().includes(q) || departmentLabel(user.team).toLowerCase().includes(q));
  }, [contacts, query]);
  const mentionSuggestions = useMemo(
    () => (mentionQuery ? contacts.filter((user) => user.name.toLowerCase().includes(mentionQuery)).slice(0, 5) : []),
    [contacts, mentionQuery]
  );

  const launcherItems = useMemo(
    () =>
      filteredContacts.map((user) => {
        const convo = chats.filter(
          (entry) =>
            (entry.senderId === currentUser.id && entry.recipientId === user.id) ||
            (entry.senderId === user.id && entry.recipientId === currentUser.id)
        );
        const lastMessage = convo[convo.length - 1];
        const unreadCount = getUnreadChatCountForContact(user.id);
        return { user, lastMessage, unreadCount };
      }),
    [chats, currentUser.id, filteredContacts, getUnreadChatCountForContact]
  );

  const selectedUser = contacts.find((user) => user.id === selectedId) ?? null;

  const thread = useMemo(
    () =>
      selectedUser
        ? chats.filter(
            (entry) =>
              (entry.senderId === currentUser.id && entry.recipientId === selectedUser.id) ||
              (entry.senderId === selectedUser.id && entry.recipientId === currentUser.id)
          )
        : [],
    [chats, currentUser.id, selectedUser]
  );

  useEffect(() => {
    if (!open || !selectedUser) return;
    markChatsRead(selectedUser.id);
  }, [markChatsRead, open, selectedUser]);

  const submit = () => {
    if (!selectedUser || (!message.trim() && !attachment)) return;
    sendChatMessage(selectedUser.id, message, attachment ?? undefined);
    setMessage("");
    setAttachment(null);
    toast.success(`Message sent to ${selectedUser.name}`);
  };

  const saveEdit = () => {
    if (!editingId || !editingBody.trim()) return;
    updateChatMessage(editingId, editingBody);
    setEditingId(null);
    setEditingBody("");
    toast.success("Message updated");
  };

  const pickAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      setAttachment({
        name: file.name,
        size: `${sizeKb} KB`,
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
        mimeType: file.type,
      });
      toast.success(`Attached ${file.name}`);
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const insertMention = (userName: string) => setMessage((current) => insertMentionAtCursor(current, userName));

  if (!open) return null;

  const panelWidth = 332;
  const panelGap = 24;
  const launcherRight = 16;
  const conversationRight = launcherRight + panelWidth + panelGap;

  return (
    <>
      {selectedUser && (
        <div
          className="fixed bottom-4 z-30 hidden w-[332px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.2)] md:flex md:flex-col"
          style={{ right: `${conversationRight}px` }}
        >
          <div className="border-b border-border bg-muted/25 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{selectedUser.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{selectedUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{departmentLabel(selectedUser.team)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedId(null)} aria-label="Minimize conversation">
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedId(null)} aria-label="Close conversation">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-background px-4 py-4 min-h-[428px] max-h-[428px]">
            {thread.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Start a new conversation with {selectedUser.name}.
              </div>
            ) : (
              thread.map((entry) => {
                const mine = entry.senderId === currentUser.id;
                return (
                  <div key={entry.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("group max-w-[76%] rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {editingId === entry.id ? (
                        <div className="space-y-2">
                          <Textarea rows={2} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} className="min-h-[64px] resize-none border-0 bg-transparent px-0 py-0 text-[12.5px] shadow-none focus-visible:ring-0" />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditingBody(""); }}>Cancel</Button>
                            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={saveEdit}>Save</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {entry.body ? <p>{renderMentionText(entry.body)}</p> : null}
                          {entry.attachmentName && (
                            <button
                              type="button"
                              onClick={() => downloadAttachment(entry.attachmentName!, entry.attachmentDataUrl)}
                              className={cn(
                                "mt-1 block w-full rounded-xl border px-2.5 py-2 text-left text-[11px]",
                                mine ? "border-primary-foreground/15 bg-primary-foreground/10" : "border-border bg-background/70"
                              )}
                            >
                              <p className="font-medium">{entry.attachmentName}</p>
                              <p className={cn("mt-0.5 text-[10px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>{entry.attachmentSize ?? "Attachment"}</p>
                            </button>
                          )}
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className={cn("text-[9px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
                              {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              {entry.updatedAt ? " - edited" : ""}
                            </p>
                            {mine && (
                              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                <button type="button" className={cn("rounded p-1", mine ? "hover:bg-primary-foreground/10" : "hover:bg-background/80")} onClick={() => { setEditingId(entry.id); setEditingBody(entry.body); }}>
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className={cn("rounded p-1 text-destructive", mine ? "hover:bg-primary-foreground/10" : "hover:bg-background/80")}
                                  onClick={() => {
                                    const confirmed = window.confirm("Delete this message?");
                                    if (!confirmed) return;
                                    removeChatMessage(entry.id);
                                    toast.success("Message deleted");
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <ReactionBar
                            reactions={entry.reactions}
                            currentUserId={currentUser.id}
                            onToggle={(emoji) => toggleChatReaction(entry.id, emoji)}
                            resolveUserName={(userId) => userList.find((user) => user.id === userId)?.name ?? "Unknown user"}
                            tone={mine ? "inverted" : "default"}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-border bg-background px-3 py-3">
            <div className="rounded-2xl border border-primary/30 bg-background p-2">
              {attachment && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-muted/50 px-2.5 py-2 text-[11px]">
                  <div>
                    <p className="font-medium">{attachment.name}</p>
                    <p className="text-[10px] text-muted-foreground">{attachment.size}</p>
                  </div>
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setAttachment(null)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <Textarea
                rows={1}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Message ${selectedUser.name}...`}
                className="min-h-[42px] resize-none border-0 px-1 py-1 text-[13px] shadow-none focus-visible:ring-0"
              />
              {mentionSuggestions.length > 0 && (
                <div className="mb-2 rounded-xl border border-border bg-background shadow-soft">
                  {mentionSuggestions.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => insertMention(user.name)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/40"
                    >
                      <span className="font-medium text-foreground">{user.name}</span>
                      <span className="text-muted-foreground">{departmentLabel(user.team)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={pickAttachment} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="gradient-primary text-primary-foreground h-9 w-9 p-0" onClick={submit}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-4 z-40 hidden w-[332px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.18)] md:flex md:flex-col"
        style={{ right: `${launcherRight}px` }}
      >
        <div className="border-b border-border bg-muted/25 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/60">
                <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{currentUser.initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{currentUser.name}</p>
                <p className="text-xs text-success">Available</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Minimize chat">
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close chat">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-border px-3 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts, chats & channels"
              className="h-9 rounded-full bg-background pl-9"
            />
          </div>
        </div>

        <div className="min-h-[428px] bg-background">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {view === "chats" ? "Chats" : "Contacts"}
            </p>
          </div>
          <div className="max-h-[392px] overflow-y-auto">
            {launcherItems.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">No contacts found.</div>
            ) : (
              launcherItems.map(({ user, lastMessage, unreadCount }) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(user.id);
                    markChatsRead(user.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border/60 px-4 py-3 text-left transition-smooth hover:bg-muted/35",
                    selectedUser?.id === user.id && "bg-primary/5"
                  )}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      {view === "chats" && unreadCount > 0 && (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {view === "chats" ? lastMessage?.body ?? "Start a conversation" : departmentLabel(user.team)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-border bg-muted/25">
          <button
            type="button"
            onClick={() => setView("chats")}
            className={cn("flex flex-col items-center gap-1 py-2 text-[11px] transition-smooth", view === "chats" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <MessageSquare className="h-4 w-4" />
            Chats
          </button>
          <button
            type="button"
            onClick={() => setView("contacts")}
            className={cn("flex flex-col items-center gap-1 py-2 text-[11px] transition-smooth", view === "contacts" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <Users className="h-4 w-4" />
            Contacts
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground transition-smooth hover:text-foreground"
          >
            <Minimize2 className="h-4 w-4" />
            Minimize
          </button>
        </div>
      </div>
    </>
  );
};
