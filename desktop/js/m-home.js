/* Рабочий стол: что происходит сейчас и что требует внимания */
(function () {
  const A = App, D = A.D, e = A.esc, m = A.money;
  A.stagePill = o => { const i = o.stage, n = D.STAGES[i]; return '<span class="pill ' + (i === 9 ? 'ok' : i >= 4 ? 'info' : i === 0 ? 'gray' : 'acc') + '">' + e(n) + '</span>'; };
  const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const cname = o => (A.client(o.client) || {}).name || '';
  /* что требует внимания: считается из признаков заказа (в реальных данных) */
  A.attention = () => {
    if (!D.real) return [['order:o6', 'bad', 'Заказ 1321: открыта рекламация (перекос ламелей), ответ поставщику не отправлен'], ['order:o3', 'warn', 'Заказ 1324: до монтажа 9 дней, остаток 59 200 ₽ ещё не получен'], ['order:o2', 'warn', 'Заказ 1325: КП отправлено вчера, клиент не ответил'], ['order:o1', 'info', 'Заказ 1326: подтвердить время замера на завтра']];
    const out = [], today = todayIso();
    (window.DB && DB.dups || []).forEach(r => { const o = D.orders.find(x => x.no === String(r.no)); if (o) out.push([9e9, 'order:' + o.id, 'bad', 'Заказ № ' + r.no + ' задвоен (Excel и телефон): выбери, какой оставить']); });
    D.orders.forEach(o => {
      if (o.archived) return;
      const f = o.fl || {}, base = '№ ' + o.no + ' ' + cname(o) + ': ', debt = o.sum - o.paid;
      if (debt > 0) out.push([debt, 'order:' + o.id, o.created < today.slice(0, 8) + '01' ? 'bad' : 'warn', base + 'долг клиента ' + m(debt)]);
      if (f.closed) return;
      if (!f.sup) out.push([5e4, 'order:' + o.id, 'warn', base + 'не оплачен поставщику']);
      else if (!f.sent) out.push([4e4, 'order:' + o.id, 'info', base + 'оплачен поставщику, ждёт отправки']);
      else if (!f.got) out.push([3e4, 'order:' + o.id, 'info', base + 'в пути, ждём получения']);
      else if (o.inst && !f.zp) out.push([2e4, 'order:' + o.id, 'warn', base + 'получен, монтаж и зарплата монтажнику']);
      else out.push([1e4, 'order:' + o.id, 'info', base + 'получен, остаётся закрыть заказ']);
    });
    return out.sort((x, y) => y[0] - x[0]).map(x => x.slice(1));
  };
  A.module('home', {
    render() {
      const real = D.real, open = real ? D.orders.filter(o => !(o.fl && o.fl.closed)) : D.orders.filter(o => o.stage > 0 && o.stage < 9);
      const byS = D.STAGES.map((s, i) => [s, D.orders.filter(o => o.stage === i).length]).filter(x => !real || x[1] || true);
      const debt = real ? D.orders.reduce((a, o) => a + Math.max(0, o.sum - o.paid), 0) : D.orders.reduce((a, o) => a + (o.stage >= 3 ? Math.max(0, o.sum - o.paid) : 0), 0);
      const today = D.events.filter(x => x.d === 3), t = todayIso(), ms = real ? window.DB.stats(t.slice(0, 8) + '01', t.slice(0, 8) + '31') : null;
      const attn = A.attention().slice(0, real ? 8 : 4), dt = new Date(), ruDate = dt.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const mx = Math.max.apply(null, byS.map(s => s[1])) || 1;
      return '<div class="head"><div><h1>Добрый день, Андрей</h1><div class="mut">' + (real ? ruDate.charAt(0).toUpperCase() + ruDate.slice(1) : 'Четверг, 8 октября 2026') + '</div></div><div class="sp"></div>' +
        '<button class="btn" data-a="nav" data-id="calendar">Календарь</button><button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Новый заказ</button></div>' +
        '<div class="stack">' +
        '<div class="g4">' +
        (real ? '<div class="kpi"><small>Заказов в этом месяце</small><b>' + ms.n + '</b><i> на ' + m(ms.rev) + '</i></div>' : '<div class="kpi"><small>Событий сегодня</small><b>' + today.length + '</b><i> замер, монтаж, личное</i></div>') +
        '<div class="kpi"><small>Заказов в работе</small><b>' + open.length + '</b><i> ' + (real ? 'не закрыты' : 'из ' + D.orders.length + ' в демо') + '</i></div>' +
        '<div class="kpi"><small>Долги клиентов</small><b>' + m(debt) + '</b><i> ' + (real ? 'по всем заказам' : 'по подписанным договорам') + '</i></div>' +
        '<div class="kpi"><small>Прибыль за месяц</small><b>' + m(real ? ms.prof : 58400) + '</b><i>' + (real ? ' по заказам месяца' : ' октябрь, на 08.10') + '</i></div></div>' +
        '<div class="card"><h2>Требует внимания</h2><div class="stack" style="gap:8px">' + (attn.length ? attn.map(a =>
          '<div class="callout ' + (a[1] === 'bad' ? 'bad' : a[1] === 'info' ? 'info' : '') + ' row" style="cursor:pointer" data-a="opn" data-id="' + a[0] + '">' + A.icon(a[1] === 'info' ? 'info' : 'warn', 18) + '<span>' + e(a[2]) + '</span></div>').join('') : '<div class="mut">Всё в порядке</div>') + '</div></div>' +
        '<div class="g2">' +
        '<div class="card"><h2>Заказы по этапам' + (real ? ' (за всё время)' : '') + '</h2>' + byS.map(s => '<div class="hb"><span>' + e(s[0]) + '</span><div><i style="width:' + (real ? Math.max(s[1] ? 2 : 0, s[1] / mx * 100) : Math.min(100, s[1] * 25)) + '%"></i></div><b class="r">' + s[1] + '</b></div>').join('') + '</div>' +
        '<div class="card"><h2>Сегодня в календаре</h2>' + (real ? '<p class="mut">Календарь (замеры, монтажи, доставки) подключается на следующем этапе: двусторонняя синхронизация с Google Calendar.</p>' : '<div class="stack" style="gap:8px;margin-top:6px">' + today.map(x => '<div class="ev ' + x.kind + '"><b>' + x.t + '</b> · ' + e(x.txt) + '</div>').join('') + '</div>') + '</div></div>' +
        '</div>';
    }
  });
})();
