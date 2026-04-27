# Deploying TuneTrack — Railway (backend) + Render (frontend)

## Why this combination?

| Service | Hosts | Free tier behaviour |
|---------|-------|---------------------|
| **Railway** | Node.js + Socket.IO backend | **Never sleeps** — $5 credit/month, resets monthly |
| **Render Static Site** | React SPA (frontend) | **Always on** — static files, zero spin-down |

Render's free web service spins down after 15 minutes of inactivity. For a party game
where players connect at the start of a session, a 30–60 second cold start causes
failed socket connections and a confusing experience. Railway's free tier does not have
this restriction — the server stays alive between sessions.

Railway's $5/month free credit covers roughly 500 hours of active compute at the smallest
instance size. For occasional family game nights this will never be exceeded.

---

## Overview of what you will set up

```
Browser (phone / laptop)
        │
        │  HTTPS
        ▼
┌───────────────────────────┐
│  Render Static Site       │  ← React SPA, served as static files, free forever
│  tunetrack-web.onrender.com│
└───────────────────────────┘
        │
        │  Socket.IO (WSS) + REST API calls
        │  via VITE_SERVER_URL
        ▼
┌───────────────────────────┐
│  Railway Web Service      │  ← Node.js + Express + Socket.IO, always on
│  tunetrack.up.railway.app │
└───────────────────────────┘
        │
        │  OAuth callback
        ▼
┌───────────────────────────┐
│  Spotify API              │
└───────────────────────────┘
```

---

## Prerequisites

Before starting, make sure you have:

