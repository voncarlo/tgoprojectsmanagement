import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { users as seedUsers, type User, type ModuleKey, type TeamId, type NotificationSettings } from "@/data/mock";
import { ROLE_CAPABILITIES, ROLE_MODULES, ADMIN_ONLY_MODULES, DEPARTMENT_MODULE_TO_TEAM, type Capability } from "./permissions";
import {
  COMPANY_WORKSPACE_ID,
  DEFAULT_WORKSPACES,
  type Workspace,
  getDefaultWorkspaceIdsForUser,
  normalizeWorkspaceList,
  resolveWorkspaceTeams,
} from "@/lib/workspaces";

interface AuthCtx {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  updateCurrentUser: (patch: Partial<User>) => void;
  userList: User[];
  setUserList: (u: User[]) => void;
  sessionLogs: SessionLogEntry[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canAccess: (m: ModuleKey) => boolean;
  can: (cap: Capability) => boolean;
  canSeeTeam: (t: TeamId) => boolean;
  visibleTeams: TeamId[];
  capabilities: Capability[];
  signIn: (email: string, password: string, options?: { remember?: boolean }) => { ok: boolean; message?: string };
  signOut: () => void;
  updatePassword: (currentPassword: string, nextPassword: string, userId?: string) => { ok: boolean; message?: string };
  setPasswordForUser: (userId: string, nextPassword: string) => void;
  resetPasswordForEmail: (email: string) => Promise<{ ok: boolean; message?: string }>;
  rememberedEmail: string;
  deleteUser: (userId: string) => void;
  workspaces: Workspace[];
  accessibleWorkspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (workspaceId: string) => void;
  canAccessWorkspace: (workspaceId: string) => boolean;
  upsertWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (workspaceId: string) => void;
}

interface PersistedAuthState {
  version?: number;
  passwords: Record<string, string>;
  userList: User[];
  sessionLogs: SessionLogEntry[];
  workspaces: Workspace[];
}

export interface SessionLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: User["role"];
  action: "Signed in" | "Signed out";
  at: string;
}

const fetchServerState = async (): Promise<PersistedAuthState | null> => {
  const response = await fetch("/api/state/auth");
  if (!response.ok) return null;
  const payload = (await response.json()) as { ok: boolean; data?: PersistedAuthState | null };
  return payload.data ?? null;
};

const saveServerState = async (state: PersistedAuthState) => {
  await fetch("/api/state/auth", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
};

const STORAGE_KEY = "tgo.auth";
const CURRENT_USER_STORAGE_KEY = "tgo.auth.currentUserId";
const REMEMBER_EMAIL_KEY = "tgo.auth.rememberedEmail";
const ACTIVE_WORKSPACE_STORAGE_KEY = "tgo.auth.activeWorkspaceByUser";
const STORAGE_VERSION = 8;
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  digest: true,
  mentions: true,
  projects: true,
  deadlines: true,
};

const ALL_TEAMS: TeamId[] = ["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping", "businessAdmin"];
const VALID_ROLES = new Set(Object.keys(ROLE_MODULES) as User["role"][]);
const FALLBACK_ROLE: User["role"] = "Staff";
const unique = <T,>(items: T[]) => [...new Set(items)];

const defaultPasswords = seedUsers.reduce<Record<string, string>>((acc, user) => {
  acc[user.id] = user.email.toLowerCase() === "von.asinas@tgocorp.com" ? "Von@4213" : "";
  return acc;
}, {});

const resolveWorkspaceIds = (user: User, workspaces: Workspace[]) =>
  unique(getDefaultWorkspaceIdsForUser(user, workspaces));

const normalizeUser = (user: User, workspaces: Workspace[]): User => {
  const role = VALID_ROLES.has(user.role) ? user.role : FALLBACK_ROLE;
  const seedMatch = seedUsers.find((item) => item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase());
  const primaryTeam = ALL_TEAMS.includes(user.team) ? user.team : (seedMatch?.team ?? "projects");
  const teamList = unique(
    (user.teams?.filter((team): team is TeamId => ALL_TEAMS.includes(team)) ?? []).concat(primaryTeam)
  );
  const modulesSource = user.modules?.length ? user.modules : (seedMatch?.modules ?? ROLE_MODULES[role]);
  const baseUser: User = {
    ...seedMatch,
    ...user,
    role,
    team: primaryTeam,
    teams: teamList,
    modules: unique([...modulesSource, ...ROLE_MODULES[role]]),
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...(seedMatch?.notificationSettings ?? {}),
      ...(user.notificationSettings ?? {}),
    },
    initials:
      user.initials?.trim() ||
      user.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
  };

  return {
    ...baseUser,
    workspaceIds: resolveWorkspaceIds(baseUser, workspaces),
  };
};

