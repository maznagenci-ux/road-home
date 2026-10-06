#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
SRC=/tmp/rh-brand
cp -f "$SRC/brand.ts" ./src/lib/brand.ts
cp -f "$SRC/layout.tsx" ./src/app/layout.tsx
cp -f "$SRC/Sidebar.tsx" ./src/components/layout/Sidebar.tsx
cp -f "$SRC/Header.tsx" ./src/components/layout/Header.tsx
cp -f "$SRC/BrandLogo.tsx" ./src/components/brand/BrandLogo.tsx
cp -f "$SRC/ckb.json" ./messages/ckb.json
cp -f "$SRC/en.json" ./messages/en.json
cp -f "$SRC/ar.json" ./messages/ar.json
cp -f "$SRC/templates.ts" ./src/lib/pdf/templates.ts
cp -f "$SRC/office-voucher.ts" ./src/lib/pdf/office-voucher.ts
cp -f "$SRC/accounts-report.ts" ./src/lib/pdf/accounts-report.ts
cp -f "$SRC/whatsapp.ts" ./src/lib/whatsapp.ts
cp -f "$SRC/AnketView.tsx" ./src/features/anket/AnketView.tsx
cp -f "$SRC/anket-route.ts" ./src/app/api/anket/route.ts
cp -f "$SRC/rentals-route.ts" ./src/app/api/rentals/route.ts
cp -f "$SRC/rentals-id-route.ts" ./src/app/api/rentals/\[id\]/route.ts
cp -f "$SRC/RentalsTable.tsx" ./src/features/rentals/RentalsTable.tsx
cp -f "$SRC/ReceiptsView.tsx" ./src/features/receipts/ReceiptsView.tsx
cp -f "$SRC/A4ContractPreview.tsx" ./src/features/contracts/A4ContractPreview.tsx
cp -f "$SRC/TvCompoundMap.tsx" ./src/features/tv/TvCompoundMap.tsx
cp -f "$SRC/schema.prisma" ./prisma/schema.prisma
bash scripts/hostinger/rebuild-fast.sh
echo BRAND_RENAME_DONE
