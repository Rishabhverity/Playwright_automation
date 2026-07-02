# Playwright Login Automation

A static **frontend** (Next.js) + separate **backend** (Express + Playwright) for automating website logins, saving sessions per user, and running tasks on saved sessions.

## Architecture

```
frontend/   → Static Next.js UI (port 3000)
backend/    → Express API + Playwright (port 4000)
```

The frontend calls the backend via `NEXT_PUBLIC_API_URL`.

## Prerequisites

- Node.js 18+
- Chrome (for headed Playwright automation)

## 1. Start the backend

```bash
cd backend
npm install
npx playwright install chromium
npm run dev
```

`npm run dev` automatically frees port 4000 if an old server is still running.

The API runs at **http://localhost:4000**.

> **Note:** If you are already inside the `backend` folder, run `npm run dev` only — do not run `cd backend` again.

## 2. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The UI runs at **http://localhost:3000**.

## Environment variables

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**backend/.env**
```
PORT=4000
AUTH_SECRET=dev-secret-change-in-production
```

## Production build

**Frontend (static export):**
```bash
cd frontend
npm run build
```
Output is in `frontend/out/` — deploy to any static host (Netlify, GitHub Pages, S3, etc.).

**Backend:**
```bash
cd backend
npm run build
npm start
```
Deploy the backend to any Node host (Railway, Render, VPS). Set `NEXT_PUBLIC_API_URL` on the frontend to your API URL.

**Session limits (backend `.env`):**
- `SESSION_TTL_HOURS=5` — auto-delete sessions after 5 hours (from last use)

**Sessions API pagination:** `GET /sessions?page=1&pageSize=5`

## API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/login` | Sign in |
| POST | `/auth/logout` | Sign out |
| GET | `/auth/me` | Current user |
| GET | `/sessions` | List saved site sessions |
| POST | `/automate-login` | Automate login + save session |
| POST | `/automate-task` | Run task on a saved session |

## Usage

1. Sign up / sign in on the frontend
2. **Automate login** — enter a site URL + credentials; session is saved on the backend
3. **Run a task** — e.g. `search cars`, pick a saved session, run
