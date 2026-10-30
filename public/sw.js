// Minimal service worker so the app can be installed as its own window.
// Network-only on purpose: no caching, so you always get the latest version and live numbers.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
