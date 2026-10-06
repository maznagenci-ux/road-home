#!/usr/bin/env bash
# Migrate Road Home off Supabase → Postgres + local uploads on THIS Hostinger VPS.
# Usage (as root on VPS):
#   bash scripts/hostinger/migrate-off-supabase.sh
#
# Optional env:
#   SUPABASE_DUMP_URL  — direct Postgres URI for pg_dump (session mode :5432 preferred)
#   LOCAL_DB_PASS      — password for local role (default: random)

set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/road-home}"
cd "$APP_DIR"

export DEBIAN_FRONTEND=noninteractive

echo "==> Install PostgreSQL"
apt-get update -y
apt-get install -y postgresql postgresql-contrib

systemctl enable --now postgresql

DB_NAME="roadhome"
DB_USER="roadhome"
DB_PASS="${LOCAL_DB_PASS:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"

echo "==> Create local role + database"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SELECT 'ok_role';
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "${DB_NAME}" -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

LOCAL_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}?schema=public&connection_limit=10"

DUMP_URL="${SUPABASE_DUMP_URL:-}"
if [ -z "$DUMP_URL" ] && [ -f .env ]; then
  # Prefer existing DATABASE_URL if it still points at Supabase (for one-time dump)
  OLD=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | sed 's/^"//;s/"$//')
  case "$OLD" in
    *supabase.com*) DUMP_URL="$OLD" ;;
  esac
fi

mkdir -p /var/backups/road-home public/uploads/receipts
chown -R www-data:www-data public/uploads 2>/dev/null || true
chmod -R 775 public/uploads

if [ -n "$DUMP_URL" ]; then
  echo "==> Dump from remote Supabase (may take a few minutes)"
  # Convert pooler 6543 → try dump; if fails, user must set SUPABASE_DUMP_URL with :5432
  DUMP_FILE="/var/backups/road-home/supabase-$(date +%Y%m%d%H%M%S).sql"
  set +e
  pg_dump --no-owner --no-acl "$DUMP_URL" > "$DUMP_FILE"
  DUMP_RC=$?
  set -e
  if [ "$DUMP_RC" -ne 0 ]; then
    echo "WARN: pg_dump from Supabase failed (often needs port 5432 session mode)."
    echo "      Set SUPABASE_DUMP_URL and re-run, or continue with empty local schema."
    rm -f "$DUMP_FILE"
  else
    echo "==> Restore into local Postgres"
    sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${DB_USER};"
    PGPASSWORD="$DB_PASS" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
    echo "Restored: $DUMP_FILE"
  fi
fi

echo "==> Write .env for Hostinger-local Postgres"
# Keep non-DB keys; rewrite DATABASE_URL; strip Supabase keys
TMP_ENV=$(mktemp)
if [ -f .env ]; then
  grep -vE '^(DATABASE_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|UPLOADS_DIR)=' .env > "$TMP_ENV" || true
else
  : > "$TMP_ENV"
fi
{
  echo "DATABASE_URL=\"${LOCAL_URL}\""
  echo "UPLOADS_DIR=\"${APP_DIR}/public/uploads\""
  echo "APP_URL=https://zmkh-roadhome.com"
  echo "NEXT_PUBLIC_APP_URL=https://zmkh-roadhome.com"
  cat "$TMP_ENV"
} > .env.new
mv .env.new .env
rm -f "$TMP_ENV"
chmod 600 .env

# Save credentials for operator
CRED_FILE="/root/roadhome-db-credentials.txt"
cat > "$CRED_FILE" <<EOF
LOCAL_DB_NAME=${DB_NAME}
LOCAL_DB_USER=${DB_USER}
LOCAL_DB_PASS=${DB_PASS}
DATABASE_URL=${LOCAL_URL}
EOF
chmod 600 "$CRED_FILE"
echo "Credentials saved: $CRED_FILE"

echo "==> Prisma schema push (ensure tables exist)"
export DATABASE_URL="$LOCAL_URL"
npx prisma generate
npx prisma db push --skip-generate

echo "==> Build + restart"
npm run build
rm -rf .next/standalone/public .next/standalone/.next/static
mkdir -p .next/standalone/.next .next/standalone/public/uploads/receipts
cp -a public .next/standalone/public
cp -a .next/static .next/standalone/.next/static
cp -f .env .next/standalone/.env

# Nginx: ensure /uploads is served (static from app public via Next, or direct)
if [ -f /etc/nginx/sites-available/road-home ]; then
  if ! grep -q 'location /uploads/' /etc/nginx/sites-available/road-home; then
    python3 - <<'PY'
from pathlib import Path
p = Path('/etc/nginx/sites-available/road-home')
t = p.read_text()
needle = 'location / {'
block = '''    location /uploads/ {
        alias /var/www/road-home/public/uploads/;
        access_log off;
        expires 30d;
    }

'''
    if needle in t and 'location /uploads/' not in t:
        t = t.replace(needle, block + needle, 1)
        p.write_text(t)
        print('nginx_uploads_location_added')
PY
    nginx -t && systemctl reload nginx || true
  fi
fi

pm2 delete road-home || true
pm2 start ecosystem.config.cjs
pm2 save

echo "==> OK — Supabase removed from runtime .env"
echo "    DATABASE_URL now points to 127.0.0.1 Postgres"
pm2 status road-home
