// public/sw.js — Service Worker PWA ConcoursSanté
const CACHE_NAME = "concourssante-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// Notifications push
self.addEventListener("push", (e) => {
  const data = e.data?.json() || {};
  const title = data.title || "ConcoursSanté 🩺";
  const options = {
    body: data.body || "N'oublie pas de réviser aujourd'hui !",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "streak-reminder",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Réviser maintenant →" },
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
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Rappel streak programmé via message
self.addEventListener("message", (e) => {
  if (e.data?.type === "SCHEDULE_STREAK_REMINDER") {
    const { delayMs, streak } = e.data;
    setTimeout(() => {
      const messages = [
        { title: "🔥 Ton streak t'attend !", body: `${streak} jours de suite — ne casse pas la série !` },
        { title: "📚 Heure de réviser !", body: "20h : c'est le bon moment pour un quiz rapide." },
        { title: "🩺 ConcoursSanté te rappelle", body: "Quelques questions par jour font toute la différence !" },
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "streak-reminder",
        renotify: true,
        data: { url: "/" }
      });
    }, delayMs);
  }
});
