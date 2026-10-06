#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
npm run build
rm -rf .next/standalone/public .next/standalone/.next/static
mkdir -p .next/standalone/.next
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
cp -f .env .next/standalone/.env
pm2 delete road-home || true
pm2 start ecosystem.config.cjs
pm2 save
sleep 2
COOKIE_JAR=/tmp/rh-cookies.txt
rm -f "$COOKIE_JAR"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" --max-time 20 \
  -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}' >/dev/null
for i in 1 2 3; do
  curl -s -o /tmp/dash.html -w "try$i:%{http_code} time:%{time_total}\n" -b "$COOKIE_JAR" --max-time 30 http://127.0.0.1:3000/ckb
done
echo DONE
