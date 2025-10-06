# Construction Tracker

A full-stack application for managing construction projects.

- Frontend: React (CRA 5 + MUI)
- Backend: Express + MongoDB (Mongoose)
- API base path: `/api/v1`
- Deployed example: Render (single service serving API and built React app)

## Monorepo Layout

- `client/` — React app
- `server/` — Express API and build pipeline that serves the client build in production

## Local Development

Prereqs: Node 18.x, npm, MongoDB Atlas or local MongoDB.

1) Backend env

Create `server/.env` with:

```
PORT=5000
NODE_ENV=development
MONGODB_URI=<your MongoDB URI>
JWT_SECRET=<long random string>
CORS_ORIGIN=http://localhost:3000
```

2) Frontend env

Create `client/.env` with:

```
REACT_APP_API_URL=http://localhost:5000/api/v1
PORT=3000
BROWSER=none
```

3) Install deps

```
# in server/
npm install

# in client/
npm install
```

4) Run

```
# Start backend (from server/)
npm run dev

# Start frontend (from client/)
npm start
```

Open http://localhost:3000.

## Production (Render) — Single Service

- Service Root Directory: `server/`
- Build Command: `npm run build:client`
- Start Command: `npm start`
- Important environment variables in the Render service:
  - `NODE_ENV=production`
  - `PORT=5000`
  - `MONGODB_URI=<Atlas URI>`
  - `JWT_SECRET=<secret>`
  - `CORS_ORIGIN=<frontend origin>` (set to your Render URL if serving the client from the same service)
  - `NODE_VERSION=18.19.0` (or use `"engines": {"node": "18.x"}` in `server/package.json`)

During build, `server/package.json` runs:

```
"build:client": "cd ../client && npm install --legacy-peer-deps && npm run build"
```

At runtime, `server/server.js`:
- Trusts the proxy (`app.set('trust proxy', 1)`) for accurate client IPs behind Render
- Serves React build if `client/build` exists
- Exposes health endpoints: `/api/v1/health`, `/api/health`, `/healthz`

## Routing Behavior

- Visiting `/` redirects to `/login` when not authenticated
- Public routes:
  - `/login` — Sign in
  - `/register` — Sign up
- Protected routes (require auth):
  - `/dashboard`, `/buildings`, `/work-orders`, `/workers`, `/reminders`, `/profile`, `/settings`

## Auth Flow

- POST `/api/v1/auth/login` returns a JWT token; the frontend stores it in Redux state
- After login, user is redirected to `/dashboard`
- 401 responses trigger a logout in the RTK Query base layer

## Health Checks

- `/api/v1` — API info
- `/api/v1/health` — JSON `{status: 'ok'}`
- `/api/health`, `/healthz` — alternate health endpoints

## Common Issues

- Build fails on Render: ensure Node 18, and that the build command is `npm run build:client`
- CORS errors in local dev: confirm `CORS_ORIGIN=http://localhost:3000` on the server and `REACT_APP_API_URL=http://localhost:5000/api/v1` on the client
- API 404: All endpoints are under `/api/v1/...`

## Scripts

- `server/`
  - `npm run dev` — start server with nodemon
  - `npm start` — production start
  - `npm run build:client` — install and build React app
- `client/`
  - `npm start` — start CRA dev server
  - `npm run build` — build React app

## License

MIT
