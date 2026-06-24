import { useEffect } from "react";

export function useBrandManifest(settings, defaultSettings) {
  useEffect(() => {
    const brandName =
      String(
        settings?.siteName || defaultSettings.siteName || "KTX",
      ).trim() || "KTX";
    const logoUrl =
      String(
        settings?.logoUrl ||
          settings?.about?.brandLogoUrl ||
          defaultSettings.logoUrl ||
          "/logo.png",
      ).trim() || "/logo.png";

    document.title = brandName;
    document
      .querySelector('meta[name="apple-mobile-web-app-title"]')
      ?.setAttribute("content", brandName);
    document
      .querySelector('meta[name="application-name"]')
      ?.setAttribute("content", brandName);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", "#2c789f");

    const updateLink = (selector, rel) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", logoUrl);
    };

    updateLink('link[rel="icon"]', "icon");
    updateLink('link[rel="shortcut icon"]', "shortcut icon");
    updateLink('link[rel="apple-touch-icon"]', "apple-touch-icon");

    let active = true;
    let blobUrl = null;

    const renderManifestIcon = (size) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas unavailable");
            ctx.clearRect(0, 0, size, size);

            const target = size * 0.82;
            const scale = Math.min(target / img.width, target / img.height);
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const x = Math.round((size - width) / 2);
            const y = Math.round((size - height) / 2);
            ctx.drawImage(img, x, y, width, height);
            resolve(canvas.toDataURL("image/png"));
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error("Logo load failed"));
        img.src = logoUrl;
      });

    const applyManifest = async () => {
      let icon192 = "/icons/icon-192.png";
      let icon512 = "/icons/icon-512.png";

      try {
        [icon192, icon512] = await Promise.all([
          renderManifestIcon(192),
          renderManifestIcon(512),
        ]);
      } catch {
        // Fallback to static installable icons if logo can't be rasterized.
      }

      const manifest = {
        name: brandName,
        short_name: brandName,
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "portrait",
        background_color: "#f0f9ff",
        theme_color: "rgb(44 120 159)",
        icons: [
          {
            src: icon192,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: icon512,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      };

      if (!active) return;
      blobUrl = URL.createObjectURL(
        new Blob([JSON.stringify(manifest)], {
          type: "application/manifest+json",
        }),
      );
      updateLink('link[rel="manifest"]', "manifest");
      document
        .querySelector('link[rel="manifest"]')
        ?.setAttribute("href", blobUrl);
    };

    applyManifest();

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [
    settings?.about?.brandLogoUrl,
    settings?.logoUrl,
    settings?.siteName,
    defaultSettings,
  ]);
}
