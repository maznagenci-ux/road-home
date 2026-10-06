#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
SRC=/tmp/rh-brand-names
cp -f "$SRC/brand.ts" ./src/lib/brand.ts
cp -f "$SRC/templates.ts" ./src/lib/pdf/templates.ts
cp -f "$SRC/accounts-report.ts" ./src/lib/pdf/accounts-report.ts
bash scripts/hostinger/rebuild-fast.sh
echo BRAND_NAMES_DONE
