import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import {
  tasks as seedTasks,
  projects as seedProjects,
  activity as seedActivity,
  type Task,
  type Project,
  type Activity,
  type Milestone,
  type TaskApprovalStatus,
  type ApprovalHistoryEntry,
} from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";

interface Notification extends Activity {
  read: boolean;
}

interface DataCtx {
  tasks: Task[];
  projects: Project[];
  notifications: Notification[];
  unreadCount: number;
  addTask: (t: Omit<Task, "id">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addProject: (p: Omit<Project, "id" | "milestones"> & { milestones?: Milestone[] }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  toggleMilestone: (projectId: string, name: string) => void;
  pushActivity: (a: Omit<Activity, "id" | "time">) => void;
  markAllRead: () => void;
  decideTaskApproval: (
    taskId: string,
    decision: "Approved" | "Rejected" | "Returned for Revision",
    comment?: string
  ) => void;
  addTaskApprovalComment: (taskId: string, comment: string) => void;
}

const Ctx = createContext<DataCtx | null>(null);

const id = (p: string) => p + Math.random().toString(36).slice(2, 8);
const now = () => "Just now";

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const currentUser = auth.currentUser ?? { name: "System" } as any;
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [notifications, setNotifications] = useState<Notification[]>(
    seedActivity.map((a) => ({ ...a, read: false }))
  );

  const pushActivity = useCallback((a: Omit<Activity, "id" | "time">) => {
    setNotifications((n) => [{ ...a, id: id("a"), time: now(), read: false }, ...n].slice(0, 30));
  }, []);

  const addTask: DataCtx["addTask"] = useCallback(
    (t) => {
      const next: Task = { ...t, id: id("t") };
      setTasks((ts) => [next, ...ts]);
      pushActivity({ user: currentUser.name, action: "created task", target: next.title });
      return next;
    },
    [currentUser.name, pushActivity]
  );

  const updateTask: DataCtx["updateTask"] = useCallback(
    (taskId, patch) => {
      setTasks((ts) =>
        ts.map((t) => {
          if (t.id !== taskId) return t;
          let next: Task = { ...t, ...patch };
          // Approval gate: when a task that requires approval is moved to Completed,
          // intercept and route it to "Waiting Review" + Pending Approval instead.
          if (
            patch.status === "Completed" &&
            t.status !== "Completed" &&
            next.requiresApproval &&
            next.approver &&
            next.approvalStatus !== "Approved"
          ) {
            const entry: ApprovalHistoryEntry = {
              id: id("h"),
              actor: currentUser.name,
              action: "Submitted",
              comment: "Submitted for approval",
              at: now(),
            };
            next = {
              ...next,
              status: "Waiting Review",
              approvalStatus: "Pending Approval",
              approvalHistory: [...(t.approvalHistory ?? []), entry],
            };
            pushActivity({
              user: currentUser.name,
              action: "submitted for approval",
              target: `${t.title} → ${next.approver}`,
            });
          } else if (patch.status && patch.status !== t.status) {
            pushActivity({
              user: currentUser.name,
              action: patch.status === "Completed" ? "completed task" : `moved to ${patch.status}`,
              target: t.title,
            });
          }
          return next;
        })
      );
    },
    [currentUser.name, pushActivity]
  );

  const removeTask: DataCtx["removeTask"] = useCallback((taskId) => {
    setTasks((ts) => ts.filter((t) => t.id !== taskId));
  }, []);

  const recomputeProgress = (p: Project): Project => {
    const total = p.milestones.length;
    if (!total) return p;
    const done = p.milestones.filter((m) => m.done).length;
    return { ...p, progress: Math.round((done / total) * 100) };
  };

  const addProject: DataCtx["addProject"] = useCallback(
    (p) => {
      const next: Project = {
        ...p,
        id: id("p"),
        milestones: p.milestones ?? [
          { name: "Kickoff", done: false },
          { name: "Build", done: false },
          { name: "Launch", done: false },
        ],
      };
      const withProg = recomputeProgress(next);
      setProjects((ps) => [withProg, ...ps]);
      pushActivity({ user: currentUser.name, action: "created project", target: next.name });
      return withProg;
    },
    [currentUser.name, pushActivity]
  );

  const updateProject: DataCtx["updateProject"] = useCallback((projectId, patch) => {
    setProjects((ps) => ps.map((p) => (p.id === projectId ? recomputeProgress({ ...p, ...patch }) : p)));
  }, []);

  const toggleMilestone: DataCtx["toggleMilestone"] = useCallback(
    (projectId, name) => {
      setProjects((ps) =>
        ps.map((p) => {
          if (p.id !== projectId) return p;
          const milestones = p.milestones.map((m) => (m.name === name ? { ...m, done: !m.done } : m));
          const next = recomputeProgress({ ...p, milestones });
          pushActivity({
            user: currentUser.name,
            action: milestones.find((m) => m.name === name)?.done ? "completed milestone" : "reopened milestone",
            target: `${p.name} · ${name}`,
          });
          return next;
        })
      );
    },
    [currentUser.name, pushActivity]
  );

  const markAllRead = useCallback(() => {
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  }, []);

  const decideTaskApproval: DataCtx["decideTaskApproval"] = useCallback(
    (taskId, decision, comment) => {
      setTasks((ts) =>
        ts.map((t) => {
          if (t.id !== taskId) return t;
          const entry: ApprovalHistoryEntry = {
            id: id("h"),
            actor: currentUser.name,
            action: decision,
            comment,
            at: now(),
          };
          const nextStatus: Task["status"] =
            decision === "Approved"
              ? "Completed"
              : decision === "Rejected"
              ? "Cancelled"
              : "In Progress";
          return {
            ...t,
            status: nextStatus,
            approvalStatus: decision as TaskApprovalStatus,
            approvalHistory: [...(t.approvalHistory ?? []), entry],
          };
        })
      );
      const target = tasks.find((x) => x.id === taskId);
      if (target) {
        pushActivity({
          user: currentUser.name,
          action:
            decision === "Approved"
              ? "approved task"
              : decision === "Rejected"
              ? "rejected task"
              : "returned task for revision",
          target: target.title,
        });
      }
    },
    [currentUser.name, pushActivity, tasks]
  );

  const addTaskApprovalComment: DataCtx["addTaskApprovalComment"] = useCallback(
    (taskId, comment) => {
      if (!comment.trim()) return;
      setTasks((ts) =>
        ts.map((t) => {
          if (t.id !== taskId) return t;
          const entry: ApprovalHistoryEntry = {
            id: id("h"),
            actor: currentUser.name,
            action: "Comment",
            comment,
            at: now(),
          };
          return { ...t, approvalHistory: [...(t.approvalHistory ?? []), entry] };
        })
      );
    },
    [currentUser.name]
  );

  const value = useMemo<DataCtx>(
    () => ({
      tasks,
      projects,
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      addTask,
      updateTask,
      removeTask,
      addProject,
      updateProject,
      toggleMilestone,
      pushActivity,
      markAllRead,
      decideTaskApproval,
      addTaskApprovalComment,
    }),
    [tasks, projects, notifications, addTask, updateTask, removeTask, addProject, updateProject, toggleMilestone, pushActivity, markAllRead, decideTaskApproval, addTaskApprovalComment]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
