module.exports = {
  apps: [
    {
      name: 'school-app-api',
      script: './backend/src/server.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 'max', // Utilizes all available CPU cores
      exec_mode: 'cluster', // Enables PM2's internal load balancer
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
