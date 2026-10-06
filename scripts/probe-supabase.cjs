const { PrismaClient } = require('@prisma/client');

const pass = encodeURIComponent('Hama.2000##Hama');
const ref = 'pergezxclyptokncaybo';
const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
];

async function tryUrl(label, url) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  try {
    await Promise.race([
      p.$queryRawUnsafe('SELECT 1'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 10000)),
    ]);
    console.log('OK', label);
    console.log('URL_TEMPLATE', url.replace(pass, 'PASSWORD'));
    await p.$disconnect();
    return true;
  } catch (e) {
    console.log('FAIL', label, String(e.message || e).slice(0, 120));
    try {
      await p.$disconnect();
    } catch {}
    return false;
  }
}

(async () => {
  for (const r of regions) {
    const url6543 = `postgresql://postgres.${ref}:${pass}@aws-0-${r}.pooler.supabase.com:6543/postgres?sslmode=require`;
    if (await tryUrl(`${r}:6543`, url6543)) process.exit(0);
    const url5432 = `postgresql://postgres.${ref}:${pass}@aws-0-${r}.pooler.supabase.com:5432/postgres?sslmode=require`;
    if (await tryUrl(`${r}:5432`, url5432)) process.exit(0);
  }
  process.exit(1);
})();
