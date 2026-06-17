const SW_VERSION = "ktx-mobile-pwa-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_SW_VERSION") {
    event.source?.postMessage({ type: "SW_VERSION", version: SW_VERSION });
  }
});
