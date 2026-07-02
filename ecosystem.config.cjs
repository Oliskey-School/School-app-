/**
 * PM2 Ecosystem Configuration — Oliskey School Management System
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 *   pm2 startup   # generate the startup script for auto-restart on reboot
 *
 * The app block runs the compiled Express backend (dist/server.js).
 * The frontend is served by nginx from the Vite build output (dist/).
 * See scripts/setup-server.sh for the full server provisioning steps.
 */

module.exports = {
  apps: [
    {
      name: 'oliskey-api',
      script: './backend/dist/server.js',
      cwd: '/var/www/oliskey',          // change to your server deploy path
      instances: 'max',                  // one worker per CPU core
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
      },
      // Load secrets from the gitignored .env.production file on the server.
      // PM2 merges these on top of env_production above.
      env_file: '.env.production',
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      // Logging
      out_file: '/var/log/oliskey/api-out.log',
      error_file: '/var/log/oliskey/api-err.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Memory guard: restart a worker that grows past 512 MB
      max_memory_restart: '512M',
      // Kill timeout: give in-flight requests 30 s to finish before hard kill
      kill_timeout: 30000,
      // Graceful listen timeout
      listen_timeout: 8000,
    },
  ],
};
