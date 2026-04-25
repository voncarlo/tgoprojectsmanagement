export const seedUsers = [
  {
    id: "u1",
    name: "Von Carlo Asinas",
    email: "von.asinas@tgocorp.com",
    role: "Super Admin",
    team: "projects",
    teams: ["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping", "businessAdmin"],
    workspaceIds: ["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping", "business-admin", "torero-global-outsourcing"],
    modules: ["dashboard", "tasks", "projects", "calendar", "workload", "reports", "documents", "notifications", "activity", "approvals", "automations", "dispatch", "recruitment", "sales", "payroll", "bookkeeping", "clients", "teams", "users", "admin", "settings"],
    status: "Active",
    initials: "VA",
    lastActive: "Just now",
  },
];

export const seedTasks = [
  { id: "t1", title: "Audit Route 14 fuel logs", assignee: "Ryan Lopez", team: "dispatch", priority: "High", status: "In Progress", due: "2025-04-25", project: "Q2 Fleet Optimization" },
  { id: "t2", title: "Reconcile March vendor invoices", assignee: "Ryan Lopez", team: "bookkeeping", priority: "Urgent", status: "In Progress", due: "2025-04-22", project: "Books Cleanup Q1" },
  { id: "t3", title: "Schedule senior backend interviews", assignee: "Alyanna Alonzo", team: "recruitment", priority: "Medium", status: "Not Started", due: "2025-04-26", project: "Hiring Sprint - Engineering" },
  { id: "t4", title: "Send proposal to Acme Corp", assignee: "Von Carlo Asinas", team: "sales", priority: "High", status: "In Progress", due: "2025-04-21", project: "Enterprise Pipeline Push" },
  { id: "t5", title: "Review CA tax thresholds", assignee: "Alyanna Alonzo", team: "payroll", priority: "Medium", status: "On Hold", due: "2025-04-30", project: "Payroll Compliance Audit" },
  { id: "t6", title: "Driver schedule optimization", assignee: "Ryan Lopez", team: "dispatch", priority: "Low", status: "Completed", due: "2025-04-18" },
  { id: "t7", title: "Quarterly client QBRs", assignee: "Von Carlo Asinas", team: "clients", priority: "High", status: "Not Started", due: "2025-05-05" },
  { id: "t8", title: "Outreach to passive candidates", assignee: "Alyanna Alonzo", team: "recruitment", priority: "Medium", status: "In Progress", due: "2025-04-24" },
  { id: "t9", title: "Renew CRM licenses", assignee: "Von Carlo Asinas", team: "sales", priority: "Urgent", status: "In Progress", due: "2025-04-20" },
  { id: "t10", title: "Prep Q1 payroll report", assignee: "Alyanna Alonzo", team: "payroll", priority: "High", status: "Completed", due: "2025-04-15" },
  { id: "t11", title: "Onboard 3 new drivers", assignee: "Ryan Lopez", team: "dispatch", priority: "Medium", status: "In Progress", due: "2025-04-28" },
  { id: "t12", title: "Cross-team project kickoff", assignee: "James Steffan", team: "projects", priority: "High", status: "In Progress", due: "2025-05-02", project: "Portal Rollout" },
  { id: "t13", title: "Client onboarding playbook", assignee: "Von Carlo Asinas", team: "clients", priority: "Medium", status: "In Progress", due: "2025-04-23" },
  { id: "t14", title: "Compliance training rollout", assignee: "Alyanna Alonzo", team: "recruitment", priority: "High", status: "In Progress", due: "2025-04-29" },
  { id: "t15", title: "Monthly P&L close", assignee: "Ryan Lopez", team: "bookkeeping", priority: "High", status: "Not Started", due: "2025-05-03", project: "Books Cleanup Q1" },
  { id: "t16", title: "Update internal policy handbook", assignee: "Maria Santos", team: "businessAdmin", priority: "Medium", status: "In Progress", due: "2025-04-27", project: "Policy Handbook Refresh" },
];

export const seedProjects = [
  { id: "p1", name: "Q2 Fleet Optimization", description: "Re-route delivery network for 18% fuel savings.", team: "dispatch", owner: "Ryan Lopez", status: "Active", progress: 72, start: "2025-02-01", end: "2025-05-30", milestones: [{ name: "Route audit", done: true }, { name: "Pilot run", done: true }, { name: "Rollout", done: false }] },
  { id: "p2", name: "Books Cleanup Q1", description: "Reconcile, audit and close Q1 books.", team: "bookkeeping", owner: "Ryan Lopez", status: "At Risk", progress: 45, start: "2025-01-10", end: "2025-06-15", milestones: [{ name: "Reconcile", done: true }, { name: "Review", done: false }, { name: "Close", done: false }] },
  { id: "p3", name: "Hiring Sprint - Engineering", description: "Hire 12 engineers across backend and infra.", team: "recruitment", owner: "Alyanna Alonzo", status: "Active", progress: 58, start: "2025-03-01", end: "2025-05-15", milestones: [{ name: "Sourcing", done: true }, { name: "Interviews", done: true }, { name: "Offers", done: false }] },
  { id: "p4", name: "Enterprise Pipeline Push", description: "Close 5 enterprise deals before EoQ.", team: "sales", owner: "Von Carlo Asinas", status: "Active", progress: 81, start: "2025-03-15", end: "2025-06-30", milestones: [{ name: "Discovery", done: true }, { name: "Proposals", done: true }, { name: "Closing", done: false }] },
  { id: "p5", name: "Payroll Compliance Audit", description: "Annual multi-state compliance audit.", team: "payroll", owner: "Alyanna Alonzo", status: "Planning", progress: 18, start: "2025-04-10", end: "2025-07-01", milestones: [{ name: "Scope", done: true }, { name: "Review", done: false }, { name: "Report", done: false }] },
  { id: "p6", name: "Client Onboarding Revamp", description: "New self-serve client onboarding flow.", team: "clients", owner: "Von Carlo Asinas", status: "Completed", progress: 100, start: "2024-11-01", end: "2025-02-28", milestones: [{ name: "Design", done: true }, { name: "Build", done: true }, { name: "Launch", done: true }] },
  { id: "p7", name: "Portal Rollout", description: "Cross-team rollout of TGO Projects Portal.", team: "projects", owner: "James Steffan", status: "Active", progress: 64, start: "2025-03-20", end: "2025-06-10", milestones: [{ name: "Build", done: true }, { name: "Pilot", done: false }, { name: "Launch", done: false }] },
  { id: "p8", name: "Policy Handbook Refresh", description: "Refresh internal admin policies and handoff docs.", team: "businessAdmin", owner: "Maria Santos", status: "Active", progress: 50, start: "2025-04-01", end: "2025-05-20", milestones: [{ name: "Review procedures", done: true }, { name: "Collect sign-offs", done: false }, { name: "Publish final handbook", done: false }] },
];
