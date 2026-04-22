import { useMemo, useState } from "react";
import { CheckSquare2, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/portal/PageHeader";
import { EmptyState } from "@/components/portal/EmptyState";
import { useAuth } from "@/auth/AuthContext";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";

const Notes = () => {
  const { currentUser } = useAuth();
  const { personalNotes, addPersonalNote, updatePersonalNote, removePersonalNote, tasks } = useData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");

  const myNotes = useMemo(
    () => personalNotes.filter((note) => note.userId === currentUser.id),
    [currentUser.id, personalNotes]
  );
  const myTaskTitles = tasks.filter((task) => task.assignee === currentUser.name).map((task) => task.title);

  const createNote = () => {
    if (!title.trim() && !body.trim()) return toast.error("Add a title or note first.");
    addPersonalNote({
      title: title.trim() || "Untitled note",
      body: body.trim(),
      taskTitle: taskTitle.trim() || undefined,
      completed: false,
    });
    setTitle("");
    setBody("");
    setTaskTitle("");
    toast.success("Note saved");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notes" description="Keep private reminders, planning notes, and your own task checklist in one place." />

      <Card className="p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Note title" />
          <Input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            placeholder={myTaskTitles[0] ? `Link to task, e.g. ${myTaskTitles[0]}` : "Optional task reference"}
          />
        </div>
        <Textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write anything you want to keep track of..." />
        <div className="flex justify-end">
          <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={createNote}>
            <Plus className="h-4 w-4" />
            Add note
          </Button>
        </div>
      </Card>

      {myNotes.length === 0 ? (
        <EmptyState icon={CheckSquare2} title="No notes yet" description="Create your first personal note or task reminder above." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {myNotes.map((note) => (
            <Card key={note.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Input
                    value={note.title}
                    onChange={(event) => updatePersonalNote(note.id, { title: event.target.value })}
                    className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                  />
                  {note.taskTitle && <p className="text-xs text-muted-foreground">Linked task: {note.taskTitle}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const confirmed = window.confirm(`Delete "${note.title}"?`);
                    if (!confirmed) return;
                    removePersonalNote(note.id);
                    toast.success("Note deleted");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                rows={6}
                value={note.body}
                onChange={(event) => updatePersonalNote(note.id, { body: event.target.value })}
                placeholder="Add note details..."
              />
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">Done</p>
                  <p className="text-xs text-muted-foreground">Mark this note complete when you are finished with it.</p>
                </div>
                <Switch checked={note.completed} onCheckedChange={(checked) => updatePersonalNote(note.id, { completed: checked })} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notes;
