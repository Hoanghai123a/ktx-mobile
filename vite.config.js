import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appPort = Number(env.VITE_PORT || 5174);
  const pocketBaseUrl = env.VITE_POCKETBASE_PROXY_TARGET || "http://127.0.0.1:8090";
  const proxy = {
    "/api/public/pb": {
      target: pocketBaseUrl,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api\/public\/pb/, ""),
    },
  };

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: appPort,
      proxy,
    },
    preview: {
      host: "0.0.0.0",
      port: appPort,
      proxy,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("xlsx")) return "vendor-xlsx";
            if (id.includes("lucide-react")) return "vendor-icons";
            return;
          },
        },
      },
    },
  };
});
