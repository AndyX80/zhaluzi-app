/* Аналитика: ключевые показатели, динамика, разрезы. Цифры демонстрационные. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const hb = (arr, unit) => { const mx = Math.max.apply(null, arr.map(x => x[1])); return arr.map(x => '<div class="hb"><span>' + e(x[0]) + '</span><div><i style="width:' + (x[1] / mx * 100) + '%"></i></div><b class="r num">' + x[1] + (unit || '') + '</b></div>').join(''); };
  const demo = () => {
      const mx = Math.max.apply(null, D.months.map(x => x[1]));
      return '<div class="head"><h1>Аналитика</h1><div class="seg">' + [['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год'], ['custom', 'Период']].map(p => '<button class="' + (S.period === p[0] ? 'on' : '') + '" data-a="per" data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div><button class="btn" data-a="stub" data-t="сравнение периодов">Сравнить периоды</button><div class="sp"></div><button class="btn" data-a="stub" data-t="отчёт за месяц">Отчёт за месяц</button></div><div class="stack">' +
        '<div class="g4"><div class="kpi"><small>Выручка</small><b>' + m(1200000) + '</b><i>демо-значение</i></div><div class="kpi"><small>Валовая прибыль</small><b>' + m(540000) + '</b></div><div class="kpi"><small>Рентабельность</small><b>45%</b></div><div class="kpi"><small>Средний чек</small><b>' + m(40900) + '</b></div></div>' +
        '<div class="g2"><div class="card"><h2>Выручка по месяцам, тыс. ₽</h2><div class="bars">' + D.months.map(x => '<div><em>' + x[1] + '</em><span style="height:' + (x[1] / mx * 130) + 'px"></span>' + x[0] + '</div>').join('') + '</div></div>' +
        '<div class="card"><h2>Источники клиентов, заказов</h2>' + hb(D.sources) + '</div></div>' +
        '<div class="g2"><div class="card"><h2>Заказы по поставщикам, %</h2>' + hb(D.suppliers, '%') + '</div><div class="card"><h2>Показатели, которые добавим на этапе 3</h2><div class="chips" style="margin-top:8px">' + ['Прибыль по категориям', 'Долги клиентов и поставщикам', 'Конверсия «КП → договор»', 'Рекламации и их стоимость', 'СПб и регионы', 'Прибыль на монтажника', 'Сравнение периодов до 4'].map(x => '<span class="pill">' + x + '</span>').join('') + '</div><p class="mut">Контрольный тест при переносе: цифры за 2026 год должны сойтись с вашим Excel-дашбордом.</p></div></div></div>';
    };

  const pad = n => String(n).padStart(2, '0'), isoD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const MN = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'], MF = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const anchor = () => S.aanchor ? new Date(S.aanchor + 'T12:00:00') : new Date();
  function range() {
    const d = anchor(), y = d.getFullYear(), mo = d.getMonth(), p = S.period;
    if (p === 'month') return [isoD(new Date(y, mo, 1)), isoD(new Date(y, mo + 1, 0)), MF[mo] + ' ' + y];
    if (p === 'quarter') { const q = Math.floor(mo / 3); return [isoD(new Date(y, q * 3, 1)), isoD(new Date(y, q * 3 + 3, 0)), (q + 1) + ' квартал ' + y]; }
    if (p === 'year') return [y + '-01-01', y + '-12-31', y + ' год'];
    if (p === 'all') return ['0000-01-01', '9999-12-31', 'всё время'];
    return [S.afrom || y + '-01-01', S.ato || isoD(new Date()), 'свой период'];
  }
  const pct = x => (Math.round(x * 1000) / 10).toString().replace('.', ',') + '%';
  const hbN = (arr, fmt) => { const mx = Math.max.apply(null, arr.map(x => Math.abs(x[1])).concat([1])); return arr.map(x => '<div class="hb"><span>' + e(x[0]) + '</span><div><i style="width:' + Math.max(1, Math.abs(x[1]) / mx * 100) + '%"></i></div><b class="r num">' + (fmt ? fmt(x[1]) : x[1]) + '</b></div>').join(''); };
  const top = (obj, n) => Object.keys(obj).map(k => [k, obj[k]]).sort((x, y) => y[1] - x[1]).slice(0, n);
  function realView() {
    const [from, to, label] = range(), s = DB.stats(from, to);
    const supDebt = D.orders.reduce((a, o) => a + (o.fl && !o.fl.sup ? o.cost : 0), 0), instDebt = D.orders.reduce((a, o) => a + (o.fl && o.inst && !o.fl.zp ? (o.instCost || 0) : 0), 0);
    const ad = anchor(), months = []; for (let i = 11; i >= 0; i--) { const d = new Date(ad.getFullYear(), ad.getMonth() - i, 1), k = d.getFullYear() + '-' + pad(d.getMonth() + 1); months.push([MN[d.getMonth()], 0, k]); }
    const ms = DB.stats(months[0][2] + '-01', months[11][2] + '-31'); months.forEach(x => { x[1] = Math.round((ms.byMonth[x[2]] || 0) / 1000); });
    const mx = Math.max.apply(null, months.map(x => x[1]).concat([1])), sh = top(s.bySup, 8), tot = s.n || 1;
    const seg = [['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год'], ['all', 'Всё время'], ['custom', 'Период']];
    return '<div class="head"><h1>Аналитика</h1><div class="seg">' + seg.map(p => '<button class="' + (S.period === p[0] ? 'on' : '') + '" data-a="per" data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>' +
      (S.period === 'custom' ? '<input class="in" type="date" style="width:150px" value="' + e(from) + '" data-c="afrom"><input class="in" type="date" style="width:150px" value="' + e(to) + '" data-c="ato">' : (S.period === 'all' ? '' : '<div class="seg"><button data-a="ashift" data-d="-1" title="Назад">‹</button><button data-a="ashift" data-d="0" title="Сегодня">' + e(label) + '</button><button data-a="ashift" data-d="1" title="Вперёд">›</button></div>')) +
      '<button class="btn" data-a="stub" data-t="сравнение периодов">Сравнить периоды</button><div class="sp"></div><button class="btn" data-a="stub" data-t="отчёт за месяц">Отчёт за месяц</button></div><div class="stack">' +
      '<div class="g4"><div class="kpi"><small>Выручка</small><b>' + m(s.rev) + '</b><i>' + s.n + ' заказов, ' + e(label) + '</i></div><div class="kpi"><small>Валовая прибыль</small><b>' + m(s.prof) + '</b></div><div class="kpi"><small>Рентабельность</small><b>' + pct(s.margin) + '</b></div><div class="kpi"><small>Средний чек</small><b>' + m(s.avg) + '</b></div></div>' +
      '<div class="g4"><div class="kpi"><small>Долг клиентов (по периоду)</small><b>' + m(s.debt) + '</b></div><div class="kpi"><small>Мы должны поставщикам (всего)</small><b>' + m(supDebt) + '</b><i>закуп неоплаченных заказов</i></div><div class="kpi"><small>Долг монтажникам (всего)</small><b>' + m(instDebt) + '</b></div><div class="kpi"><small>Закуп за период</small><b>' + m(s.cost) + '</b></div></div>' +
      '<div class="g2"><div class="card"><h2>Выручка по месяцам, тыс. ₽</h2><div class="bars">' + months.map(x => '<div><em>' + x[1] + '</em><span style="height:' + (x[1] / mx * 130) + 'px"></span>' + x[0] + '</div>').join('') + '</div></div>' +
      '<div class="card"><h2>Источники клиентов, заказов</h2>' + hbN(top(s.bySrc, 8)) + '</div></div>' +
      '<div class="g2"><div class="card"><h2>Заказы по поставщикам, %</h2>' + hbN(sh.map(x => [x[0], Math.round(x[1] / tot * 100)]), v => v + '%') + '</div><div class="card"><h2>Прибыль по категориям</h2>' + hbN(top(s.byCat, 8), v => m(v)) + '</div></div></div>';
  }
  A.module('analytics', { render() { return D.real ? realView() : demo(); } });
  A.act.ashift = el => { const d = +el.dataset.d, a = anchor(); if (!d) { S.aanchor = ''; } else { const p = S.period; if (p === 'month') a.setMonth(a.getMonth() + d); else if (p === 'quarter') a.setMonth(a.getMonth() + 3 * d); else a.setFullYear(a.getFullYear() + d); S.aanchor = isoD(a); } A.save(); A.render(); };
  A.fld.afrom = v => { S.afrom = v; A.save(); A.render(); };
  A.fld.ato = v => { S.ato = v; A.save(); A.render(); };
  A.act.per = el => { S.period = el.dataset.p; A.save(); A.render(); };
})();
