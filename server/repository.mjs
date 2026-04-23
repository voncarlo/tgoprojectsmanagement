import { query } from "./db.mjs";
import { seedUsers, seedTasks, seedProjects } from "./seed-data.mjs";

const AUTH_META_KEY = "auth_meta";

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
  avatarUrl: row.avatar_url ?? undefined,
  notificationSettings: parseJson(row.notification_settings_json, undefined),
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

const upsertUser = async (user) => {
  await query(
    `INSERT INTO users (
      id, name, email, role, team, teams_json, modules_json, status, initials, last_active, avatar_url, notification_settings_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      role = VALUES(role),
      team = VALUES(team),
      teams_json = VALUES(teams_json),
      modules_json = VALUES(modules_json),
      status = VALUES(status),
      initials = VALUES(initials),
      last_active = VALUES(last_active),
      avatar_url = VALUES(avatar_url),
      notification_settings_json = VALUES(notification_settings_json)`,
    [
      user.id,
      user.name,
      user.email,
      user.role,
      user.team,
      JSON.stringify(user.teams ?? []),
      JSON.stringify(user.modules ?? []),
      user.status,
      user.initials,
      user.lastActive ?? null,
      user.avatarUrl ?? null,
      user.notificationSettings ? JSON.stringify(user.notificationSettings) : null,
    ]
  );
};

const setUserPassword = async (userId, passwordValue) => {
  await query(
    `INSERT INTO user_credentials (user_id, password_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_value = VALUES(password_value)`,
    [userId, passwordValue]
  );
};

const saveAuthMeta = async (currentUserId) => {
  await query(
    `INSERT INTO state_snapshots (state_key, state_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)`,
    [AUTH_META_KEY, JSON.stringify({ currentUserId })]
  );
};

export const seedDatabase = async () => {
  const counts = await Promise.all([
    query("SELECT COUNT(*) AS count FROM users"),
    query("SELECT COUNT(*) AS count FROM user_credentials"),
    query("SELECT COUNT(*) AS count FROM tasks"),
    query("SELECT COUNT(*) AS count FROM projects"),
  ]);

  if (!counts[0][0]?.count) {
    for (const user of seedUsers) {
      await upsertUser(user);
    }
  }

  if (!counts[1][0]?.count) {
    for (const user of seedUsers) {
      await setUserPassword(user.id, user.email.toLowerCase() === "von.asinas@tgocorp.com" ? "Von@4213" : "");
    }
  }

  if (!counts[2][0]?.count) {
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

  if (!counts[3][0]?.count) {
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

export const getStateSnapshot = async (stateKey) => {
  const rows = await query("SELECT state_json FROM state_snapshots WHERE state_key = ? LIMIT 1", [stateKey]);
  if (!rows[0]?.state_json) return null;
  return parseJson(rows[0].state_json, null);
};

export const saveStateSnapshot = async (stateKey, payload) => {
  await query(
    `INSERT INTO state_snapshots (state_key, state_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)`,
    [stateKey, JSON.stringify(payload)]
  );
};

export const getAuthState = async () => {
  const [users, credentialRows, authMeta] = await Promise.all([
    listUsers(),
    query("SELECT user_id, password_value FROM user_credentials"),
    getStateSnapshot(AUTH_META_KEY),
  ]);

  const passwords = Object.fromEntries(
    credentialRows.map((row) => [row.user_id, row.password_value ?? ""])
  );

  return {
    version: 6,
    currentUserId: authMeta?.currentUserId ?? users[0]?.id ?? "",
    passwords,
    userList: users,
  };
};

export const saveAuthState = async (payload) => {
  const nextUsers = payload.userList ?? [];
  const nextPasswords = payload.passwords ?? {};
  const incomingIds = nextUsers.map((user) => user.id);

  for (const user of nextUsers) {
    await upsertUser(user);
    if (Object.prototype.hasOwnProperty.call(nextPasswords, user.id)) {
      await setUserPassword(user.id, nextPasswords[user.id] ?? "");
    }
  }

  if (incomingIds.length > 0) {
    const placeholders = incomingIds.map(() => "?").join(", ");
    await query(`DELETE FROM users WHERE id NOT IN (${placeholders})`, incomingIds);
    await query(`DELETE FROM user_credentials WHERE user_id NOT IN (${placeholders})`, incomingIds);
  } else {
    await query("DELETE FROM users");
    await query("DELETE FROM user_credentials");
  }

  await saveAuthMeta(payload.currentUserId ?? nextUsers[0]?.id ?? "");
};

export const migrateLegacyAuthSnapshot = async () => {
  const legacy = await getStateSnapshot("auth");
  if (!legacy?.userList?.length) return false;

  const userCountRows = await query("SELECT COUNT(*) AS count FROM users");
  const credentialCountRows = await query("SELECT COUNT(*) AS count FROM user_credentials");
  const shouldMigrate =
    Number(userCountRows[0]?.count ?? 0) <= 1 || Number(credentialCountRows[0]?.count ?? 0) === 0;

  if (!shouldMigrate) return false;

  await saveAuthState({
    currentUserId: legacy.currentUserId ?? legacy.userList[0]?.id ?? "",
    passwords: legacy.passwords ?? {},
    userList: legacy.userList,
  });

  return true;
};
