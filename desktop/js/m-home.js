/* Рабочий стол: что происходит сейчас и что требует внимания */
(function () {
  const A = App, D = A.D, e = A.esc, m = A.money;
  A.stagePill = o => { const i = o.stage, n = D.STAGES[i]; return '<span class="pill ' + (i === 9 ? 'ok' : i >= 4 ? 'info' : i === 0 ? 'gray' : 'acc') + '">' + e(n) + '</span>'; };
  A.module('home', {
    render() {
      const act = D.orders.filter(o => o.stage > 0 && o.stage < 9), byS = D.STAGES.map((s, i) => [s, D.orders.filter(o => o.stage === i).length]);
      const debt = D.orders.reduce((a, o) => a + (o.stage >= 3 ? Math.max(0, o.sum - o.paid) : 0), 0);
      const today = D.events.filter(x => x.d === 3);
      const attn = [
        ['order:o6', 'bad', 'Заказ 1321: открыта рекламация (перекос ламелей), ответ поставщику не отправлен'],
        ['order:o3', 'warn', 'Заказ 1324: до монтажа 9 дней, остаток 59 200 ₽ ещё не получен'],
        ['order:o2', 'warn', 'Заказ 1325: КП отправлено вчера, клиент не ответил'],
        ['order:o1', 'info', 'Заказ 1326: подтвердить время замера на завтра']
      ];
      return '<div class="head"><div><h1>Добрый день, Андрей</h1><div class="mut">Четверг, 8 октября 2026</div></div><div class="sp"></div>' +
        '<button class="btn" data-a="nav" data-id="calendar">Календарь</button><button class="btn pri" data-a="new-order">' + A.icon('plus', 16) + ' Новый заказ</button></div>' +
        '<div class="stack">' +
        '<div class="g4">' +
        '<div class="kpi"><small>Событий сегодня</small><b>' + today.length + '</b><i> замер, монтаж, личное</i></div>' +
        '<div class="kpi"><small>Заказов в работе</small><b>' + act.length + '</b><i> из ' + D.orders.length + ' в демо</i></div>' +
        '<div class="kpi"><small>Долги клиентов</small><b>' + m(debt) + '</b><i> по подписанным договорам</i></div>' +
        '<div class="kpi"><small>Прибыль за месяц</small><b>' + m(58400) + '</b><i> октябрь, на 08.10</i></div></div>' +
        '<div class="card"><h2>Требует внимания</h2><div class="stack" style="gap:8px">' + attn.map(a =>
          '<div class="callout ' + (a[1] === 'bad' ? 'bad' : a[1] === 'info' ? 'info' : '') + ' row" style="cursor:pointer" data-a="opn" data-id="' + a[0] + '">' + A.icon(a[1] === 'info' ? 'info' : 'warn', 18) + '<span>' + e(a[2]) + '</span></div>').join('') + '</div></div>' +
        '<div class="g2">' +
        '<div class="card"><h2>Заказы по этапам</h2>' + byS.map(s => '<div class="hb"><span>' + e(s[0]) + '</span><div><i style="width:' + Math.min(100, s[1] * 25) + '%"></i></div><b class="r">' + s[1] + '</b></div>').join('') + '</div>' +
        '<div class="card"><h2>Сегодня в календаре</h2><div class="stack" style="gap:8px;margin-top:6px">' + today.map(x => '<div class="ev ' + x.kind + '"><b>' + x.t + '</b> · ' + e(x.txt) + '</div>').join('') + '</div></div></div>' +
        '</div>';
    }
  });
})();
