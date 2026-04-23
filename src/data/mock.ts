export type Role = "Super Admin" | "Admin" | "Manager" | "Staff";
export type TeamId =
  | "dispatch"
  | "recruitment"
  | "sales"
  | "clients"
  | "projects"
  | "payroll"
  | "bookkeeping";
export type AccountStatus = "Active" | "Inactive";
export type ModuleKey =
  | "dashboard"
  | "tasks"
  | "projects"
  | "calendar"
  | "workload"
  | "reports"
  | "documents"
  | "notifications"
  | "activity"
  | "approvals"
  | "automations"
  | "chat"
  | "notes"
  | "dispatch"
  | "recruitment"
  | "sales"
  | "payroll"
  | "bookkeeping"
  | "clients"
  | "teams"
  | "users"
  | "recycle"
  | "admin"
  | "settings";
export type Priority = "Low" | "Medium" | "High" | "Urgent" | "Critical";
export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "Waiting Review"
  | "Blocked"
  | "Completed"
  | "Cancelled";
export type TaskApprovalStatus =
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "Returned for Revision";
export interface ApprovalHistoryEntry {
  id: string;
  actor: string;
  action: "Submitted" | "Approved" | "Rejected" | "Returned for Revision" | "Comment";
  comment?: string;
  at: string;
}
export type ProjectStatus =
  | "Planning"
  | "Active"
  | "At Risk"
  | "Delayed"
  | "On Hold"
  | "Waiting Review"
  | "Completed"
  | "Cancelled";
export type ProjectHealth = "Healthy" | "At Risk" | "Delayed" | "Blocked";
export type ApprovalType = "Task" | "Project" | "Leave" | "Budget" | "Change" | "Report";
export type ApprovalStatus = "Pending" | "Under Review" | "Approved" | "Rejected" | "Returned";
export type CalendarEventType = "PTO" | "Call-out" | "Meeting" | "Event" | "Deadline";

export interface Team {
  id: TeamId;
  name: string;
  color: string;
  lead: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: TeamId;            // primary team
  teams: TeamId[];         // all assigned teams
  modules: ModuleKey[];    // module access
  status: AccountStatus;
  initials: string;
  lastActive?: string;
  avatarUrl?: string;
  notificationSettings?: NotificationSettings;
}

export interface NotificationSettings {
  enabled: boolean;
  digest: boolean;
  mentions: boolean;
  projects: boolean;
  deadlines: boolean;
}

export interface Task {
  id: string;
  title: string;
  assignee: string;
  team: TeamId;
  priority: Priority;
  status: TaskStatus;
  due: string;
  project?: string;
  notes?: string;
  requiresApproval?: boolean;
  approver?: string;          // user name of the assigned approver
  approvalStatus?: TaskApprovalStatus;
  approvalHistory?: ApprovalHistoryEntry[];
  subtasks?: Subtask[];
}

export interface Milestone { name: string; done: boolean; }
export interface Subtask { id: string; title: string; done: boolean; }
export interface Project {
  id: string;
  name: string;
  description: string;
  team: TeamId;
  owner: string;
  coOwners?: string[];
  status: ProjectStatus;
  progress: number;
  start: string;
  end: string;
  milestones: Milestone[];
  requiresApproval?: boolean;
  approver?: string;
  approvalStatus?: TaskApprovalStatus;
  approvalHistory?: ApprovalHistoryEntry[];
  subtasks?: Subtask[];
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
}

export const teams: Team[] = [
  { id: "dispatch",    name: "Dispatch",    color: "199 89% 48%", lead: "Ryan Lopez",       description: "Coordinates daily logistics and route planning." },
  { id: "recruitment", name: "Recruitment", color: "152 60% 38%", lead: "Alyanna Alonzo",   description: "Talent sourcing and onboarding." },
  { id: "sales",       name: "Sales",       color: "35 92% 50%",  lead: "Von Carlo Asinas", description: "Client growth and account management." },
  { id: "clients",     name: "Clients",     color: "262 75% 55%", lead: "Von Carlo Asinas", description: "Client relationships and account success." },
  { id: "projects",    name: "Projects",    color: "210 85% 55%", lead: "James Steffan",    description: "Cross-team project delivery and oversight." },
  { id: "payroll",     name: "Payroll",     color: "340 75% 52%", lead: "Alyanna Alonzo",   description: "Compensation, benefits and compliance." },
  { id: "bookkeeping", name: "Bookkeeping", color: "172 70% 38%", lead: "Ryan Lopez",       description: "Financial records, reconciliation and reporting." },
];

