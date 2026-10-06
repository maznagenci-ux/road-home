/**
 * PM2 for Hostinger VPS — Next.js standalone output.
 * Loads /var/www/road-home/.env into the process (standalone does not auto-load root .env).
 */
const fs = require('fs');
const path = require('path');

const APP_DIR = '/var/www/road-home';
const envFromFile = {};

try {
  const raw = fs.readFileSync(path.join(APP_DIR, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    envFromFile[key] = val;
  }
} catch (e) {
  console.error('[ecosystem] failed to read .env:', e.message);
}

// VPS (long-lived): never use connection_limit=1 (serverless-only)
if (envFromFile.DATABASE_URL) {
  let url = envFromFile.DATABASE_URL;
  if (/connection_limit=\d+/.test(url)) {
    url = url.replace(/connection_limit=\d+/, 'connection_limit=10');
  } else {
    url += (url.includes('?') ? '&' : '?') + 'connection_limit=10';
  }
  if (!/pool_timeout=/.test(url)) {
    url += '&pool_timeout=20';
  }
  envFromFile.DATABASE_URL = url;
}

module.exports = {
  apps: [
    {
      name: 'road-home',
      cwd: APP_DIR,
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        ...envFromFile,
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
