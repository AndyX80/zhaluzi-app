/* Офлайн: оболочка кэшируется service worker'ом (../sw.js), цены и база лежат в браузере. Здесь — метка «нет сети» и досылка при её возвращении. */
(function () {
  const bar = document.createElement('div');
  bar.id = 'offbar'; bar.hidden = true;
  bar.textContent = 'Нет сети: работаю из памяти браузера. Заказы отправятся на Диск, когда сеть появится.';
  document.body.appendChild(bar);
  const upd = () => { bar.hidden = navigator.onLine !== false; };
  window.addEventListener('offline', upd);
  window.addEventListener('online', () => {
    upd();
    if (window.DB && DB.later) DB.later();
    if (window.Eng && Eng.url && Eng.url() && Date.now() - (Eng.at || 0) > 3 * 3600e3) Eng.refresh().then(() => { if (window.App) App.render(); }).catch(() => {});
  });
  upd();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('../sw.js').catch(() => {});
})();
