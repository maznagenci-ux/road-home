#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

# Ensure pool settings
python3 - <<'PY'
from pathlib import Path
import re
for p in [Path('.env'), Path('.next/standalone/.env')]:
    if not p.exists():
        continue
    t = p.read_text()
    t2 = re.sub(r'connection_limit=\d+', 'connection_limit=10', t)
    if 'pool_timeout=' not in t2:
        t2 = t2.replace('connection_limit=10', 'connection_limit=10&pool_timeout=20')
    p.write_text(t2)
PY

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

echo "==> dashboard timings"
for i in 1 2 3; do
  curl -s -o /tmp/dash.html -w "try$i:%{http_code} time:%{time_total}\n" -b "$COOKIE_JAR" --max-time 45 http://127.0.0.1:3000/ckb
done

pm2 logs road-home --err --lines 5 --nostream
echo DONE
