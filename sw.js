const CACHE = "legs-v12";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

// При установке берём свежие файлы с сервера, минуя кеш браузера.
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(FILES.map(f =>
        fetch(new Request(f, {cache: "reload"})).then(r => { if (!r.ok) throw new Error(f); return c.put(f, r); })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала сеть (с проверкой на сервере), если она не ответила за 2,5 секунды или её нет, берём сохранённую копию.
function fromNetwork(req) {
  return fetch(req, {cache: "no-cache"}).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  });
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const net = fromNetwork(req);
  const wait = new Promise(res => setTimeout(res, 2500, null));
  e.respondWith(
    Promise.race([net.catch(() => null), wait]).then(r =>
      r || caches.match(req, {ignoreSearch: true}).then(hit => hit || net.catch(() => caches.match("index.html")))
    )
  );
  e.waitUntil(net.catch(() => {}));
});