const ALL_MODULES: ModuleKey[] = [
  "dashboard","tasks","projects","calendar","workload","reports",
  "documents","notifications","activity","approvals","automations","chat","notes",
  "dispatch","recruitment","sales","payroll","bookkeeping","clients",
  "teams","users","recycle","admin","settings",
];
const STAFF_MODULES: ModuleKey[] = [
  "dashboard","tasks","projects","calendar","workload","reports",
  "documents","notifications","activity","approvals",
  "teams","settings",
];

export const users: User[] = [
  {
    id: "u1",
    name: "Von Carlo Asinas",
    email: "von.asinas@tgocorp.com",
    role: "Super Admin",
    team: "projects",
    teams: ["dispatch","recruitment","sales","clients","projects","payroll","bookkeeping"],
    modules: ALL_MODULES,
    status: "Active",
    initials: "VA",
    lastActive: "Just now",
    notificationSettings: {
      enabled: true,
      digest: true,
      mentions: true,
      projects: true,
      deadlines: true,
    },
  },
];

export const projects: Project[] = [
  { id: "p1", name: "Q2 Fleet Optimization",        description: "Re-route delivery network for 18% fuel savings.", team: "dispatch",    owner: "Ryan Lopez",       coOwners: ["James Steffan"], status: "Active",    progress: 67,  start: "2025-02-01", end: "2025-05-30", milestones: [], subtasks: [{ id: "p1-s1", title: "Audit current route efficiency", done: true }, { id: "p1-s2", title: "Run pilot on Route 14", done: true }, { id: "p1-s3", title: "Roll out final routing map", done: false }] },
  { id: "p2", name: "Books Cleanup Q1",             description: "Reconcile, audit and close Q1 books.",            team: "bookkeeping", owner: "Ryan Lopez",       coOwners: [], status: "At Risk",   progress: 33,  start: "2025-01-10", end: "2025-06-15", milestones: [], subtasks: [{ id: "p2-s1", title: "Finish account reconciliations", done: true }, { id: "p2-s2", title: "Review flagged entries", done: false }, { id: "p2-s3", title: "Finalize closing pack", done: false }] },
  { id: "p3", name: "Hiring Sprint — Engineering",  description: "Hire 12 engineers across backend & infra.",       team: "recruitment", owner: "Alyanna Alonzo",   coOwners: ["Von Carlo Asinas"], status: "Active",    progress: 67,  start: "2025-03-01", end: "2025-05-15", milestones: [], subtasks: [{ id: "p3-s1", title: "Source shortlisted backend candidates", done: true }, { id: "p3-s2", title: "Complete final-round interviews", done: true }, { id: "p3-s3", title: "Send approved offers", done: false }] },
  { id: "p4", name: "Enterprise Pipeline Push",     description: "Close 5 enterprise deals before EoQ.",            team: "sales",       owner: "Von Carlo Asinas", coOwners: ["James Steffan"], status: "Active",    progress: 67,  start: "2025-03-15", end: "2025-06-30", milestones: [], subtasks: [{ id: "p4-s1", title: "Finish discovery with priority accounts", done: true }, { id: "p4-s2", title: "Send final proposal set", done: true }, { id: "p4-s3", title: "Close remaining contracts", done: false }] },
  { id: "p5", name: "Payroll Compliance Audit",     description: "Annual multi-state compliance audit.",            team: "payroll",     owner: "Alyanna Alonzo",   coOwners: [], status: "Planning",  progress: 33,  start: "2025-04-10", end: "2025-07-01", milestones: [], subtasks: [{ id: "p5-s1", title: "Define audit scope", done: true }, { id: "p5-s2", title: "Review state thresholds", done: false }, { id: "p5-s3", title: "Prepare final report", done: false }] },
  { id: "p6", name: "Client Onboarding Revamp",     description: "New self-serve client onboarding flow.",          team: "clients",     owner: "Von Carlo Asinas", coOwners: ["Alyanna Alonzo"], status: "Completed", progress: 100, start: "2024-11-01", end: "2025-02-28", milestones: [], subtasks: [{ id: "p6-s1", title: "Finalize onboarding design", done: true }, { id: "p6-s2", title: "Build self-serve flow", done: true }, { id: "p6-s3", title: "Launch to clients", done: true }] },
  { id: "p7", name: "Portal Rollout",               description: "Cross-team rollout of TGO Projects Portal.",      team: "projects",    owner: "James Steffan",    coOwners: ["Von Carlo Asinas"], status: "Active",    progress: 33,  start: "2025-03-20", end: "2025-06-10", milestones: [], subtasks: [{ id: "p7-s1", title: "Complete portal pilot prep", done: true }, { id: "p7-s2", title: "Run pilot with internal teams", done: false }, { id: "p7-s3", title: "Launch company-wide", done: false }] },
];

