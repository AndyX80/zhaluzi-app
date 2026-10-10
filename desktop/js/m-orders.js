/* Заказы: центральный объект. Список, канбан, карточка с воронкой, вкладки. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const FILTERS = [['all', 'Все'], ['work', 'В работе'], ['pay', 'Ждут оплаты'], ['claim', 'Рекламации'], ['done', 'Закрытые'], ['calc', 'Просчёты'], ['arch', 'Архив']];
  const closed = o => o.fl ? !!o.fl.closed : o.stage === 9;
  const base = () => S.ordersFilter === 'calc' ? (D.calcs || []) : D.orders;
  { const ord0 = A.order; A.order = id => ord0(id) || (D.calcs || []).find(x => x.id === id); }
  const pass = o => {
    const f = S.ordersFilter;
    if (f === 'arch') return !!o.archived; if (o.archived) return false;
    if (f === 'calc') return !!o.draft;
    if (S.oyear && S.oyear !== 'all' && String(o.created || '').slice(0, 4) !== S.oyear && /^\d{4}/.test(o.created || '')) return false;
    const q = (S.oq || '').trim().toLowerCase();
    if (q && ((o.no + ' ' + o.title + ' ' + (o.sup || '') + ' ' + (o.factory || '') + ' ' + ((A.client(o.client) || {}).name || '') + ' ' + ((A.client(o.client) || {}).phone || '')).toLowerCase().indexOf(q) < 0)) return false;
    return f === 'all' || (f === 'work' && !closed(o) && o.stage > 0) || (f === 'pay' && o.sum - o.paid > 0 && (D.real || (o.stage >= 3 && o.stage < 9))) || (f === 'claim' && o.claim) || (f === 'done' && closed(o));
  };
  const prof = o => o.instCost != null ? o.sum - o.cost - o.instCost : o.sum - o.cost - (o.inst ? Math.round(o.sum * 0.12) : 0);
  const dmy = s => (window.DB && /^\d{4}-/.test(s || '')) ? DB.dmy(s) : (s || '');
  const dupBox = o => {
    const r = (DB.dups || []).find(x => String(x.no) === String(o.no)); if (!r) return '';
    const it = r.items || [], sum = it.reduce((a, i) => a + (+i.price || 0), 0) - (+r.disc || 0);
    return '<div class="callout warn" style="margin-bottom:10px"><b>Заказ № ' + e(o.no) + ' есть и в Excel, и на телефоне.</b><br>Excel: ' + e(o.title) + ', ' + m(o.sum) + (o.created ? ', ' + e(dmy(o.created)) : '') + '.<br>Телефон: ' + e(r.name || r.company || 'без имени') + ', ' + it.length + ' поз., ' + m(Math.max(0, sum)) + (r.created ? ', ' + e(dmy(r.created.slice(0, 10))) : '') + '.<div class="row" style="margin-top:8px;gap:8px"><button class="btn sm" data-a="dupres" data-uid="' + e(r.uid) + '" data-v="excel">Оставить из Excel</button><button class="btn sm" data-a="dupres" data-uid="' + e(r.uid) + '" data-v="phone">Оставить с телефона</button></div></div>';
  };
  const stepperDef = o => '<div class="stepper">' + D.STAGES.map((s, i) => '<div class="step ' + (i < o.stage ? 'done' : i === o.stage ? 'cur' : '') + '"><i>' + (i < o.stage ? '✓' : i + 1) + '</i>' + e(s) + '</div>').join('') + '</div>';
  /* у заказов с компьютера/телефона этапы нажимаются: замер необязателен, КП, договор, предоплата */
  const PHSTEPS = [['meas', 'Замер (если нужен)'], ['КП отправлено', 'КП отправлено'], ['Договор', 'Договор'], ['Оплачен', 'Предоплата получена']];
  const PHORD = ['Черновик', 'КП отправлено', 'Договор', 'Оплачен'];
  const stepper = o => !o.ph ? stepperDef(o) : '<div class="stepper">' + PHSTEPS.map(st => {
    const on = st[0] === 'meas' ? !!o.meas : PHORD.indexOf(o.status) >= PHORD.indexOf(st[0]);
    return '<div class="step ' + (on ? 'done' : '') + '" style="cursor:pointer" data-a="phstep" data-k="' + e(st[0]) + '" data-uid="' + o.uid + '" title="Нажми, чтобы отметить или снять"><i style="' + (on ? '' : 'border:1.5px dashed var(--fb)') + '">' + (on ? '✓' : '') + '</i>' + e(st[1]) + '</div>'; }).join('') + '</div>';
  A.act.phstep = el => {
    const uid = el.dataset.uid, k = el.dataset.k, r = DB.raw().find(x => x.uid === uid); if (!r) return;
    if (k === 'meas') { DB.patchRec(uid, { meas: !r.meas }); DB.addEvent(uid, 'Замер', r.meas ? 'отметка снята' : 'замер отмечен'); A.render(); return; }
    const i = PHORD.indexOf(r.status || 'Черновик'), j = PHORD.indexOf(k);
    const st = i >= j ? PHORD[j - 1] : k;
    DB.patchRec(uid, { status: st }); DB.addEvent(uid, st === 'Черновик' ? 'Просчёт' : st, i >= j ? 'отметка снята' : '');
    A.S.selOrder = 'ph' + uid; A.render();
  };
  /* история событий: общий блок для карточки заказа и клиента */
  const EVT = ['КП отправлено', 'Договор', 'Замер', 'Предоплата', 'Оплачен', 'Отмена', 'Звонок', 'Другое'];
  const dmy2 = d => (d || '').slice(0, 10);
  A.histBox = (recs, labelOf) => {
    const rows = []; recs.forEach(r => (r.events || []).forEach(ev => rows.push(Object.assign({ uid: r.uid, lab: labelOf(r) }, ev))));
    rows.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
    const sel = (cur, opts, attr) => '<select class="in" style="height:34px" ' + attr + '>' + opts.map(x => '<option' + (x === cur ? ' selected' : '') + '>' + e(x) + '</option>').join('') + (opts.indexOf(cur) < 0 ? '<option selected>' + e(cur) + '</option>' : '') + '</select>';
    return '<div class="row wrap" style="gap:8px;margin-bottom:10px">' + (recs.length > 1 ? '<select class="in" id="evo" style="height:34px;width:260px">' + recs.map(r => '<option value="' + r.uid + '">' + e(labelOf(r)) + '</option>').join('') + '</select>' : '<input type="hidden" id="evo" value="' + recs[0].uid + '">') +
      '<select class="in" id="evt" style="height:34px;width:220px">' + EVT.map(x => '<option>' + e(x) + '</option>').join('') + '</select><button class="btn sm" data-a="evadd">Добавить событие</button></div>' +
      (rows.length ? '<table class="tbl"><thead><tr><th>Дата</th><th>Событие</th>' + (recs.length > 1 ? '<th>Заказ</th>' : '') + '<th>Комментарий</th><th></th></tr></thead><tbody>' + rows.map(x => { const at = ' data-c="evf" data-uid="' + x.uid + '" data-id="' + x.id + '"';
        return '<tr><td><input class="in" type="date" style="height:34px" value="' + e(dmy2(x.d)) + '"' + at + ' data-k="d"></td><td>' + sel(x.t, EVT, at + ' data-k="t"') + '</td>' + (recs.length > 1 ? '<td class="mut">' + e(x.lab) + '</td>' : '') + '<td><input class="in" style="height:34px;width:100%" value="' + e(x.x || '') + '"' + at + ' data-k="x"></td><td class="r"><button class="btn sm" data-a="evdel" data-uid="' + x.uid + '" data-id="' + x.id + '">Удалить</button></td></tr>'; }).join('') + '</tbody></table>'
        : '<p class="mut">Событий пока нет. КП, договор и отметки этапов записываются сами; здесь можно поправить дату, дописать причину отмены или добавить своё.</p>');
  };
  A.fld.evf = (v, el) => { DB.editEvent(el.dataset.uid, el.dataset.id, { [el.dataset.k]: v }); };
  A.act.evdel = el => { DB.delEvent(el.dataset.uid, el.dataset.id); A.render(); };
  A.act.evadd = () => { const u = document.getElementById('evo'), t = document.getElementById('evt'); if (!u || !u.value) return; DB.addEvent(u.value, t ? t.value : 'Другое', ''); A.render(); };

  const FL = [['work', 'В работе'], ['sup', 'Оплачен поставщику'], ['sent', 'Отправлен'], ['got', 'Получен'], ['zp', 'ЗП монтажнику отдана'], ['closed', 'Закрыто']];
  const flags = o => o.fl ? FL.map(x => [x[1], !!o.fl[x[0]], x[0]]) : [['В работе', o.stage >= 4], ['Оплачен поставщику', o.stage >= 5], ['Отправлен', o.stage >= 6], ['Получен', o.stage >= 7], ['ЗП монтажнику отдана', o.stage >= 9], ['Закрыто', o.stage >= 9]];
  const tabs = [['main', 'Общая'], ['meas', 'Замер'], ['items', 'Изделия'], ['fin', 'Финансы'], ['docs', 'Документы'], ['sup', 'Поставщик и доставка'], ['hist', 'История']];
  const inp = (k, o, label, ph) => '<div class="field"><label>' + label + '</label><input class="in" value="' + e(o[k] || '') + '" placeholder="' + (ph || '') + '" data-c="ofld" data-k="' + k + '" data-id="' + o.id + '"></div>';

  /* состав заказа, собранного в расчёте: одинаковые позиции склеены */
  function itemsPh(o) {
    const g = [], idx = {};
    (o.items || []).forEach((i, ix) => {
      const nm = i.kind || i.prod ? (i.title || 'Услуга') : [i.sup, i.mat, i.lam ? i.lam + ' мм' : '', i.o && i.o.color].filter(Boolean).join(', ');
      const sz = i.W && !i.prod ? Math.round(i.W * 10) + '×' + Math.round(i.H * 10) : '', cu = i.kind === 'custom', k = nm + '|' + sz + '|' + i.price + '|' + i.ci + (cu ? '|' + i.cost + '|' + !!i.costOk : '');
      if (idx[k] == null) { idx[k] = g.length; g.push({ ci: i.ci, nm, sz, price: +i.price || 0, n: 0, ix: [], cu, cost: i.cost, ok: !!i.costOk, sub: i.o ? [(i.o.opts || []).join(', '), i.o.fix || ''].filter(Boolean).join(' · ') : '' }); }
      g[idx[k]].n++; g[idx[k]].ix.push(ix);
    });
    const sum = (o.items || []).reduce((a, i) => a + (+i.price || 0), 0);
    return '<table class="tbl"><thead><tr><th>№</th><th>Изделие</th><th>Размер, мм</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th><th class="r">Закуп за шт</th><th></th></tr></thead><tbody>' +
      g.map((x, n) => '<tr><td>' + (n + 1) + '</td><td><b>' + e(x.nm) + '</b>' + (x.sub ? '<div class="mut" style="font-size:12px">' + e(x.sub) + '</div>' : '') + '</td><td class="num">' + e(x.sz) + '</td><td class="r">' + x.n + '</td><td class="r num">' + m(x.price) + '</td><td class="r num">' + m(x.price * x.n) + '</td><td class="r">' + (x.cu ? '<input class="in num" style="width:90px;text-align:right' + (x.ok || +x.cost > 0 ? '' : ';border-color:var(--bad,#b3261e)') + '" value="' + (x.cost === '' || x.cost == null ? '' : x.cost) + '" placeholder="не указан" data-c="icost" data-uid="' + o.uid + '" data-ix="' + x.ix.join(',') + '">' + (x.ok || +x.cost > 0 ? (x.ok && !(+x.cost > 0) ? '<div class="mut" style="font-size:11px">0 подтверждён</div>' : '') : '<div><button class="btn sm" style="margin-top:4px" data-a="icost0" data-uid="' + o.uid + '" data-ix="' + x.ix.join(',') + '">Закуп 0, подтверждаю</button></div>') : '<span class="mut">по прайсу</span>') + '</td><td class="r" style="white-space:nowrap">' + (o.hasCart && x.ci != null && x.ci >= 0 ? '<button class="btn sm" data-a="oitem" data-uid="' + o.uid + '" data-ci="' + x.ci + '">Изменить</button> <button class="btn sm" data-a="oitemdel" data-uid="' + o.uid + '" data-ci="' + x.ci + '">Удалить</button>' : '') + '</td></tr>').join('') +
      '</tbody></table><div class="mut" style="margin-top:8px">Цены с доставкой и монтажом' + (o.disc ? '. Скидка: −' + m(o.disc) : '') + '. Итого: <b>' + m(Math.max(0, sum - (o.disc || 0))) + '</b></div>' +
      (o.hasCart ? '<div class="row" style="margin-top:12px"><button class="btn pri" data-a="oreopen" data-id="' + o.id + '">Открыть в расчёте</button></div>' : '');
  }

  /* заказ с компьютера/телефона: все поля правятся прямо в карточке */
  function phMain(o) {
    const r = DB.raw().find(x => x.uid === o.uid) || {}, v = k => e(r[k] == null ? '' : r[k]), f = (k, l, ph, wide) => '<div class="field"' + (wide ? ' style="grid-column:1/-1"' : '') + '><label>' + l + '</label><input class="in" value="' + v(k) + '" placeholder="' + (ph || '') + '" data-c="phfld" data-k="' + k + '" data-uid="' + o.uid + '"></div>';
    const bt = r.buyer || 'физ';
    return '<div class="g2"><div class="stack" style="gap:10px"><div class="g2" style="gap:10px">' +
      '<div class="field"><label>Номер заказа</label><input class="in" value="' + v('no') + '" placeholder="Просчёт, номера нет" data-c="phfld" data-k="no" data-uid="' + o.uid + '"><small class="mut">Пусто = просчёт (КП без номера). Номер появится сам, когда оформишь договор или придёт предоплата; можно вписать свой.</small></div>' +
      '<div class="field"><label>Заказчик</label><select class="in" data-c="phfld" data-k="buyer" data-uid="' + o.uid + '">' + [['физ', 'Физ. лицо'], ['юр', 'Юр. лицо'], ['ип', 'ИП']].map(x => '<option value="' + x[0] + '"' + (bt === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></div>' +
      f('name', bt === 'ип' ? 'ФИО предпринимателя' : bt === 'юр' ? 'ФИО представителя' : 'ФИО') + (bt === 'юр' ? f('company', 'Название организации') : '') +
      f('phone', 'Телефон') + f('phone2', 'Доп. телефон') + f('email', 'E-mail') + f('addr', 'Адрес', '', bt === 'физ') +
      (bt !== 'физ' ? f('inn', 'ИНН') + f('ogrn', bt === 'ип' ? 'ОГРНИП' : 'ОГРН') + f('uaddr', 'Юр. адрес / адрес регистрации') + f('bank', 'Банковские реквизиты') : '') +
      f('factory', 'Заводской номер заказа у поставщика', 'например, МК26022376') + f('tk', 'ТК, трек, примечание по доставке') +
      f('pre', 'Предоплата (число)') + '<div class="field"><label>Единица предоплаты</label><select class="in" data-c="phfld" data-k="preU" data-uid="' + o.uid + '">' + ['%', '₽'].map(u => '<option' + ((r.preU || '%') === u ? ' selected' : '') + '>' + u + '</option>').join('') + '</select></div>' + f('term', 'Срок изготовления, дней') +
      '<div class="field" style="grid-column:1/-1"><label>Комментарии (для себя, в документы не идут)</label><textarea class="in" rows="3" style="width:100%" data-c="phfld" data-k="comment" data-uid="' + o.uid + '">' + v('comment') + '</textarea></div>' +
      '<div class="field" style="grid-column:1/-1"><label>Заметка в документах</label><input class="in" value="' + v('note') + '" data-c="phfld" data-k="note" data-uid="' + o.uid + '"></div>' +
      '</div></div>' +
      '<div class="card flat"><h2>Признаки заказа</h2><div class="chips" style="margin-top:8px"><span class="pill ' + (o.claim ? 'bad' : '') + '" style="cursor:pointer' + (o.claim ? ';font-weight:700' : '') + '" data-a="oclaim" data-id="' + o.id + '">' + (o.claim ? '✓ ' : '') + 'Рекламация</span></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn ' + (o.supSent ? '' : 'pri') + '" data-a="osup" data-id="' + o.id + '">' + (o.supSent ? '✓ Отправлен поставщику (снять)' : 'Отметить: заказ отправлен поставщику') + '</button></div>' +
      (o.supSent && o.needCost.length ? '<div class="callout bad" style="margin-top:8px;font-size:13px">Укажи закуп на вкладке «Изделия»: ' + e(o.needCost.join(', ')) + '.</div>' : '') +
      '<div class="row wrap" style="margin-top:10px"><span class="pill info">' + e(o.zone) + '</span><span class="pill">Категория: ' + e(o.cat) + '</span><span class="pill">' + (o.inst ? 'С монтажом' : 'Без монтажа') + '</span></div></div></div>';
  }
  A.fld.phfld = (v, el) => {
    const uid = el.dataset.uid, k = el.dataset.k, r = DB.raw().find(x => x.uid === uid); if (!r) return;
    if (k === 'no') { const res = DB.setNo(uid, v); if (!res.ok) { A.toast(res.msg); A.render(); return; } A.S.selOrder = 'ph' + uid; A.toast(String(v).trim() ? 'Номер изменён' : 'Заказ вернулся в просчёты'); A.render(); return; }
    const P = {}; P[k] = k === 'pre' ? String(v).replace(/[^\d.]/g, '') : v;
    if (k === 'buyer' || k === 'preU') { DB.patchRec(uid, P); A.render(); return; }
    DB.patchRec(uid, P);
  };
  /* изделие заказа: открыть в расчёте на нужной позиции или убрать из заказа */
  A.act.oitem = el => {
    const r = DB.raw().find(x => x.uid === el.dataset.uid); if (!r || !r.cart) return;
    JalCart.restore(r.cart, DB.keyOf(r)); A.open('calc'); A.act.cedit({ dataset: { i: el.dataset.ci } });
  };
  A.act.oitemdel = el => {
    const r = DB.raw().find(x => x.uid === el.dataset.uid); if (!r || !r.cart) return;
    if (el.dataset.y !== '1') { el.dataset.y = '1'; el.textContent = 'Точно удалить?'; return; }
    JalCart.restore(r.cart, DB.keyOf(r));
    const C = JalCart.C, i = +el.dataset.ci; C.cart.splice(i, 1);
    if (!C.cart.length) { JalCart.clear(); A.toast('Это последняя позиция: удали заказ целиком, если он не нужен'); A.render(); return; }
    JalCart.save(); A.persistCart(); JalCart.clear(); A.toast('Позиция удалена'); A.render();
  };

  function body(o) {
    const c = A.client(o.client) || { id: '', name: '', phone: '', addr: '', src: '' }, t = S.orderTab, real = !!o.fl;
    if (t === 'main' && o.ph) return phMain(o);
    if (t === 'main') return '<div class="g2"><div class="stack" style="gap:10px"><div class="field"><label>Клиент <a style="cursor:pointer;font-weight:400" data-a="opn" data-id="client:' + c.id + '">(открыть карточку)</a></label>' + ['name', 'phone', 'addr'].map(k => '<input class="in" style="margin-top:6px" placeholder="' + { name: 'Имя', phone: 'Телефон', addr: 'Адрес' }[k] + '" value="' + e(c[k] || '') + '" data-c="clfld" data-k="' + k + '" data-id="' + c.id + '">').join('') + '</div>' +
        '<div class="field"><label>Источник</label><div>' + e(o.src || c.src || 'не указан') + '</div></div><div class="field"><label>Заметка</label><textarea class="in" rows="3" style="width:100%" data-c="ofld" data-k="note" data-id="' + o.id + '">' + e(o.note || '') + '</textarea></div>' +
        (o.yur ? '<div class="field"><label>Юридическое лицо</label><div>' + e(o.yur.name) + '</div><div class="mut">ЭДО: ' + (o.yur.edo ? 'есть' : 'нет') + ' · УПД отдали: ' + (o.yur.upd ? 'да' : 'нет') + ' · УПД подписан: ' + (o.yur.sign ? 'да' : 'нет') + (o.yur.note ? ' · ' + e(o.yur.note) : '') + '</div></div>' : '') + '</div>' +
        '<div class="card flat"><h2>Признаки заказа' + (real ? ' <span class="soon">нажми, чтобы отметить</span>' : '') + '</h2><div class="chips" style="margin-top:8px">' + flags(o).map(f => '<span class="pill ' + (f[1] ? 'ok' : '') + '"' + (real ? ' style="cursor:pointer" data-a="oflag" data-k="' + f[2] + '" data-id="' + o.id + '"' : '') + '>' + (f[1] ? '✓ ' : '') + f[0] + '</span>').join('') + '<span class="pill ' + (o.claim ? 'bad' : '') + '" style="cursor:pointer' + (o.claim ? ';font-weight:700' : '') + '" data-a="oclaim" data-id="' + o.id + '">' + (o.claim ? '✓ ' : '') + 'Рекламация</span></div>' +
        (o.ph ? '<div class="row" style="margin-top:10px"><button class="btn ' + (o.supSent ? '' : 'pri') + '" data-a="osup" data-id="' + o.id + '">' + (o.supSent ? '✓ Отправлен поставщику (снять)' : 'Отметить: заказ отправлен поставщику') + '</button></div>' + (o.supSent && o.needCost.length ? '<div class="callout bad" style="margin-top:8px;font-size:13px">Укажи закуп на вкладке «Изделия»: ' + e(o.needCost.join(', ')) + '. Без него прибыль считается неверно.</div>' : '') : '') +
        '<div class="row wrap" style="margin-top:10px"><span class="pill info">' + e(o.zone) + '</span><span class="pill">Категория: ' + e(o.cat) + '</span><span class="pill">' + (o.inst ? 'С монтажом' : 'Без монтажа') + '</span>' + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '</div></div></div>';
    if (t === 'meas') return '<div class="callout info">Замер может не понадобиться: КП часто даётся по размерам клиента до выезда. Этап «Замер» в воронке пропускаемый.</div><p class="mut" style="margin-top:12px">Здесь будет замерный лист из телефонной версии: таблица изделий, часы тишины, примечания, монтаж, печать бланка.</p>';
    if (t === 'items' && o.ph) return itemsPh(o);
    if (t === 'items') return real && o.legacy ? '<div class="callout info">Это заказ из вашего Excel-учёта: состав изделий там не вёлся (только категория «' + e(o.cat) + '» и поставщик «' + e(o.sup || '—') + '»). Новые заказы, собранные в расчёте, сохраняют полный список изделий.</div>' :
      '<table class="tbl"><thead><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Шт</th><th class="r">Сумма</th></tr></thead><tbody><tr><td>1</td><td>Дерево 50, Белый (павловния)</td><td>1200×1500</td><td class="r">2</td><td class="r num">18 400 ₽</td></tr><tr><td>2</td><td>Дерево 50, Белый (павловния)</td><td>900×1400</td><td class="r">1</td><td class="r num">8 200 ₽</td></tr></tbody></table><div class="row" style="margin-top:12px"><button class="btn pri" data-a="nav" data-id="calc">Открыть в расчёте</button><button class="btn" data-a="stub" data-t="пересчёт по новым ценам">Пересчитать по новым ценам</button></div>';
    if (t === 'fin') return '<div class="g3"><div class="kpi"><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div class="kpi"><small>Получено</small><b>' + m(o.paid) + '</b></div><div class="kpi"><small>Долг клиента</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div></div>' +
      '<div class="g3" style="margin-top:12px"><div class="kpi"><small>Закуп</small><b>' + m(o.cost) + '</b></div><div class="kpi"><small>Оплата монтажника</small><b>' + m(o.instCost || 0) + '</b></div><div class="kpi"><small>Прибыль</small><b>' + m(prof(o)) + '</b><i> ' + (o.sum ? Math.round(prof(o) / o.sum * 100) : 0) + '%</i></div></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-a="stub" data-t="приход по заказу">+ Приход</button><button class="btn" data-a="stub" data-t="расход по заказу">+ Расход</button></div>';
    if (t === 'docs' && o.ph && A.docsTab) return A.docsTab(o);
    if (t === 'docs' && D.real && A.docsLegacy) return A.docsLegacy(o);
    if (t === 'docs') return '<table class="tbl"><thead><tr><th>Документ</th><th>Статус</th><th></th></tr></thead><tbody>' + [['Замерный лист', real ? 'был на бумаге' : 'готов'], ['КП', real ? 'не сохранялось' : 'отправлено'], ['Договор с приложением', real ? 'не сохранялся' : 'не создан'], ['Счёт на оплату', 'позже'], ['УПД', o.yur ? (o.yur.sign ? 'подписан' : o.yur.upd ? 'отдан' : 'не отдан') : 'позже'], ['Акт', 'позже'], ['Гарантийный талон', 'позже']].map(d => '<tr><td>' + d[0] + '</td><td><span class="pill ' + (/готов|отправлено|подписан|отдан/.test(d[1]) ? 'ok' : '') + '">' + d[1] + '</span></td><td class="r"><button class="btn sm" data-a="stub" data-t="формирование документа">Сформировать</button></td></tr>').join('') + '</tbody></table>';
    if (t === 'sup') return '<div class="g2"><div class="field"><label>Поставщик</label><div class="b">' + e(o.sup || '—') + '</div></div>' + inp('factory', o, 'Заводской номер заказа у поставщика', 'например, МК26022376') + inp('tk', o, 'ТК, трек, примечания') + '<div class="field"><label>Зона</label><div>' + e(o.zone) + '</div></div>' + inp('due', o, 'Дата изготовления (ГГГГ-ММ-ДД)', '2026-10-15') + '</div>';
    if (o.ph) { const r = DB.raw().find(x => x.uid === o.uid); if (r) return A.histBox([r], () => ''); }
    return '<div class="stack" style="gap:8px"><div class="row"><span class="mut num">' + e(dmy(o.created)) + '</span><span>Создан заказ</span></div>' + (real ? '<div class="mut">Журнал действий ведётся с момента перехода на новую систему.</div>' : '') + '</div>';
  }

  function card(id, full) {
    const o = A.order(id) || D.orders[0], c = A.client(o.client) || { name: '' };
    return '<div class="card" style="min-height:100%"><div class="row wrap" style="margin-bottom:6px">' + (full ? '<button class="btn" data-a="oback" data-id="order:' + o.id + '">← Назад</button>' : '') + '<h1>' + (o.draft ? 'Просчёт' + (o.rawNo ? ' (был № ' + o.rawNo + ')' : '') : 'Заказ № ' + o.no) + '</h1>' + A.stagePill(o) + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '<span class="sp"></span>' + ((D.real || o.ph) ? (S.odelId === o.id ? '<span class="mut">Удалить заказ?</span><button class="btn sm" style="width:120px;background:#c0392b;border-color:#c0392b;color:#fff" data-a="odel" data-id="' + o.id + '" data-y="1">Да, удалить</button><button class="btn sm" id="odelno" style="width:120px;background:#2e8b57;border-color:#2e8b57;color:#fff" data-a="odelno">Нет</button>' : '<button class="btn sm" data-a="oarch" data-id="' + o.id + '">' + (o.archived ? 'Вернуть из архива' : 'В архив') + '</button><button class="btn sm" data-a="odel" data-id="' + o.id + '">Удалить заказ</button>') : '') +
      (full ? '' : '<button class="btn sm" data-a="opn" data-id="order:' + o.id + '">Открыть во вкладке</button>') + '</div>' + dupBox(o) + '<div class="mut" style="margin-bottom:10px">' + e(c.name) + ' · ' + e(o.title) + (o.created ? ' · ' + e(dmy(o.created)) : '') + '</div>' + stepper(o) +
      '<div class="itabs">' + tabs.map(t => '<button class="' + (S.orderTab === t[0] ? 'on' : '') + '" data-a="otab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + body(o) +
      '<div class="sumbar"><div><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div><small>Оплачено</small><b>' + m(o.paid) + '</b></div><div><small>Долг</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div><div><small>Закуп</small><b>' + m(o.cost) + '</b></div><div><small>Прибыль</small><b>' + m(prof(o)) + '</b></div></div></div>';
  }

  const LIM = 80;
  function list() {
    const all = base().filter(pass), lim = S.olimit || LIM, rows = all.slice(0, lim);
    return '<div class="card p0"><table class="tbl"><thead><tr><th>№</th><th>Клиент</th><th>Этап</th><th class="r">Сумма</th></tr></thead><tbody>' + rows.map(o =>
      '<tr class="' + (o.id === S.selOrder ? 'sel' : '') + '" data-a="selo" data-id="' + o.id + '"><td class="b">' + o.no + '</td><td>' + e((A.client(o.client) || {}).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + (o.created ? ' · ' + e(dmy(o.created)) : '') + '</div></td><td>' + A.stagePill(o) + '</td><td class="r num">' + m(o.sum) + '</td></tr>').join('') + '</tbody></table>' +
      (all.length > lim ? '<div style="padding:10px;text-align:center"><button class="btn sm" data-a="omore">Показать ещё (осталось ' + (all.length - lim) + ')</button></div>' : '') + (all.length ? '' : '<div class="empty" style="padding:24px">Ничего не найдено</div>') + '</div>';
  }
  function kanban() {
    return '<div class="kan">' + D.STAGES.map((s, i) => { if (D.real && i === 9) return ''; const os = D.orders.filter(o => o.stage === i && !closed(o) && pass(o)); return '<div class="kcol"><h3><span>' + e(s) + '</span><span>' + os.length + '</span></h3>' + os.map(o => '<div class="kc" data-a="opn" data-id="order:' + o.id + '"><b>№ ' + o.no + '</b> · ' + e((A.client(o.client) || {}).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + '</div><div class="num b" style="margin-top:4px">' + m(o.sum) + '</div></div>').join('') + '</div>'; }).join('') + '</div>';
  }
  const years = () => { const y = {}; D.orders.forEach(o => { if (/^\d{4}/.test(o.created || '')) y[o.created.slice(0, 4)] = 1; }); return Object.keys(y).sort().reverse(); };

  /* ===== табличный вид: как в Excel, столбцы на выбор, фильтры по каждому ===== */
  const cn = o => o.name || (A.client(o.client) || {}).name || '', cph = o => o.phone || (A.client(o.client) || {}).phone || '';
  const itemTxt = o => { const u = {}; (o.items || []).forEach(i => { u[i.kind ? (i.title || 'Услуга') : i.prod ? 'Рулонные шторы' : [i.sup, i.mat, i.lam ? i.lam + ' мм' : ''].filter(Boolean).join(' ')] = 1; }); return Object.keys(u).join('; '); };
  const COLS = [
    { k: 'no', l: 'Номер', t: 'n', v: o => +o.no || 0, f: o => o.no },
    { k: 'created', l: 'Дата', t: 'd', v: o => o.created || '', f: o => dmy(o.created) },
    { k: 'name', l: 'Клиент', t: 't', v: cn, f: cn },
    { k: 'phone', l: 'Телефон', t: 't', v: cph, f: cph },
    { k: 'cat', l: 'Категория', t: 's', v: o => o.cat || '', f: o => o.cat || '' },
    { k: 'sup', l: 'Поставщик', t: 's', v: o => o.sup || '', f: o => o.sup || '' },
    { k: 'items', l: 'Состав', t: 't', v: itemTxt, f: itemTxt, wide: 1 },
    { k: 'src', l: 'Источник', t: 's', v: o => o.src || '', f: o => o.src || '' },
    { k: 'inst', l: 'Установка', t: 's', v: o => o.inst ? 'да' : 'нет', f: o => o.inst ? 'да' : 'нет' },
    { k: 'zone', l: 'Регион', t: 's', v: o => o.zone || '', f: o => o.zone || '' },
    { k: 'sum', l: 'Стоимость', t: 'n', v: o => +o.sum || 0, f: o => m(o.sum), r: 1, tot: 1 },
    { k: 'paid', l: 'Оплачено', t: 'n', v: o => +o.paid || 0, f: o => m(o.paid), r: 1, tot: 1 },
    { k: 'debt', l: 'Долг', t: 'n', v: o => Math.max(0, (+o.sum || 0) - (+o.paid || 0)), f: o => m(Math.max(0, (+o.sum || 0) - (+o.paid || 0))), r: 1, tot: 1 },
    { k: 'cost', l: 'Закуп', t: 'n', v: o => +o.cost || 0, f: o => m(o.cost), r: 1, tot: 1 },
    { k: 'instCost', l: 'Стоимость установки', t: 'n', v: o => +o.instCost || 0, f: o => m(o.instCost), r: 1, tot: 1 },
    { k: 'profit', l: 'Прибыль', t: 'n', v: prof, f: o => m(prof(o)), r: 1, tot: 1 },
    { k: 'stage', l: 'Этап', t: 's', v: o => D.STAGES[o.stage] || '', f: o => D.STAGES[o.stage] || '' },
    { k: 'claim', l: 'Рекламация', t: 's', v: o => o.claim ? 'да' : 'нет', f: o => o.claim ? 'да' : '' },
    { k: 'due', l: 'Дата изготовления', t: 'd', v: o => o.due || '', f: o => dmy(o.due) },
    { k: 'tk', l: 'Примечания', t: 't', v: o => o.tk || '', f: o => o.tk || '', wide: 1 },
    { k: 'factory', l: 'Заводской №', t: 't', v: o => o.factory || '', f: o => o.factory || '' },
    { k: 'review', l: 'Отзыв', t: 't', v: o => o.review || '', f: o => o.review || '' }
  ];
  /* какие ячейки правятся прямо в таблице: ed = тип поля, ph = можно у заказов с телефона */
  const ED = { name: { ed: 'text', ph: 1 }, phone: { ed: 'text', ph: 1 }, created: { ed: 'date', ph: 1 }, cat: { ed: 'sel' }, sup: { ed: 'sel' }, src: { ed: 'sel' }, inst: { ed: 'bool', ph: 1 }, zone: { ed: 'sel' },
    sum: { ed: 'num' }, paid: { ed: 'num' }, cost: { ed: 'num' }, instCost: { ed: 'num' }, stage: { ed: 'sel', ph: 1 }, claim: { ed: 'bool', ph: 1 }, due: { ed: 'date' }, tk: { ed: 'text', ph: 1 }, factory: { ed: 'text' }, review: { ed: 'text' } };
  const PHST = ['Черновик', 'КП отправлено', 'Договор', 'Оплачен'];
  const canEdit = (o, c) => { const x = ED[c.k]; return !!x && (o.ph ? !!x.ph : !!o.legacy); };
  const optsOf = (o, c) => {
    if (c.k === 'stage') return o.ph ? PHST.map(v => [v, v]) : D.STAGES.map((v, i) => [String(i), v]).filter(x => +x[0] >= 3);
    if (c.k === 'zone') return [['СПб', 'СПб'], ['Регионы', 'Регионы']];
    const u = {}; D.orders.forEach(x => { const v = c.v(x); if (v !== '') u[v] = 1; }); if (c.v(o) !== '') u[c.v(o)] = 1;
    return Object.keys(u).sort((a, b) => a.localeCompare(b, 'ru')).map(v => [v, v]);
  };
  const numv = v => Math.max(0, Math.round(+String(v).replace(/\s/g, '').replace(',', '.') || 0));
  function setCell(o, k, v) {
    if (o.ph) {
      const r = DB.raw().find(x => x.uid === o.uid); if (!r) return;
      const P = { name: r.company ? { company: v } : { name: v }, phone: { phone: v }, created: { created: v }, tk: { note: v }, inst: { install: v === 'да' }, claim: { claim: v === 'да' }, stage: { status: v } }[k];
      if (P) DB.patchRec(o.uid, P); return;
    }
    if (k === 'stage') { const n = +v; o.fl = o.fl || {}; ['work', 'sup', 'sent', 'got', 'zp', 'closed'].forEach((f, i) => { o.fl[f] = n >= i + 4; }); o.stage = DB.stageOf(o.fl); }
    else if (k === 'inst' || k === 'claim') o[k] = v === 'да';
    else if (k === 'sum' || k === 'paid' || k === 'cost' || k === 'instCost') o[k] = numv(v);
    else { o[k] = v; if (k === 'cat' || k === 'sup') o.title = (o.cat || '') + (o.sup ? ' · ' + o.sup : ''); }
    DB.commit(o); if (k === 'name' || k === 'phone') DB.derive();
  }
  const DEFCOLS = ['no', 'created', 'name', 'cat', 'sup', 'sum', 'stage'];
  const PERS = [['', 'Всё время'], ['m0', 'Этот месяц'], ['m1', 'Прошлый месяц'], ['y0', 'Этот год'], ['y1', 'Прошлый год']];
  const p2 = n => String(n).padStart(2, '0'), iso = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  function perRange(k) {
    const n = new Date(), y = n.getFullYear(), mo = n.getMonth();
    if (k === 'm0') return [iso(new Date(y, mo, 1)), iso(new Date(y, mo + 1, 0))];
    if (k === 'm1') return [iso(new Date(y, mo - 1, 1)), iso(new Date(y, mo, 0))];
    if (k === 'y0') return [y + '-01-01', y + '-12-31'];
    if (k === 'y1') return [(y - 1) + '-01-01', (y - 1) + '-12-31'];
    return null;
  }
  const tcols = () => (S.tcols && S.tcols.length ? S.tcols : DEFCOLS).filter(k => COLS.some(c => c.k === k));
  const tfilt = () => S.tf || (S.tf = {});
  function trows() {
    const F = tfilt(), pr = perRange(S.tper), act = COLS.filter(c => { const f = F[c.k]; return f && (typeof f === 'object' ? (f.a !== '' && f.a != null) || (f.b !== '' && f.b != null) : f !== ''); });
    let rows = base().filter(pass).filter(o => {
      if (pr && !(o.created && o.created >= pr[0] && o.created <= pr[1])) return false;
      return act.every(c => { const f = F[c.k], v = c.v(o);
        if (c.t === 't') return String(v).toLowerCase().indexOf(String(f).trim().toLowerCase()) >= 0;
        if (c.t === 's') return String(v) === f;
        if (c.t === 'n') { const a = f.a === '' || f.a == null ? null : +String(f.a).replace(/\s/g, ''), b = f.b === '' || f.b == null ? null : +String(f.b).replace(/\s/g, ''); return (a == null || v >= a) && (b == null || v <= b); }
        return (!f.a || (v && v >= f.a)) && (!f.b || (v && v <= f.b)); });
    });
    const so = S.tsort || { k: 'no', d: 1 }, sc = COLS.find(c => c.k === so.k) || COLS[0];
    rows = rows.slice().sort((x, y) => { const a = sc.v(x), b = sc.v(y); return (a < b ? -1 : a > b ? 1 : 0) * so.d; });
    return rows;
  }
  /* таблица открывается на последних заказах и помнит прокрутку при правках */
  let TPOS = null;
  document.addEventListener('scroll', ev => { const t = ev.target; if (t && t.classList && t.classList.contains('tscroll')) TPOS = t.scrollTop >= t.scrollHeight - t.clientHeight - 4 ? 'end' : t.scrollTop; }, true);
  const r0 = A.render;
  A.render = function () { const r = r0.apply(this, arguments); const t = document.querySelector('.tscroll'); if (t) t.scrollTop = TPOS == null || TPOS === 'end' ? t.scrollHeight : TPOS; return r; };
  const TE = () => S.tedit || {};
  function cell(o, c) {
    const x = ED[c.k], ok = canEdit(o, c), ed = ok && TE().id === o.id && TE().k === c.k; let base = (c.r ? 'r num' : '') + (c.wide ? ' tw' : '');
    const debt = Math.max(0, (+o.sum || 0) - (+o.paid || 0)) > 0 && !closed(o), red = debt && (c.k === 'debt' || (c.k === 'sum' && tcols().indexOf('debt') < 0)) ? ' cdbt' : '';
    base += red;
    if (!ok) return '<td class="' + base + '" title="' + (c.wide ? e(c.f(o)) : '') + '">' + e(c.f(o)) + '</td>';
    if (!ed) return '<td class="' + base + ' ted" data-a="otcell" data-id="' + o.id + '" data-k="' + c.k + '" title="' + (c.wide ? e(c.f(o)) : 'Нажми, чтобы изменить') + '">' + (e(c.f(o)) || '<span class="mut">·</span>') + '</td>';
    const at = ' data-c="otedit" data-id="' + o.id + '" data-k="' + c.k + '"', raw = c.v(o);
    let inner;
    if (x.ed === 'bool') inner = '<select class="in tf"' + at + '><option' + (raw === 'нет' ? ' selected' : '') + '>нет</option><option' + (raw === 'да' ? ' selected' : '') + '>да</option></select>';
    else if (x.ed === 'sel') { const cur = c.k === 'stage' ? (o.ph ? D.STAGES[o.stage] && PHST.find(p => p === o.status) : String(o.stage)) : raw; inner = '<select class="in tf"' + at + '>' + optsOf(o, c).map(v => '<option value="' + e(v[0]) + '"' + (String(v[0]) === String(c.k === 'stage' ? (o.ph ? o.status : o.stage) : raw) ? ' selected' : '') + '>' + e(v[1]) + '</option>').join('') + '</select>'; }
    else if (x.ed === 'date') inner = '<input class="in tf" type="date" value="' + e(raw) + '"' + at + '>';
    else inner = '<input class="in tf" value="' + e(x.ed === 'num' ? raw : raw) + '"' + at + '>';
    return '<td class="' + base + ' tedit">' + inner + '</td>';
  }
  A.act.otcell = el => { S.tedit = { id: el.dataset.id, k: el.dataset.k }; A.render(); setTimeout(() => { const x = document.querySelector('.ttab [data-c=otedit]'); if (!x) return; x.focus(); if (x.tagName === 'SELECT') { try { x.showPicker(); } catch (er) {} } else if (x.select) x.select(); }, 0); };
  A.fld.otedit = (v, el) => { const o = A.order(el.dataset.id); S.tedit = null; if (o) setCell(o, el.dataset.k, v); A.render(); };
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && S.tedit) { S.tedit = null; A.render(); } }, true);
  function table() {
    const F = tfilt(), cols = tcols().map(k => COLS.find(c => c.k === k)), rows = trows(), lim = S.tlim || 200, so = S.tsort || { k: 'no', d: 1 }, tail = so.d > 0, shown = tail ? rows.slice(Math.max(0, rows.length - lim)) : rows.slice(0, lim), more = rows.length > lim ? '<div style="padding:10px;text-align:center"><button class="btn sm" data-a="otmore">' + (tail ? 'Показать более ранние' : 'Показать ещё') + ' (осталось ' + (rows.length - lim) + ')</button></div>' : '';
    const opts = c => { const u = {}; D.orders.forEach(o => { const v = c.v(o); if (v !== '') u[v] = 1; }); return Object.keys(u).sort((a, b) => c.k === 'stage' ? D.STAGES.indexOf(a) - D.STAGES.indexOf(b) : a.localeCompare(b, 'ru')); };
    const fcell = c => { const f = F[c.k];
      if (c.t === 't') return '<input class="in tf" value="' + e(f || '') + '" data-c="otf" data-k="' + c.k + '">';
      if (c.t === 's') return '<select class="in tf" data-c="otf" data-k="' + c.k + '"><option value="">все</option>' + opts(c).map(v => '<option' + (f === v ? ' selected' : '') + '>' + e(v) + '</option>').join('') + '</select>';
      const a = (f && f.a) || '', b = (f && f.b) || '';
      return c.t === 'n' ? '<div class="tfr"><input class="in tf" placeholder="от" value="' + e(a) + '" data-c="otf" data-k="' + c.k + '" data-p="a"><input class="in tf" placeholder="до" value="' + e(b) + '" data-c="otf" data-k="' + c.k + '" data-p="b"></div>'
        : '<div class="tfr"><input class="in tf" type="date" value="' + e(a) + '" data-c="otf" data-k="' + c.k + '" data-p="a"><input class="in tf" type="date" value="' + e(b) + '" data-c="otf" data-k="' + c.k + '" data-p="b"></div>'; };
    const nf = Object.keys(F).filter(k => { const f = F[k]; return f && (typeof f === 'object' ? f.a || f.b : f !== ''); }).length + (S.tper ? 1 : 0);
    const tot = c => rows.reduce((a, o) => a + c.v(o), 0);
    return '<div class="tbar"><div class="tmw"><button class="btn" data-a="otmenu">' + A.icon('list', 16) + ' Столбцы (' + cols.length + ')</button>' +
      (S.tmenu ? '<div class="tmenu sc"><div class="row" style="gap:6px;margin-bottom:6px"><button class="btn sm" data-a="otcolall">Все</button><button class="btn sm" data-a="otcolreset">По умолчанию</button></div>' + COLS.map(c => '<button class="tmi ' + (cols.indexOf(c) >= 0 ? 'on' : '') + '" data-a="otcol" data-k="' + c.k + '"><i>' + (cols.indexOf(c) >= 0 ? '✓' : '') + '</i>' + e(c.l) + '</button>').join('') + '</div>' : '') + '</div>' +
      '<select class="in" style="width:150px" data-c="otper">' + PERS.map(p => '<option value="' + p[0] + '"' + ((S.tper || '') === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') + '</select>' +
      (nf ? '<button class="btn" data-a="otclear">Сбросить фильтры (' + nf + ')</button>' : '') + '<span class="sp"></span><span class="mut">Найдено: <b>' + rows.length + '</b>' + (cols.some(c => c.k === 'sum') ? ' · на сумму <b>' + m(tot(COLS.find(c => c.k === 'sum'))) + '</b>' : '') + '</span></div>' +
      '<div class="tscroll sc">' + (tail ? more : '') + '<table class="tbl ttab"><thead><tr><th class="topen"></th>' + cols.map(c => '<th class="' + (c.r ? 'r' : '') + '" draggable="true" data-a="otsort" data-k="' + c.k + '" title="Потяни, чтобы переставить столбец">' + e(c.l) + (so.k === c.k ? (so.d > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr><tr class="tfrow"><th class="topen"></th>' + cols.map(c => '<th>' + fcell(c) + '</th>').join('') + '</tr></thead><tbody>' +
      shown.map(o => '<tr class="tr' + (closed(o) ? ' trc' : '') + (o.zone === 'Регионы' ? ' trg' : '') + '"><td class="topen"><button class="ib" data-a="opn" data-id="order:' + o.id + '" title="Открыть карточку заказа">↗</button></td>' + cols.map(c => cell(o, c)).join('') + '</tr>').join('') +
      '</tbody>' + (cols.some(c => c.tot) ? '<tfoot><tr><td></td>' + cols.map((c, i) => '<td class="' + (c.r ? 'r num' : '') + '"><b>' + (c.tot ? m(tot(c)) : i === 0 ? 'Итого' : '') + '</b></td>').join('') + '</tr></tfoot>' : '') + '</table>' +
      (tail ? '' : more) + (rows.length ? '' : '<div class="empty" style="padding:24px">Ничего не найдено</div>') + '</div>';
  }
  /* перестановка столбцов перетаскиванием заголовка */
  let dragK = null;
  document.addEventListener('dragstart', ev => { const th = ev.target.closest && ev.target.closest('.ttab th[data-k]'); if (!th) return; dragK = th.dataset.k; try { ev.dataTransfer.setData('text/plain', dragK); ev.dataTransfer.effectAllowed = 'move'; } catch (x) {} });
  document.addEventListener('dragover', ev => { if (dragK && ev.target.closest && ev.target.closest('.ttab th[data-k]')) ev.preventDefault(); });
  document.addEventListener('drop', ev => {
    const th = ev.target.closest && ev.target.closest('.ttab th[data-k]'); if (!dragK || !th) return; ev.preventDefault();
    const to = th.dataset.k, cur = tcols().slice(), from = cur.indexOf(dragK); dragK = null; if (from < 0 || to === cur[from]) return;
    cur.splice(from, 1); cur.splice(cur.indexOf(to) + (from < cur.indexOf(to) ? 1 : 0), 0, ev.dataTransfer.getData('text/plain') || ''); 
    S.tcols = cur.filter(Boolean); A.save(); A.render();
  });
  document.addEventListener('dragend', () => { dragK = null; });
  /* из карточки назад в таблицу: вкладка заказа закрывается, список остаётся как был */
  A.act.oback = el => { const i = S.tabs.findIndex(t => t.id === el.dataset.id); if (i > 0) S.tabs.splice(i, 1); A.open('orders'); };
  A.act.otmenu = () => { S.tmenu = !S.tmenu; A.render(); };
  A.act.otcol = el => { const cur = tcols().slice(), k = el.dataset.k, i = cur.indexOf(k); if (i >= 0) cur.splice(i, 1); else cur.push(k); S.tcols = cur; A.save(); A.render(); };
  A.act.otcolall = () => { S.tcols = COLS.map(c => c.k); A.save(); A.render(); };
  A.act.otcolreset = () => { S.tcols = DEFCOLS.slice(); A.save(); A.render(); };
  A.act.otsort = el => { const so = S.tsort || { k: 'no', d: 1 }; TPOS = 'end'; S.tsort = { k: el.dataset.k, d: so.k === el.dataset.k ? -so.d : 1 }; A.save(); A.render(); };
  A.act.otclear = () => { TPOS = 'end'; S.tf = {}; S.tper = ''; S.tlim = 200; A.save(); A.render(); };
  A.act.otmore = () => { TPOS = 0; S.tlim = (S.tlim || 200) + 300; A.render(); };
  A.fld.otf = (v, el) => { TPOS = 'end'; const F = tfilt(), k = el.dataset.k, p = el.dataset.p; if (p) F[k] = Object.assign({ a: '', b: '' }, F[k] || {}, { [p]: v }); else F[k] = v; S.tlim = 200; A.save(); A.render(); };
  A.fld.otper = v => { TPOS = 'end'; S.tper = v; S.tlim = 200; A.save(); A.render(); };
  document.addEventListener('click', ev => { if (S.tmenu && ev.target.closest && !ev.target.closest('.tmw')) { S.tmenu = false; A.render(); } }, true);

  A.module('orders', {
    card,
    render() {
      return '<div class="head"><h1>Заказы</h1><div class="seg">' + FILTERS.map(f => '<button class="' + (S.ordersFilter === f[0] ? 'on' : '') + '" data-a="ofilter" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="sp"></div>' +
        (D.real ? '<input class="in" style="width:200px" placeholder="Найти в списке…" value="' + e(S.oq || '') + '" data-c="oq">' + '<select class="in" style="width:110px" data-c="oyear"><option value="all">Все годы</option>' + years().map(y => '<option' + (S.oyear === y ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>' : '') +
        '<div class="seg"><button class="' + (S.ordersView === 'list' ? 'on' : '') + '" data-a="oview" data-v="list" title="Список и карточка">' + A.icon('list', 16) + ' Список</button><button class="' + (S.ordersView === 'kanban' ? 'on' : '') + '" data-a="oview" data-v="kanban" title="Канбан по этапам">' + A.icon('kanban', 16) + ' Канбан</button><button class="' + (S.ordersView === 'table' ? 'on' : '') + '" data-a="oview" data-v="table" title="Таблица с фильтрами">' + A.icon('table', 16) + ' Таблица</button></div>' +
        '<button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Заказ</button></div>' +
        (S.ordersView === 'table' ? table() : S.ordersView === 'kanban' ? kanban() : '<div class="split">' + list() + card(S.selOrder, false) + '</div>');
    }
  });
  A.act.oreopen = el => {
    const o = A.order(el.dataset.id), r = o && DB.raw().find(x => x.uid === o.uid); if (!r || !r.cart) return;
    JalCart.restore(r.cart, DB.keyOf(r)); A.toast((r.no ? 'Заказ № ' + r.no : 'Черновик') + ' открыт в расчёте'); A.open('calc');
  };
  A.fld.icost = (v, el) => { DB.setCost(el.dataset.uid, el.dataset.ix.split(',').map(Number), v, String(v).trim() !== '' && +String(v).replace(/\s/g, '') === 0); A.render(); };
  A.act.icost0 = el => { DB.setCost(el.dataset.uid, el.dataset.ix.split(',').map(Number), 0, true); A.render(); };
  A.act.osup = el => { const o = A.order(el.dataset.id); if (!o) return; DB.patchRec(o.uid, { supSent: !o.supSent, supAt: o.supSent ? '' : new Date().toISOString().slice(0, 10) }); A.render(); };
  A.act.otab = el => { S.orderTab = el.dataset.t; A.save(); A.render(); };
  A.act.ofilter = el => { S.ordersFilter = el.dataset.f; S.olimit = LIM; A.save(); A.render(); };
  A.act.oview = el => { S.ordersView = el.dataset.v; A.save(); A.render(); };
  A.act.omore = () => { S.olimit = (S.olimit || LIM) + 200; A.render(); };
  A.act.odel = el => {
    const o = A.order(el.dataset.id); if (!o) return;
    if (!el.dataset.y) { S.odelId = o.id; S.odelAt = Date.now(); A.render(); const n = document.getElementById('odelno'); if (n) n.focus(); return; }
    if (Date.now() - (S.odelAt || 0) < 800) return; /* защита от случайного двойного клика */
    S.odelId = null; S.selOrder = null;
    DB.delOrder(o);
    A.toast('Заказ № ' + o.no + ' удалён'); A.render();
  };
  A.act.oarch = el => { const o = A.order(el.dataset.id); if (!o) return; const on = !o.archived; DB.archive(o, on); S.selOrder = null; A.toast(on ? 'Заказ № ' + o.no + ' в архиве' : 'Заказ № ' + o.no + ' возвращён'); A.render(); };
  A.act.odelno = () => { S.odelId = null; A.render(); };
  A.act.dupres = el => { DB.dupSet(el.dataset.uid, el.dataset.v); S.selOrder = null; A.toast('Готово'); A.render(); };
  A.act.oclaim = el => { const o = A.order(el.dataset.id); if (!o) return; o.claim = !o.claim; if (o.ph) DB.patchRec(o.uid, { claim: o.claim }); else DB.commit(o); A.render(); };
  A.act.oflag = el => {
    const o = A.order(el.dataset.id); if (!o || !o.fl) return; o.fl[el.dataset.k] = !o.fl[el.dataset.k]; o.stage = DB.stageOf(o.fl); DB.commit(o); A.render();
  };
  A.fld.oq = v => { S.oq = v; S.olimit = LIM; A.render(); const q = document.querySelector('[data-c="oq"]'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.fld.oyear = v => { S.oyear = v; S.olimit = LIM; A.save(); A.render(); };
  A.fld.ofld = (v, el) => { const o = A.order(el.dataset.id); if (!o) return; if (o.ph) { DB.patchRec(o.uid, { [el.dataset.k]: v }); return; } o[el.dataset.k] = v; if (window.DB && DB.real) DB.commit(o); };
})();
