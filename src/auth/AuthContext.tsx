import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { users as seedUsers, type User, type ModuleKey, type TeamId } from "@/data/mock";
import { ROLE_CAPABILITIES, ROLE_MODULES, ADMIN_ONLY_MODULES, type Capability } from "./permissions";

interface AuthCtx {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  userList: User[];
  setUserList: (u: User[]) => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canAccess: (m: ModuleKey) => boolean;
  can: (cap: Capability) => boolean;
  canSeeTeam: (t: TeamId) => boolean;
  visibleTeams: TeamId[];
  capabilities: Capability[];
  signIn: (email: string, password: string) => { ok: boolean; message?: string };
  signOut: () => void;
  updatePassword: (currentPassword: string, nextPassword: string, userId?: string) => { ok: boolean; message?: string };
}

interface PersistedAuthState {
  currentUserId: string;
  passwords: Record<string, string>;
  userList: User[];
}

const STORAGE_KEY = "tgo.auth";

const defaultPasswords = seedUsers.reduce<Record<string, string>>((acc, user) => {
  acc[user.id] = "password123";
  return acc;
}, {});

const defaultAuthState: PersistedAuthState = {
  currentUserId: seedUsers[0].id,
  passwords: defaultPasswords,
  userList: seedUsers,
};

const loadAuthState = (): PersistedAuthState => {
  if (typeof window === "undefined") return defaultAuthState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAuthState;
    const parsed = JSON.parse(raw) as Partial<PersistedAuthState>;
    return {
      currentUserId: parsed.currentUserId ?? defaultAuthState.currentUserId,
      passwords: { ...defaultPasswords, ...(parsed.passwords ?? {}) },
      userList: parsed.userList?.length ? parsed.userList : defaultAuthState.userList,
    };
  } catch {
    return defaultAuthState;
  }
};

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialState = loadAuthState();
  const [userList, setUserList] = useState<User[]>(initialState.userList);
  const [currentUserId, setCurrentUserId] = useState<string>(initialState.currentUserId);
  const [passwords, setPasswords] = useState<Record<string, string>>(initialState.passwords);

  useEffect(() => {
    setPasswords((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const user of userList) {
        if (!next[user.id]) {
          next[user.id] = "password123";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [userList]);

  useEffect(() => {
    const hasCurrentUser = userList.some((user) => user.id === currentUserId);
    if (!hasCurrentUser && userList[0]) setCurrentUserId(userList[0].id);
  }, [currentUserId, userList]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentUserId,
        passwords,
        userList,
      } satisfies PersistedAuthState)
    );
  }, [currentUserId, passwords, userList]);

  const currentUser = userList.find((user) => user.id === currentUserId) ?? userList[0] ?? seedUsers[0];

  const value = useMemo<AuthCtx>(() => {
    const isSuperAdmin = currentUser.role === "Super Admin";
    const isAdmin = isSuperAdmin || currentUser.role === "Admin";
    const isManager = isAdmin || currentUser.role === "Manager";
    const capabilities = ROLE_CAPABILITIES[currentUser.role] ?? [];
    const userModules = currentUser.modules?.length ? currentUser.modules : ROLE_MODULES[currentUser.role];

    return {
      currentUser,
      setCurrentUser: (user) => {
        const existing = userList.some((item) => item.id === user.id);
        if (!existing) setUserList((prev) => [...prev, user]);
        setCurrentUserId(user.id);
      },
      userList,
      setUserList,
      isSuperAdmin,
      isAdmin,
      isManager,
      capabilities,
      can: (cap) => capabilities.includes(cap),
      canAccess: (module) => {
        if (isSuperAdmin) return true;
        if (ADMIN_ONLY_MODULES.includes(module) && !isAdmin) return false;
        return userModules.includes(module);
      },
      canSeeTeam: (teamId) => isAdmin || currentUser.teams.includes(teamId),
      visibleTeams: isAdmin
        ? (["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping"] as TeamId[])
        : currentUser.teams,
      signIn: (email, password) => {
        const account = userList.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());
        if (!account) return { ok: false, message: "No account found for that email." };
        if (account.status !== "Active") return { ok: false, message: "This account is inactive." };
        if ((passwords[account.id] ?? "password123") !== password) {
          return { ok: false, message: "Incorrect password." };
        }
        setCurrentUserId(account.id);
        return { ok: true };
      },
      signOut: () => {
        const fallback = userList.find((user) => user.status === "Active") ?? seedUsers[0];
        setCurrentUserId(fallback.id);
      },
      updatePassword: (currentPassword, nextPassword, userId = currentUser.id) => {
        if ((passwords[userId] ?? "password123") !== currentPassword) {
          return { ok: false, message: "Current password is incorrect." };
        }
        setPasswords((prev) => ({ ...prev, [userId]: nextPassword }));
        return { ok: true };
      },
    };
  }, [currentUser, currentUserId, passwords, userList]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthCtx => {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;

  const anon: User = {
    id: "anon",
    name: "Guest",
    email: "",
    role: "Viewer",
    team: "projects",
    teams: [],
    modules: [],
    status: "Inactive",
    initials: "G",
  };

  return {
    currentUser: anon,
    setCurrentUser: () => {},
    userList: [],
    setUserList: () => {},
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
  };
};
