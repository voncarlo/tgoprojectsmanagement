import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "..", "db", "schema.sql");

const getConnectionOptions = () => {
  if (process.env.MYSQL_URL) {
    return process.env.MYSQL_URL;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.MYSQLHOST || process.env.MYSQL_HOST) {
    return {
      host: process.env.MYSQLHOST ?? process.env.MYSQL_HOST,
      port: Number.parseInt(process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? "3306", 10),
      user: process.env.MYSQLUSER ?? process.env.MYSQL_USER,
      password: process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD,
      database: process.env.MYSQLDATABASE ?? process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  return null;
};

let pool;

const ensureTableColumn = async (tableName, columnName, definition) => {
  const connection = getPool();
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tableName, columnName]
  );
  if (rows[0]?.count) return;
  await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

export const hasDatabaseConfig = () => Boolean(getConnectionOptions());

export const getPool = () => {
  if (!pool) {
    const options = getConnectionOptions();
    if (!options) {
      throw new Error("MySQL is not configured. Set MYSQL_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.");
    }
    pool = mysql.createPool(options);
  }
  return pool;
};

export const ensureSchema = async () => {
  const sql = await fs.readFile(schemaPath, "utf8");
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  const connection = getPool();
  for (const statement of statements) {
    await connection.query(statement);
  }

  await ensureTableColumn("users", "avatar_url", "TEXT NULL");
  await ensureTableColumn("users", "notification_settings_json", "JSON NULL");
  await ensureTableColumn("tasks", "assigned_by", "VARCHAR(255) NULL");
  await ensureTableColumn("tasks", "subtasks_json", "JSON NULL");
  await ensureTableColumn("projects", "co_owners_json", "JSON NULL");
  await ensureTableColumn("projects", "requires_approval", "BOOLEAN NOT NULL DEFAULT FALSE");
  await ensureTableColumn("projects", "approver", "VARCHAR(255) NULL");
  await ensureTableColumn("projects", "approval_status", "VARCHAR(64) NULL");
  await ensureTableColumn("projects", "approval_history_json", "JSON NULL");
  await ensureTableColumn("projects", "subtasks_json", "JSON NULL");
};

export const query = async (sql, params = []) => {
  const connection = getPool();
  const [rows] = await connection.query(sql, params);
  return rows;
};
