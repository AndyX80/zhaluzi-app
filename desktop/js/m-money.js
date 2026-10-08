/* Деньги: журнал приходов и расходов, долги. Статьи берутся из Excel-учёта Андрея. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const ART = ['Оплата заказа (закуп)', 'ЗП монтажника', 'Доставки', 'Реклама', 'Налоги', 'Аренда', 'КУ офиса', 'Интернет и связь', 'Рекламации', 'Для офиса', 'Платные сервисы', 'Разное'];
  A.module('money', {
    render() {
      const ops = D.ops.filter(o => S.moneyF === 'all' || o.kind === S.moneyF), inn = D.ops.filter(o => o.kind === 'in').reduce((a, o) => a + o.sum, 0), out = D.ops.filter(o => o.kind === 'out').reduce((a, o) => a + o.sum, 0);
      return '<div class="head"><h1>Деньги</h1><div class="seg">' + [['all', 'Все'], ['in', 'Приход'], ['out', 'Расход']].map(f => '<button class="' + (S.moneyF === f[0] ? 'on' : '') + '" data-a="mf" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="sp"></div>' +
        '<button class="btn" data-a="stub" data-t="расход">+ Расход</button><button class="btn pri" data-a="stub" data-t="приход">+ Приход</button></div><div class="stack">' +
        '<div class="g4"><div class="kpi"><small>Приход (период)</small><b>' + m(inn) + '</b></div><div class="kpi"><small>Расход (период)</small><b>' + m(out) + '</b></div><div class="kpi"><small>Разница</small><b>' + m(inn - out) + '</b></div><div class="kpi"><small>Нам должны клиенты</small><b>' + m(76500) + '</b><i>мы должны: поставщикам 15 200 ₽, монтажникам 33 800 ₽</i></div></div>' +
        '<div class="g2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)"><div class="card p0"><table class="tbl"><thead><tr><th>Дата</th><th>Статья</th><th>Кто</th><th>Способ</th><th class="r">Сумма</th></tr></thead><tbody>' + ops.map(o => '<tr><td>' + o.d + '</td><td>' + e(o.what) + '</td><td>' + e(o.who) + '</td><td>' + e(o.way) + '</td><td class="r num b" style="color:var(--' + (o.kind === 'in' ? 'ok' : 'bad') + ')">' + (o.kind === 'in' ? '+' : '−') + m(o.sum) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Статьи расходов <span class="soon">из вашего Excel</span></h2><div class="chips" style="margin-top:10px">' + ART.map(a => '<span class="pill">' + a + '</span>').join('') + '</div><div class="callout info" style="margin-top:14px">Счета и УПД из этой системы пойдут в Эльбу и Диадок (этап 3). Личные траты в систему не переносятся.</div></div></div></div>';
    }
  });
  A.act.mf = el => { S.moneyF = el.dataset.f; A.save(); A.render(); };
})();
