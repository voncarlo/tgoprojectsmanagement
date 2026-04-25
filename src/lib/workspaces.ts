import type { TeamId, User } from "@/data/mock";

export type WorkspaceKind = "department" | "company" | "custom";

export interface Workspace {
  id: string;
  name: string;
  shortName: string;
  description: string;
  kind: WorkspaceKind;
  color: string;
  teamIds: TeamId[];
  isCompanyWide?: boolean;
}

export const COMPANY_WORKSPACE_ID = "torero-global-outsourcing";

export const isCompanyLevelRole = (role: User["role"]) => role === "Super Admin" || role === "Admin";

export const DEFAULT_WORKSPACES: Workspace[] = [
  {
    id: "recruitment",
    name: "TGO Recruitment",
    shortName: "Recruitment",
    description: "Hiring pipeline, interviews, onboarding, and recruiting operations.",
    kind: "department",
    color: "152 60% 38%",
    teamIds: ["recruitment"],
  },
  {
    id: "dispatch",
    name: "TGO Dispatch",
    shortName: "Dispatch",
    description: "Daily operations, route planning, logistics, and dispatch execution.",
    kind: "department",
    color: "199 89% 48%",
    teamIds: ["dispatch"],
  },
  {
    id: "business-admin",
    name: "TGO Business Admin",
    shortName: "Business Admin",
    description: "Administrative operations, internal coordination, and back-office support.",
    kind: "department",
    color: "24 88% 56%",
    teamIds: ["businessAdmin"],
  },
  {
    id: "bookkeeping",
    name: "TGO Bookkeeping",
    shortName: "Bookkeeping",
    description: "Financial records, reconciliations, reporting, and month-end close.",
    kind: "department",
    color: "172 70% 38%",
    teamIds: ["bookkeeping"],
  },
  {
    id: "projects",
    name: "TGO Projects",
    shortName: "Projects",
    description: "Cross-functional initiatives, launches, and operational delivery.",
    kind: "department",
    color: "210 85% 55%",
    teamIds: ["projects"],
  },
  {
    id: COMPANY_WORKSPACE_ID,
    name: "Torero Global Outsourcing",
    shortName: "Torero Global Outsourcing",
    description: "Company-wide workspace with approved visibility across all departments.",
    kind: "company",
    color: "221 83% 53%",
    teamIds: ["dispatch", "recruitment", "sales", "clients", "projects", "payroll", "bookkeeping", "businessAdmin"],
    isCompanyWide: true,
  },
  {
    id: "payroll",
    name: "TGO Payroll",
    shortName: "Payroll",
    description: "Payroll operations, compliance, processing, and compensation workflows.",
    kind: "department",
    color: "340 75% 52%",
    teamIds: ["payroll"],
  },
  {
    id: "clients",
    name: "TGO Clients",
    shortName: "Clients",
    description: "Client success, onboarding, renewals, and account relationships.",
    kind: "department",
    color: "262 75% 55%",
    teamIds: ["clients"],
  },
  {
    id: "sales",
    name: "TGO Sales",
    shortName: "Sales",
    description: "Pipeline, proposals, revenue growth, and deal management.",
    kind: "department",
    color: "35 92% 50%",
    teamIds: ["sales"],
  },
];

const uniq = <T,>(items: T[]) => [...new Set(items)];

export const normalizeWorkspaceList = (workspaces?: Workspace[]) => {
  const provided = workspaces ?? [];
  const byId = new Map(DEFAULT_WORKSPACES.map((workspace) => [workspace.id, workspace]));

  for (const workspace of provided) {
    if (!workspace?.id?.trim() || !workspace?.name?.trim() || !workspace.teamIds?.length) continue;
    byId.set(workspace.id, {
      ...workspace,
      shortName: workspace.shortName?.trim() || workspace.name.trim(),
      description: workspace.description?.trim() || "Workspace",
      color: workspace.color?.trim() || "221 83% 53%",
      teamIds: uniq(workspace.teamIds),
    });
  }

  return [...byId.values()];
};

export const getDefaultWorkspaceIdsForTeams = (teams: TeamId[]) =>
  DEFAULT_WORKSPACES.filter(
    (workspace) => workspace.kind === "department" && workspace.teamIds.some((teamId) => teams.includes(teamId))
  ).map((workspace) => workspace.id);

export const getDefaultWorkspaceIdsForUser = (user: Pick<User, "role" | "teams" | "team" | "workspaceIds">, workspaces: Workspace[]) => {
  if (isCompanyLevelRole(user.role)) {
    return workspaces.some((workspace) => workspace.id === COMPANY_WORKSPACE_ID) ? [COMPANY_WORKSPACE_ID] : [];
  }

  const departmentWorkspaceIds = getDefaultWorkspaceIdsForTeams(
    uniq([...(user.teams ?? []), user.team].filter(Boolean) as TeamId[])
  );
  const requestedWorkspaceIds = user.workspaceIds ?? [];
  const workspaceIds = uniq(
    [...departmentWorkspaceIds, ...requestedWorkspaceIds].filter((workspaceId) =>
      workspaces.some((workspace) => workspace.id === workspaceId)
    )
  );

  return workspaceIds;
};

export const resolveWorkspaceTeams = (workspace: Workspace | null | undefined, allTeams: TeamId[]) => {
  if (!workspace) return [];
  if (workspace.isCompanyWide) return allTeams;
  return uniq(workspace.teamIds.filter((teamId) => allTeams.includes(teamId)));
};
