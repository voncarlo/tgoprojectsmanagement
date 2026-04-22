import { useMemo, useState } from "react";
import { MessageSquare, Minimize2, Search, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FloatingChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FloatingChat = ({ open, onOpenChange }: FloatingChatProps) => {
  const { currentUser, userList } = useAuth();
  const { chats, sendChatMessage } = useData();
  const contacts = userList.filter((user) => user.id !== currentUser.id && user.status === "Active");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(contacts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"chats" | "contacts">("chats");

  const filteredContacts = useMemo(
    () =>
      contacts.filter((user) => {
        const q = query.trim().toLowerCase();
        return q === "" || user.name.toLowerCase().includes(q) || user.role.toLowerCase().includes(q);
      }),
    [contacts, query]
  );

  const selectedUser = filteredContacts.find((user) => user.id === selectedId) ?? contacts.find((user) => user.id === selectedId) ?? filteredContacts[0] ?? contacts[0] ?? null;

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

  const previews = useMemo(
    () =>
      filteredContacts.map((user) => {
        const convo = chats.filter(
          (entry) =>
            (entry.senderId === currentUser.id && entry.recipientId === user.id) ||
            (entry.senderId === user.id && entry.recipientId === currentUser.id)
        );
        const lastMessage = convo[convo.length - 1];
        const incomingCount = convo.filter((entry) => entry.senderId === user.id).length;
        return { user, lastMessage, incomingCount };
      }),
    [chats, currentUser.id, filteredContacts]
  );

  const submit = () => {
    if (!selectedUser || !message.trim()) return;
    sendChatMessage(selectedUser.id, message);
    setMessage("");
    toast.success(`Message sent to ${selectedUser.name}`);
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden w-[332px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_rgba(0,0,0,0.18)] md:flex md:flex-col">
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
        {view === "contacts" ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Contacts</p>
            </div>
            <div className="max-h-[372px] overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground">No contacts found.</div>
              ) : (
                filteredContacts.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">{user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.role}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="grid h-full grid-cols-[132px_minmax(0,1fr)]">
            <div className="border-r border-border bg-muted/15">
              <div className="border-b border-border px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Chats</p>
              </div>
              <div className="max-h-[372px] overflow-y-auto">
                {previews.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">No chats found.</div>
                ) : (
                  previews.map(({ user, lastMessage, incomingCount }) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className={cn(
                        "flex w-full items-center gap-2 border-b border-border/60 px-3 py-3 text-left transition-smooth hover:bg-muted/40",
                        selectedUser?.id === user.id && "bg-primary/5"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">{user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-medium">{user.name}</p>
                          {incomingCount > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {incomingCount}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {lastMessage?.body ?? user.role}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col bg-background">
              <div className="border-b border-border px-3.5 py-3">
                {selectedUser ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedUser.avatarUrl} alt={selectedUser.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">{selectedUser.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selectedUser.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{selectedUser.role}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a teammate to start chatting.</p>
                )}
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3.5">
                {!selectedUser ? (
                  <div className="text-sm text-muted-foreground">No active teammates available.</div>
                ) : thread.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                    Start a new conversation with {selectedUser.name}.
                  </div>
                ) : (
                  thread.map((entry) => {
                    const mine = entry.senderId === currentUser.id;
                    return (
                      <div key={entry.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[88%] rounded-2xl px-3 py-2.5 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
                          <p>{entry.body}</p>
                          <p className={cn("mt-1.5 text-[10px]", mine ? "text-primary-foreground/75" : "text-muted-foreground")}>
                            {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-border px-3 py-3">
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={selectedUser ? `Message ${selectedUser.name}...` : "Select a teammate first"}
                    className="min-h-[68px] resize-none"
                    disabled={!selectedUser}
                  />
                  <Button className="self-end gradient-primary text-primary-foreground" onClick={submit} disabled={!selectedUser}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
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
  );
};
