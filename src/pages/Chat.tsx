import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Pencil, Send, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/portal/EmptyState";
import { PageHeader } from "@/components/portal/PageHeader";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { teams } from "@/data/mock";

const Chat = () => {
  const { currentUser, userList } = useAuth();
  const { chats, sendChatMessage, updateChatMessage, removeChatMessage, markChatsRead } = useData();
  const contacts = userList.filter((user) => user.id !== currentUser.id && user.status === "Active");
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; size: string; dataUrl?: string; mimeType?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const departmentLabel = (teamId: string) => teams.find((team) => team.id === teamId)?.name ?? teamId;

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

  const selectedUser = contacts.find((user) => user.id === selectedId) ?? contacts[0] ?? null;
  const thread = useMemo(
    () =>
      chats.filter(
        (entry) =>
          selectedUser &&
          ((entry.senderId === currentUser.id && entry.recipientId === selectedUser.id) ||
            (entry.senderId === selectedUser.id && entry.recipientId === currentUser.id))
      ),
    [chats, currentUser.id, selectedUser]
  );

  useEffect(() => {
    markChatsRead();
  }, [markChatsRead, selectedId]);

  const submit = () => {
    if (!selectedUser || (!message.trim() && !attachment)) return;
    sendChatMessage(selectedUser.id, message, attachment ?? undefined);
    setMessage("");
    setAttachment(null);
    toast.success(`Message sent to ${selectedUser.name}`);
  };

  const startEdit = (messageId: string, body: string) => {
    setEditingId(messageId);
    setEditingBody(body);
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

  return (
    <div className="space-y-6">
      <PageHeader title="Chat" description="Send quick updates and follow-ups to anyone in the portal." />

      {contacts.length === 0 ? (
        <EmptyState icon={Send} title="No teammates available" description="Create another active user account to start chatting." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="p-3 space-y-2">
            {contacts.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedId(user.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-smooth",
                  selectedUser?.id === user.id ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{departmentLabel(user.team)}</p>
                  </div>
                </div>
              </button>
            ))}
          </Card>

          <Card className="flex min-h-[560px] flex-col overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser?.avatarUrl} alt={selectedUser?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">{selectedUser?.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser ? departmentLabel(selectedUser.team) : ""}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet. Start the conversation below.</div>
              ) : (
                thread.map((entry) => {
                  const mine = entry.senderId === currentUser.id;
                  return (
                    <div key={entry.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("group max-w-[66%] rounded-2xl px-3 py-2 text-[12px] leading-snug shadow-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {editingId === entry.id ? (
                          <div className="space-y-2">
                            <Textarea rows={2} value={editingBody} onChange={(event) => setEditingBody(event.target.value)} className="min-h-[70px] resize-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0" />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditingBody(""); }}>Cancel</Button>
                              <Button size="sm" className="gradient-primary text-primary-foreground" onClick={saveEdit}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {entry.body ? <p>{entry.body}</p> : null}
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
                            <div className="mt-1.5 flex items-center justify-between gap-3">
                              <p className={cn("text-[10px]", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                {new Date(entry.createdAt).toLocaleString()}
                                {entry.updatedAt ? " · edited" : ""}
                              </p>
                              {mine && (
                                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button type="button" className={cn("rounded p-1", mine ? "hover:bg-primary-foreground/10" : "hover:bg-background/80")} onClick={() => startEdit(entry.id, entry.body)}>
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
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-4">
              <div className="rounded-2xl border border-primary/30 bg-background p-2.5">
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
                  placeholder={`Message ${selectedUser?.name ?? "teammate"}...`}
                  className="min-h-[44px] resize-none border-0 px-1 py-1 text-[13px] shadow-none focus-visible:ring-0"
                />
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
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chat;
