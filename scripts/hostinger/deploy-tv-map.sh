#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
SRC=/tmp/rh-tv-map
mkdir -p ./public/vendor/leaflet ./src/features/tv ./src/app/api/map/compounds/\[id\]
cp -f "$SRC/TvClientRoot.tsx" ./src/features/tv/TvClientRoot.tsx
cp -f "$SRC/TvMapPanel.tsx" ./src/features/tv/TvMapPanel.tsx
cp -f "$SRC/TvSystemMap.tsx" ./src/features/tv/TvSystemMap.tsx
cp -f "$SRC/TvCompoundMap.tsx" ./src/features/tv/TvCompoundMap.tsx
cp -f "$SRC/TvLeafletCanvas.tsx" ./src/features/tv/TvLeafletCanvas.tsx
cp -f "$SRC/TvFocusProvider.tsx" ./src/features/tv/TvFocusProvider.tsx
cp -f "$SRC/tv.css" ./src/features/tv/tv.css
cp -f "$SRC/compound-id-route.ts" ./src/app/api/map/compounds/\[id\]/route.ts
cp -f "$SRC/leaflet.js" ./public/vendor/leaflet/leaflet.js
cp -f "$SRC/leaflet.css" ./public/vendor/leaflet/leaflet.css
bash scripts/hostinger/rebuild-fast.sh
echo TV_MAP_DONE
