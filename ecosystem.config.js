module.exports = {
  apps: [
    {
      name: 'school-app-api',
      // Pin the working directory explicitly. Several parts of the app resolve
      // paths off process.cwd() (uploads storage, .env lookup) — without this,
      // behavior silently depends on whatever directory `pm2 start` happened to
      // be run from (e.g. uploads landing in /root/uploads instead of the app
      // folder if an operator starts PM2 from their home directory).
      cwd: __dirname,
      script: './backend/src/server.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      // Single process only. This app runs several singleton background
      // services on boot (queue worker, demo reset scheduler, translation
      // crawler, Prisma migration runner) that are NOT safe to run more than
      // once concurrently — cluster mode with multiple instances would start
      // N copies of each, causing duplicate work, wasted API quota, and a
      // migration race on every deploy. Socket.io also has no Redis adapter
      // enabled by default, so a second instance would silently drop
      // real-time events for users connected to the other process. If you
      // need more throughput, scale by adding a Redis adapter
      // (SOCKET_REDIS_ADAPTER=true) AND making the background services
      // leader-elected first — don't just bump `instances`.
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '2G', // Prevents memory leaks from crashing the system
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      wait_ready: true,
      listen_timeout: 50000,
      kill_timeout: 5000
    }
  ]
};
