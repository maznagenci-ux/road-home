const fs = require('fs');

const pass = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD || 'Hama.2000##Hama');
// Transaction pooler (6543) for Prisma connection pooling
const url =
  'postgresql://postgres.pergezxclyptokncaybo:' +
  pass +
  '@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1';

let c = fs.readFileSync('.env', 'utf8');
if (!/DATABASE_URL=/.test(c)) {
  c += '\nDATABASE_URL="' + url + '"\n';
} else {
  c = c.replace(/DATABASE_URL="[^"]*"/, 'DATABASE_URL="' + url + '"');
}
fs.writeFileSync('.env', c);
console.log('DATABASE_URL set to transaction pooler :6543 for serverless');