const mergeUsers = (savedUsers: User[] | undefined, workspaces: Workspace[]): User[] => {
  const normalizedSaved = (savedUsers ?? []).map((user) => normalizeUser(user, workspaces));
  return normalizedSaved.length > 0 ? normalizedSaved : seedUsers.map((user) => normalizeUser(user, workspaces));
};

const getDefaultCurrentUserId = (users: User[]) => users[0]?.id ?? seedUsers[0].id;

const chooseDefaultWorkspaceId = (user: User | undefined, accessibleWorkspaces: Workspace[]) => {
  if (!user || accessibleWorkspaces.length === 0) return "";
  const matchingDepartmentWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.kind === "department" && workspace.teamIds.includes(user.team)
  );
  if (matchingDepartmentWorkspace) return matchingDepartmentWorkspace.id;
  if (accessibleWorkspaces.some((workspace) => workspace.id === COMPANY_WORKSPACE_ID)) return COMPANY_WORKSPACE_ID;
  return accessibleWorkspaces[0]?.id ?? "";
};

const loadLocalCurrentUserId = (users: User[]) => {
  if (typeof window === "undefined") return getDefaultCurrentUserId(users);
  const savedUserId = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  return users.some((user) => user.id === savedUserId) ? (savedUserId as string) : getDefaultCurrentUserId(users);
};

const loadLocalActiveWorkspaceMap = () => {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

const defaultAuthState: PersistedAuthState = {
  version: STORAGE_VERSION,
  passwords: defaultPasswords,
  userList: seedUsers.map((user) => normalizeUser(user, DEFAULT_WORKSPACES)),
  sessionLogs: [],
  workspaces: DEFAULT_WORKSPACES,
};

const loadAuthState = (): PersistedAuthState => {
  if (typeof window === "undefined") return defaultAuthState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAuthState;
    const parsed = JSON.parse(raw) as Partial<PersistedAuthState>;
    const workspaces = normalizeWorkspaceList(parsed.workspaces);
    return {
      version: STORAGE_VERSION,
      passwords: { ...defaultPasswords, ...(parsed.passwords ?? {}) },
      userList: mergeUsers(parsed.userList, workspaces),
      sessionLogs: parsed.sessionLogs ?? defaultAuthState.sessionLogs,
      workspaces,
    };
  } catch {
    return defaultAuthState;
  }
};

