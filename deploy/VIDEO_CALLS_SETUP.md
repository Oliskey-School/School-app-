# Live Video Calls — Setup

The app supports three video modes. It picks one automatically:

| Mode | Runs inside the app? | What it needs |
|---|---|---|
| **Daily.co** (easiest) | ✅ Yes | A free Daily account + API key |
| **Self-hosted Jitsi** | ✅ Yes | Your own server (free, more work) |
| Public Jitsi *(current default)* | ❌ Opens a new tab | Nothing — but **no longer works properly** |

## Why the default no longer works

The app originally used the free public `meet.jit.si`. Jitsi has since locked
that server down in two ways that break this use case:

1. **Embedding is cut off after 5 minutes** — Jitsi disconnects any call
   embedded in another site ("for demonstration purposes only").
2. **Meetings need a logged-in moderator** — the room shows *"The conference has
   not yet started because no moderators have yet arrived"* and never begins,
   because no one in the class has a Jitsi account.

Neither can be fixed from this codebase — they're enforced by Jitsi's server.
So pick **Option A** or **Option B** below.

---

# Option A — Daily.co (recommended, ~10 minutes)

No server to manage. Embeds cleanly. Free tier covers small schools.

### 1. Create an account and get the API key

1. Sign up at <https://dashboard.daily.co/signup>
2. Go to **Developers** in the dashboard sidebar
3. Copy your **API key**

### 2. Add the key to the backend

In `backend/.env`:

```ini
DAILY_API_KEY=your_api_key_here
```

⚠️ This goes in the **backend** `.env`, never the frontend one. Daily's docs are
explicit that the key must stay server-side. The app is built around that: the
browser calls `POST /api/video/room` and only ever receives a join URL — the key
never reaches the client bundle.

### 3. Turn on the Daily provider

In the **root** `.env` (the frontend one):

```ini
VITE_VIDEO_PROVIDER=daily
```

### 4. Restart

```bash
npm run start:all
```

That's it. Live classes now open inside the app.

### Checking it worked

`GET /api/video/status` returns `{"configured": true}` when the backend sees the
key. If it returns `false`, the key isn't being read — confirm it's in
`backend/.env` and the backend was restarted.

### Rotating the API key

Rotate immediately if a key is ever exposed (pasted into chat, committed, shared
in a screenshot):

1. **Developers → API keys** in the Daily dashboard → create a new key
2. Replace the value of `DAILY_API_KEY` in `backend/.env`
3. Restart the backend
4. Delete the old key from the dashboard

Nothing else changes — the key is read in exactly one place
(`backend/src/config/env.ts`).

### Free tier

Daily's free tier includes a monthly allowance of participant-minutes; past that
it's pay-as-you-go. Check <https://www.daily.co/pricing> for current limits — a
school running several classes a day should confirm the allowance fits before
relying on it.

---

# Option B — Self-hosted Jitsi (free, needs a server)

No per-minute costs and full control, but you run the infrastructure.
Full walkthrough: **`deploy/jitsi/README.md`**.

Summary of what's involved:

1. Point a subdomain (e.g. `meet.yourschool.com`) at your VPS
2. Download Jitsi's official docker-compose release and configure `.env`
3. `docker compose up -d`
4. Open UDP port `10000` on the firewall
5. Add the nginx vhost (`deploy/jitsi/nginx-jitsi.conf`) + SSL via certbot
6. Add your Jitsi domain to `frame-src` **and** `script-src` in
   `deploy/nginx.conf` and `backend/src/app.ts` (look for the `TODO if you
   self-host Jitsi` comments — miss this and the app's own CSP silently blocks
   the call)
7. Set `VITE_JITSI_DOMAIN=meet.yourschool.com` in the root `.env` and rebuild

Recommended: 2+ CPU cores and 4GB+ RAM. If your VPS is already busy running the
app, Postgres and Redis, put Jitsi on a separate small VPS.

---

## How the app chooses (`lib/videoConfig.ts`)

```
VITE_VIDEO_PROVIDER=daily        → Daily        (embedded)
VITE_JITSI_DOMAIN=<your domain>  → Self-hosted  (embedded)
neither set                      → Public Jitsi (new tab, degraded)
```

Daily wins if both are set. Nothing else in the app needs changing — every
screen that starts or joins a class (`VirtualClassroom`, `VirtualClassScreen`,
`ConferenceScheduling`) routes through the same `LiveClassRoom` component and
follows whichever provider is active.