export const tasks: Task[] = [
  { id: "t1",  title: "Audit Route 14 fuel logs",        assignee: "Ryan Lopez",       team: "dispatch",    priority: "High",   status: "In Progress", due: "2025-04-25", project: "Q2 Fleet Optimization" },
  { id: "t2",  title: "Reconcile March vendor invoices", assignee: "Ryan Lopez",       team: "bookkeeping", priority: "Urgent", status: "In Progress", due: "2025-04-22", project: "Books Cleanup Q1" },
  { id: "t3",  title: "Schedule senior backend interviews", assignee: "Alyanna Alonzo", team: "recruitment", priority: "Medium", status: "Not Started", due: "2025-04-26", project: "Hiring Sprint — Engineering" },
  { id: "t4",  title: "Send proposal to Acme Corp",      assignee: "Von Carlo Asinas", team: "sales",       priority: "High",   status: "In Progress", due: "2025-04-21", project: "Enterprise Pipeline Push" },
  { id: "t5",  title: "Review CA tax thresholds",        assignee: "Alyanna Alonzo",   team: "payroll",     priority: "Medium", status: "On Hold",     due: "2025-04-30", project: "Payroll Compliance Audit" },
  { id: "t6",  title: "Driver schedule optimization",    assignee: "Ryan Lopez",       team: "dispatch",    priority: "Low",    status: "Completed",   due: "2025-04-18" },
  { id: "t7",  title: "Quarterly client QBRs",           assignee: "Von Carlo Asinas", team: "clients",     priority: "High",   status: "Not Started", due: "2025-05-05" },
  { id: "t8",  title: "Outreach to passive candidates",  assignee: "Alyanna Alonzo",   team: "recruitment", priority: "Medium", status: "In Progress", due: "2025-04-24" },
  { id: "t9",  title: "Renew CRM licenses",              assignee: "Von Carlo Asinas", team: "sales",       priority: "Urgent", status: "In Progress", due: "2025-04-20" },
  { id: "t10", title: "Prep Q1 payroll report",          assignee: "Alyanna Alonzo",   team: "payroll",     priority: "High",   status: "Completed",   due: "2025-04-15" },
  { id: "t11", title: "Onboard 3 new drivers",           assignee: "Ryan Lopez",       team: "dispatch",    priority: "Medium", status: "In Progress", due: "2025-04-28" },
  { id: "t12", title: "Cross-team project kickoff",      assignee: "James Steffan",    team: "projects",    priority: "High",   status: "In Progress", due: "2025-05-02", project: "Portal Rollout" },
  { id: "t13", title: "Client onboarding playbook",      assignee: "Von Carlo Asinas", team: "clients",     priority: "Medium", status: "In Progress", due: "2025-04-23" },
  { id: "t14", title: "Compliance training rollout",     assignee: "Alyanna Alonzo",   team: "recruitment", priority: "High",   status: "In Progress", due: "2025-04-29" },
  { id: "t15", title: "Monthly P&L close",               assignee: "Ryan Lopez",       team: "bookkeeping", priority: "High",   status: "Not Started", due: "2025-05-03", project: "Books Cleanup Q1" },
];

