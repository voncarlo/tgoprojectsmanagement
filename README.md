# TGO Projects Management

This project is a Vite + React portal for internal project and team management.

## Local development

```bash
npm install
npm run dev
```

## Railway deployment

Railway can deploy this repo directly.

```bash
npm run build
npm run start
```

The repo includes:

- a `start` script that serves the production `dist` build
- SPA fallback handling for React Router routes like `/login` and `/dashboard`
- `railway.toml` so Railway uses the production start command automatically

## MySQL support

The project now includes a server-side MySQL layer for Railway.

Set one of these in Railway:

- `MYSQL_URL`
- or `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

On startup the server will:

- connect to MySQL
- create the core tables from [db/schema.sql](/c:/Users/Main%20User/Desktop/PROJECTS%20(V)/TGO%20Work%20Hub/db/schema.sql:1)
- seed starter users, tasks, and projects if the tables are empty

Available API routes:

- `GET /api/health`
- `GET /api/users`
- `GET /api/tasks`
- `GET /api/projects`
