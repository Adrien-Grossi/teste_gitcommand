// Service worker de « Mes courses » :
// 1. garde l'appli disponible hors ligne (page : réseau d'abord pour les mises à jour, cache sinon) ;
// 2. affiche les rappels de péremption (2 jours avant, puis le jour où la date est dépassée).
var CACHE = "courses-v9";
var FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
var LEAD = 2; // jours d'avance pour le rappel

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); });
    }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});

// ---------- Rappels ----------
function idb(fn) {
  return new Promise(function (res, rej) {
    var r = indexedDB.open("courses", 1);
    r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
    r.onerror = function () { rej(r.error); };
    r.onsuccess = function () {
      var tx = r.result.transaction("kv", "readwrite"), out = fn(tx.objectStore("kv"));
      tx.oncomplete = function () { res(out && out.result); };
      tx.onerror = function () { rej(tx.error); };
    };
  });
}
function daysLeft(iso) {
  var p = iso.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]), t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 864e5);
}
function checkDates() {
  return Promise.all([idb(function (s) { return s.get("stock"); }), idb(function (s) { return s.get("sent"); })]).then(function (r) {
    var stock = r[0] || [], sent = r[1] || {}, now = {}, jobs = [];
    stock.forEach(function (it) {
      var n = daysLeft(it.date), level = n < 0 ? "expired" : n <= LEAD ? "soon" : null;
      if (!level) return;
      var key = it.id + "|" + it.date + "|" + level;
      now[key] = 1;
      if (sent[key]) return; // une seule notification par article et par étape
      var dd = it.date.slice(8, 10) + "/" + it.date.slice(5, 7), title, body;
      if (level === "soon") {
        title = "Attention : " + it.name;
        body = (n === 0 ? "Périme aujourd'hui" : n === 1 ? "Risque de périmer demain" : "Risque de périmer dans " + n + " jours") +
          " (" + dd + "). À manger vite !";
      } else {
        title = it.name + " : date dépassée";
        body = "Péremption dépassée (" + dd + "). Remis dans ta liste de courses.";
      }
      jobs.push(self.registration.showNotification(title, {
        body: body, tag: it.id, icon: "icon-192.png", badge: "icon-192.png", data: { url: "./" }
      }));
    });
    return Promise.all(jobs).then(function () { return idb(function (s) { return s.put(now, "sent"); }); });
  });
}
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "check") e.waitUntil(checkDates());
});
self.addEventListener("periodicsync", function (e) {
  if (e.tag === "check-dates") e.waitUntil(checkDates());
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) if ("focus" in list[i]) return list[i].focus();
    return self.clients.openWindow("./");
  }));
});
