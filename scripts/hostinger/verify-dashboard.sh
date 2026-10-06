#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

echo "==> baked connection_limit in standalone"
grep -Rao 'connection_limit=[0-9]*' .next/standalone --include='*.js' --include='*.json' --include='*.env*' 2>/dev/null | sort | uniq -c | sort -rn | head -20 || true

echo "==> login + cookie + dashboard"
COOKIE_JAR=/tmp/rh-cookies.txt
rm -f "$COOKIE_JAR"
LOGIN=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" --max-time 25 \
  -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}')
echo "login: $LOGIN"

# Parallel dashboard hits (this previously exhausted pool=1)
codes=""
for i in 1 2 3 4 5 6; do
  code=$(curl -s -o /tmp/dash-$i.html -w "%{http_code}" -b "$COOKIE_JAR" --max-time 40 http://127.0.0.1:3000/ckb)
  codes="$codes $code"
done
echo "dashboard codes:$codes"
head -c 200 /tmp/dash-1.html; echo

sleep 1
echo "==> fresh errors after test"
pm2 flush road-home >/dev/null 2>&1 || true
# one more dashboard hit after flush to see new errors only
curl -s -o /dev/null -b "$COOKIE_JAR" --max-time 40 http://127.0.0.1:3000/ckb
curl -s -o /dev/null -b "$COOKIE_JAR" --max-time 40 http://127.0.0.1:3000/ckb/accounting
curl -s -o /dev/null -b "$COOKIE_JAR" --max-time 40 "http://127.0.0.1:3000/api/accounting/summary"
pm2 logs road-home --err --lines 15 --nostream
