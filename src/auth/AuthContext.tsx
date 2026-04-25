import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { users as seedUsers, teams, type User, type ModuleKey, type TeamId, type NotificationSettings } from "@/data/mock";
import { ROLE_CAPABILITIES, ROLE_MODULES, ADMIN_ONLY_MODULES, DEPARTMENT_MODULE_TO_TEAM, type Capability } from "./permissions";
import {
  COMPANY_WORKSPACE_ID,
  DEFAULT_WORKSPACES,
  type Workspace,
  getDefaultWorkspaceIdsForUser,
  isCompanyLevelRole,
  normalizeWorkspaceList,
  resolveWorkspaceTeams,
} from "@/lib/workspaces";

interface AuthCtx {
  currentUser: User;
  isAuthenticated: boolean;
  teamLeadIdsByTeam: Record<TeamId, string[]>;
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
  deletedUsers: DeletedUserRecord[];
  workspaces: Workspace[];
  accessibleWorkspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string;
  setActiveWorkspaceId: (workspaceId: string) => void;
  canAccessWorkspace: (workspaceId: string) => boolean;
  upsertWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (workspaceId: string) => void;
  setTeamLeadIds: (teamId: TeamId, userIds: string[]) => { ok: boolean; message?: string };
  getTeamLeadIds: (teamId: TeamId) => string[];
  getTeamLeadUsers: (teamId: TeamId) => User[];
  getTeamLeadNames: (teamId: TeamId) => string[];
  getTeamApprovalRecipients: (teamId: TeamId) => User[];
  canDecideTeamApprovals: (teamId: TeamId) => boolean;
  hasAssignedTeamLead: (teamId: TeamId) => boolean;
}

interface PersistedAuthState {
  version?: number;
  passwords: Record<string, string>;
  userList: User[];
  sessionLogs: SessionLogEntry[];
  deletedUsers?: DeletedUserRecord[];
  workspaces: Workspace[];
  teamLeadIdsByTeam?: Record<TeamId, string[]>;
}

interface DeletedUserRecord {
  id: string;
  name: string;
  email: string;
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
const CURRENT_USER_SESSION_STORAGE_KEY = "tgo.auth.currentUserId";
const REMEMBER_EMAIL_KEY = "tgo.auth.rememberedEmail";
const ACTIVE_WORKSPACE_SESSION_STORAGE_KEY = "tgo.auth.activeWorkspaceByUser";
const STORAGE_VERSION = 9;
const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  digest: true,
  mentions: true,
  projects: true,
  deadlines: true,
  popupPreviews: true,
  notificationSound: false,
  browserPush: false,
};

const ALL_TEAMS: TeamId[] = ["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping", "businessAdmin"];
const VALID_ROLES = new Set(Object.keys(ROLE_MODULES) as User["role"][]);
const FALLBACK_ROLE: User["role"] = "Staff";
const unique = <T,>(items: T[]) => [...new Set(items)];

const defaultPasswords = seedUsers.reduce<Record<string, string>>((acc, user) => {
  acc[user.id] = user.email.toLowerCase() === "von.asinas@tgocorp.com" ? "Von@4213" : "";
  return acc;
}, {});
const DEFAULT_TEAM_LEAD_IDS_BY_TEAM = Object.fromEntries(
  teams.map((team) => [team.id, seedUsers.filter((user) => user.name === team.lead).map((user) => user.id)])
) as Record<TeamId, string[]>;
const normalizeTeamLeadIdsByTeam = (value: Partial<Record<TeamId, string[]>> | undefined, users: User[]) => {
  const validUserIds = new Set(users.map((user) => user.id));
  return Object.fromEntries(
    teams.map((team) => {
      const source = value?.[team.id] ?? DEFAULT_TEAM_LEAD_IDS_BY_TEAM[team.id] ?? [];
      const normalized = [...new Set(source.filter((userId) => validUserIds.has(userId)))];
      return [team.id, normalized];
    })
  ) as Record<TeamId, string[]>;
};

const resolveWorkspaceIds = (user: User, workspaces: Workspace[]) =>
  unique(getDefaultWorkspaceIdsForUser(user, workspaces));

