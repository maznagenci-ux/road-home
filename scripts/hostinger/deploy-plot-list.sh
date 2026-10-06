#!/usr/bin/env bash
# Hotfix: complete plot number list (no virtual window) + compound 426 data.
# From your machine (with SSH to VPS):
#   scp -r scripts/hostinger/deploy-plot-list.sh src/features/map/MapView.tsx \
#     src/features/tv/TvSystemMap.tsx src/lib/map/plot-search.ts \
#     public/data/compounds/426.json public/data/compounds/426-pointers.json \
#     USER@HOST:/tmp/rh-plot-list/
#   ssh USER@HOST 'bash /var/www/road-home/scripts/hostinger/deploy-plot-list.sh'
#
# Or on VPS after git pull:
#   cd /var/www/road-home && bash scripts/hostinger/deploy-plot-list.sh

set -euo pipefail
cd /var/www/road-home
SRC="${SRC:-/tmp/rh-plot-list}"

if [[ -d "$SRC" ]]; then
  mkdir -p ./src/features/map ./src/features/tv ./src/lib/map ./public/data/compounds
  cp -f "$SRC/MapView.tsx" ./src/features/map/MapView.tsx
  cp -f "$SRC/TvSystemMap.tsx" ./src/features/tv/TvSystemMap.tsx
  cp -f "$SRC/plot-search.ts" ./src/lib/map/plot-search.ts
  cp -f "$SRC/426.json" ./public/data/compounds/426.json
  cp -f "$SRC/426-pointers.json" ./public/data/compounds/426-pointers.json
fi

bash scripts/hostinger/rebuild-fast.sh
echo PLOT_LIST_DONE
