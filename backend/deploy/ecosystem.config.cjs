/**
 * PM2 process file for production Node (compiled dist/).
 * From backend/: pm2 start deploy/ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "lumenx-api",
      cwd: __dirname + "/..",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "8787",
      },
    },
  ],
};
