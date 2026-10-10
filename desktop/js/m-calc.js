/* Продажи и расчёт: слева изделие (форма как в ЛК Амиго), справа корзина.
   Расчёт, наличие, ограничения размеров, доставка партии и скидка — тот же код, что на телефоне (engine.js подключает ../src). */
(function () {
  const A = App, S = A.S, e = A.esc, m = A.money;
  const SUPS = ['Amigo', 'Интерьер', 'РДО', 'Foroom', 'Уют'];
  const RU = { Amigo: 'Амиго', Foroom: 'Форум' };
  const ru = s => RU[s] || s;
  const DOT = { 2: '#2E9E48', 1: '#E0A800', 0: '#D64545' };
  const STOCK_TXT = { 2: 'есть на складе', 1: 'мало, уточни у технологов', 0: 'нет на складе' };
  const CTRL_TXT = { L: 'подъём и поворот слева', R: 'подъём и поворот справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' };
  const CHAIN_TXT = { L: 'цепочка слева', R: 'цепочка справа' };
  const O0 = () => ({ open: false, step: 0, fresh: false, sent: false, dog: false, q: '', ct: 'fiz', name: '', phone: '', phone2: '', comment: '', email: '', addr: '', company: '', inn: '', ogrn: '', uaddr: '', repr: '', bank: '', innMsg: '', innOk: true, innBusy: false, inst: true, note: '', pre: '100', preU: '%', term: '12' });
  const O = { open: false, step: 0, fresh: false, sent: false, dog: false, q: '', ct: 'fiz', name: '', phone: '', phone2: '', comment: '', email: '', addr: '', company: '', inn: '', ogrn: '', uaddr: '', repr: '', bank: '', innMsg: '', innOk: true, innBusy: false, inst: true, note: '', pre: '100', preU: '%', term: '12' };
  const F = { mode: '', sup: 'Amigo', lam: 50, mat: 'Дерево', color: '', colOpen: false, cq: '', w: '', h: '', qty: 1, ctrl: 'TR', fix: '', opts: {}, own: '', note: '', edit: -1 };
  const R = { z: false, sys: 'UNI-2', fab: '', fq: '', w: '', h: '', qty: 1, ctrl: 'L', sel: {}, flags: {}, own: '', note: '', edit: -1 };
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const CS = () => window.JalCalcScreen, JC = () => window.JalCart;

  /* приводим форму к допустимому виду для выбранного поставщика (как на телефоне) */
  function norm() {
    const cs = CS(), s = F;
    const lamOk = s.sup === 'Foroom' ? [50] : [25, 50];
    const lam = lamOk.indexOf(s.lam) >= 0 ? s.lam : 50;
    const matOk = (s.sup === 'Интерьер' && lam === 25) ? ['Дерево'] : (s.sup === 'Amigo' && lam === 50 ? ['Дерево', 'Бамбук', 'Пластик'] : ['Дерево', 'Бамбук']);
    const mat = matOk.indexOf(s.mat) >= 0 ? s.mat : 'Дерево';
    const prodKey = mat + ' ' + lam, colList = cs.colorsFor(s.sup, prodKey);
    const color = colList.some(c => c.key === s.color) ? s.color : '';
    const optNames = cs.availOpts(s.sup, lam), opts = {}; optNames.forEach(n => { if (s.opts[n]) opts[n] = true; });
    const chain = !!opts['Цепочка'], splitOnly = s.sup === 'РДО' && lam === 50;
    const ctrl = chain ? (s.ctrl === 'R' || s.ctrl === 'TL' ? 'R' : 'L') : (splitOnly ? (s.ctrl === 'TL' ? 'TL' : 'TR') : (cs.CTRL_NAMES[s.ctrl] ? s.ctrl : 'TR'));
    const ctrlKeys = chain ? ['L', 'R'] : (splitOnly ? ['TL', 'TR'] : cs.CTRL_ORDER[lam]);
    const fixNames = cs.availFixes(s.sup, lam), fix = fixNames.indexOf(s.fix) >= 0 ? s.fix : '';
    const cur = { sup: s.sup, lam, mat, color, ctrl, fix, w: s.w, h: s.h, opts };
    const r = cs.calcItem(cur, colList);
    return { lamOk, lam, matOk, mat, prodKey, colList, color, optNames, opts, chain, ctrl, ctrlKeys, fixNames, fix, cur, r, selCol: colList.find(c => c.key === color) };
  }
  const seg = (items, on, act, key) => '<div class="seg">' + items.map(v => '<button class="' + (on === v[0] ? 'on' : '') + '" data-a="' + act + '" data-k="' + key + '" data-v="' + e(v[0]) + '">' + e(v[1]) + '</button>').join('') + '</div>';

  function pricesBar() {
    const E = window.Eng;
    if (!E || E.err && !E.ready) return '<div class="callout bad">' + e(E ? E.err : 'Движок расчёта не загрузился') + '</div>';
    const when = E.at ? new Date(E.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="row wrap" style="gap:8px;margin-bottom:10px">' + (E.ready ? '<span class="mut" style="font-size:13px">Цены из таблицы: ' + e(when) + '</span>' : '<span class="mut">Цены ещё не загружены</span>') +
      '<span class="sp"></span><button class="btn sm" data-a="cprices">Обновить цены</button></div>' +
      (E.url() ? '' : '<div class="field" style="margin-bottom:10px"><label>Ссылка на скрипт цен (та же, что во вкладке «Цены» на телефоне)</label><input class="in" data-c="cscript" placeholder="https://script.google.com/…?key=…"></div>');
  }

  /* ===== автоматика: приводы и пульты по поставщику, отдельными позициями корзины ===== */
  const COLLN = () => CS().COLL_ALL;
  function autoPanel() {
    const J = JC(), cs = CS();
    const rows = kind => (J.autoList(F.sup, kind) || []).map(f => { const q = J.autoQty(F.sup, kind, f.key);
      return '<div class="row" style="padding:8px 10px;border-radius:10px;border:1.5px solid ' + (q ? 'var(--acc)' : 'var(--line,#ddd)') + ';background:' + (q ? 'var(--acc-s)' : 'transparent') + '"><div style="flex:1;min-width:0"><b>' + e(f.name) + '</b>' + (f.sub ? '<div class="mut" style="font-size:12px">' + e(f.sub) + '</div>' : '') + '</div>' +
        '<div class="num b" style="white-space:nowrap">' + m(f.price) + '</div><div class="row" style="gap:4px"><button class="btn sm" data-a="cast" data-kind="' + kind + '" data-key="' + e(f.key) + '" data-d="-1">−</button><b class="num" style="min-width:22px;text-align:center">' + q + '</b><button class="btn sm" data-a="cast" data-kind="' + kind + '" data-key="' + e(f.key) + '" data-d="1">+</button></div></div>'; }).join('');
    const cnt = J.counts();
    return '<div class="autop"><div class="row" style="margin-bottom:6px"><b>Автоматика: ' + e(cs.COLL_ALL[F.sup]) + ' (' + e(ru(F.sup)) + ')</b><span class="sp"></span><span class="mut sm">в корзине: приводов ' + cnt.drive + ', пультов ' + cnt.remote + '</span><button class="ib" data-a="cauto" title="Закрыть">' + A.icon('close', 16) + '</button></div>' +
      (J.hasAuto(F.sup) ? '<h3 style="margin:12px 0 6px">Приводы</h3><div class="stack" style="gap:6px">' + (rows('drive') || '<div class="mut">Нет в таблице</div>') + '</div><h3 style="margin:14px 0 6px">Пульты и выключатели</h3><div class="stack" style="gap:6px">' + (rows('remote') || '<div class="mut">Нет в таблице</div>') + '</div><div class="mut" style="font-size:12px;margin-top:10px">К каждому приводу нужен пульт или выключатель того же поставщика; каналов в пультах не меньше, чем приводов.</div>'
        : '<div class="empty" style="padding:24px">По этому поставщику в таблице нет данных по автоматике.</div>') + '</div>';
  }
  function autoErrors(FF) {
    const grp = {}, C = JC().C;
    C.cart.forEach((it, i) => { if (it.kind !== 'drive' && it.kind !== 'remote') return; const f = FF.calcs[i].auto, ln = (f && f.line) || '', g = it.sup + ln, o = grp[g] || (grp[g] = { sup: it.sup, ln, D: 0, R: 0, C: 0 });
      if (it.kind === 'drive') o.D += it.qty; else { const mm = f && /(\d+)[‑-]канал/.exec(f.name || ''); o.R += it.qty; o.C += (mm ? +mm[1] : 1) * it.qty; } });
    const nm = o => ru(o.sup) + (o.ln === 'ws' ? ' (серия WS)' : o.ln === 'd' ? ' (серия D)' : '');
    return Object.keys(grp).map(g => grp[g]).map(o => o.D && !o.R ? nm(o) + ': приводов ' + o.D + ', а пультов или выключателей нет.' : (o.D && o.C < o.D ? 'ОШИБКА, ' + nm(o) + ': приводов ' + o.D + ', а каналов в пультах только ' + o.C + '. Нужны 1-канальные пульты на каждый привод или один многоканальный.' : '')).filter(Boolean);
  }
  const kindName = (it, c) => it.kind === 'custom' ? { title: it.title || 'Услуга', sub: 'своя строка' } : { title: COLLN()[it.sup] + ' (' + ru(it.sup) + ')', sub: (c.auto ? c.auto.name : it.key) + (it.kind === 'drive' ? ' · привод' : ' · пульт') };

  const CU = { title: '', price: '', sum: '', qty: 1, cost: '', drv: 'price' };
  const num = v => Math.max(0, Math.round(+String(v).replace(/\s/g, '').replace(',', '.') || 0));
  /* добавление своего товара прямо в корзине: можно вписать цену за шт или общую стоимость, остальное считается */
  const customRow = () => { const cf = (l, k, st, v, cls) => '<div class="cuf" style="' + st + '"><label>' + l + '</label><input class="ul num" ' + (cls || '') + ' value="' + e(v) + '" data-c="cuf" data-k="' + k + '"></div>';
    return '<div class="cuadd">' + cf('Название', 'title', 'flex:1;min-width:120px', CU.title).replace('class="ul num"', 'class="ul"') + cf('Кол-во', 'qty', 'width:56px', CU.qty) + cf('Цена за шт', 'price', 'width:96px', CU.price) + cf('Стоимость', 'sum', 'width:104px', CU.sum) +
      (S.showCost ? cf('Закуп за шт', 'cost', 'width:96px', CU.cost) : '') + '<button class="btn pri" data-a="cuadd">Добавить</button></div>'; };
  /* ===== левая часть: компактная форма по образцу кабинета Амиго ===== */
  const DRAW = { 50: { L: ['M5 6v23M7.5 6v23M11 6v19', ''], R: ['M29 6v23M26.5 6v23M23 6v19', ''], TL: ['M5 6v23M7.5 6v23M28 6v19', ''], TR: ['M6 6v19M26.5 6v23M29 6v23', ''] },
    25: { L: ['M11 6v19', 'M6 6v23'], R: ['M23 6v19', 'M28 6v23'], TL: ['M28 6v19', 'M6 6v23'], TR: ['M6 6v19', 'M28 6v23'] } };
  const DRAW_CHAIN = { L: 'M7 8v20', R: 'M27 8v20' };
  const ctrlSvg = (lam, k, chain, sz) => '<svg width="' + (sz || 34) + '" height="' + (sz || 34) + '" viewBox="0 0 34 36" fill="none" stroke="currentColor" stroke-linecap="round"><rect x="1.5" y="1.5" width="31" height="33" rx="3" stroke-width="1" opacity=".35"/>' +
    (chain ? '<path d="' + DRAW_CHAIN[k] + '" stroke-width="2.8" stroke-dasharray="0.1 4"/>' : '<path d="' + DRAW[lam][k][0] + '" stroke-width="1.3"/>' + (DRAW[lam][k][1] ? '<path d="' + DRAW[lam][k][1] + '" stroke-width="2.6"/>' : '')) + '</svg>';
  const matOkFor = (sup, lam) => (sup === 'Интерьер' && lam === 25) ? ['Дерево'] : (sup === 'Amigo' && lam === 50 ? ['Дерево', 'Бамбук', 'Пластик'] : ['Дерево', 'Бамбук']);
  /* приблизительный цвет планки для рисунка внизу (по названию; только для наглядности) */
  const TINTS = [['бел', '#f1eee8'], ['слон', '#eadfc8'], ['айвор', '#eadfc8'], ['беж', '#d9c7a3'], ['береза', '#e0cba5'], ['бук', '#d2a778'], ['ольх', '#c28e5c'], ['дуб', '#c9a37a'], ['тик', '#a8794a'], ['орех', '#8a5a3b'], ['вишн', '#7a3a2a'], ['махагон', '#6e3b2b'], ['венге', '#3b2a22'], ['венг', '#3b2a22'], ['чёрн', '#222'], ['черн', '#222'], ['граф', '#5d5f62'], ['сер', '#9b9892'], ['натур', '#d5b87a'], ['охра', '#c99a45'], ['рустик', '#9a7a58'], ['тигр', '#b98a3e']];
  const tintOf = name => { const n = String(name || '').toLowerCase(); for (const t of TINTS) if (n.indexOf(t[0]) >= 0) return t[1]; return '#c9a37a'; };
  /* наличие по длинам ламели, как в кабинете Амиго: по цвету видно, какая длина есть, а какая нет; короткие под текущую ширину зачёркнуты */
  const lensHtml = (prodKey, key) => { const L = CS().stockLens ? CS().stockLens(prodKey, key, F.sup) : [], w = +F.w || 0;
    return L.length ? '<span class="lens">' + L.map(x => '<span class="ln lv' + x.lv + (w && x.cm * 10 < w + 50 ? ' short' : '') + '" title="' + x.cm + ' см: ' + STOCK_TXT[x.lv] + (w && x.cm * 10 < w + 50 ? ' (не хватает под ширину)' : '') + '">' + x.cm + '</span>').join('') + '</span>' : ''; };
  function preview(n) {
    const w = +F.w || 120, h = +F.h || 160, bw = Math.max(70, Math.round(w / Math.max(w, h) * 200)), bh = Math.max(70, Math.round(h / Math.max(w, h) * 200)), c = tintOf(n.selCol && n.selCol.name), rows = Math.max(8, Math.min(24, Math.round(bh / 8)));
    let sl = ''; for (let i = 0; i < rows; i++) sl += '<rect x="5" y="' + (6 + i * (bh - 8) / rows) + '" width="' + (bw - 10) + '" height="' + ((bh - 8) / rows - 1.2) + '" rx="1" fill="' + c + '"/>';
    return '<svg class="pic" viewBox="0 0 ' + bw + ' ' + bh + '"><rect x=".5" y=".5" width="' + (bw - 1) + '" height="' + (bh - 1) + '" rx="3" fill="var(--panel2)" stroke="var(--line)"/><rect x="3" y="3" width="' + (bw - 6) + '" height="3" rx="1.5" fill="#6f6a63"/>' + sl + '</svg>';
  }
  const MODELS = [['rolo', 'Рулонные шторы'], ['zebra', 'Зебра'], ['', 'Горизонтальные алюминиевые (скоро)', 1], ['blinds', 'Горизонтальные деревянные'], ['vert', 'Вертикальные жалюзи'], ['', 'Плиссе (скоро)', 1], ['', 'Римские шторы (скоро)', 1]];
  const noPrices = () => '<div class="empty" style="padding:28px">Цены не загружены.<br><small>Укажите ссылку на скрипт цен и нажмите «Синхронизировать» в Настройках, раздел «Данные».</small></div>';
  function form() {
    const E = window.Eng;
    if (!E || E.err && !E.ready) return '<div class="card"><div class="callout bad">' + e(E ? E.err : 'Движок расчёта не загрузился') + '</div></div>';
    if (!E.ready) return '<div class="card"><h2>Новое изделие</h2>' + noPrices() + '</div>';
    return F.mode === 'rolo' ? formRolo() : F.mode === 'blinds' ? form0() : formEmpty();
  }
  const formEmpty = () => '<div class="card cform"><h2>Новое изделие</h2><div class="fgrid">' + modelRow() + '</div></div>';
  const modelRow = () => '<div class="fld"><label>Модель</label><select class="ul" data-c="cmodel">' + (F.mode ? '' : '<option value="" selected disabled>Выберите модель</option>') + MODELS.map(x => '<option value="' + x[0] + '"' + (x[2] ? ' disabled' : '') + (F.mode && x[0] === (F.mode === 'rolo' ? RM() : F.mode) ? ' selected' : '') + '>' + e(x[1]) + '</option>').join('') + '</select></div>';
  const autoPanelBody = () => { const h = autoPanel(); return h.replace(/^<div class="card">/, '<div>').replace(/<h2>Автоматика<\/h2>/, ''); };
  function form0() {
    const cs = CS(), n = norm(), r = n.r, s = F, showProfit = !!S.showCost;
    const stock = n.selCol ? cs.stockOf(n.prodKey, n.selCol.key, s.sup, +s.w || 0) : null;
    const minRate = n.colList.length && n.colList[0].rate ? Math.min.apply(null, n.colList.map(c => c.rate)) : 0;
    const own = s.own !== '' && !isNaN(+s.own) && +s.own >= 0, unit = own ? Math.round(+s.own) : (r.ok ? r.unit : 0);
    const kg = r.ok ? JalLimits.weightKg(n.mat, n.lam, +s.w, +s.h) : 0;
    const q = (s.cq || '').trim().toLowerCase(), shown = n.colList.filter(c => !q || (c.name + ' ' + c.ser).toLowerCase().indexOf(q) >= 0);
    const waiting = !!r.needColor, good = r.ok && !r.warn.length, qty = Math.max(1, +s.qty || 1);
    const types = []; n.lamOk.forEach(l => matOkFor(s.sup, l).forEach(mt => types.push([mt + '|' + l, mt + ' ' + l + ' мм'])));
    let h = '<div class="card cform"><div class="ftop"><h2>' + (s.edit >= 0 ? 'Изделие, позиция ' + (s.edit + 1) : 'Новое изделие') + '</h2><span class="sp"></span>' + (s.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div><div class="fbody">';
    const colorFld = n.colList.length ? (() => { let c = '<div class="fld colf"><label>Цвет</label><button class="ul sel" data-a="ccol">' + (n.selCol ? (stock !== null ? '<i class="sd" style="background:' + DOT[stock] + '"></i>' : '') + '<b>' + e(n.selCol.name) + '</b><span class="mut sm">' + e([n.selCol.ser, minRate && n.selCol.rate > minRate ? '+' + fmt(n.selCol.rate - minRate) + ' ₽/м²' : ''].filter(Boolean).join(' · ')) + '</span>' : '<span class="ph">Выберите цвет</span>') + (n.selCol ? '<span class="sp"></span>' + lensHtml(n.prodKey, n.selCol.key) : '') + '</button>';
      if (s.colOpen) c += '<div class="colpop"><input class="in" data-c="ccolq" placeholder="Поиск цвета" value="' + e(s.cq) + '" id="ccolq"><div class="colist sc">' + (shown.length ? shown.map(c2 => { const st2 = cs.stockOf(n.prodKey, c2.key, s.sup, +s.w || 0), ex = c2.rate && c2.rate > minRate;
        return '<button class="coli ' + (c2.key === n.color ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(c2.key) + '"><i class="sw" style="background:' + tintOf(c2.name) + '"></i>' + (st2 !== null ? '<i class="sd" style="background:' + DOT[st2] + '"></i>' : '') + '<span><b>' + e(c2.name) + '</b> <span class="mut sm">' + e(c2.ser) + '</span></span><span class="sp"></span>' + lensHtml(n.prodKey, c2.key) + (ex ? '<span class="pill">+' + fmt(c2.rate - minRate) + ' ₽/м²</span>' : '') + '</button>'; }).join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>';
      return c + '</div>'; })() : '<div class="fld"></div>';
    const ICW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>';
    const ICH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3"/></svg>';
    const ORD = ['Тесьма', 'Цепочка', 'Окраска'], optSorted = n.optNames.slice().sort((x, y) => (ORD.indexOf(x) < 0 ? 9 : ORD.indexOf(x)) - (ORD.indexOf(y) < 0 ? 9 : ORD.indexOf(y)));
    const cnt = JC().counts(), nAuto = cnt.drive + cnt.remote;
    /* одна колонка: модель, коллекция, тип, цвет, размер — Tab идёт строго по порядку */
    h += '<div class="fgrid fcol">' + modelRow() + '<div class="fld"><label>Коллекция</label><select class="ul" data-c="csup">' + SUPS.map(x => '<option value="' + x + '"' + (s.sup === x ? ' selected' : '') + '>' + e(cs.COLL_ALL[x] + ' (' + ru(x) + ')') + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Тип</label><select class="ul" data-c="ctype">' + types.map(t => '<option value="' + t[0] + '"' + (t[0] === n.mat + '|' + n.lam ? ' selected' : '') + '>' + e(t[1]) + '</option>').join('') + '</select></div>' + colorFld + '</div>';
    h += '<div class="fld sz"><label>Размер, мм</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<input class="ul num" type="number" min="0" value="' + e(s.w) + '" data-c="cf" data-k="w"></span><span class="szi" title="Высота">' + ICH + '<input class="ul num" type="number" min="0" value="' + e(s.h) + '" data-c="cf" data-k="h"></span></div></div>';
    h += '<div class="fld"><label>Управление' + (n.chain ? ' (цепочка)' : '') + '</label><div class="ctrls">' + n.ctrlKeys.map(k => '<button class="ctr ' + (n.ctrl === k ? 'on' : '') + '" data-a="cf" data-k="ctrl" data-v="' + k + '" title="' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '">' + ctrlSvg(n.lam, k, n.chain, 52) + '<span>' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '</span></button>').join('') + '</div></div>';
    if (optSorted.length) h += '<div class="fld"><label>Опции</label><div class="ochips">' + optSorted.map(o => '<button class="oc ' + (n.opts[o] ? 'on' : '') + '" data-a="copt" data-v="' + e(o) + '">' + e(o) + (r.ok && n.opts[o] && r.optP[o] ? ' +' + fmt(r.optP[o]) : '') + '</button>').join('') + '</div></div>';
    if (n.fixNames.length) h += '<div class="fld fixf"><label>Нижняя фиксация</label><select class="ul" data-c="cfix"><option value="">Без фиксации</option>' + n.fixNames.map(f => '<option value="' + e(f) + '"' + (n.fix === f ? ' selected' : '') + '>' + e((cs.FIXLBL[f] || f) + (r.ok && n.fix === f && r.optP[f] !== undefined ? ' +' + fmt(r.optP[f]) + ' ₽' : '')) + '</option>').join('') + '</select></div>';
    if (JC().hasAuto(s.sup)) h += '<div class="fld"><label>Автоматика</label><div class="ochips"><button class="oc ' + (nAuto ? 'on' : '') + '" data-a="cauto">Приводы и пульты' + (nAuto ? ' · ' + cnt.drive + '+' + cnt.remote : '') + '</button></div></div>';
    /* проверка размеров, наличие, вес: одной строкой */
    let st = '';
    if (!waiting && +s.w > 0 && +s.h > 0) st = '<div class="fnote ' + (good ? 'ok' : 'bad') + '">' + (!r.ok ? e(r.msg ? r.msg[0].toUpperCase() + r.msg.slice(1) : 'Не поставляется') : (r.warn.length ? '<b>' + (r.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + '</b>' + e(r.warn.join('; ')) : 'Размеры в гарантии')) + '</div>';
    if (stock !== null && stock < 2) st += '<div class="fnote"><i class="sd" style="background:' + DOT[stock] + '"></i> ' + e(STOCK_TXT[stock][0].toUpperCase() + STOCK_TXT[stock].slice(1)) + '</div>';
    if (own && r.ok && showProfit && unit < r.unit - r.profit) st += '<div class="fnote bad">Ниже закупа: убыток ' + m((r.unit - r.profit - unit) * qty) + ' на позицию.</div>';
    if (s.autoOpen) h += '<div class="autopop sc">' + autoPanel() + '</div>';
    h += '<div class="fnotes">' + st + '</div></div>';
    /* низ: монетка закупа, количество, цена и своя цена, в корзину; всё ближе к центру */
    h += '<div class="ffoot"><button class="coin ' + (showProfit ? 'on' : '') + '" data-a="chide" title="' + (showProfit ? 'Закуп и прибыль показаны' : 'Показать закуп и прибыль') + '">' + A.icon('coin', 22) + '</button>' +
      '<div class="fld"><label>Количество</label><div class="qst"><button data-a="cqty" data-d="-1">−</button><input class="num" type="number" min="1" max="99" value="' + qty + '" data-c="cf" data-k="qty"><button data-a="cqty" data-d="1">+</button></div></div>' +
      '<div class="fprice"><div class="fown"><label>Своя цена за шт</label><input class="ul num" value="' + e(s.own) + '" data-c="cf" data-k="own" placeholder="' + (r.ok ? Math.round(r.unit) : '') + '"></div>' +
      '<small class="mut">' + (r.ok ? (qty > 1 ? fmt(unit) + ' ₽ × ' + qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : '') + (kg ? ' · вес ≈ ' + JalLimits.fmtKg(kg * qty) + ' кг' : '') + (own ? ' · своя цена' : '') + '</small>' +
      '<div class="big num">' + (r.ok ? m(unit * qty) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * qty) + '</small>' : '') + '</div>' +
      '<button class="btn pri fadd" data-a="cadd" style="opacity:' + (r.ok ? 1 : .45) + '">' + (s.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div></div>';
    return h;
  }

  /* ===== рулонные шторы Амиго: система, ткань, размер, управление, опции по группам ===== */
  const RJ = () => window.JalRolo;
  const RM = () => R.v ? 'vert' : R.z ? 'zebra' : 'rolo';
  const roloItem = () => ({ prod: 'rolo', sup: 'Amigo', mat: R.v ? 'Вертикальные' : R.z ? 'Зебра' : 'Рулонные шторы', lam: 0, sys: R.sys, fab: R.fab, w: +R.w || 0, h: +R.h || 0, ctrl: R.ctrl, sel: R.sel, flags: R.flags, tubeLock: !!R.tubeLock });
  function normRolo() {
    const J = RJ(), sy = J.systems(RM()); if (!sy.some(x => x.code === R.sys)) R.sys = sy.length ? sy[0].code : '';
    { const fb = R.fab && J.fabOf(R.fab), sv = J.sysOf(R.sys); if (R.fab && (!fb || (fb.m || (fb.z ? 'zebra' : 'rolo')) !== RM() || (R.v && sv && fb.vt !== sv.vt))) R.fab = ''; }
    const o = J.opts(roloItem()); R.sel = o.sel; R.flags = o.flags;
    const r = J.calc(roloItem()); if (r.tubeSel) R.sel['Труба'] = r.tubeSel;
    return { it: roloItem(), r, groups: J.groups(R.sys) };
  }
  const roloName = (it, c) => { const d = RJ() ? RJ().describe(it, c) : { title: 'Рулонная штора', sub: '' }; return { title: d.title + ' (Амиго)', sub: it.w + '×' + it.h + ' мм · ' + d.sub + (c.ok && c.termDays ? ' · срок ' + c.termDays + ' дн' : '') }; };
  function formRolo() {
    const J = RJ(), showProfit = !!S.showCost;
    if (!J || !J.ready()) return '<div class="card cform"><div class="ftop"><h2>Рулонные шторы</h2></div><div class="fbody"><div class="empty" style="padding:28px">Цены на рулонки не загружены.<br><small>Добавьте в Google Таблицу «Цены для приложения» листы из файла «Рулонки_цены.xlsx» (Файл → Импорт → Вставить новые листы) и нажмите «Обновить цены».</small></div>' + pricesBar() + '</div></div>';
    const n = normRolo(), r = n.r, it = n.it, qty = Math.max(1, +R.qty || 1);
    const own = R.own !== '' && !isNaN(+R.own) && +R.own >= 0, unit = own ? Math.round(+R.own) : (r.ok ? r.unit : 0);
    const f = J.fabOf(R.fab), q = (F.cq || '').trim().toLowerCase();
    const sObj = J.sysOf(R.sys), isCorn = !!(sObj && sObj.vt === 'карниз');
    const shown = J.fabrics(RM()).filter(x => (!R.v || !sObj || x.vt === sObj.vt) && (!q || (x.name + ' ' + x.ser + ' ' + x.cat).toLowerCase().indexOf(q) >= 0));
    const sy = J.systems(RM()), grpNames = sy.map(x => x.group).filter((g, i, a) => a.indexOf(g) === i);
    const ICW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>';
    const ICH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3"/></svg>';
    /* прибавка в рознице за вариант опции: считаем тем же расчётом с подставленным значением */
    const delta = (g, val) => { if (!r.ok) return ''; const t = roloItem(); t.sel = Object.assign({}, R.sel); t.flags = Object.assign({}, R.flags);
      if (g.type === 'flag') t.flags[g.name] = !R.flags[g.name]; else t.sel[g.name] = val;
      const r2 = J.calc(t); if (!r2.ok) return ''; const d = r2.unit - r.unit; return d ? (d > 0 ? ' +' : ' −') + fmt(Math.abs(d)) + ' ₽' : ''; };
    let h = '<div class="card cform"><div class="ftop"><h2>' + (R.edit >= 0 ? (R.v ? 'Вертикальные жалюзи' : R.z ? 'Штора зебра' : 'Рулонная штора') + ', позиция ' + (R.edit + 1) : R.v ? 'Новые вертикальные жалюзи' : R.z ? 'Новая штора зебра' : 'Новая рулонная штора') + '</h2><span class="sp"></span>' + (R.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div><div class="fbody rbody">';
    let fabFld = '<div class="fld colf"><label>' + (R.v ? 'Материал' : 'Ткань') + '</label><button class="ul sel fabsel" data-a="ccol">' + (f ? (f.stock !== null ? '<i class="sd" style="background:' + DOT[f.stock] + '"></i>' : '') + '<span class="fabtx"><b>' + e(f.name) + '</b><span class="mut sm">категория ' + e(f.cat) + ' · серия ' + e(f.ser) + '</span></span>' : '<span class="ph">' + (R.v ? 'Выберите материал' : 'Выберите ткань') + '</span>') + '</button>';
    if (F.colOpen) fabFld += '<div class="colpop"><input class="in" data-c="ccolq" placeholder="Поиск ткани (название, серия, категория)" value="' + e(F.cq) + '" id="ccolq"><div class="colist sc">' + (shown.length ? shown.map(x => '<button class="coli ' + (x.key === R.fab ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(x.key) + '">' + (x.stock !== null ? '<i class="sd" style="background:' + DOT[x.stock] + '"></i>' : '') + '<span><b>' + e(x.name) + '</b> <span class="mut sm">серия ' + e(x.ser) + '</span></span><span class="sp"></span><span class="pill">кат. ' + e(x.cat) + '</span></button>').join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>';
    fabFld += '</div>';
    h += '<div class="fgrid">' + modelRow() + '<div class="fld"><label>Система</label><select class="ul" data-c="rsys">' + grpNames.map(g => '<optgroup label="' + e(g) + '">' + sy.filter(x => x.group === g).map(x => '<option value="' + e(x.code) + '"' + (x.code === R.sys ? ' selected' : '') + '>' + e(x.name) + '</option>').join('') + '</optgroup>').join('') + '</select></div>' + (isCorn ? '' : fabFld) + '</div>';
    h += '<div class="fld sz"><label>Размер, мм</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<input class="ul num" type="number" min="0" value="' + e(R.w) + '" data-c="rf" data-k="w"></span><span class="szi" title="Высота">' + ICH + '<input class="ul num" type="number" min="0" value="' + e(R.h) + '" data-c="rf" data-k="h"></span></div></div>';
    h += '<div class="fld"><label>Управление</label><div class="ctrls">' + [['L', 'цепочка слева'], ['R', 'цепочка справа']].map(k => '<button class="ctr ' + (R.ctrl === k[0] ? 'on' : '') + '" data-a="rf" data-k="ctrl" data-v="' + k[0] + '">' + ctrlSvg(50, k[0], true, 52) + '<span>' + k[1] + '</span></button>').join('') + '</div></div>';
    const choice = n.groups.filter(g => g.type === 'choice' && g.items.length > 1), flags = n.groups.filter(g => g.type === 'flag');
    if (choice.length) h += '<div class="fgrid ropts">' + choice.map(g => '<div class="fld"><label>' + e(g.name) + '</label><select class="ul" data-c="ropt" data-k="' + e(g.name) + '">' + g.items.map(x => '<option value="' + e(x.value) + '"' + (R.sel[g.name] === x.value ? ' selected' : '') + '>' + e(x.value + (R.sel[g.name] === x.value ? '' : delta(g, x.value))) + '</option>').join('') + '</select></div>').join('') + '</div>';
    if (flags.length) h += '<div class="fld"><label>Дополнительно</label><div class="ochips">' + flags.map(g => '<button class="oc ' + (R.flags[g.name] ? 'on' : '') + '" data-a="rflag" data-v="' + e(g.name) + '">' + e(g.name) + (r.ok && R.flags[g.name] && r.optP[g.name] ? ' +' + fmt(r.optP[g.name]) : (R.flags[g.name] ? '' : delta(g))) + '</button>').join('') + '</div></div>';
    let st = '';
    if (!R.v && !J.windReady() && !F.windTried) { F.windTried = true; setTimeout(() => A.act.cprices(), 0); }
    const wd = f && !R.v ? J.wind(it) : null;
    if (wd) { const over = (+R.h > 0 && wd.max < 6 && +R.h / 10 > wd.max * 100 + 0.01); st += '<div class="fnote ' + (over ? 'bad' : 'ok') + '"><b>Макс. высота намотки:</b> ' + (wd.max >= 6 ? 'без ограничений (до 600 см)' : Math.floor(wd.max * 100) + ' см') + '</div>'; }
    else if (f && R.sys && !R.v) st += '<div class="fnote mut">Макс. высота намотки: ' + (J.windReady() ? 'нет данных для этой ткани и системы' : 'таблицы намоток ещё не загружены, обновляю цены…') + '</div>';
    if (+R.w > 0 && +R.h > 0 && f) st += '<div class="fnote ' + (r.ok && !r.warn.length ? 'ok' : 'bad') + '">' + (!r.ok ? e(r.msg) : r.warn.length ? '<b>НЕ ГАРАНТ.: </b>' + e(r.warn.join('; ')) : (r.areaNote || 'Размеры в пределах прайса (считаем по сетке ' + Math.round(r.gridW * 1000) + '×' + Math.round(r.gridH * 1000) + ' мм)')) + '</div>';
    if (r.tubeAuto) st += '<div class="fnote ok"><b>Труба ' + e(r.tubeAuto.to) + ':</b> на трубе ' + e(r.tubeAuto.from) + ' размеры вне гарантии, подобрали большую (цена пересчитана)</div>';
    if (r.rec) st += '<div class="fnote"><b>Рекомендуется редуктор' + (r.rec === 'q' ? ' с большой цепью 6×12' : '') + '</b> (по диаграмме Амиго)</div>';
    if (f && f.stock !== null && f.stock < 2) st += '<div class="fnote"><i class="sd" style="background:' + DOT[f.stock] + '"></i> ' + e(STOCK_TXT[f.stock][0].toUpperCase() + STOCK_TXT[f.stock].slice(1)) + '</div>';
    if (r.ok) st += '<div class="fnote"><b>Срок:</b> ' + r.termDays + ' дней</div>';
    if (own && r.ok && showProfit && unit < r.cost) st += '<div class="fnote bad">Ниже закупа: убыток ' + m((r.cost - unit) * qty) + ' на позицию.</div>';
    h += '</div>';
    const ph = J.photoUrl(f);
    h += '<div class="ffoot">' + (ph ? '<button class="rph" data-a="rphoto" title="Увеличить фото ткани"><img src="' + e(ph) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></button>' : '') + '<div class="fright"><div class="fnotes">' + st + '</div><div class="frow">' + '<button class="coin ' + (showProfit ? 'on' : '') + '" data-a="chide" title="' + (showProfit ? 'Закуп и прибыль показаны' : 'Показать закуп и прибыль') + '">' + A.icon('coin', 22) + '</button>' +
      '<div class="fld"><label>Количество</label><div class="qst"><button data-a="rqty" data-d="-1">−</button><input class="num" type="number" min="1" max="99" value="' + qty + '" data-c="rf" data-k="qty"><button data-a="rqty" data-d="1">+</button></div></div>' +
      '<div class="fprice"><div class="fown"><label>Своя цена за шт</label><input class="ul num" value="' + e(R.own) + '" data-c="rf" data-k="own" placeholder="' + (r.ok ? Math.round(r.unit) : '') + '"></div>' +
      '<small class="mut">' + (r.ok ? (qty > 1 ? fmt(unit) + ' ₽ × ' + qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : '') + (own ? ' · своя цена' : '') + '</small>' +
      '<div class="big num">' + (r.ok ? m(unit * qty) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * qty) + ' (закуп ' + fmt(r.cost) + ')</small>' : '') + '</div>' +
      '<button class="btn pri fadd" data-a="cadd" style="opacity:' + (r.ok ? 1 : .45) + '">' + (R.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div></div></div></div>' +
      (R.photo && ph ? '<div class="rphbig" data-a="rphoto"><img src="' + e(ph) + '" alt=""><div class="mut">' + e(f.name) + (f.qty !== null ? ' · на складе ' + fmt(f.qty) + ' м' : '') + '</div></div>' : '');
    return h;
  }

  function itemName(it, c) {
    const extra = Object.keys(it.opts || {}).filter(k => it.opts[k]); if (it.fix) extra.push(CS().FIXLBL[it.fix] || it.fix);
    const col = c.col ? c.col.name : '';
    const chain = !!(it.opts && it.opts['Цепочка']);
    return { title: CS().COLL_ALL[it.sup] + ' (' + ru(it.sup) + ')', sub: it.mat + ' ' + it.lam + (col ? ' · ' + col : '') + ' · ' + (chain ? CHAIN_TXT : CTRL_TXT)[it.ctrl || 'L'] + (extra.length ? ' · ' + extra.join(', ').toLowerCase() : '') };
  }

  /* ===== правая часть: корзина, итог, действия ===== */
  function cart() {
    const E = window.Eng; if (!E || !E.ready) return '<div class="card ccart"><h2>Корзина</h2>' + noPrices() + '</div>';
    const C = JC().C, FF = JC().compute(), items = C.cart, hide = !S.showCost;
    let prof = 0; items.forEach((it, i) => { const c = FF.calcs[i]; if (c.ok) prof += c.profit * it.qty; });
    const netProf = prof - FF.discAmt, cost = FF.goodsSum - prof, pct = C.discMode !== 'rub';
    const row = (it, i) => {
      const c = FF.calcs[i], nm = it.kind ? kindName(it, c) : it.prod === 'rolo' ? roloName(it, c) : itemName(it, c), lineUnit = c.ok ? FF.lineSum[i] / it.qty : 0;
      const warn = it.prod === 'rolo' && !c.ok ? '<div class="cwarn">' + e(c.msg || 'Нет цены') + '</div>' : c.ok && c.warn && c.warn.length ? '<div class="cwarn">' + (c.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + e(c.warn.join('; ')) + '</div>' : '';
      const q = it.kind === 'custom' ? '<button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="-1">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="1">+</button>' :
        it.kind ? '<button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="-1" data-sup="' + e(it.sup) + '">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="1" data-sup="' + e(it.sup) + '">+</button>' : '<b>' + it.qty + '</b>';
      return '<tr><td class="num mut">' + (i + 1) + '</td><td><b>' + e(nm.title) + '</b><div class="mut sm">' + e(nm.sub) + '</div>' + (it.note ? '<div class="mut sm">' + e(it.note) + '</div>' : '') + warn +
        (!hide && c.ok && !c.noCost ? '<div class="sm" style="color:' + (c.profit < 0 ? 'var(--bad)' : 'var(--mut)') + '">прибыль ' + m(c.profit) + ' за шт</div>' : '') + '</td>' +
        '<td class="cq">' + q + '</td>' +
        '<td class="r">' + (it.kind ? (c.ok ? '<span class="num">' + m(lineUnit) + '</span>' : '<span class="mut">нет цены</span>') : c.ok ? '<input class="ul num cp' + (c.ownPrice ? ' own' : '') + '" value="' + (c.ownPrice ? Math.round(c.unit) : '') + '" placeholder="' + Math.round(lineUnit) + '" data-c="cprice" data-i="' + i + '" title="' + (c.ownPrice ? 'своя цена, по прайсу было ' + fmt(c.listUnit) : 'впишите свою цену за шт') + '">' : '<span class="mut">нет цены</span>') + '</td>' +
        '<td class="r num b">' + (c.ok ? m(FF.lineSum[i]) : '—') + '</td><td class="r cact">' + (it.kind ? '' : '<button class="ib" data-a="cedit" data-i="' + i + '" title="Изменить">' + A.icon('edit', 15) + '</button><button class="ib" data-a="cdup" data-i="' + i + '" title="Копия">' + A.icon('copy', 15) + '</button>') + '<button class="ib" data-a="cdel" data-i="' + i + '" title="Убрать">' + A.icon('close', 15) + '</button></td></tr>'; };
    return '<div class="card ccart"><div class="ctop"><h2>Корзина</h2><span class="pill">' + items.length + ' поз.</span><span class="sp"></span>' +
      '<div class="seg" title="СПб: розница с доставкой и монтажом. Регионы: опт без доставки и монтажа"><button class="' + (!C.region ? 'on' : '') + '" data-a="creg" data-v="0">СПб</button><button class="' + (C.region ? 'on' : '') + '" data-a="creg" data-v="1">Регионы</button></div>' +
      '</div>' +
      '<div class="clist sc">' + (items.length ? '<table class="tbl cartline"><thead><tr><th>№</th><th>Изделие</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th><th></th></tr></thead><tbody>' + items.map(row).join('') + '</tbody></table>' :
        '') + (FF.svcLeft ? '<div class="cwarn" style="color:var(--mut);margin:8px 0">Доставка и установка: +' + m(FF.svcLeft) + '</div>' : '') + autoErrors(FF).map(t => '<div class="callout bad" style="margin:8px 0;font-size:13px">' + e(t) + '</div>').join('') + '</div>' +
      customRow() +
      '<div class="cfoot"><div class="cline">' +
      (C.region ? '<input class="ul" style="flex:1" value="' + e(C.pvz || '') + '" placeholder="Адрес ПВЗ и транспортная компания" data-c="cpvz">' :
        '<label style="font-size:15px;font-weight:700;color:var(--fg)">Доставка и установка, ₽</label><input class="ul num" style="width:140px;font-size:18px;font-weight:700;padding:8px 10px;border:2px solid var(--acc,#F1780F);border-radius:8px" value="' + (C.service || '') + '" placeholder="0" data-c="cserv">' + (function () { const g = JC().instSugg(FF); return g.sum ? '<div style="display:flex;flex-direction:column;gap:4px;margin-left:10px"><small class="mut" style="max-width:360px">По ставкам монтажа (ориентировочно): ' + e(g.text) + ' = <b>' + m(g.sum) + '</b></small><button class="btn sm" style="align-self:flex-start;' + (+C.service === g.sum ? 'opacity:.6' : '') + '" data-a="cservsug" data-v="' + g.sum + '">Подставить ' + m(g.sum) + '</button></div>' : '<small class="mut" style="margin-left:10px">Ставки монтажа для рулонок и других видов добавим позже</small>'; })()) +
      '<span class="sp"></span><label>Скидка</label><div class="seg"><button class="' + (pct ? 'on' : '') + '" data-a="cdm" data-v="pct">%</button><button class="' + (!pct ? 'on' : '') + '" data-a="cdm" data-v="rub">₽</button></div><input class="ul num" type="number" min="0" style="width:72px" value="' + (C.disc || '') + '" data-c="cdisc" placeholder="0"></div>' +
      '<div class="sumbar" style="grid-template-columns:repeat(' + (hide ? 2 : 4) + ',1fr)"><div><small>Сумма без скидки</small><b>' + m(FF.total) + '</b></div><div><small>Итого' + (FF.discAmt ? ' (скидка −' + m(FF.discAmt) + ')' : '') + '</small><b style="color:var(--acc)">' + m(FF.netTotal) + '</b></div>' +
      (hide ? '' : '<div><small>Закуп (оценка)</small><b>' + m(Math.max(0, cost)) + '</b></div><div><small>Прибыль</small><b' + (netProf < 0 ? ' style="color:var(--bad)"' : '') + '>' + m(netProf) + '</b></div>') + '</div>' +
      '<div class="cacts"><button class="btn pri" data-a="cord">' + (C.editNo ? 'Сохранить в ' + eno() : 'Оформить заказ') + '</button><button class="btn" data-a="cdraft">Сохранить как просчёт</button><button class="btn" data-a="cclear">Без сохранения</button></div></div></div>' +
      (O.open ? checkout() : '');
  }
  /* оформление: окно по центру экрана, три шага: клиент, условия, документы и отправка */
  A.calcO = () => O;
  const eno = () => { const r = DB.byKey(JC().C.editNo); return r && r.no ? 'заказ № ' + r.no : 'просчёт'; }, cap = t => e(t.charAt(0).toUpperCase() + t.slice(1));
  const resetO = () => { Object.assign(O, O0(), { inst: !JC().C.region, term: termDefault() }); };
  const STEPS = ['Клиент', 'Условия', 'Документы'];
  function checkout() {
    const C = JC().C, q = O.q.trim().toLowerCase(), D = A.D, edit = !!C.editNo && !O.fresh, st = edit ? 1 : O.step, svc = !C.region && (+C.service || 0) > 0;
    const found = q.length >= 2 ? D.clients.filter(c => (c.name + ' ' + c.phone + ' ' + String(c.phone).replace(/\D/g, '')).toLowerCase().indexOf(q) >= 0).slice(0, 6) : [];
    const fld = (k, l) => '<div class="fld"><label>' + l + '</label><input class="ul" value="' + e(O[k]) + '" data-c="cof" data-k="' + k + '"></div>';
    let b = '';
    if (!edit && st === 0) {
      const yur = O.ct === 'yur', ip = O.ct === 'ip', reg = !!C.region, instOn = !reg && (svc || O.inst);
      const typ = '<div class="seg" style="align-self:flex-start">' + [['fiz', 'Физ. лицо'], ['yur', 'Юр. лицо'], ['ip', 'ИП']].map(t => '<button class="' + (O.ct === t[0] ? 'on' : '') + '" data-a="coct" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
      const innRow = (yur || ip) ? '<div class="fld"><label>ИНН</label><div class="row" style="gap:8px"><input class="ul num" inputmode="numeric" value="' + e(O.inn) + '" data-c="cof" data-k="inn"><button class="btn" data-a="cinn" style="flex:none">' + (O.innBusy ? 'Ищу…' : 'Найти по ИНН') + '</button></div>' + (O.innMsg ? '<small style="color:' + (O.innOk ? 'var(--ok)' : 'var(--bad)') + '">' + e(O.innMsg) + '</small>' : '') + '</div>' : '';
      const fields = yur ? [innRow, fld('company', 'Название'), fld('ogrn', 'ОГРН'), fld('uaddr', 'Юридический адрес'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('repr', 'ФИО представителя'), fld('email', 'E-mail'), instOn ? fld('addr', 'Адрес установки') : '', fld('bank', 'Банковские реквизиты')]
        : ip ? [innRow, fld('name', 'ФИО индивидуального предпринимателя'), fld('ogrn', 'ОГРНИП'), fld('uaddr', 'Адрес регистрации'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('email', 'E-mail'), instOn ? fld('addr', 'Адрес установки') : '', fld('bank', 'Банковские реквизиты')]
        : [fld('name', 'ФИО'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('email', 'E-mail'), fld('addr', reg ? 'Адрес получателя' : instOn ? 'Адрес установки' : 'Адрес')];
      b = '<div class="fld"><label>Найти клиента в базе</label><input class="ul" id="cofq" value="' + e(O.q) + '"></div>' +
        (found.length ? '<div class="chips" style="margin:8px 0">' + found.map(c => '<button class="btn sm" data-a="cofpick" data-id="' + c.id + '">' + e(c.name) + (c.phone ? ' · ' + e(c.phone) : '') + '</button>').join('') + '</div>' : '') +
        '<div style="margin-top:14px">' + typ + '</div><div class="fgrid cgrid" style="margin-top:12px">' + fields.join('') + '</div>' +
        (reg ? '<div class="fld" style="margin-top:12px"><label>Отправка: адрес ПВЗ и транспортная компания</label><input class="ul" value="' + e(C.pvz || '') + '" data-c="cpvz"></div>' : !svc ? '<label class="row" style="gap:8px;margin-top:12px"><input type="checkbox" data-c="cofi"' + (O.inst ? ' checked' : '') + '> С монтажом</label>' : '');
    } else if (st === 1) {
      b = (edit ? '<div class="mut sm" style="margin-bottom:10px">Состав обновится, клиент и условия останутся как были.</div>' : '<div class="fgrid"><div class="fld"><label>Предоплата</label><div class="row" style="gap:8px"><input class="ul num" value="' + e(O.pre) + '" data-c="cof" data-k="pre"><select class="ul" style="width:64px" data-c="cof" data-k="preU"><option' + (O.preU !== '₽' ? ' selected' : '') + '>%</option><option' + (O.preU === '₽' ? ' selected' : '') + '>₽</option></select></div></div>' + fld('term', 'Срок изготовления, календарных дней') + '</div>') +
        '<div class="fld" style="margin-top:14px"><label>Примечания</label><textarea class="ul ta" rows="4" data-c="cof" data-k="note">' + e(O.note) + '</textarea></div>';
    } else {
      b = '<div class="mdocs"><button class="btn" data-a="cdoc" data-fn="kpHtml">КП</button><button class="btn" data-a="cdoc" data-fn="kpVarHtml">КП три варианта</button><button class="btn" data-a="codoc" data-fn="zamernikHtml">Замерник</button><button class="btn" data-a="codoc" data-fn="dogovorHtml">Договор</button></div>' +
        '<div class="fld" style="margin-top:18px"><label>Отправить клиенту КП</label><div class="chs"><button class="btn" data-a="csend" data-ch="wa">WhatsApp</button><button class="btn" data-a="csend" data-ch="tg">Telegram</button><button class="btn" data-a="csend" data-ch="mail">Почта</button></div></div>';
    }
    return '<div class="mback" data-a="cocancel"></div><div class="modal"><div class="mhead"><h2>' + (C.editNo && !O.fresh ? cap(eno()) : 'Оформление заказа') + '</h2><span class="sp"></span><button class="ib" data-a="cocancel" title="Закрыть">' + A.icon('close', 18) + '</button></div>' +
      (edit ? '' : '<div class="mtabs">' + STEPS.map((t, i) => '<button class="' + (st === i ? 'on' : '') + '" data-a="costep" data-v="' + i + '">' + (i + 1) + '. ' + t + '</button>').join('') + '</div>') +
      '<div class="mbody">' + b + '</div>' +
      '<div class="mfoot"><button class="btn" data-a="cocancel">Отмена</button><span class="sp"></span>' + (!edit && st > 0 ? '<button class="btn" data-a="costep" data-v="' + (st - 1) + '">Назад</button>' : '') +
      (!edit && st < 2 ? '<button class="btn pri" data-a="conext">Далее</button>' : '<button class="btn pri" data-a="cosave">Сохранить заказ</button>') + '</div></div>';
  }

  A.module('calc', {
    render() { const C = JC() ? JC().C : {}, E = window.Eng, when = E && E.at ? new Date(E.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      return '<div class="head" style="display:flex;align-items:center;gap:12px"><h1>' + (C.editNo ? cap(eno()) : 'Новый заказ') + '</h1><span class="sp"></span>' + (when ? '<span class="mut sm">Цены из таблицы: ' + e(when) + '</span>' : '') + '<button class="btn sm" data-a="cprices" title="Загрузить свежие цены, наличие и ткани из Google Таблицы">Обновить цены</button></div><div class="calcwrap">' + form() + cart() + '</div>'; }
  });

  /* ===== Tab по полям формы: слева направо, сверху вниз; выпадающее поле открывается сразу ===== */
  let want = null, kbd = false;
  const keyOf = el => { if (!el || !el.dataset) return null; if (el.id) return '#' + el.id; const d = el.dataset, at = (n, v) => v ? '[data-' + n + '="' + v + '"]' : '';
    return d.c ? '[data-c="' + d.c + '"]' + at('k', d.k) : d.a ? '[data-a="' + d.a + '"]' + at('k', d.k) + at('v', d.v) + at('d', d.d) : null; };
  const rr = () => {
    const key = want || keyOf(document.activeElement), inForm = !!document.activeElement && !!document.activeElement.closest && !!document.activeElement.closest('.cform');
    want = null; A.render();
    if (key && (inForm || key !== null)) { const el = document.querySelector('.cform ' + key); if (el && el !== document.activeElement && /^(INPUT|SELECT|BUTTON|TEXTAREA)$/.test(el.tagName) && (inForm || el.closest('.cform'))) { try { el.focus({ preventScroll: true }); } catch (x) {} } }
  };
  const formList = () => Array.from(document.querySelectorAll('.cform input:not([type=hidden]), .cform select, .cform button')).filter(el => !el.closest('.colpop,.autopop') && !el.disabled && el.offsetParent !== null && !el.classList.contains('ib'));
  document.addEventListener('keydown', ev => {
    const a = document.activeElement; if (!a || !a.closest) return;
    if (ev.key === 'Escape' && (F.colOpen || F.autoOpen)) { ev.stopPropagation(); kbd = false; want = F.colOpen ? '[data-a="ccol"]' : '[data-a="cauto"]'; F.colOpen = false; F.autoOpen = false; F.cq = ''; rr(); return; }
    if (ev.key === 'Enter' && a.id === 'ccolq') { const f = document.querySelector('.colist .coli'); if (f) { ev.preventDefault(); A.act.ccolpick(f); } return; }
    if (ev.key !== 'Tab' || ev.ctrlKey || ev.altKey || !a.closest('.cform') && !a.closest('.colpop')) return;
    kbd = true;
    const inCol = !!a.closest('.colpop'), inAuto = !!a.closest('.autopop');
    const base = inCol ? document.querySelector('[data-a=ccol]') : inAuto ? document.querySelector('[data-a=cauto]') : a;
    const list = formList(), i = list.indexOf(base), nx = list[i + (ev.shiftKey ? -1 : 1)];
    if (i < 0 || !nx) { if (inCol || inAuto) { F.colOpen = false; F.autoOpen = false; } return; }
    ev.preventDefault(); F.colOpen = false; F.autoOpen = false; want = keyOf(nx);
    if (document.activeElement) { const el = nx; const wasForm = true; if (wasForm) { /* закрываем всплывающие окна и ставим фокус */ } }
    if (inCol || inAuto || document.querySelector('.colpop,.autopop')) rr(); else { nx.focus(); want = null; }
  }, true);
  document.addEventListener('mousedown', () => { kbd = false; }, true);
  document.addEventListener('focusin', ev => {
    const el = ev.target; if (!kbd || !el.closest || !el.closest('.cform')) return;
    setTimeout(() => {
      if (document.activeElement !== el && !(el.isConnected === false && keyOf(el) === keyOf(document.activeElement))) return;
      const cur = document.activeElement;
      if (cur.matches && cur.matches('select')) { try { cur.showPicker(); } catch (x) {} }
      else if (cur.matches && cur.matches('[data-a=ccol]') && !F.colOpen) { F.colOpen = true; F.cq = ''; want = '#ccolq'; rr(); }
      else if (cur.matches && cur.matches('[data-a=cauto]') && !F.autoOpen) { F.autoOpen = true; rr(); }
    }, 0);
  });
  A.fld.cmodel = v => { if (v === 'auto' || v === 'blinds' || v === 'rolo' || v === 'zebra' || v === 'vert') { const m = v === 'zebra' || v === 'vert' || v === 'rolo' ? v : ''; if (m) { if (RM() !== m) { R.sys = ''; R.fab = ''; R.sel = {}; R.flags = {}; } R.z = m === 'zebra'; R.v = m === 'vert'; } F.mode = m ? 'rolo' : v; F.colOpen = false; F.autoOpen = false; F.cq = ''; rr(); if ((m === 'zebra' && !RJ().systems(true).length) || (m === 'vert' && !RJ().systems('vert').length)) A.act.cprices(); } };
  A.fld.ctype = v => { const p = String(v).split('|'); F.mat = p[0]; F.lam = +p[1]; F.color = ''; F.colOpen = false; rr(); };
  /* при смене поставщика тип, управление, фиксация и опции сохраняются, если он их поддерживает (иначе norm подставит допустимое) */
  A.fld.csup = v => { F.sup = v; F.colOpen = false; rr(); };
  A.fld.cfix = v => { F.fix = v; rr(); };
  A.fld.rsys = v => { R.sys = v; R.sel = {}; R.flags = {}; R.tubeLock = false; rr(); };
  A.fld.rf = (v, el) => { const k = el.dataset.k; R[k] = k === 'qty' ? Math.max(1, Math.min(99, +v || 1)) : v; rr(); };
  A.act.rf = el => { R[el.dataset.k] = el.dataset.v; rr(); };
  A.fld.ropt = (v, el) => { R.sel[el.dataset.k] = v; if (el.dataset.k === 'Труба') R.tubeLock = true; rr(); };
  A.act.rphoto = () => { R.photo = !R.photo; rr(); };
  A.act.rflag = el => { R.flags[el.dataset.v] = !R.flags[el.dataset.v]; rr(); };
  A.act.rqty = el => { R.qty = Math.max(1, Math.min(99, (+R.qty || 1) + (+el.dataset.d))); rr(); };
  A.act.cqty = el => { F.qty = Math.max(1, Math.min(99, (+F.qty || 1) + (+el.dataset.d))); rr(); };
  A.act.cdraft = () => {
    const J = JC(), C = J.C; if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    const co = J.toOrder(); if (!co.items.length) { A.toast('В корзине нет изделий с ценой'); return; }
    const total = Math.max(0, co.items.reduce((a, i) => a + (+i.price || 0), 0) - (+co.disc || 0)), reg = !!C.region, pvz = (C.pvz || '').trim(), editing = !!C.editNo;
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: reg ? 0 : co.delivery, cart: J.snapshot(), region: reg, pvz: reg ? pvz : '' };
    if (!editing) Object.assign(data, { name: '', phone: '', addr: '', install: !reg, buyer: 'физ', status: 'Черновик', pre: '100', preU: '%', term: termDefault(), note: reg && pvz ? 'Отправка (ПВЗ, ТК): ' + pvz : '' });
    const rec = DB.saveOrder(data, co.items, editing ? C.editNo : null, 'Черновик (компьютер)', m(total));
    J.clear(); resetO(); Object.assign(F, { edit: -1 }); A.toast('Просчёт сохранён'); A.S.selOrder = 'ph' + rec.uid; A.save(); rr();
  };
  A.act.cf = el => { const k = el.dataset.k, v = el.dataset.v; F[k] = k === 'lam' ? +v : v; if (k === 'sup') F.colOpen = false; rr(); };
  A.fld.cf = (v, el) => { const k = el.dataset.k; F[k] = k === 'qty' ? Math.max(1, Math.min(99, +v || 1)) : v; rr(); };
  A.act.copt = el => { F.opts[el.dataset.v] = !F.opts[el.dataset.v]; rr(); };
  A.act.ccol = () => { F.colOpen = !F.colOpen; F.cq = ''; rr(); };
  A.act.ccolpick = el => { if (F.mode === 'rolo') R.fab = el.dataset.v; else F.color = el.dataset.v; F.colOpen = false; F.cq = ''; rr(); };
  document.addEventListener('input', ev => { if (ev.target.id === 'ccolq' && ev.target.value !== F.cq) A.fld.ccolq(ev.target.value); });
  A.fld.ccolq = v => { F.cq = v; rr(); const q = document.getElementById('ccolq'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.act.cprices = () => { A.toast('Обновляю цены…'); Eng.refresh().then(() => { A.toast('Цены обновлены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.fld.cscript = v => { const u = String(v).trim(); if (!u) return; try { localStorage.setItem('jal_prices_url', u); } catch (x) {} A.toast('Загружаю цены…'); Eng.refresh().then(() => { A.toast('Цены загружены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.act.creg = el => { JC().setRegion(el.dataset.v === '1'); rr(); };
  A.act.chide = () => { S.showCost = !S.showCost; A.save(); rr(); };
  A.act.cdm = el => { JC().C.discMode = el.dataset.v; JC().save(); rr(); };
  A.fld.cdisc = v => { const C = JC().C; C.disc = Math.max(0, +v || 0) || ''; JC().save(); rr(); };
  A.act.cservsug = el => { JC().C.service = +el.dataset.v || 0; JC().save(); rr(); };
  A.fld.cserv = v => { JC().C.service = Math.max(0, Math.round(+String(v).replace(/\s/g, '') || 0)); JC().save(); rr(); };
  A.fld.cprice = (v, el) => { const C = JC().C, i = +el.dataset.i, s = String(v).replace(/\s/g, ''); if (!C.cart[i]) return; C.cart[i] = Object.assign({}, C.cart[i], { own: s === '' ? '' : Math.max(0, Math.round(+s || 0)) }); JC().save(); rr(); };
  A.act.cdel = el => { const C = JC().C; C.cart.splice(+el.dataset.i, 1); JC().save(); rr(); };
  A.act.cclear = () => { JC().clear(); resetO(); rr(); };
  A.act.cocancel = () => { O.open = false; rr(); };
  const load = (it, edit) => { if (it.prod === 'rolo') { Object.assign(F, { mode: 'rolo', colOpen: false, cq: '' }); Object.assign(R, { z: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'zebra'), v: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'vert'), sys: it.sys, fab: it.fab, w: String(it.w), h: String(it.h), qty: it.qty || 1, ctrl: it.ctrl || 'L', sel: Object.assign({}, it.sel), flags: Object.assign({}, it.flags), own: it.own === '' || it.own == null ? '' : String(it.own), note: it.note || '', edit }); rr(); return; }
    F.mode = 'blinds'; Object.assign(F, { sup: it.sup, lam: it.lam, mat: it.mat, color: it.color || '', ctrl: it.ctrl || 'TR', fix: it.fix || '', opts: Object.assign({}, it.opts), w: String(it.w), h: String(it.h), qty: it.qty || 1, own: it.own === '' || it.own == null ? '' : String(it.own), note: it.note || '', edit, colOpen: false }); rr(); };
  const cuSync = () => { document.querySelectorAll('.cuadd [data-k]').forEach(el => { const k = el.dataset.k; if (k !== 'title' && document.activeElement !== el) el.value = CU[k]; }); };
  A.fld.cuf = (v, el) => {
    const k = el.dataset.k;
    if (k === 'title') { CU.title = v; return; }
    if (k === 'cost') { CU.cost = v === '' ? '' : num(v); return; }
    if (k === 'qty') CU.qty = Math.max(1, Math.min(999, num(v) || 1));
    else if (k === 'price') { CU.price = v === '' ? '' : num(v); CU.drv = 'price'; }
    else { CU.sum = v === '' ? '' : num(v); CU.drv = 'sum'; }
    if (CU.drv === 'price') CU.sum = CU.price === '' ? '' : CU.price * CU.qty; else CU.price = CU.sum === '' ? '' : Math.round(CU.sum / CU.qty);
    cuSync(); el.value = k === 'qty' ? CU.qty : (CU[k] === '' ? '' : CU[k]);
  };
  document.addEventListener('keydown', ev => { const el = ev.target; if (ev.key === 'Enter' && el.dataset && el.dataset.c === 'cuf') { A.fld.cuf(el.value, el); A.act.cuadd(); } });
  A.act.cuadd = () => {
    const q = Math.max(1, +CU.qty || 1), total = CU.drv === 'sum' ? num(CU.sum) : num(CU.price) * q;
    if (!CU.title.trim()) { A.toast('Впиши название'); return; }
    if (!(total > 0)) { A.toast('Впиши цену или стоимость'); return; }
    const cost = CU.cost === '' ? '' : num(CU.cost), base = Math.floor(total / q), rem = total - base * q;
    /* стоимость делится на целые рубли без копеек: часть штук на рубль дороже, сумма сходится точно */
    if (rem) JC().addItem({ kind: 'custom', title: CU.title.trim(), qty: rem, price: base + 1, cost });
    if (q - rem) JC().addItem({ kind: 'custom', title: CU.title.trim(), qty: q - rem, price: base, cost });
    Object.assign(CU, { title: '', price: '', sum: '', qty: 1, cost: '', drv: 'price' }); A.toast('Добавлено в корзину'); rr();
  };
  A.act.ccq = el => { const C = JC().C, i = +el.dataset.i, it = C.cart[i]; if (!it) return; const q = it.qty + (+el.dataset.d); if (q < 1) return; C.cart[i] = Object.assign({}, it, { qty: q }); JC().save(); rr(); };
  /* клик в другом месте закрывает окно автоматики и список цветов */
  document.addEventListener('click', ev => {
    const t = ev.target; if (!t.closest || (!F.autoOpen && !F.colOpen)) return;
    let ch = false;
    if (F.autoOpen && !t.closest('.autopop') && !t.closest('[data-a=cauto]')) { F.autoOpen = false; ch = true; }
    if (F.colOpen && !t.closest('.colpop') && !t.closest('[data-a=ccol]')) { F.colOpen = false; F.cq = ''; ch = true; }
    if (ch) rr();
  }, true);
  A.act.cauto = () => { F.autoOpen = !F.autoOpen; rr(); };
  A.act.cast = el => { JC().autoStep(el.dataset.sup || F.sup, el.dataset.kind, el.dataset.key, +el.dataset.d); rr(); };
  A.act.cedit = el => load(JC().C.cart[+el.dataset.i], +el.dataset.i);
  A.act.cdup = el => load(JC().C.cart[+el.dataset.i], -1);
  A.act.cedcancel = () => { F.edit = -1; R.edit = -1; rr(); };
  A.act.cadd = () => {
    if (F.mode === 'rolo') {
      const n = normRolo(); if (!n.r.ok) { A.toast(n.r.msg || 'Заполните форму'); return; }
      const own = R.own !== '' && !isNaN(+R.own) && +R.own >= 0 ? Math.round(+R.own) : '';
      const item = Object.assign(roloItem(), { qty: Math.max(1, +R.qty || 1), own, note: R.note, sel: Object.assign({}, R.sel), flags: Object.assign({}, R.flags) });
      if (R.edit >= 0) JC().replaceItem(R.edit, item); else JC().addItem(item);
      Object.assign(R, { qty: 1, own: '', note: '', edit: -1 }); A.toast('Добавлено в корзину'); rr(); return;
    }
    const n = norm(); if (!n.r.ok) { A.toast(n.r.needColor ? 'Выбери цвет' : (n.r.msg || 'Введи размеры')); return; }
    const own = F.own !== '' && !isNaN(+F.own) && +F.own >= 0 ? Math.round(+F.own) : '';
    const item = { sup: F.sup, lam: n.lam, mat: n.mat, color: n.color, ctrl: n.ctrl, fix: n.fix, opts: Object.assign({}, n.opts), w: +F.w, h: +F.h, qty: Math.max(1, +F.qty || 1), own, note: F.note };
    if (F.edit >= 0) JC().replaceItem(F.edit, item); else JC().addItem(item);
    Object.assign(F, { qty: 1, own: '', note: '', edit: -1 }); A.toast('Добавлено в корзину'); rr();
  };
  A.fld.cof = (v, el) => { O[el.dataset.k] = v; };
  document.addEventListener('input', ev => { if (ev.target.id === 'cofq') cofq(ev.target.value); });
  const cofq = v => { O.q = v; rr(); const q = document.getElementById('cofq'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.fld.cofi = v => { O.inst = !!v; };
  A.act.cofpick = el => { const c = A.D.clients.find(x => x.id === el.dataset.id); if (!c) return; Object.assign(O, { ct: 'fiz', name: c.name, phone: c.phone || '', addr: c.addr || '', q: '' }); rr(); };
  A.act.coct = el => { O.ct = el.dataset.v; O.innMsg = ''; rr(); };
  A.fld.cpvz = v => { JC().C.pvz = v; JC().save(); };
  /* реквизиты по ИНН: тот же скрипт (DaData), что и на телефоне */
  A.act.cinn = async () => {
    const q = String(O.inn || '').replace(/\D/g, ''), base = (function () { try { return localStorage.getItem('jal_prices_url') || ''; } catch (x) { return ''; } })();
    if (q.length !== 10 && q.length !== 12) { Object.assign(O, { innMsg: 'Впиши ИНН: 10 цифр (организация) или 12 (ИП)', innOk: false }); rr(); return; }
    if (!base) { Object.assign(O, { innMsg: 'Нет ссылки на скрипт цен (Настройки, раздел «Данные»)', innOk: false }); rr(); return; }
    Object.assign(O, { innBusy: true, innMsg: '', innOk: true }); rr();
    try {
      const j = await (await fetch(base + (base.indexOf('?') < 0 ? '?' : '&') + 'inn=' + encodeURIComponent(q))).json();
      if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не ответил (обнови скрипт)'));
      O.inn = j.inn || q; O.ogrn = j.ogrn || O.ogrn; O.uaddr = j.address || O.uaddr;
      if (j.type === 'ip') { O.name = j.name || O.name; O.ct = 'ip'; } else { O.company = j.name || O.company; if (j.head) O.repr = j.head; O.ct = 'yur'; }
      Object.assign(O, { innBusy: false, innOk: true, innMsg: 'Подтянуто: ' + (j.name || '') + (/LIQUID|BANKRUPT/.test(j.state || '') ? ' (внимание: организация ликвидируется или банкрот)' : '') });
    } catch (x) { Object.assign(O, { innBusy: false, innOk: false, innMsg: x.message || String(x) }); }
    rr();
  };
  A.act.costep = el => { O.step = +el.dataset.v; rr(); };
  A.act.conext = () => A.act.costep({ dataset: { v: O.step + 1 } });
  /* статус ставится сам: черновик, после отправки КП, после договора */
  const autoStatus = () => O.dog ? 'Договор' : O.sent ? 'КП отправлено' : 'Черновик';
  function persist() {
    const J = JC(), C = J.C, co = J.toOrder(), editing = !!C.editNo, fill = !editing || O.fresh;
    const total = Math.max(0, co.items.reduce((a, i) => a + (+i.price || 0), 0) - (+co.disc || 0));
    const reg = !!C.region, pvz = (C.pvz || '').trim();
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: reg ? 0 : co.delivery, cart: J.snapshot(), region: reg, pvz: reg ? pvz : '' };
    const yur = O.ct === 'yur', ip = O.ct === 'ip', cl = (yur ? O.repr.trim() || O.company.trim() : O.name.trim()) || '';
    if (fill) Object.assign(data, { name: cl, phone: O.phone.trim(), phone2: O.phone2.trim(), comment: O.comment.trim(), email: O.email.trim(), addr: O.addr.trim(), install: !reg && (O.inst || (+C.service || 0) > 0), buyer: yur ? 'юр' : ip ? 'ип' : 'физ', company: yur ? O.company.trim() : '', inn: yur || ip ? O.inn.replace(/\D/g, '') : '', uaddr: yur || ip ? O.uaddr.trim() : '', ogrn: yur || ip ? O.ogrn.trim() : '', bank: yur || ip ? O.bank.trim() : '', status: autoStatus(), pre: O.pre === '' ? '100' : O.pre, preU: O.preU, term: O.term || '12',
      note: [O.note.trim(), reg && pvz ? 'Отправка (ПВЗ, ТК): ' + pvz : ''].filter(Boolean).join('\n') });
    else { if (O.note.trim()) data.note = O.note.trim(); if (O.comment.trim()) data.comment = O.comment.trim(); }
    const rec = DB.saveOrder(data, co.items, editing ? C.editNo : null, 'Расчёт (компьютер)', m(total));
    if (!editing) { C.editNo = DB.keyOf(rec); O.fresh = true; J.save(); }
    return rec;
  }
  A.persistCart = () => persist();
  function checkReady() {
    const J = JC(), C = J.C;
    if (!C.cart.length) { A.toast('Корзина пуста'); return false; }
    if (!J.toOrder().items.length) { A.toast('В корзине нет изделий с ценой'); return false; }
    return true;
  }
  /* срок по умолчанию: 12 дней для дерева и прочего, у рулонок срок завода + 5 дней (берём самый долгий) */
  const termDefault = () => { const cart = JC().C.cart, rt = cart.filter(x => x.prod === 'rolo').reduce((mx, x) => Math.max(mx, (RJ() && RJ().termFor(x)) || 0), 0), other = cart.some(x => !x.prod && x.kind !== 'custom' || x.kind === 'drive');
    return String(rt && !other ? rt : Math.max(12, rt)); };
  A.act.cord = () => {
    const C = JC().C; if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    if (!O.open) {
      if (!C.editNo) resetO();
      O.open = true; rr(); return;
    }
    A.act.cosave();
  };
  A.act.cosave = () => {
    if (!checkReady()) return;
    const J = JC(), rec = persist();
    J.clear(); resetO(); Object.assign(F, { edit: -1 });
    A.S.selOrder = 'ph' + rec.uid; A.S.orderTab = 'items'; A.save();
    A.toast(rec.no ? 'Заказ № ' + rec.no + ' сохранён' : 'Просчёт сохранён'); A.open('orders');
  };
  /* замерник и договор строятся по сохранённому заказу: сохраняем и открываем */
  A.act.codoc = el => {
    if (!checkReady()) return;
    const fn = el.dataset.fn, rec = persist(); if (fn === 'dogovorHtml') DB.ensureNo(rec.uid);
    if (fn === 'dogovorHtml') { O.dog = true; DB.patchRec(rec.uid, { status: 'Договор' }); } else DB.patchRec(rec.uid, { zamDone: true });
    A.docOpen(fn, rec.uid);
  };
  /* отправка КП: сохраняем заказ, готовим PDF, открываем выбранный канал */
  A.act.csend = async el => {
    if (!checkReady()) return;
    const ch = el.dataset.ch, rec0 = persist(), uid = rec0.uid;
    if (ch === 'mail' && !O.email.trim()) { A.toast('Впиши e-mail клиента на первом шаге'); return; }
    A.toast('Готовлю КП…');
    try {
      const file = await A.docFile('kpHtml', uid), sum = m(JC().toOrder().items.reduce((a, i) => a + (+i.price || 0), 0) - (+JC().C.disc || 0));
      const nm = (O.name.trim().split(/\s+/)[1] || O.name.trim().split(/\s+/)[0] || 'клиент'), text = 'Добрый день, ' + nm + '! Отправляю коммерческое предложение на сумму ' + sum + '. Жалюзи-СПБ';
      O.sent = true; DB.patchRec(uid, { status: O.dog ? 'Договор' : 'КП отправлено', sent: new Date().toISOString().slice(0, 10) });
      const shared = ch !== 'mail' && window.JalExport && await JalExport.share([file], text, 'Жалюзи-СПБ, коммерческое предложение');
      if (!shared) {
        JalExport.save(file);
        const d = String(O.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'), enc = encodeURIComponent;
        const url = ch === 'wa' ? 'https://wa.me/' + d + '?text=' + enc(text) : ch === 'tg' ? 'https://t.me/' + (d ? '+' + d : '') : 'mailto:' + O.email.trim() + '?subject=' + enc('Жалюзи-СПБ, коммерческое предложение') + '&body=' + enc(text);
        window.open(url, '_blank'); A.toast('КП скачан: приложи файл к сообщению');
      }
      rr();
    } catch (x) { A.toast('Не получилось: ' + (x && x.message || x)); }
  };
})();
