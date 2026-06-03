// public/sw.js — Service Worker PWA ConcoursSanté
const CACHE_NAME = "concourssante-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  const title = data.title || "ConcoursSanté 🩺";
  const options = {
    body:      data.body || "N'oublie pas de réviser aujourd'hui !",
    icon:      "/icon-192.png",
    badge:     "/icon-192.png",
    tag:       "streak-reminder",
    renotify:  true,
    data:      { url: data.url || "/" },
    actions: [
      { action: "open",    title: "Réviser maintenant →" },
      { action: "dismiss", title: "Plus tard" }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin)) { client.focus(); client.navigate(url); return; }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type !== "SCHEDULE_STREAK_REMINDER") return;
  const { delayMs, streak