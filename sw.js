/* Офлайн: оболочка приложения кэшируется, обновления берутся из сети, когда она есть. Версия меняется при каждом выпуске. */
const V = 'jal-v73';
/* заранее кладём оболочку десктопа и телефона, чтобы после первого открытия всё работало без сети */
const PRE = ["./", "./index.html", "./desktop/", "./desktop/index.html", "./desktop/app.css", "./desktop/skins.css", "./desktop/js/core.js", "./desktop/js/data.js", "./desktop/js/db.js", "./desktop/js/engine.js", "./desktop/js/m-analytics.js", "./desktop/js/m-calc.js", "./desktop/js/m-calendar.js", "./desktop/js/m-clients.js", "./desktop/js/m-docs.js", "./desktop/js/m-home.js", "./desktop/js/m-money.js", "./desktop/js/m-orders.js", "./desktop/js/m-other.js", "./src/app.js", "./src/calc.js", "./src/calcscreen.js", "./src/cartscreen.js", "./src/comparescreen.js", "./src/data.js", "./src/docs.js", "./src/docscreens.js", "./src/drive.js", "./src/export.js", "./src/limits.js", "./src/lock.js", "./src/look.js", "./src/orders.js", "./src/orderscreen.js", "./src/ordersscreen.js", "./src/screen.js", "./src/sendscreen.js", "./src/settingsscreen.js", "./src/tpl.js", "./tpl/docKp.html", "./tpl/docKpVar.html", "./tpl/docBlank.html", "./tpl/docDog.html", "./vendor/docx.umd.js", "./vendor/html2canvas.min.js", "./vendor/jspdf.umd.min.js", "./assets/logo.png", "./assets/icon-192.png", "./manifest.webmanifest"];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(ca => Promise.all(PRE.map(u => fetch(u, { cache: 'reload' }).then(r => { if (r.ok) return ca.put(u, r); }).catch(() => {}))
    .concat(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => ca.put(u, r)).catch(() => {}))))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  /* Скрипт Google (цены, файлы с Диска) всегда из сети, без кэша */
  if (u.hostname.indexOf('script.google') >= 0 || u.hostname.indexOf('googleusercontent') >= 0) return;
  e.respondWith(
    fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(V).then(ca => ca.put(r, c)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: false }).then(m => m || caches.match(r, { ignoreSearch: true })).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') || caches.match('./') : Response.error())))
  );
});