export const activity: Activity[] = [
  { id: "a1", user: "Von Carlo Asinas", action: "completed task",  target: "Acme proposal draft",      time: "12m ago" },
  { id: "a2", user: "Ryan Lopez",       action: "updated project", target: "Q2 Fleet Optimization",    time: "38m ago" },
  { id: "a3", user: "Alyanna Alonzo",   action: "added comment on",target: "Senior backend interviews",time: "1h ago" },
  { id: "a4", user: "James Steffan",    action: "promoted",        target: "Portal Rollout",           time: "2h ago" },
  { id: "a5", user: "Alyanna Alonzo",   action: "completed task",  target: "Q1 payroll report",        time: "3h ago" },
  { id: "a6", user: "Von Carlo Asinas", action: "created task",    target: "Quarterly client QBRs",    time: "5h ago" },
];

export const teamWorkload = teams.map((t) => ({
  team: t.name,
  active: tasks.filter((x) => x.team === t.id && x.status !== "Completed").length,
  done: tasks.filter((x) => x.team === t.id && x.status === "Completed").length,
}));

export const productivityTrend = [
  { week: "W1", completed: 24, created: 30 },
  { week: "W2", completed: 31, created: 28 },
  { week: "W3", completed: 28, created: 35 },
  { week: "W4", completed: 42, created: 38 },
  { week: "W5", completed: 38, created: 33 },
  { week: "W6", completed: 47, created: 41 },
];

export const statusBreakdown = [
  { name: "Completed", value: tasks.filter((t) => t.status === "Completed").length, color: "hsl(var(--success))" },
  { name: "In Progress", value: tasks.filter((t) => t.status === "In Progress").length, color: "hsl(var(--info))" },
  { name: "Not Started", value: tasks.filter((t) => t.status === "Not Started").length, color: "hsl(var(--muted-foreground))" },
  { name: "On Hold", value: tasks.filter((t) => t.status === "On Hold").length, color: "hsl(var(--warning))" },
];

export const priorityColor: Record<Priority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-info/10 text-info border border-info/20",
  High: "bg-warning/10 text-warning border border-warning/20",
  Urgent: "bg-destructive/10 text-destructive border border-destructive/20",
  Critical: "bg-destructive text-destructive-foreground border border-destructive",
};

export const statusColor: Record<TaskStatus, string> = {
  "Not Started": "bg-muted text-muted-foreground",
  "In Progress": "bg-info/10 text-info border border-info/20",
  "On Hold": "bg-warning/10 text-warning border border-warning/20",
  "Waiting Review": "bg-primary/10 text-primary border border-primary/20",
  "Blocked": "bg-destructive/10 text-destructive border border-destructive/20",
  "Completed": "bg-success/10 text-success border border-success/20",
  "Cancelled": "bg-muted text-muted-foreground/60 border border-border",
};

export const projectStatusColor: Record<ProjectStatus, string> = {
  Planning: "bg-muted text-muted-foreground",
  Active: "bg-info/10 text-info border border-info/20",
  "At Risk": "bg-destructive/10 text-destructive border border-destructive/20",
  Delayed: "bg-warning/10 text-warning border border-warning/20",
  "On Hold": "bg-muted text-muted-foreground border border-border",
  "Waiting Review": "bg-primary/10 text-primary border border-primary/20",
  Completed: "bg-success/10 text-success border border-success/20",
  Cancelled: "bg-muted text-muted-foreground/60 border border-border",
};

export const projectHealthColor: Record<ProjectHealth, string> = {
  Healthy: "bg-success text-success-foreground",
  "At Risk": "bg-warning text-warning-foreground",
  Delayed: "bg-destructive text-destructive-foreground",
  Blocked: "bg-muted-foreground text-background",
};

// ============================================================
// Extended seed data for new modules (Phase 1)
// ============================================================

export interface Approval {
  id: string;
  type: ApprovalType;
  title: string;
  requester: string;
  team: TeamId;
  status: ApprovalStatus;
  hidden?: boolean;
  taskId?: string;
  projectId?: string;
  amount?: number;
  submitted: string;
  notes?: string;
  requestedById?: string;
  calendarEventDraft?: Omit<CalendarEvent, "id">;
}

