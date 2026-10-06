#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
cp -f /tmp/rh-receipt/templates.ts src/lib/pdf/templates.ts
bash scripts/hostinger/rebuild-fast.sh
echo RECEIPT_LAYOUT_DONE
