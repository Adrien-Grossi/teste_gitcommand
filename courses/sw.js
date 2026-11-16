/* =========================================================================
   Mes courses · service worker
   1. Hors ligne :
      - fichiers de l'appli (page, styles, scripts) : réseau d'abord, pour recevoir les mises à jour ;
      - bibliothèques, icônes et polices : cache d'abord, elles ne changent pas.
   2. Rappels de péremption : 2 jours avant la date, puis le jour où elle est dépassée.
   Changer CACHE à chaque mise en ligne qui modifie la liste ci-dessous.
   ========================================================================= */
const CACHE = "courses-v36";
const APP_FILES = ["./", "index.html", "app.css", "app.js", "effects.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const LEAD_DAYS = 2;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function remember(req, res) {
  if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
}
const networkFirst = (req) => fetch(req).then((res) => remember(req, res))
  .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")));
const cacheFirst = (req) => caches.match(req).then((r) => r || fetch(req).then((res) => remember(req, res)));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(/\/vendor\/|\.png$/.test(url.pathname) ? cacheFirst(req) : networkFirst(req));
  } else if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(req));
  }
});

/* ---------- Rappels ----------------------------------------------------- */
function idb(fn) {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("courses", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction("kv", "readwrite"), out = fn(tx.objectStore("kv"));
      tx.oncomplete = () => resolve(out && out.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
function daysLeft(iso) {
  const [y, m, d] = iso.split("-").map(Number), t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - t) / 864e5);
}
// Une notification par article et par étape (« bientôt », puis « dépassée »), jamais répétée.
async function checkDates() {
  const stock = (await idb((s) => s.get("stock"))) || [];
  const sent = (await idb((s) => s.get("sent"))) || {};
  const current = {}, shown = [];
  for (const it of stock) {
    const n = daysLeft(it.date), step = n < 0 ? "expired" : n <= LEAD_DAYS ? "soon" : null;
    if (!step) continue;
    const key = it.id + "|" + it.date + "|" + step;
    current[key] = 1;
    if (sent[key]) continue;
    const dd = it.date.slice(8, 10) + "/" + it.date.slice(5, 7);
    const title = step === "soon" ? "Attention : " + it.name : it.name + " : date dépassée";
    const body = step === "soon"
      ? (n === 0 ? "Périme aujourd'hui" : n === 1 ? "Risque de périmer demain" : "Risque de périmer dans " + n + " jours") + " (" + dd + "). À manger vite !"
      : "Péremption dépassée (" + dd + "). Remis dans ta liste de courses.";
    shown.push(self.registration.showNotification(title, { body, tag: it.id, icon: "icon-192.png", badge: "icon-192.png", data: { url: "./" } }));
  }
  await Promise.all(shown);
  await idb((s) => s.put(current, "sent"));
}
self.addEventListener("message", (e) => { if (e.data && e.data.type === "check") e.waitUntil(checkDates()); });
self.addEventListener("periodicsync", (e) => { if (e.tag === "check-dates") e.waitUntil(checkDates()); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => "focus" in c);
    return open ? open.focus() : self.clients.openWindow("./");
  }));
});
