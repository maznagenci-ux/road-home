#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
S=/tmp/rh-header
mkdir -p src/app/api/notifications
cp -f "$S/Header.tsx" src/components/layout/Header.tsx
cp -f "$S/notifications-route.ts" src/app/api/notifications/route.ts
cp -f "$S/ckb.json" messages/ckb.json
cp -f "$S/en.json" messages/en.json
cp -f "$S/ar.json" messages/ar.json
bash scripts/hostinger/rebuild-fast.sh
echo HEADER_MENUS_DONE
