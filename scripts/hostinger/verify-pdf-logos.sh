#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

COOKIE=/tmp/rh-cookies.txt
rm -f "$COOKIE"
LOGIN=$(curl -s -c "$COOKIE" -b "$COOKIE" --max-time 20 -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}')
echo "login: $LOGIN"
echo "cookies:"; cat "$COOKIE" | head -5

# Get password from .env without node quote hell
DBURL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | sed 's/^"//;s/"$//')
RID=$(psql "$DBURL" -tAc 'SELECT id FROM "Receipt" ORDER BY "issuedAt" DESC LIMIT 1;')
echo "RID=$RID"

CODE=$(curl -s -b "$COOKIE" -o /tmp/receipt.html -w '%{http_code}' --max-time 25 \
  "http://127.0.0.1:3000/api/pdf/receipt/${RID}?locale=ckb")
echo "http=$CODE size=$(wc -c </tmp/receipt.html)"
echo "---- body head ----"
head -c 800 /tmp/receipt.html; echo
echo "---- checks ----"
grep -c 'data:image/png' /tmp/receipt.html || true
grep -oE 'class="(n-brand|doc-title|val|amount-val|copy-pill)"[^<]*' /tmp/receipt.html | head -20 || true
grep -c 'Road Home' /tmp/receipt.html || true

# Also try voucher and contract
VID=$(psql "$DBURL" -tAc 'SELECT id FROM "Voucher" ORDER BY "issuedAt" DESC LIMIT 1;' 2>/dev/null || true)
echo "VID=$VID"
if [[ -n "${VID:-}" ]]; then
  CODE2=$(curl -s -b "$COOKIE" -o /tmp/voucher.html -w '%{http_code}' --max-time 25 \
    "http://127.0.0.1:3000/api/pdf/voucher/${VID}?locale=ckb")
  echo "voucher http=$CODE2 size=$(wc -c </tmp/voucher.html)"
  head -c 500 /tmp/voucher.html; echo
fi

# Test embed from node in app cwd
node <<'NODE'
const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'public', 'brand', 'logo.png');
const p2 = path.join(process.cwd(), '.next', 'standalone', 'public', 'brand', 'logo.png');
console.log('cwd', process.cwd());
console.log('public logo', fs.existsSync(p), p);
console.log('standalone logo', fs.existsSync(p2), p2);
NODE
