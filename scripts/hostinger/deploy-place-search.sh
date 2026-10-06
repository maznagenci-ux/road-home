#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
S=/tmp/rh-place-search
mkdir -p src/components/places
cp -f "$S/places.ts" src/lib/places.ts
cp -f "$S/PlaceSearchSelect.tsx" src/components/places/PlaceSearchSelect.tsx
cp -f "$S/ContractGenerator.tsx" src/features/contracts/ContractGenerator.tsx
cp -f "$S/RentalContractForm.tsx" src/features/rentals/RentalContractForm.tsx
bash scripts/hostinger/rebuild-fast.sh
echo PLACE_SEARCH_DONE
