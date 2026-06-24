const CACHE = "droplet-manager-v2";
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./droplet.jpg",
  "./droplet.mp4"
];
const scheduledTimers = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request)
      .then((cached) => cached || fetch(event.request))
      .catch(() => caches.match("./index.html"))
  );
});

self.addEventListener("message", (event) => {
  const { type, id, title, body, delay } = event.data || {};
  if (!id) return;

  if (type === "CANCEL") {
    if (scheduledTimers.has(id)) {
      clearTimeout(scheduledTimers.get(id));
      scheduledTimers.delete(id);
    }
    return;
  }

  if (type === "SCHEDULE") {
    if (scheduledTimers.has(id)) clearTimeout(scheduledTimers.get(id));
    if (!delay || delay <= 0) return;
    const timer = setTimeout(() => {
      self.registration.showNotification(title || "물방울 매니저", {
        body: body || "일정 시간이 되었어요",
        tag: id,
        renotify: true,
        vibrate: [120, 80, 120]
      });
      scheduledTimers.delete(id);
    }, delay);
    scheduledTimers.set(id, timer);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow("./index.html");
    })
  );
});
