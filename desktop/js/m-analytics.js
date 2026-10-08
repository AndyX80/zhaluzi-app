/* Аналитика: ключевые показатели, динамика, разрезы. Цифры демонстрационные. */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const hb = (arr, unit) => { const mx = Math.max.apply(null, arr.map(x => x[1])); return arr.map(x => '<div class="hb"><span>' + e(x[0]) + '</span><div><i style="width:' + (x[1] / mx * 100) + '%"></i></div><b class="r num">' + x[1] + (unit || '') + '</b></div>').join(''); };
  A.module('analytics', {
    render() {
      const mx = Math.max.apply(null, D.months.map(x => x[1]));
      return '<div class="head"><h1>Аналитика</h1><div class="seg">' + [['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год'], ['custom', 'Период']].map(p => '<button class="' + (S.period === p[0] ? 'on' : '') + '" data-a="per" data-p="' + p[0] + '">' + p[1] + '</button>').join('') + '</div><button class="btn" data-a="stub" data-t="сравнение периодов">Сравнить периоды</button><div class="sp"></div><button class="btn" data-a="stub" data-t="отчёт за месяц">Отчёт за месяц</button></div><div class="stack">' +
        '<div class="g4"><div class="kpi"><small>Выручка</small><b>' + m(1200000) + '</b><i>демо-значение</i></div><div class="kpi"><small>Валовая прибыль</small><b>' + m(540000) + '</b></div><div class="kpi"><small>Рентабельность</small><b>45%</b></div><div class="kpi"><small>Средний чек</small><b>' + m(40900) + '</b></div></div>' +
        '<div class="g2"><div class="card"><h2>Выручка по месяцам, тыс. ₽</h2><div class="bars">' + D.months.map(x => '<div><em>' + x[1] + '</em><span style="height:' + (x[1] / mx * 130) + 'px"></span>' + x[0] + '</div>').join('') + '</div></div>' +
        '<div class="card"><h2>Источники клиентов, заказов</h2>' + hb(D.sources) + '</div></div>' +
        '<div class="g2"><div class="card"><h2>Заказы по поставщикам, %</h2>' + hb(D.suppliers, '%') + '</div><div class="card"><h2>Показатели, которые добавим на этапе 3</h2><div class="chips" style="margin-top:8px">' + ['Прибыль по категориям', 'Долги клиентов и поставщикам', 'Конверсия «КП → договор»', 'Рекламации и их стоимость', 'СПб и регионы', 'Прибыль на монтажника', 'Сравнение периодов до 4'].map(x => '<span class="pill">' + x + '</span>').join('') + '</div><p class="mut">Контрольный тест при переносе: цифры за 2026 год должны сойтись с вашим Excel-дашбордом.</p></div></div></div>';
    }
  });
  A.act.per = el => { S.period = el.dataset.p; A.save(); A.render(); };
})();
