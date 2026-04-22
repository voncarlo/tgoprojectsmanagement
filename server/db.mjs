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
};

export const query = async (sql, params = []) => {
  const connection = getPool();
  const [rows] = await connection.query(sql, params);
  return rows;
};
