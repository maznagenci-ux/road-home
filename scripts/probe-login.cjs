const fs = require('fs');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
  const key = m[1].trim();
  let val = m[2].trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

(async () => {
  const p = new PrismaClient();
  const users = await p.user.findMany({
    select: { phone: true, name: true, role: true, passwordHash: true, isActive: true },
  });
  console.log(
    'users',
    users.map((u) => ({ phone: u.phone, name: u.name, role: u.role, active: u.isActive })),
  );
  for (const phone of ['07507535675', '07500000001']) {
    const u = users.find((x) => x.phone === phone);
    if (!u) {
      console.log(phone, 'MISSING');
      continue;
    }
    for (const pw of ['Hama.2000##', 'admin123', 'Hama.2000##Hama']) {
      if (await bcrypt.compare(pw, u.passwordHash)) console.log(phone, 'MATCH', pw);
    }
  }
  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
