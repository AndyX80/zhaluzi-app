/* Клиенты (CRM): список и карточка клиента со связанными заказами */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const tabs = [['main', 'Клиент'], ['orders', 'Заказы'], ['events', 'События'], ['pay', 'Оплаты'], ['docs', 'Документы'], ['hist', 'История']];
  function body(c) {
    const os = D.orders.filter(o => o.client === c.id), t = S.clientTab;
    if (t === 'main') return '<div class="g2"><div class="stack" style="gap:10px"><div class="field"><label>Телефон</label><div>' + e(c.phone) + '</div></div><div class="field"><label>Адрес</label><div>' + e(c.addr) + '</div></div><div class="field"><label>Источник обращения</label><div>' + e(c.src) + '</div></div></div><div class="field"><label>Заметка</label><div>' + e(c.note || '—') + '</div><label style="margin-top:10px">Ссылка на чат</label><div class="mut">Telegram / MAX: появится позже</div></div></div>';
    if (t === 'orders') return '<table class="tbl"><thead><tr><th>№</th><th>Заказ</th><th>Этап</th><th class="r">Сумма</th></tr></thead><tbody>' + os.map(o => '<tr data-a="opn" data-id="order:' + o.id + '"><td class="b">' + o.no + '</td><td>' + e(o.title) + '</td><td>' + A.stagePill(o) + '</td><td class="r num">' + m(o.sum) + '</td></tr>').join('') + '</tbody></table>' + (os.length ? '' : '<p class="mut">Заказов пока нет</p>');
    if (t === 'events') return D.real ? '<p class="mut">События клиента (замеры, монтажи) появятся вместе с календарём.</p>' : '<div class="stack" style="gap:8px"><div class="ev measure"><b>09.10 12:00</b> · Замер</div><div class="ev work"><b>10.10 15:00</b> · Позвонить по КП</div></div>';
    if (t === 'pay') return '<p class="mut">Все платежи клиента по его заказам. Сумма оплачено: <b>' + m(os.reduce((a, o) => a + o.paid, 0)) + '</b>, долг: <b>' + m(os.reduce((a, o) => a + Math.max(0, o.sum - o.paid), 0)) + '</b></p>';
    if (t === 'docs') return '<p class="mut">Документы всех заказов клиента (КП, договоры, замерные листы) собираются здесь.</p>';
    return '<p class="mut">Журнал действий по клиенту: звонки, отправленные КП, смена этапов.</p>';
  }
  function card(id, full) {
    const c = A.client(id) || D.clients[0];
    return '<div class="card" style="min-height:100%"><div class="row" style="margin-bottom:12px"><span class="ava" style="width:46px;height:46px;font-size:16px">' + e(c.name.replace(/[^А-ЯЁA-Z ]/g, '').split(' ').map(w => w[0]).join('').slice(0, 2)) + '</span><div><h1>' + e(c.name) + '</h1><div class="mut">' + e(c.phone) + '</div></div><span class="sp"></span>' + (full ? '' : '<button class="btn sm" data-a="opn" data-id="client:' + c.id + '">Открыть во вкладке</button>') + '<button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Заказ</button></div>' +
      '<div class="itabs">' + tabs.map(t => '<button class="' + (S.clientTab === t[0] ? 'on' : '') + '" data-a="ctab" data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>' + body(c) + '</div>';
  }
  A.module('clients', {
    card,
    render() {
      const cnt = {}; D.orders.forEach(o => { cnt[o.client] = (cnt[o.client] || 0) + 1; });
      const q = (S.cq || '').trim().toLowerCase(), qd = q.replace(/\D/g, ''), all = D.clients.filter(c => !q || (c.name + ' ' + c.phone).toLowerCase().indexOf(q) >= 0 || (qd.length > 3 && c.phone.replace(/\D/g, '').indexOf(qd) >= 0)), lim = S.climit || 80;
      return '<div class="head"><h1>Клиенты</h1><span class="pill">' + D.clients.length + (D.real ? '' : ' в демо') + '</span><div class="sp"></div>' + (D.real ? '<input class="in" style="width:220px" placeholder="Имя или телефон…" value="' + e(S.cq || '') + '" data-c="cq">' : '') + '<button class="btn pri" data-a="new-client">' + A.icon('plus', 16) + ' Клиент</button></div>' +
        '<div class="split"><div class="card p0"><table class="tbl"><thead><tr><th>Клиент</th><th>Источник</th><th class="r">Заказов</th></tr></thead><tbody>' + all.slice(0, lim).map(c => '<tr class="' + (c.id === S.selClient ? 'sel' : '') + '" data-a="selc" data-id="' + c.id + '"><td class="b">' + e(c.name) + '<div class="mut" style="font-size:12px;font-weight:400">' + e(c.phone) + '</div></td><td>' + e(c.src) + '</td><td class="r">' + (cnt[c.id] || 0) + '</td></tr>').join('') + '</tbody></table>' + (all.length > lim ? '<div style="padding:10px;text-align:center"><button class="btn sm" data-a="cmore">Показать ещё (' + (all.length - lim) + ')</button></div>' : '') + '</div>' + card(S.selClient, false) + '</div>';
    }
  });
  A.act.cmore = () => { S.climit = (S.climit || 80) + 200; A.render(); };
  A.fld.cq = v => { S.cq = v; S.climit = 80; A.render(); const q = document.querySelector('[data-c="cq"]'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.act.ctab = el => { S.clientTab = el.dataset.t; A.save(); A.render(); };
})();
