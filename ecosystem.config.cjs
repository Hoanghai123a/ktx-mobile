module.exports = {
  apps: [
    {
      name: "ktx-frontend",
      cwd: ".",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 5174",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        VITE_PORT: "5174",
        VITE_POCKETBASE_URL: "/pb",
        VITE_POCKETBASE_PROXY_TARGET: "http://127.0.0.1:8091",
      },
    },
  ],
};
