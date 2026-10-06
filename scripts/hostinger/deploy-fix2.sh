#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
S=/tmp/rh-fix2
cp -f "$S/brand.ts" src/lib/brand.ts
cp -f "$S/templates.ts" src/lib/pdf/templates.ts
cp -f "$S/ContractsListView.tsx" src/features/contracts/ContractsListView.tsx
cp -f "$S/ckb.json" messages/ckb.json
cp -f "$S/en.json" messages/en.json
cp -f "$S/ar.json" messages/ar.json
cp -f "$S/layout.tsx" src/app/layout.tsx
cp -f "$S/BrandLogo.tsx" src/components/brand/BrandLogo.tsx
cp -f "$S/whatsapp.ts" src/lib/whatsapp.ts
cp -f "$S/AnketView.tsx" src/features/anket/AnketView.tsx
cp -f "$S/anket-route.ts" src/app/api/anket/route.ts
cp -f "$S/rentals-route.ts" src/app/api/rentals/route.ts
cp -f "$S/rentals-id-route.ts" src/app/api/rentals/[id]/route.ts
bash scripts/hostinger/rebuild-fast.sh
echo FIX2_DONE
