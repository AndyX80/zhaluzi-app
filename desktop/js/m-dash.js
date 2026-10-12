/* Дашборды: экраны из виджетов, которые можно двигать, менять размер, настраивать и удалять. Состояние в S.dash */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  const COLS = 12, ROW = 48, G = 12;
  const pad = n => String(n).padStart(2, '0'), isoD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const MF = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'], MN = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const pct = x => (Math.round(x * 1000) / 10).toString().replace('.', ',') + '%', num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const PERS = [['month', 'Этот месяц'], ['prev', 'Прошлый месяц'], ['quarter', 'Квартал'], ['year', 'Год'], ['all', 'Всё время']];
  const hid = () => !!S.hideProfit;
  const METRICS = {
    count: ['Заказов', g => g.n, num], rev: ['Выручка', g => g.rev, m], prof: ['Прибыль', g => g.prof, m, 1], margin: ['Рентабельность', g => g.rev ? g.prof / g.rev : 0, pct, 1],
    avg: ['Средний чек', g => g.n ? g.rev / g.n : 0, m], debt: ['Долг клиентов', g => g.debt, m],
    supdebt: ['Мы должны поставщикам', () => D.orders.reduce((a, o) => a + (o.fl && !o.fl.sup ? o.cost : 0), 0), m, 1, 1],
    instdebt: ['Мы должны монтажникам', () => D.orders.reduce((a, o) => a + (o.fl && o.inst && !o.fl.zp ? (o.instCost || 0) : 0), 0), m, 1, 1]
  };
  const DIMS = {
    src: ['Источник', o => o.src || 'не указан'], sup: ['Поставщик', o => o.sup || 'не указан'], cat: ['Категория', o => o.cat || 'Разное'],
    zone: ['СПб / регионы', o => o.zone || 'не указано'], month: ['Месяц', o => (o.created || '').slice(0, 7)], stage: ['Этап', o => D.STAGES[o.stage] || ''], inst: ['Монтаж', o => o.inst ? 'С монтажом' : 'Без монтажа']
  };
  const mval = (k, g) => { const M = METRICS[k]; return M[3] && hid() ? '•••' : M[2](M[1](g)); };
  function range(p) {
    const d = new Date(), y = d.getFullYear(), mo = d.getMonth(), q = Math.floor(mo / 3);
    const R = {
      month: [isoD(new Date(y, mo, 1)), isoD(new Date(y, mo + 1, 0)), MF[mo], isoD(new Date(y, mo - 1, 1)), isoD(new Date(y, mo, 0))],
      prev: [isoD(new Date(y, mo - 1, 1)), isoD(new Date(y, mo, 0)), MF[(mo + 11) % 12], isoD(new Date(y, mo - 2, 1)), isoD(new Date(y, mo - 1, 0))],
      quarter: [isoD(new Date(y, q * 3, 1)), isoD(new Date(y, q * 3 + 3, 0)), (q + 1) + ' квартал', isoD(new Date(y, q * 3 - 3, 1)), isoD(new Date(y, q * 3, 0))],
      year: [y + '-01-01', y + '-12-31', y + ' год', (y - 1) + '-01-01', (y - 1) + '-12-31'], all: ['0000-01-01', '9999-12-31', 'всё время', null, null]
    };
    return R[p] || R.month;
  }
  const rowsIn = (a, b) => D.orders.filter(o => !o.archived && o.created >= a && o.created <= b && o.cat !== undefined);
  const grp = os => os.reduce((g, o) => { g.n++; g.rev += o.sum; g.prof += DB.prof(o); g.debt += DB.debt(o); return g; }, { n: 0, rev: 0, prof: 0, debt: 0 });
  function groups(os, dim) {
    const f = DIMS[dim][1], by = {}; os.forEach(o => { const k = f(o); (by[k] = by[k] || []).push(o); });
    return Object.keys(by).map(k => [k, grp(by[k])]);
  }
  const sortG = (arr, dim, mk) => dim === 'month' ? arr.sort((a, b) => a[0] < b[0] ? -1 : 1) : dim === 'stage' ? arr.sort((a, b) => D.STAGES.indexOf(a[0]) - D.STAGES.indexOf(b[0])) : arr.sort((a, b) => METRICS[mk][1](b[1]) - METRICS[mk][1](a[1]));
  const label = (dim, k) => dim === 'month' ? (MN[+k.slice(5, 7) - 1] || '') + ' ' + k.slice(2, 4) : k;
  const sel = (id, k, opts, cur) => '<select class="in" data-c="dopt" data-id="' + id + '" data-k="' + k + '">' + opts.map(o => '<option value="' + e(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>';

  /* каталог виджетов */
  const mOpts = Object.keys(METRICS).map(k => [k, METRICS[k][0]]), dOpts = Object.keys(DIMS).map(k => [k, DIMS[k][0]]);
  const T = {
    kpi: { n: 'Показатель', w: 3, h: 2, o: { m: 'rev', p: 'month' }, f: [['m', 'Показатель', mOpts], ['p', 'Период', PERS]] },
    bars: { n: 'Полосы по срезу', w: 4, h: 5, o: { d: 'src', m: 'count', p: 'year', n: 8 }, f: [['d', 'Срез', dOpts], ['m', 'Показатель', mOpts.slice(0, 6)], ['p', 'Период', PERS], ['n', 'Сколько строк', [[5, '5'], [8, '8'], [12, '12'], [20, '20']]]] },
    cols: { n: 'Столбцы по месяцам', w: 6, h: 5, o: { m: 'rev', n: 12 }, f: [['m', 'Показатель', mOpts.slice(0, 6)], ['n', 'Месяцев', [[6, '6'], [12, '12'], [24, '24']]]] },
    pie: { n: 'Круговая диаграмма', w: 4, h: 5, o: { d: 'sup', m: 'count', p: 'year' }, f: [['d', 'Срез', dOpts], ['m', 'Показатель', mOpts.slice(0, 3)], ['p', 'Период', PERS]] },
    table: { n: 'Таблица по срезу', w: 6, h: 6, o: { d: 'cat', p: 'year' }, f: [['d', 'Срез', dOpts], ['p', 'Период', PERS]] },
    funnel: { n: 'Воронка продаж', w: 6, h: 6, o: { p: 'month' }, f: [['p', 'Период', PERS.slice(0, 5)]] },
    plan: { n: 'План и факт', w: 4, h: 4, o: {}, f: [] },
    attn: { n: 'Требует внимания', w: 6, h: 6, o: { n: 8 }, f: [['n', 'Сколько', [[5, '5'], [8, '8'], [12, '12'], [20, '20']]]] },
    leads: { n: 'Просроченные ответы', w: 6, h: 5, o: {}, f: [] },
    cash: { n: 'Прогноз денег 30/60/90', w: 6, h: 6, o: {}, f: [] },
    aging: { n: 'Возраст долгов', w: 4, h: 5, o: {}, f: [] },
    debtors: { n: 'Должники', w: 5, h: 6, o: { n: 8 }, f: [['n', 'Сколько', [[5, '5'], [8, '8'], [12, '12'], [20, '20']]]] }
  };
  const title = it => {
    if (it.title) return it.title; const o = it.o, t = T[it.t];
    if (it.t === 'kpi') return METRICS[o.m][0] + (METRICS[o.m][4] ? '' : ' · ' + range(o.p)[2]);
    if (it.t === 'bars') return METRICS[o.m][0] + ' по срезу «' + DIMS[o.d][0].toLowerCase() + '» · ' + range(o.p)[2];
    if (it.t === 'cols') return METRICS[o.m][0] + ' по месяцам';
    if (it.t === 'pie') return DIMS[o.d][0] + ': ' + METRICS[o.m][0].toLowerCase() + ' · ' + range(o.p)[2];
    if (it.t === 'table') return DIMS[o.d][0] + ' · ' + range(o.p)[2];
    if (it.t === 'funnel') return 'Воронка · ' + range(o.p)[2];
    return t.n;
  };
  const PAL = ['#2fe6d0', '#4aa3ff', '#ffb547', '#ff6b8b', '#9b7bff', '#7bd88f', '#ff8f4a', '#8aa0b8'];
  function body(it) {
    const o = it.o, id = it.id;
    if (it.t === 'kpi') {
      const M = METRICS[o.m], r = range(o.p), cur = grp(rowsIn(r[0], r[1])), val = mval(o.m, cur);
      let d = '';
      if (!M[4] && r[3] && !(M[3] && hid())) { const pv = M[1](grp(rowsIn(r[3], r[4]))), c = M[1](cur); if (pv) { const x = Math.round((c - pv) / Math.abs(pv) * 100); d = '<small style="color:var(--' + (x >= 0 ? 'ok' : 'bad') + ',inherit)">' + (x >= 0 ? '▲' : '▼') + Math.abs(x) + '% к прошлому периоду</small>'; } }
      return '<div class="dw-kpi"><b class="num">' + val + '</b>' + d + '</div>';
    }
    if (it.t === 'bars') {
      const r = range(o.p), M = METRICS[o.m], gs = sortG(groups(rowsIn(r[0], r[1]), o.d), o.d, o.m).slice(0, +o.n || 8), mx = Math.max.apply(null, gs.map(x => Math.abs(M[1](x[1]))).concat([1]));
      return gs.length ? gs.map(x => '<div class="hb" style="grid-template-columns:minmax(70px,130px) 1fr minmax(48px,auto)"><span>' + e(label(o.d, x[0])) + '</span><div><i style="width:' + Math.max(1, Math.abs(M[1](x[1])) / mx * 100) + '%"></i></div><b class="r num">' + mval(o.m, x[1]) + '</b></div>').join('') : '<p class="mut">Нет данных</p>';
    }
    if (it.t === 'cols') {
      const M = METRICS[o.m], n = +o.n || 12, now = new Date(), ks = [];
      for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); ks.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); }
      const os = rowsIn(ks[0] + '-01', ks[n - 1] + '-31'), by = {}; os.forEach(x => { (by[x.created.slice(0, 7)] = by[x.created.slice(0, 7)] || []).push(x); });
      const vals = ks.map(k => M[1](grp(by[k] || []))), mx = Math.max.apply(null, vals.concat([1])), gp = grp(os);
      if (M[3] && hid()) return '<p class="mut">Прибыль скрыта режимом «скрыть закуп»</p>';
      return '<div class="dw-cols">' + ks.map((k, i) => '<div title="' + e(label('month', k)) + ': ' + M[2](vals[i]) + '"><em>' + (n <= 12 ? M[2](vals[i]).replace(' ₽', '') : '') + '</em><span style="height:' + Math.max(2, vals[i] / mx * 100) + '%"></span><u>' + MN[+k.slice(5)-1] + '</u></div>').join('') + '</div>';
    }
    if (it.t === 'pie') {
      const r = range(o.p), M = METRICS[o.m], gs = sortG(groups(rowsIn(r[0], r[1]), o.d), o.d, o.m).filter(x => M[1](x[1]) > 0), tot = gs.reduce((a, x) => a + M[1](x[1]), 0) || 1;
      let acc = 0; const stops = gs.map((x, i) => { const a = acc / tot * 360; acc += M[1](x[1]); return PAL[i % PAL.length] + ' ' + a + 'deg ' + acc / tot * 360 + 'deg'; });
      return '<div class="dw-pie"><div style="background:conic-gradient(' + (stops.join(',') || 'var(--gray-s) 0 360deg') + ')"><span></span></div><ul>' + gs.slice(0, 10).map((x, i) => '<li><i style="background:' + PAL[i % PAL.length] + '"></i>' + e(label(o.d, x[0])) + ' <b>' + Math.round(M[1](x[1]) / tot * 100) + '%</b></li>').join('') + '</ul></div>';
    }
    if (it.t === 'table') {
      const r = range(o.p), gs = sortG(groups(rowsIn(r[0], r[1]), o.d), o.d, 'rev'), ks = ['count', 'rev', 'prof', 'margin', 'avg'];
      return '<table class="tbl"><thead><tr><th>' + e(DIMS[o.d][0]) + '</th>' + ks.map(k => '<th class="r">' + e(METRICS[k][0]) + '</th>').join('') + '</tr></thead><tbody>' + gs.map(x => '<tr><td>' + e(label(o.d, x[0])) + '</td>' + ks.map(k => '<td class="r num">' + mval(k, x[1]) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    }
    if (it.t === 'funnel') { const r = range(o.p); return A.crm ? A.crm.funnelView(A.crm.funnel(r[0], r[1])) : ''; }
    if (it.t === 'plan') {
      if (!A.crm) return ''; const p = A.crm.planFact(), C = A.crm.C;
      return '<div class="row" style="align-items:baseline;gap:8px"><b class="num" style="font-size:24px">' + m(p.s.rev) + '</b><span class="mut">из</span><input class="in" style="width:120px" type="number" step="50000" value="' + C.plan + '" data-c="cplan"></div><div class="hb" style="grid-template-columns:1fr 44px"><div style="height:14px"><i style="width:' + Math.min(100, p.pc) + '%"></i></div><b class="r">' + p.pc + '%</b></div><p class="mut sm">День ' + p.day + ' из ' + p.dim + '. Прогноз по темпу: ' + m(p.fc) + (C.plan ? ' (' + Math.round(p.fc / C.plan * 100) + '%)' : '') + '</p>';
    }
    if (it.t === 'cash') return cashView();
    if (it.t === 'aging') {
      const B = [['до недели', 0, 7], ['1–2 недели', 8, 14], ['2–4 недели', 15, 30], ['больше месяца', 31, 9999]], T0 = Date.now(), by = B.map(() => 0);
      D.orders.filter(x => !x.archived && DB.debt(x) > 0).forEach(x => { const a = Math.floor((T0 - new Date(x.created + 'T12:00:00')) / 864e5); B.forEach((b, i) => { if (a >= b[1] && a <= b[2]) by[i] += DB.debt(x); }); });
      const mx = Math.max.apply(null, by.concat([1]));
      return B.map((b, i) => '<div class="hb" style="grid-template-columns:100px 1fr minmax(70px,auto)"><span>' + b[0] + '</span><div><i style="width:' + by[i] / mx * 100 + '%;' + (i === 3 ? 'background:var(--bad)' : '') + '"></i></div><b class="r num">' + m(by[i]) + '</b></div>').join('');
    }
    if (it.t === 'attn') { const at = A.attention().slice(0, +o.n || 8); return at.length ? '<div class="stack" style="gap:6px">' + at.map(a => '<div class="callout ' + (a[1] === 'bad' ? 'bad' : a[1] === 'info' ? 'info' : '') + ' row" style="cursor:pointer" data-a="opn" data-id="' + a[0] + '">' + A.icon(a[1] === 'info' ? 'info' : 'warn', 16) + '<span>' + e(a[2]) + '</span></div>').join('') + '</div>' : '<p class="mut">Всё в порядке</p>'; }
    if (it.t === 'leads') { const al = A.crm ? A.crm.alerts() : []; return al.length ? '<div class="stack" style="gap:6px">' + al.slice(0, 12).map(a => '<div class="callout bad row" style="cursor:pointer" data-a="opn" data-id="order:' + a.o.id + '">' + A.icon('warn', 16) + '<span>' + e(a.kind) + ': ' + e((A.client(a.o.client) || {}).name || '') + ', ' + a.age + ' дн.</span></div>').join('') + '</div>' : '<p class="mut">Просрочек нет</p>'; }
    if (it.t === 'debtors') {
      const os = D.orders.filter(x => !x.archived && DB.debt(x) > 0).sort((a, b) => DB.debt(b) - DB.debt(a)).slice(0, +o.n || 8);
      return os.length ? '<table class="tbl"><tbody>' + os.map(x => '<tr style="cursor:pointer" data-a="opn" data-id="order:' + x.id + '"><td>№ ' + x.no + '</td><td>' + e((A.client(x.client) || {}).name || '') + '</td><td class="r num">' + m(DB.debt(x)) + '</td></tr>').join('') + '</tbody></table>' : '<p class="mut">Долгов нет</p>';
    }
    return '';
  }

  /* прогноз денег: когда придут доплаты клиентов и когда надо платить поставщикам и монтажникам (даты ориентировочные: срок изготовления, иначе неделя) */
  function cashView() {
    const now = new Date(), t0 = isoD(now), at = (o, add) => { const d = o.due && o.due >= t0 ? new Date(o.due + 'T12:00:00') : new Date(now.getTime() + 7 * 864e5); d.setDate(d.getDate() + add); return Math.max(0, Math.floor((d - now) / 864e5)); };
    const B = [[0, 30, '30 дней'], [31, 60, '31–60'], [61, 90, '61–90']], inn = [0, 0, 0], out = [0, 0, 0], put = (arr, day, v) => { B.forEach((b, i) => { if (day >= b[0] && day <= b[1]) arr[i] += v; }); };
    D.orders.filter(o => !o.archived && !(o.fl && o.fl.closed)).forEach(o => {
      const debt = DB.debt(o); if (debt > 0) put(inn, at(o, 0), debt);
      if (o.fl) { if (!o.fl.sup && o.cost > 0) put(out, 0, o.cost); if (o.inst && !o.fl.zp && o.instCost > 0) put(out, at(o, 3), o.instCost); }
    });
    let bal = 0; const net = inn.map((v, i) => { bal += v - out[i]; return bal; }), mx = Math.max.apply(null, inn.concat(out).concat([1]));
    return '<table class="tbl"><thead><tr><th></th>' + B.map(b => '<th class="r">' + b[2] + '</th>').join('') + '</tr></thead><tbody><tr><td>Придёт от клиентов</td>' + inn.map(v => '<td class="r num">' + m(v) + '</td>').join('') + '</tr><tr><td>Надо заплатить</td>' + out.map(v => '<td class="r num">' + m(v) + '</td>').join('') + '</tr><tr><td><b>Накопленно</b></td>' + net.map(v => '<td class="r num" style="color:var(--' + (v >= 0 ? 'ok' : 'bad') + ',inherit)"><b>' + m(v) + '</b></td>').join('') + '</tr></tbody></table>' +
      '<div class="dw-cols" style="height:110px;margin-top:10px">' + B.map((b, i) => '<div><span style="height:' + Math.max(2, inn[i] / mx * 100) + '%"></span><u>приход</u></div><div><span style="height:' + Math.max(2, out[i] / mx * 100) + '%;background:var(--bad)"></span><u>расход</u></div>').join('') + '</div>' +
      '<p class="mut sm" style="margin:6px 0 0">Ориентировочно: сроки по дате изготовления (иначе через неделю). Закуп и зарплаты считаются по Excel-заказам, остатки на счетах не учтены.</p>';
  }

  /* раскладка */
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  function relayout(items, anchor) {
    const rest = items.filter(i => i !== anchor).sort((a, b) => a.y - b.y || a.x - b.x), placed = [];
    if (anchor) placed.push(anchor);
    rest.forEach(it => { it.y = 0; while (placed.some(p => hit(it, p))) it.y++; placed.push(it); });
  }
  const mk = (t, x, y, w, h, o, extra) => Object.assign({ id: 'w' + Math.random().toString(36).slice(2, 8), t, x, y, w: w || T[t].w, h: h || T[t].h, o: Object.assign({}, T[t].o, o || {}) }, extra || {});
  function defaults() {
    const a = [mk('kpi', 0, 0, 3, 2, { m: 'rev' }), mk('kpi', 3, 0, 3, 2, { m: 'prof' }), mk('kpi', 6, 0, 3, 2, { m: 'count' }), mk('kpi', 9, 0, 3, 2, { m: 'avg' }), mk('plan', 0, 2, 4, 4), mk('funnel', 4, 2, 8, 6), mk('cols', 0, 8, 6, 5, { m: 'rev' }), mk('bars', 6, 8, 3, 5, { d: 'src', m: 'count' }), mk('pie', 9, 8, 3, 5, { d: 'sup' }), mk('table', 0, 13, 12, 6, { d: 'cat' })];
    const b = [mk('kpi', 0, 0, 3, 2, { m: 'debt', p: 'all' }), mk('kpi', 3, 0, 3, 2, { m: 'supdebt' }), mk('kpi', 6, 0, 3, 2, { m: 'instdebt' }), mk('kpi', 9, 0, 3, 2, { m: 'prof' }), mk('debtors', 0, 2, 5, 6), mk('cols', 5, 2, 7, 6, { m: 'prof' }), mk('cash', 0, 8, 6, 7), mk('aging', 6, 8, 6, 5), mk('attn', 0, 15, 12, 6)];
    return [{ id: 's1', name: 'Продажи', items: a }, { id: 's2', name: 'Деньги', items: b }];
  }
  const Z = () => { if (!S.dash || !S.dash.screens || !S.dash.screens.length) S.dash = { cur: 's1', edit: false, screens: defaults() }; const d = S.dash; if (!d.screens.some(s => s.id === d.cur)) d.cur = d.screens[0].id; return d; };
  const cur = () => { const d = Z(); return d.screens.find(s => s.id === d.cur); };
  const find = id => cur().items.find(i => i.id === id);

  function widget(it, edit) {
    const t = T[it.t], cfg = it.cfg && t.f.length;
    const tools = (t.f.length || edit ? '<button class="dw-b" data-a="dcfg" data-id="' + it.id + '" title="Настроить">⚙</button>' : '') + (edit ? '<button class="dw-b" data-a="dcol" data-id="' + it.id + '" title="Свернуть">' + (it.col ? '▾' : '▴') + '</button><button class="dw-b" data-a="ddel" data-id="' + it.id + '" title="Удалить">✕</button>' : '');
    const panel = it.cfg ? '<div class="dw-cfg"><label>Название<input class="in" value="' + e(it.title || '') + '" placeholder="' + e(title(Object.assign({}, it, { title: '' }))) + '" data-c="dtitle" data-id="' + it.id + '"></label>' + t.f.map(f => '<label>' + f[1] + sel(it.id, f[0], f[2], it.o[f[0]]) + '</label>').join('') + '</div>' : '';
    const ph = it.col ? 1 : it.h;
    return '<div class="dw card" data-id="' + it.id + '" style="left:calc(100%/' + COLS + '*' + it.x + ');top:' + it.y * (ROW + G) + 'px;width:calc(100%/' + COLS + '*' + it.w + ' - ' + G + 'px);height:' + (ph * (ROW + G) - G) + 'px">' +
      '<div class="dw-h' + (edit ? ' mv' : '') + '"><b>' + e(title(it)) + '</b><span class="sp"></span>' + tools + '</div>' + (it.col ? '' : '<div class="dw-body">' + panel + body(it) + '</div>') + (edit && !it.col ? '<i class="dw-r" title="Потянуть, чтобы изменить размер"></i>' : '') + '</div>';
  }
  A.module('dash', {
    render() {
      if (!D.real) return '<div class="head"><h1>Дашборды</h1></div><p class="mut">Загрузи реальные данные в Настройках.</p>';
      const d = Z(), sc = cur(), ed = d.edit, h = sc.items.reduce((a, i) => Math.max(a, i.y + (i.col ? 1 : i.h)), 0);
      return '<div class="head"><h1>Дашборды</h1><div class="seg">' + d.screens.map(s => '<button class="' + (s.id === d.cur ? 'on' : '') + '" data-a="dscr" data-id="' + s.id + '">' + e(s.name) + '</button>').join('') + (ed ? '<button data-a="dnew" title="Новый экран">+</button>' : '') + '</div><div class="sp"></div>' +
        (ed ? '<input class="in" style="width:170px" value="' + e(sc.name) + '" data-c="dname" title="Название экрана"><button class="btn" data-a="dadd">+ Виджет</button><button class="btn" data-a="ddup">Копия экрана</button><button class="btn" data-a="drst">Сбросить экран</button>' + (d.screens.length > 1 ? '<button class="btn" data-a="dscrdel">Удалить экран</button>' : '') : '') +
        '<button class="btn ' + (ed ? 'pri' : '') + '" data-a="dedit">' + (ed ? 'Готово' : 'Настроить') + '</button></div>' +
        (ed && d.adding ? '<div class="card" style="margin-bottom:12px"><h2>Добавить виджет</h2><div class="row wrap" style="margin-top:8px">' + Object.keys(T).map(k => '<button class="btn" data-a="dnw" data-t="' + k + '">' + e(T[k].n) + '</button>').join('') + '</div></div>' : '') +
        (ed ? '<p class="mut sm" style="margin:0 0 8px">Тяни за заголовок, чтобы переместить; за уголок справа внизу, чтобы изменить размер. ⚙ — что показывать, ✕ — убрать.</p>' : '') +
        '<div class="dgrid' + (ed ? ' ed' : '') + '" id="dgrid" style="height:' + (h * (ROW + G) + (ed ? 80 : 0)) + 'px">' + sc.items.map(i => widget(i, ed)).join('') + '</div>';
    }
  });
  const go = () => { A.save(); A.render(); };
  A.act.dedit = () => { const d = Z(); d.edit = !d.edit; d.adding = false; go(); };
  A.act.dscr = el => { Z().cur = el.dataset.id; go(); };
  A.act.dnew = () => { const d = Z(), id = 's' + Date.now().toString(36); d.screens.push({ id, name: 'Экран ' + (d.screens.length + 1), items: [] }); d.cur = id; d.adding = true; go(); };
  A.act.ddup = () => { const d = Z(), s = cur(), id = 's' + Date.now().toString(36); d.screens.push({ id, name: s.name + ' (копия)', items: JSON.parse(JSON.stringify(s.items)).map(i => { i.id = 'w' + Math.random().toString(36).slice(2, 8); return i; }) }); d.cur = id; go(); };
  A.act.dscrdel = () => { const d = Z(); d.screens = d.screens.filter(s => s.id !== d.cur); d.cur = d.screens[0].id; go(); };
  A.act.drst = () => { const s = cur(), df = defaults().find(x => x.id === s.id) || defaults()[0]; s.items = df.items; go(); A.toast('Экран сброшен к стандартному'); };
  A.act.dadd = () => { const d = Z(); d.adding = !d.adding; A.render(); };
  A.act.dnw = el => { const s = cur(), t = el.dataset.t, y = s.items.reduce((a, i) => Math.max(a, i.y + i.h), 0); s.items.push(mk(t, 0, y, null, null, {}, { cfg: !!T[t].f.length })); Z().adding = false; go(); };
  A.act.ddel = el => { const s = cur(); s.items = s.items.filter(i => i.id !== el.dataset.id); relayout(s.items); go(); };
  A.act.dcfg = el => { const i = find(el.dataset.id); if (i) { i.cfg = !i.cfg; A.render(); } };
  A.act.dcol = el => { const s = cur(), i = find(el.dataset.id); if (i) { i.col = !i.col; relayout(s.items); go(); } };
  A.fld.dopt = (v, el) => { const i = find(el.dataset.id); if (i) { i.o[el.dataset.k] = el.dataset.k === 'n' ? +v : v; go(); } };
  A.fld.dtitle = (v, el) => { const i = find(el.dataset.id); if (i) { i.title = v.trim(); go(); } };
  A.fld.dname = v => { cur().name = v.trim() || 'Экран'; go(); };

  /* перетаскивание и изменение размера */
  let drag = null;
  document.addEventListener('pointerdown', ev => {
    const g = document.getElementById('dgrid'); if (!g || !Z().edit) return;
    const rz = ev.target.closest('.dw-r'), hd = !rz && !ev.target.closest('.dw-b') && ev.target.closest('.dw-h'); if (!rz && !hd) return;
    const w = ev.target.closest('.dw'), it = find(w.dataset.id); if (!it) return;
    const gr = g.getBoundingClientRect(), cw = (gr.width + G) / COLS, ghost = document.createElement('div'); ghost.className = 'dw-ghost'; g.appendChild(ghost);
    drag = { it, w, g, gr, cw, ghost, rz: !!rz, sx: ev.clientX, sy: ev.clientY, ox: w.offsetLeft, oy: w.offsetTop, ow: w.offsetWidth, oh: w.offsetHeight, gx: it.x, gy: it.y, gw: it.w, gh: it.h };
    w.classList.add('lift'); ev.preventDefault(); try { w.setPointerCapture(ev.pointerId); } catch (x) {}
    place();
  });
  function place() { const d = drag; d.ghost.style.cssText = 'left:calc(100%/' + COLS + '*' + d.gx + ');top:' + d.gy * (ROW + G) + 'px;width:calc(100%/' + COLS + '*' + d.gw + ' - ' + G + 'px);height:' + (d.gh * (ROW + G) - G) + 'px'; }
  document.addEventListener('pointermove', ev => {
    if (!drag) return; const d = drag, dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
    if (d.rz) {
      d.gw = Math.max(2, Math.min(COLS - d.it.x, Math.round((d.ow + dx + G) / d.cw))); d.gh = Math.max(1, Math.round((d.oh + dy + G) / (ROW + G)));
      d.w.style.width = (d.ow + dx) + 'px'; d.w.style.height = Math.max(ROW, d.oh + dy) + 'px';
    } else {
      d.gx = Math.max(0, Math.min(COLS - d.it.w, Math.round((d.ox + dx) / d.cw))); d.gy = Math.max(0, Math.round((d.oy + dy) / (ROW + G)));
      d.w.style.left = (d.ox + dx) + 'px'; d.w.style.top = (d.oy + dy) + 'px';
    }
    place();
  });
  const endDrag = () => {
    if (!drag) return; const d = drag; drag = null; d.ghost.remove();
    if (d.rz) { d.it.w = d.gw; d.it.h = d.gh; } else { d.it.x = d.gx; d.it.y = d.gy; }
    relayout(cur().items, d.it); go();
  };
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
})();
