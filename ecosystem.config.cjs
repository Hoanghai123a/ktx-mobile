module.exports = {
  apps: [
    {
      name: "QLKTX",
      cwd: ".",
      script: "pm2_worker.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: "3001",
        POCKETBASE_URL: "http://127.0.0.1:8091",
      },
    },
  ],
};
