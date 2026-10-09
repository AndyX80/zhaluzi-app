/* Заказы: центральный объект. Список, канбан, карточка с воронкой, вкладки. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const FILTERS = [['all', 'Все'], ['work', 'В работе'], ['pay', 'Ждут оплаты'], ['claim', 'Рекламации'], ['done', 'Закрытые'], ['arch', 'Архив']];
  const closed = o => o.fl ? !!o.fl.closed : o.stage === 9;
  const pass = o => {
    const f = S.ordersFilter;
    if (f === 'arch') return !!o.archived; if (o.archived) return false;
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
  const stepper = o => '<div class="stepper">' + D.STAGES.map((s, i) => '<div class="step ' + (i < o.stage ? 'done' : i === o.stage ? 'cur' : '') + '"><i>' + (i < o.stage ? '✓' : i + 1) + '</i>' + e(s) + '</div>').join('') + '</div>';

  const FL = [['work', 'В работе'], ['sup', 'Оплачен поставщику'], ['sent', 'Отправлен'], ['got', 'Получен'], ['zp', 'ЗП монтажнику отдана'], ['closed', 'Закрыто']];
  const flags = o => o.fl ? FL.map(x => [x[1], !!o.fl[x[0]], x[0]]) : [['В работе', o.stage >= 4], ['Оплачен поставщику', o.stage >= 5], ['Отправлен', o.stage >= 6], ['Получен', o.stage >= 7], ['ЗП монтажнику отдана', o.stage >= 9], ['Закрыто', o.stage >= 9]];
  const tabs = [['main', 'Общая'], ['meas', 'Замер'], ['items', 'Изделия'], ['fin', 'Финансы'], ['docs', 'Документы'], ['sup', 'Поставщик и доставка'], ['hist', 'История']];
  const inp = (k, o, label, ph) => '<div class="field"><label>' + label + '</label><input class="in" value="' + e(o[k] || '') + '" placeholder="' + (ph || '') + '" data-c="ofld" data-k="' + k + '" data-id="' + o.id + '"></div>';

  /* состав заказа, собранного в расчёте: одинаковые позиции склеены */
  function itemsPh(o) {
    const g = [], idx = {};
    (o.items || []).forEach(i => {
      const nm = i.kind ? (i.title || 'Услуга') : [i.sup, i.mat, i.lam ? i.lam + ' мм' : '', i.o && i.o.color].filter(Boolean).join(', ');
      const sz = i.W ? Math.round(i.W * 10) + '×' + Math.round(i.H * 10) : '', k = nm + '|' + sz + '|' + i.price;
      if (idx[k] == null) { idx[k] = g.length; g.push({ nm, sz, price: +i.price || 0, n: 0, sub: i.o ? [(i.o.opts || []).join(', '), i.o.fix || ''].filter(Boolean).join(' · ') : '' }); }
      g[idx[k]].n++;
    });
    const sum = (o.items || []).reduce((a, i) => a + (+i.price || 0), 0);
    return '<table class="tbl"><thead><tr><th>№</th><th>Изделие</th><th>Размер, мм</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th></tr></thead><tbody>' +
      g.map((x, n) => '<tr><td>' + (n + 1) + '</td><td><b>' + e(x.nm) + '</b>' + (x.sub ? '<div class="mut" style="font-size:12px">' + e(x.sub) + '</div>' : '') + '</td><td class="num">' + e(x.sz) + '</td><td class="r">' + x.n + '</td><td class="r num">' + m(x.price) + '</td><td class="r num">' + m(x.price * x.n) + '</td></tr>').join('') +
      '</tbody></table><div class="mut" style="margin-top:8px">Цены с доставкой и монтажом' + (o.disc ? '. Скидка: −' + m(o.disc) : '') + '. Итого: <b>' + m(Math.max(0, sum - (o.disc || 0))) + '</b></div>' +
      (o.hasCart ? '<div class="row" style="margin-top:12px"><button class="btn pri" data-a="oreopen" data-id="' + o.id + '">Открыть в расчёте</button></div>' : '');
  }

  function body(o) {
    const c = A.client(o.client) || { id: '', name: '', phone: '', addr: '', src: '' }, t = S.orderTab, real = !!o.fl;
    if (t === 'main') return '<div class="g2"><div class="stack" style="gap:10px"><div class="field"><label>Клиент</label><div class="b" style="cursor:pointer" data-a="opn" data-id="client:' + c.id + '">' + e(c.name) + '</div><div class="mut">' + e(c.phone) + (c.addr ? ' · ' + e(c.addr) : '') + '</div></div>' +
        '<div class="field"><label>Источник</label><div>' + e(o.src || c.src || 'не указан') + '</div></div><div class="field"><label>Заметка</label><div>' + e(o.note || '—') + '</div></div>' +
        (o.yur ? '<div class="field"><label>Юридическое лицо</label><div>' + e(o.yur.name) + '</div><div class="mut">ЭДО: ' + (o.yur.edo ? 'есть' : 'нет') + ' · УПД отдали: ' + (o.yur.upd ? 'да' : 'нет') + ' · УПД подписан: ' + (o.yur.sign ? 'да' : 'нет') + (o.yur.note ? ' · ' + e(o.yur.note) : '') + '</div></div>' : '') + '</div>' +
        '<div class="card flat"><h2>Признаки заказа' + (real ? ' <span class="soon">нажми, чтобы отметить</span>' : '') + '</h2><div class="chips" style="margin-top:8px">' + flags(o).map(f => '<span class="pill ' + (f[1] ? 'ok' : '') + '"' + (real ? ' style="cursor:pointer" data-a="oflag" data-k="' + f[2] + '" data-id="' + o.id + '"' : '') + '>' + (f[1] ? '✓ ' : '') + f[0] + '</span>').join('') + '</div>' +
        '<div class="row wrap" style="margin-top:10px"><span class="pill info">' + e(o.zone) + '</span><span class="pill">Категория: ' + e(o.cat) + '</span><span class="pill">' + (o.inst ? 'С монтажом' : 'Без монтажа') + '</span>' + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '</div></div></div>';
    if (t === 'meas') return '<div class="callout info">Замер может не понадобиться: КП часто даётся по размерам клиента до выезда. Этап «Замер» в воронке пропускаемый.</div><p class="mut" style="margin-top:12px">Здесь будет замерный лист из телефонной версии: таблица изделий, часы тишины, примечания, монтаж, печать бланка.</p>';
    if (t === 'items' && o.ph) return itemsPh(o);
    if (t === 'items') return real && o.legacy ? '<div class="callout info">Это заказ из вашего Excel-учёта: состав изделий там не вёлся (только категория «' + e(o.cat) + '» и поставщик «' + e(o.sup || '—') + '»). Новые заказы, собранные в расчёте, сохраняют полный список изделий.</div>' :
      '<table class="tbl"><thead><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Шт</th><th class="r">Сумма</th></tr></thead><tbody><tr><td>1</td><td>Дерево 50, Белый (павловния)</td><td>1200×1500</td><td class="r">2</td><td class="r num">18 400 ₽</td></tr><tr><td>2</td><td>Дерево 50, Белый (павловния)</td><td>900×1400</td><td class="r">1</td><td class="r num">8 200 ₽</td></tr></tbody></table><div class="row" style="margin-top:12px"><button class="btn pri" data-a="nav" data-id="calc">Открыть в расчёте</button><button class="btn" data-a="stub" data-t="пересчёт по новым ценам">Пересчитать по новым ценам</button></div>';
    if (t === 'fin') return '<div class="g3"><div class="kpi"><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div class="kpi"><small>Получено</small><b>' + m(o.paid) + '</b></div><div class="kpi"><small>Долг клиента</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div></div>' +
      '<div class="g3" style="margin-top:12px"><div class="kpi"><small>Закуп</small><b>' + m(o.cost) + '</b></div><div class="kpi"><small>Оплата монтажника</small><b>' + m(o.instCost || 0) + '</b></div><div class="kpi"><small>Прибыль</small><b>' + m(prof(o)) + '</b><i> ' + (o.sum ? Math.round(prof(o) / o.sum * 100) : 0) + '%</i></div></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-a="stub" data-t="приход по заказу">+ Приход</button><button class="btn" data-a="stub" data-t="расход по заказу">+ Расход</button></div>';
    if (t === 'docs') return '<table class="tbl"><thead><tr><th>Документ</th><th>Статус</th><th></th></tr></thead><tbody>' + [['Замерный лист', real ? 'был на бумаге' : 'готов'], ['КП', real ? 'не сохранялось' : 'отправлено'], ['Договор с приложением', real ? 'не сохранялся' : 'не создан'], ['Счёт на оплату', 'позже'], ['УПД', o.yur ? (o.yur.sign ? 'подписан' : o.yur.upd ? 'отдан' : 'не отдан') : 'позже'], ['Акт', 'позже'], ['Гарантийный талон', 'позже']].map(d => '<tr><td>' + d[0] + '</td><td><span class="pill ' + (/готов|отправлено|подписан|отдан/.test(d[1]) ? 'ok' : '') + '">' + d[1] + '</span></td><td class="r"><button class="btn sm" data-a="stub" data-t="формирование документа">Сформировать</button></td></tr>').join('') + '</tbody></table>';
    if (t === 'sup') return '<div class="g2"><div class="field"><label>Поставщик</label><div class="b">' + e(o.sup || '—') + '</div></div>' + inp('factory', o, 'Заводской номер заказа у поставщика', 'например, МК26022376') + inp('tk', o, 'ТК, трек, примечания') + '<div class="field"><label>Зона</label><div>' + e(o.zone) + '</div></div>' + inp('due', o, 'Дата изготовления (ГГГГ-ММ-ДД)', '2026-10-15') + '</div>';
    return '<div class="stack" style="gap:8px"><div class="row"><span class="mut num">' + e(dmy(o.created)) + '</span><span>Создан заказ</span></div>' + (real ? '<div class="mut">Журнал действий ведётся с момента перехода на новую систему.</div>' : '') + '</div>';
  }

  function card(id, full) {
    const o = A.order(id) || D.orders[0], c = A.client(o.client) || { name: '' };
    return '<div class="card" style="min-height:100%"><div class="row wrap" style="margin-bottom:6px"><h1>Заказ № ' + o.no + '</h1>' + A.stagePill(o) + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '<span class="sp"></span>' + (D.real ? (S.odelId === o.id ? '<span class="mut">Удалить заказ?</span><button class="btn sm" style="width:120px;background:#c0392b;border-color:#c0392b;color:#fff" data-a="odel" data-id="' + o.id + '" data-y="1">Да, удалить</button><button class="btn sm" id="odelno" style="width:120px;background:#2e8b57;border-color:#2e8b57;color:#fff" data-a="odelno">Нет</button>' : '<button class="btn sm" data-a="oarch" data-id="' + o.id + '">' + (o.archived ? 'Вернуть из архива' : 'В архив') + '</button><button class="btn sm" data-a="odel" data-id="' + o.id + '">Удалить заказ</button>') : '') +
      (full ? '' : '<button class="btn sm" data-a="opn" data-id="order:' + o.id + '">Открыть во вкладке</button>') + '</div>' + dupBox(o) + '<div class="mut" style="margin-bottom:10px">' + e(c.name) + ' · ' + e(o.title) + (o.created ? ' · ' + e(dmy(o.created)) : '') + '</div>' + stepper(o) +
      '<div class="itabs">' + tabs.map(t => '<button class="' + (S.orderTab === t[0] ? 'on' : '') + '" data-a="otab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + body(o) +
      '<div class="sumbar"><div><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div><small>Оплачено</small><b>' + m(o.paid) + '</b></div><div><small>Долг</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div><div><small>Закуп</small><b>' + m(o.cost) + '</b></div><div><small>Прибыль</small><b>' + m(prof(o)) + '</b></div></div></div>';
  }

  const LIM = 80;
  function list() {
    const all = D.orders.filter(pass), lim = S.olimit || LIM, rows = all.slice(0, lim);
    return '<div class="card p0"><table class="tbl"><thead><tr><th>№</th><th>Клиент</th><th>Этап</th><th class="r">Сумма</th></tr></thead><tbody>' + rows.map(o =>
      '<tr class="' + (o.id === S.selOrder ? 'sel' : '') + '" data-a="selo" data-id="' + o.id + '"><td class="b">' + o.no + '</td><td>' + e((A.client(o.client) || {}).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + (o.created ? ' · ' + e(dmy(o.created)) : '') + '</div></td><td>' + A.stagePill(o) + '</td><td class="r num">' + m(o.sum) + '</td></tr>').join('') + '</tbody></table>' +
      (all.length > lim ? '<div style="padding:10px;text-align:center"><button class="btn sm" data-a="omore">Показать ещё (осталось ' + (all.length - lim) + ')</button></div>' : '') + (all.length ? '' : '<div class="empty" style="padding:24px">Ничего не найдено</div>') + '</div>';
  }
  function kanban() {
    return '<div class="kan">' + D.STAGES.map((s, i) => { if (D.real && i === 9) return ''; const os = D.orders.filter(o => o.stage === i && !closed(o) && pass(o)); return '<div class="kcol"><h3><span>' + e(s) + '</span><span>' + os.length + '</span></h3>' + os.map(o => '<div class="kc" data-a="opn" data-id="order:' + o.id + '"><b>№ ' + o.no + '</b> · ' + e((A.client(o.client) || {}).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + '</div><div class="num b" style="margin-top:4px">' + m(o.sum) + '</div></div>').join('') + '</div>'; }).join('') + '</div>';
  }
  const years = () => { const y = {}; D.orders.forEach(o => { if (/^\d{4}/.test(o.created || '')) y[o.created.slice(0, 4)] = 1; }); return Object.keys(y).sort().reverse(); };

  A.module('orders', {
    card,
    render() {
      return '<div class="head"><h1>Заказы</h1><div class="seg">' + FILTERS.map(f => '<button class="' + (S.ordersFilter === f[0] ? 'on' : '') + '" data-a="ofilter" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="sp"></div>' +
        (D.real ? '<input class="in" style="width:200px" placeholder="Найти в списке…" value="' + e(S.oq || '') + '" data-c="oq">' + '<select class="in" style="width:110px" data-c="oyear"><option value="all">Все годы</option>' + years().map(y => '<option' + (S.oyear === y ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>' : '') +
        '<div class="seg"><button class="' + (S.ordersView === 'list' ? 'on' : '') + '" data-a="oview" data-v="list" title="Список и карточка">' + A.icon('list', 16) + ' Список</button><button class="' + (S.ordersView === 'kanban' ? 'on' : '') + '" data-a="oview" data-v="kanban" title="Канбан по этапам">' + A.icon('kanban', 16) + ' Канбан</button></div>' +
        '<button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Заказ</button></div>' +
        (S.ordersView === 'kanban' ? kanban() : '<div class="split">' + list() + card(S.selOrder, false) + '</div>');
    }
  });
  A.act.oreopen = el => {
    const o = A.order(el.dataset.id), r = o && DB.raw().find(x => x.uid === o.uid); if (!r || !r.cart) return;
    JalCart.restore(r.cart, String(r.no)); A.toast('Заказ № ' + r.no + ' открыт в расчёте'); A.open('calc');
  };
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
  A.act.oflag = el => {
    const o = A.order(el.dataset.id); if (!o || !o.fl) return; o.fl[el.dataset.k] = !o.fl[el.dataset.k]; o.stage = DB.stageOf(o.fl); DB.commit(o); A.render();
  };
  A.fld.oq = v => { S.oq = v; S.olimit = LIM; A.render(); const q = document.querySelector('[data-c="oq"]'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.fld.oyear = v => { S.oyear = v; S.olimit = LIM; A.save(); A.render(); };
  A.fld.ofld = (v, el) => { const o = A.order(el.dataset.id); if (!o) return; o[el.dataset.k] = v; if (window.DB && DB.real) DB.commit(o); };
})();
