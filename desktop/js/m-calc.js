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
  const O = { open: false, q: '', name: '', phone: '', addr: '', status: 'Черновик', inst: true, note: '' };
  const F = { sup: 'Amigo', lam: 50, mat: 'Дерево', color: '', colOpen: false, cq: '', w: '', h: '', qty: 1, ctrl: 'TR', fix: '', opts: {}, own: '', note: '', edit: -1 };
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
    return '<div class="card"><div class="row"><h2>Автоматика</h2><span class="sp"></span><span class="mut" style="font-size:13px">приводов ' + cnt.drive + ', пультов ' + cnt.remote + ' в корзине</span></div>' +
      '<div class="field" style="margin:8px 0"><label>Коллекция (у каждого поставщика свой набор)</label><div class="chips">' + SUPS.map(x => '<button class="opt ' + (F.sup === x ? 'on' : '') + '" data-a="cf" data-k="sup" data-v="' + x + '">' + cs.COLL_ALL[x] + ' (' + ru(x) + ')</button>').join('') + '</div></div>' +
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

  const CU = { title: '', price: '', qty: 1, cost: '' };
  function customPanel() {
    const p = Math.max(0, +CU.price || 0), q = Math.max(1, +CU.qty || 1), c = CU.cost === '' ? null : Math.max(0, +CU.cost || 0);
    return '<div class="card"><h2>Своя позиция</h2><div class="mut" style="font-size:13px;margin:4px 0 10px">Любой товар или услуга: название, цена, количество. Доставка и скидка на неё не накручиваются.</div>' +
      '<div class="field"><label>Название</label><input class="in" value="' + e(CU.title) + '" placeholder="Например: карниз, москитная сетка, монтаж" data-c="cuf" data-k="title"></div>' +
      '<div class="row wrap" style="margin-top:10px"><div class="field" style="width:150px"><label>Цена за шт, ₽</label><input class="in num" style="text-align:right" value="' + e(CU.price) + '" data-c="cuf" data-k="price"></div>' +
      '<div class="field" style="width:100px"><label>Кол-во</label><input class="in" type="number" min="1" max="999" value="' + CU.qty + '" data-c="cuf" data-k="qty"></div>' +
      '<div class="field" style="width:170px"><label>Закуп за шт (необязательно)</label><input class="in num" style="text-align:right" value="' + e(CU.cost) + '" data-c="cuf" data-k="cost"></div></div>' +
      '<div class="row" style="margin-top:14px"><div><small class="mut">' + (p ? fmt(p) + ' ₽ × ' + q + ' шт' : '') + (c != null && p ? ' · прибыль ' + fmt((p - c) * q) + ' ₽' : '') + '</small><div style="font-size:24px;font-weight:700" class="num">' + m(p * q) + '</div></div><span class="sp"></span>' +
      '<button class="btn pri" data-a="cuadd" style="height:42px;padding:0 22px;opacity:' + (p > 0 && CU.title.trim() ? 1 : .45) + '">В корзину</button></div></div>';
  }
  function form() {
    const E = window.Eng; if (!E || !E.ready) return form0();
    return '<div class="seg" style="margin-bottom:10px"><button class="' + (F.mode !== 'auto' ? 'on' : '') + '" data-a="cmode" data-v="blinds">Жалюзи</button><button class="' + (F.mode === 'auto' ? 'on' : '') + '" data-a="cmode" data-v="auto">Автоматика</button><button class="' + (F.mode === 'custom' ? 'on' : '') + '" data-a="cmode" data-v="custom">Своя позиция</button></div>' + (F.mode === 'auto' ? autoPanel() : F.mode === 'custom' ? customPanel() : form0());
  }
  function form0() {
    const E = window.Eng; if (!E || !E.ready) return '<div class="card"><h2>Текущее изделие</h2>' + pricesBar() + '<div class="empty">Загрузи цены, и расчёт заработает.</div></div>';
    const cs = CS(), n = norm(), r = n.r, s = F, showProfit = !S.hideProfit;
    const stock = n.selCol ? cs.stockOf(n.prodKey, n.selCol.key, s.sup, +s.w || 0) : null;
    const minRate = n.colList.length && n.colList[0].rate ? Math.min.apply(null, n.colList.map(c => c.rate)) : 0;
    const own = s.own !== '' && !isNaN(+s.own) && +s.own >= 0, unit = own ? Math.round(+s.own) : (r.ok ? r.unit : 0);
    const kg = r.ok ? JalLimits.weightKg(n.mat, n.lam, +s.w, +s.h) : 0;
    const q = (s.cq || '').trim().toLowerCase();
    const shown = n.colList.filter(c => !q || (c.name + ' ' + c.ser).toLowerCase().indexOf(q) >= 0);
    const waiting = !!r.needColor, good = r.ok && !r.warn.length;
    let h = '<div class="card"><div class="row"><h2>' + (s.edit >= 0 ? 'Изделие, позиция ' + (s.edit + 1) : 'Текущее изделие') + '</h2><span class="sp"></span>' + (s.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div>' + pricesBar() + '<div class="stack" style="gap:12px">';
    h += '<div class="field"><label>Коллекция</label><div class="chips">' + SUPS.map(x => '<button class="opt ' + (s.sup === x ? 'on' : '') + '" data-a="cf" data-k="sup" data-v="' + x + '">' + cs.COLL_ALL[x] + ' (' + ru(x) + ')</button>').join('') + '</div></div>';
    h += '<div class="row wrap"><div class="field"><label>Ламель</label>' + seg(n.lamOk.map(l => [l, l + ' мм']), n.lam, 'cf', 'lam') + '</div><div class="field"><label>Материал</label>' + seg(n.matOk.map(x => [x, x]), n.mat, 'cf', 'mat') + '</div></div>';
    if (n.colList.length) {
      h += '<div class="field"><label>Цвет</label><button class="in" style="text-align:left;display:flex;align-items:center;gap:8px;cursor:pointer" data-a="ccol">' +
        (n.selCol ? (stock !== null ? '<span style="width:10px;height:10px;border-radius:5px;background:' + DOT[stock] + '"></span>' : '') + '<b>' + e(n.selCol.name) + '</b><span class="mut" style="font-size:12px">' + e([n.selCol.ser, minRate && n.selCol.rate > minRate ? '+' + fmt(n.selCol.rate - minRate) + ' ₽/м²' : ''].filter(Boolean).join(' · ')) + '</span>' : '<span style="color:var(--bad,#b35f00)">Выбери цвет</span>') + '<span class="sp"></span>▾</button>';
      if (s.colOpen) {
        h += '<div class="card flat" style="margin-top:6px;padding:8px"><input class="in" data-c="ccolq" placeholder="Поиск цвета" value="' + e(s.cq) + '" id="ccolq" style="margin-bottom:6px"><div style="max-height:280px;overflow:auto" class="stack">' +
          (shown.length ? shown.map(c => { const st = cs.stockOf(n.prodKey, c.key, s.sup, +s.w || 0), ex = c.rate && c.rate > minRate;
            return '<button class="opt ' + (c.key === n.color ? 'on' : '') + '" style="height:auto;min-height:36px;text-align:left;display:flex;align-items:center;gap:8px;padding:4px 10px" data-a="ccolpick" data-v="' + e(c.key) + '">' + (st !== null ? '<span style="width:10px;height:10px;border-radius:5px;flex-shrink:0;background:' + DOT[st] + '"></span>' : '<span style="width:10px"></span>') + '<span><b>' + e(c.name) + '</b> <span class="mut" style="font-size:12px">' + e(c.ser) + '</span></span><span class="sp"></span>' + (ex ? '<span class="pill">+' + fmt(c.rate - minRate) + ' ₽/м²</span>' : (c.cat !== undefined ? '<span class="pill">кат.' + c.cat + '</span>' : '')) + '</button>'; }).join('') : '<div class="mut">Ничего не найдено</div>') + '</div></div>';
      }
      h += '</div>';
    }
    h += '<div class="g2"><div class="field"><label>Ширина, мм</label><input class="in" type="number" min="0" value="' + e(s.w) + '" data-c="cf" data-k="w"></div><div class="field"><label>Высота, мм</label><input class="in" type="number" min="0" value="' + e(s.h) + '" data-c="cf" data-k="h"></div></div>';
    h += '<div class="field"><label>Управление' + (n.chain ? ' (цепочка)' : '') + '</label><div class="chips">' + n.ctrlKeys.map(k => '<button class="opt ' + (n.ctrl === k ? 'on' : '') + '" data-a="cf" data-k="ctrl" data-v="' + k + '">' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '</button>').join('') + '</div></div>';
    if (n.optNames.length) h += '<div class="field"><label>Опции</label><div class="chips">' + n.optNames.map(o => '<button class="opt ' + (n.opts[o] ? 'on' : '') + '" data-a="copt" data-v="' + e(o) + '">' + e(o) + (r.ok && n.opts[o] && r.optP[o] ? ' +' + fmt(r.optP[o]) : '') + '</button>').join('') + '</div></div>';
    if (n.fixNames.length) h += '<div class="field"><label>Нижняя фиксация</label><div class="chips"><button class="opt ' + (!n.fix ? 'on' : '') + '" data-a="cf" data-k="fix" data-v="">Без фиксации</button>' + n.fixNames.map(f => '<button class="opt ' + (n.fix === f ? 'on' : '') + '" data-a="cf" data-k="fix" data-v="' + e(f) + '">' + e(cs.FIXLBL[f] || f) + (r.ok && n.fix === f && r.optP[f] !== undefined ? ' +' + fmt(r.optP[f]) : '') + '</button>').join('') + '</div></div>';
    h += '<div class="row"><div class="field" style="width:100px"><label>Кол-во</label><input class="in" type="number" min="1" max="99" value="' + s.qty + '" data-c="cf" data-k="qty"></div><div class="field" style="flex:1"><label>Комментарий к изделию</label><input class="in" value="' + e(s.note) + '" data-c="cf" data-k="note" placeholder="Например: левое окно кухни"></div></div>';
    /* проверка размеров, наличие, вес */
    if (!waiting && +s.w > 0 && +s.h > 0) h += '<div class="callout ' + (good ? '' : 'bad') + '" style="font-size:14px">' + (!r.ok ? e(r.msg ? r.msg[0].toUpperCase() + r.msg.slice(1) : 'Не поставляется') : (r.warn.length ? '<b>' + (r.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + '</b>' + e(r.warn.join('; ')) : 'Размеры в гарантии')) + '</div>';
    else if (waiting) h += '<div class="mut">Выбери цвет, и я посчитаю.</div>';
    if (stock !== null && stock < 2) h += '<div class="callout" style="font-size:14px"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:' + DOT[stock] + ';margin-right:6px"></span>' + e(STOCK_TXT[stock][0].toUpperCase() + STOCK_TXT[stock].slice(1)) + '</div>';
    h += '<div class="row wrap"><div class="field" style="width:200px"><label>Своя цена за шт (необязательно)</label><input class="in num" style="text-align:right" value="' + e(s.own) + '" data-c="cf" data-k="own" placeholder="' + (r.ok ? Math.round(r.unit) : '') + '"></div>' +
      '<div class="mut" style="flex:1;font-size:12px">Можно любую, даже ниже закупа. Доставка и установка в такую цену не добавляются.</div></div>';
    if (own && r.ok && showProfit && unit < r.unit - r.profit) h += '<div class="callout bad" style="font-size:13px">Ниже закупа: убыток ' + m((r.unit - r.profit - unit) * (+s.qty || 1)) + ' на позицию.</div>';
    h += '<div class="row"><div><small class="mut">' + (r.ok ? (s.qty > 1 ? fmt(unit) + ' ₽ × ' + s.qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : '') + (kg ? ' · вес ≈ ' + JalLimits.fmtKg(kg * s.qty) + ' кг' : '') + (own ? ' · своя цена' : '') + '</small>' +
      '<div style="font-size:24px;font-weight:700" class="num">' + (r.ok ? m(unit * (+s.qty || 1)) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * (+s.qty || 1)) + '</small>' : '') + '</div><span class="sp"></span>' +
      '<button class="btn pri" data-a="cadd" style="height:42px;padding:0 22px;opacity:' + (r.ok ? 1 : .45) + '">' + (s.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div>';
    return h + '</div></div>';
  }

  function itemName(it, c) {
    const extra = Object.keys(it.opts || {}).filter(k => it.opts[k]); if (it.fix) extra.push(CS().FIXLBL[it.fix] || it.fix);
    const col = c.col ? c.col.name : '';
    const chain = !!(it.opts && it.opts['Цепочка']);
    return { title: CS().COLL_ALL[it.sup] + ' (' + ru(it.sup) + ')', sub: it.mat + ' ' + it.lam + (col ? ' · ' + col : '') + ' · ' + (chain ? CHAIN_TXT : CTRL_TXT)[it.ctrl || 'L'] + (extra.length ? ' · ' + extra.join(', ').toLowerCase() : '') };
  }

  function cart() {
    const E = window.Eng; if (!E || !E.ready) return '<div class="card"><h2>Корзина</h2><div class="empty">Нет цен.</div></div>';
    const C = JC().C, FF = JC().compute(), items = C.cart, hide = S.hideProfit;
    let prof = 0; items.forEach((it, i) => { const c = FF.calcs[i]; if (c.ok) prof += c.profit * it.qty; });
    const netProf = prof - FF.discAmt, cost = FF.goodsSum - prof;
    const pct = C.discMode !== 'rub';
    return '<div class="card"><div class="row wrap" style="margin-bottom:10px"><h2>Корзина</h2><span class="pill">' + items.length + ' поз.</span><span class="sp"></span>' +
      '<div class="seg" title="СПб: розница с доставкой и монтажом. Регионы: опт без доставки и монтажа"><button class="' + (!C.region ? 'on' : '') + '" data-a="creg" data-v="0">СПб</button><button class="' + (C.region ? 'on' : '') + '" data-a="creg" data-v="1">Регионы</button></div>' +
      '<button class="btn sm ' + (hide ? 'on' : '') + '" data-a="chide" title="Скрыть закуп и прибыль, когда клиент смотрит экран">Скрыть закуп</button></div>' +
      (items.length ? '<table class="tbl cartline"><thead><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th><th></th></tr></thead><tbody>' + items.map((it, i) => {
        const c = FF.calcs[i], nm = it.kind ? kindName(it, c) : itemName(it, c), lineUnit = c.ok ? FF.lineSum[i] / it.qty : 0;
        const warn = c.ok && c.warn && c.warn.length ? '<div style="color:var(--bad,#b3261e);font-size:12px">' + (c.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + e(c.warn.join('; ')) + '</div>' : '';
        return '<tr><td>' + (i + 1) + '</td><td><b>' + e(nm.title) + '</b><div class="mut" style="font-size:12px">' + e(nm.sub) + '</div>' + (it.note ? '<div class="mut" style="font-size:12px">' + e(it.note) + '</div>' : '') + warn +
          (!hide && c.ok && !c.noCost ? '<div style="font-size:12px;color:' + (c.profit < 0 ? 'var(--bad,#b3261e)' : 'var(--mut)') + '">прибыль ' + m(c.profit) + ' за шт</div>' : '') + '</td><td class="num">' + (it.kind ? '—' : it.w + '×' + it.h) + '</td><td class="r">' + (it.kind === 'custom' ? '<button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="-1">−</button> ' + it.qty + ' <button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="1">+</button>' : it.kind ? '<button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="-1" data-sup="' + e(it.sup) + '">−</button> ' + it.qty + ' <button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="1" data-sup="' + e(it.sup) + '">+</button>' : it.qty) + '</td>' +
          '<td class="r">' + (it.kind ? (c.ok ? m(lineUnit) : '<span class="mut">нет цены</span>') : c.ok ? '<input class="in num" style="width:96px;text-align:right' + (c.ownPrice ? ';border-color:var(--acc)' : '') + '" value="' + (c.ownPrice ? Math.round(c.unit) : '') + '" placeholder="' + Math.round(lineUnit) + '" data-c="cprice" data-i="' + i + '" title="' + (c.ownPrice ? 'своя цена, по прайсу было ' + fmt(c.listUnit) : 'впиши свою цену за шт') + '">' : '<span class="mut">нет цены</span>') + '</td>' +
          '<td class="r num b">' + (c.ok ? m(FF.lineSum[i]) : '—') + '</td><td class="r" style="white-space:nowrap">' + (it.kind ? '' : '<button class="btn sm" data-a="cedit" data-i="' + i + '">Изм.</button> <button class="btn sm" data-a="cdup" data-i="' + i + '">Копия</button> ') + '<button class="btn sm" data-a="cdel" data-i="' + i + '">✕</button></td></tr>'; }).join('') + '</tbody></table>' :
        '<div class="empty" style="padding:30px">Корзина пуста. Соберите изделие слева и нажмите «В корзину».</div>') +
      autoErrors(FF).map(t => '<div class="callout bad" style="margin-top:8px;font-size:13px">' + e(t) + '</div>').join('') +
      '<div class="stack" style="gap:10px;margin-top:14px">' +
      (C.region ? '<div class="field"><label>Адрес ПВЗ и транспортная компания</label><textarea class="in" rows="2" data-c="cpvz" placeholder="Например: СДЭК, Казань, ул. Баумана 1, ПВЗ KZN12">' + e(C.pvz || '') + '</textarea></div><div class="mut" style="font-size:12px">В опте доставка и монтаж в стоимость заказа не входят.</div>' :
        '<div class="row"><label style="flex:1">Доставка и установка (размазывается по позициям)</label><input class="in num" style="width:130px;text-align:right" value="' + (C.service || '') + '" placeholder="0" data-c="cserv"></div>') +
      '<div class="row"><label style="flex:1">Скидка на заказ (не больше 50%)</label><div class="seg"><button class="' + (pct ? 'on' : '') + '" data-a="cdm" data-v="pct">%</button><button class="' + (!pct ? 'on' : '') + '" data-a="cdm" data-v="rub">₽</button></div><input class="in num" type="number" min="0" style="width:110px;text-align:right" value="' + (C.disc || '') + '" data-c="cdisc" placeholder="0"></div></div>' +
      '<div class="sumbar" style="grid-template-columns:repeat(' + (hide ? 2 : 4) + ',1fr)"><div><small>Сумма без скидки</small><b>' + m(FF.total) + '</b></div><div><small>Итого' + (FF.discAmt ? ' (скидка −' + m(FF.discAmt) + ')' : '') + '</small><b style="color:var(--acc)">' + m(FF.netTotal) + '</b></div>' +
      (hide ? '' : '<div><small>Закуп (оценка)</small><b>' + m(Math.max(0, cost)) + '</b></div><div><small>Прибыль</small><b' + (netProf < 0 ? ' style="color:var(--bad,#d33)"' : '') + '>' + m(netProf) + '</b></div>') + '</div>' +
      (O.open ? checkout() : '') +
      '<div class="row wrap" style="margin-top:14px"><button class="btn" data-a="cdoc" data-fn="kpHtml">КП</button><button class="btn" data-a="cdoc" data-fn="kpVarHtml">КП: три варианта</button><button class="btn" data-a="cdoc" data-fn="zamernikHtml">Замерник</button><button class="btn" data-a="cdoc" data-fn="dogovorHtml">Договор</button><span class="sp"></span>' +
      '<button class="btn" data-a="cclear">Очистить</button><button class="btn pri" data-a="cord">' + (O.open ? 'Сохранить заказ' : C.editNo ? 'Сохранить в заказ № ' + e(C.editNo) : 'Оформить заказ') + '</button></div></div>';
  }
  function checkout() {
    const C = JC().C, q = O.q.trim().toLowerCase(), D = A.D;
    const found = q.length >= 2 ? D.clients.filter(c => (c.name + ' ' + c.phone + ' ' + String(c.phone).replace(/\D/g, '')).toLowerCase().indexOf(q) >= 0).slice(0, 6) : [];
    const fld = (k, l, ph) => '<div class="field"><label>' + l + '</label><input class="in" value="' + e(O[k]) + '" placeholder="' + (ph || '') + '" data-c="cof" data-k="' + k + '"></div>';
    return '<div class="card flat" style="margin-top:14px"><h2>' + (C.editNo ? 'Заказ № ' + e(C.editNo) : 'Новый заказ') + '</h2>' +
      (C.editNo ? '<div class="mut" style="font-size:12px;margin-bottom:8px">Состав обновится, клиент и статус останутся как были.</div>' :
        '<div class="field" style="margin:8px 0"><label>Найти клиента в базе (имя или телефон)</label><input class="in" id="cofq" value="' + e(O.q) + '" placeholder="Начни вводить…"></div>' +
        (found.length ? '<div class="chips" style="margin-bottom:8px">' + found.map(c => '<button class="btn sm" data-a="cofpick" data-id="' + c.id + '">' + e(c.name) + (c.phone ? ' · ' + e(c.phone) : '') + '</button>').join('') + '</div>' : '') +
        '<div class="g2">' + fld('name', 'Имя / компания', 'Иванов Иван') + fld('phone', 'Телефон', '+7 …') + '</div>' + fld('addr', 'Адрес', 'Улица, дом, кв.') +
        '<div class="row wrap" style="margin-top:8px"><div class="field"><label>Статус</label><select class="in" data-c="cof" data-k="status">' + ['Черновик', 'КП отправлено', 'Договор'].map(x => '<option' + (O.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
        (C.region ? '' : '<label class="row" style="gap:6px;margin-top:18px"><input type="checkbox" data-c="cofi"' + (O.inst ? ' checked' : '') + '> С монтажом</label>') + '</div>') +
      '<div class="field" style="margin-top:8px"><label>Комментарий к заказу</label><textarea class="in" rows="2" data-c="cof" data-k="note">' + e(O.note) + '</textarea></div><div class="row" style="margin-top:8px"><button class="btn sm" data-a="cocancel">Отмена</button></div></div>';
  }

  A.module('calc', {
    render() { return '<div class="head"><h1>Продажи и расчёт</h1></div><div class="calc"><div>' + form() + '</div><div>' + cart() + '</div></div>'; }
  });

  const rr = () => A.render();
  A.act.cf = el => { const k = el.dataset.k, v = el.dataset.v; F[k] = k === 'lam' ? +v : v; if (k === 'sup') { Object.assign(F, { lam: 50, mat: 'Дерево', color: '', ctrl: 'TR', fix: '', opts: {} }); } rr(); };
  A.fld.cf = (v, el) => { const k = el.dataset.k; F[k] = k === 'qty' ? Math.max(1, Math.min(99, +v || 1)) : v; rr(); };
  A.act.copt = el => { F.opts[el.dataset.v] = !F.opts[el.dataset.v]; rr(); };
  A.act.ccol = () => { F.colOpen = !F.colOpen; F.cq = ''; rr(); };
  A.act.ccolpick = el => { F.color = el.dataset.v; F.colOpen = false; F.cq = ''; rr(); };
  A.fld.ccolq = v => { F.cq = v; rr(); const q = document.getElementById('ccolq'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.act.cprices = () => { A.toast('Обновляю цены…'); Eng.refresh().then(() => { A.toast('Цены обновлены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.fld.cscript = v => { const u = String(v).trim(); if (!u) return; try { localStorage.setItem('jal_prices_url', u); } catch (x) {} A.toast('Загружаю цены…'); Eng.refresh().then(() => { A.toast('Цены загружены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.act.creg = el => { JC().setRegion(el.dataset.v === '1'); rr(); };
  A.act.chide = () => { S.hideProfit = !S.hideProfit; A.save(); rr(); };
  A.act.cdm = el => { JC().C.discMode = el.dataset.v; JC().save(); rr(); };
  A.fld.cdisc = v => { const C = JC().C; C.disc = Math.max(0, +v || 0) || ''; JC().save(); rr(); };
  A.fld.cserv = v => { JC().C.service = Math.max(0, Math.round(+String(v).replace(/\s/g, '') || 0)); JC().save(); rr(); };
  A.fld.cpvz = v => { JC().C.pvz = v; JC().save(); };
  A.fld.cprice = (v, el) => { const C = JC().C, i = +el.dataset.i, s = String(v).replace(/\s/g, ''); if (!C.cart[i]) return; C.cart[i] = Object.assign({}, C.cart[i], { own: s === '' ? '' : Math.max(0, Math.round(+s || 0)) }); JC().save(); rr(); };
  A.act.cdel = el => { const C = JC().C; C.cart.splice(+el.dataset.i, 1); JC().save(); rr(); };
  A.act.cclear = () => { JC().clear(); O.open = false; rr(); };
  A.act.cocancel = () => { O.open = false; rr(); };
  const load = (it, edit) => { Object.assign(F, { sup: it.sup, lam: it.lam, mat: it.mat, color: it.color || '', ctrl: it.ctrl || 'TR', fix: it.fix || '', opts: Object.assign({}, it.opts), w: String(it.w), h: String(it.h), qty: it.qty || 1, own: it.own === '' || it.own == null ? '' : String(it.own), note: it.note || '', edit, colOpen: false }); rr(); };
  A.fld.cuf = (v, el) => { const k = el.dataset.k; CU[k] = k === 'qty' ? Math.max(1, Math.min(999, Math.round(+v) || 1)) : v; rr(); };
  A.act.cuadd = () => {
    const p = Math.round(+String(CU.price).replace(/\s/g, '') || 0);
    if (!CU.title.trim()) { A.toast('Впиши название'); return; }
    if (!(p > 0)) { A.toast('Впиши цену'); return; }
    JC().addItem({ kind: 'custom', title: CU.title.trim(), qty: Math.max(1, +CU.qty || 1), price: p, cost: CU.cost === '' ? '' : Math.max(0, Math.round(+String(CU.cost).replace(/\s/g, '') || 0)) });
    Object.assign(CU, { title: '', price: '', qty: 1, cost: '' }); A.toast('Добавлено в корзину'); rr();
  };
  A.act.ccq = el => { const C = JC().C, i = +el.dataset.i, it = C.cart[i]; if (!it) return; const q = it.qty + (+el.dataset.d); if (q < 1) return; C.cart[i] = Object.assign({}, it, { qty: q }); JC().save(); rr(); };
  A.act.cmode = el => { F.mode = el.dataset.v; rr(); };
  A.act.cast = el => { JC().autoStep(el.dataset.sup || F.sup, el.dataset.kind, el.dataset.key, +el.dataset.d); rr(); };
  A.act.cedit = el => load(JC().C.cart[+el.dataset.i], +el.dataset.i);
  A.act.cdup = el => load(JC().C.cart[+el.dataset.i], -1);
  A.act.cedcancel = () => { F.edit = -1; rr(); };
  A.act.cadd = () => {
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
  A.act.cofpick = el => { const c = A.D.clients.find(x => x.id === el.dataset.id); if (!c) return; Object.assign(O, { name: c.name, phone: c.phone || '', addr: c.addr || '', q: '' }); rr(); };
  A.act.cord = () => {
    const J = JC(), C = J.C;
    if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    const co = J.toOrder();
    if (!co.items.length) { A.toast('В корзине нет изделий с ценой'); return; }
    const editing = !!C.editNo;
    if (!O.open) {
      if (!editing) Object.assign(O, { q: '', name: '', phone: '', addr: '', status: 'Черновик', inst: !C.region, note: '' });
      O.open = true; rr(); return;
    }
    if (!editing && !O.name.trim() && !O.phone.trim()) { A.toast('Укажи имя или телефон клиента'); return; }
    const total = Math.max(0, co.items.reduce((a, i) => a + (+i.price || 0), 0) - (+co.disc || 0));
    const reg = !!C.region, pvz = (C.pvz || '').trim();
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: C.region ? 0 : co.delivery, cart: J.snapshot(), region: reg, pvz: reg ? pvz : '' };
    if (!editing) Object.assign(data, { name: O.name.trim(), phone: O.phone.trim(), addr: O.addr.trim(), install: !reg && O.inst, buyer: 'физ', status: O.status, pre: '100', preU: '%', term: '12',
      note: [O.note.trim(), reg && pvz ? 'Отправка (ПВЗ, ТК): ' + pvz : ''].filter(Boolean).join('\n') });
    else if (O.note.trim()) data.note = O.note.trim();
    const rec = DB.saveOrder(data, co.items, editing ? C.editNo : null, 'Расчёт (компьютер)', m(total));
    J.clear(); O.open = false; Object.assign(F, { edit: -1 });
    A.S.selOrder = 'ph' + rec.uid; A.S.orderTab = 'items'; A.save();
    A.toast('Заказ № ' + rec.no + ' сохранён'); A.open('orders');
  };
})();
