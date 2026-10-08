// Отдаёт все листы таблицы «Цены для приложения» приложению (только чтение).
// KEY — придумай свой пароль (латиница и цифры), он же вставляется в ссылку приложения.
const KEY = 'ЗАМЕНИ_НА_СВОЙ_ПАРОЛЬ';

function doGet(e) {
  if (!e || !e.parameter || e.parameter.key !== KEY) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'bad key' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const sheets = {};
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sh) {
    sheets[sh.getName()] = sh.getDataRange().getValues();
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true, sheets: sheets }))
    .setMimeType(ContentService.MimeType.JSON);
}
