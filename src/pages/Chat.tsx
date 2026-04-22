import { useMemo, useState } from "react";
import { Pencil, Send, Trash2 } from "lucide-react";
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

const Chat = () => {
  const { currentUser, userList } = useAuth();
  const { chats, sendChatMessage, updateChatMessage, removeChatMessage } = useData();
  const contacts = userList.filter((user) => user.id !== currentUser.id && user.status === "Active");
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

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

  const submit = () => {
    if (!selectedUser || !message.trim()) return;
    sendChatMessage(selectedUser.id, message);
    setMessage("");
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
                    <p className="truncate text-xs text-muted-foreground">{user.role}</p>
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
                  <p className="text-xs text-muted-foreground">{selectedUser?.role}</p>
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
                      <div className={cn("group max-w-[72%] rounded-2xl px-3 py-2 text-[13px]", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
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
                            <p>{entry.body}</p>
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
              <div className="flex gap-3">
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={`Message ${selectedUser?.name ?? "teammate"}...`}
                />
                <Button className="gradient-primary text-primary-foreground self-end gap-1.5" onClick={submit}>
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Chat;
