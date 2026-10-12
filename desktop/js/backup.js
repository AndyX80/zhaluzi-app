/* Полная копия: все данные и настройки программы из браузера (jal-data.json) + код сайта (папка site/) + инструкция.
   Лежит одним zip-файлом на локальном диске; сайт можно поднять на любом хостинге статических файлов. */
(function () {
  'use strict';
  const A = window.App, pad = n => String(n).padStart(2, '0');
  const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  /* zip без сжатия (store): просто и надёжно открывается везде */
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0; const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(f => {
      const nm = enc.encode(f.name), data = f.data, crc = crc32(data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, time, true); h.setUint16(12, date, true);
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, time, true); c.setUint16(14, date, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
    });
    const cs = cen.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  const dump = () => { const o = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^jal/i.test(k)) o[k] = localStorage.getItem(k); } } catch (x) {} return o; };
  /* список файлов сайта: из GitHub (всегда свежий), запасной вариант: site-files.json рядом с сайтом */
  async function siteList() {
    try { const r = await fetch('https://api.github.com/repos/AndyX80/zhaluzi-app/git/trees/main?recursive=1'); if (r.ok) { const j = await r.json(); const l = (j.tree || []).filter(x => x.type === 'blob' && !/__pycache__|node_modules/.test(x.path)).map(x => x.path); if (l.length) return l; } } catch (x) {}
    const r2 = await fetch(new URL('../site-files.json', location.href).href, { cache: 'no-store' }); return r2.json();
  }
  const README = at => 'Полная копия «Жалюзи-СПб» от ' + at + `

Что внутри
  jal-data.json   все данные и настройки программы из браузера: заказы, клиенты, операции, ставки монтажа, курс, подпись и печать, QR, ссылки, кэш цен и т.д.
  site/           код сайта (телефонная версия в корне, десктоп в папке desktop/), служебные файлы и скрипт Google (apps_script/prices.gs)

Как развернуть на другом сервере
  1. Папку site/ целиком выложить на любой хостинг статических файлов (GitHub Pages, Netlify, свой nginx, даже простой «python3 -m http.server»). Серверной части нет.
  2. Открыть адрес /desktop/ (десктоп) или корень (телефон). Для приложения на телефоне нужен https.
  3. Настройки → Данные → «Восстановить из полной копии» и выбрать jal-data.json. Страница перезагрузится с вашими данными.
  4. Цены лежат в Google Таблице «Цены для приложения», общая база заказов на Google Диске: они не входят в копию, но кэш цен в jal-data.json есть. Скрипт apps_script/prices.gs остаётся в вашем Google-аккаунте. Если аккаунт тот же, ссылка на скрипт восстановится вместе с данными.
  5. Данные хранятся в браузере: копию стоит делать регулярно, а перед чисткой браузера обязательно.
`;
  async function full() {
    A.toast('Собираю копию…');
    const enc = new TextEncoder(), at = new Date(), stamp = at.getFullYear() + '-' + pad(at.getMonth() + 1) + '-' + pad(at.getDate()) + '_' + pad(at.getHours()) + '-' + pad(at.getMinutes());
    const files = [{ name: 'jal-data.json', data: enc.encode(JSON.stringify({ jal_full_backup: 1, at: at.toISOString(), keys: dump() })) }, { name: 'КАК-ВОССТАНОВИТЬ.txt', data: enc.encode(README(at.toLocaleString('ru-RU'))) }];
    let miss = 0, list = [];
    try { list = await siteList(); } catch (x) { miss = -1; }
    for (const p of list) { try { const r = await fetch(new URL('../' + p, location.href).href, { cache: 'no-store' }); if (!r.ok) throw 0; files.push({ name: 'site/' + p, data: new Uint8Array(await r.arrayBuffer()) }); } catch (x) { miss++; } }
    const u = URL.createObjectURL(zip(files)), a = document.createElement('a'); a.href = u; a.download = 'zhaluzi-kopiya-' + stamp + '.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
    try { localStorage.setItem('jald_full_backup_at', String(Date.now())); } catch (x) {}
    A.toast(miss === -1 ? 'Данные сохранены, а список файлов сайта получить не удалось' : miss ? 'Копия готова, но не скачано файлов: ' + miss : 'Копия готова: данные и код сайта (' + (files.length - 2) + ' файлов)'); A.render();
  }
  function restore(text) {
    const j = JSON.parse(text); if (!j || !j.jal_full_backup || !j.keys) return false;
    Object.keys(j.keys).forEach(k => { try { localStorage.setItem(k, j.keys[k]); } catch (x) {} }); return true;
  }
  window.JalBackup = { full, restore, dump, at: () => +localStorage.getItem('jald_full_backup_at') || 0 };
  A.act.bkfull = () => { full().catch(x => A.toast('Ошибка: ' + x.message)); };
})();
