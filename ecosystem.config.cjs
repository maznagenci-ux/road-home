/**
 * PM2 for Hostinger VPS — Next.js standalone output.
 * After `npm run build`, copy static assets then start server.js
 */
module.exports = {
  apps: [
    {
      name: 'road-home',
      cwd: '/var/www/road-home',
      script: '.next/standalone/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '127.0.0.1',
      },
      max_memory_restart: '512M',
      time: true,
    },
  ],
};
