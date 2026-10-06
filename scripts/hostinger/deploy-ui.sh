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
curl -sI --max-time 15 http://127.0.0.1:3000/ckb/auth/login | head -8
curl -s -o /dev/null -w "login:%{http_code} time:%{time_total}\n" --max-time 30 http://127.0.0.1:3000/ckb/auth/login
echo DONE
