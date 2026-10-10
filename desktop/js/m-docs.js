/* Документы заказа в десктопе: КП, КП на три варианта, замерник, договор. Те же формы, что на телефоне (../src/docscreens.js, шаблоны ../tpl). */
(function () {
  const A = App, e = A.esc;
  const TPL = [['tpl_docKp', 'docKp'], ['tpl_docKpVar', 'docKpVar'], ['tpl_docBlank', 'docBlank'], ['tpl_docDog', 'docDog']];
  const ROOTS = ['docKpRoot', 'docKpVarRoot', 'docDogRoot', 'docBlankRoot'];
  const NAMES = { kpHtml: 'КП', kpVarHtml: 'КП: три варианта', zamernikHtml: 'Замерный лист', dogovorHtml: 'Договор' };
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (x) { return ''; } };
  let ready = null, cur = null;

  /* шаблоны лежат отдельными файлами; в телефонной сборке они вшиты в index.html */
  const load = () => ready || (ready = Promise.all(TPL.map(t => fetch('../tpl/' + t[1] + '.html?v=57').then(r => { if (!r.ok) throw new Error('нет шаблона ' + t[1]); return r.text(); }).then(h => {
    const el = document.createElement('template'); el.id = t[0]; el.innerHTML = h.replace(/src="assets\//g, 'src="../assets/'); document.body.appendChild(el);
  }))).catch(x => { ready = null; throw x; }));

  /* подпись и печать берутся с Диска тем же скриптом, что цены и заказы */
  const FILES = { podpis: 'jal_sign', pechat: 'jal_stamp' };
  async function sigs() {
    if (!lsGet('jal_sign') || !lsGet('jal_stamp')) {
      const base = lsGet('jal_prices_url');
      if (base) { try {
        const j = await (await fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'files=1')).json();
        if (j.ok) Object.keys(FILES).forEach(k => { if (j.files && j.files[k]) { try { localStorage.setItem(FILES[k], j.files[k]); } catch (x) {} } });
      } catch (x) {} }
    }
    return { sign: lsGet('jal_sign'), stamp: lsGet('jal_stamp') };
  }

  const rec = uid => DB.raw().find(r => r.uid === uid && !r.del && !r.legacy);
  /* заказ для документов: запись + пересчитанные варианты КП из снимка корзины */
  function orderOf(r) {
    const o = Object.assign({}, r); if (r.phone2) o.phone = [r.phone, r.phone2].filter(Boolean).join(', ');
    if (r.cart && r.cart.cart) { try { const n = JalCart.toOrder(r.cart); o.vars = n.vars; if (n.items.length === (r.items || []).length) o.items = r.items.map((it, i) => Object.assign({}, it, { pv: n.items[i].pv })); } catch (x) {} }
    return o;
  }

  function overlay() {
    let ov = document.getElementById('docov');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'docov';
      ov.innerHTML = '<div class="dtool"><b id="docttl"></b><span class="sp"></span><button class="btn sm" data-a="docprint">Печать</button><button class="btn sm" data-a="docpdf">Скачать PDF</button><button class="btn sm" data-a="docword">Скачать Word</button><button class="btn sm pri" data-a="docclose">Закрыть</button></div>' +
        '<div class="dbody">' + ROOTS.map(id => '<div id="' + id + '" class="docp" hidden></div>').join('') + '</div>';
      document.body.appendChild(ov);
    }
    return ov;
  }
  async function show(fn, o, title) {
    A.toast('Готовлю документ…');
    try {
      await Promise.all([load(), docLibs()]);
      const sig = await sigs();
      cur = { fn, o, sig };
      const ov = overlay(); ov.hidden = false; document.getElementById('docttl').textContent = NAMES[fn] + ' № ' + (title || o.no);
      document.body.classList.add('docopen');
      JalDocScreens.show(fn, o, sig);
      if (!sig.sign || !sig.stamp) A.toast('Подписи или печати на Диске не нашёл: документ без них');
    } catch (x) { cur = null; A.toast('Документ не открылся: ' + (x && x.message || x)); try { console.error(x); } catch (y) {} }
  }
  function open(fn, uid) {
    const r = rec(uid); if (!r) { A.toast('Заказ не найден'); return; }
    if (!(r.items || []).length) { A.toast('В заказе нет изделий'); return; }
    return show(fn, orderOf(r));
  }
  /* КП из корзины без оформления (как на телефоне); замерник и договор требуют сохранённого заказа */
  A.cartDoc = fn => {
    const J = JC(), C = J.C;
    if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    if (fn === 'kpHtml' || fn === 'kpVarHtml') {
      const co = J.toOrder(); if (!co.items.length) { A.toast('В корзине нет изделий с ценой'); return; }
      const r0 = C.editNo && DB.byKey(C.editNo), O = A.calcO ? A.calcO() : null, live = O && (O.open || O.fresh || !r0), src = live ? O : (r0 || O || {});
      const yur = live && O.ct === 'yur', cl = live ? ((yur ? O.repr.trim() || O.company.trim() : O.name.trim()) || '') : (r0 && (r0.name || r0.company) || '');
      const ph = [src.phone, src.phone2].filter(Boolean).join(', ');
      return show(fn, Object.assign({ no: r0 && r0.no || '—', created: new Date().toISOString(), name: cl, phone: ph, email: src.email || '', addr: src.addr || '', pre: src.pre === '' || src.pre == null ? '100' : src.pre, preU: src.preU || '%', term: src.term || '12', cart: J.snapshot() }, co), r0 && r0.no ? undefined : 'черновик');
    }
    const r = C.editNo && DB.byKey(C.editNo);
    if (r) { A.toast('Документ по сохранённому заказу' + (r.no ? ' № ' + r.no : '') + '. Если менял состав, сначала нажми «Сохранить в заказ»'); return open(fn, r.uid); }
    A.toast('Для замерника и договора сначала оформи заказ: впиши клиента и нажми «Сохранить заказ»'); A.act.cord();
  };
  const JC = () => window.JalCart;
  A.act.cdoc = el => A.cartDoc(el.dataset.fn);

  /* docs.js/docscreens.js/export.js подключены в index.html; здесь только проверка */
  const docLibs = () => window.JalDocScreens && window.JalExport && window.JalTpl ? Promise.resolve() : Promise.reject(new Error('модули документов не загружены'));

  A.docOpen = open;
  A.docFile = async (fn, uid) => { const r = rec(uid); if (!r) throw new Error('заказ не найден'); await Promise.all([load(), docLibs()]); await sigs(); return JalExport.pdf(fn, orderOf(r)); };
  A.act.docopen = el => open(el.dataset.fn, el.dataset.uid);
  A.act.docclose = () => { const ov = document.getElementById('docov'); if (ov) ov.hidden = true; document.body.classList.remove('docopen'); cur = null; };
  A.act.docprint = () => window.print();
  const file = async kind => {
    if (!cur) return; A.toast('Собираю файл…');
    try { const f = await JalExport[kind](cur.fn, cur.o); JalExport.save(f); A.toast('Файл «' + f.name + '» скачан'); } catch (x) { A.toast('Ошибка: ' + (x.message || x)); }
  };
  A.act.docpdf = () => file('pdf');
  A.act.docword = () => file('docx');
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && cur) A.act.docclose(); });

  /* вкладка «Документы» в карточке заказа телефонного формата */
  const BUY = [['физ', 'Физ. лицо'], ['юр', 'Юр. лицо'], ['ип', 'ИП']];
  A.docsLegacy = o => '<div class="callout info"><b>Документы по этому заказу собрать нельзя.</b><br>Он из Excel-учёта, состава изделий там нет. Новые заказы оформляй в «Расчёте»: из них КП, замерник и договор собираются сами.</div><div class="row" style="margin-top:12px"><button class="btn pri" data-a="nav" data-id="calc">Открыть расчёт</button></div>';
  A.docsTab = function (o) {
    const r = rec(o.uid); if (!r) return '<div class="mut">Запись не найдена.</div>';
    const f = (k, label, ph) => '<div class="field"><label>' + label + '</label><input class="in" value="' + e(r[k] == null ? '' : r[k]) + '" placeholder="' + (ph || '') + '" data-c="odoc" data-k="' + k + '" data-uid="' + r.uid + '"></div>';
    const yur = r.buyer === 'юр' || r.buyer === 'ип', pay = (r.zam && r.zam.pay) || 'QR';
    return '<div class="row wrap" style="margin-bottom:12px"><button class="btn pri" data-a="docopen" data-fn="kpHtml" data-uid="' + r.uid + '">КП</button><button class="btn" data-a="docopen" data-fn="kpVarHtml" data-uid="' + r.uid + '">КП: три варианта</button>' +
      '<button class="btn" data-a="docopen" data-fn="zamernikHtml" data-uid="' + r.uid + '">Замерник</button><button class="btn" data-a="docopen" data-fn="dogovorHtml" data-uid="' + r.uid + '">Договор</button></div>' +
      '<div class="callout info" style="margin-bottom:12px">Поля ниже подставляются в документы. Изменения сразу уходят в общую базу, телефон их тоже увидит.</div>' +
      '<div class="g2"><div class="stack" style="gap:10px"><div class="field"><label>Покупатель</label><select class="in" data-c="odoc" data-k="buyer" data-uid="' + r.uid + '">' + BUY.map(b => '<option value="' + b[0] + '"' + ((r.buyer || 'физ') === b[0] ? ' selected' : '') + '>' + b[1] + '</option>').join('') + '</select></div>' +
      f('email', 'E-mail') + f('measurer', 'Замерщик', 'Хорошавин') + f('term', 'Срок изготовления, календарных дней', '12') +
      '<div class="row"><div class="field" style="flex:1"><label>Предоплата</label><input class="in" value="' + e(r.pre == null ? '100' : r.pre) + '" data-c="odoc" data-k="pre" data-uid="' + r.uid + '"></div>' +
      '<div class="field"><label>Единица</label><select class="in" data-c="odoc" data-k="preU" data-uid="' + r.uid + '"><option' + (r.preU !== '₽' ? ' selected' : '') + '>%</option><option' + (r.preU === '₽' ? ' selected' : '') + '>₽</option></select></div></div>' +
      '<div class="field"><label>Способ оплаты (для замерника)</label><select class="in" data-c="odocpay" data-uid="' + r.uid + '">' + ['QR', 'Наличные', 'СБП', 'Безнал'].map(p => '<option' + (pay === p ? ' selected' : '') + '>' + p + '</option>').join('') + '</select></div></div>' +
      '<div class="stack" style="gap:10px">' + (yur ? f('company', 'Название организации') + f('inn', 'ИНН') + f('ogrn', 'ОГРН / ОГРНИП') + f('uaddr', 'Юридический адрес') : '<div class="mut">Реквизиты юр. лица и ИП появятся, если выбрать такого покупателя.</div>') +
      f('meas', 'Дата и время замера', '2026-10-12 15:00') + f('inst', 'Дата монтажа', '2026-10-20') + '<div class="field"><label>Примечания (идут в замерник)</label><textarea class="in" rows="3" data-c="odoc" data-k="note" data-uid="' + r.uid + '">' + e(r.note || '') + '</textarea></div></div></div>';
  };
  A.fld.odoc = (v, el) => { const k = el.dataset.k, uid = el.dataset.uid; DB.patchRec(uid, { [k]: v }); if (k === 'buyer') A.render(); };
  A.fld.odocpay = (v, el) => { const r = rec(el.dataset.uid); if (r) DB.patchRec(r.uid, { zam: Object.assign({}, r.zam || {}, { pay: v }) }); };
})();
