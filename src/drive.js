/* Файлы с Google Диска: подпись, печать, QR-коды и тексты сообщений. Берутся через тот же Apps Script, что и цены (?files=1). */
(function () {
  'use strict';
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  /* имя файла в папке → ключ в localStorage */
  const FILES = { 'podpis': 'jal_sign', 'pechat': 'jal_stamp', 'qr_oplata': 'jal_qr_pay', 'qr_yandex': 'jal_qr_ya', 'qr_avito': 'jal_qr_av' };
  /* тексты по умолчанию; в {фигурных скобках} подставляются данные заказа */
  const DEF = {
    kp: 'Добрый день, {имя}! Отправляю расчёт на ваши окна: {изделия}, всего {сумма}. В стоимость уже входят изделия, доставка и установка. Срок изготовления {срок}, гарантия 12 месяцев. Цены держим до {до}.{каталог}\n\nЕсли остались вопросы, пишите, отвечу сразу.',
    kp_katalog: 'Каталог цветов прикладываю: если захочется другой оттенок, скажите, пересчитаю за пару минут.',
    catalog: 'Добрый день, {имя}! Отправляю каталог деревянных жалюзи «Жалюзи-СПБ»: пять коллекций и большой выбор цветов, от светлого дуба до чёрного венге.\n\nПосмотрите, что подойдёт вашему интерьеру, и напишите название или номер понравившегося цвета: я быстро посчитаю стоимость под ваши размеры. Если сложно выбрать, пришлите фото окна, подскажу.',
    blank: 'Добрый день, {имя}! Отправляю замерный лист по вашему заказу. Пожалуйста, проверьте размеры, цвета и сторону управления: по этому листу изделия пойдут в производство, и ошибку потом исправить сложнее.\n\nЕсли всё верно, ответьте «Согласовано». Если что-то нужно поправить, напишите, исправлю сразу.',
    dogovor: 'Добрый день, {имя}! Отправляю договор на {сумма}. Прочитайте, пожалуйста: если всё устраивает, подпишите и пришлите обратно.\n\nПосле предоплаты {предоплата} запускаем изделия в изготовление: срок {срок}, гарантия 12 месяцев. Оплатить можно по СБП или по реквизитам из договора. Вопросы по пунктам, звоните, всё объясню.',
    review: 'Добрый день, {имя}! Жалюзи установлены, надеемся, всё радует глаз и работает как надо. Если вам понравилось, оставьте, пожалуйста, отзыв: это займёт минуту. QR-коды Яндекса и Авито во вложении, наведите камеру телефона и напишите пару слов.\n\nЕсли что-то не так, ответьте на это сообщение, и мы сразу всё исправим. Спасибо, что выбрали «Жалюзи-СПБ»!',
    qr: 'Добрый день, {имя}! Отправляю QR-код для оплаты {qrсумма} ₽ по заказу № {номер}. Откройте приложение своего банка, выберите «Оплата по QR» и наведите камеру (или откройте картинку с телефона и нажмите «Оплатить по QR из галереи»). Оплата идёт через СБП без комиссии.\n\nПосле оплаты пришлите, пожалуйста, подтверждение.',
    remind: 'Добрый день, {имя}! Хочу уточнить, удалось ли посмотреть расчёт? Цены держим до {до}. Если нужно поменять цвет, размеры или управление, пересчитаю сразу.'
  };
  const saved = () => { try { return JSON.parse(lsGet('jal_tpl') || '{}') || {}; } catch (e) { return {}; } };
  const text = k => saved()[k] || DEF[k] || '';
  const fill = (s, v) => String(s).replace(/\{([^{}]+)\}/g, (m, k) => (k in v ? v[k] : m));
  /* файл «шаблоны.txt»: блоки «[ключ]» и текст под ними */
  function parse(txt) {
    const out = {}; let k = null;
    String(txt || '').replace(/^﻿/, '').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\[([a-z_]+)\]\s*$/);
      if (m) { k = m[1]; out[k] = []; } else if (k) out[k].push(line);
    });
    Object.keys(out).forEach(x => { out[x] = out[x].join('\n').replace(/^\n+|\n+$/g, ''); if (!out[x]) delete out[x]; });
    return out;
  }
  function dump() { return Object.keys(DEF).map(k => '[' + k + ']\n' + DEF[k].replace(/^\n+/, '')).join('\n\n') + '\n'; }

  async function refresh() {
    const base = lsGet('jal_prices_url');
    if (!base) throw new Error('Сначала вставь ссылку на цены (вкладка «Цены»)');
    const j = await (await fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'files=1')).json();
    if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не отдал файлы'));
    let n = 0; const got = j.files || {};
    Object.keys(FILES).forEach(k => { if (got[k]) { lsSet(FILES[k], got[k]); n++; } });
    const t = parse(j.templates);
    if (Object.keys(t).length) lsSet('jal_tpl', JSON.stringify(t));
    lsSet('jal_drive_at', String(Date.now()));
    return { files: n, tpl: Object.keys(t).length, folder: j.folder || '' };
  }
  const keyOf = u => (u.match(/[?&]key=([^&]+)/) || [])[1] || '';
  /* общая база заказов: отправляем свои заказы (с метками правки и удаления), скрипт сливает с файлом на Диске и отдаёт общий список */
  let syncing = null;
  async function sync() {
    if (syncing) return syncing;
    const base = lsGet('jal_prices_url'); if (!base) throw new Error('Сначала вставь ссылку на цены (вкладка «Цены»)');
    return (syncing = (async () => {
      /* уходит только то, что изменилось после прошлой отправки; приходит только то, что принято сервером после прошлой синхронизации */
      const all = JalOrders.raw(), pushAt = lsGet('jal_push_at'), since = lsGet('jal_sync_since');
      const list = pushAt ? all.filter(o => String(o.upd || '') > pushAt) : all;
      const r = await fetch(base.split('?')[0], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: decodeURIComponent(keyOf(base)), sync: list, since }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не ответил (обнови скрипт)'));
      const got = j.orders || [], n = JalOrders.applyRemote(got);
      let mx = pushAt; list.concat(got).forEach(o => { if (String(o.upd || '') > mx) mx = String(o.upd); });
      if (mx) lsSet('jal_push_at', mx); if (j.now) lsSet('jal_sync_since', j.now);
      lsSet('jal_backup_at', String(Date.now())); return n;
    })().finally(() => { syncing = null; }));
  }
  const backup = sync, restore = () => { lsSet('jal_sync_since', ''); lsSet('jal_push_at', ''); return sync(); }; /* полная сверка в обе стороны */
  /* после правки заказа через несколько секунд отправляем в общую базу (тихо, без сообщений) */
  let tm = 0; window.addEventListener('jal-orders', () => { if (!lsGet('jal_prices_url')) return; clearTimeout(tm); tm = setTimeout(() => sync().catch(() => {}), 4000); });
  const b64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(new Error('файл не прочитался')); r.readAsDataURL(f); });
  /* письмо с файлами через скрипт: Apps Script шлёт с твоей почты; ответ читаем, чтобы знать, что письмо ушло */
  async function mail(to, subject, body, files) {
    const base = lsGet('jal_prices_url'); if (!base) throw new Error('Нет ссылки на скрипт (вкладка «Цены»)');
    const fl = []; for (const f of files) fl.push({ name: f.name, mime: f.type, b64: await b64(f) });
    const r = await fetch(base.split('?')[0], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: decodeURIComponent(keyOf(base)), mail: { to, subject, body, files: fl } }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Письмо не ушло');
    return j.sent;
  }
  /* реквизиты по ИНН через скрипт (DaData) */
  async function inn(q) {
    const base = lsGet('jal_prices_url'); if (!base) throw new Error('Нет ссылки на скрипт (вкладка «Цены»)');
    const j = await (await fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'inn=' + encodeURIComponent(q))).json();
    if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не ответил (обнови скрипт)'));
    return j;
  }
  let catFile = null;
  /* каталог: PDF «Каталог» из папки на Диске, берётся по требованию и запоминается до закрытия приложения */
  async function catalog() {
    if (catFile) return catFile;
    const base = lsGet('jal_prices_url'); if (!base) throw new Error('Нет ссылки на скрипт (вкладка «Цены»)');
    const j = await (await fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'catalog=1')).json();
    if (!j.ok) throw new Error(j.error || 'Скрипт не отдал каталог (обнови скрипт)');
    const bin = atob(j.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return (catFile = new File([u], 'Каталог.pdf', { type: j.mime || 'application/pdf' }));
  }
  /* авто-копия: раз в день или раз в неделю, если включено в Настройках и ссылка есть */
  setTimeout(() => { const m = +lsGet('jal_sched') || 0, age = Date.now() - (+lsGet('jal_backup_at') || 0);
    if (lsGet('jal_prices_url') && (m ? age > (m === 1 ? 20 * 3600e3 : 7 * 86400e3) : age > 6 * 3600e3)) sync().catch(() => {}); }, 6000);
  window.JalDrive = { sync, inn, mail, catalog, backup, restore, backupAt: () => +lsGet('jal_backup_at') || 0, refresh, text, fill, parse, dump, FILES, DEF, at: () => +lsGet('jal_drive_at') || 0 };
})();
