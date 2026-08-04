# Self-Hosting Jitsi Meet for In-App Video Calls

Why: the app's video calls (Virtual Classroom, teacher-parent conferences)
used the free public `meet.jit.si` server. Since 2023, Jitsi deliberately
disconnects any embedded call on that server after 5 minutes ("for
demonstration purposes only") — an anti-embedding policy on Jitsi's end, not
a bug in this app. Self-hosting removes that restriction: you control the
server, so embedding works normally and calls stay open for the full class.

This app already supports both modes automatically — see `lib/jitsiConfig.ts`.
Set `VITE_JITSI_DOMAIN` to your server's domain and the app switches from
"open in a new tab" to a real embedded video call. Leave it unset and nothing
changes (existing new-tab behavior).

## 1. Pick a subdomain

Use a subdomain of your existing app domain, e.g. `meet.yourschooldomain.com`.
Point its DNS **A record** at your Contabo VPS's IP address (same server the
app already runs on is fine — Jitsi's web/signaling traffic goes through
nginx like the rest of the app; only the media relay (JVB) needs its own
port, see step 4).

## 2. Download and configure Jitsi Meet

Run these on the VPS, in a new directory (e.g. `/opt/jitsi`):

```bash
# Download the latest official release (do NOT hand-write docker-compose.yml —
# use Jitsi's own release archive so it matches their current image versions)
wget $(wget -q -O - https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest | grep zip | cut -d\" -f4) -O jitsi-meet.zip
unzip jitsi-meet.zip && cd docker-jitsi-meet-*

cp env.example .env
./gen-passwords.sh   # fills in JICOFO_AUTH_PASSWORD, JVB_AUTH_PASSWORD, etc.

mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
```

Edit `.env` and set:

```ini
PUBLIC_URL=https://meet.yourschooldomain.com
JVB_ADVERTISE_IPS=<your VPS public IP>

# nginx (already running for the main app) will handle TLS + proxy this
# subdomain, so let Jitsi's own web container listen on plain internal ports:
HTTP_PORT=8000
HTTPS_PORT=8443
ENABLE_LETSENCRYPT=0
```

## 3. Start it

```bash
docker compose up -d
```

Confirm it's healthy: `docker compose ps` — all containers should be `Up`.

## 4. Open the required firewall port

Jitsi's media relay (JVB) needs a **UDP** port open directly — this traffic
bypasses nginx entirely, it's the actual audio/video stream:

```bash
sudo ufw allow 10000/udp   # or your cloud firewall's equivalent rule
```

(`80/tcp` and `443/tcp` should already be open for the main app's nginx.)

## 5. Point nginx at it

Add the vhost in `deploy/jitsi/nginx-jitsi.conf` (in this same folder) to your
server's nginx sites — it reverse-proxies `meet.yourschooldomain.com` to the
Jitsi web container on `127.0.0.1:8000`, including the WebSocket paths Jitsi
needs for signaling. Update the `server_name` and SSL certificate paths to
match your domain, then:

```bash
sudo ln -s /path/to/nginx-jitsi.conf /etc/nginx/sites-enabled/meet.conf
sudo certbot --nginx -d meet.yourschooldomain.com   # issues the SSL cert
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Allow your Jitsi domain in the app's CSP

The embedded call is itself an iframe, and Jitsi's IFrame API loads a script
from your domain — both are blocked by the app's own security policy by
default (same reason Learning Hub resources needed CSP updates). Add your
Jitsi domain to **both** `frame-src` and `script-src` in:

- `deploy/nginx.conf` (governs the live site — look for the `TODO if you
  self-host Jitsi` comment)
- `backend/src/app.ts` (same, for the API's own CSP — same TODO comment)

## 7. Point the app at your server

In the root `.env` (frontend build config):

```ini
VITE_JITSI_DOMAIN=meet.yourschooldomain.com
```

Rebuild/redeploy the frontend, and reload nginx after the CSP change in step 6.
Video calls will now embed directly in the app instead of opening a new tab.

## Recommended VPS specs

Jitsi's own guidance: at least 2 CPU cores / 4GB RAM for light use (a handful
of concurrent classes with a few participants each). If your Contabo VPS is
already tight on resources running the main app + Postgres + Redis, consider
running Jitsi on a **separate** small VPS instead — same steps above, just a
different server, with `PUBLIC_URL`/`JVB_ADVERTISE_IPS` pointing at that
server's own IP.
