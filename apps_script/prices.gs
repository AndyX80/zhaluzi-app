// Отдаёт приложению цены (листы таблицы) и файлы из папки на Google Диске (только чтение).
// KEY — твой пароль (латиница и цифры), он же стоит в ссылке приложения. Не меняй его.
const KEY = 'ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ';
// Ключ DaData для поиска реквизитов по ИНН (бесплатный, dadata.ru → Профиль → API-ключи). Вставь между кавычками.
const DADATA = '';
// Папка на Google Диске с подписью, печатью, QR-кодами и файлом шаблонов.
const FOLDER = 'Жалюзи-приложение';

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== KEY) return out_({ ok: false, error: 'bad key' });
  if (e.parameter.files) return files_();
  if (e.parameter.orders) return ordersGet_();
  if (e.parameter.catalog) return catalog_();
  if (e.parameter.inn) return inn_(e.parameter.inn);
  const sheets = {};
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sh) {
    sheets[sh.getName()] = sh.getDataRange().getValues();
  });
  return out_({ ok: true, sheets: sheets });
}

// Файлы папки: подпись, печать, QR-коды (картинки; расширение любое) и «шаблоны» (текст).
function files_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  if (!it.hasNext()) return out_({ ok: false, error: 'Папка «' + FOLDER + '» не найдена на Диске' });
  const folder = it.next(), files = {}, list = folder.getFiles();
  let templates = '';
  while (list.hasNext()) {
    const f = list.next(), name = f.getName().replace(/\.[^.]+$/, '').toLowerCase();
    if (name === 'шаблоны') templates = f.getBlob().getDataAsString('UTF-8');
    else if (/^image\//.test(f.getMimeType())) files[name] = 'da' + 'ta:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
  }
  return out_({ ok: true, folder: FOLDER, files: files, templates: templates });
}

// Реквизиты по ИНН (юрлицо или ИП) через DaData.
function inn_(q) {
  q = String(q).replace(/\D/g, '');
  if (!DADATA) return out_({ ok: false, error: 'В скрипте не вставлен ключ DaData' });
  if (q.length !== 10 && q.length !== 12) return out_({ ok: false, error: 'ИНН: 10 цифр (организация) или 12 (ИП)' });
  try {
    const r = UrlFetchApp.fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: 'Token ' + DADATA }, payload: JSON.stringify({ query: q })
    });
    if (r.getResponseCode() === 401 || r.getResponseCode() === 403) return out_({ ok: false, error: 'DaData не принял ключ' });
    const s = (JSON.parse(r.getContentText()).suggestions || [])[0];
    if (!s) return out_({ ok: false, error: 'Не нашлось организации с таким ИНН' });
    const d = s.data, ip = d.type === 'INDIVIDUAL', f = d.fio || {};
    return out_({ ok: true, type: ip ? 'ip' : 'yur', inn: d.inn, ogrn: d.ogrn || '',
      name: ip ? [f.surname, f.name, f.patronymic].filter(Boolean).join(' ') : ((d.name && d.name.short_with_opf) || s.value),
      address: (d.address && d.address.value) || '', head: (d.management && d.management.name) || '',
      state: (d.state && d.state.status) || '' });
  } catch (x) { return out_({ ok: false, error: String(x) }); }
}

// Каталог: файл «Каталог» (PDF) из той же папки на Диске, отдаётся одним файлом в base64.
function catalog_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  if (!it.hasNext()) return out_({ ok: false, error: 'Папка «' + FOLDER + '» не найдена на Диске' });
  const list = it.next().getFiles();
  while (list.hasNext()) {
    const f = list.next();
    if (f.getName().toLowerCase().indexOf('каталог') === 0 && !/^image\//.test(f.getMimeType())) {
      return out_({ ok: true, name: f.getName(), mime: f.getMimeType(), b64: Utilities.base64Encode(f.getBlob().getBytes()) });
    }
  }
  return out_({ ok: false, error: 'В папке «' + FOLDER + '» нет файла «Каталог.pdf» (имя должно начинаться со слова «Каталог»)' });
}

// Резервная копия заказов: приложение присылает JSON, он кладётся в папку на Диске файлом «заказы.json».
function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}
function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad body' }); }
  if (d.key !== KEY) return out_({ ok: false, error: 'bad key' });
  if (d.mail) return mail_(d.mail);
  if (d.sync) return sync_(d.sync);
  const folder = folder_(), old = folder.getFilesByName('заказы.json');
  while (old.hasNext()) old.next().setTrashed(true);
  folder.createFile('заказы.json', JSON.stringify(d.orders), 'application/json');
  return out_({ ok: true, n: (d.orders || []).length });
}
// Письмо с вложениями (PDF, Word): приложение присылает адрес, тему, текст и файлы в base64.
function mail_(m) {
  try {
    const atts = (m.files || []).map(function (f) {
      return Utilities.newBlob(Utilities.base64Decode(f.b64), f.mime || 'application/octet-stream', f.name);
    });
    MailApp.sendEmail({ to: m.to, subject: m.subject || 'Жалюзи-СПБ', body: m.body || '', attachments: atts, name: 'Жалюзи-СПБ' });
    return out_({ ok: true, sent: atts.length });
  } catch (x) { return out_({ ok: false, error: String(x) }); }
}
// Общая база заказов (телефон и десктоп): слияние по uid, побеждает более поздняя правка (upd). Блокировка, чтобы два устройства не писали одновременно.
function sync_(list) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const folder = folder_(), it = folder.getFilesByName('заказы.json');
    let cur = []; if (it.hasNext()) { try { cur = JSON.parse(it.next().getBlob().getDataAsString('UTF-8')); } catch (x) { cur = []; } }
    const m = {};
    cur.forEach(function (o) { m[o.uid || ('n' + o.no)] = o; });
    (list || []).forEach(function (o) { const k = o.uid || ('n' + o.no), c = m[k]; if (!c || String(o.upd || '') > String(c.upd || '')) m[k] = o; });
    const out = Object.keys(m).map(function (k) { const o = m[k]; if (!o.uid) o.uid = k; return o; });
    const old = folder.getFilesByName('заказы.json'); while (old.hasNext()) old.next().setTrashed(true);
    folder.createFile('заказы.json', JSON.stringify(out), 'application/json');
    return out_({ ok: true, n: out.length, orders: out });
  } catch (x) { return out_({ ok: false, error: String(x) }); } finally { lock.releaseLock(); }
}
function ordersGet_() {
  const it = folder_().getFilesByName('заказы.json');
  return out_({ ok: true, orders: it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString('UTF-8')) : [] });
}

// Одноразово (и после каждого обновления кода): выбери эту функцию и нажми «Выполнить», чтобы Google выдал доступ к Диску.
function razreshenie() {
  DriveApp.getFoldersByName(FOLDER);
  LockService.getScriptLock();
  DriveApp.createFile('t.txt', 't').setTrashed(true);
  MailApp.getRemainingDailyQuota();
  UrlFetchApp.fetch('https://dadata.ru');
}
