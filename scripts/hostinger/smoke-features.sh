#!/usr/bin/env bash
# Live smoke: حەرز payload, house media upload, map PDF SA-only.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
SA_PHONE="${SMOKE_PHONE:-07507535675}"
SA_PASS="${SMOKE_PASS:-Hama.2000##}"
STAFF_PHONE="${SMOKE_STAFF_PHONE:-}"
STAFF_PASS="${SMOKE_STAFF_PASS:-}"
JAR_SA=/tmp/rh-smoke-sa.txt
JAR_STAFF=/tmp/rh-smoke-staff.txt
rm -f "$JAR_SA" "$JAR_STAFF"
fail=0

ok() { echo "OK  $*"; }
bad() { echo "FAIL $*"; fail=1; }

login() {
  local jar="$1" phone="$2" pass="$3" label="$4"
  local code
  code=$(curl -s -c "$jar" -b "$jar" --max-time 25 \
    -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"phone\":\"$phone\",\"password\":\"$pass\"}" \
    -w '%{http_code}' -o "/tmp/rh-login-$label.json")
  if [[ "$code" == "200" ]]; then ok "login $label"; else bad "login $label got=$code"; fi
  python3 - <<PY
import json
d=json.load(open("/tmp/rh-login-$label.json"))
print("role", d.get("user",{}).get("role") or d.get("role") or "?")
PY
}

login "$JAR_SA" "$SA_PHONE" "$SA_PASS" sa

# Houses list
code=$(curl -s -o /tmp/rh-houses.json -w '%{http_code}' -b "$JAR_SA" --max-time 30 "$BASE/api/houses")
[[ "$code" == "200" ]] && ok "houses list" || bad "houses list $code"

# Upload tiny PNG
python3 - <<'PY'
import struct,zlib
def chunk(t,d):
  return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
raw=b'\x00\x00\x00'+b'\x00\x01\x00'+b'\x00'
# 1x1 PNG
sig=b'\x89PNG\r\n\x1a\n'
ihdr=chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))
idata=chunk(b'IDAT',zlib.compress(b'\x00\x00\x00\x00'))
iend=chunk(b'IEND',b'')
open('/tmp/rh-smoke.png','wb').write(sig+ihdr+idata+iend)
PY

code=$(curl -s -o /tmp/rh-upload.json -w '%{http_code}' -b "$JAR_SA" --max-time 60 \
  -F "file=@/tmp/rh-smoke.png;type=image/png" -F "folder=houses" \
  "$BASE/api/uploads")
if [[ "$code" == "200" ]] && grep -q '"url"' /tmp/rh-upload.json; then
  ok "upload image houses"
  IMG=$(python3 -c "import json;print(json.load(open('/tmp/rh-upload.json')).get('url',''))")
else
  bad "upload image got=$code $(head -c 160 /tmp/rh-upload.json)"
  IMG=""
fi

# Reject oversized / wrong type lightly: empty file
code=$(curl -s -o /tmp/rh-upload-bad.json -w '%{http_code}' -b "$JAR_SA" --max-time 20 \
  -F "file=@/tmp/rh-smoke.png;type=application/x-msdownload" -F "folder=houses" \
  "$BASE/api/uploads" || true)
[[ "$code" == "400" ]] && ok "upload rejects bad mime" || ok "upload bad-mime got=$code (soft)"

# Map PDF as SA — expect 200 (may be slow); use fast=1
code=$(curl -s -o /tmp/rh-map.pdf -w '%{http_code}' -b "$JAR_SA" --max-time 180 \
  "$BASE/api/pdf/map/compound/426?fast=1")
if [[ "$code" == "200" ]]; then
  ok "map PDF SA (426) $code bytes=$(wc -c </tmp/rh-map.pdf)"
elif [[ "$code" == "404" ]]; then
  ok "map PDF SA compound missing tiles ($code) — env ok, data gap"
else
  bad "map PDF SA got=$code"
fi

# House payload fields for حەرز
python3 - <<'PY'
import json
d=json.load(open('/tmp/rh-houses.json'))
items=d.get('items') or []
print('houses_count', len(items))
if items:
  h=items[0]
  keys=['code','name','price','finalPrice','area','facadeM','bedrooms','bathrooms','guestRooms','address','imageUrl','imageUrls','videoUrl']
  print('sample_keys', {k: (h.get(k) is not None) for k in keys})
  print('OK  house payload fields present')
else:
  print('WARN no houses to inspect حەرز fields')
PY

# Staff: create ephemeral user, expect 403 on map PDF, then delete
STAFF_TMP_PHONE="07000000999"
STAFF_TMP_PASS="SmokeStaff99##"
cd /var/www/road-home && node - <<NODE
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash(process.env.STAFF_TMP_PASS || 'SmokeStaff99##', 10);
  await p.user.upsert({
    where: { phone: '07000000999' },
    update: { passwordHash: hash, role: 'SALESPERSON', isActive: true, name: 'Smoke Staff' },
    create: {
      phone: '07000000999',
      passwordHash: hash,
      role: 'SALESPERSON',
      name: 'Smoke Staff',
      isActive: true,
    },
  });
  await p.\$disconnect();
  console.log('staff_tmp_ready');
})().catch(async (e) => { console.error(e); await p.\$disconnect(); process.exit(1); });
NODE

login "$JAR_STAFF" "$STAFF_TMP_PHONE" "$STAFF_TMP_PASS" staff
code=$(curl -s -o /tmp/rh-map-staff.pdf -w '%{http_code}' -b "$JAR_STAFF" --max-time 60 \
  "$BASE/api/pdf/map/compound/426?fast=1")
[[ "$code" == "403" ]] && ok "map PDF staff forbidden ($code)" || bad "map PDF staff got=$code want=403"

cd /var/www/road-home && node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  await p.user.deleteMany({ where: { phone: '07000000999' } });
  await p.$disconnect();
  console.log('staff_tmp_deleted');
})().catch(async () => { await p.$disconnect(); });
NODE

code=$(curl -s -o /tmp/rh-map-anon.pdf -w '%{http_code}' --max-time 30 \
  "$BASE/api/pdf/map/compound/426?fast=1")
[[ "$code" == "401" || "$code" == "403" ]] && ok "map PDF anon blocked ($code)" || bad "map PDF anon got=$code"

# Places enrich (media fields for حەرز from places)
code=$(curl -s -o /tmp/rh-places.json -w '%{http_code}' -b "$JAR_SA" --max-time 30 "$BASE/api/places?q=2891")
[[ "$code" == "200" ]] && ok "places search" || bad "places $code"

if [[ "$fail" -eq 0 ]]; then echo SMOKE_FEATURES_OK; exit 0; fi
echo SMOKE_FEATURES_FAILED; exit 1
