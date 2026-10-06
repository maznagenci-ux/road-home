#!/usr/bin/env bash
set -euo pipefail
ID="${1:-cmuijsyp10005ksheacjv5e0j}"
JAR=/tmp/rh-pdf-cookies.txt
rm -f "$JAR"
curl -s -c "$JAR" -b "$JAR" --max-time 20 \
  -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"07507535675","password":"Hama.2000##"}' >/tmp/rh-login.json
echo "login: $(head -c 120 /tmp/rh-login.json)"

curl -s -b "$JAR" --max-time 30 \
  "http://127.0.0.1:3000/api/pdf/receipt/${ID}?locale=ckb" \
  -o /tmp/rh-receipt.html

wc -c /tmp/rh-receipt.html
echo "==> title/brand snippets"
grep -oE 'Road Home[^<]{0,40}|وەسڵ[^<]{0,40}|پسووڵە[^<]{0,40}|ژمارە[^<]{0,20}|class="line"|class="val"|data:image/png' /tmp/rh-receipt.html | head -40
echo "==> has lines block?"
grep -c 'class="lines"' /tmp/rh-receipt.html || true
grep -c 'زیوەر' /tmp/rh-receipt.html || true
echo "==> head of body (stripped)"
python3 - <<'PY'
from pathlib import Path
import re
html = Path('/tmp/rh-receipt.html').read_text(encoding='utf-8', errors='replace')
# strip style/script for readability
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S)
if not body:
  print('NO BODY'); raise SystemExit
text = re.sub(r'<style[^>]*>.*?</style>', '', body.group(1), flags=re.S)
text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.S)
text = re.sub(r'<img[^>]*>', '[IMG]', text)
text = re.sub(r'\s+', ' ', text)
print(text[:2500])
PY
