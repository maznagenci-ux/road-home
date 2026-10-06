#!/usr/bin/env bash
# Post-deploy smoke: login, dashboard, contracts, rentals, receipts, accounting, alerts, receipt PDF.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3000}"
PHONE="${SMOKE_PHONE:-07507535675}"
PASS="${SMOKE_PASS:-Hama.2000##}"
JAR=/tmp/rh-smoke-cookies.txt
rm -f "$JAR"

fail=0
check() {
  local name="$1" code="$2" expect="$3"
  if [[ "$code" == "$expect" ]]; then
    echo "OK  $name ($code)"
  else
    echo "FAIL $name got=$code want=$expect"
    fail=1
  fi
}

LOGIN=$(curl -s -c "$JAR" -b "$JAR" --max-time 25 \
  -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$PHONE\",\"password\":\"$PASS\"}" \
  -w '%{http_code}' -o /tmp/rh-smoke-login.json)
check login "$LOGIN" 200

for path_expect in \
  "/ckb|200,307" \
  "/api/contracts|200" \
  "/api/rentals|200" \
  "/api/receipts|200" \
  "/api/accounting/summary|200" \
  "/api/alerts/overdue|200" \
  "/api/branches?active=1|200"
do
  path="${path_expect%%|*}"
  expect="${path_expect##*|}"
  code=$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" --max-time 30 "$BASE$path")
  if [[ ",$expect," == *",$code,"* ]] || [[ "$expect" == "$code" ]]; then
    echo "OK  $path ($code)"
  else
    echo "FAIL $path got=$code want=$expect"
    fail=1
  fi
done

# latest receipt HTML should be single-page dual voucher
RID=$(python3 - <<'PY'
import json
try:
  d=json.load(open('/tmp/rh-smoke-login.json'))
except Exception:
  d={}
print('')
PY
)
# fetch receipts list for an id
curl -s -b "$JAR" --max-time 25 "$BASE/api/receipts" -o /tmp/rh-smoke-receipts.json || true
RID=$(python3 - <<'PY'
import json
try:
  d=json.load(open('/tmp/rh-smoke-receipts.json'))
  items=d.get('items') or []
  print(items[0]['id'] if items else '')
except Exception:
  print('')
PY
)
if [[ -n "$RID" ]]; then
  code=$(curl -s -o /tmp/rh-smoke-receipt.html -w '%{http_code}' -b "$JAR" --max-time 30 \
    "$BASE/api/pdf/receipt/${RID}?locale=ckb")
  check "pdf/receipt" "$code" 200
  if grep -q 'ڕەسەن\|original' /tmp/rh-smoke-receipt.html && grep -q 'کۆپی\|duplicate\|receiptCopy' /tmp/rh-smoke-receipt.html; then
    echo "OK  receipt has original+copy"
  else
    # soft check on class voucher count
    vc=$(grep -c 'class="voucher"' /tmp/rh-smoke-receipt.html || true)
    if [[ "$vc" -ge 2 ]]; then echo "OK  receipt vouchers=$vc"; else echo "FAIL receipt dual voucher"; fail=1; fi
  fi
  if grep -q 'A4 portrait\|210mm' /tmp/rh-smoke-receipt.html; then
    echo "OK  receipt A4 portrait single page"
  else
    echo "WARN receipt page size marker missing"
  fi
else
  echo "WARN no receipts to probe PDF"
fi

if [[ "$fail" -eq 0 ]]; then
  echo SMOKE_OK
  exit 0
fi
echo SMOKE_FAILED
exit 1
