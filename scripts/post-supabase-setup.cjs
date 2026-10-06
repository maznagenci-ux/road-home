const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnv() {
  const text = fs.readFileSync('.env', 'utf8');
  for (const line of text.split(/\r?\n/)) {
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
}

(async () => {
  loadEnv();
  const prisma = new PrismaClient();
  const hash = await bcrypt.hash('Hama.2000##', 10);
  const u = await prisma.user.upsert({
    where: { phone: '07507535675' },
    update: { passwordHash: hash, role: 'SUPER_ADMIN', name: 'Super Admin' },
    create: {
      phone: '07507535675',
      passwordHash: hash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      locale: 'ku',
    },
  });
  console.log('admin_ok', u.phone, u.role);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === 'receipts')) {
    const { error } = await supabase.storage.createBucket('receipts', {
      public: true,
      fileSizeLimit: 8 * 1024 * 1024,
    });
    if (error) console.log('bucket_err', error.message);
    else console.log('bucket_ok receipts');
  } else {
    console.log('bucket_exists receipts');
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
