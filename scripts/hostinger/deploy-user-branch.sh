#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
SRC=/tmp/rh-user-branch
cp -f "$SRC/schema.prisma" ./prisma/schema.prisma
cp -f "$SRC/users-route.ts" ./src/app/api/users/route.ts
cp -f "$SRC/matrix-route.ts" ./src/app/api/access/matrix/route.ts
cp -f "$SRC/UserFormModal.tsx" ./src/features/access/UserFormModal.tsx
cp -f "$SRC/AccessControlView.tsx" ./src/features/access/AccessControlView.tsx
cp -f "$SRC/ckb.json" ./messages/ckb.json
cp -f "$SRC/en.json" ./messages/en.json
cp -f "$SRC/ar.json" ./messages/ar.json
npx prisma db push --accept-data-loss=false
npx prisma generate
bash scripts/hostinger/rebuild-fast.sh
echo USER_BRANCH_DONE
