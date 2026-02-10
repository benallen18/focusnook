# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Google Drive Server Proxy (Refresh Tokens)

This app uses a backend proxy to handle Google OAuth (refresh tokens) and Drive API calls.

Local dev:
1. Copy `.env.example` to `.env` and fill in:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `APP_BASE_URL=http://localhost:5173`
   - `VITE_API_BASE_URL=http://localhost:8787/api` (optional but avoids relying on Vite proxy)
   - `CORS_ORIGIN=http://localhost:5173`
2. In Google Cloud Console, add redirect URIs:
   - `http://localhost:8787/api/auth/google/callback`
3. Start the API server:
   - `npm run dev:server`
4. Start the Vite app (proxy is configured in `vite.config.js`):
   - `npm run dev`

Production:
- Deploy the API routes in `api/` to Vercel (they use the same handlers as local).
- Provide the same env vars in Vercel.
- For multi-user persistence, configure Vercel KV and set:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - Without KV, tokens are stored in `server/data/tokens.json` which is fine for local dev but not persistent on Vercel.
