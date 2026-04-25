import { teams, type Project, type User } from "@/data/mock";

export const getProjectMembers = (project: Project) => {
  const teamLead = teams.find((team) => team.id === project.team)?.lead;
  return [...new Set([project.owner, teamLead, ...(project.coOwners ?? [])].filter(Boolean) as string[])];
};

export const canFullyAccessProject = (project: Project, currentUser: User, isManager: boolean) => {
  if (isManager) return true;
  const projectMembers = getProjectMembers(project);
  return projectMembers.includes(currentUser.name);
};
