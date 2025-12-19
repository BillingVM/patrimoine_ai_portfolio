/**
 * PM2 Ecosystem Configuration
 * Run: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'portai-api',
    script: './api/server.js',
    cwd: '/var/www/sol.inoutconnect.com/portai',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env_file: './api/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_NAME: 'portfolio_ai',
      DB_USER: 'portfolio_user',
      DB_PASSWORD: 'apzosldkcAO91561ssa6@gasy',
      OPENROUTER_API_KEY: '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',
      AI_MODEL: 'xiaomi/mimo-v2-flash:free',
      FINANCIAL_DATASETS_API_KEY: 'b2fc1001-ebc6-4740-8968-a22092058880',
      USE_GOOGLE_VISION: 'false',
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
