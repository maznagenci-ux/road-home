#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const rows = await p.branch.findMany();
  console.log('branches', JSON.stringify(rows));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
echo "---"
curl -sI --max-time 8 http://127.0.0.1:3000/ckb/branches | head -6
test -f src/app/api/branches/route.ts && echo api_ok
test -f src/app/api/branches/\[id\]/route.ts && echo api_id_ok
test -f src/features/branches/BranchesView.tsx && echo view_ok
grep -n "branches" src/components/layout/Sidebar.tsx | head -3
