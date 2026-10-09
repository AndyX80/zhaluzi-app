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

  const CU = { title: '', price: '', qty: 1, cost: '' };
  /* добавление своего товара прямо в корзине */
  const customRow = () => '<div class="cuadd"><span class="mut sm" style="white-space:nowrap">Свой товар:</span><input class="ul" style="flex:1;min-width:120px" value="' + e(CU.title) + '" placeholder="Название (карниз, сетка, монтаж…)" data-c="cuf" data-k="title">' +
    '<input class="ul num" style="width:84px;text-align:right" value="' + e(CU.price) + '" placeholder="Цена ₽" data-c="cuf" data-k="price"><input class="ul num" type="number" min="1" max="999" style="width:48px;text-align:center" value="' + CU.qty + '" title="Количество" data-c="cuf" data-k="qty">' +
    '<input class="ul num" style="width:84px;text-align:right" value="' + e(CU.cost) + '" placeholder="Закуп ₽" title="Закуп за штуку (необязательно)" data-c="cuf" data-k="cost"><button class="btn sm" data-a="cuadd">Добавить</button></div>';
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
  const MODELS = [['blinds', 'Горизонтальные деревянные'], ['', 'Горизонтальные алюминиевые (скоро)', 1], ['', 'Вертикальные (скоро)', 1], ['', 'Рулонные шторы (скоро)', 1], ['', 'Зебра (скоро)', 1], ['', 'Плиссе (скоро)', 1], ['', 'Римские шторы (скоро)', 1]];
  const noPrices = () => '<div class="empty" style="padding:28px">Цены не загружены.<br><small>Укажите ссылку на скрипт цен и нажмите «Синхронизировать» в Настройках, раздел «Данные».</small></div>';
  function form() {
    const E = window.Eng;
    if (!E || E.err && !E.ready) return '<div class="card"><div class="callout bad">' + e(E ? E.err : 'Движок расчёта не загрузился') + '</div></div>';
    if (!E.ready) return '<div class="card"><h2>Новое изделие</h2>' + noPrices() + '</div>';
    return form0();
  }
  const modelRow = () => '<div class="fld"><label>Модель</label><select class="ul" data-c="cmodel">' + MODELS.map(x => '<option value="' + x[0] + '"' + (x[2] ? ' disabled' : '') + (x[0] === 'blinds' ? ' selected' : '') + '>' + e(x[1]) + '</option>').join('') + '</select></div>';
  const autoPanelBody = () => { const h = autoPanel(); return h.replace(/^<div class="card">/, '<div>').replace(/<h2>Автоматика<\/h2>/, ''); };
  function form0() {
    const cs = CS(), n = norm(), r = n.r, s = F, showProfit = !S.hideProfit;
    const stock = n.selCol ? cs.stockOf(n.prodKey, n.selCol.key, s.sup, +s.w || 0) : null;
    const minRate = n.colList.length && n.colList[0].rate ? Math.min.apply(null, n.colList.map(c => c.rate)) : 0;
    const own = s.own !== '' && !isNaN(+s.own) && +s.own >= 0, unit = own ? Math.round(+s.own) : (r.ok ? r.unit : 0);
    const kg = r.ok ? JalLimits.weightKg(n.mat, n.lam, +s.w, +s.h) : 0;
    const q = (s.cq || '').trim().toLowerCase(), shown = n.colList.filter(c => !q || (c.name + ' ' + c.ser).toLowerCase().indexOf(q) >= 0);
    const waiting = !!r.needColor, good = r.ok && !r.warn.length, qty = Math.max(1, +s.qty || 1);
    const types = []; n.lamOk.forEach(l => matOkFor(s.sup, l).forEach(mt => types.push([mt + '|' + l, mt + ' ' + l + ' мм'])));
    let h = '<div class="card cform"><div class="ftop"><h2>' + (s.edit >= 0 ? 'Изделие, позиция ' + (s.edit + 1) : 'Новое изделие') + '</h2><span class="sp"></span>' + (s.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div><div class="fbody">';
    h += '<div class="fgrid">' + modelRow().replace('class="fld"', 'class="fld"') +
      '<div class="fld"><label>Тип</label><select class="ul" data-c="ctype">' + types.map(t => '<option value="' + t[0] + '"' + (t[0] === n.mat + '|' + n.lam ? ' selected' : '') + '>' + e(t[1]) + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Коллекция</label><select class="ul" data-c="csup">' + SUPS.map(x => '<option value="' + x + '"' + (s.sup === x ? ' selected' : '') + '>' + e(cs.COLL_ALL[x] + ' (' + ru(x) + ')') + '</option>').join('') + '</select></div>';
    if (n.colList.length) {
      h += '<div class="fld colf"><label>Цвет</label><button class="ul sel" data-a="ccol">' + (n.selCol ? (stock !== null ? '<i class="sd" style="background:' + DOT[stock] + '"></i>' : '') + '<b>' + e(n.selCol.name) + '</b><span class="mut sm">' + e([n.selCol.ser, minRate && n.selCol.rate > minRate ? '+' + fmt(n.selCol.rate - minRate) + ' ₽/м²' : ''].filter(Boolean).join(' · ')) + '</span>' : '<span class="ph">Выберите цвет</span>') + (n.selCol ? '<span class="sp"></span>' + lensHtml(n.prodKey, n.selCol.key) : '') + '</button>';
      if (s.colOpen) h += '<div class="colpop"><input class="in" data-c="ccolq" placeholder="Поиск цвета" value="' + e(s.cq) + '" id="ccolq"><div class="colist sc">' + (shown.length ? shown.map(c => { const st = cs.stockOf(n.prodKey, c.key, s.sup, +s.w || 0), ex = c.rate && c.rate > minRate;
        return '<button class="coli ' + (c.key === n.color ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(c.key) + '"><i class="sw" style="background:' + tintOf(c.name) + '"></i>' + (st !== null ? '<i class="sd" style="background:' + DOT[st] + '"></i>' : '') + '<span><b>' + e(c.name) + '</b> <span class="mut sm">' + e(c.ser) + '</span></span><span class="sp"></span>' + lensHtml(n.prodKey, c.key) + (ex ? '<span class="pill">+' + fmt(c.rate - minRate) + ' ₽/м²</span>' : '') + '</button>'; }).join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>';
      h += '</div>';
    } else h += '<div class="fld"></div>';
    h += '<div class="fld sz"><label>Размер</label><div class="szr"><span class="szi" title="Ширина"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg><input class="ul num" type="number" min="0" placeholder="мм" value="' + e(s.w) + '" data-c="cf" data-k="w"></span><span class="szi" title="Высота"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3"/></svg><input class="ul num" type="number" min="0" placeholder="мм" value="' + e(s.h) + '" data-c="cf" data-k="h"></span></div></div>';
    h += '<div class="fld"><label>Количество</label><div class="qst"><button data-a="cqty" data-d="-1">−</button><input class="num" type="number" min="1" max="99" value="' + qty + '" data-c="cf" data-k="qty"><button data-a="cqty" data-d="1">+</button></div></div></div>';
    h += '<div class="fld"><label>Управление' + (n.chain ? ' (цепочка)' : '') + '</label><div class="ctrls">' + n.ctrlKeys.map(k => '<button class="ctr ' + (n.ctrl === k ? 'on' : '') + '" data-a="cf" data-k="ctrl" data-v="' + k + '" title="' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '">' + ctrlSvg(n.lam, k, n.chain, 30) + '<span>' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '</span></button>').join('') + '</div></div>';
    h += '<div class="fgrid" style="margin-top:2px">' + (n.optNames.length ? '<div class="fld"><label>Опции</label><div class="ochips">' + (JC().hasAuto(s.sup) ? '<button class="oc ' + (JC().counts().drive + JC().counts().remote ? 'on' : '') + '" data-a="cauto">Автоматика' + (JC().counts().drive + JC().counts().remote ? ' · ' + JC().counts().drive + '+' + JC().counts().remote : '') + '</button>' : '') + n.optNames.map(o => '<button class="oc ' + (n.opts[o] ? 'on' : '') + '" data-a="copt" data-v="' + e(o) + '">' + e(o) + (r.ok && n.opts[o] && r.optP[o] ? ' +' + fmt(r.optP[o]) : '') + '</button>').join('') + '</div></div>' : '<div class="fld"><label>Опции</label><div class="ochips">' + (JC().hasAuto(s.sup) ? '<button class="oc" data-a="cauto">Автоматика</button>' : '') + '</div></div>') +
      (n.fixNames.length ? '<div class="fld"><label>Нижняя фиксация</label><select class="ul" data-c="cfix"><option value="">Без фиксации</option>' + n.fixNames.map(f => '<option value="' + e(f) + '"' + (n.fix === f ? ' selected' : '') + '>' + e((cs.FIXLBL[f] || f) + (r.ok && n.fix === f && r.optP[f] !== undefined ? ' +' + fmt(r.optP[f]) + ' ₽' : '')) + '</option>').join('') + '</select></div>' : '<div class="fld"></div>') + '</div>';
    /* проверка размеров, наличие, вес: одной строкой */
    let st = '';
    if (!waiting && +s.w > 0 && +s.h > 0) st = '<div class="fnote ' + (good ? 'ok' : 'bad') + '">' + (!r.ok ? e(r.msg ? r.msg[0].toUpperCase() + r.msg.slice(1) : 'Не поставляется') : (r.warn.length ? '<b>' + (r.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + '</b>' + e(r.warn.join('; ')) : 'Размеры в гарантии')) + '</div>';
    if (stock !== null && stock < 2) st += '<div class="fnote"><i class="sd" style="background:' + DOT[stock] + '"></i> ' + e(STOCK_TXT[stock][0].toUpperCase() + STOCK_TXT[stock].slice(1)) + '</div>';
    if (own && r.ok && showProfit && unit < r.unit - r.profit) st += '<div class="fnote bad">Ниже закупа: убыток ' + m((r.unit - r.profit - unit) * qty) + ' на позицию.</div>';
    if (s.autoOpen) h += '<div class="autopop sc">' + autoPanel() + '</div>';
    h += '<div class="fnotes">' + st + '</div><div class="fprev">' + preview(n) + '<span class="fci" title="' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[n.ctrl]) + '">' + ctrlSvg(n.lam, n.ctrl, n.chain, 54) + '<small class="mut">' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[n.ctrl]) + '</small></span></div></div>';
    /* низ: рисунок, схема управления и цена */
    h += '<div class="ffoot">' +
      '<div class="fprice"><div class="fown"><label>Своя цена за шт</label><input class="ul num" value="' + e(s.own) + '" data-c="cf" data-k="own" placeholder="' + (r.ok ? Math.round(r.unit) : '') + '"></div>' +
      '<small class="mut">' + (r.ok ? (qty > 1 ? fmt(unit) + ' ₽ × ' + qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : '') + (kg ? ' · вес ≈ ' + JalLimits.fmtKg(kg * qty) + ' кг' : '') + (own ? ' · своя цена' : '') + '</small>' +
      '<div class="big num">' + (r.ok ? m(unit * qty) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * qty) + '</small>' : '') + '</div>' +
      '<button class="btn pri fadd" data-a="cadd" style="opacity:' + (r.ok ? 1 : .45) + '">' + (s.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div></div>';
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
    const C = JC().C, FF = JC().compute(), items = C.cart, hide = S.hideProfit;
    let prof = 0; items.forEach((it, i) => { const c = FF.calcs[i]; if (c.ok) prof += c.profit * it.qty; });
    const netProf = prof - FF.discAmt, cost = FF.goodsSum - prof, pct = C.discMode !== 'rub';
    const row = (it, i) => {
      const c = FF.calcs[i], nm = it.kind ? kindName(it, c) : itemName(it, c), lineUnit = c.ok ? FF.lineSum[i] / it.qty : 0;
      const warn = c.ok && c.warn && c.warn.length ? '<div class="cwarn">' + (c.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + e(c.warn.join('; ')) + '</div>' : '';
      const q = it.kind === 'custom' ? '<button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="-1">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="1">+</button>' :
        it.kind ? '<button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="-1" data-sup="' + e(it.sup) + '">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="1" data-sup="' + e(it.sup) + '">+</button>' : '<b>' + it.qty + '</b>';
      return '<tr><td class="num mut">' + (i + 1) + '</td><td><b>' + e(nm.title) + '</b><div class="mut sm">' + e(nm.sub) + '</div>' + (it.note ? '<div class="mut sm">' + e(it.note) + '</div>' : '') + warn +
        (!hide && c.ok && !c.noCost ? '<div class="sm" style="color:' + (c.profit < 0 ? 'var(--bad)' : 'var(--mut)') + '">прибыль ' + m(c.profit) + ' за шт</div>' : '') + '</td>' +
        '<td class="cq">' + q + '</td>' +
        '<td class="r">' + (it.kind ? (c.ok ? '<span class="num">' + m(lineUnit) + '</span>' : '<span class="mut">нет цены</span>') : c.ok ? '<input class="ul num cp' + (c.ownPrice ? ' own' : '') + '" value="' + (c.ownPrice ? Math.round(c.unit) : '') + '" placeholder="' + Math.round(lineUnit) + '" data-c="cprice" data-i="' + i + '" title="' + (c.ownPrice ? 'своя цена, по прайсу было ' + fmt(c.listUnit) : 'впишите свою цену за шт') + '">' : '<span class="mut">нет цены</span>') + '</td>' +
        '<td class="r num b">' + (c.ok ? m(FF.lineSum[i]) : '—') + '</td><td class="r cact">' + (it.kind ? '' : '<button class="ib" data-a="cedit" data-i="' + i + '" title="Изменить">' + A.icon('edit', 15) + '</button><button class="ib" data-a="cdup" data-i="' + i + '" title="Копия">' + A.icon('copy', 15) + '</button>') + '<button class="ib" data-a="cdel" data-i="' + i + '" title="Убрать">' + A.icon('close', 15) + '</button></td></tr>'; };
    return '<div class="card ccart"><div class="ctop"><h2>Корзина</h2><span class="pill">' + items.length + ' поз.</span><span class="sp"></span>' +
      '<div class="seg" title="СПб: розница с доставкой и монтажом. Регионы: опт без доставки и монтажа"><button class="' + (!C.region ? 'on' : '') + '" data-a="creg" data-v="0">СПб</button><button class="' + (C.region ? 'on' : '') + '" data-a="creg" data-v="1">Регионы</button></div>' +
      '<button class="btn sm ' + (hide ? 'on' : '') + '" data-a="chide" title="Скрыть закуп и прибыль, когда клиент смотрит экран">Скрыть закуп</button></div>' +
      '<div class="clist sc">' + (items.length ? '<table class="tbl cartline"><thead><tr><th>№</th><th>Изделие</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th><th></th></tr></thead><tbody>' + items.map(row).join('') + '</tbody></table>' :
        '<div class="empty" style="padding:40px 20px">Корзина пуста.<br><small>Соберите изделие слева и нажмите «В корзину».</small></div>') + autoErrors(FF).map(t => '<div class="callout bad" style="margin:8px 0;font-size:13px">' + e(t) + '</div>').join('') + '</div>' +
      customRow() +
      '<div class="cfoot"><div class="cline">' +
      (C.region ? '<input class="ul" style="flex:1" value="' + e(C.pvz || '') + '" placeholder="Адрес ПВЗ и транспортная компания" data-c="cpvz">' :
        '<label>Доставка и установка</label><input class="ul num" style="width:84px" value="' + (C.service || '') + '" placeholder="0" data-c="cserv">') +
      '<span class="sp"></span><label>Скидка (до 50%)</label><div class="seg"><button class="' + (pct ? 'on' : '') + '" data-a="cdm" data-v="pct">%</button><button class="' + (!pct ? 'on' : '') + '" data-a="cdm" data-v="rub">₽</button></div><input class="ul num" type="number" min="0" style="width:72px" value="' + (C.disc || '') + '" data-c="cdisc" placeholder="0"></div>' +
      '<div class="sumbar" style="grid-template-columns:repeat(' + (hide ? 2 : 4) + ',1fr)"><div><small>Сумма без скидки</small><b>' + m(FF.total) + '</b></div><div><small>Итого' + (FF.discAmt ? ' (скидка −' + m(FF.discAmt) + ')' : '') + '</small><b style="color:var(--acc)">' + m(FF.netTotal) + '</b></div>' +
      (hide ? '' : '<div><small>Закуп (оценка)</small><b>' + m(Math.max(0, cost)) + '</b></div><div><small>Прибыль</small><b' + (netProf < 0 ? ' style="color:var(--bad)"' : '') + '>' + m(netProf) + '</b></div>') + '</div>' +
      '<div class="cacts"><button class="btn pri big" data-a="cord">' + (C.editNo ? 'Сохранить в заказ № ' + e(C.editNo) : 'Оформить заказ') + '</button><button class="btn" data-a="cdraft">Сохранить в черновики</button><button class="btn ghost" data-a="cclear" title="Очистить корзину, ничего не сохраняя">Без сохранения</button></div></div></div>' +
      (O.open ? checkout() : '');
  }
  /* оформление: окно по центру экрана */
  function checkout() {
    const C = JC().C, q = O.q.trim().toLowerCase(), D = A.D;
    const found = q.length >= 2 ? D.clients.filter(c => (c.name + ' ' + c.phone + ' ' + String(c.phone).replace(/\D/g, '')).toLowerCase().indexOf(q) >= 0).slice(0, 6) : [];
    const fld = (k, l, ph) => '<div class="fld"><label>' + l + '</label><input class="ul" value="' + e(O[k]) + '" placeholder="' + (ph || '') + '" data-c="cof" data-k="' + k + '"></div>';
    return '<div class="mback" data-a="cocancel"></div><div class="modal"><div class="mhead"><h2>' + (C.editNo ? 'Заказ № ' + e(C.editNo) : 'Оформление заказа') + '</h2><span class="sp"></span><button class="ib" data-a="cocancel" title="Закрыть">' + A.icon('close', 18) + '</button></div><div class="mbody">' +
      (C.editNo ? '<div class="mut sm" style="margin-bottom:10px">Состав обновится, клиент и статус останутся как были.</div>' :
        '<div class="fld"><label>Найти клиента в базе (имя или телефон)</label><input class="ul" id="cofq" value="' + e(O.q) + '" placeholder="Начните вводить…"></div>' +
        (found.length ? '<div class="chips" style="margin:8px 0">' + found.map(c => '<button class="btn sm" data-a="cofpick" data-id="' + c.id + '">' + e(c.name) + (c.phone ? ' · ' + e(c.phone) : '') + '</button>').join('') + '</div>' : '') +
        '<div class="fgrid" style="margin-top:10px">' + fld('name', 'Имя / компания', 'Иванов Иван') + fld('phone', 'Телефон', '+7 …') + '</div><div style="margin-top:10px">' + fld('addr', 'Адрес', 'Улица, дом, кв.') + '</div>' +
        '<div class="fgrid" style="margin-top:10px"><div class="fld"><label>Статус</label><select class="ul" data-c="cof" data-k="status">' + ['Черновик', 'КП отправлено', 'Договор'].map(x => '<option' + (O.status === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
        (C.region ? '<div></div>' : '<label class="row" style="gap:8px;align-self:end;padding-bottom:6px"><input type="checkbox" data-c="cofi"' + (O.inst ? ' checked' : '') + '> С монтажом</label>') + '</div>') +
      '<div class="fld" style="margin-top:10px"><label>Комментарий к заказу</label><input class="ul" value="' + e(O.note) + '" data-c="cof" data-k="note"></div>' +
      '<div class="mdocs"><span class="mut sm">Документы (можно без сохранения заказа):</span><button class="btn sm" data-a="cdoc" data-fn="kpHtml">КП</button><button class="btn sm" data-a="cdoc" data-fn="kpVarHtml">КП: три варианта</button><button class="btn sm" data-a="cdoc" data-fn="zamernikHtml">Замерник</button><button class="btn sm" data-a="cdoc" data-fn="dogovorHtml">Договор</button></div></div>' +
      '<div class="mfoot"><button class="btn" data-a="cocancel">Отмена</button><span class="sp"></span><button class="btn pri" data-a="cord">Сохранить заказ</button></div></div>';
  }

  A.module('calc', {
    render() { const C = JC() ? JC().C : {}; return '<div class="head"><h1>' + (C.editNo ? 'Заказ № ' + e(C.editNo) : 'Новый заказ') + '</h1></div><div class="calcwrap">' + form() + cart() + '</div>'; }
  });

  const rr = () => A.render();
  A.fld.cmodel = v => { if (v === 'auto' || v === 'blinds') { F.mode = v; rr(); } };
  A.fld.ctype = v => { const p = String(v).split('|'); F.mat = p[0]; F.lam = +p[1]; F.color = ''; F.colOpen = false; rr(); };
  A.fld.csup = v => { F.sup = v; Object.assign(F, { lam: 50, mat: 'Дерево', color: '', ctrl: 'TR', fix: '', opts: {}, colOpen: false }); rr(); };
  A.fld.cfix = v => { F.fix = v; rr(); };
  A.act.cqty = el => { F.qty = Math.max(1, Math.min(99, (+F.qty || 1) + (+el.dataset.d))); rr(); };
  A.act.cdraft = () => {
    const J = JC(), C = J.C; if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    const co = J.toOrder(); if (!co.items.length) { A.toast('В корзине нет изделий с ценой'); return; }
    const total = Math.max(0, co.items.reduce((a, i) => a + (+i.price || 0), 0) - (+co.disc || 0)), reg = !!C.region, pvz = (C.pvz || '').trim(), editing = !!C.editNo;
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: reg ? 0 : co.delivery, cart: J.snapshot(), region: reg, pvz: reg ? pvz : '' };
    if (!editing) Object.assign(data, { name: 'Без имени', phone: '', addr: '', install: !reg, buyer: 'физ', status: 'Черновик', pre: '100', preU: '%', term: '12', note: reg && pvz ? 'Отправка (ПВЗ, ТК): ' + pvz : '' });
    const rec = DB.saveOrder(data, co.items, editing ? C.editNo : null, 'Черновик (компьютер)', m(total));
    J.clear(); O.open = false; Object.assign(F, { edit: -1 }); A.toast('Черновик сохранён: заказ № ' + rec.no); A.S.selOrder = 'ph' + rec.uid; A.save(); rr();
  };
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
  A.fld.cuf = (v, el) => { const k = el.dataset.k; CU[k] = k === 'qty' ? Math.max(1, Math.min(999, Math.round(+v) || 1)) : v; };
  document.addEventListener('keydown', ev => { const el = ev.target; if (ev.key === 'Enter' && el.dataset && el.dataset.c === 'cuf') { A.fld.cuf(el.value, el); A.act.cuadd(); } });
  A.act.cuadd = () => {
    const p = Math.round(+String(CU.price).replace(/\s/g, '') || 0);
    if (!CU.title.trim()) { A.toast('Впиши название'); return; }
    if (!(p > 0)) { A.toast('Впиши цену'); return; }
    JC().addItem({ kind: 'custom', title: CU.title.trim(), qty: Math.max(1, +CU.qty || 1), price: p, cost: CU.cost === '' ? '' : Math.max(0, Math.round(+String(CU.cost).replace(/\s/g, '') || 0)) });
    Object.assign(CU, { title: '', price: '', qty: 1, cost: '' }); A.toast('Добавлено в корзину'); rr();
  };
  A.act.ccq = el => { const C = JC().C, i = +el.dataset.i, it = C.cart[i]; if (!it) return; const q = it.qty + (+el.dataset.d); if (q < 1) return; C.cart[i] = Object.assign({}, it, { qty: q }); JC().save(); rr(); };
  A.act.cauto = () => { F.autoOpen = !F.autoOpen; rr(); };
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
