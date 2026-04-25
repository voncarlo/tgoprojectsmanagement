import { teams, type Project, type User } from "@/data/mock";

export const getProjectMembers = (project: Project) => {
  return [...new Set([project.owner, ...(project.coOwners ?? [])].map((name) => name.trim()).filter(Boolean) as string[])];
};

export const canFullyAccessProject = (project: Project, currentUser: User, isManager: boolean) => {
  if (isManager) return true;
  const teamLead = teams.find((team) => team.id === project.team)?.lead;
  const projectMembers = getProjectMembers(project);
  return projectMembers.includes(currentUser.name) || teamLead === currentUser.name;
};
