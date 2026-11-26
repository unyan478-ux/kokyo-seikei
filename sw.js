/* Offline cache for the phone version. build.py replaces d29374b6754c with a hash of the files,
   so the phone picks up a new copy the next time it opens the app online. */
const VERSION = 'd29374b6754c';
const CACHE = 'kps-app-' + VERSION;
const FONTS = 'kps-fonts';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return c.put(u, r); })
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('kps-app-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(caches.open(CACHE).then(c => c.match('index.html')).then(hit => hit || fetch(req)));
    } else {
      e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true })).then(hit => hit || fetch(req)));
    }
    return;
  }
  // web fonts: keep every piece the app has used, so the same characters look the same offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))));
  }
});
