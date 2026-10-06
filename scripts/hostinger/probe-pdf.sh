#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.receipt.findFirst({
    orderBy: { issuedAt: 'desc' },
    select: { id: true, receiptNo: true, amount: true, partyName: true },
  });
  console.log(JSON.stringify(r));
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE

ls -la public/brand 2>/dev/null || echo "NO public/brand"
ls -la .next/standalone/public/brand 2>/dev/null || echo "NO standalone brand"
find public -name 'logo*.png' 2>/dev/null | head
