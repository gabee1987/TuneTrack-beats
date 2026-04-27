# Self-Hosting TuneTrack from Home

## Can you do it?

Yes. TuneTrack is a lightweight Node.js process — it uses no database, no file I/O,
and stores everything in RAM. The server is well within the capabilities of a Raspberry
Pi, an old laptop, or a spare desktop. The real challenge is not the hardware; it is
the **network** — getting a stable HTTPS URL that Spotify, browsers, and remote players
can all reach.

This guide covers three tiers in order of complexity:

| Tier | Best for | Internet access | Spotify OAuth | Effort |
|------|----------|-----------------|---------------|--------|
| [Tier 1 — Local network](#tier-1--local-network-only) | Everyone on the same Wi-Fi | No | No* | 10 min |
| [Tier 2 — Cloudflare Tunnel](#tier-2--cloudflare-tunnel-recommended) | Remote players, full Spotify | Yes | Yes | 30–45 min |
| [Tier 3 — Port forwarding + Caddy](#tier-3--port-forwarding--caddy-advanced) | Full control, custom domain | Yes | Yes | 1–2 hrs |

*Spotify playback requires HTTPS on a non-localhost origin. On a local network you can
still play the game; the host just controls music manually through their Spotify app.

---

## Minimum hardware

TuneTrack's server uses roughly **50–80 MB of RAM** at idle with a few connected
players. CPU usage is negligible between turns. Any of the following works:

| Hardware | Cost | Power | Notes |
|----------|------|-------|-------|
| **Raspberry Pi 4 (2 GB)** | ~$45 | ~5 W | Best dedicated option. Silent, always-on, cheap to run. |
| **Raspberry Pi 5 (4 GB)** | ~$60 | ~7 W | Overkill but great if you also want to run other services. |
| **Old laptop (any dual-core, 2 GB+ RAM)** | Free (if you have one) | 15–45 W | Works fine. Keep it plugged in. |
| **Old desktop PC** | Free (if you have one) | 40–100 W | Works. More power draw than necessary. |
| **Your main gaming PC** | Free | 80–200 W | Works for a session. Not ideal to leave running 24/7. |
| **NAS (Synology, QNAP)** | Varies | ~15 W | Works if it runs Docker or Node.js packages. |

**Verdict:** A Raspberry Pi 4 (2 GB) is the ideal dedicated server. It costs about
€0.30/month in electricity running 24/7 at 5 W. If you already have a spare PC or
laptop, use that instead of buying new hardware.

---

## Software prerequisites (all tiers)

Install these on whichever machine will run the server.

### Node.js 20 LTS

Download and install from [nodejs.org](https://nodejs.org). Choose the **LTS** version.

Verify:
```bash
node --version   # should print v20.x.x or higher
npm --version    # should print 10.x.x or higher
```

### PM2 (process manager)

PM2 keeps your server running after you close the terminal and restarts it if it crashes.

```bash
npm install -g pm2
```

Verify:
```bash
pm2 --version
```

### Git

Used to clone and update the code. Download from [git-scm.com](https://git-scm.com)
if not already installed.

---

## Getting the code onto the server machine

On the machine that will run the server:

```bash
# Clone your GitHub repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git tunetrack
cd tunetrack

# Install all workspace dependencies
npm install

# Build all packages (game-engine, shared, server, web)
npm run build
```

The build produces:
- `apps/server/dist/` — compiled Node.js server
- `apps/web/dist/` — compiled React frontend (static files)

---

## Tier 1 — Local network only

**Use this when:** everyone playing is physically in the same house on the same Wi-Fi.
No internet access or HTTPS is required. Setup takes about 10 minutes.

### How it works

```
Player's phone/laptop (192.168.1.x)
        │
        │  HTTP (local network)
        ▼
Your hosting PC (192.168.1.Y)
  ├── Node.js server  → port 3001
  └── Vite preview   → port 4173  (serves the built frontend)
```

### Step 1 — Find your PC's local IP address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your Wi-Fi or Ethernet adapter
# e.g. 192.168.1.42
```

**Linux / Raspberry Pi:**
```bash
ip addr show | grep "inet "
# Look for something like inet 192.168.1.42
```

**macOS:**
```bash
ipconfig getifaddr en0
```

Write this IP down. It will look like `192.168.1.42`. Your router may change it over
time — see the note at the end of this tier about setting a static local IP.

### Step 2 — Create a .env file

In the `apps/server` directory, create a file called `.env`:

```
NODE_ENV=development
PORT=3001
CLIENT_ORIGIN=http://192.168.1.42:4173
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/spotify/callback
```

Replace `192.168.1.42` with your actual local IP.

> **Spotify note:** `SPOTIFY_REDIRECT_URI` stays as `127.0.0.1` (localhost). Spotify
> OAuth only works when the browser completing the OAuth flow is on the same machine as
> the server. The host player should open the game on the hosting PC itself to use
> Spotify. Other players' devices are used for guessing only and do not need Spotify
> access.

### Step 3 — Start the server with PM2

```bash
# From the project root
pm2 start apps/server/dist/index.js --name tunetrack-server
```

Verify it is running:
```bash
pm2 logs tunetrack-server
# You should see: Server listening on port 3001
```

### Step 4 — Serve the frontend

The built frontend files in `apps/web/dist` need to be served to other devices.
The simplest way is Vite's built-in preview server:

```bash
# In a second terminal (or as another PM2 process)
pm2 start "npm -w @tunetrack/web run preview -- --host --port 4173" --name tunetrack-web
```

> **What `--host` does:** by default Vite's preview server only accepts connections
> from `localhost`. The `--host` flag makes it accept connections from any device on
> your local network.

### Step 5 — Open the firewall (Windows only)

If you are on Windows, the Windows Defender Firewall will block incoming connections
from other devices by default. Open two ports:

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "TuneTrack Server" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "TuneTrack Web" -Direction Inbound -Protocol TCP -LocalPort 4173 -Action Allow
```

On Linux (if `ufw` is enabled):
```bash
sudo ufw allow 3001
sudo ufw allow 4173
```

### Step 6 — Play

Players on the same Wi-Fi open their browser and go to:
```
http://192.168.1.42:4173
```

The host creates a room, shares the code, everyone joins.

### Optional — Set a static local IP

By default, your router may assign a different IP to your PC after a restart. To avoid
updating the `.env` file every time:

- Log into your router's admin panel (usually `192.168.1.1` or `192.168.0.1`)
- Find **DHCP reservations** or **Static DHCP** or **Address binding**
- Bind your PC's MAC address to the IP you chose
- The router will always assign that IP to your PC

---

## Tier 2 — Cloudflare Tunnel (recommended)

**Use this when:** you want to play with people over the internet, want full Spotify
OAuth support, but do not want to open ports on your router.

Cloudflare Tunnel creates an outbound encrypted connection from your machine to
Cloudflare's edge. Cloudflare terminates HTTPS publicly — your home router never
needs a port opened. This is the safest and most reliable home-hosting approach.

### How it works

```
Player anywhere on the internet
        │
        │  HTTPS (handled by Cloudflare)
        ▼
Cloudflare Edge (global CDN)
        │
        │  Encrypted tunnel (outbound from your PC)
        ▼
Your hosting PC
  ├── Node.js server  → port 3001  (backend)
  └── Static files   → via Render (free, or you can also tunnel the frontend)
```

You will get a free public URL like `tunetrack-server.cfargotunnel.com` (or a custom
domain if you have one).

### Prerequisites for Tier 2

In addition to the software in the prerequisites section, you need:

- A **free Cloudflare account** at [cloudflare.com](https://cloudflare.com)
- The `cloudflared` daemon installed on your hosting machine

**Install cloudflared:**

Windows (download the installer):
- Go to [developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)
- Download the Windows installer (`.msi`) and run it

Linux / Raspberry Pi:
```bash
# Debian/Ubuntu/Raspberry Pi OS
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
# Use cloudflared-linux-amd64.deb for a regular x86-64 PC
sudo dpkg -i cloudflared.deb
```

Verify:
```bash
cloudflared --version
```

### Step 1 — Log in to Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser and asks you to authorise `cloudflared` with your Cloudflare
account. After completing the login, a certificate is saved to
`~/.cloudflared/cert.pem`.

### Step 2 — Create a tunnel

```bash
cloudflared tunnel create tunetrack
```

This creates a tunnel and saves credentials to `~/.cloudflared/<UUID>.json`.
Note the tunnel UUID printed in the output — you will need it.

### Step 3 — Create the tunnel config file

Create the file `~/.cloudflared/config.yml` with this content:

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/YOUR-USERNAME/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: tunetrack-server.YOUR-DOMAIN.com
    service: http://localhost:3001
  - service: http_status:404
```

**If you do not have a custom domain**, Cloudflare can give you a free
`cfargotunnel.com` subdomain. In that case, skip the hostname line and use the
quick-tunnel approach instead (described below).

**Quick tunnel (no domain required, for testing):**
```bash
cloudflared tunnel --url http://localhost:3001
```

This prints a temporary HTTPS URL like `https://random-words.trycloudflare.com`. It
works but the URL changes every time you restart. Fine for occasional game nights;
less convenient than a permanent URL.

### Step 4 — Route the tunnel to a hostname (custom domain only)

If you have a domain managed by Cloudflare:

```bash
cloudflared tunnel route dns tunetrack tunetrack-server.YOUR-DOMAIN.com
```

This creates a CNAME DNS record pointing your subdomain at the tunnel.

### Step 5 — Create the server .env file

In `apps/server`, create `.env`:

```
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://tunetrack-web.onrender.com
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://tunetrack-server.YOUR-DOMAIN.com/api/spotify/callback
```

Replace the URLs with your actual Cloudflare tunnel hostname.

> If you are using the quick tunnel (no domain), leave `SPOTIFY_REDIRECT_URI` as
> `http://127.0.0.1:3001/api/spotify/callback` and use Spotify only from the host
> machine's browser, just like Tier 1.

### Step 6 — Deploy the frontend on Render (free static site)

The frontend is a compiled set of static files. Keep it on Render's free static hosting
to avoid complexity. Follow [deploy-render.md](deploy-render.md) Part 2 (Static Site
only) and set:

```
VITE_SERVER_URL = https://tunetrack-server.YOUR-DOMAIN.com
```

### Step 7 — Start everything with PM2

```bash
# Start the Node.js server
pm2 start apps/server/dist/index.js --name tunetrack-server

# Start the Cloudflare tunnel
pm2 start "cloudflared tunnel run tunetrack" --name tunetrack-tunnel
```

Check logs:
```bash
pm2 logs tunetrack-server   # should show: Server listening on port 3001
pm2 logs tunetrack-tunnel   # should show: Registered tunnel connection
```

### Step 8 — Update Spotify developer dashboard

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Open your app → **Edit Settings**
3. Add: `https://tunetrack-server.YOUR-DOMAIN.com/api/spotify/callback`
4. Save

### Step 9 — Save PM2 startup configuration

This makes your server and tunnel restart automatically when the PC reboots:

```bash
pm2 save
pm2 startup
# Follow the instruction it prints — usually one command to run as Administrator/sudo
```

### Step 10 — Verify

1. Open `https://tunetrack-web.onrender.com` on any device, anywhere
2. DevTools → Network → WS — confirm WebSocket connects to your Cloudflare tunnel URL
3. Create a room, join from a phone on mobile data (not your home Wi-Fi) to confirm internet access works
4. Test Spotify OAuth from the host machine

---

## Tier 3 — Port forwarding + Caddy (advanced)

**Use this when:** you want full control, want everything self-hosted with no third-party
tunnel, and are comfortable with router configuration and DNS.

### How it works

```
Player anywhere on the internet
        │
        │  HTTPS (your domain)
        ▼
Your home router (public IP / DuckDNS domain)
        │  Port 80 and 443 forwarded to your PC
        ▼
Caddy (reverse proxy on your PC)
  Handles SSL/TLS automatically via Let's Encrypt
        │
        ├── tunetrack.yourdomain.com    → Node.js server :3001
        └── tunetrack.yourdomain.com/  → static files (apps/web/dist)
```

With Caddy you can serve both the frontend and backend from the same domain, so you
only need one process and one URL. This is the most self-contained setup.

### Additional prerequisites for Tier 3

- A **domain name** (or a free DuckDNS subdomain — see below)
- Router admin access to configure port forwarding
- Caddy web server

**Get a free DuckDNS domain (if you don't have one):**

1. Go to [duckdns.org](https://duckdns.org) and sign in with Google/GitHub
2. Choose a subdomain name, e.g. `tunetrack` → `tunetrack.duckdns.org`
3. Note your **token** on the dashboard — you will need it for auto-update
4. Install the DuckDNS update script so it updates when your home IP changes:

   ```bash
   # Create an update script that runs every 5 minutes
   mkdir -p ~/duckdns
   cat > ~/duckdns/duck.sh << 'EOF'
   echo url="https://www.duckdns.org/update?domains=YOUR-SUBDOMAIN&token=YOUR-TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
   EOF
   chmod 700 ~/duckdns/duck.sh

   # Add to crontab (runs every 5 minutes)
   (crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
   ```

   On Windows, use the [DuckDNS Windows client](https://www.duckdns.org/install.jsp)
   to keep your IP updated automatically.

**Install Caddy:**

Windows: Download the binary from [caddyserver.com/download](https://caddyserver.com/download)
and place it somewhere on your `PATH`.

Linux / Raspberry Pi:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### Step 1 — Configure port forwarding on your router

1. Log into your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
2. Find **Port Forwarding** / **Virtual Server** / **NAT** (naming varies by router brand)
3. Add two rules:

| External port | Internal IP | Internal port | Protocol |
|---------------|-------------|---------------|----------|
| 80 | 192.168.1.YOUR-PC | 80 | TCP |
| 443 | 192.168.1.YOUR-PC | 443 | TCP |

This forwards HTTPS traffic from the internet to your PC. Caddy handles it from there.

> **Important:** Some ISPs block port 80/443 on residential connections. If forwarding
> does not work, check if your ISP offers a static IP or business plan. Alternatively,
> use Tier 2 (Cloudflare Tunnel) instead, which bypasses this restriction entirely.

### Step 2 — Open the firewall (Windows only)

```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Caddy HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "Caddy HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

### Step 3 — Create a Caddyfile

Create `Caddyfile` in your project root (or anywhere convenient):

```caddyfile
tunetrack.duckdns.org {
    # Serve the built React SPA
    root * /absolute/path/to/tunetrack/apps/web/dist
    file_server
    # SPA fallback — send all unmatched paths to index.html
    try_files {path} /index.html

    # Proxy API and Socket.IO to the Node.js server
    handle /api/* {
        reverse_proxy localhost:3001
    }
    handle /socket.io/* {
        reverse_proxy localhost:3001
    }
}
```

Replace `/absolute/path/to/tunetrack` with the actual path where you cloned the repo.

Caddy automatically obtains and renews a Let's Encrypt TLS certificate for your domain.
It needs port 80 to be reachable for the ACME challenge.

> **Why serve both from the same domain?** When the frontend and Socket.IO backend
> share the same origin, the `VITE_SERVER_URL` env var does not need to be set — the
> `resolveServerUrl` function falls back to `/` (the current origin) when running over
> HTTPS. No build-time variable needed at all.

### Step 4 — Create the server .env file

In `apps/server`, create `.env`:

```
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://tunetrack.duckdns.org
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_REDIRECT_URI=https://tunetrack.duckdns.org/api/spotify/callback
```

### Step 5 — Start everything with PM2

```bash
# Start the Node.js server
pm2 start apps/server/dist/index.js --name tunetrack-server

# Start Caddy
pm2 start "caddy run --config /path/to/Caddyfile" --name tunetrack-caddy

# Save and enable startup
pm2 save
pm2 startup
```

### Step 6 — Update Spotify developer dashboard

Add `https://tunetrack.duckdns.org/api/spotify/callback` to your Spotify app's
Redirect URIs (same process as described in Tier 2 Step 8).

### Step 7 — Verify

Open `https://tunetrack.duckdns.org` — you should see the app served over HTTPS with a
valid Let's Encrypt certificate (the padlock icon in the browser).

---

## Keeping the code up to date

When you push changes to GitHub, they do not automatically deploy to your home machine.
You need to pull and rebuild manually:

```bash
cd /path/to/tunetrack

# Pull latest changes
git pull

# Rebuild
npm install
npm run build

# Restart the server (zero-downtime with PM2)
pm2 restart tunetrack-server
```

You can optionally automate this with a simple script or a cron job that checks for
new commits. For a family game setup, manually pulling before a game night is perfectly
fine.

---

## Updating the .env after changes

If you change any environment variables in `.env`, restart the server for them to
take effect:

```bash
pm2 restart tunetrack-server
```

---

## Useful PM2 commands

| Command | What it does |
|---------|--------------|
| `pm2 list` | Show all running processes and their status |
| `pm2 logs tunetrack-server` | Stream live logs |
| `pm2 logs tunetrack-server --lines 100` | Show last 100 log lines |
| `pm2 restart tunetrack-server` | Restart after a code change |
| `pm2 stop tunetrack-server` | Stop the process |
| `pm2 delete tunetrack-server` | Remove from PM2 |
| `pm2 monit` | Live CPU and memory usage dashboard |

---

## Comparison summary

| | Tier 1 (Local) | Tier 2 (Cloudflare) | Tier 3 (Port forward) |
|---|---|---|---|
| **Internet access** | No | Yes | Yes |
| **Spotify OAuth** | Host machine only | Full | Full |
| **Router config needed** | No | No | Yes |
| **HTTPS** | No | Yes (Cloudflare) | Yes (Let's Encrypt) |
| **Third-party dependency** | None | Cloudflare tunnel | None |
| **Setup time** | 10 min | 30–45 min | 1–2 hrs |
| **Reliability** | PC must be on | PC + cloudflared must be on | PC + Caddy must be on |
| **Custom domain** | No | Optional | Required (or DuckDNS) |
| **Frontend hosting** | Local Vite preview | Render (free) | Self-hosted via Caddy |
| **Best for** | Same room | Remote + easy setup | Full self-hosting |

---

## Raspberry Pi specific notes

If you use a Raspberry Pi as your dedicated server:

**Operating system:** Use **Raspberry Pi OS Lite** (no desktop) — it uses ~180 MB RAM
at idle, leaving the rest for TuneTrack.

**Install Node.js 20 on Raspberry Pi:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Keep it powered correctly:** The Pi 4 can undervolt on cheap USB-C cables under load.
Use the official Raspberry Pi power supply (5V 3A).

**Static local IP:** Assign a static local IP via your router's DHCP reservation table
using the Pi's MAC address (found with `ip link show eth0`).

**Enable SSH for headless management:** Once set up, you can manage the Pi over SSH
from any device on your network — no keyboard or monitor needed.

```bash
# On the Pi
sudo systemctl enable ssh
sudo systemctl start ssh

# From your PC
ssh pi@192.168.1.YOUR-PI-IP
```

**Shut down safely:** Never just unplug a Raspberry Pi. Use:
```bash
sudo shutdown now
```
