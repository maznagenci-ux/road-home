#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

# Fix bad sed that turned limit=10 into 100
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
    print(p, '=>', re.search(r'connection_limit=\d+', t2).group(0))
PY

pm2 delete road-home || true
pm2 start ecosystem.config.cjs
pm2 save
sleep 2

# What DATABASE_URL does the running process actually have?
PID=$(pm2 pid road-home)
echo "pid=$PID"
tr '\0' '\n' < /proc/$PID/environ | grep '^DATABASE_URL=' | sed -E 's#(://[^:]+:)[^@]+@#\1***@#; s/connection_limit=[0-9]+/connection_limit=SEEN/'

# Timed prisma query via node using same env as ecosystem
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const e = require('./ecosystem.config.cjs');
process.env.DATABASE_URL = e.apps[0].env.DATABASE_URL;
const p = new PrismaClient();
(async () => {
  console.time('user');
  const u = await p.user.findUnique({ where: { phone: '07507535675' } });
  console.timeEnd('user');
  console.log('user', u && u.phone);
  console.time('cash');
  const c = await p.cashAccount.findMany({ take: 5 });
  console.timeEnd('cash');
  console.log('cash', c.length);
  console.time('parallel');
  await Promise.all([
    p.cashAccount.findMany(),
    p.bankAccount.findMany(),
    p.voucher.findMany({ take: 20 }),
    p.contract.findMany({ take: 20 }),
    p.installment.findMany({ take: 20 }),
    p.transactionLine.findMany({ take: 20 }),
    p.ledgerAccount.findMany({ take: 20 }),
  ]);
  console.timeEnd('parallel');
  await p.$disconnect();
})().catch(async (err) => {
  console.error('PRISMA_FAIL', err.message);
  try { await p.$disconnect(); } catch {}
  process.exit(1);
});
NODE

COOKIE_JAR=/tmp/rh-cookies.txt
rm -f "$COOKIE_JAR"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" --max-time 20 \
  -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}' > /tmp/login.json
cat /tmp/login.json; echo

echo "==> timed dashboard"
curl -s -o /tmp/dash.html -w "dash:%{http_code} time:%{time_total}\n" -b "$COOKIE_JAR" --max-time 60 http://127.0.0.1:3000/ckb || echo "dash_curl_fail:$?"
wc -c /tmp/dash.html 2>/dev/null || true
grep -o 'Timed out\|Server error\|P2024\|error' /tmp/dash.html 2>/dev/null | sort | uniq -c | head || true

pm2 logs road-home --err --lines 20 --nostream
