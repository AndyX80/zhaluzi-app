/* Экран «Расчёт» и корзина. Цены: xlsx из таблицы Андрея, хранится в телефоне (localStorage). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const COLL = [['Амиго', 'Стандарт'], ['Интерьер', 'Классик'], ['РДО', 'Урбан'], ['Форум', 'Тренд'], ['Уют', 'Премиум']];
  const MATS = ['Дерево', 'Бамбук', 'Пластик'];
  const FIXES = ['Ниж. фиксация', 'Струна', 'Магниты'];
  const OPTS = ['Тесьма', 'Цепочка', 'Окраска'];
  const rub = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  const st = { qty: 1, sup: 'Амиго', mat: 'Дерево', lam: 50, fix: null, opts: [], cart: [], show: false, P: null, last: null };
  
  function setPrices(sheets) {
    st.P = JalCalc.makePrice(sheets);
    $('load').hidden = true; $('calcRoot').hidden = false;
    JalCart.setSheets(sheets); JalCalcScreen.setSheets(sheets); JalCalcScreen.render();
  }
  window.JalSetPrices = setPrices; // для тестов

  function loadFile(file) {
    const rd = new FileReader();
    rd.onload = () => {
      const wb = XLSX.read(rd.result, { type: 'array' });
      const sheets = {};
      wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null }); });
      try { localStorage.setItem('jal_prices', JSON.stringify(sheets)); } catch (e) {}
      setPrices(sheets);
    };
    rd.readAsArrayBuffer(file);
  }

  const drawCart = () => { if (window.JalCart && st.P) { const r = $('cartRoot'); if (!r.hidden) JalCart.render(); } };

  const NAV = { calc: 'tCalc', cart: 'tCart', ord: 'tOrd', set: 'tSet' };
  function tab(name) {
    $('calcRoot').hidden = name !== 'calc' || !st.P; $('cartRoot').hidden = name !== 'cart' || !st.P;
    $('orders').hidden = name !== 'ord'; $('form').hidden = name !== 'form'; $('doc').hidden = name !== 'doc';
    $('settings').hidden = name !== 'set';
    $('load').hidden = name === 'set' ? false : (!!st.P || name !== 'calc');
    document.body.setAttribute('data-tab', name);
    Object.keys(NAV).forEach(k => { const b = $(NAV[k]); if (k === name) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (name === 'cart' && st.P) JalCart.render(); if (name === 'ord') drawOrders(); if (name === 'calc' && st.P) JalCalcScreen.render();
    window.scrollTo(0, 0);
  }

  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  function showDoc(fn, o) {
    const sig = { sign: lsGet('jal_sign'), stamp: lsGet('jal_stamp') };
    $('docBody').innerHTML = JalDocs[fn](o, sig); $('sigBox').hidden = fn !== 'dogovorHtml';
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
  st.buyer = 'физ';
  function setBuyer(b) { st.buyer = b; $('urBox').hidden = b !== 'юр'; $('bFiz').setAttribute('aria-pressed', b === 'физ'); $('bUr').setAttribute('aria-pressed', b === 'юр'); }
  $('bFiz').onclick = () => setBuyer('физ'); $('bUr').onclick = () => setBuyer('юр');

  function drawOrders() {
    const list = JalOrders.load(), box = $('ordList');
    $('ordEmpty').hidden = list.length > 0; box.innerHTML = '';
    list.forEach(o => {
      const sum = JalDocs.orderTotal(o);
      const d = document.createElement('div'); d.className = 'card';
      d.innerHTML = '<div class="item" style="border:0;padding:0"><div><b>№ ' + o.no + ' · ' + (o.name || 'без имени') + '</b>' +
        '<div class="sub">' + [o.phone, o.addr].filter(Boolean).join(' · ') + '</div>' +
        (o.meas ? '<div class="sub">Замер: ' + o.meas.replace('T', ' ') + '</div>' : '') +
        (o.inst ? '<div class="sub">Монтаж: ' + o.inst.replace('T', ' ') + '</div>' : '') +
        '</div><b>' + rub(sum) + '</b></div><div class="row" style="margin-top:10px"></div>';
      const r = d.querySelector('.row');
      JalOrders.STATUSES.forEach(s => {
        const b = document.createElement('button'); b.className = 'chip'; b.textContent = s;
        b.setAttribute('aria-pressed', o.status === s);
        b.onclick = () => { JalOrders.setStatus(o.no, s); drawOrders(); };
        r.appendChild(b);
      });
      [['КП (PDF)', 'kpHtml'], ['Замерник', 'zamernikHtml'], ['Договор', 'dogovorHtml']].forEach(([lbl, fn]) => {
        const b = document.createElement('button'); b.className = 'chip'; b.textContent = lbl;
        b.onclick = () => { showDoc(fn, o); };
        r.appendChild(b);
      });
      box.appendChild(d);
    });
  }

  async function loadUrl() {
    const u = $('url').value.trim(), er = $('urlErr'); er.textContent = '';
    if (!u) return;
    $('urlGo').disabled = true; $('urlGo').textContent = 'Загружаю…';
    try {
      const j = await (await fetch(u)).json();
      if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : 'Таблица не отдала данные');
      try { localStorage.setItem('jal_prices', JSON.stringify(j.sheets)); localStorage.setItem('jal_prices_url', u); } catch (e) {}
      setPrices(j.sheets);
    } catch (e) { er.textContent = 'Не получилось: ' + (e.message || e); er.className = 'sub err'; }
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
  $('fSave').onclick = () => {
    const v = id => $(id).value.trim();
    const co = JalCart.toOrder();
    if (!co.items.length) { alert('Корзина пуста'); return; }
    JalOrders.create({ priced: true, disc: co.disc, needDog: co.needDog, name: v('fName'), phone: v('fPhone'), addr: v('fAddr'), meas: v('fMeas'), inst: v('fInst'),
      buyer: st.buyer, company: v('fCompany'), inn: v('fInn'), uaddr: v('fUaddr'), email: v('fEmail'),
      delivery: co.delivery, measurer: v('fMeasurer'),
      pre: v('fPre') || '100', preU: $('fPreU').value, term: v('fTerm') || '12', note: v('fNote') }, co.items);
    JalCart.clear(); tab('ord');
  };
  const setShow = v => { st.show = v; $('setProfit').setAttribute('aria-pressed', v); try { localStorage.setItem('jal_profit', v ? '1' : '0'); } catch (e) {} drawCart(); if (window.JalCalcScreen && st.P) JalCalcScreen.render(); };
  $('setProfit').onclick = () => setShow(!st.show);
  try { if (localStorage.getItem('jal_profit') === '1') setShow(true); } catch (e) {}

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('jal_prices') || 'null'); } catch (e) {}
  if (saved) setPrices(saved); else $('load').hidden = false;
  function openKp() {
    const o = Object.assign({ no: '—', created: new Date().toISOString(), name: '', pre: '100', preU: '%', term: '12' }, JalCart.toOrder());
    showDoc('kpHtml', o); st.curBack = 'cart';
  }
  window.JalApp = { st, tab, rub, openKp };
  window.JalTab = tab; tab('calc');
  drawCart();
})();
