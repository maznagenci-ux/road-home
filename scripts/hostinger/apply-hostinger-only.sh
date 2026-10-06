#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

cp -f /tmp/middleware.ts ./middleware.ts
cp -f /tmp/auth.ts ./src/lib/auth.ts
cp -f /tmp/env.production.example ./scripts/hostinger/env.production.example
cp -f /tmp/purge-supabase-env.sh ./scripts/hostinger/purge-supabase-env.sh
cp -f /tmp/dotenv.example ./.env.example

rm -f ./src/lib/supabase.ts
rm -f ./scripts/probe-supabase.cjs ./scripts/probe-supabase.mjs \
  ./scripts/post-supabase-setup.cjs ./scripts/probe-region.cjs \
  ./scripts/set-db-url.cjs ./scripts/supabase-init.sql \
  ./scripts/hostinger/migrate-off-supabase.sh

echo "stub gone? $(test ! -f src/lib/supabase.ts && echo yes || echo no)"
bash scripts/hostinger/rebuild-fast.sh
echo DEPLOY_DONE
