// Отдаёт приложению цены (листы таблицы) и файлы из папки на Google Диске (только чтение).
// KEY — твой пароль (латиница и цифры), он же стоит в ссылке приложения. Не меняй его.
const KEY = 'ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ';
// Папка на Google Диске с подписью, печатью, QR-кодами и файлом шаблонов.
const FOLDER = 'Жалюзи-приложение';

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== KEY) return out_({ ok: false, error: 'bad key' });
  if (e.parameter.files) return files_();
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
    else if (/^image\//.test(f.getMimeType())) files[name] = 'data:' + f.getMimeType() + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
  }
  return out_({ ok: true, folder: FOLDER, files: files, templates: templates });
}
