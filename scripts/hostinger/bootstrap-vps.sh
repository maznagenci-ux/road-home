#!/usr/bin/env bash
# One-shot bootstrap for Road Home on Hostinger VPS (IP or domain).
# Usage (as root):
#   bash bootstrap-vps.sh
# Or with domain:
#   DOMAIN=app.example.com bash bootstrap-vps.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/road-home}"
REPO_URL="${REPO_URL:-https://github.com/maznagenci-ux/road-home.git}"
DOMAIN="${DOMAIN:-72.60.80.208}"
APP_USER="${SUDO_USER:-${APP_USER:-root}}"

export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -y
apt-get install -y curl git nginx ca-certificates gnupg

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v 2>/dev/null | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  echo "==> Node.js 20"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> PM2"
npm i -g pm2

echo "==> App directory"
mkdir -p "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  echo "==> Repo exists — pull"
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" reset --hard origin/main
else
  echo "==> Clone"
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo ""
  echo "ERROR: Missing $APP_DIR/.env"
  echo "Create it first (copy from scripts/hostinger/env.production.example), then re-run."
  exit 1
fi

echo "==> Deploy build"
cd "$APP_DIR"
bash scripts/hostinger/deploy.sh

echo "==> Nginx"
cp "$APP_DIR/scripts/hostinger/nginx-road-home.conf" /etc/nginx/sites-available/road-home
# Keep IP; if DOMAIN is a hostname, add it to server_name
if [[ ! "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  sed -i "s/server_name 72.60.80.208 _;/server_name $DOMAIN www.$DOMAIN 72.60.80.208 _;/" /etc/nginx/sites-available/road-home
fi
ln -sfn /etc/nginx/sites-available/road-home /etc/nginx/sites-enabled/road-home
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
pm2 save

echo ""
echo "==> DONE"
echo "Open: http://$DOMAIN"
pm2 status road-home
