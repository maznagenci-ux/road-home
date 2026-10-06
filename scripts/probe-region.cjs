const { Client } = require('pg');

const pass = encodeURIComponent('Hama.2000##Hama');
const ref = 'pergezxclyptokncaybo';
const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-east-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
];

(async () => {
  for (const r of regions) {
    for (const port of [6543, 5432]) {
      const user = `postgres.${ref}`;
      const url = `postgresql://${user}:${pass}@aws-0-${r}.pooler.supabase.com:${port}/postgres`;
      const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
      });
      try {
        await client.connect();
        const res = await client.query('select current_database() as db');
        console.log('OK', r, port, res.rows[0]);
        await client.end();
        process.exit(0);
      } catch (e) {
        const msg = e.message || '';
        console.log('FAIL', r, port, msg.slice(0, 100));
        try {
          await client.end();
        } catch {}
        // password auth failed = right region, wrong password
        if (/password authentication failed/i.test(msg)) {
          console.log('REGION_FOUND_BAD_PASSWORD', r, port);
          process.exit(2);
        }
      }
    }
  }
  // also try plain postgres user on pooler
  process.exit(1);
})();
