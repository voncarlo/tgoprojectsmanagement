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
