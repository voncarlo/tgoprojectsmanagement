import type { ModuleKey, Role } from "@/data/mock";

/**
 * Capability-based RBAC.
 * Each capability is a fine-grained action that components/pages can guard.
 * Roles map to a set of capabilities. Users inherit role capabilities.
 */
export type Capability =
  // global
  | "system.configure"           // Super Admin only
  | "admin.access"               // Admin Panel
  | "users.manage"               // create/edit/delete users
  | "users.view"
  | "permissions.manage"         // edit permission matrix
  | "automations.manage"
  | "audit.view"
  // tasks
  | "task.create"
  | "task.edit.any"
  | "task.edit.assigned"
  | "task.delete"
  | "task.assign"
  // projects
  | "project.create"
  | "project.edit.any"
  | "project.edit.team"
  | "project.delete"
  // approvals
  | "approval.view"
  | "approval.decide"
  // reports
  | "report.view"
  | "report.export"
  // documents
  | "document.upload"
  | "document.delete"
  // generic
  | "data.export";

/** Default capability set per role. Customizable later via permission matrix. */
export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  "Super Admin": [
    "system.configure", "admin.access", "users.manage", "users.view",
    "permissions.manage", "automations.manage", "audit.view",
    "task.create", "task.edit.any", "task.edit.assigned", "task.delete", "task.assign",
    "project.create", "project.edit.any", "project.edit.team", "project.delete",
    "approval.view", "approval.decide",
    "report.view", "report.export",
    "document.upload", "document.delete",
    "data.export",
  ],
  Admin: [
    "admin.access", "users.manage", "users.view",
    "permissions.manage", "automations.manage", "audit.view",
    "task.create", "task.edit.any", "task.edit.assigned", "task.delete", "task.assign",
    "project.create", "project.edit.any", "project.edit.team", "project.delete",
    "approval.view", "approval.decide",
    "report.view", "report.export",
    "document.upload", "document.delete",
    "data.export",
  ],
  Manager: [
    "users.view", "audit.view",
    "task.create", "task.edit.assigned", "task.assign",
    "project.create", "project.edit.team",
    "approval.view", "approval.decide",
    "report.view", "report.export",
    "document.upload",
    "data.export",
  ],
  "Team Lead": [
    "task.create", "task.edit.assigned", "task.assign",
    "project.edit.team",
    "approval.view",
    "report.view",
    "document.upload",
  ],
  Staff: [
    "task.edit.assigned",
    "document.upload",
    "report.view",
  ],
  Viewer: [
    "report.view",
  ],
};

/** Default modules visible per role (when a user has no custom override). */
export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  "Super Admin": [
    "dashboard","tasks","projects","calendar","workload","reports",
    "documents","notifications","activity","approvals","automations",
    "dispatch","recruitment","sales","payroll","bookkeeping","clients",
    "teams","users","admin","settings",
  ],
  Admin: [
    "dashboard","tasks","projects","calendar","workload","reports",
    "documents","notifications","activity","approvals","automations",
    "dispatch","recruitment","sales","payroll","bookkeeping","clients",
    "teams","users","admin","settings",
  ],
  Manager: [
    "dashboard","tasks","projects","calendar","workload","reports",
    "documents","notifications","activity","approvals",
    "teams","settings",
  ],
  "Team Lead": [
    "dashboard","tasks","projects","calendar","workload",
    "documents","notifications","approvals",
    "teams","settings",
  ],
  Staff: [
    "dashboard","tasks","projects","calendar",
    "documents","notifications",
    "settings",
  ],
  Viewer: [
    "dashboard","projects","reports","notifications","settings",
  ],
};

/** Modules that should ONLY ever be reachable by Admin-level roles. */
export const ADMIN_ONLY_MODULES: ModuleKey[] = ["users", "admin", "automations"];

/** Friendly labels for the matrix table. */
export const CAPABILITY_GROUPS: { group: string; caps: { id: Capability; label: string }[] }[] = [
  {
    group: "System",
    caps: [
      { id: "system.configure", label: "Configure system" },
      { id: "admin.access",     label: "Access admin panel" },
      { id: "permissions.manage", label: "Manage permissions" },
      { id: "automations.manage", label: "Manage automations" },
      { id: "audit.view",       label: "View audit logs" },
    ],
  },
  {
    group: "Users",
    caps: [
      { id: "users.view",   label: "View users" },
      { id: "users.manage", label: "Manage users" },
    ],
  },
  {
    group: "Tasks",
    caps: [
      { id: "task.create",         label: "Create tasks" },
      { id: "task.assign",         label: "Assign tasks" },
      { id: "task.edit.assigned",  label: "Edit assigned tasks" },
      { id: "task.edit.any",       label: "Edit any task" },
      { id: "task.delete",         label: "Delete tasks" },
    ],
  },
  {
    group: "Projects",
    caps: [
      { id: "project.create",     label: "Create projects" },
      { id: "project.edit.team",  label: "Edit team projects" },
      { id: "project.edit.any",   label: "Edit any project" },
      { id: "project.delete",     label: "Delete projects" },
    ],
  },
  {
    group: "Approvals",
    caps: [
      { id: "approval.view",   label: "View approvals" },
      { id: "approval.decide", label: "Approve / reject" },
    ],
  },
  {
    group: "Reports & Data",
    caps: [
      { id: "report.view",     label: "View reports" },
      { id: "report.export",   label: "Export reports" },
      { id: "data.export",     label: "Export data" },
    ],
  },
  {
    group: "Documents",
    caps: [
      { id: "document.upload", label: "Upload documents" },
      { id: "document.delete", label: "Delete documents" },
    ],
  },
];

export const ALL_ROLES: Role[] = ["Super Admin", "Admin", "Manager", "Team Lead", "Staff", "Viewer"];

export const roleBadgeClass = (role: Role) => {
  switch (role) {
    case "Super Admin":
      return "bg-primary/15 text-primary border border-primary/30";
    case "Admin":
      return "bg-info/10 text-info border border-info/20";
    case "Manager":
      return "bg-accent/15 text-accent-foreground border border-accent/30";
    case "Team Lead":
      return "bg-warning/10 text-warning border border-warning/30";
    case "Staff":
      return "bg-muted text-muted-foreground border border-border";
    case "Viewer":
    default:
      return "bg-muted/60 text-muted-foreground border border-border";
  }
};