const requestPasswordReset = async (email: string): Promise<{ ok: boolean; message?: string }> => {
  const response = await fetch("/api/auth/password-reset-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
  if (!response.ok || !payload.ok) {
    return { ok: false, message: payload.error ?? payload.message ?? "Unable to reset password." };
  }
  return { ok: true, message: payload.message ?? "Temporary password sent to your email." };
};

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialState = loadAuthState();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(initialState.workspaces);
  const [userList, setUserListState] = useState<User[]>(initialState.userList);
  const [currentUserId, setCurrentUserId] = useState<string>(() => loadLocalCurrentUserId(initialState.userList));
  const [passwords, setPasswords] = useState<Record<string, string>>(initialState.passwords);
  const [sessionLogs, setSessionLogs] = useState<SessionLogEntry[]>(initialState.sessionLogs);
  const [serverHydrated, setServerHydrated] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
  });
  const [activeWorkspaceByUser, setActiveWorkspaceByUser] = useState<Record<string, string>>(() => loadLocalActiveWorkspaceMap());

  useEffect(() => {
    setPasswords((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const user of userList) {
        if (!Object.prototype.hasOwnProperty.call(next, user.id)) {
          next[user.id] = "";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [userList]);

  useEffect(() => {
    setUserListState((prev) => prev.map((user) => normalizeUser(user, workspaces)));
  }, [workspaces]);

  useEffect(() => {
    const hasCurrentUser = userList.some((user) => user.id === currentUserId);
    if (!hasCurrentUser) setCurrentUserId(getDefaultCurrentUserId(userList));
  }, [currentUserId, userList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        passwords,
        userList,
        sessionLogs,
        workspaces,
      } satisfies PersistedAuthState)
    );
  }, [passwords, sessionLogs, userList, workspaces]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, JSON.stringify(activeWorkspaceByUser));
  }, [activeWorkspaceByUser]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const remoteState = await fetchServerState();
        if (!remoteState || cancelled) return;
        const nextWorkspaces = normalizeWorkspaceList(remoteState.workspaces);
        setWorkspaces(nextWorkspaces);
        setUserListState(mergeUsers(remoteState.userList, nextWorkspaces));
        setPasswords({ ...defaultPasswords, ...(remoteState.passwords ?? {}) });
        setSessionLogs(remoteState.sessionLogs ?? defaultAuthState.sessionLogs);
      } catch {
        // Fallback to local storage state when the API is unavailable.
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
      version: STORAGE_VERSION,
      passwords,
      userList,
      sessionLogs,
      workspaces,
    });
  }, [passwords, serverHydrated, sessionLogs, userList, workspaces]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rememberedEmail.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, rememberedEmail);
      return;
    }
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }, [rememberedEmail]);

  const currentUser = userList.find((user) => user.id === currentUserId) ?? userList[0] ?? defaultAuthState.userList[0];
  const isSuperAdmin = currentUser.role === "Super Admin";
  const accessibleWorkspaces = isSuperAdmin
    ? workspaces
    : workspaces.filter((workspace) => (currentUser.workspaceIds ?? []).includes(workspace.id));
  const activeWorkspaceId = activeWorkspaceByUser[currentUser.id] ?? chooseDefaultWorkspaceId(currentUser, accessibleWorkspaces);
  const activeWorkspace =
    accessibleWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    accessibleWorkspaces[0] ??
    null;
  const capabilities = ROLE_CAPABILITIES[currentUser.role] ?? [];
  const userModules = currentUser.modules?.length ? currentUser.modules : ROLE_MODULES[currentUser.role];
  const visibleTeams = resolveWorkspaceTeams(activeWorkspace, ALL_TEAMS);

  useEffect(() => {
    if (!currentUser?.id || accessibleWorkspaces.length === 0) return;
    const nextWorkspaceId =
      accessibleWorkspaces.some((workspace) => workspace.id === activeWorkspaceId)
        ? activeWorkspaceId
        : chooseDefaultWorkspaceId(currentUser, accessibleWorkspaces);
    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceByUser[currentUser.id]) return;
    setActiveWorkspaceByUser((prev) => ({ ...prev, [currentUser.id]: nextWorkspaceId }));
  }, [accessibleWorkspaces, activeWorkspaceByUser, activeWorkspaceId, currentUser]);

  const appendSessionLog = (user: User, action: SessionLogEntry["action"]) => {
    setSessionLogs((prev) => [
      {
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action,
        at: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const setUserList = (nextUsers: User[]) => {
    setUserListState(nextUsers.map((user) => normalizeUser(user, workspaces)));
  };

  const upsertWorkspace = (workspace: Workspace) => {
    const normalized = normalizeWorkspaceList([workspace]).find((item) => item.id === workspace.id);
    if (!normalized) return;
    setWorkspaces((prev) => normalizeWorkspaceList([...prev.filter((item) => item.id !== normalized.id), normalized]));
  };

  const deleteWorkspace = (workspaceId: string) => {
    if (DEFAULT_WORKSPACES.some((workspace) => workspace.id === workspaceId)) return;
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspaceId));
    setUserListState((prev) =>
      prev.map((user) => ({
        ...user,
        workspaceIds: (user.workspaceIds ?? []).filter((id) => id !== workspaceId),
      }))
    );
    setActiveWorkspaceByUser((prev) => {
      const next = { ...prev };
      for (const [userId, value] of Object.entries(next)) {
        if (value === workspaceId) delete next[userId];
      }
      return next;
    });
  };

  const value = useMemo<AuthCtx>(() => ({
    currentUser,
    setCurrentUser: (user) => {
      const normalized = normalizeUser(user, workspaces);
      const exists = userList.some((item) => item.id === user.id);
      setUserListState((prev) =>
        exists ? prev.map((item) => (item.id === normalized.id ? normalized : item)) : [...prev, normalized]
      );
      setCurrentUserId(user.id);
    },
    updateCurrentUser: (patch) => {
      const next = normalizeUser({ ...currentUser, ...patch }, workspaces);
      setUserListState((prev) => prev.map((item) => (item.id === currentUser.id ? next : item)));
    },
    userList,
    setUserList,
    sessionLogs,
    isSuperAdmin,
    isAdmin: currentUser.role === "Super Admin" || currentUser.role === "Admin",
    isManager: currentUser.role === "Super Admin" || currentUser.role === "Admin" || currentUser.role === "Manager",
    capabilities,
    can: (cap) => capabilities.includes(cap),
    canAccess: (module) => {
      if (isSuperAdmin) return true;
      if (ADMIN_ONLY_MODULES.includes(module) && !(currentUser.role === "Super Admin" || currentUser.role === "Admin")) return false;
      const requiredTeam = DEPARTMENT_MODULE_TO_TEAM[module];
      if (requiredTeam && !visibleTeams.includes(requiredTeam)) return false;
      return userModules.includes(module);
    },
    canSeeTeam: (team) => visibleTeams.includes(team),
    visibleTeams,
    signIn: (email, password, options) => {
      const normalizedEmail = email.trim().toLowerCase();
      const account = userList.find((user) => user.email.toLowerCase() === normalizedEmail);
      if (!account) return { ok: false, message: "No account found for that email." };
      if (account.status !== "Active") return { ok: false, message: "This account is inactive." };
      if ((passwords[account.id] ?? "") !== password) {
        return { ok: false, message: "Incorrect password." };
      }
      setRememberedEmail(options?.remember ? account.email : "");
      appendSessionLog(account, "Signed in");
      setCurrentUserId(account.id);
      return { ok: true };
    },
    signOut: () => {
      appendSessionLog(currentUser, "Signed out");
      setCurrentUserId(getDefaultCurrentUserId(userList));
    },
    updatePassword: (currentPassword, nextPassword, userId = currentUser.id) => {
      if ((passwords[userId] ?? "") !== currentPassword) {
        return { ok: false, message: "Current password is incorrect." };
      }
      setPasswords((prev) => ({ ...prev, [userId]: nextPassword }));
      return { ok: true };
    },
    setPasswordForUser: (userId, nextPassword) => {
      setPasswords((prev) => ({ ...prev, [userId]: nextPassword }));
    },
    resetPasswordForEmail: async (email) => requestPasswordReset(email),
    rememberedEmail,
    deleteUser: (userId) => {
      setUserListState((prev) => prev.filter((user) => user.id !== userId));
      setPasswords((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setActiveWorkspaceByUser((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      if (currentUserId === userId) {
        setCurrentUserId(getDefaultCurrentUserId(userList.filter((user) => user.id !== userId)));
      }
    },
    workspaces,
    accessibleWorkspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id ?? "",
    setActiveWorkspaceId: (workspaceId) => {
      if (!isSuperAdmin && !(currentUser.workspaceIds ?? []).includes(workspaceId)) return;
      if (!workspaces.some((workspace) => workspace.id === workspaceId)) return;
      setActiveWorkspaceByUser((prev) => ({ ...prev, [currentUser.id]: workspaceId }));
    },
    canAccessWorkspace: (workspaceId) => isSuperAdmin || (currentUser.workspaceIds ?? []).includes(workspaceId),
    upsertWorkspace,
    deleteWorkspace,
  }), [
    accessibleWorkspaces,
    activeWorkspace,
    capabilities,
    currentUser,
    currentUserId,
    isSuperAdmin,
    passwords,
    rememberedEmail,
    sessionLogs,
    userList,
    userModules,
    visibleTeams,
    workspaces,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthCtx => {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;

  const anon: User = {
    id: "anon",
    name: "Guest",
    email: "",
    role: "Staff",
    team: "projects",
    teams: [],
    modules: [],
    status: "Inactive",
    initials: "G",
    workspaceIds: [],
  };

  return {
    currentUser: anon,
    setCurrentUser: () => {},
    updateCurrentUser: () => {},
    userList: [],
    setUserList: () => {},
    sessionLogs: [],
    isSuperAdmin: false,
    isAdmin: false,
    isManager: false,
    capabilities: [],
    can: () => false,
    canAccess: () => false,
    canSeeTeam: () => false,
    visibleTeams: [],
    signIn: () => ({ ok: false, message: "Authentication unavailable." }),
    signOut: () => {},
    updatePassword: () => ({ ok: false, message: "Authentication unavailable." }),
    setPasswordForUser: () => {},
    resetPasswordForEmail: async () => ({ ok: false, message: "Authentication unavailable." }),
    rememberedEmail: "",
    deleteUser: () => {},
    workspaces: DEFAULT_WORKSPACES,
    accessibleWorkspaces: [],
    activeWorkspace: null,
    activeWorkspaceId: "",
    setActiveWorkspaceId: () => {},
    canAccessWorkspace: () => false,
    upsertWorkspace: () => {},
    deleteWorkspace: () => {},
  };
};