- [ ] Your TuneTrack code pushed to a **GitHub repository** (public or private)
- [ ] A **Spotify Developer app** — if you do not have one yet, see [Appendix A](#appendix-a--creating-a-spotify-developer-app) at the bottom of this guide
- [ ] A free **Railway account** — sign up at [railway.app](https://railway.app) (use "Login with GitHub" for the easiest setup)
- [ ] A free **Render account** — sign up at [render.com](https://render.com) (use "Login with GitHub" for the easiest setup)

---

## Code changes already in place

These two files were modified before this guide was written. You do not need to do anything — they are already committed.

| File | Change | Why |
|------|--------|-----|
| [apps/server/package.json](../apps/server/package.json) | Added `"start": "node dist/index.js"` | Both Railway and Render need an explicit start command to launch the compiled server |
| [apps/web/public/_redirects](../apps/web/public/_redirects) | `/* /index.html 200` | Without this, refreshing any URL like `/room/ABC` on Render returns a 404 because there is no physical file at that path |

---

## Part A — Deploy the backend on Railway

### A1 — Create a new Railway project

1. Go to [railway.app](https://railway.app) and log in
2. Click **New Project** (top right button)
3. Select **Deploy from GitHub repo**
4. If prompted, click **Configure GitHub App** and grant Railway access to your repositories. You can grant access to all repos or just the TuneTrack one — either works.
5. Search for and select your TuneTrack repository from the list
6. Railway will create a project and begin an initial deploy attempt. **Do not worry if it fails** — you have not set the build/start commands yet.

### A2 — Configure the build and start commands

After the project is created you will see a canvas with a service card in it.

1. Click on the service card (it will be named after your repo)
2. This opens the service detail panel. Click the **Settings** tab at the top
3. Scroll down to the **Build** section and set:
   - **Build Command:** `npm install && npm run build`
4. Scroll down to the **Deploy** section and set:
   - **Start Command:** `node apps/server/dist/index.js`
5. Scroll up to the **Networking** section:
   - Click **Generate Domain** — Railway will assign you a public HTTPS URL like `tunetrack-abc123.up.railway.app`
   - Copy this URL. You will need it for env vars and Spotify.

> **Why `npm install && npm run build`?**
> This repo is an npm workspace monorepo. Running `npm install` at the root installs
> all workspace packages. `npm run build` then compiles the `game-engine`, `shared`,
> and `server` packages in the correct order.

### A3 — Set environment variables

1. Click the **Variables** tab on your service
2. Add each variable below one at a time using the **+ New Variable** button:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Enables production logging behaviour |
| `PORT` | `3001` | Railway injects a `PORT` env var automatically, but setting it explicitly makes it visible in the dashboard |
| `CLIENT_ORIGIN` | *(leave empty for now)* | You will fill this in after the frontend is deployed |
| `SPOTIFY_CLIENT_ID` | *(your client ID)* | Copy from the Spotify developer dashboard |
| `SPOTIFY_CLIENT_SECRET` | *(your client secret)* | Copy from the Spotify developer dashboard |
| `SPOTIFY_REDIRECT_URI` | `https://YOUR-RAILWAY-DOMAIN/api/spotify/callback` | Replace with the domain you generated in A2 |

Example with a real domain:
```
SPOTIFY_REDIRECT_URI = https://tunetrack-abc123.up.railway.app/api/spotify/callback
```

3. After adding all variables, click **Deploy** (or Railway may redeploy automatically)

### A4 — Confirm the backend is running

1. Click the **Deployments** tab — you should see a deployment in progress or completed
2. Once the status shows a green **Active** badge, click on the deployment to see the build log
3. Scroll to the bottom of the log. You should see output similar to:
   ```
   Server listening on port 3001
   CLIENT_ORIGIN: (empty — will be set after frontend deploys)
   ```
4. Open `https://YOUR-RAILWAY-DOMAIN/health` in your browser — it should return a JSON health response confirming the server is up

> **If the build fails:** click the failed deployment and read the log from the top.
> The most common causes are a missing env variable (the Zod env validator will tell you
> exactly which one) or a TypeScript error. Fix the issue, push to `main`, and Railway
> will redeploy automatically.

---

## Part B — Deploy the frontend on Render

### B1 — Create a new Static Site

1. Go to [render.com](https://render.com) and log in
2. Click **New +** (top right) → **Static Site**
3. Connect your GitHub account if prompted, then select your TuneTrack repository
4. Fill in the settings on the next screen:

| Field | Value |
|-------|-------|
| **Name** | `tunetrack-web` *(or any name you like)* |
| **Branch** | `main` |
| **Root Directory** | *(leave blank)* |
| **Build Command** | `npm install && npm -w @tunetrack/web run build` |
| **Publish Directory** | `apps/web/dist` |

> **Why `npm -w @tunetrack/web run build`?**
> This runs the build script only for the `@tunetrack/web` workspace package. It is
> slightly more efficient than `npm run build` (which also builds the server), but
> both work. The `-w` flag targets the workspace by its package name from
> `apps/web/package.json`.

### B2 — Add the environment variable

Scroll down on the same page to find the **Environment Variables** section.

Add one variable:

| Key | Value |
|-----|-------|
| `VITE_SERVER_URL` | `https://YOUR-RAILWAY-DOMAIN` |

Example:
```
VITE_SERVER_URL = https://tunetrack-abc123.up.railway.app
```

> **Important:** `VITE_SERVER_URL` is prefixed with `VITE_` which means Vite bakes it
> into the JavaScript bundle at build time. It is **not** a runtime environment variable
> — it is compiled into the static files. If you change this value later, you must
> trigger a new build on Render for the change to take effect.

### B3 — Create the site and copy its URL

1. Click **Create Static Site**
2. Render will build and deploy the site. This usually takes 2–4 minutes.
3. Once the status shows **Live**, copy your Render URL from the top of the page,
   e.g. `https://tunetrack-web.onrender.com`

---

## Part C — Wire the two services together

At this point both services are running but the backend is rejecting requests from the
frontend because `CLIENT_ORIGIN` is not set. Fix that now.

### C1 — Set CLIENT_ORIGIN on Railway

1. Go back to Railway → your project → your service → **Variables** tab
2. Find `CLIENT_ORIGIN` and set its value to your Render frontend URL:

```
CLIENT_ORIGIN = https://tunetrack-web.onrender.com
```

3. Railway will automatically trigger a redeploy. Wait for it to complete (you can
   watch progress in the **Deployments** tab).

### C2 — Double-check SPOTIFY_REDIRECT_URI

While you are in the Railway Variables tab, confirm that `SPOTIFY_REDIRECT_URI` uses
your Railway domain (not localhost):

```
SPOTIFY_REDIRECT_URI = https://tunetrack-abc123.up.railway.app/api/spotify/callback
```

---

## Part D — Update the Spotify developer dashboard

Spotify will reject OAuth redirects to any URI that is not explicitly whitelisted in
your app settings. You need to add the production Railway callback URL.

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click on your TuneTrack app
3. Click **Edit Settings**
4. Find the **Redirect URIs** field
5. Click **Add** and enter: `https://YOUR-RAILWAY-DOMAIN/api/spotify/callback`
6. Click **Save** at the bottom of the dialog

> Keep `http://127.0.0.1:3001/api/spotify/callback` in the list too — removing it
> will break your local development setup.

---

## Part E — End-to-end verification

Work through this checklist in order. If a step fails, the troubleshooting section
below explains what to check.

### E1 — Backend health check

Open in your browser:
```
https://YOUR-RAILWAY-DOMAIN/health
```
You should get a JSON response like `{ "status": "ok" }`. If you get a "This site
can't be reached" or a Railway error page, the server is not running — check the
deployment log in Railway.

### E2 — Frontend loads

Open `https://tunetrack-web.onrender.com` in a browser.

The app should load and show the home/join screen. Open browser **DevTools → Console**
and confirm there are no errors about a failed connection.

### E3 — Socket.IO connects

1. In DevTools, go to the **Network** tab
2. Filter by **WS** (WebSocket)
3. Refresh the page
4. You should see a WebSocket handshake request to `wss://YOUR-RAILWAY-DOMAIN/socket.io/...`
   with status `101 Switching Protocols`

If you see the request going to `wss://tunetrack-web.onrender.com` instead, the
`VITE_SERVER_URL` env var was not set correctly at build time — see Troubleshooting.

### E4 — Create and join a room

1. On one device/browser, create a room
2. On a second device or incognito window, join using the room code
3. Confirm that actions on one device appear in real-time on the other

### E5 — Spotify login

1. In the lobby, click the Spotify connect button
2. You should be redirected to Spotify's login page
3. After logging in, Spotify redirects back to `https://YOUR-RAILWAY-DOMAIN/api/spotify/callback`
4. You should be redirected back to the app in an authenticated state

---

## Troubleshooting

### "Cannot connect to server" on page load

The socket is connecting to the wrong URL. Open DevTools → Network → WS and check
the WebSocket URL.

- If it says `wss://tunetrack-web.onrender.com`: `VITE_SERVER_URL` was either not
  set or was set after the build. Go to Render → your Static Site → **Environment**,
  confirm the variable is there, then click **Manual Deploy → Deploy latest commit**
  to force a rebuild.
- If it says `wss://localhost:3001`: same issue — `VITE_SERVER_URL` is missing from
  the Render build environment.

### CORS error in browser console

You will see something like:
```
Access to XMLHttpRequest at 'https://railway-domain/socket.io/...' from origin
'https://tunetrack-web.onrender.com' has been blocked by CORS policy
```

Fix: go to Railway → Variables → confirm `CLIENT_ORIGIN` is set to exactly
`https://tunetrack-web.onrender.com` (no trailing slash). Save and wait for
redeploy.

### Railway build fails with "missing environment variable"

Your server validates env vars with Zod at startup. The log will say something like:
```
Error: SPOTIFY_CLIENT_ID: Required
```
Go to Railway → Variables, add the missing variable, and redeploy.

### Railway build fails with TypeScript errors

Check the build log for the specific error. The most common cause is a type error
introduced locally that was not caught before pushing. Fix the error, push to `main`,
and Railway will auto-redeploy.

### Spotify OAuth returns "INVALID_CLIENT: Invalid redirect URI"

The redirect URI in your `SPOTIFY_REDIRECT_URI` env var does not match any URI
registered in the Spotify developer dashboard.

- Confirm the value of `SPOTIFY_REDIRECT_URI` in Railway Variables
- Confirm the same URL appears verbatim in your Spotify app's **Redirect URIs** list
- Both must match character-for-character including the `https://` and path

### Render build fails

Click the failed deploy in Render → **Logs**. Most common causes:

- `npm install` fails: package-lock.json is out of date — run `npm install` locally,
  commit the updated lockfile, and push
- TypeScript compile error: same as Railway — fix and push

---

## Redeploying after code changes

Both services watch your `main` branch and redeploy automatically when you push.

| What changed | Action needed |
|--------------|---------------|
| Server code only | Push to `main` — Railway redeploys automatically |
| Frontend code only | Push to `main` — Render rebuilds and redeploys automatically |
| `VITE_SERVER_URL` or any Render env var | Push is not enough — trigger **Manual Deploy** in Render to force a rebuild with the new var |
| Railway env vars | Save in Variables tab — Railway redeploys automatically |
| New deck files (if served from server) | Push to `main` — Railway redeploys automatically |

---

## Environment variable quick-reference

### Railway (backend) — set in the Variables tab

| Variable | Example value | Notes |
|----------|--------------|-------|
| `NODE_ENV` | `production` | Required — affects logging and CORS behaviour |
| `PORT` | `3001` | Railway also injects this automatically |
| `CLIENT_ORIGIN` | `https://tunetrack-web.onrender.com` | CORS allowed origin — must match frontend URL exactly |
| `SPOTIFY_CLIENT_ID` | `abc123def456` | From Spotify developer dashboard |
| `SPOTIFY_CLIENT_SECRET` | `xyz789...` | From Spotify developer dashboard — keep private |
| `SPOTIFY_REDIRECT_URI` | `https://tunetrack-abc123.up.railway.app/api/spotify/callback` | Must be registered in Spotify dashboard |

### Render Static Site (frontend) — baked in at build time

| Variable | Example value | Notes |
|----------|--------------|-------|
| `VITE_SERVER_URL` | `https://tunetrack-abc123.up.railway.app` | Compiled into the JS bundle — changing it requires a new build |

---

## Cost estimate

Railway charges against your $5 monthly free credit based on resource usage:

| Resource | Rate | Estimated monthly cost (game nights only) |
|----------|------|------------------------------------------|
| Shared CPU (1×) | ~$0.000463/min | ~$0.03/hr active |
| 512 MB RAM | ~$0.000231/min | included in above |

An idle Node.js + Socket.IO server uses very little CPU and stays well under
512 MB RAM. Even with several hours of active play per week, you will be far
under the $5 threshold. Railway shows your current usage in **Account → Billing**.

---

## Appendix A — Creating a Spotify Developer app

If you do not yet have a Spotify app:

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
4. Fill in:
   - **App name:** TuneTrack (or anything)
   - **App description:** Party game
   - **Redirect URIs:** Add both of these, one at a time:
     - `http://127.0.0.1:3001/api/spotify/callback` ← for local development
     - `https://YOUR-RAILWAY-DOMAIN/api/spotify/callback` ← for production (use your actual Railway domain)
   - **APIs used:** check **Web Playback SDK** and **Web API**
5. Click **Save**
6. On the app page, click **Settings** to find your **Client ID** and **Client Secret**

Copy both values — you will need them as env vars on Railway.
