// Sillabario service worker: funziona offline e prende sempre la versione più recente quando c'è rete.
const CACHE = 'sillabario-v3';
const CORE = ['./', './index.html', './app.js', './courses.json', './ja.json', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Font di Google: dalla cache se ci sono, altrimenti scaricati e conservati
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  // File dell'app: prima la rete (così gli aggiornamenti arrivano subito), poi la cache se sei offline
  e.respondWith(fetch(req, {cache: 'no-cache'}).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
