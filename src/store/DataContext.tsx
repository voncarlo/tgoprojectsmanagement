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
  type Subtask,
  type TaskApprovalStatus,
  type ApprovalHistoryEntry,
  type Approval,
  type ApprovalStatus,
  type TeamId,
  type DocumentFile,
  type AutomationRule,
  type AuditEntry,
  type CalendarEvent,
} from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";

interface Notification extends Activity {
  read: boolean;
  kind?: "activity" | "deadline";
  recipientUserId?: string;
}

type RecycleBinType = "task" | "document" | "project";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  body: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentDataUrl?: string;
  attachmentMimeType?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PersonalNote {
  id: string;
  userId: string;
  title: string;
  body: string;
  taskTitle?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetchServerState = async (): Promise<PersistedDataState | null> => {
  const response = await fetch("/api/state/app");
  if (!response.ok) return null;
  const payload = (await response.json()) as { ok: boolean; data?: PersistedDataState | null };
  return payload.data ?? null;
};

const saveServerState = async (state: PersistedDataState) => {
  await fetch("/api/state/app", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
};

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
  chats: ChatMessage[];
  personalNotes: PersonalNote[];
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
  chats: ChatMessage[];
  personalNotes: PersonalNote[];
  addTask: (t: Omit<Task, "id">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addProject: (p: Omit<Project, "id" | "milestones"> & { milestones?: Milestone[] }) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  toggleMilestone: (projectId: string, name: string) => void;
  pushActivity: (a: Omit<Activity, "id" | "time">) => void;
  pushNotification: (a: Omit<Activity, "id" | "time"> & { recipientUserId?: string; kind?: Notification["kind"] }) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  decideTaskApproval: (
    taskId: string,
    decision: "Approved" | "Rejected" | "Returned for Revision",
    comment?: string
  ) => void;
  decideProjectApproval: (
    projectId: string,
    decision: "Approved" | "Rejected" | "Returned for Revision",
    comment?: string
  ) => void;
  addTaskApprovalComment: (taskId: string, comment: string) => void;
  decideApproval: (approvalId: string, status: ApprovalStatus, comment?: string) => void;
  hideApproval: (approvalId: string) => void;
  removeApproval: (approvalId: string) => void;
  clearApprovals: () => void;
  addDocument: (doc: Omit<DocumentFile, "id" | "updated" | "version"> & { version?: string }) => DocumentFile;
  removeDocument: (id: string) => void;
  restoreRecycleItem: (id: string) => void;
  purgeRecycleItem: (id: string) => void;
  toggleAutomation: (id: string) => void;
  addCalendarEvent: (event: Omit<CalendarEvent, "id">) => CalendarEvent;
  removeCalendarEvent: (id: string) => void;
  requestCalendarPto: (event: Omit<CalendarEvent, "id">) => void;
  clearAuditLog: () => void;
  sendChatMessage: (
    recipientId: string,
    body: string,
    attachment?: { name: string; size: string; dataUrl?: string; mimeType?: string }
  ) => void;
  updateChatMessage: (messageId: string, body: string) => void;
  removeChatMessage: (messageId: string) => void;
  addPersonalNote: (note: Omit<PersonalNote, "id" | "userId" | "createdAt" | "updatedAt">) => void;
  updatePersonalNote: (id: string, patch: Partial<PersonalNote>) => void;
  removePersonalNote: (id: string) => void;
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
  chats: [],
  personalNotes: [],
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
      chats: parsed.chats ?? defaultState.chats,
      personalNotes: parsed.personalNotes ?? defaultState.personalNotes,
    };
  } catch {
    return defaultState;
  }
};

const deadlineLabel = (isoDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  return `in ${diff} days`;
};

const isUpcoming = (isoDate: string, windowDays = 3) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(isoDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  return diff >= 0 && diff <= windowDays;
};

