const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "QLKTX",
      cwd: __dirname,
      script: path.join(__dirname, "pm2_worker.js"),
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,

      // PM2 khoi phuc ung dung neu tien trinh bi loi hoac vuot nguong bo nho.
      autorestart: true,
      watch: false,
      min_uptime: "10s",
      max_restarts: 50,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      max_memory_restart: "300M",

      // Cho phep HTTP server dong ket noi gon gang khi deploy/restart.
      kill_timeout: 10000,
      listen_timeout: 10000,
      time: true,
      merge_logs: true,

      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3001",
        POCKETBASE_URL: "http://127.0.0.1:8091",
      },
    },
  ],
};
