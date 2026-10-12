/* Воронка продаж и план/факт. Настройки (план, нормы, причины отказа) хранятся в S.crm */
(function () {
  const A = App, D = A.D, S = A.S, e = A.esc, m = A.money;
  S.crm = Object.assign({ plan: 1000000, normReply: 1, normKp: 7, loss: ['Дорого', 'Выбрали другого', 'Передумал', 'Нет связи'] }, S.crm || {});
  const C = S.crm, pad = n => String(n).padStart(2, '0'), isoD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const MF = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const days = iso => iso ? Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 864e5) : 0;
  const live = o => !o.archived && !o.lost;
  const lead = o => o.ph && o.stage < 3 && live(o);
  function range() {
    const d = new Date(), y = d.getFullYear(), mo = d.getMonth(), p = S.fper || 'month';
    if (p === 'quarter') { const q = Math.floor(mo / 3); return [isoD(new Date(y, q * 3, 1)), isoD(new Date(y, q * 3 + 3, 0)), (q + 1) + ' квартал']; }
    if (p === 'year') return [y + '-01-01', y + '-12-31', y + ' год'];
    if (p === 'all') return ['0000-01-01', '9999-12-31', 'всё время'];
    return [isoD(new Date(y, mo, 1)), isoD(new Date(y, mo + 1, 0)), MF[mo]];
  }
  const delta = (a, b) => b ? Math.round((a - b) / b * 100) : null;
  const dl = v => v == null ? '' : '<i style="color:var(--' + (v >= 0 ? 'ok' : 'bad') + ',inherit)"> ' + (v >= 0 ? '▲' : '▼') + Math.abs(v) + '% к прошл. мес.</i>';
  function planFact() {
    const now = new Date(), y = now.getFullYear(), mo = now.getMonth(), from = isoD(new Date(y, mo, 1)), to = isoD(new Date(y, mo + 1, 0)), dim = new Date(y, mo + 1, 0).getDate();
    const s = DB.stats(from, to), pv = DB.stats(isoD(new Date(y, mo - 1, 1)), isoD(new Date(y, mo, 0)));
    const fc = Math.round(s.rev / now.getDate() * dim), pc = C.plan ? Math.round(s.rev / C.plan * 100) : 0;
    return { s, pv, fc, pc, dim, day: now.getDate() };
  }
  /* пересчёт воронки за период: сколько заказов дошло до каждого этапа */
  function funnel(from, to) {
    const os = D.orders.filter(o => !o.archived && o.created >= from && o.created <= to);
    const reach = D.STAGES.map((s, i) => os.filter(o => o.stage >= i && !(o.lost && o.stage < 3)).length);
    // потерянные тоже были в начале воронки
    const lost = os.filter(o => o.lost);
    return { os, reach, lost };
  }
  const alerts = () => D.orders.filter(lead).map(o => {
    const age = days(o.created), norm = o.stage === 0 ? C.normReply : C.normKp;
    return age > norm ? { o, age, over: age - norm, kind: o.stage === 0 ? 'Нет ответа на заявку' : 'КП без ответа' } : null;
  }).filter(Boolean).sort((a, b) => b.over - a.over);

  A.crmHome = () => {
    if (!D.real) return '';
    const p = planFact(), f = funnel(range()[0], range()[1]), al = alerts();
    const mx = Math.max.apply(null, f.reach.concat([1]));
    return '<div class="g2"><div class="card"><h2>План на ' + MF[new Date().getMonth()] + '</h2>' +
      '<div class="row" style="align-items:baseline;gap:8px"><b class="num" style="font-size:26px">' + m(p.s.rev) + '</b><span class="mut">из</span><input class="in" style="width:130px" type="number" step="50000" value="' + C.plan + '" data-c="cplan"></div>' +
      '<div class="hb" style="grid-template-columns:1fr 44px"><div style="height:14px"><i style="width:' + Math.min(100, p.pc) + '%"></i></div><b class="r">' + p.pc + '%</b></div>' +
      '<p class="mut sm" style="margin:6px 0 0">День ' + p.day + ' из ' + p.dim + '. При таком темпе выйдет ' + m(p.fc) + (C.plan ? ' (' + Math.round(p.fc / C.plan * 100) + '% плана)' : '') + '. ' + dl(delta(p.s.rev, p.pv.rev)).replace(/<[^>]+>/g, '') + '</p></div>' +
      '<div class="card"><h2>Воронка</h2>' + [0, 2, 3, 5, 9].map(i => '<div class="hb"><span>' + e(D.STAGES[i]) + '</span><div><i style="width:' + (f.reach[i] / mx * 100) + '%"></i></div><b class="r">' + f.reach[i] + '</b></div>').join('') +
      '<div class="row" style="margin-top:6px"><span class="mut sm">' + (al.length ? '<b style="color:var(--bad)">Просрочено ' + al.length + '</b> по нормам ответа' : 'Все ответы в нормах') + '</span><div class="sp"></div><button class="btn" data-a="nav" data-id="funnel">Открыть воронку</button></div></div></div>';
  };
  A.fld.cplan = v => { C.plan = Math.max(0, +v || 0); A.save(); A.render(); };

  const pill = o => '<span class="pill ' + (o.stage === 0 ? 'gray' : 'acc') + '">' + e(D.STAGES[o.stage]) + '</span>';
  const cname = o => (A.client(o.client) || {}).name || o.name || '—';
  const lostSel = o => '<select class="in" style="width:130px" data-c="flost" data-id="' + o.id + '"><option value="">Отказ…</option>' + C.loss.map(r => '<option>' + e(r) + '</option>').join('') + '</select>';
  A.fld.flost = (v, el) => { const o = A.order(el.dataset.id); if (!o || !v) return; o.lost = v; DB.patchRec(o.uid, { lost: v }); A.render(); };
  A.act.unlost = el => { const o = A.order(el.dataset.id); if (!o) return; o.lost = ''; DB.patchRec(o.uid, { lost: '' }); A.render(); };
  A.act.fper = el => { S.fper = el.dataset.p; A.save(); A.render(); };
  A.act.fview = el => { S.fview = el.dataset.v; A.save(); A.render(); };
  A.act.lossadd = () => { const i = document.getElementById('lossnew'); const v = i && i.value.trim(); if (v && C.loss.indexOf(v) < 0) { C.loss.push(v); A.save(); A.render(); } };
  A.act.lossdel = el => { C.loss.splice(+el.dataset.i, 1); A.save(); A.render(); };
  A.fld.cnorm1 = v => { C.normReply = Math.max(0, +v || 0); A.save(); A.render(); };
  A.fld.cnorm2 = v => { C.normKp = Math.max(0, +v || 0); A.save(); A.render(); };

  function funnelView(f) {
    const mx = Math.max.apply(null, f.reach.concat([1]));
    return D.STAGES.map((s, i) => {
      const w = Math.max(f.reach[i] ? 4 : 0, f.reach[i] / mx * 100), conv = i && f.reach[i - 1] ? Math.round(f.reach[i] / f.reach[i - 1] * 100) : null;
      return '<div style="display:grid;grid-template-columns:150px 1fr 90px;gap:10px;align-items:center;margin:6px 0"><span>' + e(s) + '</span><div style="height:26px;background:var(--gray-s);border-radius:8px"><div style="width:' + w + '%;height:100%;background:var(--acc);border-radius:8px;opacity:' + (1 - i * 0.07) + '"></div></div><span class="num"><b>' + f.reach[i] + '</b>' + (conv != null ? ' <span class="mut sm">' + conv + '%</span>' : '') + '</span></div>';
    }).join('');
  }
  function kanbanView() {
    const cols = [[0, 'Заявка / просчёт'], [2, 'КП отправлено']];
    return '<div class="kan" style="grid-auto-columns:minmax(260px,1fr)">' + cols.map(c => {
      const os = D.orders.filter(o => lead(o) && (c[0] === 0 ? o.stage < 2 : o.stage === 2));
      return '<div class="kcol"><h3><span>' + c[1] + '</span><span>' + os.length + '</span></h3>' + os.map(o => {
        const age = days(o.created), over = age > (o.stage === 0 ? C.normReply : C.normKp);
        return '<div class="kc"><div data-a="opn" data-id="order:' + o.id + '"><b>' + e(cname(o)) + '</b><div class="mut sm">' + e(o.title) + '</div><div class="row"><b class="num">' + m(o.sum) + '</b><div class="sp"></div><span class="pill ' + (over ? 'bad' : 'gray') + '">' + age + ' дн.</span></div></div><div style="margin-top:6px">' + lostSel(o) + '</div></div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }
  function tableView() {
    const os = D.orders.filter(lead).sort((a, b) => a.created < b.created ? -1 : 1);
    return os.length ? '<table class="tbl"><thead><tr><th>Клиент</th><th>Этап</th><th>Сумма</th><th>Дней</th><th>Источник</th><th></th></tr></thead><tbody>' + os.map(o => '<tr><td data-a="opn" data-id="order:' + o.id + '" style="cursor:pointer">' + e(cname(o)) + '</td><td>' + pill(o) + '</td><td class="num">' + m(o.sum) + '</td><td>' + days(o.created) + '</td><td>' + e(o.src || '—') + '</td><td>' + lostSel(o) + '</td></tr>').join('') + '</tbody></table>' : '<p class="mut">Открытых просчётов нет.</p>';
  }
  const seg = (arr, cur, act, key) => '<div class="seg">' + arr.map(p => '<button class="' + (cur === p[0] ? 'on' : '') + '" data-a="' + act + '" data-' + key + '="' + p[0] + '">' + p[1] + '</button>').join('') + '</div>';
  A.module('funnel', {
    render() {
      if (!D.real) return '<div class="head"><h1>Воронка</h1></div><p class="mut">Загрузи реальные данные в Настройках.</p>';
      const [from, to, label] = range(), f = funnel(from, to), al = alerts(), v = S.fview || 'funnel';
      const lostBy = {}; f.lost.forEach(o => { lostBy[o.lost] = (lostBy[o.lost] || 0) + 1; });
      const win = f.reach[3], all = f.reach[0] || 1;
      return '<div class="head"><h1>Воронка продаж</h1>' + seg([['month', 'Месяц'], ['quarter', 'Квартал'], ['year', 'Год'], ['all', 'Всё время']], S.fper || 'month', 'fper', 'p') + seg([['funnel', 'Воронка'], ['kanban', 'Канбан'], ['table', 'Таблица']], v, 'fview', 'v') + '</div>' +
        '<div class="stack"><div class="g4"><div class="kpi"><small>Заказов за ' + e(label) + '</small><b>' + f.os.length + '</b></div><div class="kpi"><small>Дошли до договора</small><b>' + win + '</b><i> ' + Math.round(win / all * 100) + '%</i></div><div class="kpi"><small>Отказы</small><b>' + f.lost.length + '</b></div><div class="kpi"><small>Просрочено по нормам</small><b style="color:' + (al.length ? 'var(--bad)' : 'inherit') + '">' + al.length + '</b></div></div>' +
        (al.length ? '<div class="card"><h2>Нужно ответить</h2><div class="stack" style="gap:8px">' + al.slice(0, 8).map(a => '<div class="callout bad row" style="cursor:pointer" data-a="opn" data-id="order:' + a.o.id + '">' + A.icon('warn', 18) + '<span>' + e(a.kind) + ': ' + e(cname(a.o)) + ', ' + a.age + ' дн. (норма ' + (a.o.stage === 0 ? C.normReply : C.normKp) + ')</span></div>').join('') + '</div></div>' : '') +
        '<div class="card">' + (v === 'kanban' ? kanbanView() : v === 'table' ? tableView() : funnelView(f) + '<p class="mut sm" style="margin-top:8px">В Excel-учёте только оформленные заказы, поэтому этапы до договора считаются по просчётам из телефонного приложения.</p>') + '</div>' +
        '<div class="g2"><div class="card"><h2>Причины отказа</h2>' + (Object.keys(lostBy).length ? Object.keys(lostBy).map(k => '<div class="hb"><span>' + e(k) + '</span><div><i style="width:' + lostBy[k] / f.lost.length * 100 + '%"></i></div><b class="r">' + lostBy[k] + '</b></div>').join('') : '<p class="mut">Отказов за период нет.</p>') +
        '<div class="row wrap" style="margin-top:8px">' + C.loss.map((r, i) => '<span class="pill">' + e(r) + ' <span data-a="lossdel" data-i="' + i + '" style="cursor:pointer">×</span></span>').join('') + '</div><div class="row" style="margin-top:8px"><input class="in" id="lossnew" placeholder="Новая причина"><button class="btn" data-a="lossadd">Добавить</button></div></div>' +
        '<div class="card"><h2>Нормы и план</h2><div class="stack" style="gap:10px"><div class="field"><label>Ответить на заявку, дней</label><input class="in" type="number" min="0" value="' + C.normReply + '" data-c="cnorm1"></div><div class="field"><label>Дожать КП, дней</label><input class="in" type="number" min="0" value="' + C.normKp + '" data-c="cnorm2"></div><div class="field"><label>План выручки на месяц, ₽</label><input class="in" type="number" step="50000" value="' + C.plan + '" data-c="cplan"></div></div></div></div></div>';
    }
  });
})();
