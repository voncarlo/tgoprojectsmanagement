import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { users as seedUsers, type User, type ModuleKey, type TeamId } from "@/data/mock";
import { ROLE_CAPABILITIES, ROLE_MODULES, ADMIN_ONLY_MODULES, type Capability } from "./permissions";

interface AuthCtx {
  currentUser: User;
  setCurrentUser: (u: User) => void;
  userList: User[];
  setUserList: (u: User[]) => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;            // includes Super Admin
  isManager: boolean;          // Manager or above
  canAccess: (m: ModuleKey) => boolean;
  can: (cap: Capability) => boolean;
  canSeeTeam: (t: TeamId) => boolean;
  visibleTeams: TeamId[];      // restricted unless admin
  capabilities: Capability[];  // resolved cap list for current user
}

const AuthContext = createContext<AuthCtx | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userList, setUserList] = useState<User[]>(seedUsers);
  // Default session = James Steffan (Super Admin)
  const [currentUser, setCurrentUser] = useState<User>(seedUsers[0]);

  const value = useMemo<AuthCtx>(() => {
    const isSuperAdmin = currentUser.role === "Super Admin";
    const isAdmin = isSuperAdmin || currentUser.role === "Admin";
    const isManager = isAdmin || currentUser.role === "Manager";
    const capabilities = ROLE_CAPABILITIES[currentUser.role] ?? [];
    // Resolve module access: explicit user.modules wins, otherwise role default.
    const userModules = currentUser.modules?.length ? currentUser.modules : ROLE_MODULES[currentUser.role];
    return {
      currentUser,
      setCurrentUser,
      userList,
      setUserList,
      isSuperAdmin,
      isAdmin,
      isManager,
      capabilities,
      can: (cap) => capabilities.includes(cap),
      canAccess: (m) => {
        if (isSuperAdmin) return true;
        if (ADMIN_ONLY_MODULES.includes(m) && !isAdmin) return false;
        return userModules.includes(m);
      },
      canSeeTeam: (t) => isAdmin || currentUser.teams.includes(t),
      visibleTeams: isAdmin
        ? (["dispatch","recruitment","sales","clients","projects","payroll","bookkeeping"] as TeamId[])
        : currentUser.teams,
    };
  }, [currentUser, userList]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthCtx => {
  const ctx = useContext(AuthContext);
  if (ctx) return ctx;
  // Safe fallback — prevents HMR-induced provider mismatches from crashing
  // the whole app. Components using auth-gated features still work because
  // every capability check returns false for the anonymous fallback.
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
  };
};