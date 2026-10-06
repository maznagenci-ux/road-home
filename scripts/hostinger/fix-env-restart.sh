#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

sed -i 's/connection_limit=1/connection_limit=10/g' .env
cp -f .env .next/standalone/.env
echo "root .env limit: $(grep -o 'connection_limit=[0-9]*' .env | head -1)"

pm2 delete road-home || true
pm2 start ecosystem.config.cjs
pm2 save
sleep 3
pm2 status

node <<'NODE'
const e = require('./ecosystem.config.cjs');
const u = e.apps[0].env.DATABASE_URL || '';
const m = u.match(/connection_limit=(\d+)/);
console.log('ecosystem limit:', m ? m[1] : 'missing');
NODE

curl -sI --max-time 10 http://127.0.0.1:3000/ckb/auth/login | head -5
echo
curl -s --max-time 25 -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}'
echo

# Stress dashboard queries a bit
for i in 1 2 3 4 5 6 7 8; do
  curl -s -o /dev/null -w "%{http_code} " --max-time 20 http://127.0.0.1:3000/ckb/auth/login
done
echo

sleep 1
pm2 logs road-home --err --lines 8 --nostream
