import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  tasks as seedTasks,
  projects as seedProjects,
  activity as seedActivity,
  approvals as seedApprovals,
  documents as seedDocuments,
  automations as seedAutomations,
  auditLog as seedAuditLog,
  calendarEvents as seedCalendarEvents,
  type Task,
  type Project,
  type Activity,
  type Milestone,
  type TaskApprovalStatus,
  type ApprovalHistoryEntry,
  type Approval,
  type ApprovalStatus,
  type DocumentFile,
  type AutomationRule,
  type AuditEntry,
  type CalendarEvent,
} from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";

interface Notification extends Activity {
  read: boolean;
}

type RecycleBinType = "task" | "document" | "project";

export interface RecycleBinItem {
  id: string;
  resourceId: string;
  type: RecycleBinType;
  title: string;
  description: string;
  team?: Task["team"] | Project["team"] | DocumentFile["team"];
  deletedAt: string;
  deletedBy: string;
  payload: Task | Project | DocumentFile;
}

interface PersistedDataState {
  tasks: Task[];
  projects: Project[];
  notifications: Notification[];
  approvals: Approval[];
  documents: DocumentFile[];
  automations: AutomationRule[];
  auditLog: AuditEntry[];
  calendarEvents: CalendarEvent[];
  recycleBin: RecycleBinItem[];
}

interface DataCtx {
  tasks: Task[];
  projects: Project[];
  notifications: Notification[];
  unreadCount: number;
  approvals: Approval[];
  documents: DocumentFile[];
  automations: AutomationRule[];
  auditLog: AuditEntry[];
  calendarEvents: CalendarEvent[];
  recycleBin: RecycleBinItem[];
  addTask: (t: Omit<Task, "id">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addProject: (p: Omit<Project, "id" | "milestones"> & { milestones?: Milestone[] }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  toggleMilestone: (projectId: string, name: string) => void;
  pushActivity: (a: Omit<Activity, "id" | "time">) => void;
  markAllRead: () => void;
  decideTaskApproval: (
    taskId: string,
    decision: "Approved" | "Rejected" | "Returned for Revision",
    comment?: string
  ) => void;
  addTaskApprovalComment: (taskId: string, comment: string) => void;
  decideApproval: (approvalId: string, status: ApprovalStatus, comment?: string) => void;
  addDocument: (doc: Omit<DocumentFile, "id" | "updated" | "version"> & { version?: string }) => DocumentFile;
  removeDocument: (id: string) => void;
  restoreRecycleItem: (id: string) => void;
  purgeRecycleItem: (id: string) => void;
  toggleAutomation: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
}

const STORAGE_KEY = "tgo.data";
const Ctx = createContext<DataCtx | null>(null);

const id = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);
const nowLabel = () => "Just now";
const todayIso = () => new Date().toISOString().slice(0, 10);

const defaultState: PersistedDataState = {
  tasks: seedTasks,
  projects: seedProjects,
  notifications: seedActivity.map((item) => ({ ...item, read: false })),
  approvals: seedApprovals,
  documents: seedDocuments,
  automations: seedAutomations,
  auditLog: seedAuditLog,
  calendarEvents: seedCalendarEvents,
  recycleBin: [],
};

const loadState = (): PersistedDataState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<PersistedDataState>;
    return {
      tasks: parsed.tasks?.length ? parsed.tasks : defaultState.tasks,
      projects: parsed.projects?.length ? parsed.projects : defaultState.projects,
      notifications: parsed.notifications?.length ? parsed.notifications : defaultState.notifications,
      approvals: parsed.approvals?.length ? parsed.approvals : defaultState.approvals,
      documents: parsed.documents?.length ? parsed.documents : defaultState.documents,
      automations: parsed.automations?.length ? parsed.automations : defaultState.automations,
      auditLog: parsed.auditLog?.length ? parsed.auditLog : defaultState.auditLog,
      calendarEvents: parsed.calendarEvents?.length ? parsed.calendarEvents : defaultState.calendarEvents,
      recycleBin: parsed.recycleBin ?? defaultState.recycleBin,
    };
  } catch {
    return defaultState;
  }
};