export const approvals: Approval[] = [
  { id: "ap1", type: "Budget", title: "Q2 Fleet maintenance increase", requester: "Ryan Lopez", team: "dispatch", status: "Pending", amount: 24500, submitted: "2025-04-19", notes: "Additional preventive maintenance budget for Q2." },
  { id: "ap2", type: "Leave", title: "PTO — Apr 28 to May 2", requester: "Alyanna Alonzo", team: "recruitment", status: "Under Review", submitted: "2025-04-18" },
  { id: "ap3", type: "Task", title: "Approve Acme Corp proposal v3", requester: "Von Carlo Asinas", team: "sales", status: "Pending", submitted: "2025-04-20" },
  { id: "ap4", type: "Change", title: "Scope change: add SSO to Portal Rollout", requester: "James Steffan", team: "projects", status: "Approved", submitted: "2025-04-17" },
  { id: "ap5", type: "Report", title: "March payroll closing report", requester: "Alyanna Alonzo", team: "payroll", status: "Returned", submitted: "2025-04-16", notes: "Please attach the variance breakdown." },
  { id: "ap6", type: "Budget", title: "CRM license renewal", requester: "Von Carlo Asinas", team: "sales", status: "Pending", amount: 18900, submitted: "2025-04-21" },
];

export interface DocumentFile {
  id: string;
  name: string;
  category: "SOP" | "Report" | "Template" | "Contract" | "Project";
  size: string;
  owner: string;
  team: TeamId;
  updated: string;
  version: string;
  fileDataUrl?: string;
  fileMimeType?: string;
}

export const documents: DocumentFile[] = [
  { id: "d1", name: "Driver Onboarding SOP v3.2.pdf", category: "SOP", size: "1.2 MB", owner: "Ryan Lopez", team: "dispatch", updated: "2 days ago", version: "v3.2" },
  { id: "d2", name: "Q1 Financial Report.xlsx", category: "Report", size: "640 KB", owner: "Ryan Lopez", team: "bookkeeping", updated: "1 week ago", version: "v1" },
  { id: "d3", name: "Master Services Agreement Template.docx", category: "Template", size: "84 KB", owner: "Von Carlo Asinas", team: "sales", updated: "3 weeks ago", version: "v5" },
  { id: "d4", name: "Acme Corp — Signed MSA.pdf", category: "Contract", size: "2.1 MB", owner: "Von Carlo Asinas", team: "clients", updated: "Yesterday", version: "v1" },
  { id: "d5", name: "Portal Rollout — Architecture.pdf", category: "Project", size: "3.8 MB", owner: "James Steffan", team: "projects", updated: "5h ago", version: "v2.1" },
  { id: "d6", name: "Payroll SOP — Multi-state.pdf", category: "SOP", size: "920 KB", owner: "Alyanna Alonzo", team: "payroll", updated: "2 weeks ago", version: "v4" },
  { id: "d7", name: "Recruiter Interview Scorecard.docx", category: "Template", size: "48 KB", owner: "Alyanna Alonzo", team: "recruitment", updated: "4 days ago", version: "v2" },
];

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRun: string;
  runs: number;
  errors: number;
}

export const automations: AutomationRule[] = [
  { id: "au1", name: "Notify manager on overdue task", trigger: "Task overdue > 24h", action: "Send notification to team manager", enabled: true, lastRun: "12m ago", runs: 142, errors: 0 },
  { id: "au2", name: "Auto-move completed → Waiting Review", trigger: "Task marked Completed", action: "Move to Waiting Review if approval required", enabled: true, lastRun: "1h ago", runs: 67, errors: 1 },
  { id: "au3", name: "Weekly recurring: Driver check-in", trigger: "Every Monday 8:00 AM", action: "Create task for each driver", enabled: true, lastRun: "Yesterday", runs: 18, errors: 0 },
  { id: "au4", name: "Remind inactive assignees", trigger: "No update > 5 days", action: "Send reminder + escalate", enabled: false, lastRun: "Never", runs: 0, errors: 0 },
  { id: "au5", name: "Auto-archive cancelled tasks", trigger: "Status changed to Cancelled", action: "Archive after 7 days", enabled: true, lastRun: "3d ago", runs: 24, errors: 0 },
];

