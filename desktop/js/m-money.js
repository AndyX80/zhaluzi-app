/* Деньги: журнал приходов и расходов, долги. Статьи берутся из Excel-учёта Андрея. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const ART = ['Оплата заказа (закуп)', 'ЗП монтажника', 'Доставки', 'Реклама', 'Налоги', 'Аренда', 'КУ офиса', 'Интернет и связь', 'Рекламации', 'Для офиса', 'Платные сервисы', 'Разное'];
  const demo = () => {
      const ops = D.ops.filter(o => S.moneyF === 'all' || o.kind === S.moneyF), inn = D.ops.filter(o => o.kind === 'in').reduce((a, o) => a + o.sum, 0), out = D.ops.filter(o => o.kind === 'out').reduce((a, o) => a + o.sum, 0);
      return '<div class="head"><h1>Деньги</h1><div class="seg">' + [['all', 'Все'], ['in', 'Приход'], ['out', 'Расход']].map(f => '<button class="' + (S.moneyF === f[0] ? 'on' : '') + '" data-a="mf" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div><div class="sp"></div>' +
        '<button class="btn" data-a="stub" data-t="расход">+ Расход</button><button class="btn pri" data-a="stub" data-t="приход">+ Приход</button></div><div class="stack">' +
        '<div class="g4"><div class="kpi"><small>Приход (период)</small><b>' + m(inn) + '</b></div><div class="kpi"><small>Расход (период)</small><b>' + m(out) + '</b></div><div class="kpi"><small>Разница</small><b>' + m(inn - out) + '</b></div><div class="kpi"><small>Нам должны клиенты</small><b>' + m(76500) + '</b><i>мы должны: поставщикам 15 200 ₽, монтажникам 33 800 ₽</i></div></div>' +
        '<div class="g2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)"><div class="card p0"><table class="tbl"><thead><tr><th>Дата</th><th>Статья</th><th>Кто</th><th>Способ</th><th class="r">Сумма</th></tr></thead><tbody>' + ops.map(o => '<tr><td>' + o.d + '</td><td>' + e(o.what) + '</td><td>' + e(o.who) + '</td><td>' + e(o.way) + '</td><td class="r num b" style="color:var(--' + (o.kind === 'in' ? 'ok' : 'bad') + ')">' + (o.kind === 'in' ? '+' : '−') + m(o.sum) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Статьи расходов <span class="soon">из вашего Excel</span></h2><div class="chips" style="margin-top:10px">' + ART.map(a => '<span class="pill">' + a + '</span>').join('') + '</div><div class="callout info" style="margin-top:14px">Счета и УПД из этой системы пойдут в Эльбу и Диадок (этап 3). Личные траты в систему не переносятся.</div></div></div></div>';
    };

  const pad = n => String(n).padStart(2, '0'), todayI = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const PER = [['month', 'Месяц'], ['year', 'Год'], ['all', 'Всё время']];
  const dmy = s => DB.dmy(s);
  function realView() {
    const t = todayI(), from = S.mper === 'all' ? '0000' : S.mper === 'year' ? t.slice(0, 4) : t.slice(0, 7);
    const inP = D.ops.filter(o => o.d >= from), ops = inP.filter(o => S.moneyF === 'all' || o.kind === S.moneyF);
    const inn = inP.filter(o => o.kind === 'in').reduce((a, o) => a + o.sum, 0), out = inP.filter(o => o.kind === 'out').reduce((a, o) => a + o.sum, 0);
    const debt = D.orders.reduce((a, o) => a + Math.max(0, o.sum - o.paid), 0), supDebt = D.orders.reduce((a, o) => a + (o.fl && !o.fl.sup ? o.cost : 0), 0), instDebt = D.orders.reduce((a, o) => a + (o.fl && o.inst && !o.fl.zp ? (o.instCost || 0) : 0), 0);
    const lim = S.mlimit || 120, rows = ops.slice(0, lim), byArt = {}; inP.filter(o => o.kind === 'out').forEach(o => { byArt[o.what] = (byArt[o.what] || 0) + o.sum; });
    const arts = Object.keys(byArt).map(k => [k, byArt[k]]).sort((x, y) => y[1] - x[1]);
    return '<div class="head"><h1>Деньги</h1><div class="seg">' + [['all', 'Все'], ['in', 'Приход'], ['out', 'Расход']].map(f => '<button class="' + (S.moneyF === f[0] ? 'on' : '') + '" data-a="mf" data-f="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
      '<div class="seg">' + PER.map(p => '<button class="' + ((S.mper || 'month') === p[0] ? 'on' : '') + '" data-a="mper" data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div><div class="sp"></div>' +
      '<button class="btn" data-a="stub" data-t="расход">+ Расход</button><button class="btn pri" data-a="stub" data-t="приход">+ Приход</button></div><div class="stack">' +
      '<div class="g4"><div class="kpi"><small>Приход</small><b>' + m(inn) + '</b></div><div class="kpi"><small>Расход</small><b>' + m(out) + '</b></div><div class="kpi"><small>Разница</small><b>' + m(inn - out) + '</b></div><div class="kpi"><small>Нам должны клиенты</small><b>' + m(debt) + '</b><i>мы должны: поставщикам ' + m(supDebt) + ', монтажникам ' + m(instDebt) + '</i></div></div>' +
      '<div class="g2" style="grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)"><div class="card p0"><table class="tbl"><thead><tr><th>Дата</th><th>Статья</th><th class="r">Сумма</th></tr></thead><tbody>' + rows.map(o => '<tr><td>' + dmy(o.d) + '</td><td>' + e(o.what) + '</td><td class="r num b" style="color:var(--' + (o.kind === 'in' ? 'ok' : 'bad') + ')">' + (o.kind === 'in' ? '+' : '−') + m(o.sum) + '</td></tr>').join('') + '</tbody></table>' + (ops.length > lim ? '<div style="padding:10px;text-align:center"><button class="btn sm" data-a="mmore">Показать ещё (' + (ops.length - lim) + ')</button></div>' : '') + (ops.length ? '' : '<div class="empty" style="padding:24px">Операций за период нет</div>') + '</div>' +
      '<div class="card"><h2>Расходы по статьям</h2>' + (arts.length ? arts.map(x => '<div class="hb" style="grid-template-columns:130px 1fr 90px"><span>' + e(x[0]) + '</span><div><i style="width:' + Math.max(2, x[1] / arts[0][1] * 100) + '%"></i></div><b class="r num">' + m(x[1]) + '</b></div>').join('') : '<p class="mut">Расходов за период нет</p>') + '<div class="callout info" style="margin-top:14px">Журнал операций пока из вашего Excel («Доход-расход», с декабря 2025). Счета и УПД из системы пойдут в Эльбу и Диадок позже. Личные траты не переносятся.</div></div></div></div>';
  }
  A.module('money', { render() { return D.real ? realView() : demo(); } });
  A.act.mper = el => { S.mper = el.dataset.p; S.mlimit = 120; A.save(); A.render(); };
  A.act.mmore = () => { S.mlimit = (S.mlimit || 120) + 300; A.render(); };
  A.act.mf = el => { S.moneyF = el.dataset.f; A.save(); A.render(); };
})();
