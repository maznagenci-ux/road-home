#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
echo "== Hostinger-only check =="
echo "DNS: $(getent hosts zmkh-roadhome.com | awk '{print $1}')"
if grep -qiE 'netlify|NETLIFY' .env 2>/dev/null; then
  echo "WARN: netlify in .env"
  grep -niE 'netlify|NETLIFY' .env | sed -E 's/=.*/=***/'
else
  echo "ENV: clean (no netlify)"
fi
if [[ -f netlify.toml ]]; then echo "WARN: netlify.toml exists"; else echo "NO netlify.toml"; fi
node <<'NODE'
const fs = require('fs');
const meta = JSON.parse(fs.readFileSync('public/data/compounds/426.json','utf8'));
const ptr = JSON.parse(fs.readFileSync('public/data/compounds/426-pointers.json','utf8'));
const nos = ptr.map(x => Number(x.no)).filter(Number.isFinite).sort((a,b)=>a-b);
console.log('426 meta', meta.pointerCount, 'ptr', ptr.length, 'min', nos[0], 'first5', nos.slice(0,5).join(','));
NODE
echo "map page:"
head -8 src/app/\[lang\]/map/page.tsx
echo "live map hint:"
curl -s http://127.0.0.1:3000/ckb/map | grep -o 'گەڕان: ١ یان ژمارەی فەرمی' | head -1 || echo '(not in HTML - client bundle)'
curl -s http://127.0.0.1:3000/ckb | grep -oi netlify | head || echo "HTML_NO_NETLIFY"
# purge any NETLIFY_ env keys
if grep -qE '^NETLIFY_' .env 2>/dev/null; then
  grep -vE '^NETLIFY_' .env > /tmp/rh.env && mv /tmp/rh.env .env
  cp -f .env .next/standalone/.env
  echo "stripped NETLIFY_ keys"
fi
echo DONE