export interface AuditEntry {
  id: string;
  user: string;
  action: string;
  target: string;
  category: "Task" | "Project" | "User" | "File" | "Approval" | "Login" | "System";
  team?: TeamId;
  time: string;
  ip?: string;
}

export const auditLog: AuditEntry[] = [
  { id: "al1", user: "James Steffan", action: "Updated permissions for", target: "Ryan Lopez", category: "User", time: "8m ago", ip: "10.0.1.4" },
  { id: "al2", user: "Ryan Lopez", action: "Approved", target: "Q2 Fleet maintenance budget", category: "Approval", team: "dispatch", time: "32m ago" },
  { id: "al3", user: "Von Carlo Asinas", action: "Uploaded", target: "Acme Corp — Signed MSA.pdf", category: "File", team: "clients", time: "1h ago" },
  { id: "al4", user: "Alyanna Alonzo", action: "Logged in from", target: "Chrome / macOS", category: "Login", time: "3h ago", ip: "172.16.4.8" },
  { id: "al5", user: "James Steffan", action: "Deleted task", target: "Old kickoff doc", category: "Task", team: "projects", time: "Yesterday" },
  { id: "al6", user: "Ryan Lopez", action: "Changed status of", target: "Books Cleanup Q1 → At Risk", category: "Project", team: "bookkeeping", time: "Yesterday" },
  { id: "al7", user: "System", action: "Automation triggered", target: "Notify manager on overdue task", category: "System", time: "2 days ago" },
  { id: "al8", user: "Alyanna Alonzo", action: "Returned approval", target: "March payroll closing report", category: "Approval", team: "payroll", time: "2 days ago" },
];

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  date: string;
  team?: TeamId;
  attendees?: string[];
  createdById: string;
  createdByName: string;
}

export const calendarEvents: CalendarEvent[] = [
  { id: "ev1", title: "Acme Corp proposal review", type: "Meeting", date: "2025-04-22", team: "sales", attendees: ["Von Carlo Asinas", "James Steffan"], createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev2", title: "Q2 Fleet pilot launch", type: "Event", date: "2025-04-25", team: "dispatch", createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev3", title: "Vendor invoice deadline", type: "Deadline", date: "2025-04-22", team: "bookkeeping", createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev4", title: "All-hands sync", type: "Meeting", date: "2025-04-23", attendees: ["James Steffan", "Ryan Lopez", "Von Carlo Asinas", "Alyanna Alonzo"], createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev5", title: "Alyanna PTO", type: "PTO", date: "2025-04-28", team: "recruitment", createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev6", title: "Senior backend interview panel", type: "Meeting", date: "2025-04-24", team: "recruitment", createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev7", title: "Portal Rollout pilot", type: "Event", date: "2025-05-02", team: "projects", createdById: "u1", createdByName: "Von Carlo Asinas" },
  { id: "ev8", title: "CRM renewal cutoff", type: "Deadline", date: "2025-04-29", team: "sales", createdById: "u1", createdByName: "Von Carlo Asinas" },
];

// AI insights for executive dashboard
export const aiInsights = [
  { id: "ai1", tone: "warning" as const, title: "Bookkeeping team capacity at 118%", body: "Reassigning 2 invoices to Payroll could rebalance load by Friday." },
  { id: "ai2", tone: "positive" as const, title: "Sales velocity up 24% week-over-week", body: "Enterprise Pipeline Push is on track to close 2 weeks early." },
  { id: "ai3", tone: "neutral" as const, title: "3 approvals waiting > 48h", body: "Pending decisions are blocking 6 downstream tasks." },
];

// Project health derived
export const projectHealthOf = (p: Project): ProjectHealth => {
  if (p.status === "On Hold") return "Blocked";
  if (p.status === "Delayed") return "Delayed";
  if (p.status === "At Risk" || p.progress < 30) return "At Risk";
  return "Healthy";
};
