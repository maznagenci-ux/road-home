#!/usr/bin/env bash
# Deploy / update Road Home on Hostinger VPS
#   cd /var/www/road-home && bash scripts/hostinger/deploy.sh

set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/road-home}"
cd "$APP_DIR"

echo "==> Pull"
git fetch origin
git reset --hard origin/main

echo "==> Install"
npm ci || npm install

echo "==> Prisma"
npx prisma generate

echo "==> Build (standalone)"
npm run build

echo "==> Copy static assets into standalone"
mkdir -p .next/standalone/.next
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

echo "==> Restart PM2"
if pm2 describe road-home >/dev/null 2>&1; then
  pm2 restart road-home --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> OK"
pm2 status road-home
