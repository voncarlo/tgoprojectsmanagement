import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  teams,
} from "@/data/mock";
import { useAuth } from "@/auth/AuthContext";
import { COMPANY_WORKSPACE_ID } from "@/lib/workspaces";
import { extractMentionedUsers, toggleReactionEntries, type ReactionEntry } from "@/lib/social";
import { toast } from "sonner";

interface Notification extends Activity {
  actorId?: string;
  read: boolean;
  readAt?: string;
  kind?: "activity" | "deadline";
  recipientUserId?: string;
  title?: string;
  preview?: string;
  link?: string;
  workspaceLabel?: string;
  entityType?: "task" | "project" | "document" | "approval" | "comment" | "event" | "chat";
  entityId?: string;
  targetType?: "task" | "project" | "document" | "comment" | "chat";
  targetId?: string;
  parentId?: string;
  topic?: "task" | "project" | "approval" | "comment" | "mention" | "status" | "calendar" | "deadline" | "chat";
  createdAt?: string;
  updatedAt?: string;
}

type RecycleBinType = "task" | "document" | "project";

export interface ChatMessage {
  id: string;
  workspaceId: string;
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
  mentions?: string[];
  reactions?: ReactionEntry[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  team: Task["team"];
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  mentions?: string[];
  reactions?: ReactionEntry[];
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

interface ServerStateMeta {
  revision: number;
  sourceClientId?: string;
}

interface ServerStateResponse {
  data: PersistedDataState | null;
  meta: ServerStateMeta;
}

const fetchServerState = async (): Promise<ServerStateResponse> => {
  const response = await fetch("/api/state/app");
  if (!response.ok) {
    throw new Error(`Unable to load app state (${response.status}).`);
  }
  const payload = (await response.json()) as { ok: boolean; data?: PersistedDataState | null; meta?: Partial<ServerStateMeta> };
  return {
    data: payload.data ?? null,
    meta: {
      revision: typeof payload.meta?.revision === "number" ? payload.meta.revision : 0,
      sourceClientId: payload.meta?.sourceClientId,
    },
  };
};

const saveServerState = async (state: PersistedDataState, sourceClientId: string): Promise<ServerStateMeta> => {
  const response = await fetch("/api/state/app", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state,
      meta: {
        sourceClientId,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Unable to save app state (${response.status}).`);
  }
  const payload = (await response.json()) as { ok: boolean; meta?: Partial<ServerStateMeta> };
  return {
    revision: typeof payload.meta?.revision === "number" ? payload.meta.revision : 0,
    sourceClientId: payload.meta?.sourceClientId,
  };
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
  deletedTaskIds: string[];
  projects: Project[];
  deletedProjectIds: string[];
  notifications: Notification[];
  approvals: Approval[];
  deletedApprovalIds: string[];
  documents: DocumentFile[];
  deletedDocumentIds: string[];
  automations: AutomationRule[];
  auditLog: AuditEntry[];
  calendarEvents: CalendarEvent[];
  deletedCalendarEventIds: string[];
  recycleBin: RecycleBinItem[];
  chats: ChatMessage[];
  taskComments: TaskComment[];
  chatReadAtByUser: Record<string, Record<string, string>>;
  personalNotes: PersonalNote[];
}

interface DataCtx {
  tasks: Task[];
  allTasks: Task[];
  projects: Project[];
  allProjects: Project[];
  notifications: Notification[];
  unreadCount: number;
  unreadChatCount: number;
  approvals: Approval[];
  documents: DocumentFile[];
  automations: AutomationRule[];
  auditLog: AuditEntry[];
  calendarEvents: CalendarEvent[];
  allCalendarEvents: CalendarEvent[];
  recycleBin: RecycleBinItem[];
  chats: ChatMessage[];
  taskComments: TaskComment[];
  personalNotes: PersonalNote[];
  addTask: (t: Omit<Task, "id">) => Task | null;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  addProject: (p: Omit<Project, "id" | "milestones"> & { milestones?: Milestone[] }) => Project | null;
  updateProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  toggleMilestone: (projectId: string, name: string) => void;
  pushActivity: (a: Omit<Activity, "id" | "time"> & Partial<Omit<Notification, keyof Activity | "id" | "time" | "read">>) => void;
  pushNotification: (
    a: Omit<Activity, "id" | "time"> &
      Partial<Omit<Notification, keyof Activity | "id" | "time" | "read">> & {
        recipientUserId?: string;
        kind?: Notification["kind"];
      }
  ) => void;
  markNotificationRead: (notificationId: string) => void;
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
  markChatsRead: (partnerId?: string) => void;
  getUnreadChatCountForContact: (partnerId: string) => number;
  sendChatMessage: (
    recipientId: string,
    body: string,
    attachment?: { name: string; size: string; dataUrl?: string; mimeType?: string }
  ) => void;
  updateChatMessage: (messageId: string, body: string) => void;
  removeChatMessage: (messageId: string) => void;
  addTaskComment: (taskId: string, body: string) => void;
  toggleChatReaction: (messageId: string, emoji: string) => void;
  toggleTaskCommentReaction: (commentId: string, emoji: string) => void;
  addPersonalNote: (note: Omit<PersonalNote, "id" | "userId" | "createdAt" | "updatedAt">) => void;
  updatePersonalNote: (id: string, patch: Partial<PersonalNote>) => void;
  removePersonalNote: (id: string) => void;
}

const STORAGE_KEY = "tgo.data";
const REALTIME_CLIENT_ID_STORAGE_KEY = "tgo.data.realtimeClientId";
const Ctx = createContext<DataCtx | null>(null);

const id = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);
const createRealtimeClientId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2, 10)}`;
const getRealtimeClientId = () => {
  if (typeof window === "undefined") return createRealtimeClientId();
  const existing = window.sessionStorage.getItem(REALTIME_CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;
  const nextId = createRealtimeClientId();
  window.sessionStorage.setItem(REALTIME_CLIENT_ID_STORAGE_KEY, nextId);
  return nextId;
};
const nowLabel = () => "Just now";
const todayIso = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

const mergeRecordCollections = <T extends { id: string }>(remoteItems: T[] = [], localItems: T[] = []) => {
  const next = new Map<string, T>();
  remoteItems.forEach((item) => next.set(item.id, item));
  localItems.forEach((item) => next.set(item.id, item));
  return [...next.values()];
};

const mergePersistedState = (remoteState: PersistedDataState | null, localState: PersistedDataState): PersistedDataState => {
  if (!remoteState) return localState;
  const deletedTaskIds = [...new Set([...(remoteState.deletedTaskIds ?? []), ...(localState.deletedTaskIds ?? [])])];
  const deletedProjectIds = [...new Set([...(remoteState.deletedProjectIds ?? []), ...(localState.deletedProjectIds ?? [])])];
  const deletedApprovalIds = [...new Set([...(remoteState.deletedApprovalIds ?? []), ...(localState.deletedApprovalIds ?? [])])];
  const deletedDocumentIds = [...new Set([...(remoteState.deletedDocumentIds ?? []), ...(localState.deletedDocumentIds ?? [])])];
  const deletedCalendarEventIds = [...new Set([...(remoteState.deletedCalendarEventIds ?? []), ...(localState.deletedCalendarEventIds ?? [])])];
  return {
    tasks: mergeRecordCollections(remoteState.tasks, localState.tasks).filter((task) => !deletedTaskIds.includes(task.id)),
    deletedTaskIds,
    projects: mergeRecordCollections(remoteState.projects, localState.projects).filter((project) => !deletedProjectIds.includes(project.id)),
    deletedProjectIds,
    notifications: mergeRecordCollections(remoteState.notifications, localState.notifications),
    approvals: mergeRecordCollections(remoteState.approvals, localState.approvals).filter(
      (approval) =>
        !deletedApprovalIds.includes(approval.id) &&
        (!approval.taskId || !deletedTaskIds.includes(approval.taskId)) &&
        (!approval.projectId || !deletedProjectIds.includes(approval.projectId))
    ),
    deletedApprovalIds,
    documents: mergeRecordCollections(remoteState.documents, localState.documents).filter((document) => !deletedDocumentIds.includes(document.id)),
    deletedDocumentIds,
    automations: mergeRecordCollections(remoteState.automations, localState.automations),
    auditLog: mergeRecordCollections(remoteState.auditLog, localState.auditLog),
    calendarEvents: mergeRecordCollections(remoteState.calendarEvents, localState.calendarEvents).filter(
      (event) => !deletedCalendarEventIds.includes(event.id)
    ),
    deletedCalendarEventIds,
    recycleBin: mergeRecordCollections(remoteState.recycleBin, localState.recycleBin),
    chats: mergeRecordCollections(remoteState.chats, localState.chats),
    taskComments: mergeRecordCollections(remoteState.taskComments, localState.taskComments).filter(
      (comment) => !deletedTaskIds.includes(comment.taskId)
    ),
    chatReadAtByUser: { ...(remoteState.chatReadAtByUser ?? {}), ...(localState.chatReadAtByUser ?? {}) },
    personalNotes: mergeRecordCollections(remoteState.personalNotes, localState.personalNotes),
  };
};

const defaultState: PersistedDataState = {
  tasks: seedTasks,
  deletedTaskIds: [],
  projects: seedProjects,
  deletedProjectIds: [],
  notifications: seedActivity.map((item) => ({ ...item, read: false })),
  approvals: seedApprovals,
  deletedApprovalIds: [],
  documents: seedDocuments,
  deletedDocumentIds: [],
  automations: seedAutomations,
  auditLog: seedAuditLog,
  calendarEvents: seedCalendarEvents,
  deletedCalendarEventIds: [],
  recycleBin: [],
  chats: [],
  taskComments: [],
  chatReadAtByUser: {},
  personalNotes: [],
};

const loadState = (): PersistedDataState => {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<PersistedDataState>;
    const deletedTaskIds = parsed.deletedTaskIds ?? defaultState.deletedTaskIds;
    const deletedProjectIds = parsed.deletedProjectIds ?? defaultState.deletedProjectIds;
    const deletedApprovalIds = parsed.deletedApprovalIds ?? defaultState.deletedApprovalIds;
    const deletedDocumentIds = parsed.deletedDocumentIds ?? defaultState.deletedDocumentIds;
    const deletedCalendarEventIds = parsed.deletedCalendarEventIds ?? defaultState.deletedCalendarEventIds;
    return {
      tasks: (parsed.tasks?.length ? parsed.tasks : defaultState.tasks).filter((task) => !deletedTaskIds.includes(task.id)),
      deletedTaskIds,
      projects: (parsed.projects?.length ? parsed.projects : defaultState.projects).filter((project) => !deletedProjectIds.includes(project.id)),
      deletedProjectIds,
      notifications: parsed.notifications?.length ? parsed.notifications : defaultState.notifications,
      approvals: (parsed.approvals?.length ? parsed.approvals : defaultState.approvals).filter(
        (approval) =>
          !deletedApprovalIds.includes(approval.id) &&
          (!approval.taskId || !deletedTaskIds.includes(approval.taskId)) &&
          (!approval.projectId || !deletedProjectIds.includes(approval.projectId))
      ),
      deletedApprovalIds,
      documents: (parsed.documents?.length ? parsed.documents : defaultState.documents).filter((document) => !deletedDocumentIds.includes(document.id)),
      deletedDocumentIds,
      automations: parsed.automations?.length ? parsed.automations : defaultState.automations,
      auditLog: parsed.auditLog?.length ? parsed.auditLog : defaultState.auditLog,
      calendarEvents: (parsed.calendarEvents?.length ? parsed.calendarEvents : defaultState.calendarEvents).filter(
        (event) => !deletedCalendarEventIds.includes(event.id)
      ),
      deletedCalendarEventIds,
      recycleBin: parsed.recycleBin ?? defaultState.recycleBin,
      chats: parsed.chats ?? defaultState.chats,
      taskComments: (parsed.taskComments ?? defaultState.taskComments).filter((comment) => !deletedTaskIds.includes(comment.taskId)),
      chatReadAtByUser: parsed.chatReadAtByUser ?? defaultState.chatReadAtByUser,
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
const sortOpenSubtasksFirst = (subtasks?: Subtask[]) => {
  const normalized = normalizeSubtasks(subtasks);
  return [...normalized].sort((left, right) => Number(left.done) - Number(right.done));
};

const roleNeedsApproval = (role: string) => role === "Staff";
const departmentLabel = (team?: TeamId) => teams.find((entry) => entry.id === team)?.name ?? "Torero Global Outsourcing";
const DELETED_USER_LABEL = "Deleted User";
const LEGACY_DELETED_USER_NAMES = [String.fromCharCode(74, 97, 109, 101, 115, 32, 83, 116, 101, 102, 102, 97, 110)];
const replaceDeletedNamesInText = (value: string | undefined, deletedNames: string[]) => {
  if (!value) return value;
  return deletedNames.reduce((text, name) => text.split(name).join(DELETED_USER_LABEL), value);
};
const sanitizeDisplayName = (
  name: string | undefined,
  deletedNames: Set<string>,
  deletedIds: Set<string>,
  userId?: string
) => {
  if (!name) return DELETED_USER_LABEL;
  if ((userId && deletedIds.has(userId)) || deletedNames.has(name)) return DELETED_USER_LABEL;
  return name;
};
const defaultNotificationLink = (entityType?: Notification["entityType"], topic?: Notification["topic"]) => {
  if (entityType === "task" || entityType === "comment" || topic === "task" || topic === "status") return "/tasks";
  if (entityType === "project" || topic === "project") return "/projects";
  if (entityType === "approval" || topic === "approval") return "/approvals";
  if (entityType === "event" || topic === "calendar" || topic === "deadline") return "/calendar";
  if (entityType === "chat" || topic === "chat" || topic === "mention") return "/chat";
  return "/notifications";
};
const inferNotificationTopic = (action: string, kind?: Notification["kind"]): Notification["topic"] | undefined => {
  if (kind === "deadline") return "deadline";
  const normalized = action.toLowerCase();
  if (normalized.includes("message")) return "chat";
  if (normalized.includes("mention")) return "mention";
  if (normalized.includes("comment")) return "comment";
  if (normalized.includes("approval") || normalized.includes("approved") || normalized.includes("rejected") || normalized.includes("returned")) return "approval";
  if (normalized.includes("calendar") || normalized.includes("pto")) return "calendar";
  if (normalized.includes("created project") || normalized.includes("project request")) return "project";
  if (normalized.includes("created task") || normalized.includes("task request")) return "task";
  if (normalized.includes("completed task") || normalized.includes("completed project") || normalized.includes("moved to") || normalized.includes("updated project to")) return "status";
  return undefined;
};
const notificationTitle = (topic?: Notification["topic"]) => {
  switch (topic) {
    case "task":
      return "Task update";
    case "project":
      return "Project update";
    case "approval":
      return "Approval update";
    case "comment":
      return "New comment";
    case "mention":
      return "You were mentioned";
    case "status":
      return "Status changed";
    case "calendar":
      return "Calendar update";
    case "deadline":
      return "Reminder";
    case "chat":
      return "New message";
    default:
      return "Notification";
  }
};
const uniqueUserIds = (userIds: Array<string | undefined>) => [...new Set(userIds.filter((value): value is string => Boolean(value)))];
const shouldCreateNotification = (topic?: Notification["topic"], kind?: Notification["kind"]) =>
  kind === "deadline" || ["task", "project", "approval", "comment", "mention", "status", "calendar", "chat"].includes(topic ?? "");
const buildQueryString = (entries: Array<[string, string | undefined]>) => {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
};
const buildNotificationLink = (
  notification: Pick<Notification, "link" | "targetType" | "targetId" | "parentId" | "entityType" | "entityId" | "topic">
) => {
  const targetType = notification.targetType ?? notification.entityType;
  const targetId = notification.targetId ?? notification.entityId;
  switch (targetType) {
    case "task":
      return targetId ? `/tasks${buildQueryString([["task", targetId]])}` : notification.link ?? "/tasks";
    case "project":
      return targetId ? `/projects${buildQueryString([["project", targetId]])}` : notification.link ?? "/projects";
    case "document":
      return targetId ? `/documents${buildQueryString([["document", targetId]])}` : notification.link ?? "/documents";
    case "comment":
      return `/tasks${buildQueryString([["task", notification.parentId], ["comment", targetId]])}`;
    case "chat":
      return `/chat${buildQueryString([["chat", notification.parentId]])}`;
    default:
      return notification.link ?? defaultNotificationLink(notification.entityType, notification.topic);
  }
};
const getChatPartnerId = (message: ChatMessage, userId: string) =>
  message.senderId === userId ? message.recipientId : message.recipientId === userId ? message.senderId : null;
const buildApprovalItemType = (approval: Pick<Approval, "type">): Approval["itemType"] => {
  if (approval.type === "Task") return "task";
  if (approval.type === "Project") return "project";
  if (approval.type === "Leave") return "event";
  return "approval";
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const currentUser = auth.currentUser;
  const activeWorkspace = auth.activeWorkspace;
  const visibleTeams = auth.visibleTeams;
  const isCompanyLevelUser = currentUser.role === "Super Admin" || currentUser.role === "Admin";
  const deletedUserNames = useMemo(
    () => [...new Set([...LEGACY_DELETED_USER_NAMES, ...(auth.deletedUsers ?? []).map((user) => user.name)])],
    [auth.deletedUsers]
  );
  const deletedUserNameSet = useMemo(() => new Set(deletedUserNames), [deletedUserNames]);
  const deletedUserIdSet = useMemo(() => new Set((auth.deletedUsers ?? []).map((user) => user.id)), [auth.deletedUsers]);
  const canDirectTaskCreate = auth.can("task.create");
  const canDirectProjectCreate = auth.can("project.create");
  const initialState = loadState();
  const realtimeClientIdRef = useRef(getRealtimeClientId());
  const latestServerRevisionRef = useRef(0);
  const skipNextServerSaveRef = useRef(false);
  const syncFailureToastShownRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>(initialState.tasks);
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>(initialState.deletedTaskIds ?? []);
  const [projects, setProjects] = useState<Project[]>(initialState.projects);
  const [deletedProjectIds, setDeletedProjectIds] = useState<string[]>(initialState.deletedProjectIds ?? []);
  const [notifications, setNotifications] = useState<Notification[]>(initialState.notifications);
  const [approvals, setApprovals] = useState<Approval[]>(initialState.approvals);
  const [deletedApprovalIds, setDeletedApprovalIds] = useState<string[]>(initialState.deletedApprovalIds ?? []);
  const [documents, setDocuments] = useState<DocumentFile[]>(initialState.documents);
  const [deletedDocumentIds, setDeletedDocumentIds] = useState<string[]>(initialState.deletedDocumentIds ?? []);
  const [automations, setAutomations] = useState<AutomationRule[]>(initialState.automations);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(initialState.auditLog);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initialState.calendarEvents);
  const [deletedCalendarEventIds, setDeletedCalendarEventIds] = useState<string[]>(initialState.deletedCalendarEventIds ?? []);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(initialState.recycleBin);
  const [chats, setChats] = useState<ChatMessage[]>(initialState.chats);
  const [taskComments, setTaskComments] = useState<TaskComment[]>(initialState.taskComments);
  const [chatReadAtByUser, setChatReadAtByUser] = useState<Record<string, Record<string, string>>>(initialState.chatReadAtByUser);
  const [personalNotes, setPersonalNotes] = useState<PersonalNote[]>(initialState.personalNotes);
  const [serverHydrated, setServerHydrated] = useState(false);
  const persistedState = useMemo<PersistedDataState>(
    () => ({
      tasks,
      deletedTaskIds,
      projects,
      deletedProjectIds,
      notifications,
      approvals,
      deletedApprovalIds,
      documents,
      deletedDocumentIds,
      automations,
      auditLog,
      calendarEvents,
      deletedCalendarEventIds,
      recycleBin,
      chats,
      taskComments,
      chatReadAtByUser,
      personalNotes,
    }),
    [approvals, auditLog, automations, calendarEvents, chats, chatReadAtByUser, deletedApprovalIds, deletedCalendarEventIds, deletedDocumentIds, deletedProjectIds, deletedTaskIds, documents, notifications, personalNotes, projects, recycleBin, taskComments, tasks]
  );
  const applyRemoteState = useCallback((remoteState: PersistedDataState, revision = 0) => {
    skipNextServerSaveRef.current = true;
    latestServerRevisionRef.current = Math.max(latestServerRevisionRef.current, revision);
    setTasks((remoteState.tasks ?? defaultState.tasks).filter((task) => !(remoteState.deletedTaskIds ?? []).includes(task.id)));
    setDeletedTaskIds(remoteState.deletedTaskIds ?? []);
    setProjects((remoteState.projects ?? defaultState.projects).filter((project) => !(remoteState.deletedProjectIds ?? []).includes(project.id)));
    setDeletedProjectIds(remoteState.deletedProjectIds ?? []);
    setNotifications(remoteState.notifications ?? defaultState.notifications);
    setApprovals(
      (remoteState.approvals ?? defaultState.approvals).filter(
        (approval) =>
          !(remoteState.deletedApprovalIds ?? []).includes(approval.id) &&
          (!approval.taskId || !(remoteState.deletedTaskIds ?? []).includes(approval.taskId)) &&
          (!approval.projectId || !(remoteState.deletedProjectIds ?? []).includes(approval.projectId))
      )
    );
    setDeletedApprovalIds(remoteState.deletedApprovalIds ?? []);
    setDocuments((remoteState.documents ?? defaultState.documents).filter((document) => !(remoteState.deletedDocumentIds ?? []).includes(document.id)));
    setDeletedDocumentIds(remoteState.deletedDocumentIds ?? []);
    setAutomations(remoteState.automations ?? defaultState.automations);
    setAuditLog(remoteState.auditLog ?? defaultState.auditLog);
    setCalendarEvents((remoteState.calendarEvents ?? defaultState.calendarEvents).filter((event) => !(remoteState.deletedCalendarEventIds ?? []).includes(event.id)));
    setDeletedCalendarEventIds(remoteState.deletedCalendarEventIds ?? []);
    setRecycleBin(remoteState.recycleBin ?? []);
    setChats(remoteState.chats ?? []);
    setTaskComments((remoteState.taskComments ?? []).filter((comment) => !(remoteState.deletedTaskIds ?? []).includes(comment.taskId)));
    setChatReadAtByUser(remoteState.chatReadAtByUser ?? defaultState.chatReadAtByUser);
    setPersonalNotes(remoteState.personalNotes ?? []);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  }, [persistedState]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const remote = await fetchServerState();
        if (!remote.data || cancelled) return;
        applyRemoteState(remote.data, remote.meta.revision);
      } catch (error) {
        console.error("[state] initial hydration failed", error);
      } finally {
        if (!cancelled) setServerHydrated(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [applyRemoteState]);

  useEffect(() => {
    if (!serverHydrated) return;
    if (skipNextServerSaveRef.current) {
      skipNextServerSaveRef.current = false;
      return;
    }
    void (async () => {
      try {
        const remote = await fetchServerState();
        const mergedState = mergePersistedState(remote.data, persistedState);
        const meta = await saveServerState(mergedState, realtimeClientIdRef.current);
        latestServerRevisionRef.current = Math.max(latestServerRevisionRef.current, meta.revision);
        if (JSON.stringify(mergedState) !== JSON.stringify(persistedState)) {
          applyRemoteState(mergedState, meta.revision);
        }
        syncFailureToastShownRef.current = false;
      } catch (error) {
        console.error("[state] save failed", error);
        if (!syncFailureToastShownRef.current) {
          toast.error("We couldn't save the latest update. Retrying in the background.");
          syncFailureToastShownRef.current = true;
        }
      }
    })();
  }, [persistedState, serverHydrated]);

  useEffect(() => {
    if (!serverHydrated || typeof window === "undefined") return;

    let closed = false;
    let eventSource: EventSource | null = null;

    const syncIfNewer = async (expectedRevision?: number) => {
      try {
        const remote = await fetchServerState();
        if (!remote.data) return;
        const remoteRevision = remote.meta.revision ?? 0;
        if (expectedRevision && remoteRevision < expectedRevision) return;
        if (remoteRevision <= latestServerRevisionRef.current) return;
        applyRemoteState(remote.data, remoteRevision);
        syncFailureToastShownRef.current = false;
      } catch (error) {
        console.error("[state] realtime reconciliation failed", error);
      }
    };

    try {
      eventSource = new EventSource("/api/realtime/app");
      eventSource.addEventListener("ready", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { revision?: number };
        latestServerRevisionRef.current = Math.max(latestServerRevisionRef.current, payload.revision ?? 0);
      });
      eventSource.addEventListener("app-state-updated", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as { revision?: number; sourceClientId?: string };
        const revision = payload.revision ?? 0;
        if (payload.sourceClientId === realtimeClientIdRef.current) {
          latestServerRevisionRef.current = Math.max(latestServerRevisionRef.current, revision);
          return;
        }
        void syncIfNewer(revision);
      });
      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
      };
    } catch {
      eventSource = null;
    }

    const poller = window.setInterval(() => {
      if (closed) return;
      void syncIfNewer();
    }, 5000);

    const onReconnect = () => {
      void syncIfNewer();
    };

    window.addEventListener("online", onReconnect);
    document.addEventListener("visibilitychange", onReconnect);

    return () => {
      closed = true;
      window.clearInterval(poller);
       window.removeEventListener("online", onReconnect);
       document.removeEventListener("visibilitychange", onReconnect);
      eventSource?.close();
    };
  }, [applyRemoteState, serverHydrated]);

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
            id: `deadline-task-${task.id}-${currentUser.id}`,
            user: "System",
            action: "deadline reminder",
            target: `${task.title} is due ${deadlineLabel(task.due)}`,
            time: "Deadline reminder",
            team: task.team,
            read: existing.get(`deadline-task-${task.id}-${currentUser.id}`)?.read ?? false,
            readAt: existing.get(`deadline-task-${task.id}-${currentUser.id}`)?.readAt,
            kind: "deadline" as const,
            topic: "deadline" as const,
            recipientUserId: currentUser.id,
            title: "Task deadline",
            preview: `${task.title} is due ${deadlineLabel(task.due)}.`,
            link: "/tasks",
            workspaceLabel: departmentLabel(task.team),
            entityType: "task" as const,
            entityId: task.id,
            createdAt: existing.get(`deadline-task-${task.id}-${currentUser.id}`)?.createdAt ?? nowIso(),
            updatedAt: nowIso(),
          })),
        ...projects
          .filter((project) => project.status !== "Completed" && project.status !== "Cancelled" && isUpcoming(project.end, 5))
          .map((project) => ({
            id: `deadline-project-${project.id}-${currentUser.id}`,
            user: "System",
            action: "project reminder",
            target: `${project.name} ends ${deadlineLabel(project.end)}`,
            time: "Deadline reminder",
            team: project.team,
            read: existing.get(`deadline-project-${project.id}-${currentUser.id}`)?.read ?? false,
            readAt: existing.get(`deadline-project-${project.id}-${currentUser.id}`)?.readAt,
            kind: "deadline" as const,
            topic: "deadline" as const,
            recipientUserId: currentUser.id,
            title: "Project deadline",
            preview: `${project.name} ends ${deadlineLabel(project.end)}.`,
            link: "/projects",
            workspaceLabel: departmentLabel(project.team),
            entityType: "project" as const,
            entityId: project.id,
            createdAt: existing.get(`deadline-project-${project.id}-${currentUser.id}`)?.createdAt ?? nowIso(),
            updatedAt: nowIso(),
          })),
        ...calendarEvents
          .filter((event) => isUpcoming(event.date, 3))
          .map((event) => ({
            id: `deadline-event-${event.id}-${currentUser.id}`,
            user: "System",
            action: "event reminder",
            target: `${event.title} is scheduled ${deadlineLabel(event.date)}`,
            time: "Event reminder",
            team: event.team,
            read: existing.get(`deadline-event-${event.id}-${currentUser.id}`)?.read ?? false,
            readAt: existing.get(`deadline-event-${event.id}-${currentUser.id}`)?.readAt,
            kind: "deadline" as const,
            topic: "deadline" as const,
            recipientUserId: currentUser.id,
            title: "Event reminder",
            preview: `${event.title} is scheduled ${deadlineLabel(event.date)}.`,
            link: "/calendar",
            workspaceLabel: departmentLabel(event.team),
            entityType: "event" as const,
            entityId: event.id,
            createdAt: existing.get(`deadline-event-${event.id}-${currentUser.id}`)?.createdAt ?? nowIso(),
            updatedAt: nowIso(),
          })),
      ];

      return [...deadlineItems, ...nonDeadline].slice(0, 60);
    });
  }, [calendarEvents, currentUser.id, currentUser.notificationSettings?.deadlines, currentUser.notificationSettings?.enabled, projects, tasks]);

  const userHasTeamAccess = useCallback(
    (userId: string, team?: TeamId) => {
      const user = auth.userList.find((entry) => entry.id === userId);
      if (!user) return false;
      if (user.role === "Super Admin" || user.role === "Admin") return true;
      if (!team) return (user.workspaceIds ?? []).includes(COMPANY_WORKSPACE_ID);
      return (user.teams ?? [user.team]).includes(team) || (user.workspaceIds ?? []).includes(COMPANY_WORKSPACE_ID);
    },
    [auth.userList]
  );

  const appendAudit = useCallback((entry: Omit<AuditEntry, "id" | "time"> & { time?: string }) => {
    setAuditLog((items) => [
      { ...entry, id: id("al"), time: entry.time ?? nowLabel() },
      ...items,
    ].slice(0, 100));
  }, []);

  const logNotificationDispatch = useCallback(
    (payload: { actorId?: string; recipientIds: string[]; type?: Notification["topic"]; targetId?: string; target: string }) => {
      console.debug("[notifications]", {
        actorId: payload.actorId ?? null,
        recipientIds: payload.recipientIds,
        notificationType: payload.type ?? null,
        targetId: payload.targetId ?? null,
        target: payload.target,
      });
    },
    []
  );

  const pushActivity: DataCtx["pushActivity"] = useCallback(
    (activity) => {
      const team = activity.team ?? (activeWorkspace?.isCompanyWide ? undefined : visibleTeams[0]);
      const topic = activity.topic ?? inferNotificationTopic(activity.action, activity.kind);
      if (!shouldCreateNotification(topic, activity.kind)) return;
      if (activity.kind !== "deadline" && !activity.recipientUserId) return;
      const createdAt = activity.createdAt ?? nowIso();
      setNotifications((items) => [
        {
          ...activity,
          team,
          id: id("a"),
          actorId: activity.actorId,
          time: nowLabel(),
          read: false,
          readAt: undefined,
          kind: activity.kind ?? "activity",
          topic,
          title: activity.title ?? notificationTitle(topic),
          preview: activity.preview ?? `${activity.user} ${activity.action} ${activity.target}`.trim(),
          link: buildNotificationLink({ ...activity, topic }),
          workspaceLabel: activity.workspaceLabel ?? departmentLabel(team),
          createdAt,
          updatedAt: activity.updatedAt ?? createdAt,
        },
        ...items,
      ].slice(0, 60));
    },
    [activeWorkspace?.isCompanyWide, visibleTeams]
  );

  const pushNotification: DataCtx["pushNotification"] = useCallback(
    (activity) => {
      const team = activity.team ?? (activeWorkspace?.isCompanyWide ? undefined : visibleTeams[0]);
      const topic = activity.topic ?? inferNotificationTopic(activity.action, activity.kind);
      if (!shouldCreateNotification(topic, activity.kind)) return;
      const createdAt = activity.createdAt ?? nowIso();
      setNotifications((items) => [
        {
          ...activity,
          team,
          id: id("a"),
          actorId: activity.actorId ?? currentUser.id,
          time: nowLabel(),
          read: false,
          readAt: undefined,
          kind: activity.kind ?? "activity",
          topic,
          title: activity.title ?? notificationTitle(topic),
          preview: activity.preview ?? `${activity.user} ${activity.action} ${activity.target}`.trim(),
          link: buildNotificationLink({ ...activity, topic }),
          workspaceLabel: activity.workspaceLabel ?? departmentLabel(team),
          createdAt,
          updatedAt: activity.updatedAt ?? createdAt,
        },
        ...items,
      ].slice(0, 60));
      logNotificationDispatch({
        actorId: activity.actorId ?? currentUser.id,
        recipientIds: uniqueUserIds([activity.recipientUserId]),
        type: topic,
        targetId: activity.targetId ?? activity.entityId,
        target: activity.target,
      });
    },
    [activeWorkspace?.isCompanyWide, currentUser.id, logNotificationDispatch, visibleTeams]
  );
  const getApprovalRecipientsForTeam = useCallback(
    (team: TeamId) => auth.getTeamApprovalRecipients(team),
    [auth]
  );
  const getApprovalRecipientIdsForTeam = useCallback(
    (team: TeamId) => uniqueUserIds(getApprovalRecipientsForTeam(team).map((user) => user.id)),
    [getApprovalRecipientsForTeam]
  );
  const getApprovalSummaryForTeam = useCallback(
    (team: TeamId) => {
      const recipients = getApprovalRecipientsForTeam(team);
      if (recipients.length === 0) return "Admins and Super Admins";
      return recipients.map((user) => user.name).join(", ");
    },
    [getApprovalRecipientsForTeam]
  );
  const notifyApprovalRecipients = useCallback(
    (
      team: TeamId,
      payload: {
        action: string;
        target: string;
        preview: string;
        entityType?: Notification["entityType"];
        entityId?: string;
        targetType?: Notification["targetType"];
        targetId?: string;
        parentId?: string;
      }
    ) => {
      getApprovalRecipientsForTeam(team).forEach((recipient) => {
        if (recipient.id === currentUser.id) return;
        pushNotification({
          user: currentUser.name,
          action: payload.action,
          target: payload.target,
          preview: payload.preview,
          recipientUserId: recipient.id,
          team,
          topic: "approval",
          entityType: payload.entityType,
          entityId: payload.entityId,
          targetType: payload.targetType,
          targetId: payload.targetId,
          parentId: payload.parentId,
        });
      });
    },
    [currentUser.id, currentUser.name, getApprovalRecipientsForTeam, pushNotification]
  );
  const notifyApprovalRequester = useCallback(
    (
      userId: string | undefined,
      payload: {
        action: string;
        target: string;
        preview: string;
        team: TeamId;
        entityType?: Notification["entityType"];
        entityId?: string;
      }
    ) => {
      if (!userId || userId === currentUser.id) return;
      pushNotification({
        user: currentUser.name,
        action: payload.action,
        target: payload.target,
        preview: payload.preview,
        recipientUserId: userId,
        team: payload.team,
        topic: "approval",
        entityType: payload.entityType,
        entityId: payload.entityId,
      });
    },
    [currentUser.id, currentUser.name, pushNotification]
  );
  const notifyUsers = useCallback(
    (
      recipientIds: string[],
      payload: {
        action: string;
        target: string;
        preview: string;
        team?: TeamId;
        topic?: Notification["topic"];
        title?: string;
        workspaceLabel?: string;
        entityType?: Notification["entityType"];
        entityId?: string;
        targetType?: Notification["targetType"];
        targetId?: string;
        parentId?: string;
      }
    ) => {
      uniqueUserIds(recipientIds)
        .filter((recipientId) => recipientId !== currentUser.id)
        .forEach((recipientId) => {
          pushNotification({
            actorId: currentUser.id,
            user: currentUser.name,
            action: payload.action,
            target: payload.target,
            preview: payload.preview,
            recipientUserId: recipientId,
            team: payload.team,
            topic: payload.topic,
            title: payload.title,
            workspaceLabel: payload.workspaceLabel,
            entityType: payload.entityType,
            entityId: payload.entityId,
            targetType: payload.targetType,
            targetId: payload.targetId,
            parentId: payload.parentId,
          });
        });
    },
    [currentUser.id, currentUser.name, pushNotification]
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

  const buildTaskRecord = useCallback(
    (taskInput: Omit<Task, "id">, options?: { requiresApproval?: boolean; approvalHistory?: ApprovalHistoryEntry[] }) => {
      const requiresApproval = options?.requiresApproval ?? roleNeedsApproval(currentUser.role);
      return {
        ...taskInput,
        id: id("t"),
        assignedBy: taskInput.assignedBy ?? currentUser.name,
        requiresApproval,
        approver: requiresApproval ? taskInput.approver ?? getApprovalSummaryForTeam(taskInput.team) : undefined,
        approvalHistory: options?.approvalHistory ?? taskInput.approvalHistory ?? [],
        subtasks: normalizeSubtasks(taskInput.subtasks),
      } satisfies Task;
    },
    [currentUser.name, currentUser.role, getApprovalSummaryForTeam]
  );

  const addTask: DataCtx["addTask"] = useCallback(
    (taskInput) => {
      const normalizedTask = {
        ...taskInput,
        assignedBy: taskInput.assignedBy ?? currentUser.name,
        subtasks: normalizeSubtasks(taskInput.subtasks),
      };

      if (!canDirectTaskCreate) {
        const approverIds = getApprovalRecipientIdsForTeam(normalizedTask.team);
        const approval: Approval = {
          id: id("ap"),
          type: "Task",
          title: normalizedTask.title,
          requester: currentUser.name,
          requestedById: currentUser.id,
          team: normalizedTask.team,
          status: "Pending",
          submitted: todayIso(),
          notes: normalizedTask.notes,
          itemType: "task",
          itemId: normalizedTask.title,
          departmentId: normalizedTask.team,
          approverIds,
          taskDraft: {
            ...normalizedTask,
            status: normalizedTask.status === "Completed" ? "Not Started" : normalizedTask.status,
            requiresApproval: false,
            approvalStatus: undefined,
            approvalHistory: [],
          },
        };
        setDeletedApprovalIds((items) => items.filter((approvalId) => approvalId !== approval.id));
        setApprovals((items) => [approval, ...items]);
        console.debug("[approvals] created task approval request", {
          approvalId: approval.id,
          requestedBy: currentUser.id,
          approverIds,
          team: normalizedTask.team,
        });
        pushActivity({ user: currentUser.name, action: "requested task", target: normalizedTask.title });
        appendAudit({
          user: currentUser.name,
          action: "Submitted task request",
          target: normalizedTask.title,
          category: "Approval",
          team: normalizedTask.team,
        });
        notifyApprovalRecipients(normalizedTask.team, {
          action: "submitted task request",
          target: normalizedTask.title,
          preview: `${currentUser.name} submitted a task request for ${normalizedTask.title}.`,
          entityType: "approval",
        });
        return null;
      }

      const next = buildTaskRecord(normalizedTask);
      setDeletedTaskIds((items) => items.filter((taskId) => taskId !== next.id));
      setTasks((items) => [next, ...items]);
      pushActivity({ user: currentUser.name, action: "created task", target: next.title, targetType: "task", targetId: next.id });
      notifyUsers(uniqueUserIds([auth.userList.find((user) => user.name === next.assignee)?.id]), {
        action: "assigned you a task",
        target: next.title,
        preview: `${next.title} was assigned to you.`,
        team: next.team,
        topic: "task",
        entityType: "task",
        entityId: next.id,
        targetType: "task",
        targetId: next.id,
      });
      appendAudit({
        user: currentUser.name,
        action: "Created task",
        target: next.title,
        category: "Task",
        team: next.team,
      });
      return next;
    },
    [appendAudit, auth.userList, buildTaskRecord, canDirectTaskCreate, currentUser.id, currentUser.name, getApprovalRecipientIdsForTeam, notifyApprovalRecipients, notifyUsers, pushActivity]
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
            approver: (patch.requiresApproval ?? task.requiresApproval) ? patch.approver ?? task.approver ?? getApprovalSummaryForTeam(task.team) : undefined,
            subtasks: normalizeSubtasks(patch.subtasks ?? task.subtasks),
          };
          if (
            patch.status === "Completed" &&
            task.status !== "Completed" &&
            currentUser.role === "Staff" &&
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
          targetType: "task",
          targetId: updatedTask.id,
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
            requestedById: auth.userList.find((user) => user.name === updatedTask?.assignee)?.id,
            taskId: updatedTask.id,
            itemType: "task",
            itemId: updatedTask.id,
            departmentId: updatedTask.team,
            approverIds: getApprovalRecipientIdsForTeam(updatedTask.team),
          };
          setDeletedApprovalIds((items) => items.filter((approvalId) => approvalId !== nextApproval.id));
          return existing
            ? items.map((item) => (item.id === existing.id ? nextApproval : item))
            : [nextApproval, ...items];
        });
        notifyApprovalRecipients(updatedTask.team, {
          action: "submitted task for approval",
          target: updatedTask.title,
          preview: `${updatedTask.title} is waiting for approval.`,
          entityType: "approval",
          entityId: updatedTask.id,
          targetType: "task",
          targetId: updatedTask.id,
        });
        return;
      }

        if (patch.status) {
          notifyUsers(uniqueUserIds([auth.userList.find((user) => user.name === updatedTask.assignee)?.id]), {
            action: patch.status === "Completed" ? "completed a task assigned to you" : "updated a task assigned to you",
            target: updatedTask.title,
            preview: `${updatedTask.title} is now ${patch.status}.`,
            team: updatedTask.team,
            topic: "status",
            entityType: "task",
            entityId: updatedTask.id,
            targetType: "task",
            targetId: updatedTask.id,
          });
          pushActivity({
            user: currentUser.name,
            action: patch.status === "Completed" ? "completed task" : `moved to ${patch.status}`,
            target: updatedTask.title,
            targetType: "task",
            targetId: updatedTask.id,
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
    [appendAudit, auth.userList, currentUser.name, getApprovalRecipientIdsForTeam, pushActivity, notifyUsers]
  );

  const removeTask: DataCtx["removeTask"] = useCallback(
    (taskId) => {
      const existing = tasks.find((task) => task.id === taskId);
      if (!existing) {
        console.error("[tasks] delete failed: task not found", { taskId });
        toast.error("We couldn't delete that task because it was no longer found.");
        return;
      }
      console.debug("[tasks] deleting task", { taskId, title: existing.title });
      setDeletedTaskIds((items) => (items.includes(taskId) ? items : [taskId, ...items]));
      setTasks((items) => items.filter((task) => task.id !== taskId));
      setApprovals((items) => items.filter((approval) => approval.taskId !== taskId));
      setTaskComments((items) => items.filter((comment) => comment.taskId !== taskId));
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
      pushActivity({ user: currentUser.name, action: "deleted task", target: existing.title, targetType: "task", targetId: existing.id });
    },
    [addToRecycleBin, appendAudit, currentUser.name, pushActivity, tasks]
  );

  const addProject: DataCtx["addProject"] = useCallback(
    (projectInput) => {
      const normalizedProject = recomputeProgress({
        ...projectInput,
        milestones: projectInput.milestones ?? [],
        coOwners: normalizeCoOwners(projectInput.coOwners),
        requiresApproval: false,
        approver: undefined,
        approvalHistory: [],
        subtasks: sortOpenSubtasksFirst(projectInput.subtasks),
      } as Project);

      if (!canDirectProjectCreate) {
        const approverIds = getApprovalRecipientIdsForTeam(normalizedProject.team);
        const approval: Approval = {
          id: id("ap"),
          type: "Project",
          title: normalizedProject.name,
          requester: currentUser.name,
          requestedById: currentUser.id,
          team: normalizedProject.team,
          status: "Pending",
          submitted: todayIso(),
          notes: normalizedProject.description,
          itemType: "project",
          itemId: normalizedProject.name,
          departmentId: normalizedProject.team,
          approverIds,
          projectDraft: {
            ...normalizedProject,
            requiresApproval: false,
            approvalStatus: undefined,
            approvalHistory: [],
          },
        };
        setDeletedApprovalIds((items) => items.filter((approvalId) => approvalId !== approval.id));
        setApprovals((items) => [approval, ...items]);
        console.debug("[approvals] created project approval request", {
          approvalId: approval.id,
          requestedBy: currentUser.id,
          approverIds,
          team: normalizedProject.team,
        });
        pushActivity({ user: currentUser.name, action: "requested project", target: normalizedProject.name });
        appendAudit({
          user: currentUser.name,
          action: "Submitted project request",
          target: normalizedProject.name,
          category: "Approval",
          team: normalizedProject.team,
        });
        notifyApprovalRecipients(normalizedProject.team, {
          action: "submitted project request",
          target: normalizedProject.name,
          preview: `${currentUser.name} submitted a project request for ${normalizedProject.name}.`,
          entityType: "approval",
        });
        return null;
      }

      const requiresApproval = roleNeedsApproval(currentUser.role);
      const next: Project = {
        ...normalizedProject,
        id: id("p"),
        requiresApproval,
        approver: requiresApproval ? projectInput.approver ?? getApprovalSummaryForTeam(projectInput.team) : undefined,
        approvalHistory: [],
      };
      setDeletedProjectIds((items) => items.filter((projectId) => projectId !== next.id));
      setProjects((items) => [next, ...items]);
      pushActivity({ user: currentUser.name, action: "created project", target: next.name, targetType: "project", targetId: next.id });
      notifyUsers(
        uniqueUserIds([
          auth.userList.find((user) => user.name === next.owner)?.id,
          ...(next.coOwners ?? []).map((name) => auth.userList.find((user) => user.name === name)?.id),
        ]),
        {
          action: "added you to a project",
          target: next.name,
          preview: `${next.name} is now available in your workspace.`,
          team: next.team,
          topic: "project",
          entityType: "project",
          entityId: next.id,
          targetType: "project",
          targetId: next.id,
        }
      );
      appendAudit({
        user: currentUser.name,
        action: "Created project",
        target: next.name,
        category: "Project",
        team: next.team,
      });
      return next;
    },
    [appendAudit, auth.userList, canDirectProjectCreate, currentUser.id, currentUser.name, currentUser.role, getApprovalRecipientIdsForTeam, getApprovalSummaryForTeam, notifyApprovalRecipients, notifyUsers, pushActivity]
  );

  const updateProject: DataCtx["updateProject"] = useCallback(
    (projectId, patch) => {
      let updatedProject: Project | null = null;
      let submittedForApproval = false;
      const existingProject = projects.find((project) => project.id === projectId);
      if (!existingProject) {
        console.error("[projects] update failed: project not found", { projectId, patch });
        toast.error("We couldn't update that project because it was no longer found.");
        return;
      }

      const requestedCoOwners = patch.coOwners ? normalizeCoOwners(patch.coOwners) : undefined;
      const currentCoOwners = normalizeCoOwners(existingProject.coOwners);
      const membershipChanged =
        requestedCoOwners !== undefined &&
        (requestedCoOwners.length !== currentCoOwners.length ||
          requestedCoOwners.some((name, index) => name !== currentCoOwners[index]));
      const canManageMembers =
        existingProject.owner === currentUser.name || currentUser.role === "Admin" || currentUser.role === "Super Admin";

      if (membershipChanged && !canManageMembers) {
        console.error("[projects] member update denied", {
          projectId,
          actorId: currentUser.id,
          owner: existingProject.owner,
          requestedCoOwners,
        });
        toast.error("Only the project owner, Admin, or Super Admin can update project members.");
        return;
      }

      setProjects((items) =>
        items.map((project) => {
          if (project.id !== projectId) return project;
          let nextProject = recomputeProgress({
            ...project,
            ...patch,
            coOwners: normalizeCoOwners((requestedCoOwners ?? project.coOwners)?.filter((name) => name !== project.owner)),
            requiresApproval: patch.requiresApproval ?? project.requiresApproval,
            approver: (patch.requiresApproval ?? project.requiresApproval) ? patch.approver ?? project.approver ?? getApprovalSummaryForTeam(project.team) : undefined,
            subtasks: sortOpenSubtasksFirst(patch.subtasks ?? project.subtasks),
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
          targetType: "project",
          targetId: updatedProject.id,
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
            requestedById: auth.userList.find((user) => user.name === updatedProject?.owner)?.id,
            itemType: "project",
            itemId: updatedProject.id,
            departmentId: updatedProject.team,
            approverIds: getApprovalRecipientIdsForTeam(updatedProject.team),
          };
          setDeletedApprovalIds((items) => items.filter((approvalId) => approvalId !== nextApproval.id));
          return existing
            ? items.map((item) => (item.id === existing.id ? nextApproval : item))
            : [nextApproval, ...items];
        });
        notifyApprovalRecipients(updatedProject.team, {
          action: "submitted project for approval",
          target: updatedProject.name,
          preview: `${updatedProject.name} is waiting for approval.`,
          entityType: "approval",
          entityId: updatedProject.id,
          targetType: "project",
          targetId: updatedProject.id,
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
      if (membershipChanged) {
        console.debug("[projects] members updated", {
          projectId,
          actorId: currentUser.id,
          owner: existingProject.owner,
          members: requestedCoOwners ?? [],
        });
      }
      if (patch.status) {
        notifyUsers(
          uniqueUserIds([
            auth.userList.find((user) => user.name === updatedProject.owner)?.id,
            ...(updatedProject.coOwners ?? []).map((name) => auth.userList.find((user) => user.name === name)?.id),
          ]),
          {
            action: "updated a project you follow",
            target: updatedProject.name,
            preview: `${updatedProject.name} is now ${patch.status}.`,
            team: updatedProject.team,
            topic: "status",
            entityType: "project",
            entityId: updatedProject.id,
            targetType: "project",
            targetId: updatedProject.id,
          }
        );
        pushActivity({
          user: currentUser.name,
          action: patch.status === "Completed" ? "completed project" : `updated project to ${patch.status}`,
          target: updatedProject.name,
          targetType: "project",
          targetId: updatedProject.id,
        });
      }
    },
    [appendAudit, auth.userList, currentUser.id, currentUser.name, currentUser.role, getApprovalRecipientIdsForTeam, getApprovalSummaryForTeam, notifyUsers, projects, pushActivity]
  );

  const removeProject: DataCtx["removeProject"] = useCallback(
    (projectId) => {
      const existing = projects.find((project) => project.id === projectId);
      if (!existing) {
        console.error("[projects] delete failed: project not found", { projectId });
        toast.error("We couldn't delete that project because it was no longer found.");
        return;
      }
      console.debug("[projects] deleting project", { projectId, name: existing.name });
      setDeletedProjectIds((items) => (items.includes(projectId) ? items : [projectId, ...items]));
      setProjects((items) => items.filter((project) => project.id !== projectId));
      setApprovals((items) => items.filter((approval) => approval.projectId !== projectId));
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
      pushActivity({ user: currentUser.name, action: "deleted project", target: existing.name, targetType: "project", targetId: existing.id });
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
    const readAt = nowIso();
    setNotifications((items) =>
      items.map((item) =>
        !item.recipientUserId || item.recipientUserId === currentUser.id ? { ...item, read: true, readAt, updatedAt: readAt } : item
      )
    );
  }, [currentUser.id]);

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      const readAt = nowIso();
      setNotifications((items) =>
        items.map((item) =>
          item.id === notificationId && (!item.recipientUserId || item.recipientUserId === currentUser.id)
            ? { ...item, read: true, readAt, updatedAt: readAt }
            : item
        )
      );
    },
    [currentUser.id]
  );

  const clearNotifications = useCallback(() => {
    setNotifications((items) =>
      items.filter((item) => item.recipientUserId && item.recipientUserId !== currentUser.id)
    );
  }, [currentUser.id]);

  const decideTaskApproval: DataCtx["decideTaskApproval"] = useCallback(
    (taskId, decision, comment) => {
      let decidedTask: Task | null = null;
      const existingTask = tasks.find((task) => task.id === taskId);
      if (!existingTask || !auth.canDecideTeamApprovals(existingTask.team)) return;
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
      notifyApprovalRequester(existingTask.assignee ? auth.userList.find((user) => user.name === existingTask.assignee)?.id : undefined, {
        action: `updated task approval to ${decision}`,
        target: decidedTask.title,
        preview: comment?.trim() || `${decidedTask.title} was ${decision.toLowerCase()}.`,
        team: decidedTask.team,
        entityType: "task",
        entityId: decidedTask.id,
      });
    },
    [appendAudit, auth, currentUser.name, notifyApprovalRequester, pushActivity, tasks]
  );

  const decideProjectApproval: DataCtx["decideProjectApproval"] = useCallback(
    (projectId, decision, comment) => {
      let decidedProject: Project | null = null;
      const existingProject = projects.find((project) => project.id === projectId);
      if (!existingProject || !auth.canDecideTeamApprovals(existingProject.team)) return;
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
      notifyApprovalRequester(auth.userList.find((user) => user.name === existingProject.owner)?.id, {
        action: `updated project approval to ${decision}`,
        target: decidedProject.name,
        preview: comment?.trim() || `${decidedProject.name} was ${decision.toLowerCase()}.`,
        team: decidedProject.team,
        entityType: "project",
        entityId: decidedProject.id,
      });
    },
    [appendAudit, auth, currentUser.name, notifyApprovalRequester, projects, pushActivity]
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
      pushActivity({
        user: currentUser.name,
        action: "commented on approval",
        target: commentedTask.title,
        team: commentedTask.team,
        topic: "comment",
        entityType: "approval",
        link: "/approvals",
        preview: comment.trim(),
      });
    },
    [appendAudit, currentUser.name, getApprovalSummaryForTeam, notifyApprovalRecipients, pushActivity]
  );

  const addDocument: DataCtx["addDocument"] = useCallback(
    (doc) => {
      const next: DocumentFile = {
        ...doc,
        id: id("d"),
        updated: nowLabel(),
        version: doc.version ?? "v1",
      };
      setDeletedDocumentIds((items) => items.filter((documentId) => documentId !== next.id));
      setDocuments((items) => [next, ...items]);
      appendAudit({
        user: currentUser.name,
        action: "Uploaded",
        target: next.name,
        category: "File",
        team: next.team,
      });
      pushActivity({ user: currentUser.name, action: "uploaded file", target: next.name, targetType: "document", targetId: next.id, entityType: "document", entityId: next.id });
      return next;
    },
    [appendAudit, currentUser.name, pushActivity]
  );

  const removeDocument: DataCtx["removeDocument"] = useCallback(
    (docId) => {
      const existing = documents.find((doc) => doc.id === docId);
      if (!existing) {
        console.error("[documents] delete failed: document not found", { docId });
        toast.error("We couldn't delete that document because it was no longer found.");
        return;
      }
      console.debug("[documents] deleting document", { docId, name: existing.name });
      setDeletedDocumentIds((items) => (items.includes(docId) ? items : [docId, ...items]));
      setDocuments((items) => items.filter((doc) => doc.id !== docId));
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
      pushActivity({ user: currentUser.name, action: "deleted document", target: existing.name, targetType: "document", targetId: existing.id, entityType: "document", entityId: existing.id });
    },
    [addToRecycleBin, appendAudit, currentUser.name, documents, pushActivity]
  );

  const restoreRecycleItem: DataCtx["restoreRecycleItem"] = useCallback(
    (recycleId) => {
      const existing = recycleBin.find((item) => item.id === recycleId);
      if (!existing) return;

      if (existing.type === "task") {
        setDeletedTaskIds((items) => items.filter((taskId) => taskId !== existing.resourceId));
        setTasks((items) => {
          if (items.some((task) => task.id === existing.resourceId)) return items;
          return [existing.payload as Task, ...items];
        });
      }

      if (existing.type === "project") {
        setDeletedProjectIds((items) => items.filter((projectId) => projectId !== existing.resourceId));
        setProjects((items) => {
          if (items.some((project) => project.id === existing.resourceId)) return items;
          return [existing.payload as Project, ...items];
        });
      }

      if (existing.type === "document") {
        setDeletedDocumentIds((items) => items.filter((documentId) => documentId !== existing.resourceId));
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
      setDeletedCalendarEventIds((items) => items.filter((eventId) => eventId !== next.id));
      setCalendarEvents((items) => [next, ...items]);
      appendAudit({
        user: currentUser.name,
        action: "Created calendar event",
        target: next.title,
        category: "System",
        team: next.team,
      });
      pushActivity({
        user: currentUser.name,
        action: "created calendar event",
        target: next.title,
        team: next.team,
        topic: "calendar",
        entityType: "event",
        entityId: next.id,
        link: "/calendar",
        preview: `${next.type} scheduled for ${next.date}.`,
      });
      return next;
    },
    [appendAudit, currentUser.name, getApprovalSummaryForTeam, notifyApprovalRecipients, pushActivity]
  );

  const removeCalendarEvent: DataCtx["removeCalendarEvent"] = useCallback(
    (eventId) => {
      const existingEvent = calendarEvents.find((event) => event.id === eventId);
      if (!existingEvent) {
        console.error("[calendar] delete failed: event not found", { eventId });
        toast.error("We couldn't delete that calendar entry because it was no longer found.");
        return;
      }
      let removedEvent: CalendarEvent | null = null;
      setDeletedCalendarEventIds((items) => (items.includes(eventId) ? items : [eventId, ...items]));
      setCalendarEvents((items) =>
        items.filter((event) => {
          if (event.id === eventId) removedEvent = event;
          return event.id !== eventId;
        })
      );
      if (!removedEvent) {
        return;
      }
      appendAudit({
        user: currentUser.name,
        action: "Deleted calendar event",
        target: removedEvent.title,
        category: "System",
        team: removedEvent.team,
      });
      pushActivity({ user: currentUser.name, action: "deleted calendar event", target: removedEvent.title });
    },
    [appendAudit, calendarEvents, currentUser.name, currentUser.role, pushActivity]
  );

  const requestCalendarPto: DataCtx["requestCalendarPto"] = useCallback(
    (event) => {
      const approverIds = getApprovalRecipientIdsForTeam(event.team ?? visibleTeams[0] ?? "projects");
      const approval: Approval = {
        id: id("ap"),
        type: "Leave",
        title: `${event.createdByName} PTO request`,
        requester: event.createdByName,
        requestedById: event.createdById,
        team: event.team ?? visibleTeams[0] ?? "projects",
        status: "Pending",
        submitted: todayIso(),
        notes: event.title,
        itemType: "event",
        itemId: event.title,
        departmentId: event.team ?? visibleTeams[0] ?? "projects",
        approverIds,
        calendarEventDraft: event,
      };
      setDeletedApprovalIds((items) => items.filter((approvalId) => approvalId !== approval.id));
      setApprovals((items) => [approval, ...items]);
      console.debug("[approvals] created leave approval request", {
        approvalId: approval.id,
        requestedBy: approval.requestedById,
        approverIds,
        team: approval.team,
      });
      appendAudit({
        user: currentUser.name,
        action: "Submitted PTO request",
        target: event.title,
        category: "Approval",
        team: approval.team,
      });
      notifyApprovalRecipients(approval.team, {
        action: "submitted PTO request",
        target: event.title,
        preview: `${event.createdByName} submitted a PTO request.`,
        entityType: "approval",
      });
      pushActivity({
        user: currentUser.name,
        action: "submitted PTO request",
        target: event.title,
        team: approval.team,
        topic: "approval",
        entityType: "approval",
        link: "/approvals",
      });
    },
    [appendAudit, currentUser.name, getApprovalRecipientIdsForTeam, notifyApprovalRecipients, pushActivity, visibleTeams]
  );

  const decideApproval: DataCtx["decideApproval"] = useCallback(
    (approvalId, status, comment) => {
      let updatedApproval: Approval | null = null;
      const existingApproval = approvals.find((approval) => approval.id === approvalId);
      if (!existingApproval || !auth.canDecideTeamApprovals(existingApproval.team)) return;
      setApprovals((items) =>
        items.map((approval) => {
          if (approval.id !== approvalId) return approval;
          updatedApproval = {
            ...approval,
            status,
            notes: comment || approval.notes,
            approvedBy: status === "Approved" ? currentUser.id : approval.approvedBy,
            rejectedBy: status === "Rejected" || status === "Returned" ? currentUser.id : approval.rejectedBy,
          };
          return updatedApproval;
        })
      );
      if (!updatedApproval) return;
      console.debug("[approvals] decision recorded", {
        approvalId,
        status,
        actorId: currentUser.id,
        itemType: updatedApproval.itemType ?? buildApprovalItemType(updatedApproval),
        itemId: updatedApproval.itemId ?? updatedApproval.taskId ?? updatedApproval.projectId ?? updatedApproval.id,
      });
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
      if (updatedApproval.taskDraft && status === "Approved") {
        const createdTask = buildTaskRecord(
          {
            ...updatedApproval.taskDraft,
            requiresApproval: false,
            approvalStatus: undefined,
            approvalHistory: [],
          },
          { requiresApproval: false, approvalHistory: [] }
        );
        setTasks((items) => [createdTask, ...items]);
        pushActivity({
          user: currentUser.name,
          action: "approved task request",
          target: createdTask.title,
        });
        appendAudit({
          user: currentUser.name,
          action: "Approved task request",
          target: createdTask.title,
          category: "Approval",
          team: createdTask.team,
        });
        notifyUsers(uniqueUserIds([auth.userList.find((user) => user.name === createdTask.assignee)?.id]), {
          action: "approved and published a task for you",
          target: createdTask.title,
          preview: `${createdTask.title} is now live in your task list.`,
          team: createdTask.team,
          topic: "task",
          entityType: "task",
          entityId: createdTask.id,
          targetType: "task",
          targetId: createdTask.id,
        });
      }
      if (updatedApproval.projectDraft && status === "Approved") {
        const createdProject: Project = recomputeProgress({
          ...updatedApproval.projectDraft,
          id: id("p"),
          milestones: updatedApproval.projectDraft.milestones ?? [],
          coOwners: normalizeCoOwners(updatedApproval.projectDraft.coOwners),
          requiresApproval: false,
          approver: undefined,
          approvalStatus: undefined,
          approvalHistory: [],
          subtasks: sortOpenSubtasksFirst(updatedApproval.projectDraft.subtasks),
        });
        setProjects((items) => [createdProject, ...items]);
        pushActivity({
          user: currentUser.name,
          action: "approved project request",
          target: createdProject.name,
        });
        appendAudit({
          user: currentUser.name,
          action: "Approved project request",
          target: createdProject.name,
          category: "Approval",
          team: createdProject.team,
        });
        notifyUsers(
          uniqueUserIds([
            auth.userList.find((user) => user.name === createdProject.owner)?.id,
            ...(createdProject.coOwners ?? []).map((name) => auth.userList.find((user) => user.name === name)?.id),
          ]),
          {
            action: "approved and published a project for you",
            target: createdProject.name,
            preview: `${createdProject.name} is now live in your workspace.`,
            team: createdProject.team,
            topic: "project",
            entityType: "project",
            entityId: createdProject.id,
            targetType: "project",
            targetId: createdProject.id,
          }
        );
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
          team: updatedApproval.team,
          topic: "approval",
          entityType: "approval",
          link: "/approvals",
        });
      }
      pushActivity({
        user: currentUser.name,
        action: `updated approval to ${status}`,
        target: updatedApproval.title,
        team: updatedApproval.team,
        topic: "approval",
        entityType: "approval",
        link: "/approvals",
        preview: comment?.trim() || `${updatedApproval.title} is now ${status}.`,
      });
      appendAudit({
        user: currentUser.name,
        action: `Set approval to ${status}`,
        target: updatedApproval.title,
        category: "Approval",
        team: updatedApproval.team,
      });
      notifyApprovalRequester(updatedApproval.requestedById, {
        action: `updated approval to ${status}`,
        target: updatedApproval.title,
        preview: comment?.trim() || `${updatedApproval.title} is now ${status}.`,
        team: updatedApproval.team,
        entityType: "approval",
        entityId: updatedApproval.id,
      });
    },
    [addCalendarEvent, approvals, appendAudit, auth, buildTaskRecord, currentUser.id, currentUser.name, decideProjectApproval, decideTaskApproval, notifyApprovalRequester, notifyUsers, pushActivity]
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
      setDeletedApprovalIds((items) => (items.includes(approvalId) ? items : [approvalId, ...items]));
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
    setDeletedApprovalIds((items) => [...new Set([...items, ...approvals.map((approval) => approval.id)])]);
    setApprovals([]);
  }, [approvals]);

  const clearAuditLog: DataCtx["clearAuditLog"] = useCallback(() => {
    setAuditLog([]);
  }, []);

  const markChatsRead: DataCtx["markChatsRead"] = useCallback(
    (partnerId) => {
      const now = new Date().toISOString();
      setChatReadAtByUser((items) => {
        const existing = items[currentUser.id] ?? {};
        if (partnerId) {
          return {
            ...items,
            [currentUser.id]: {
              ...existing,
              [partnerId]: now,
            },
          };
        }

        const partnerIds = chats
          .map((entry) => getChatPartnerId(entry, currentUser.id))
          .filter((entry): entry is string => Boolean(entry));
        const nextReadMap = { ...existing };
        partnerIds.forEach((entry) => {
          nextReadMap[entry] = now;
        });
        return { ...items, [currentUser.id]: nextReadMap };
      });
    },
    [chats, currentUser.id]
  );

  const getUnreadChatCountForContact = useCallback(
    (partnerId: string) => {
      const lastReadAt = chatReadAtByUser[currentUser.id]?.[partnerId];
      return chats.filter((entry) => {
        if (entry.senderId !== partnerId || entry.recipientId !== currentUser.id) return false;
        if (!lastReadAt) return true;
        return new Date(entry.createdAt).getTime() > new Date(lastReadAt).getTime();
      }).length;
    },
    [chatReadAtByUser, chats, currentUser.id]
  );

  const sendChatMessage: DataCtx["sendChatMessage"] = useCallback(
    (recipientId, body, attachment) => {
      const text = body.trim();
      if (!text && !attachment) return;
      const recipient = auth.userList.find((user) => user.id === recipientId);
      if (!recipient) return;
      const mentionedUsers = extractMentionedUsers(text, auth.userList).filter((user) => user.id !== currentUser.id);
      const message: ChatMessage = {
        id: id("msg"),
        workspaceId: "direct-message",
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
        mentions: mentionedUsers.map((user) => user.id),
        reactions: [],
      };
      setChats((items) => [...items, message]);
      notifyUsers([recipient.id], {
        action: "sent you a message",
        target: recipient.name,
        preview: text || attachment?.name || "Attachment",
        topic: "chat",
        targetType: "chat",
        targetId: message.id,
        parentId: currentUser.id,
        entityType: "chat",
        entityId: message.id,
        workspaceLabel: "Direct message",
      });
      notifyUsers(
        mentionedUsers.filter((user) => user.id !== recipient.id).map((user) => user.id),
        {
          action: "mentioned you in chat",
          target: recipient.name,
          preview: text || attachment?.name || "Attachment",
          topic: "mention",
          targetType: "chat",
          targetId: message.id,
          parentId: currentUser.id,
          entityType: "chat",
          entityId: message.id,
          workspaceLabel: "Direct message",
        }
      );
    },
    [auth.userList, currentUser.id, currentUser.name, notifyUsers]
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

  const addTaskComment: DataCtx["addTaskComment"] = useCallback(
    (taskId, body) => {
      const text = body.trim();
      if (!text) return;
      const task = tasks.find((entry) => entry.id === taskId);
      if (!task) return;
      const mentionedUsers = extractMentionedUsers(text, auth.userList)
        .filter((user) => user.id !== currentUser.id)
        .filter((user) => userHasTeamAccess(user.id, task.team));
      const nextComment: TaskComment = {
        id: id("tc"),
        taskId,
        team: task.team,
        authorId: currentUser.id,
        authorName: currentUser.name,
        body: text,
        createdAt: new Date().toISOString(),
        mentions: mentionedUsers.map((user) => user.id),
        reactions: [],
      };
      setTaskComments((items) => [nextComment, ...items]);
      notifyUsers(
        uniqueUserIds([
          auth.userList.find((user) => user.name === task.assignee)?.id,
          ...mentionedUsers.map((user) => user.id),
        ]),
        {
          action: mentionedUsers.length > 0 ? "mentioned you in a comment on" : "commented on",
          target: task.title,
          preview: text,
          team: task.team,
          targetType: "comment",
          targetId: nextComment.id,
          parentId: task.id,
          topic: mentionedUsers.length > 0 ? "mention" : "comment",
          entityType: "comment",
          entityId: nextComment.id,
        }
      );
    },
    [auth.userList, currentUser.id, currentUser.name, notifyUsers, tasks, userHasTeamAccess]
  );

  const toggleChatReaction: DataCtx["toggleChatReaction"] = useCallback(
    (messageId, emoji) => {
      setChats((items) =>
        items.map((entry) =>
          entry.id === messageId ? { ...entry, reactions: toggleReactionEntries(entry.reactions, currentUser.id, emoji) } : entry
        )
      );
    },
    [currentUser.id]
  );

  const toggleTaskCommentReaction: DataCtx["toggleTaskCommentReaction"] = useCallback(
    (commentId, emoji) => {
      setTaskComments((items) =>
        items.map((entry) =>
          entry.id === commentId ? { ...entry, reactions: toggleReactionEntries(entry.reactions, currentUser.id, emoji) } : entry
        )
      );
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

  const displayTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        assignedBy: replaceDeletedNamesInText(task.assignedBy, deletedUserNames),
        assignee: sanitizeDisplayName(task.assignee, deletedUserNameSet, deletedUserIdSet),
        approver: replaceDeletedNamesInText(task.approver, deletedUserNames),
        approvalHistory: task.approvalHistory?.map((entry) => ({
          ...entry,
          actor: sanitizeDisplayName(entry.actor, deletedUserNameSet, deletedUserIdSet),
          comment: replaceDeletedNamesInText(entry.comment, deletedUserNames),
        })),
      })),
    [deletedUserIdSet, deletedUserNameSet, deletedUserNames, tasks]
  );
  const displayProjects = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        owner: sanitizeDisplayName(project.owner, deletedUserNameSet, deletedUserIdSet),
        coOwners: project.coOwners?.map((name) => sanitizeDisplayName(name, deletedUserNameSet, deletedUserIdSet)),
        approver: replaceDeletedNamesInText(project.approver, deletedUserNames),
        approvalHistory: project.approvalHistory?.map((entry) => ({
          ...entry,
          actor: sanitizeDisplayName(entry.actor, deletedUserNameSet, deletedUserIdSet),
          comment: replaceDeletedNamesInText(entry.comment, deletedUserNames),
        })),
      })),
    [deletedUserIdSet, deletedUserNameSet, deletedUserNames, projects]
  );
  const displayNotifications = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        user: sanitizeDisplayName(notification.user, deletedUserNameSet, deletedUserIdSet, notification.recipientUserId),
        target: replaceDeletedNamesInText(notification.target, deletedUserNames) ?? notification.target,
        title: replaceDeletedNamesInText(notification.title, deletedUserNames),
        preview: replaceDeletedNamesInText(notification.preview, deletedUserNames),
      })),
    [deletedUserIdSet, deletedUserNameSet, deletedUserNames, notifications]
  );
  const displayApprovals = useMemo(
    () =>
      approvals.map((approval) => ({
        ...approval,
        title: replaceDeletedNamesInText(approval.title, deletedUserNames) ?? approval.title,
        requester: sanitizeDisplayName(approval.requester, deletedUserNameSet, deletedUserIdSet, approval.requestedById),
        notes: replaceDeletedNamesInText(approval.notes, deletedUserNames),
        taskDraft: approval.taskDraft
          ? {
              ...approval.taskDraft,
              assignedBy: replaceDeletedNamesInText(approval.taskDraft.assignedBy, deletedUserNames),
              assignee: sanitizeDisplayName(approval.taskDraft.assignee, deletedUserNameSet, deletedUserIdSet),
              approver: replaceDeletedNamesInText(approval.taskDraft.approver, deletedUserNames),
            }
          : undefined,
        projectDraft: approval.projectDraft
          ? {
              ...approval.projectDraft,
              owner: sanitizeDisplayName(approval.projectDraft.owner, deletedUserNameSet, deletedUserIdSet),
              coOwners: approval.projectDraft.coOwners?.map((name) => sanitizeDisplayName(name, deletedUserNameSet, deletedUserIdSet)),
              approver: replaceDeletedNamesInText(approval.projectDraft.approver, deletedUserNames),
            }
          : undefined,
        calendarEventDraft: approval.calendarEventDraft
          ? {
              ...approval.calendarEventDraft,
              title: replaceDeletedNamesInText(approval.calendarEventDraft.title, deletedUserNames) ?? approval.calendarEventDraft.title,
              attendees: approval.calendarEventDraft.attendees?.map((name) => sanitizeDisplayName(name, deletedUserNameSet, deletedUserIdSet)),
              createdByName: sanitizeDisplayName(
                approval.calendarEventDraft.createdByName,
                deletedUserNameSet,
                deletedUserIdSet,
                approval.calendarEventDraft.createdById
              ),
            }
          : undefined,
      })),
    [approvals, deletedUserIdSet, deletedUserNameSet, deletedUserNames]
  );
  const displayDocuments = useMemo(
    () =>
      documents.map((document) => ({
        ...document,
        name: replaceDeletedNamesInText(document.name, deletedUserNames) ?? document.name,
        owner: sanitizeDisplayName(document.owner, deletedUserNameSet, deletedUserIdSet),
      })),
    [deletedUserIdSet, deletedUserNameSet, deletedUserNames, documents]
  );
  const displayAuditLog = useMemo(
    () =>
      auditLog.map((entry) => ({
        ...entry,
        user: sanitizeDisplayName(entry.user, deletedUserNameSet, deletedUserIdSet),
        target: replaceDeletedNamesInText(entry.target, deletedUserNames) ?? entry.target,
      })),
    [auditLog, deletedUserIdSet, deletedUserNameSet, deletedUserNames]
  );
  const displayCalendarEvents = useMemo(
    () =>
      calendarEvents.map((event) => ({
        ...event,
        title: replaceDeletedNamesInText(event.title, deletedUserNames) ?? event.title,
        attendees: event.attendees?.map((name) => sanitizeDisplayName(name, deletedUserNameSet, deletedUserIdSet)),
        createdByName: sanitizeDisplayName(event.createdByName, deletedUserNameSet, deletedUserIdSet, event.createdById),
      })),
    [calendarEvents, deletedUserIdSet, deletedUserNameSet, deletedUserNames]
  );
  const displayChats = useMemo(
    () =>
      chats.map((chat) => ({
        ...chat,
        senderName: sanitizeDisplayName(chat.senderName, deletedUserNameSet, deletedUserIdSet, chat.senderId),
        recipientName: sanitizeDisplayName(chat.recipientName, deletedUserNameSet, deletedUserIdSet, chat.recipientId),
        body: replaceDeletedNamesInText(chat.body, deletedUserNames) ?? chat.body,
      })),
    [chats, deletedUserIdSet, deletedUserNameSet, deletedUserNames]
  );
  const displayTaskComments = useMemo(
    () =>
      taskComments.map((comment) => ({
        ...comment,
        authorName: sanitizeDisplayName(comment.authorName, deletedUserNameSet, deletedUserIdSet, comment.authorId),
        body: replaceDeletedNamesInText(comment.body, deletedUserNames) ?? comment.body,
      })),
    [deletedUserIdSet, deletedUserNameSet, deletedUserNames, taskComments]
  );

  const isTeamVisible = (team?: TeamId) => {
    if (!team) return Boolean(activeWorkspace?.isCompanyWide);
    return visibleTeams.includes(team);
  };

  const notificationsForUser =
    currentUser.notificationSettings?.enabled === false
      ? []
      : [...displayNotifications]
          .filter((notification) => {
            if (notification.recipientUserId) return notification.recipientUserId === currentUser.id;
            if (notification.kind !== "deadline") return false;
            if (isCompanyLevelUser) return true;
            if (!notification.team) return (currentUser.workspaceIds ?? []).includes(COMPANY_WORKSPACE_ID);
            return (currentUser.teams ?? [currentUser.team]).includes(notification.team);
          })
          .sort((left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime());

  const filteredTasks = useMemo(() => displayTasks.filter((task) => isTeamVisible(task.team)), [displayTasks, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredProjects = useMemo(() => displayProjects.filter((project) => isTeamVisible(project.team)), [displayProjects, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredApprovals = useMemo(
    () =>
      displayApprovals.filter((approval) => {
        if (approval.requestedById === currentUser.id) return true;
        if (isCompanyLevelUser) return true;
        if (approval.approverIds?.includes(currentUser.id)) return true;
        return isTeamVisible(approval.team);
      }),
    [currentUser.id, displayApprovals, isCompanyLevelUser, visibleTeams, activeWorkspace?.isCompanyWide]
  );
  const filteredDocuments = useMemo(() => displayDocuments.filter((document) => isTeamVisible(document.team)), [displayDocuments, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredAuditLog = useMemo(() => displayAuditLog.filter((entry) => isTeamVisible(entry.team)), [displayAuditLog, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredCalendarEvents = useMemo(() => displayCalendarEvents.filter((event) => isTeamVisible(event.team)), [displayCalendarEvents, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredRecycleBin = useMemo(() => recycleBin.filter((item) => isTeamVisible(item.team)), [recycleBin, visibleTeams, activeWorkspace?.isCompanyWide]);
  const filteredChats = displayChats;
  const filteredTaskComments = useMemo(() => displayTaskComments.filter((entry) => isTeamVisible(entry.team)), [activeWorkspace?.isCompanyWide, displayTaskComments, visibleTeams]);

  const unreadChatCount = useMemo(
    () =>
      filteredChats.filter((entry) => {
        if (entry.recipientId !== currentUser.id || entry.senderId === currentUser.id) return false;
        const partnerId = getChatPartnerId(entry, currentUser.id);
        if (!partnerId) return false;
        const lastReadAt = chatReadAtByUser[currentUser.id]?.[partnerId];
        if (!lastReadAt) return true;
        return new Date(entry.createdAt).getTime() > new Date(lastReadAt).getTime();
      }).length,
    [chatReadAtByUser, currentUser.id, filteredChats]
  );

  const value = useMemo<DataCtx>(
    () => ({
      tasks: filteredTasks,
      allTasks: displayTasks,
      projects: filteredProjects,
      allProjects: displayProjects,
      notifications: notificationsForUser,
      unreadCount: notificationsForUser.filter((notification) => !notification.read).length,
      unreadChatCount,
      approvals: filteredApprovals,
      documents: filteredDocuments,
      automations,
      auditLog: filteredAuditLog,
      calendarEvents: filteredCalendarEvents,
      allCalendarEvents: displayCalendarEvents,
      recycleBin: filteredRecycleBin,
      chats: filteredChats,
      taskComments: filteredTaskComments,
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
      markNotificationRead,
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
      markChatsRead,
      getUnreadChatCountForContact,
      sendChatMessage,
      updateChatMessage,
      removeChatMessage,
      addTaskComment,
      toggleChatReaction,
      toggleTaskCommentReaction,
      addPersonalNote,
      updatePersonalNote,
      removePersonalNote,
    }),
    [
      filteredTasks,
      displayTasks,
      filteredProjects,
      displayProjects,
      notificationsForUser,
      unreadChatCount,
      filteredApprovals,
      filteredDocuments,
      automations,
      filteredAuditLog,
      filteredCalendarEvents,
      displayCalendarEvents,
      filteredRecycleBin,
      filteredChats,
      filteredTaskComments,
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
      markNotificationRead,
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
      markChatsRead,
      getUnreadChatCountForContact,
      sendChatMessage,
      updateChatMessage,
      removeChatMessage,
      addTaskComment,
      toggleChatReaction,
      toggleTaskCommentReaction,
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
