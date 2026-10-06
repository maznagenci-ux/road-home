#!/usr/bin/env bash
# One-shot: strip Supabase/Netlify from Hostinger .env and verify local Postgres.
set -euo pipefail
cd /var/www/road-home

echo "==> Before (masked):"
grep -E 'SUPABASE|supabase\.com|netlify|NETLIFY|DATABASE_URL' .env 2>/dev/null \
  | sed -E 's/(=[^=:@]*:\/\/[^:]+:)[^@]+@/\1***@/; s/=.*/=***/' || echo "(no matches)"

if grep -qE 'supabase\.com' .env; then
  echo "ERROR: DATABASE_URL still points at supabase.com — fix manually"
  exit 1
fi

TMP="$(mktemp)"
grep -vE '^(NEXT_PUBLIC_SUPABASE_|SUPABASE_|NETLIFY_)' .env > "$TMP"
mv "$TMP" .env

if ! grep -q '^UPLOADS_DIR=' .env; then
  echo 'UPLOADS_DIR="/var/www/road-home/uploads"' >> .env
fi
mkdir -p /var/www/road-home/uploads
chmod -R u+rwX /var/www/road-home/uploads || true

if [[ -d .next/standalone ]]; then
  cp -f .env .next/standalone/.env
fi

echo "==> After (masked):"
grep -E 'SUPABASE|supabase\.com|netlify|NETLIFY|DATABASE_URL|UPLOADS_DIR' .env 2>/dev/null \
  | sed -E 's/(=[^=:@]*:\/\/[^:]+:)[^@]+@/\1***@/; s/(UPLOADS_DIR=).*/\1***/; s/(DATABASE_URL=postgresql:\/\/[^:]+:)[^@]+@/\1***@/' \
  || echo "(clean)"

# Confirm no supabase left
if grep -qiE 'supabase|netlify' .env; then
  echo "WARN: leftover supabase/netlify strings in .env"
  grep -niE 'supabase|netlify' .env | sed -E 's/=.*/=***/'
else
  echo "OK: no supabase/netlify in .env"
fi

echo "==> Local Postgres:"
if command -v psql >/dev/null 2>&1; then
  sudo -u postgres psql -tAc "SELECT datname FROM pg_database WHERE datname LIKE '%road%';" || true
fi

echo "==> Restart PM2 to pick up cleaned env"
pm2 restart road-home --update-env || pm2 start ecosystem.config.cjs
sleep 2
pm2 status road-home

echo "==> Live probe"
curl -sI --max-time 12 http://127.0.0.1:3000/ckb/auth/login | head -5 || true
curl -sI --max-time 12 https://zmkh-roadhome.com/ckb/auth/login | head -8 || true

echo "DONE"
