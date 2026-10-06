#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
SRC=/tmp/rh-hardening
cp -f "$SRC/auth.ts" ./src/lib/auth.ts
cp -f "$SRC/branch-scope.ts" ./src/lib/access/branch-scope.ts
cp -f "$SRC/whatsapp.ts" ./src/lib/whatsapp.ts
cp -f "$SRC/unified-report.ts" ./src/lib/pdf/unified-report.ts
cp -f "$SRC/simple-owner-report.ts" ./src/lib/pdf/simple-owner-report.ts
cp -f "$SRC/login-route.ts" ./src/app/api/auth/login/route.ts
cp -f "$SRC/otp-verify-route.ts" ./src/app/api/auth/otp/verify/route.ts
cp -f "$SRC/locale-route.ts" ./src/app/api/auth/locale/route.ts
cp -f "$SRC/contracts-route.ts" ./src/app/api/contracts/route.ts
cp -f "$SRC/rentals-route.ts" ./src/app/api/rentals/route.ts
cp -f "$SRC/receipts-route.ts" ./src/app/api/receipts/route.ts
cp -f "$SRC/financial-route.ts" ./src/app/api/pdf/report/financial/route.ts
cp -f "$SRC/simple-report-route.ts" ./src/app/api/accounting/simple-report/route.ts
mkdir -p ./src/app/api/alerts/overdue
cp -f "$SRC/alerts-overdue-route.ts" ./src/app/api/alerts/overdue/route.ts
cp -f "$SRC/error.tsx" ./src/app/\[lang\]/error.tsx
cp -f "$SRC/global-error.tsx" ./src/app/global-error.tsx
mkdir -p ./scripts/hostinger
cp -f "$SRC/backup-db.sh" ./scripts/hostinger/backup-db.sh
cp -f "$SRC/install-cron-backup.sh" ./scripts/hostinger/install-cron-backup.sh
cp -f "$SRC/smoke-test.sh" ./scripts/hostinger/smoke-test.sh
chmod +x ./scripts/hostinger/backup-db.sh ./scripts/hostinger/install-cron-backup.sh ./scripts/hostinger/smoke-test.sh
bash scripts/hostinger/rebuild-fast.sh
bash scripts/hostinger/install-cron-backup.sh || true
bash scripts/hostinger/smoke-test.sh || true
echo HARDENING_DONE
