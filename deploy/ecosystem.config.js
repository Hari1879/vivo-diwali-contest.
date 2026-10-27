// pm2 start deploy/ecosystem.config.js   (run from the project root)
module.exports = {
  apps: [
    {
      name: 'vivo-diwali-api',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
