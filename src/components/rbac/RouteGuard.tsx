import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { AccessDenied } from "./AccessDenied";
import type { ModuleKey } from "@/data/mock";
import type { Capability } from "@/auth/permissions";

const ROUTE_TO_MODULE: Record<string, { module: ModuleKey; label: string }> = {
  "/dashboard":     { module: "dashboard",     label: "Dashboard" },
  "/tasks":         { module: "tasks",         label: "Tasks" },
  "/projects":      { module: "projects",      label: "Projects" },
  "/calendar":      { module: "calendar",      label: "Calendar" },
  "/workload":      { module: "workload",      label: "Workload" },
  "/reports":       { module: "reports",       label: "Reports" },
  "/documents":     { module: "documents",     label: "Documents" },
  "/notifications": { module: "notifications", label: "Notifications" },
  "/chat":          { module: "chat",          label: "Chat" },
  "/notes":         { module: "notes",         label: "Notes" },
  "/activity":      { module: "activity",      label: "Activity Logs" },
  "/approvals":     { module: "approvals",     label: "Approvals" },
  "/automations":   { module: "automations",   label: "Automations" },
  "/dispatch":      { module: "dispatch",      label: "Dispatch Operations" },
  "/recruitment":   { module: "recruitment",   label: "Recruitment" },
  "/sales":         { module: "sales",         label: "Sales" },
  "/payroll":       { module: "payroll",       label: "Payroll" },
  "/bookkeeping":   { module: "bookkeeping",   label: "Bookkeeping" },
  "/clients":       { module: "clients",       label: "Clients" },
  "/teams":         { module: "teams",         label: "Teams" },
  "/users":         { module: "users",         label: "User Management" },
  "/recycle-bin":   { module: "recycle",       label: "Recycle Bin" },
  "/admin":         { module: "admin",         label: "Admin Panel" },
  "/settings":      { module: "settings",      label: "Settings" },
};

const ROUTE_TO_CAPABILITY: Partial<Record<string, { cap: Capability; label: string }>> = {
  "/activity": { cap: "audit.view", label: "Activity Logs" },
};

interface Props { children: React.ReactNode }

export const RouteGuard = ({ children }: Props) => {
  const { pathname } = useLocation();
  const { canAccess, can } = useAuth();
  const capabilityMatch = ROUTE_TO_CAPABILITY[pathname];
  if (capabilityMatch && !can(capabilityMatch.cap)) {
    return <AccessDenied module={capabilityMatch.label} />;
  }
  const match = ROUTE_TO_MODULE[pathname];
  if (match && !canAccess(match.module)) {
    return <AccessDenied module={match.label} />;
  }
  return <>{children}</>;
};
