#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home

# Sync files already copied to /tmp/rh-branches/
SRC=/tmp/rh-branches
cp -f "$SRC/schema.prisma" ./prisma/schema.prisma
mkdir -p src/app/api/branches/\[id\] \
  src/app/\[lang\]/\(dashboard\)/branches \
  src/features/branches
cp -f "$SRC/branches-route.ts" ./src/app/api/branches/route.ts
cp -f "$SRC/branches-id-route.ts" ./src/app/api/branches/\[id\]/route.ts
cp -f "$SRC/branches-page.tsx" ./src/app/\[lang\]/\(dashboard\)/branches/page.tsx
cp -f "$SRC/BranchesView.tsx" ./src/features/branches/BranchesView.tsx
cp -f "$SRC/Sidebar.tsx" ./src/components/layout/Sidebar.tsx
cp -f "$SRC/permissions.ts" ./src/lib/access/permissions.ts
cp -f "$SRC/SupportView.tsx" ./src/features/support/SupportView.tsx
cp -f "$SRC/ckb.json" ./messages/ckb.json
cp -f "$SRC/en.json" ./messages/en.json
cp -f "$SRC/ar.json" ./messages/ar.json

npx prisma db push --accept-data-loss=false
npx prisma generate
bash scripts/hostinger/rebuild-fast.sh
echo BRANCHES_DEPLOY_DONE