const normalizeUser = (user: User, workspaces: Workspace[]): User => {
  const role = VALID_ROLES.has(user.role) ? user.role : FALLBACK_ROLE;
  const seedMatch = seedUsers.find((item) => item.id === user.id || item.email.toLowerCase() === user.email.toLowerCase());
  const primaryTeam = ALL_TEAMS.includes(user.team) ? user.team : (seedMatch?.team ?? "projects");
  const isCompanyLevelUser = isCompanyLevelRole(role);
  const teamList = isCompanyLevelUser
    ? []
    : unique((user.teams?.filter((team): team is TeamId => ALL_TEAMS.includes(team)) ?? []).concat(primaryTeam));
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

const chooseDefaultWorkspaceId = (user: User | undefined, accessibleWorkspaces: Workspace[]) => {
  if (!user || accessibleWorkspaces.length === 0) return "";
  if (isCompanyLevelRole(user.role)) return COMPANY_WORKSPACE_ID;
  const matchingDepartmentWorkspace = accessibleWorkspaces.find(
    (workspace) => workspace.kind === "department" && workspace.teamIds.includes(user.team)
  );
  if (matchingDepartmentWorkspace) return matchingDepartmentWorkspace.id;
  if (accessibleWorkspaces.some((workspace) => workspace.id === COMPANY_WORKSPACE_ID)) return COMPANY_WORKSPACE_ID;
  return accessibleWorkspaces[0]?.id ?? "";
};

const loadLocalCurrentUserId = (users: User[]) => {
  if (typeof window === "undefined") return "";
  const savedUserId = window.sessionStorage.getItem(CURRENT_USER_SESSION_STORAGE_KEY);
  return users.some((user) => user.id === savedUserId) ? (savedUserId as string) : "";
};

const loadLocalActiveWorkspaceMap = () => {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    return JSON.parse(window.sessionStorage.getItem(ACTIVE_WORKSPACE_SESSION_STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
};

const defaultAuthState: PersistedAuthState = {
  version: STORAGE_VERSION,
  passwords: defaultPasswords,
  userList: seedUsers.map((user) => normalizeUser(user, DEFAULT_WORKSPACES)),
  sessionLogs: [],
  deletedUsers: [],
  workspaces: DEFAULT_WORKSPACES,
  teamLeadIdsByTeam: DEFAULT_TEAM_LEAD_IDS_BY_TEAM,
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
      deletedUsers: parsed.deletedUsers ?? defaultAuthState.deletedUsers,
      workspaces,
      teamLeadIdsByTeam: normalizeTeamLeadIdsByTeam(parsed.teamLeadIdsByTeam, mergeUsers(parsed.userList, workspaces)),
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
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserRecord[]>(initialState.deletedUsers ?? []);
  const [teamLeadIdsByTeam, setTeamLeadIdsByTeam] = useState<Record<TeamId, string[]>>(
    normalizeTeamLeadIdsByTeam(initialState.teamLeadIdsByTeam, initialState.userList)
  );
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
    setTeamLeadIdsByTeam((prev) => normalizeTeamLeadIdsByTeam(prev, userList));
  }, [userList]);

  useEffect(() => {
    if (!currentUserId) return;
    const hasCurrentUser = userList.some((user) => user.id === currentUserId);
    if (!hasCurrentUser) setCurrentUserId("");
  }, [currentUserId, userList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentUserId) {
      window.sessionStorage.setItem(CURRENT_USER_SESSION_STORAGE_KEY, currentUserId);
      return;
    }
    window.sessionStorage.removeItem(CURRENT_USER_SESSION_STORAGE_KEY);
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
        deletedUsers,
        workspaces,
        teamLeadIdsByTeam,
      } satisfies PersistedAuthState)
    );
  }, [deletedUsers, passwords, sessionLogs, teamLeadIdsByTeam, userList, workspaces]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(ACTIVE_WORKSPACE_SESSION_STORAGE_KEY, JSON.stringify(activeWorkspaceByUser));
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
        setDeletedUsers(remoteState.deletedUsers ?? defaultAuthState.deletedUsers ?? []);
        setTeamLeadIdsByTeam(normalizeTeamLeadIdsByTeam(remoteState.teamLeadIdsByTeam, mergeUsers(remoteState.userList, nextWorkspaces)));
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
      deletedUsers,
      workspaces,
      teamLeadIdsByTeam,
    });
  }, [deletedUsers, passwords, serverHydrated, sessionLogs, teamLeadIdsByTeam, userList, workspaces]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (rememberedEmail.trim()) {
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, rememberedEmail);
      return;
    }
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }, [rememberedEmail]);

  const authenticatedUser = userList.find((user) => user.id === currentUserId) ?? null;
  const currentUser = authenticatedUser ?? {
    id: "",
    name: "Guest",
    email: "",
    role: "Staff" as const,
    team: "projects" as const,
    teams: [],
    modules: [],
    status: "Inactive" as const,
    initials: "G",
    workspaceIds: [],
  };
  const isAuthenticated = Boolean(authenticatedUser);
  const isSuperAdmin = currentUser.role === "Super Admin";
  const isAdmin = currentUser.role === "Super Admin" || currentUser.role === "Admin";
  const isManager = isAdmin || currentUser.role === "Manager";
  const accessibleWorkspaces = isAuthenticated
    ? workspaces.filter((workspace) => (currentUser.workspaceIds ?? []).includes(workspace.id))
    : [];
  const activeWorkspaceId = activeWorkspaceByUser[currentUser.id] ?? chooseDefaultWorkspaceId(currentUser, accessibleWorkspaces);
  const activeWorkspace =
    accessibleWorkspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    accessibleWorkspaces[0] ??
    null;
  const capabilities = isAuthenticated ? ROLE_CAPABILITIES[currentUser.role] ?? [] : [];
  const userModules = isAuthenticated ? (currentUser.modules?.length ? currentUser.modules : ROLE_MODULES[currentUser.role]) : [];
  const visibleTeams = isAuthenticated ? resolveWorkspaceTeams(activeWorkspace, ALL_TEAMS) : [];
  const getTeamLeadIds = useCallback(
    (teamId: TeamId) => teamLeadIdsByTeam[teamId] ?? [],
    [teamLeadIdsByTeam]
  );
  const getTeamLeadUsers = useCallback(
    (teamId: TeamId) => {
      const leadIds = getTeamLeadIds(teamId);
      return userList.filter((user) => leadIds.includes(user.id));
    },
    [getTeamLeadIds, userList]
  );
  const getTeamLeadNames = useCallback(
    (teamId: TeamId) => {
      const leadUsers = getTeamLeadUsers(teamId);
      return leadUsers.length > 0 ? leadUsers.map((user) => user.name) : [];
    },
    [getTeamLeadUsers]
  );
  const getTeamApprovalRecipients = useCallback(
    (teamId: TeamId) => {
      const recipientMap = new Map<string, User>();
      userList.forEach((user) => {
        if (user.status !== "Active") return;
        if (user.role === "Super Admin" || user.role === "Admin") {
          recipientMap.set(user.id, user);
        }
      });
      getTeamLeadUsers(teamId).forEach((user) => {
        if (user.status !== "Active") return;
        recipientMap.set(user.id, user);
      });
      return [...recipientMap.values()];
    },
    [getTeamLeadUsers, userList]
  );
  const canDecideTeamApprovals = useCallback(
    (teamId: TeamId) => {
      if (!isAuthenticated) return false;
      if (isAdmin) return true;
      return getTeamLeadIds(teamId).includes(currentUser.id);
    },
    [currentUser.id, getTeamLeadIds, isAdmin, isAuthenticated]
  );
  const hasAssignedTeamLead = useCallback(
    (teamId: TeamId) => getTeamLeadIds(teamId).length > 0,
    [getTeamLeadIds]
  );

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id || accessibleWorkspaces.length === 0) return;
    const nextWorkspaceId =
      accessibleWorkspaces.some((workspace) => workspace.id === activeWorkspaceId)
        ? activeWorkspaceId
        : chooseDefaultWorkspaceId(currentUser, accessibleWorkspaces);
    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceByUser[currentUser.id]) return;
    setActiveWorkspaceByUser((prev) => ({ ...prev, [currentUser.id]: nextWorkspaceId }));
  }, [accessibleWorkspaces, activeWorkspaceByUser, activeWorkspaceId, currentUser, isAuthenticated]);

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
    const normalizedUsers = nextUsers.map((user) => normalizeUser(user, workspaces));
    setUserListState(normalizedUsers);
    setTeamLeadIdsByTeam((prev) => normalizeTeamLeadIdsByTeam(prev, normalizedUsers));
    setDeletedUsers((prev) =>
      prev.filter(
        (deletedUser) =>
          !normalizedUsers.some(
            (user) => user.id === deletedUser.id || user.email.toLowerCase() === deletedUser.email.toLowerCase()
          )
      )
    );
  };

  const setTeamLeadIds = (teamId: TeamId, userIds: string[]) => {
    if (!isAdmin) return { ok: false, message: "Only Admins and Super Admins can assign department leads." };
    const normalizedIds = [...new Set(userIds)].filter((userId) => userList.some((user) => user.id === userId));
    setTeamLeadIdsByTeam((prev) => ({ ...prev, [teamId]: normalizedIds }));
    return { ok: true };
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
    isAuthenticated,
    teamLeadIdsByTeam,
    setCurrentUser: (user) => {
      const normalized = normalizeUser(user, workspaces);
      const exists = userList.some((item) => item.id === user.id);
      setUserListState((prev) =>
        exists ? prev.map((item) => (item.id === normalized.id ? normalized : item)) : [...prev, normalized]
      );
      setDeletedUsers((prev) =>
        prev.filter(
          (deletedUser) =>
            deletedUser.id !== normalized.id && deletedUser.email.toLowerCase() !== normalized.email.toLowerCase()
        )
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
    isAdmin,
    isManager,
    capabilities,
    can: (cap) => capabilities.includes(cap),
    canAccess: (module) => {
      if (!isAuthenticated) return false;
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
      if (isAuthenticated) appendSessionLog(currentUser, "Signed out");
      setCurrentUserId("");
      setActiveWorkspaceByUser({});
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
      const userToDelete = userList.find((user) => user.id === userId);
      setUserListState((prev) => prev.filter((user) => user.id !== userId));
      if (userToDelete) {
        setDeletedUsers((prev) => {
          if (prev.some((entry) => entry.id === userToDelete.id)) return prev;
          return [...prev, { id: userToDelete.id, name: userToDelete.name, email: userToDelete.email }];
        });
      }
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
        setCurrentUserId("");
      }
    },
    deletedUsers,
    workspaces,
    accessibleWorkspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id ?? "",
    setActiveWorkspaceId: (workspaceId) => {
      if (!(currentUser.workspaceIds ?? []).includes(workspaceId)) return;
      if (!workspaces.some((workspace) => workspace.id === workspaceId)) return;
      setActiveWorkspaceByUser((prev) => ({ ...prev, [currentUser.id]: workspaceId }));
    },
    canAccessWorkspace: (workspaceId) => (currentUser.workspaceIds ?? []).includes(workspaceId),
    upsertWorkspace,
    deleteWorkspace,
    setTeamLeadIds,
    getTeamLeadIds,
    getTeamLeadUsers,
    getTeamLeadNames,
    getTeamApprovalRecipients,
    canDecideTeamApprovals,
    hasAssignedTeamLead,
  }), [
    accessibleWorkspaces,
    activeWorkspace,
    capabilities,
    canDecideTeamApprovals,
    currentUser,
    currentUserId,
    deletedUsers,
    getTeamApprovalRecipients,
    getTeamLeadIds,
    getTeamLeadNames,
    getTeamLeadUsers,
    hasAssignedTeamLead,
    isAuthenticated,
    isAdmin,
    isManager,
    isSuperAdmin,
    passwords,
    rememberedEmail,
    sessionLogs,
    teamLeadIdsByTeam,
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
    isAuthenticated: false,
    teamLeadIdsByTeam: DEFAULT_TEAM_LEAD_IDS_BY_TEAM,
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
    deletedUsers: [],
    workspaces: DEFAULT_WORKSPACES,
    accessibleWorkspaces: [],
    activeWorkspace: null,
    activeWorkspaceId: "",
    setActiveWorkspaceId: () => {},
    canAccessWorkspace: () => false,
    upsertWorkspace: () => {},
    deleteWorkspace: () => {},
    setTeamLeadIds: () => ({ ok: false, message: "Authentication unavailable." }),
    getTeamLeadIds: () => [],
    getTeamLeadUsers: () => [],
    getTeamLeadNames: () => [],
    getTeamApprovalRecipients: () => [],
    canDecideTeamApprovals: () => false,
    hasAssignedTeamLead: () => false,
  };
};