const recomputeProgress = (project: Project): Project => {
  const total = project.milestones.length;
  if (!total) return project;
  const done = project.milestones.filter((milestone) => milestone.done).length;
  return { ...project, progress: Math.round((done / total) * 100) };
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const currentUser = auth.currentUser;
  const initialState = loadState();

  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [projects, setProjects] = useState<Project[]>(initialState.projects);
  const [notifications, setNotifications] = useState<Notification[]>(initialState.notifications);
  const [approvals, setApprovals] = useState<Approval[]>(initialState.approvals);
  const [documents, setDocuments] = useState<DocumentFile[]>(initialState.documents);
  const [automations, setAutomations] = useState<AutomationRule[]>(initialState.automations);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialState.auditLog);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialState.calendarEvents);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(initialState.recycleBin);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tasks,
        projects,
        notifications,
        approvals,
        documents,
        automations,
        auditLog,
        calendarEvents,
        recycleBin,
      } satisfies PersistedDataState)
    );
  }, [tasks, projects, notifications, approvals, documents, automations, auditLog, calendarEvents, recycleBin]);

  const appendAudit = useCallback((entry: Omit<AuditEntry, "id" | "time"> & { time?: string }) => {
    setAuditLog((items) => [
      { ...entry, id: id("al"), time: entry.time ?? nowLabel() },
      ...items,
    ].slice(0, 100));
  }, []);

  const pushActivity = useCallback(
    (activity: Omit<Activity, "id" | "time">) => {
      setNotifications((items) => [{ ...activity, id: id("a"), time: nowLabel(), read: false }, ...items].slice(0, 30));
    },
    []
  );

  const addToRecycleBin = useCallback(
    (item: Omit<RecycleBinItem, "id" | "deletedAt" | "deletedBy">) => {
      setRecycleBin((items) => [
        {
          ...item,
          id: id("rb"),
          deletedAt: new Date().toISOString(),
          deletedBy: currentUser.name,
        },
        ...items,
      ]);
    },
    [currentUser.name]
  );

  const addTask: DataCtx["addTask"] = useCallback(
    (taskInput) => {
      const next: Task = {
        ...taskInput,
        id: id("t"),
      };
      setTasks((items) => [next, ...items]);
      pushActivity({ user: currentUser.name, action: "created task", target: next.title });
      appendAudit({
        user: currentUser.name,
        action: "Created task",
        target: next.title,
        category: "Task",
        team: next.team,
      });
      return next;
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const updateTask: DataCtx["updateTask"] = useCallback(
    (taskId, patch) => {
      let updatedTask: Task | null = null;
      let submittedForApproval = false;

      setTasks((items) =>
        items.map((task) => {
          if (task.id !== taskId) return task;

          let next: Task = { ...task, ...patch };
          if (
            patch.status === "Completed" &&
            task.status !== "Completed" &&
            next.requiresApproval &&
            next.approver &&
            next.approvalStatus !== "Approved"
          ) {
            const entry: ApprovalHistoryEntry = {
              id: id("h"),
              actor: currentUser.name,
              action: "Submitted",
              comment: "Submitted for approval",
              at: nowLabel(),
            };
            next = {
              ...next,
              status: "Waiting Review",
              approvalStatus: "Pending Approval",
              approvalHistory: [...(task.approvalHistory ?? []), entry],
            };
            submittedForApproval = true;
          }

          updatedTask = next;
          return next;
        })
      );

      if (!updatedTask) return;

      if (submittedForApproval) {
        pushActivity({
          user: currentUser.name,
          action: "submitted for approval",
          target: `${updatedTask.title} -> ${updatedTask.approver}`,
        });
        appendAudit({
          user: currentUser.name,
          action: "Submitted for approval",
          target: updatedTask.title,
          category: "Approval",
          team: updatedTask.team,
        });
        setApprovals((items) => {
          const existing = items.find((item) => item.taskId === updatedTask?.id);
          const nextApproval: Approval = {
            id: existing?.id ?? id("ap"),
            type: "Task",
            title: updatedTask.title,
            requester: updatedTask.assignee,
            team: updatedTask.team,
            status: "Pending",
            submitted: todayIso(),
            notes: updatedTask.notes,
            taskId: updatedTask.id,
          };
          return existing
            ? items.map((item) => (item.id === existing.id ? nextApproval : item))
            : [nextApproval, ...items];
        });
        return;
      }

        if (patch.status) {
          pushActivity({
            user: currentUser.name,
            action: patch.status === "Completed" ? "completed task" : `moved to ${patch.status}`,
            target: updatedTask.title,
        });
        appendAudit({
          user: currentUser.name,
          action: `Updated task status to ${patch.status}`,
          target: updatedTask.title,
          category: "Task",
          team: updatedTask.team,
        });
      }
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const removeTask: DataCtx["removeTask"] = useCallback(
    (taskId) => {
      const existing = tasks.find((task) => task.id === taskId);
      setTasks((items) => items.filter((task) => task.id !== taskId));
      setApprovals((items) => items.filter((approval) => approval.taskId !== taskId));
      if (!existing) return;
      addToRecycleBin({
        resourceId: existing.id,
        type: "task",
        title: existing.title,
        description: `Task assigned to ${existing.assignee}`,
        team: existing.team,
        payload: existing,
      });
      appendAudit({
        user: currentUser.name,
        action: "Deleted task",
        target: existing.title,
        category: "Task",
        team: existing.team,
      });
      pushActivity({ user: currentUser.name, action: "deleted task", target: existing.title });
    },
    [addToRecycleBin, appendAudit, currentUser.name, pushActivity, tasks]
  );

  const addProject: DataCtx["addProject"] = useCallback(
    (projectInput) => {
      const next: Project = {
        ...projectInput,
        id: id("p"),
        milestones: projectInput.milestones ?? [
          { name: "Kickoff", done: false },
          { name: "Build", done: false },
          { name: "Launch", done: false },
        ],
      };
      const withProgress = recomputeProgress(next);
      setProjects((items) => [withProgress, ...items]);
      pushActivity({ user: currentUser.name, action: "created project", target: next.name });
      appendAudit({
        user: currentUser.name,
        action: "Created project",
        target: next.name,
        category: "Project",
        team: next.team,
      });
      return withProgress;
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const updateProject: DataCtx["updateProject"] = useCallback(
    (projectId, patch) => {
      let updatedProject: Project | null = null;
      setProjects((items) =>
        items.map((project) => {
          if (project.id !== projectId) return project;
          updatedProject = recomputeProgress({ ...project, ...patch });
          return updatedProject;
        })
      );
      if (!updatedProject) return;
      appendAudit({
        user: currentUser.name,
        action: "Updated project",
        target: updatedProject.name,
        category: "Project",
        team: updatedProject.team,
      });
    },
    [appendAudit, currentUser.name]
  );

  const removeProject: DataCtx["removeProject"] = useCallback(
    (projectId) => {
      const existing = projects.find((project) => project.id === projectId);
      setProjects((items) => items.filter((project) => project.id !== projectId));
      if (!existing) return;
      addToRecycleBin({
        resourceId: existing.id,
        type: "project",
        title: existing.name,
        description: `Project owned by ${existing.owner}`,
        team: existing.team,
        payload: existing,
      });
      appendAudit({
        user: currentUser.name,
        action: "Deleted project",
        target: existing.name,
        category: "Project",
        team: existing.team,
      });
      pushActivity({ user: currentUser.name, action: "deleted project", target: existing.name });
    },
    [addToRecycleBin, appendAudit, currentUser.name, projects, pushActivity]
  );

  const toggleMilestone: DataCtx["toggleMilestone"] = useCallback(
    (projectId, name) => {
      let updatedProject: Project | null = null;
      let milestoneDone = false;

      setProjects((items) =>
        items.map((project) => {
          if (project.id !== projectId) return project;
          const milestones = project.milestones.map((milestone) => {
            if (milestone.name !== name) return milestone;
            milestoneDone = !milestone.done;
            return { ...milestone, done: milestoneDone };
          });
          updatedProject = recomputeProgress({ ...project, milestones });
          return updatedProject;
        })
      );

      if (!updatedProject) return;
      pushActivity({
        user: currentUser.name,
        action: milestoneDone ? "completed milestone" : "reopened milestone",
        target: `${updatedProject.name} · ${name}`,
      });
      appendAudit({
        user: currentUser.name,
        action: milestoneDone ? "Completed milestone" : "Reopened milestone",
        target: `${updatedProject.name} · ${name}`,
        category: "Project",
        team: updatedProject.team,
      });
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const markAllRead = useCallback(() => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  }, []);

  const decideTaskApproval: DataCtx["decideTaskApproval"] = useCallback(
    (taskId, decision, comment) => {
      let decidedTask: Task | null = null;
      setTasks((items) =>
        items.map((task) => {
          if (task.id !== taskId) return task;
          const entry: ApprovalHistoryEntry = {
            id: id("h"),
            actor: currentUser.name,
            action: decision,
            comment,
            at: nowLabel(),
          };
          const nextStatus: Task["status"] =
            decision === "Approved"
              ? "Completed"
              : decision === "Rejected"
                ? "Cancelled"
                : "In Progress";
          decidedTask = {
            ...task,
            status: nextStatus,
            approvalStatus: decision as TaskApprovalStatus,
            approvalHistory: [...(task.approvalHistory ?? []), entry],
          };
          return decidedTask;
        })
      );

      if (!decidedTask) return;

      const approvalStatusMap: Record<"Approved" | "Rejected" | "Returned for Revision", ApprovalStatus> = {
        Approved: "Approved",
        Rejected: "Rejected",
        "Returned for Revision": "Returned",
      };
      setApprovals((items) =>
        items.map((approval) =>
          approval.taskId === taskId
            ? { ...approval, status: approvalStatusMap[decision], notes: comment || approval.notes }
            : approval
        )
      );
      pushActivity({
        user: currentUser.name,
        action:
          decision === "Approved"
            ? "approved task"
            : decision === "Rejected"
              ? "rejected task"
              : "returned task for revision",
        target: decidedTask.title,
      });
      appendAudit({
        user: currentUser.name,
        action: decision,
        target: decidedTask.title,
        category: "Approval",
        team: decidedTask.team,
      });
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const addTaskApprovalComment: DataCtx["addTaskApprovalComment"] = useCallback(
    (taskId, comment) => {
      if (!comment.trim()) return;
      let commentedTask: Task | null = null;
      setTasks((items) =>
        items.map((task) => {
          if (task.id !== taskId) return task;
          const entry: ApprovalHistoryEntry = {
            id: id("h"),
            actor: currentUser.name,
            action: "Comment",
            comment,
            at: nowLabel(),
          };
          commentedTask = { ...task, approvalHistory: [...(task.approvalHistory ?? []), entry] };
          return commentedTask;
        })
      );
      if (!commentedTask) return;
      appendAudit({
        user: currentUser.name,
        action: "Commented on approval",
        target: commentedTask.title,
        category: "Approval",
        team: commentedTask.team,
      });
    },
    [appendAudit, currentUser.name]
  );

  const decideApproval: DataCtx["decideApproval"] = useCallback(
    (approvalId, status, comment) => {
      let updatedApproval: Approval | null = null;
      setApprovals((items) =>
        items.map((approval) => {
          if (approval.id !== approvalId) return approval;
          updatedApproval = { ...approval, status, notes: comment || approval.notes };
          return updatedApproval;
        })
      );
      if (!updatedApproval) return;
      if (updatedApproval.taskId) {
        const taskDecision =
          status === "Approved"
            ? "Approved"
            : status === "Rejected"
              ? "Rejected"
              : status === "Returned"
                ? "Returned for Revision"
                : null;
        if (taskDecision) decideTaskApproval(updatedApproval.taskId, taskDecision, comment);
      }
      appendAudit({
        user: currentUser.name,
        action: `Set approval to ${status}`,
        target: updatedApproval.title,
        category: "Approval",
        team: updatedApproval.team,
      });
    },
    [appendAudit, currentUser.name, decideTaskApproval]
  );

  const addDocument: DataCtx["addDocument"] = useCallback(
    (doc) => {
      const next: DocumentFile = {
        ...doc,
        id: id("d"),
        updated: nowLabel(),
        version: doc.version ?? "v1",
      };
      setDocuments((items) => [next, ...items]);
      appendAudit({
        user: currentUser.name,
        action: "Uploaded",
        target: next.name,
        category: "File",
        team: next.team,
      });
      pushActivity({ user: currentUser.name, action: "uploaded file", target: next.name });
      return next;
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const removeDocument: DataCtx["removeDocument"] = useCallback(
    (docId) => {
      const existing = documents.find((doc) => doc.id === docId);
      setDocuments((items) => items.filter((doc) => doc.id !== docId));
      if (!existing) return;
      addToRecycleBin({
        resourceId: existing.id,
        type: "document",
        title: existing.name,
        description: `${existing.category} document`,
        team: existing.team,
        payload: existing,
      });
      appendAudit({
        user: currentUser.name,
        action: "Deleted",
        target: existing.name,
        category: "File",
        team: existing.team,
      });
      pushActivity({ user: currentUser.name, action: "deleted document", target: existing.name });
    },
    [addToRecycleBin, appendAudit, currentUser.name, documents, pushActivity]
  );

  const restoreRecycleItem: DataCtx["restoreRecycleItem"] = useCallback(
    (recycleId) => {
      const existing = recycleBin.find((item) => item.id === recycleId);
      if (!existing) return;

      if (existing.type === "task") {
        setTasks((items) => {
          if (items.some((task) => task.id === existing.resourceId)) return items;
          return [existing.payload as Task, ...items];
        });
      }

      if (existing.type === "project") {
        setProjects((items) => {
          if (items.some((project) => project.id === existing.resourceId)) return items;
          return [existing.payload as Project, ...items];
        });
      }

      if (existing.type === "document") {
        setDocuments((items) => {
          if (items.some((doc) => doc.id === existing.resourceId)) return items;
          return [existing.payload as DocumentFile, ...items];
        });
      }

      setRecycleBin((items) => items.filter((item) => item.id !== recycleId));
      appendAudit({
        user: currentUser.name,
        action: `Restored ${existing.type}`,
        target: existing.title,
        category: existing.type === "document" ? "File" : existing.type === "project" ? "Project" : "Task",
        team: existing.team,
      });
      pushActivity({ user: currentUser.name, action: `restored ${existing.type}`, target: existing.title });
    },
    [appendAudit, currentUser.name, pushActivity, recycleBin]
  );

  const purgeRecycleItem: DataCtx["purgeRecycleItem"] = useCallback(
    (recycleId) => {
      const existing = recycleBin.find((item) => item.id === recycleId);
      setRecycleBin((items) => items.filter((item) => item.id !== recycleId));
      if (!existing) return;
      appendAudit({
        user: currentUser.name,
        action: `Permanently deleted ${existing.type}`,
        target: existing.title,
        category: existing.type === "document" ? "File" : existing.type === "project" ? "Project" : "Task",
        team: existing.team,
      });
    },
    [appendAudit, currentUser.name, recycleBin]
  );

  const toggleAutomation: DataCtx["toggleAutomation"] = useCallback(
    (automationId) => {
      let updatedRule: AutomationRule | null = null;
      setAutomations((items) =>
        items.map((rule) => {
          if (rule.id !== automationId) return rule;
          updatedRule = { ...rule, enabled: !rule.enabled };
          return updatedRule;
        })
      );
      if (!updatedRule) return;
      appendAudit({
        user: currentUser.name,
        action: updatedRule.enabled ? "Enabled automation" : "Paused automation",
        target: updatedRule.name,
        category: "System",
      });
    },
    [appendAudit, currentUser.name]
  );

  const addCalendarEvent: DataCtx["addCalendarEvent"] = useCallback(
    (event) => {
      const next: CalendarEvent = { ...event, id: id("ev") };
      setCalendarEvents((items) => [next, ...items]);
      appendAudit({
        user: currentUser.name,
        action: "Created calendar event",
        target: next.title,
        category: "System",
        team: next.team,
      });
      return next;
    },
    [appendAudit, currentUser.name]
  );

  const value = useMemo<DataCtx>(
    () => ({
      tasks,
      projects,
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      approvals,
      documents,
      automations,
      auditLog,
      calendarEvents,
      recycleBin,
      addTask,
      updateTask,
      removeTask,
      addProject,
      updateProject,
      removeProject,
      toggleMilestone,
      pushActivity,
      markAllRead,
      decideTaskApproval,
      addTaskApprovalComment,
      decideApproval,
      addDocument,
      removeDocument,
      restoreRecycleItem,
      purgeRecycleItem,
      toggleAutomation,
      addCalendarEvent,
    }),
    [
      tasks,
      projects,
      notifications,
      approvals,
      documents,
      automations,
      auditLog,
      calendarEvents,
      recycleBin,
      addTask,
      updateTask,
      removeTask,
      addProject,
      updateProject,
      removeProject,
      toggleMilestone,
      pushActivity,
      markAllRead,
      decideTaskApproval,
      addTaskApprovalComment,
      decideApproval,
      addDocument,
      removeDocument,
      restoreRecycleItem,
      purgeRecycleItem,
      toggleAutomation,
      addCalendarEvent,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
