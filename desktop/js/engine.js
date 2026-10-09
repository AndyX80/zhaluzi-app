/* Движок расчёта десктопа = тот же код, что и на телефоне (../src/calc.js, calcscreen.js, cartscreen.js, limits.js).
   Здесь только загрузка цен: кэш в браузере и обновление из Google Таблицы по ссылке скрипта. */
(function () {
  const E = window.Eng = { ready: false, at: 0, err: '' };
  if (!window.JalCalcScreen || !window.JalCart) { E.err = 'Не загрузился движок расчёта'; return; }
  JalCalcScreen.render = () => {}; /* у телефонного кода есть экран, в десктопе он не нужен */
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  function withFx(sheets) {
    if (lsGet('jal_fx_auto') !== '0' || !sheets['Параметры']) return sheets;
    const v = parseFloat(lsGet('jal_fx').replace(',', '.')); if (!(v > 0)) return sheets;
    return Object.assign({}, sheets, { 'Параметры': sheets['Параметры'].map(r => r[0] === 'курс_usd' ? [r[0], v, r[2]] : r) });
  }
  E.apply = function (raw) {
    const sheets = withFx(raw); E.sheets = sheets;
    JalCalcScreen.setSheets(sheets); JalCart.setSheets(sheets); E.ready = true; E.err = '';
  };
  E.url = () => lsGet('jal_prices_url');
  E.load = function () {
    let s = null; try { s = JSON.parse(lsGet('jal_prices') || 'null'); } catch (e) {}
    E.at = +lsGet('jal_prices_at') || 0;
    if (s && s['Параметры']) { try { E.apply(s); return true; } catch (e) { E.err = 'Цены в браузере повреждены: ' + e.message; } }
    return false;
  };
  E.refresh = async function () {
    const u = E.url(); if (!u) throw new Error('Вставь ссылку на скрипт цен (кнопка ниже)');
    const j = await (await fetch(u)).json();
    if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : 'Таблица не отдала данные');
    try { localStorage.setItem('jal_prices', JSON.stringify(j.sheets)); localStorage.setItem('jal_prices_at', String(Date.now())); } catch (e) {}
    E.at = Date.now(); E.apply(j.sheets);
  };
  E.load();
  /* цены старше 3 часов обновляем тихо при запуске */
  setTimeout(() => { if (E.url() && navigator.onLine !== false && (!E.ready || Date.now() - E.at > 3 * 3600e3)) E.refresh().then(() => { if (window.App) App.render(); }).catch(() => {}); }, 1200);
})();
