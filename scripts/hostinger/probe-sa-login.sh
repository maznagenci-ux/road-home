#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home
echo "== login probe =="
curl -sS -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data-binary '{"phone":"07507535675","password":"Hama.2000##"}' | head -c 400
echo
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({
    where: { phone: '07507535675' },
    select: { phone: true, role: true, isActive: true, name: true, passwordHash: true },
  });
  console.log('user', u && { phone: u.phone, role: u.role, isActive: u.isActive, name: u.name });
  if (u) {
    const ok = await bcrypt.compare('Hama.2000##', u.passwordHash);
    console.log('password_match', ok);
    if (!ok) {
      const hash = await bcrypt.hash('Hama.2000##', 10);
      await p.user.update({ where: { phone: '07507535675' }, data: { passwordHash: hash, isActive: true, role: 'SUPER_ADMIN' } });
      console.log('password_reset_done');
    }
  }
  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
NODE