const recomputeProgress = (project: Project): Project => {
  const trackedItems = project.subtasks?.length ? project.subtasks : project.milestones;
  const total = trackedItems.length;
  if (!total) return { ...project, progress: 0 };
  const done = trackedItems.filter((item) => item.done).length;
  return { ...project, progress: Math.round((done / total) * 100) };
};

const normalizeSubtasks = (subtasks?: Subtask[]) => subtasks ?? [];
const normalizeCoOwners = (coOwners?: string[]) => [...new Set((coOwners ?? []).map((name) => name.trim()).filter(Boolean))];

const roleNeedsApproval = (role: string) => role === "Staff";

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
  const [chats, setChats] = useState<ChatMessage[]>(initialState.chats);
  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>(initialState.personalNotes);
  const [serverHydrated, setServerHydrated] = useState(false);

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
        chats,
        personalNotes,
      } satisfies PersistedDataState)
    );
  }, [tasks, projects, notifications, approvals, documents, automations, auditLog, calendarEvents, recycleBin, chats, personalNotes]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const remoteState = await fetchServerState();
        if (!remoteState || cancelled) return;
        setTasks(remoteState.tasks ?? defaultState.tasks);
        setProjects(remoteState.projects ?? defaultState.projects);
        setNotifications(remoteState.notifications ?? defaultState.notifications);
        setApprovals(remoteState.approvals ?? defaultState.approvals);
        setDocuments(remoteState.documents ?? defaultState.documents);
        setAutomations(remoteState.automations ?? defaultState.automations);
        setAuditLog(remoteState.auditLog ?? defaultState.auditLog);
        setCalendarEvents(remoteState.calendarEvents ?? defaultState.calendarEvents);
        setRecycleBin(remoteState.recycleBin ?? []);
        setChats(remoteState.chats ?? []);
        setPersonalNotes(remoteState.personalNotes ?? []);
      } catch {
        // Fallback to local cache when the API is unavailable.
      } finally {
        if (!cancelled) setServerHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!serverHydrated) return;
    void saveServerState({
      tasks,
      projects,
      notifications,
      approvals,
      documents,
      automations,
      auditLog,
      calendarEvents,
      recycleBin,
      chats,
      personalNotes,
    });
  }, [approvals, auditLog, automations, calendarEvents, chats, documents, notifications, personalNotes, projects, recycleBin, serverHydrated, tasks]);

  useEffect(() => {
    const notificationsEnabled = currentUser.notificationSettings?.enabled ?? true;
    const deadlineNotificationsEnabled = currentUser.notificationSettings?.deadlines ?? true;

    setNotifications((items) => {
      const nonDeadline = items.filter((item) => item.kind !== "deadline");
      if (!notificationsEnabled || !deadlineNotificationsEnabled) return nonDeadline;

      const existing = new Map(items.filter((item) => item.kind === "deadline").map((item) => [item.id, item]));
      const deadlineItems: Notification[] = [
        ...tasks
          .filter((task) => task.status !== "Completed" && task.status !== "Cancelled" && isUpcoming(task.due))
          .map((task) => ({
            id: `deadline-task-${task.id}`,
            user: "System",
            action: "deadline reminder",
            target: `${task.title} is due ${deadlineLabel(task.due)}`,
            time: "Deadline reminder",
            read: existing.get(`deadline-task-${task.id}`)?.read ?? false,
            kind: "deadline" as const,
          })),
        ...projects
          .filter((project) => project.status !== "Completed" && project.status !== "Cancelled" && isUpcoming(project.end, 5))
          .map((project) => ({
            id: `deadline-project-${project.id}`,
            user: "System",
            action: "project reminder",
            target: `${project.name} ends ${deadlineLabel(project.end)}`,
            time: "Deadline reminder",
            read: existing.get(`deadline-project-${project.id}`)?.read ?? false,
            kind: "deadline" as const,
          })),
      ];

      return [...deadlineItems, ...nonDeadline].slice(0, 60);
    });
  }, [currentUser.notificationSettings?.deadlines, currentUser.notificationSettings?.enabled, projects, tasks]);

  const appendAudit = useCallback((entry: Omit<AuditEntry, "id" | "time"> & { time?: string }) => {
    setAuditLog((items) => [
      { ...entry, id: id("al"), time: entry.time ?? nowLabel() },
      ...items,
    ].slice(0, 100));
  }, []);

  const pushActivity = useCallback(
    (activity: Omit<Activity, "id" | "time">) => {
      setNotifications((items) => [{ ...activity, id: id("a"), time: nowLabel(), read: false, kind: "activity" }, ...items].slice(0, 30));
    },
    []
  );

  const pushNotification = useCallback(
    (activity: Omit<Activity, "id" | "time"> & { recipientUserId?: string; kind?: Notification["kind"] }) => {
      setNotifications((items) => [
        {
          ...activity,
          id: id("a"),
          time: nowLabel(),
          read: false,
          kind: activity.kind ?? "activity",
        },
        ...items,
      ].slice(0, 60));
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
      const requiresApproval = roleNeedsApproval(currentUser.role);
      const next: Task = {
        ...taskInput,
        id: id("t"),
        requiresApproval,
        approver: requiresApproval ? taskInput.approver : undefined,
        approvalHistory: taskInput.approvalHistory ?? [],
        subtasks: normalizeSubtasks(taskInput.subtasks),
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
    [appendAudit, currentUser.name, currentUser.role, pushActivity]
  );

  const updateTask: DataCtx["updateTask"] = useCallback(
    (taskId, patch) => {
      let updatedTask: Task | null = null;
      let submittedForApproval = false;

      setTasks((items) =>
        items.map((task) => {
          if (task.id !== taskId) return task;

          let next: Task = {
            ...task,
            ...patch,
            requiresApproval: patch.requiresApproval ?? task.requiresApproval,
            approver: (patch.requiresApproval ?? task.requiresApproval) ? patch.approver ?? task.approver : undefined,
            subtasks: normalizeSubtasks(patch.subtasks ?? task.subtasks),
          };
          if (
            patch.status === "Completed" &&
            task.status !== "Completed" &&
            next.requiresApproval &&
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
          target: updatedTask.title,
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
      const requiresApproval = roleNeedsApproval(currentUser.role);
      const next: Project = {
        ...projectInput,
        id: id("p"),
        milestones: projectInput.milestones ?? [],
        coOwners: normalizeCoOwners(projectInput.coOwners),
        requiresApproval,
        approver: requiresApproval ? projectInput.approver : undefined,
        approvalHistory: [],
        subtasks: normalizeSubtasks(projectInput.subtasks),
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
    [appendAudit, currentUser.name, currentUser.role, pushActivity]
  );

  const updateProject: DataCtx["updateProject"] = useCallback(
    (projectId, patch) => {
      let updatedProject: Project | null = null;
      let submittedForApproval = false;
      setProjects((items) =>
        items.map((project) => {
          if (project.id !== projectId) return project;
          let nextProject = recomputeProgress({
            ...project,
            ...patch,
            coOwners: normalizeCoOwners(patch.coOwners ?? project.coOwners),
            requiresApproval: patch.requiresApproval ?? project.requiresApproval,
            approver: (patch.requiresApproval ?? project.requiresApproval) ? patch.approver ?? project.approver : undefined,
            subtasks: normalizeSubtasks(patch.subtasks ?? project.subtasks),
          });
          if (
            patch.status === "Completed" &&
            project.status !== "Completed" &&
            nextProject.requiresApproval &&
            nextProject.approvalStatus !== "Approved"
          ) {
            const entry: ApprovalHistoryEntry = {
              id: id("h"),
              actor: currentUser.name,
              action: "Submitted",
              comment: "Submitted for approval",
              at: nowLabel(),
            };
            nextProject = {
              ...nextProject,
              status: "Waiting Review",
              approvalStatus: "Pending Approval",
              approvalHistory: [...(project.approvalHistory ?? []), entry],
            };
            submittedForApproval = true;
          }
          updatedProject = nextProject;
          return updatedProject;
        })
      );
      if (!updatedProject) return;
      if (submittedForApproval) {
        pushActivity({
          user: currentUser.name,
          action: "submitted project for approval",
          target: updatedProject.name,
        });
        appendAudit({
          user: currentUser.name,
          action: "Submitted project for approval",
          target: updatedProject.name,
          category: "Approval",
          team: updatedProject.team,
        });
        setApprovals((items) => {
          const existing = items.find((item) => item.projectId === updatedProject?.id);
          const nextApproval: Approval = {
            id: existing?.id ?? id("ap"),
            type: "Project",
            title: updatedProject.name,
            requester: updatedProject.owner,
            team: updatedProject.team,
            status: "Pending",
            submitted: todayIso(),
            notes: updatedProject.description,
            projectId: updatedProject.id,
          };
          return existing
            ? items.map((item) => (item.id === existing.id ? nextApproval : item))
            : [nextApproval, ...items];
        });
        return;
      }
      appendAudit({
        user: currentUser.name,
        action: "Updated project",
        target: updatedProject.name,
        category: "Project",
        team: updatedProject.team,
      });
      if (patch.status) {
        pushActivity({
          user: currentUser.name,
          action: patch.status === "Completed" ? "completed project" : `updated project to ${patch.status}`,
          target: updatedProject.name,
        });
      }
    },
    [appendAudit, currentUser.name, pushActivity]
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
    setNotifications((items) =>
      items.map((item) =>
        !item.recipientUserId || item.recipientUserId === currentUser.id ? { ...item, read: true } : item
      )
    );
  }, [currentUser.id]);

  const clearNotifications = useCallback(() => {
    setNotifications((items) =>
      items.filter((item) => item.recipientUserId && item.recipientUserId !== currentUser.id)
    );
  }, [currentUser.id]);

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

  const decideProjectApproval: DataCtx["decideProjectApproval"] = useCallback(
    (projectId, decision, comment) => {
      let decidedProject: Project | null = null;
      setProjects((items) =>
        items.map((project) => {
          if (project.id !== projectId) return project;
          const entry: ApprovalHistoryEntry = {
            id: id("h"),
            actor: currentUser.name,
            action: decision,
            comment,
            at: nowLabel(),
          };
          const nextStatus: Project["status"] =
            decision === "Approved"
              ? "Completed"
              : decision === "Rejected"
                ? "On Hold"
                : "Active";
          decidedProject = {
            ...project,
            status: nextStatus,
            approvalStatus: decision as TaskApprovalStatus,
            approvalHistory: [...(project.approvalHistory ?? []), entry],
          };
          return decidedProject;
        })
      );

      if (!decidedProject) return;

      const approvalStatusMap: Record<"Approved" | "Rejected" | "Returned for Revision", ApprovalStatus> = {
        Approved: "Approved",
        Rejected: "Rejected",
        "Returned for Revision": "Returned",
      };
      setApprovals((items) =>
        items.map((approval) =>
          approval.projectId === projectId
            ? { ...approval, status: approvalStatusMap[decision], notes: comment || approval.notes }
            : approval
        )
      );
      pushActivity({
        user: currentUser.name,
        action:
          decision === "Approved"
            ? "approved project"
            : decision === "Rejected"
              ? "rejected project completion"
              : "returned project for revision",
        target: decidedProject.name,
      });
      appendAudit({
        user: currentUser.name,
        action: decision,
        target: decidedProject.name,
        category: "Approval",
        team: decidedProject.team,
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

  const removeCalendarEvent: DataCtx["removeCalendarEvent"] = useCallback(
    (eventId) => {
      let removedEvent: CalendarEvent | null = null;
      setCalendarEvents((items) =>
        items.filter((event) => {
          if (event.id === eventId) removedEvent = event;
          return event.id !== eventId;
        })
      );
      if (!removedEvent) return;
      appendAudit({
        user: currentUser.name,
        action: "Deleted calendar event",
        target: removedEvent.title,
        category: "System",
        team: removedEvent.team,
      });
      pushActivity({ user: currentUser.name, action: "deleted calendar event", target: removedEvent.title });
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const requestCalendarPto: DataCtx["requestCalendarPto"] = useCallback(
    (event) => {
      const approval: Approval = {
        id: id("ap"),
        type: "Leave",
        title: `${event.createdByName} PTO request`,
        requester: event.createdByName,
        requestedById: event.createdById,
        team: event.team ?? currentUser.team,
        status: "Pending",
        submitted: todayIso(),
        notes: event.title,
        calendarEventDraft: event,
      };
      setApprovals((items) => [approval, ...items]);
      appendAudit({
        user: currentUser.name,
        action: "Submitted PTO request",
        target: event.title,
        category: "Approval",
        team: approval.team,
      });
      pushActivity({ user: currentUser.name, action: "submitted PTO request", target: event.title });
    },
    [appendAudit, currentUser.name, currentUser.team, pushActivity]
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
      if (updatedApproval.projectId) {
        const projectDecision =
          status === "Approved"
            ? "Approved"
            : status === "Rejected"
              ? "Rejected"
              : status === "Returned"
                ? "Returned for Revision"
                : null;
        if (projectDecision) decideProjectApproval(updatedApproval.projectId, projectDecision, comment);
      }
      if (updatedApproval.type === "Leave" && updatedApproval.calendarEventDraft && status === "Approved") {
        addCalendarEvent(updatedApproval.calendarEventDraft);
        pushActivity({
          user: currentUser.name,
          action: "approved PTO request",
          target: updatedApproval.title,
        });
      }
      appendAudit({
        user: currentUser.name,
        action: `Set approval to ${status}`,
        target: updatedApproval.title,
        category: "Approval",
        team: updatedApproval.team,
      });
    },
    [addCalendarEvent, appendAudit, currentUser.name, decideProjectApproval, decideTaskApproval, pushActivity]
  );

  const hideApproval: DataCtx["hideApproval"] = useCallback(
    (approvalId) => {
      let hiddenApproval: Approval | null = null;
      setApprovals((items) =>
        items.map((approval) => {
          if (approval.id !== approvalId) return approval;
          hiddenApproval = { ...approval, hidden: true };
          return hiddenApproval;
        })
      );
      if (!hiddenApproval) return;
      appendAudit({
        user: currentUser.name,
        action: "Hid approval",
        target: hiddenApproval.title,
        category: "Approval",
        team: hiddenApproval.team,
      });
    },
    [appendAudit, currentUser.name]
  );

  const removeApproval: DataCtx["removeApproval"] = useCallback(
    (approvalId) => {
      let removedApproval: Approval | null = null;
      setApprovals((items) =>
        items.filter((approval) => {
          if (approval.id === approvalId) removedApproval = approval;
          return approval.id !== approvalId;
        })
      );
      if (!removedApproval) return;
      appendAudit({
        user: currentUser.name,
        action: "Deleted approval",
        target: removedApproval.title,
        category: "Approval",
        team: removedApproval.team,
      });
    },
    [appendAudit, currentUser.name]
  );

  const clearApprovals: DataCtx["clearApprovals"] = useCallback(() => {
    setApprovals([]);
  }, []);

  const clearAuditLog: DataCtx["clearAuditLog"] = useCallback(() => {
    setAuditLog([]);
  }, []);

  const sendChatMessage: DataCtx["sendChatMessage"] = useCallback(
    (recipientId, body, attachment) => {
      const text = body.trim();
      if (!text && !attachment) return;
      const recipient = auth.userList.find((user) => user.id === recipientId);
      if (!recipient) return;
      const message: ChatMessage = {
        id: id("msg"),
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: recipient.id,
        recipientName: recipient.name,
        body: text,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size,
        attachmentDataUrl: attachment?.dataUrl,
        attachmentMimeType: attachment?.mimeType,
        createdAt: new Date().toISOString(),
      };
      setChats((items) => [...items, message]);
      pushNotification({
        user: currentUser.name,
        action: "sent you a message",
        target: recipient.name,
        recipientUserId: recipient.id,
      });
    },
    [auth.userList, currentUser.id, currentUser.name, pushNotification]
  );

  const updateChatMessage: DataCtx["updateChatMessage"] = useCallback(
    (messageId, body) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      setChats((items) =>
        items.map((entry) =>
          entry.id === messageId && entry.senderId === currentUser.id
            ? { ...entry, body: trimmed, updatedAt: new Date().toISOString() }
            : entry
        )
      );
    },
    [currentUser.id]
  );

  const removeChatMessage: DataCtx["removeChatMessage"] = useCallback(
    (messageId) => {
      setChats((items) => items.filter((entry) => !(entry.id === messageId && entry.senderId === currentUser.id)));
    },
    [currentUser.id]
  );

  const addPersonalNote: DataCtx["addPersonalNote"] = useCallback(
    (note) => {
      const now = new Date().toISOString();
      const next: PersonalNote = {
        id: id("note"),
        userId: currentUser.id,
        title: note.title,
        body: note.body,
        taskTitle: note.taskTitle,
        completed: note.completed,
        createdAt: now,
        updatedAt: now,
      };
      setPersonalNotes((items) => [next, ...items]);
    },
    [currentUser.id]
  );

  const updatePersonalNote: DataCtx["updatePersonalNote"] = useCallback((noteId, patch) => {
    setPersonalNotes((items) =>
      items.map((note) =>
        note.id === noteId ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note
      )
    );
  }, []);

  const removePersonalNote: DataCtx["removePersonalNote"] = useCallback((noteId) => {
    setPersonalNotes((items) => items.filter((note) => note.id !== noteId));
  }, []);

  const notificationsForUser =
    currentUser.notificationSettings?.enabled === false
      ? []
      : notifications.filter((notification) => !notification.recipientUserId || notification.recipientUserId === currentUser.id);

  const value = useMemo<DataCtx>(
    () => ({
      tasks,
      projects,
      notifications: notificationsForUser,
      unreadCount: notificationsForUser.filter((notification) => !notification.read).length,
      approvals,
      documents,
      automations,
      auditLog,
      calendarEvents,
      recycleBin,
      chats,
      personalNotes,
      addTask,
      updateTask,
      removeTask,
      addProject,
      updateProject,
      removeProject,
      toggleMilestone,
      pushActivity,
      pushNotification,
      markAllRead,
      clearNotifications,
      decideTaskApproval,
      decideProjectApproval,
      addTaskApprovalComment,
      decideApproval,
      hideApproval,
      removeApproval,
      clearApprovals,
      addDocument,
      removeDocument,
      restoreRecycleItem,
      purgeRecycleItem,
      toggleAutomation,
      addCalendarEvent,
      removeCalendarEvent,
      requestCalendarPto,
      clearAuditLog,
      sendChatMessage,
      updateChatMessage,
      removeChatMessage,
      addPersonalNote,
      updatePersonalNote,
      removePersonalNote,
    }),
    [
      tasks,
      projects,
      notificationsForUser,
      approvals,
      documents,
      automations,
      auditLog,
      calendarEvents,
      recycleBin,
      chats,
      personalNotes,
      addTask,
      updateTask,
      removeTask,
      addProject,
      updateProject,
      removeProject,
      toggleMilestone,
      pushActivity,
      pushNotification,
      markAllRead,
      clearNotifications,
      decideTaskApproval,
      decideProjectApproval,
      addTaskApprovalComment,
      decideApproval,
      hideApproval,
      removeApproval,
      clearApprovals,
      addDocument,
      removeDocument,
      restoreRecycleItem,
      purgeRecycleItem,
      toggleAutomation,
      addCalendarEvent,
      removeCalendarEvent,
      requestCalendarPto,
      clearAuditLog,
      sendChatMessage,
      updateChatMessage,
      removeChatMessage,
      addPersonalNote,
      updatePersonalNote,
      removePersonalNote,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useData = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
