/* Заказы: центральный объект. Список, канбан, карточка с воронкой, вкладки. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const FILTERS = [['all', 'Все'], ['work', 'В работе'], ['pay', 'Ждут оплаты'], ['claim', 'Рекламации'], ['done', 'Закрытые']];
  const pass = o => { const f = S.ordersFilter; return f === 'all' || (f === 'work' && o.stage > 0 && o.stage < 9) || (f === 'pay' && o.sum - o.paid > 0 && o.stage >= 3 && o.stage < 9) || (f === 'claim' && o.claim) || (f === 'done' && o.stage === 9); };
  const prof = o => o.sum - o.cost - (o.inst ? Math.round(o.sum * 0.12) : 0);
  const stepper = o => '<div class="stepper">' + D.STAGES.map((s, i) => '<div class="step ' + (i < o.stage ? 'done' : i === o.stage ? 'cur' : '') + '"><i>' + (i < o.stage ? '✓' : i + 1) + '</i>' + e(s) + '</div>').join('') + '</div>';

  const flags = o => [['В работе', o.stage >= 4], ['Оплачен поставщику', o.stage >= 5], ['Отправлен', o.stage >= 6], ['Получен', o.stage >= 7], ['ЗП монтажнику отдана', o.stage >= 9], ['Закрыто', o.stage >= 9]];
  const tabs = [['main', 'Общая'], ['meas', 'Замер'], ['items', 'Изделия'], ['fin', 'Финансы'], ['docs', 'Документы'], ['sup', 'Поставщик и доставка'], ['hist', 'История']];

  function body(o) {
    const c = A.client(o.client), t = S.orderTab;
    if (t === 'main') return '<div class="g2"><div class="stack" style="gap:10px"><div class="field"><label>Клиент</label><div class="b" style="cursor:pointer" data-a="opn" data-id="client:' + c.id + '">' + e(c.name) + '</div><div class="mut">' + e(c.phone) + ' · ' + e(c.addr) + '</div></div>' +
        '<div class="field"><label>Источник</label><div>' + e(c.src) + '</div></div><div class="field"><label>Заметка</label><div>' + e(o.note || '—') + '</div></div></div>' +
        '<div class="card flat"><h2>Признаки заказа</h2><div class="chips" style="margin-top:8px">' + flags(o).map(f => '<span class="pill ' + (f[1] ? 'ok' : '') + '">' + (f[1] ? '✓ ' : '') + f[0] + '</span>').join('') + '</div>' +
        '<div class="row wrap" style="margin-top:10px"><span class="pill info">' + e(o.zone) + '</span><span class="pill">Категория: ' + e(o.cat) + '</span><span class="pill">' + (o.inst ? 'С монтажом' : 'Без монтажа') + '</span>' + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '</div></div></div>';
    if (t === 'meas') return '<div class="callout info">Замер может не понадобиться: КП часто даётся по размерам клиента до выезда. Этап «Замер» в воронке пропускаемый.</div><div class="g2" style="margin-top:12px"><div class="field"><label>Дата и время замера</label><input class="in" value="09.10.2026, 12:00"></div><div class="field"><label>Замерщик</label><input class="in" value="Хорошавин"></div></div><p class="mut">Здесь будет замерный лист из телефонной версии (шаг 1 этапа «Перенос»): таблица изделий, часы тишины, примечания, монтаж, печать бланка.</p>';
    if (t === 'items') return '<table class="tbl"><thead><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Шт</th><th class="r">Сумма</th></tr></thead><tbody><tr><td>1</td><td>Дерево 50, Белый (павловния)</td><td>1200×1500</td><td class="r">2</td><td class="r num">18 400 ₽</td></tr><tr><td>2</td><td>Дерево 50, Белый (павловния)</td><td>900×1400</td><td class="r">1</td><td class="r num">8 200 ₽</td></tr></tbody></table><div class="row" style="margin-top:12px"><button class="btn pri" data-a="nav" data-id="calc">Открыть в расчёте</button><button class="btn" data-a="stub" data-t="пересчёт по новым ценам">Пересчитать по новым ценам</button></div>';
    if (t === 'fin') return '<div class="g3"><div class="kpi"><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div class="kpi"><small>Получено</small><b>' + m(o.paid) + '</b></div><div class="kpi"><small>Долг клиента</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div></div>' +
      '<table class="tbl" style="margin-top:12px"><thead><tr><th>Дата</th><th>Операция</th><th>Способ</th><th class="r">Сумма</th></tr></thead><tbody>' + (o.paid ? '<tr><td>' + e(o.created) + '</td><td>Предоплата</td><td>СБП</td><td class="r num">' + m(o.paid) + '</td></tr>' : '<tr><td colspan="4" class="mut">Платежей ещё нет</td></tr>') + '</tbody></table><div class="row" style="margin-top:10px"><button class="btn" data-a="stub" data-t="приход по заказу">+ Приход</button><button class="btn" data-a="stub" data-t="расход по заказу">+ Расход</button></div>';
    if (t === 'docs') return '<table class="tbl"><thead><tr><th>Документ</th><th>Статус</th><th></th></tr></thead><tbody>' + [['Замерный лист', 'готов'], ['КП', 'отправлено'], ['Договор с приложением', 'не создан'], ['Счёт на оплату', 'позже'], ['УПД', 'позже'], ['Акт', 'позже'], ['Гарантийный талон', 'позже']].map(d => '<tr><td>' + d[0] + '</td><td><span class="pill ' + (d[1] === 'готов' || d[1] === 'отправлено' ? 'ok' : '') + '">' + d[1] + '</span></td><td class="r"><button class="btn sm" data-a="stub" data-t="формирование документа">Сформировать</button></td></tr>').join('') + '</tbody></table>';
    if (t === 'sup') return '<div class="g2"><div class="field"><label>Поставщик</label><div class="b">' + e(o.sup || '—') + '</div></div><div class="field"><label>Заводской номер заказа у поставщика</label><input class="in" placeholder="например, МК26022376"></div><div class="field"><label>ТК и трек</label><input class="in" value="' + e(o.tk) + '"></div><div class="field"><label>Адрес ПВЗ</label><input class="in" value="' + (o.zone === 'Регионы' ? 'Тверь, ул. Советская 5' : '') + '"></div><div class="field"><label>Дата изготовления</label><input class="in" value="' + e(o.due) + '"></div></div>';
    return '<div class="stack" style="gap:8px">' + [['08.10 11:20', 'Создан заказ'], ['08.10 11:40', 'Отправлено КП'], ['08.10 15:02', 'Клиент подтвердил замер']].map(h => '<div class="row"><span class="mut num">' + h[0] + '</span><span>' + h[1] + '</span></div>').join('') + '</div>';
  }

  function card(id, full) {
    const o = A.order(id) || D.orders[0], c = A.client(o.client);
    return '<div class="card" style="min-height:100%"><div class="row wrap" style="margin-bottom:6px"><h1>Заказ № ' + o.no + '</h1>' + A.stagePill(o) + (o.claim ? '<span class="pill bad">Рекламация</span>' : '') + '<span class="sp"></span>' +
      (full ? '' : '<button class="btn sm" data-a="opn" data-id="order:' + o.id + '">Открыть во вкладке</button>') + '</div><div class="mut" style="margin-bottom:10px">' + e(c.name) + ' · ' + e(o.title) + '</div>' + stepper(o) +
      '<div class="itabs">' + tabs.map(t => '<button class="' + (S.orderTab === t[0] ? 'on' : '') + '" data-a="otab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + body(o) +
      '<div class="sumbar"><div><small>Сумма заказа</small><b>' + m(o.sum) + '</b></div><div><small>Оплачено</small><b>' + m(o.paid) + '</b></div><div><small>Долг</small><b>' + m(Math.max(0, o.sum - o.paid)) + '</b></div><div><small>Закуп</small><b>' + m(o.cost) + '</b></div><div><small>Прибыль</small><b>' + m(prof(o)) + '</b></div></div></div>';
  }

  function list() {
    const rows = D.orders.filter(pass);
    return '<div class="card p0"><table class="tbl"><thead><tr><th>№</th><th>Клиент</th><th>Этап</th><th class="r">Сумма</th></tr></thead><tbody>' + rows.map(o =>
      '<tr class="' + (o.id === S.selOrder ? 'sel' : '') + '" data-a="selo" data-id="' + o.id + '"><td class="b">' + o.no + '</td><td>' + e(A.client(o.client).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + '</div></td><td>' + A.stagePill(o) + '</td><td class="r num">' + m(o.sum) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function kanban() {
    return '<div class="kan">' + D.STAGES.map((s, i) => { const os = D.orders.filter(o => o.stage === i && pass(o)); return '<div class="kcol"><h3><span>' + e(s) + '</span><span>' + os.length + '</span></h3>' + os.map(o => '<div class="kc" data-a="opn" data-id="order:' + o.id + '"><b>№ ' + o.no + '</b> · ' + e(A.client(o.client).name) + '<div class="mut" style="font-size:12px">' + e(o.title) + '</div><div class="num b" style="margin-top:4px">' + m(o.sum) + '</div></div>').join('') + '</div>'; }).join('') + '</div>';
  }

  A.module('orders', {
    card,
    render() {
      return '<div class="head"><h1>Заказы</h1><div class="seg">' + FILTERS.map(f => '<button class="' + (S.ordersFilter === f[0] ? 'on' : '') + '" data-a="ofilter" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="sp"></div>' +
        '<div class="seg"><button class="' + (S.ordersView === 'list' ? 'on' : '') + '" data-a="oview" data-v="list" title="Список и карточка">' + A.icon('list', 16) + ' Список</button><button class="' + (S.ordersView === 'kanban' ? 'on' : '') + '" data-a="oview" data-v="kanban" title="Канбан по этапам">' + A.icon('kanban', 16) + ' Канбан</button></div>' +
        '<button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Заказ</button></div>' +
        (S.ordersView === 'kanban' ? kanban() : '<div class="split">' + list() + card(S.selOrder, false) + '</div>');
    }
  });
  A.act.otab = el => { S.orderTab = el.dataset.t; A.save(); A.render(); };
  A.act.ofilter = el => { S.ordersFilter = el.dataset.f; A.save(); A.render(); };
  A.act.oview = el => { S.ordersView = el.dataset.v; A.save(); A.render(); };
})();
