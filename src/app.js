/* Экран «Расчёт» и корзина. Цены: xlsx из таблицы Андрея, хранится в телефоне (localStorage). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const COLL = [['Амиго', 'Стандарт'], ['Интерьер', 'Классик'], ['РДО', 'Урбан'], ['Форум', 'Тренд'], ['Уют', 'Премиум']];
  const MATS = ['Дерево', 'Бамбук', 'Пластик'];
  const FIXES = ['Ниж. фиксация', 'Струна', 'Магниты'];
  const OPTS = ['Тесьма', 'Цепочка', 'Окраска'];
  const rub = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const st = { qty: 1, sup: 'Амиго', mat: 'Дерево', lam: 50, fix: null, opts: [], cart: [], show: false, P: null, last: null };
  
  function applyFx(sheets) {
    if (lsGet('jal_fx_auto') !== '0' || !sheets['Параметры']) return sheets;
    const v = parseFloat(lsGet('jal_fx').replace(',', '.')); if (!(v > 0)) return sheets;
    return Object.assign({}, sheets, { 'Параметры': sheets['Параметры'].map(r => r[0] === 'курс_usd' ? [r[0], v, r[2]] : r) });
  }
  function setPrices(raw) {
    const sheets = applyFx(raw); st.sheets = sheets;
    st.P = JalCalc.makePrice(sheets);
    $('load').hidden = true; $('calcRoot').hidden = false;
    JalCart.setSheets(sheets); JalCalcScreen.setSheets(sheets); JalCalcScreen.render();
    if (!$('settingsRoot').hidden) JalSettingsScreen.render();
  }
  window.JalSetPrices = setPrices; // для тестов

  function loadFile(file) {
    const rd = new FileReader();
    rd.onload = () => {
      const wb = XLSX.read(rd.result, { type: 'array' });
      const sheets = {};
      wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null }); });
      try { localStorage.setItem('jal_prices', JSON.stringify(sheets)); localStorage.setItem('jal_prices_at', String(Date.now())); } catch (e) {}
      setPrices(sheets);
    };
    rd.readAsArrayBuffer(file);
  }

  const drawCart = () => { if (window.JalCart && st.P) { const r = $('cartRoot'); if (!r.hidden) JalCart.render(); } };

  /* Реестр экранов: register(имя, { root, render, needP }). Свои экраны сами рисуют шапку и нижнюю навигацию. */
  const SCREENS = {};
  function register(name, o) { SCREENS[name] = o; }
  function tab(name) {
    Object.keys(SCREENS).forEach(k => { const s = SCREENS[k]; $(s.root).hidden = k !== name || (s.needP && !st.P); });
    $('doc').hidden = name !== 'doc';
    const sc = SCREENS[name];
    $('load').hidden = !!st.P || !(sc && sc.needP);
    document.body.setAttribute('data-tab', name);
    if (sc) document.body.setAttribute('data-own', '1'); else document.body.removeAttribute('data-own');
    if (sc && (st.P || !sc.needP)) sc.render(name);
    window.scrollTo(0, 0);
  }
  register('calc', { root: 'calcRoot', needP: true, render: () => JalCalcScreen.render() });
  register('cart', { root: 'cartRoot', needP: true, render: () => JalCart.render() });
  register('ord', { root: 'ordersRoot', render: n => JalOrdersScreen.render(n) });
  register('send', { root: 'sendRoot', render: () => JalSendScreen.render() });
  register('compare', { root: 'compareRoot', needP: true, render: () => JalCompareScreen.render() });
  register('set', { root: 'settingsRoot', render: () => JalSettingsScreen.render() });
  register('order', { root: 'orderRoot', needP: true, render: () => JalOrderScreen.render() });
  register('orderOpen', { root: 'orderOpenRoot', needP: true, render: n => JalOrdersScreen.render(n) });
  const GO = { Main: 'calc', Cart: 'cart', Orders: 'ord', Settings: 'set', OrderOpen: 'orderOpen', Order: 'order' };
  function go(k) {
    if (GO[k]) { tab(GO[k]); return; }
    if (k === 'Kp') { openKp(); return; }
    if (k === 'Send') {
      const cur = document.body.getAttribute('data-tab');
      st.sendBack = cur;
      if (cur === 'order') { const o = JalOrderScreen.saveNow(); if (!o) return; st.sendNo = o.no; }
      else if (cur === 'orderOpen') st.sendNo = JalOrdersScreen.F.openNo;
      else if (cur !== 'send') st.sendNo = null;
      if (cur === 'send') return;
      tab('send'); return;
    }
    alert('Этот экран добавим следующим шагом.');
  }

  function showDoc(fn, o, back) {
    st.curBack = back || st.curBack;
    const sig = { sign: lsGet('jal_sign'), stamp: lsGet('jal_stamp') };
    if (JalDocScreens.show(fn, o, sig)) $('docBody').innerHTML = ''; else { JalDocScreens.hideAll(); $('docBody').innerHTML = JalDocs[fn](o, sig); }
    $('sigBox').hidden = fn !== 'dogovorHtml';
    st.curDoc = [fn, o]; tab('doc');
  }
  function pickImg(id, key) {
    $(id).onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { localStorage.setItem(key, rd.result); } catch (er) { alert('Картинка слишком большая'); } if (st.curDoc) showDoc(st.curDoc[0], st.curDoc[1]); };
      rd.readAsDataURL(f);
    };
  }
  pickImg('sigFile', 'jal_sign'); pickImg('stampFile', 'jal_stamp');

  async function fetchPrices(u) {
    const j = await (await fetch(u)).json();
    if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : 'Таблица не отдала данные');
    try { localStorage.setItem('jal_prices', JSON.stringify(j.sheets)); localStorage.setItem('jal_prices_url', u); localStorage.setItem('jal_prices_at', String(Date.now())); } catch (e) {}
    setPrices(j.sheets);
  }
  async function loadUrl() {
    const u = $('url').value.trim(), er = $('urlErr'); er.textContent = '';
    if (!u) return;
    $('urlGo').disabled = true; $('urlGo').textContent = 'Загружаю…';
    try { await fetchPrices(u); } catch (e) { er.textContent = 'Не получилось: ' + (e.message || e); er.className = 'sub err'; }
    $('urlGo').disabled = false; $('urlGo').textContent = 'Загрузить цены';
  }
  $('urlGo').onclick = loadUrl;
  try { $('url').value = localStorage.getItem('jal_prices_url') || ''; } catch (e) {}
  $('file').onchange = e => e.target.files[0] && loadFile(e.target.files[0]);
  $('tCalc').onclick = () => tab('calc');
  $('tCart').onclick = () => tab('cart');
  $('tOrd').onclick = () => tab('ord');
  $('tSet').onclick = () => tab('set');
  $('docBack').onclick = () => { const b = st.curBack; st.curBack = null; tab(b || 'ord'); };
  $('docPrint').onclick = () => window.print();
  /* нижние плашки экранов закрывают конец списка: отступ внизу = реальная высота плашек (с учётом размера шрифта) */
  function fitBottom() {
    const m = document.querySelector('main:not([hidden])'); if (!m) return;
    let top = innerHeight; document.querySelectorAll('div[style*="position: fixed"][style*="z-index: 5"],#bottom').forEach(e => { const r = e.getBoundingClientRect(); if (r.height > 0 && r.width > 0 && r.top < top) top = r.top; });
    const need = Math.ceil(innerHeight - top) + 4; if (need > 40 && need < 900) m.style.paddingBottom = need + 'px';
  }
  setInterval(fitBottom, 400); addEventListener('resize', fitBottom);
  const docOut = (btn, kind) => async () => {
    if (!st.curDoc) return; const msg = $('docMsg'), old = btn.textContent; btn.disabled = true; btn.textContent = 'Готовлю…'; msg.textContent = '';
    try { const f = await JalExport[kind](st.curDoc[0], st.curDoc[1]); JalExport.save(f); msg.textContent = 'Файл «' + f.name + '» готов.'; }
    catch (e) { msg.textContent = 'Не получилось: ' + (e.message || e); }
    btn.disabled = false; btn.textContent = old;
  };
  $('docPdf').onclick = docOut($('docPdf'), 'pdf'); $('docWord').onclick = docOut($('docWord'), 'docx');
  const setShow = v => { st.show = v; try { localStorage.setItem('jal_profit', v ? '1' : '0'); } catch (e) {} drawCart(); if (window.JalCalcScreen && st.P) JalCalcScreen.render(); };
  try { if (localStorage.getItem('jal_profit') === '1') setShow(true); } catch (e) {}

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('jal_prices') || 'null'); } catch (e) {}
  if (saved) setPrices(saved); else $('load').hidden = false;
  function openKp() {
    const o = Object.assign({ no: '—', created: new Date().toISOString(), name: '', pre: '100', preU: '%', term: '12' }, JalCart.toOrder());
    showDoc('kpHtml', o, 'cart');
  }
  function openKpVars() {
    const o = Object.assign({ no: '—', created: new Date().toISOString(), name: '', pre: '100', preU: '%', term: '12' }, JalCart.toOrder());
    showDoc('kpVarHtml', o, 'cart');
  }
  window.JalApp = { setPricesRaw: setPrices, fetchPrices, loadFile, setShow, st, tab, rub, openKp, openKpVars, showDoc, go, register, GO };
  window.JalTab = tab; tab('calc');
  drawCart();
})();
