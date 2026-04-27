# Deploying TuneTrack to Render (MVP)

## Before you start

### Free tier caveat

Render's free **Web Service** spins down after 15 minutes of inactivity. First wake-up
takes 30–60 seconds. For a party game this means the first person to open the app may
see a failed connection until the server boots. Workaround: open the app ~2 minutes
before a session to pre-warm it.

If cold starts become annoying, see [deploy-railway-frontend.md](deploy-railway-frontend.md)
for a backend alternative that stays alive.

### Prerequisites

- Code pushed to a GitHub repository (public or private)
- A Spotify Developer app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
- A free [Render account](https://render.com)

---

## Code changes already made

Two files were added/modified before this guide was written:

| File | Change | Why |
|------|--------|-----|
| [apps/server/package.json](../apps/server/package.json) | Added `"start": "node dist/index.js"` | Render needs a start command after build |
| [apps/web/public/_redirects](../apps/web/public/_redirects) | `/* /index.html 200` | Prevents 404 on direct URL access / page refresh in the SPA |

---

## Step 1 — Deploy the backend (Web Service)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Fill in the service settings:

| Field | Value |
|-------|-------|
| Name | `tunetrack-server` |
| Region | Closest to you (e.g. Frankfurt for EU) |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install && npm run build` |
| Start Command | `node apps/server/dist/index.js` |
| Instance Type | Free |

4. Click **Advanced → Add Environment Variable** and add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `CLIENT_ORIGIN` | *(leave blank for now — fill in after frontend is deployed)* |
| `SPOTIFY_CLIENT_ID` | *(your Spotify app client ID)* |
| `SPOTIFY_CLIENT_SECRET` | *(your Spotify app client secret)* |
| `SPOTIFY_REDIRECT_URI` | `https://tunetrack-server.onrender.com/api/spotify/callback` |

> Replace `tunetrack-server.onrender.com` with your actual Render service URL once it
> is assigned. You can update this variable after the service is created.

5. Click **Create Web Service** and wait for the build to finish.
6. Copy the service URL shown at the top of the dashboard (e.g. `https://tunetrack-server.onrender.com`).

---

## Step 2 — Deploy the frontend (Static Site)

1. Go to **New → Static Site**
2. Connect the same GitHub repo
3. Fill in:

| Field | Value |
|-------|-------|
| Name | `tunetrack-web` |
| Branch | `main` |
| Build Command | `npm install && npm -w @tunetrack/web run build` |
| Publish Directory | `apps/web/dist` |

4. Add one environment variable:

| Key | Value |
|-----|-------|
| `VITE_SERVER_URL` | `https://tunetrack-server.onrender.com` |

> `VITE_SERVER_URL` is read by `resolveServerUrl.ts` and baked into the JS bundle at
> build time. The Socket.IO client uses it to know which backend to connect to.

5. Click **Create Static Site**.
6. Copy the URL (e.g. `https://tunetrack-web.onrender.com`).

---

## Step 3 — Wire the two services together

Go back to your **backend Web Service → Environment** and set:

| Key | Value |
|-----|-------|
| `CLIENT_ORIGIN` | `https://tunetrack-web.onrender.com` |

This is the CORS allowed origin. Without it every browser request from the frontend is
blocked. Click **Save** — the server redeploys automatically.

---

## Step 4 — Update Spotify redirect URI

1. Open [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Select your app → **Edit Settings**
3. Under **Redirect URIs** add: `https://tunetrack-server.onrender.com/api/spotify/callback`
4. Save

---

## Step 5 — Verify

1. Open `https://tunetrack-web.onrender.com` in a browser
2. Open DevTools → Network → filter `WS` — you should see an active WebSocket connection
3. Create a room and have someone join from a different device to confirm real-time sync
4. Test the Spotify login flow from the lobby

If the backend is cold the first load will time out — wait 30–60 seconds and refresh.

---

## Environment variable reference

### Backend (Render Web Service)

| Variable | Example | Notes |
|----------|---------|-------|
| `NODE_ENV` | `production` | Enables production logging and CORS strict mode |
| `CLIENT_ORIGIN` | `https://tunetrack-web.onrender.com` | CORS allowed origin |
| `SPOTIFY_CLIENT_ID` | `abc123...` | From Spotify developer dashboard |
| `SPOTIFY_CLIENT_SECRET` | `xyz789...` | From Spotify developer dashboard |
| `SPOTIFY_REDIRECT_URI` | `https://tunetrack-server.onrender.com/api/spotify/callback` | Must match Spotify dashboard exactly |

> `PORT` is injected automatically by Render. Your server reads it via the Zod env
> config — no manual setting needed.

### Frontend (Render Static Site — baked in at build time)

| Variable | Example | Notes |
|----------|---------|-------|
| `VITE_SERVER_URL` | `https://tunetrack-server.onrender.com` | Backend URL for Socket.IO client |

---

## Redeployment

Both services redeploy automatically on every push to `main`. If you need to trigger a
manual redeploy (e.g. after changing env vars), click **Manual Deploy → Deploy latest
commit** in the Render dashboard.
