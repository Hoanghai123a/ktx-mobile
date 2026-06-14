import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import nodePath from "node:path";

// Phien ban dang MM.DD.NN (thang.ngay.so lan build trong ngay).
// Bo dem duoc luu o build-version.json va chi tang khi chay `vite build`.
function computeAppVersion(shouldBump) {
  const metaPath = nodePath.resolve(process.cwd(), "build-version.json");
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dayKey = `${mm}.${dd}`;

  let meta = { day: dayKey, count: 0 };
  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    if (parsed && typeof parsed === "object") {
      meta = { day: String(parsed.day || ""), count: Number(parsed.count) || 0 };
    }
  } catch {
    // chua co file hoac loi doc -> dung mac dinh
  }

  if (meta.day !== dayKey) meta = { day: dayKey, count: 0 };

  if (shouldBump) {
    meta.count += 1;
    try {
      fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    } catch {
      // bo qua loi ghi, van tra ve version da tinh
    }
  }

  const count = meta.count > 0 ? meta.count : 1;
  return `${dayKey}.${String(count).padStart(2, "0")}`;
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appPort = Number(env.VITE_PORT || 5174);
  const pocketBaseUrl = env.VITE_POCKETBASE_PROXY_TARGET || "http://127.0.0.1:8091";
  const appVersion = computeAppVersion(command === "build");
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
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
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