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
  try { st.cart = JSON.parse(localStorage.getItem('jal_cart') || '[]'); } catch (e) {}

  function setPrices(sheets) {
    st.P = JalCalc.makePrice(sheets);
    $('load').hidden = true; $('calc').hidden = false;
    $('pstat').textContent = 'v8';
    draw();
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

  function tabs(box, items, isOn, onClick) {
    box.innerHTML = '';
    box.style.setProperty('--n', items.length);
    items.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.className = 'tab'; b.textContent = label;
      b.setAttribute('aria-pressed', isOn(val));
      b.onclick = () => { onClick(val); draw(); };
      box.appendChild(b);
    });
  }
  function checkRows(box, items, isOn, onClick) {
    box.innerHTML = '';
    items.forEach(([val, label]) => {
      const b = document.createElement('button');
      b.className = 'rowc'; b.innerHTML = '<span class="cb">✓</span><span></span>';
      b.lastChild.textContent = label;
      b.setAttribute('aria-pressed', isOn(val));
      b.onclick = () => { onClick(val); draw(); };
      box.appendChild(b);
    });
  }

  function colorList() {
    const P = st.P;
    if (st.sup === 'Амиго') return P.amigo.filter(r => r['Продукт'] === st.mat + ' ' + st.lam).map(r => [r['Цвет'], r['Цвет']]);
    if (st.sup === 'Форум') return P.forum.map(r => [r['Код'], r['Код'] + (r['Название'] ? ' ' + r['Название'] : '')]);
    return [];
  }

  function params() {
    return { color: $('color').value || null, opts: st.opts, fix: st.fix };
  }

  function draw() {
    if (!st.P) return;
    tabs($('sup'), COLL.map(([s, n]) => [s, n]), v => v === st.sup, v => { st.sup = v; });
    tabs($('mat'), MATS.map(m => [m, m]), v => v === st.mat, v => { st.mat = v; });
    tabs($('lam'), [[25, '25 мм'], [50, '50 мм']], v => v === st.lam, v => { st.lam = v; });
    tabs($('fix'), [[null, 'Без фиксации']].concat(FIXES.map(f => [f, f])), v => v === st.fix, v => { st.fix = v; });
    checkRows($('opt'), OPTS.map(f => [f, f]), v => st.opts.includes(v), v => {
      st.opts = st.opts.includes(v) ? st.opts.filter(x => x !== v) : st.opts.concat(v);
    });
    const cl = colorList(), sel = $('color'), keep = sel.value;
    $('colbox').hidden = !cl.length;
    sel.innerHTML = cl.map(([v, l]) => '<option value="' + v.replace(/"/g, '&quot;') + '">' + l + '</option>').join('');
    if (cl.some(([v]) => v === keep)) sel.value = keep;
    recalc();
  }

  function recalc() {
    const W = +$('W').value / 10, H = +$('H').value / 10;
    const pr = $('price'), note = $('note'), prof = $('profit');
    st.last = null; $('add').disabled = true; prof.hidden = true;
    if (!W || !H) { pr.textContent = '—'; note.textContent = 'Введи ширину и высоту в миллиметрах'; note.className = 'sub'; return; }
    const r = JalCalc.calc(st.P, st.sup, st.mat, st.lam, W, H, params());
    if (!r.ok) { pr.textContent = '—'; note.textContent = r.msg; note.className = 'sub err'; return; }
    pr.textContent = rub(r.price);
    note.textContent = r.msg; note.className = 'sub' + (r.msg ? ' err' : '');
    prof.hidden = !st.show; prof.textContent = 'закуп ' + rub(r.zakup) + ' · прибыль ' + rub(r.profit);
    st.last = { sup: st.sup, mat: st.mat, lam: st.lam, W, H, o: params(), price: r.price, profit: r.profit };
    $('add').disabled = false;
  }

  function drawCart() {
    $('badge').textContent = st.cart.length; $('badge').hidden = !st.cart.length;
    const box = $('cartList');
    box.innerHTML = st.cart.length ? '' : '<div class="sub">Пока пусто</div>';
    st.cart.forEach((it, i) => {
      const d = document.createElement('div'); d.className = 'item';
      const col = it.o.color ? ' · ' + it.o.color : '';
      const ex = [it.o.fix].concat(it.o.opts).filter(Boolean).join(', ');
      d.innerHTML = '<div><b>' + it.mat + ' ' + it.lam + ' · ' + Math.round(it.W * 10) + '×' + Math.round(it.H * 10) + ' мм</b><div class="sub">' +
        (COLL.find(c => c[0] === it.sup) || [0, it.sup])[1] + col + (ex ? ' · ' + ex : '') + '</div></div>' +
        '<div style="text-align:right"><b>' + rub(it.price) + '</b><br><button class="x" aria-label="Убрать">×</button></div>';
      d.querySelector('.x').onclick = () => { st.cart.splice(i, 1); save(); drawCart(); };
      box.appendChild(d);
    });
    $('total').textContent = rub(st.cart.reduce((a, b) => a + b.price, 0));
    const tp = $('totalProfit'); tp.hidden = !st.show;
    tp.textContent = 'Прибыль ' + rub(st.cart.reduce((a, b) => a + b.profit, 0));
  }
  const save = () => { try { localStorage.setItem('jal_cart', JSON.stringify(st.cart)); } catch (e) {} };

  const NAV = { calc: 'tCalc', cart: 'tCart', ord: 'tOrd', set: 'tSet' };
  function tab(name) {
    $('calc').hidden = name !== 'calc' || !st.P; $('cart').hidden = name !== 'cart';
    $('orders').hidden = name !== 'ord'; $('form').hidden = name !== 'form'; $('doc').hidden = name !== 'doc';
    $('settings').hidden = name !== 'set';
    $('load').hidden = name === 'set' ? false : (!!st.P || name !== 'calc');
    document.body.setAttribute('data-tab', name);
    Object.keys(NAV).forEach(k => { const b = $(NAV[k]); if (k === name) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    if (name === 'cart') drawCart(); if (name === 'ord') drawOrders();
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
  const setQty = n => { st.qty = Math.max(1, Math.min(99, n)); $('qv').textContent = st.qty; };
  $('qm').onclick = () => setQty(st.qty - 1); $('qp').onclick = () => setQty(st.qty + 1);
  $('file').onchange = e => e.target.files[0] && loadFile(e.target.files[0]);
  ['W', 'H', 'color'].forEach(id => $(id).addEventListener('input', recalc));
  $('add').onclick = () => { if (st.last) { for (let k = 0; k < st.qty; k++) st.cart.push(Object.assign({}, st.last)); save(); drawCart(); $('add').textContent = 'Добавлено ✓'; setTimeout(() => $('add').textContent = 'В корзину', 900); } };
  $('clear').onclick = () => { st.cart = []; save(); drawCart(); };
  $('tCalc').onclick = () => tab('calc');
  $('tCart').onclick = () => tab('cart');
  $('tOrd').onclick = () => tab('ord');
  $('tSet').onclick = () => tab('set');
  $('docBack').onclick = () => tab('ord');
  $('docPrint').onclick = () => window.print();
  $('mkOrder').onclick = () => { if (st.cart.length) tab('form'); };
  $('fSave').onclick = () => {
    const v = id => $(id).value.trim();
    JalOrders.create({ name: v('fName'), phone: v('fPhone'), addr: v('fAddr'), meas: v('fMeas'), inst: v('fInst'),
      buyer: st.buyer, company: v('fCompany'), inn: v('fInn'), uaddr: v('fUaddr'), email: v('fEmail'),
      delivery: +v('fDeliv') || 0, measurer: v('fMeasurer'),
      pre: v('fPre') || '100', preU: $('fPreU').value, term: v('fTerm') || '12', note: v('fNote') }, st.cart);
    st.cart = []; save(); drawCart(); tab('ord');
  };
  const setShow = v => { st.show = v; $('setProfit').setAttribute('aria-pressed', v); try { localStorage.setItem('jal_profit', v ? '1' : '0'); } catch (e) {} recalc(); drawCart(); };
  $('setProfit').onclick = () => setShow(!st.show);
  try { if (localStorage.getItem('jal_profit') === '1') setShow(true); } catch (e) {}

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('jal_prices') || 'null'); } catch (e) {}
  if (saved) setPrices(saved); else $('load').hidden = false;
  window.JalTab = tab; tab('calc');
  drawCart();
})();
