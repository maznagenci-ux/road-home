#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Inline minimal brandLogoPair like assets.ts
function readBrandPng(file) {
  const candidates = [
    path.join(process.cwd(), 'public', 'brand', file),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'brand', file),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
    }
  }
  return `/brand/${file}`;
}

(async () => {
  const p = new PrismaClient();
  const receipt = await p.receipt.findFirst({
    orderBy: { issuedAt: 'desc' },
    include: {
      contract: { include: { customer: true, house: { include: { property: true } } } },
    },
  });
  console.log('receipt', receipt && {
    id: receipt.id,
    no: receipt.receiptNo,
    amount: receipt.amount,
    party: receipt.partyName,
    desc: receipt.description,
  });

  // Dynamic import of compiled templates is hard; just check dictionary keys and logo
  const logo = readBrandPng('logo.png');
  console.log('logoPrefix', logo.slice(0, 40), 'len', logo.length);

  // Check if admin user password hash exists
  const users = await p.user.findMany({ select: { phone: true, name: true, role: true }, take: 5 });
  console.log('users', users);

  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
