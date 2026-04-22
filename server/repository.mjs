import { query } from "./db.mjs";
import { seedUsers, seedTasks, seedProjects } from "./seed-data.mjs";

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const mapUserRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  team: row.team,
  teams: parseJson(row.teams_json, []),
  modules: parseJson(row.modules_json, []),
  status: row.status,
  initials: row.initials,
  lastActive: row.last_active,
});

const mapTaskRow = (row) => ({
  id: row.id,
  title: row.title,
  assignee: row.assignee,
  team: row.team,
  priority: row.priority,
  status: row.status,
  due: row.due instanceof Date ? row.due.toISOString().slice(0, 10) : String(row.due),
  project: row.project ?? undefined,
  notes: row.notes ?? undefined,
  requiresApproval: Boolean(row.requires_approval),
  approver: row.approver ?? undefined,
  approvalStatus: row.approval_status ?? undefined,
  approvalHistory: parseJson(row.approval_history_json, []),
});

const mapProjectRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  team: row.team,
  owner: row.owner,
  status: row.status,
  progress: row.progress,
  start: row.start_date instanceof Date ? row.start_date.toISOString().slice(0, 10) : String(row.start_date),
  end: row.end_date instanceof Date ? row.end_date.toISOString().slice(0, 10) : String(row.end_date),
  milestones: parseJson(row.milestones_json, []),
});

export const seedDatabase = async () => {
  const counts = await Promise.all([
    query("SELECT COUNT(*) AS count FROM users"),
    query("SELECT COUNT(*) AS count FROM tasks"),
    query("SELECT COUNT(*) AS count FROM projects"),
  ]);

  if (!counts[0][0]?.count) {
    for (const user of seedUsers) {
      await query(
        `INSERT INTO users (id, name, email, role, team, teams_json, modules_json, status, initials, last_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.name,
          user.email,
          user.role,
          user.team,
          JSON.stringify(user.teams),
          JSON.stringify(user.modules),
          user.status,
          user.initials,
          user.lastActive ?? null,
        ]
      );
    }
  }

  if (!counts[1][0]?.count) {
    for (const task of seedTasks) {
      await query(
        `INSERT INTO tasks (
          id, title, assignee, team, priority, status, due, project, notes,
          requires_approval, approver, approval_status, approval_history_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.title,
          task.assignee,
          task.team,
          task.priority,
          task.status,
          task.due,
          task.project ?? null,
          task.notes ?? null,
          task.requiresApproval ?? false,
          task.approver ?? null,
          task.approvalStatus ?? null,
          JSON.stringify(task.approvalHistory ?? []),
        ]
      );
    }
  }

  if (!counts[2][0]?.count) {
    for (const project of seedProjects) {
      await query(
        `INSERT INTO projects (
          id, name, description, team, owner, status, progress, start_date, end_date, milestones_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.name,
          project.description,
          project.team,
          project.owner,
          project.status,
          project.progress,
          project.start,
          project.end,
          JSON.stringify(project.milestones),
        ]
      );
    }
  }
};

export const listUsers = async () => {
  const rows = await query("SELECT * FROM users ORDER BY name ASC");
  return rows.map(mapUserRow);
};

export const listTasks = async () => {
  const rows = await query("SELECT * FROM tasks ORDER BY created_at DESC");
  return rows.map(mapTaskRow);
};

export const listProjects = async () => {
  const rows = await query("SELECT * FROM projects ORDER BY created_at DESC");
  return rows.map(mapProjectRow);
};
