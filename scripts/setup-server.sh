#!/usr/bin/env bash
# =============================================================================
# Oliskey — One-time server provisioning script
# Run as root (or with sudo) on a fresh Ubuntu 22.04 / Debian 12 VPS.
#
# What it does:
#   1. Installs Node.js 20 LTS, npm, PM2, nginx
#   2. Creates the app user and deploy directory
#   3. Creates nginx config (reverse proxy → Express on :5000)
#   4. Obtains a Let's Encrypt TLS certificate (requires your domain to already
#      point at this server's IP)
#   5. Prints next steps
#
# Usage:
#   chmod +x scripts/setup-server.sh
#   sudo bash scripts/setup-server.sh
# =============================================================================

set -euo pipefail

DOMAIN="${DOMAIN:-app.yourdomain.com}"   # override: DOMAIN=school.example.com sudo bash ...
APP_DIR="/var/www/oliskey"
APP_USER="oliskey"
LOG_DIR="/var/log/oliskey"

echo "==> [1/6] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> [2/6] Installing PM2 and nginx..."
npm install -g pm2
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> [3/6] Creating app user and directories..."
id -u "$APP_USER" &>/dev/null || useradd --system --shell /bin/bash --create-home "$APP_USER"
mkdir -p "$APP_DIR" "$LOG_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$LOG_DIR"

echo "==> [4/6] Writing nginx config for $DOMAIN..."
cat > /etc/nginx/sites-available/oliskey <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect all HTTP to HTTPS (certbot will update this block)
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # TLS — managed by certbot
    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers (Express sets its own via helmet, but belt-and-suspenders)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Serve the Vite SPA static build
    root $APP_DIR/dist;
    index index.html;

    # API — proxy to Express backend
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        # Allow large file/photo uploads (matches BODY_LIMIT in app.ts)
        client_max_body_size 15m;
        proxy_read_timeout 60s;
    }

    # Socket.IO — proxy WebSocket upgrades
    location /socket.io/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_read_timeout 86400s;
    }

    # Uploaded media files (served directly by nginx, no Express hop)
    location /uploads/ {
        alias  $APP_DIR/uploads/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback: every non-file, non-API path serves index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/oliskey /etc/nginx/sites-enabled/oliskey
nginx -t && systemctl reload nginx

echo "==> [5/6] Obtaining TLS certificate for $DOMAIN..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || \
    echo "⚠️  certbot failed — run manually: sudo certbot --nginx -d $DOMAIN"

echo "==> [6/6] Configuring PM2 auto-start on boot..."
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash || true

echo ""
echo "============================================================"
echo "  Server provisioned. Next steps:"
echo ""
echo "  1. Upload your project to $APP_DIR (or clone the repo):"
echo "       git clone https://github.com/YOUR/REPO.git $APP_DIR"
echo ""
echo "  2. Copy .env.production to the server:"
echo "       scp .env.production user@$DOMAIN:$APP_DIR/.env.production"
echo ""
echo "  3. Run the deploy script to install deps, build, and start PM2:"
echo "       sudo -u $APP_USER bash $APP_DIR/scripts/deploy.sh"
echo ""
echo "  4. Apply pending database migrations (includes RLS policies):"
echo "       npx prisma migrate deploy --schema=backend/prisma/schema.prisma"
echo "============================================================"
