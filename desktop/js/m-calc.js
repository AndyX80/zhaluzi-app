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
  const O0 = () => ({ open: false, step: 0, fresh: false, sent: false, dog: false, q: '', ct: 'fiz', name: '', phone: '', phone2: '', comment: '', email: '', addr: '', company: '', inn: '', ogrn: '', uaddr: '', repr: '', bank: '', innMsg: '', innOk: true, innBusy: false, inst: true, note: '', pre: '100', preU: '%', term: '12', instPay: '', selfMeas: null });
  const O = { open: false, step: 0, fresh: false, sent: false, dog: false, q: '', ct: 'fiz', name: '', phone: '', phone2: '', comment: '', email: '', addr: '', company: '', inn: '', ogrn: '', uaddr: '', repr: '', bank: '', innMsg: '', innOk: true, innBusy: false, inst: true, note: '', pre: '100', preU: '%', term: '12', instPay: '', selfMeas: null };
  const F = { mode: '', sup: 'Amigo', lam: 50, mat: 'Дерево', color: '', colOpen: false, cq: '', w: '', h: '', qty: 1, ctrl: '', fix: '', opts: {}, auto: { drive: '', remote: '' }, own: '', note: '', edit: -1 };
  const R = { z: false, rf: false, mr: '', rm: '', rw: '', fab2: '', sys: 'UNI-2', fab: '', fq: '', w: '', h: '', qty: 1, ctrl: '', vf: null, sel: {}, flags: {}, auto: { drive: '', remote: '', wire: '' }, own: '', note: '', edit: -1 };
  const VF0 = () => ({ side: '', len: '', chain: 'Пластиковая', ceil: 'Обычный', ctype: 'К управлению', wall: '7,5 см' });
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
    const chain = !!(opts['Цепочка'] || opts['Цепочка металлическая'] || opts['Цепочка металлическая цветная']), splitOnly = s.sup === 'РДО' && lam === 50;
    const ctrl = chain ? (s.ctrl === 'R' || s.ctrl === 'TL' ? 'R' : (s.ctrl === 'L' || s.ctrl === 'TR' ? 'L' : '')) : (splitOnly ? (s.ctrl === 'TL' || s.ctrl === 'TR' ? s.ctrl : '') : (cs.CTRL_NAMES[s.ctrl] ? s.ctrl : ''));
    const chainCol9 = ['Античная бронза', 'Белая', 'Латунь', 'Матовое золото', 'Медь', 'Розовое золото', 'Серый никель', 'Сталь (нержавеющая)', 'Черный никель'], chainMet = !!opts['Цепочка металлическая'], chainCols = chain ? (opts['Цепочка металлическая цветная'] ? chainCol9 : chainMet ? ['Серебро'] : lam === 25 ? ['Белая', 'Антрацит', 'Бежевая', 'Коричневая', 'Серая', 'Черная', 'Прозрачная белая', 'Прозрачная коричневая'] : ['Белая', 'Антрацит', 'Прозрачная белая', 'Прозрачная коричневая']) : [], chainCol = chain ? (chainCols.indexOf(s.chainCol) >= 0 ? s.chainCol : chainCols[0]) : '';
    const ctrlKeys = chain ? ['L', 'R'] : (splitOnly ? ['TL', 'TR'] : cs.CTRL_ORDER[lam]);
    const fixNames = cs.availFixes(s.sup, lam), fix = fixNames.indexOf(s.fix) >= 0 ? s.fix : '';
    const cur = { sup: s.sup, lam, mat, color, ctrl, fix, w: s.w, h: s.h, opts };
    const al = k => (JC().autoList(s.sup, k) || []).filter(f => !f.hid && (k === 'drive' ? f.t === 'Горизонтальные' : f.pk) && (!f.lam || f.lam === lam)), au = s.auto || {}, auto = { drive: al('drive').some(f => f.key === au.drive) ? au.drive : '', remote: al('remote').some(f => f.key === au.remote) ? au.remote : '' }; auto.wire = auto.drive && (au.wire === 'L' || au.wire === 'R') ? au.wire : '';
    const r = JC().withAuto({ sup: s.sup, auto }, cs.calcItem(cur, colList));
    return { auto, autoDrive: al('drive'), autoRemote: al('remote'), lamOk, lam, matOk, mat, prodKey, colList, color, optNames, opts, chain, chainCols, chainCol, ctrl, ctrlKeys, fixNames, fix, cur, r, selCol: colList.find(c => c.key === color) };
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
  function autoPanel(noClose) {
    const J = JC(), cs = CS();
    const rows = kind => (J.autoList(F.sup, kind) || []).filter(f => !f.hid && (kind === 'drive' ? f.t === 'Горизонтальные' : f.pk)).map(f => { const q = J.autoQty(F.sup, kind, f.key);
      return '<div class="row" style="padding:8px 10px;border-radius:10px;border:1.5px solid ' + (q ? 'var(--acc)' : 'var(--line,#ddd)') + ';background:' + (q ? 'var(--acc-s)' : 'transparent') + '"><div style="flex:1;min-width:0"><b>' + e(f.name) + '</b>' + (f.sub ? '<div class="mut" style="font-size:12px">' + e(f.sub) + '</div>' : '') + '</div>' +
        '<div class="num b" style="white-space:nowrap">' + m(f.price) + '</div><div class="row" style="gap:4px"><button class="btn sm" data-a="cast" data-kind="' + kind + '" data-key="' + e(f.key) + '" data-d="-1">−</button><b class="num" style="min-width:22px;text-align:center">' + q + '</b><button class="btn sm" data-a="cast" data-kind="' + kind + '" data-key="' + e(f.key) + '" data-d="1">+</button></div></div>'; }).join('');
    const cnt = J.counts();
    return '<div class="autop"><div class="row" style="margin-bottom:6px"><b>Автоматика: ' + e(cs.COLL_ALL[F.sup]) + ' (' + e(ru(F.sup)) + ')</b><span class="sp"></span><span class="mut sm">в корзине: приводов ' + cnt.drive + ', пультов ' + cnt.remote + '</span>' + (noClose ? '' : '<button class="ib" data-a="cauto" title="Закрыть">' + A.icon('close', 16) + '</button>') + '</div>' +
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
  const wireSeg = (it, i) => { const w = JC().wireInfo(it); return w ? '<div class="sm" style="display:flex;gap:6px;align-items:center"><span class="mut">провод привода:</span><span class="seg">' + [['L', 'слева'], ['R', 'справа']].map(k => '<button class="' + (w.set === k[0] ? 'on' : '') + '" data-a="cwirec" data-i="' + i + '" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</span>' + (w.set ? '' : '<span style="color:var(--bad)">выбери сторону</span>') + '</div>' : ''; };
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
  const MODELS = [['rolo', 'РШ'], ['zebra', 'Зебра'], ['gja', 'ГЖ'], ['blinds', 'Дерево'], ['vert', 'ВЖ'], ['plisse', 'Плиссе'], ['roman', 'Римки'], ['mirage', 'Мираж'], ['auto', 'Автоматика']];
  const noPrices = () => '<div class="empty" style="padding:28px">Цены не загружены.<br><small>Укажите ссылку на скрипт цен и нажмите «Синхронизировать» в Настройках, раздел «Данные».</small></div>';
  function form() {
    const E = window.Eng;
    if (!E || E.err && !E.ready) return '<div class="card"><div class="callout bad">' + e(E ? E.err : 'Движок расчёта не загрузился') + '</div></div>';
    if (!E.ready) return '<div class="card"><h2>Новое изделие</h2>' + noPrices() + '</div>';
    return F.mode === 'rolo' ? (R.mr === 'plisse' ? formPl() : formRolo()) : F.mode === 'blinds' ? form0() : F.mode === 'auto' ? formAuto() : formEmpty();
  }
  const formEmpty = () => '<div class="card cform"><h2>Новое изделие</h2><div class="fgrid">' + modelRow() + '</div></div>';
  const modelRow = () => '<div class="fld"><label>Модель</label><select class="ul" data-c="cmodel">' + (F.mode ? '' : '<option value="" selected disabled>Выберите модель</option>') + MODELS.map(x => '<option value="' + x[0] + '"' + (x[2] ? ' disabled' : '') + (F.mode && x[0] === (F.mode === 'rolo' ? RMM() : F.mode) ? ' selected' : '') + '>' + e(x[1]) + '</option>').join('') + '</select></div>';
  /* категория «Автоматика»: Моторизация (по типам изделий и видам) → Радиопередатчики → Источники питания → Разное */
  const ASEC = ['Моторизация', 'Радиопередатчики', 'Источники питания', 'Разное'], GSUB = ['ГЖ алюминий 16/25', 'ГЖ 50', 'Дерево', 'Венус'], ATYPES = ['Рулонные шторы', 'ГЖ', 'Вертикальные', 'Плиссе', 'Мираж', 'Римские'];
  const ATLBL = { 'ГЖ': 'Горизонтальные жалюзи', 'ГЖ алюминий 16/25': 'ГЖ алюминий 16/25 мм', 'ГЖ 50': 'ГЖ 50 мм', 'Дерево': 'Дерево и бамбук (все поставщики)', 'Венус': 'Венус (кассетные ГЖ)', 'Рулонные шторы': 'Рулонные шторы и зебра' }, AGRP = ['Проводные', 'Радио', 'Радио + АКБ'];
  /* тип изделия из листа → тип в списке: Roof в рулонных, Венус и дерево в ГЖ; у зебры те же комплекты, что у рулонных */
  const ATMAP = { 'Roof': 'Рулонные шторы', 'Венус (кассетные ГЖ)': 'Венус' }, atOf = f => ATMAP[f.t] || f.t;
  /* ГЖ: алюминий 16/25 и 50 — комплекты Амиго по ламели; дерево — свои приводы у каждого поставщика (Амиго — те же комплекты по ламели) */
  const atHas = (f, t) => f.t !== 'Горизонтальные' ? atOf(f) === t : t === 'Дерево' || (f.sup === 'Amigo' && (t === 'ГЖ 50' ? f.lam === 50 : t === 'ГЖ алюминий 16/25' && f.lam !== 50));
  /* рулонные и зебра: MINI, UNI, МГ/МГС, Бентин, Roof; внутри системы по возрастанию трубы */
  const sysKey = n => { const r = /MINI/.test(n) ? 0 : /UNI/.test(n) ? 1 : /MGS?\b/.test(n) ? 2 : /Bent/.test(n) ? 3 : 4, x = /(?:MGS?|Bent(?:hin)?)\s*(\d+)/.exec(n); return r * 1000 + (x ? +x[1] : 0); };
  const txGrp = n => /^Пульт/.test(n) ? 'Пульты' : /выключатель/i.test(n) ? 'Радиовыключатели' : /приемник|приёмник/i.test(n) ? 'Радиоприёмники' : /Датчик/.test(n) ? 'Датчики' : 'Прочее';
  function formAuto() {
    const J = JC(), cs = CS(), all = J.autoAll(), hasAm = !!(window.Eng && Eng.sheets && Eng.sheets['Автоматика_Амиго']);
    const sec = ASEC.indexOf(F.asec) >= 0 ? F.asec : 'Моторизация', inSec = all.filter(f => f.sec === sec);
    const has = t => all.some(f => f.sec === 'Моторизация' && atHas(f, t)), types = ATYPES.filter(t => t === 'ГЖ' ? GSUB.some(has) : has(t)), top = types.indexOf(F.at) >= 0 ? F.at : types[0] || '';
    const subs = top === 'ГЖ' ? GSUB.filter(has) : [], sub = subs.indexOf(F.ag) >= 0 ? F.ag : subs[0] || '', typ = top === 'ГЖ' ? sub : top;
    const list = inSec.filter(f => sec !== 'Моторизация' || atHas(f, typ)), sups = SUPS.filter(x => list.some(f => f.sup === x)), sup = sups.indexOf(F.asup) >= 0 ? F.asup : sups[0] || '';
    const mine = list.filter(f => f.sup === sup), grpOf = f => sec === 'Моторизация' ? f.grp || 'Радио' : sec === 'Радиопередатчики' ? txGrp(f.name) : '';
    const names = []; mine.forEach(f => { const g = grpOf(f); if (names.indexOf(g) < 0) names.push(g); });
    if (sec === 'Моторизация') names.sort((a, b) => AGRP.indexOf(a) - AGRP.indexOf(b));
    if (sec === 'Моторизация' && typ === 'Рулонные шторы') mine.sort((a, b) => sysKey(a.name) - sysKey(b.name));
    const row = f => { const q = J.autoQty(f.sup, f.kind, f.key), at = ' data-kind="' + f.kind + '" data-key="' + e(f.key) + '" data-sup="' + e(f.sup) + '"';
      return '<div class="row" style="padding:8px 10px;border-radius:10px;border:1.5px solid ' + (q ? 'var(--acc)' : 'var(--line,#ddd)') + ';background:' + (q ? 'var(--acc-s)' : 'transparent') + '"><div style="flex:1;min-width:0"><b>' + e(f.name) + '</b>' + (f.sub ? '<div class="mut" style="font-size:12px">' + e(f.sub) + '</div>' : '') + '</div>' +
        '<div class="num b" style="white-space:nowrap">' + m(f.price) + '</div><div class="row" style="gap:4px"><button class="btn sm" data-a="cast"' + at + ' data-d="-1">−</button><b class="num" style="min-width:22px;text-align:center">' + q + '</b><button class="btn sm" data-a="cast"' + at + ' data-d="1">+</button></div></div>'; };
    const opt = (v, cur, lbl) => '<option value="' + e(v) + '"' + (v === cur ? ' selected' : '') + '>' + e(lbl || v) + '</option>';
    const cnt = J.counts();
    return '<div class="card cform"><div class="ftop"><h2>Автоматика отдельно</h2></div><div class="fbody"><div class="mut sm" style="margin-bottom:8px">Нужно, чтобы дозаказать привод или пульт отдельно. Если автоматика нужна к жалюзи, выбери её прямо в форме изделия: она войдёт в цену жалюзи.</div>' +
      '<div class="fgrid fcol">' + modelRow() + '<div class="fld"><label>Вид системы</label><select class="ul" data-c="atype">' + types.map(x => opt(x, top, ATLBL[x] || x)).join('') + '</select></div>' +
      (subs.length ? '<div class="fld"><label>Подвид ГЖ</label><select class="ul" data-c="asub">' + subs.map(x => opt(x, sub, ATLBL[x])).join('') + '</select></div>' : '') +
      '<div class="fld"><label>Раздел автоматики</label><select class="ul" data-c="asec">' + ASEC.map(x => opt(x, sec, x === 'Моторизация' ? 'Приводы (моторизация)' : x)).join('') + '</select></div>' +
      (sups.length > 1 ? '<div class="fld"><label>Поставщик</label><select class="ul" data-c="asup">' + sups.map(x => opt(x, sup, cs.COLL_ALL[x] + ' (' + ru(x) + ')')).join('') + '</select></div>' : '') + '</div>' +
      '<div class="row" style="margin:12px 0 4px"><b>' + e((sec === 'Моторизация' ? 'Приводы' : sec) + (typ && sec === 'Моторизация' ? ' · ' + (ATLBL[typ] || typ) : '') + (sup ? ' · ' + cs.COLL_ALL[sup] + ' (' + ru(sup) + ')' : '')) + '</b><span class="sp"></span><span class="mut sm">в корзине: приводов ' + cnt.drive + ', пультов и прочего ' + cnt.remote + '</span></div>' +
      (mine.length ? names.map(g => (g ? '<h3 style="margin:12px 0 6px">' + e(g) + '</h3>' : '') + '<div class="stack" style="gap:6px">' + mine.filter(f => grpOf(f) === g).map(row).join('') + '</div>').join('') : '<div class="empty" style="padding:24px">В этом разделе нет позиций.</div>') +
      (sec === 'Моторизация' ? '<div class="mut" style="font-size:12px;margin-top:12px">К приводу нужен пульт или выключатель: добавь их из разделов «Радиопередатчики» и «Разное». Привод и пульт берутся у одного поставщика.</div>' : '') + '</div></div>';
  }
  A.fld.asec = v => { F.asec = v; rr(); }; A.fld.atype = v => { F.at = v; rr(); }; A.fld.asub = v => { F.ag = v; rr(); }; A.fld.asup = v => { F.asup = v; rr(); };
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
    const ORD = ['Тесьма', 'Цепочка', 'Цепочка металлическая', 'Окраска'], optSorted = n.optNames.slice().sort((x, y) => (ORD.indexOf(x) < 0 ? 9 : ORD.indexOf(x)) - (ORD.indexOf(y) < 0 ? 9 : ORD.indexOf(y)));
    const cnt = JC().counts(), nAuto = cnt.drive + cnt.remote;
    /* одна колонка: модель, коллекция, тип, цвет, размер — Tab идёт строго по порядку */
    h += '<div class="fgrid fcol">' + modelRow() + '<div class="fld"><label>Коллекция</label><select class="ul" data-c="csup">' + SUPS.map(x => '<option value="' + x + '"' + (s.sup === x ? ' selected' : '') + '>' + e(cs.COLL_ALL[x] + ' (' + ru(x) + ')') + '</option>').join('') + '</select></div>' +
      '<div class="fld"><label>Тип</label><select class="ul" data-c="ctype">' + types.map(t => '<option value="' + t[0] + '"' + (t[0] === n.mat + '|' + n.lam ? ' selected' : '') + '>' + e(t[1]) + '</option>').join('') + '</select></div>' + colorFld + '</div>';
    h += '<div class="fld sz"><label>Размер, мм</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<input class="ul num" type="number" min="0" value="' + e(s.w) + '" data-c="cf" data-k="w"></span><span class="szi" title="Высота">' + ICH + '<input class="ul num" type="number" min="0" value="' + e(s.h) + '" data-c="cf" data-k="h"></span></div></div>';
    if (n.auto.drive) h += MOTNOTE; else h += '<div class="fld"><label>Управление' + (n.chain ? ' (цепочка)' : '') + '</label><div class="ctrls">' + n.ctrlKeys.map(k => '<button class="ctr ' + (n.ctrl === k ? 'on' : '') + '" data-a="cf" data-k="ctrl" data-v="' + k + '" title="' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '">' + ctrlSvg(n.lam, k, n.chain, 52) + '<span>' + e((n.chain ? CHAIN_TXT : CTRL_TXT)[k]) + '</span></button>').join('') + '</div></div>';
    if (optSorted.length) h += '<div class="fld"><label>Опции</label><div class="ochips">' + optSorted.map(o => '<button class="oc ' + (n.opts[o] ? 'on' : '') + '" data-a="copt" data-v="' + e(o) + '">' + e(o) + (r.ok && n.opts[o] && r.optP[o] ? ' +' + fmt(r.optP[o]) : '') + '</button>').join('') + '</div></div>';
    if (n.chainCols.length > 1 || (n.chain && n.chainCols.length)) h += '<div class="fld"><label>Цвет цепочки</label><div class="ochips">' + n.chainCols.map(c => '<button class="oc ' + (n.chainCol === c ? 'on' : '') + '" data-a="cchc" data-v="' + e(c) + '">' + e(c) + '</button>').join('') + '</div></div>';
    if (n.fixNames.length) h += '<div class="fld fixf"><label>Нижняя фиксация</label><select class="ul" data-c="cfix"><option value="">Без фиксации</option>' + n.fixNames.map(f => '<option value="' + e(f) + '"' + (n.fix === f ? ' selected' : '') + '>' + e((cs.FIXLBL[f] || f) + (r.ok && n.fix === f && r.optP[f] !== undefined ? ' +' + fmt(r.optP[f]) + ' ₽' : '')) + '</option>').join('') + '</select></div>';
    if (JC().hasAuto(s.sup) && (n.autoDrive.length || n.autoRemote.length)) {
      const opt = (list, cur) => '<option value="">Нет</option>' + list.map(f => '<option value="' + e(f.key) + '"' + (cur === f.key ? ' selected' : '') + '>' + e(f.name + ' +' + fmt(f.price) + ' ₽') + '</option>').join('');
      h += '<div class="fgrid">' + (n.autoDrive.length ? '<div class="fld"><label>Электропривод</label><select class="ul" data-c="cau" data-k="drive">' + opt(n.autoDrive, n.auto.drive) + '</select></div>' : '') +
        (n.autoRemote.length ? '<div class="fld"><label>Пульт / выключатель</label><select class="ul" data-c="cau" data-k="remote">' + opt(n.autoRemote, n.auto.remote) + '</select></div>' : '') + '</div>';
      { const wf = n.auto.drive && JC().wireInfo({ sup: s.sup, auto: { drive: n.auto.drive } }); if (wf) h += '<div class="fld"><label>Провод привода выходит</label><div class="seg">' + [['L', 'слева'], ['R', 'справа']].map(k => '<button class="' + (n.auto.wire === k[0] ? 'on' : '') + '" data-a="cwire" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</div></div>'; }
    }
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
      '<div class="big num">' + (r.ok ? m(unit * qty) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * qty) + (r.cost != null ? ' · закуп ' + m(r.cost * qty) : '') + '</small>' : '') + '</div>' +
      '<button class="btn pri fadd" data-a="cadd" style="opacity:' + (r.ok ? 1 : .45) + '">' + (s.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div></div>';
    return h;
  }

  /* ===== рулонные шторы Амиго: система, ткань, размер, управление, опции по группам ===== */
  const RJ = () => window.JalRolo;
  const VG = () => R.v || R.g;
  const RMOT = () => !!(R.auto && R.auto.drive), MOTNOTE = '<div class="fld"><label>Управление</label><div class="fnote ok" style="margin:0">Электропривод: сторону управления указывать не нужно, только выход провода</div></div>';
  const RMM = () => R.rf ? 'rolo' : RM();
  const RM = () => R.mr ? R.mr : R.rf ? 'roof' : R.g ? 'gja' : R.v ? 'vert' : R.z ? 'zebra' : 'rolo';
  const roloItem = () => ({ prod: 'rolo', sup: 'Amigo', mat: R.g ? 'ГЖ алюминий' : R.v ? 'Вертикальные' : R.z ? 'Зебра' : R.mr === 'roman' ? 'Римские шторы' : R.mr === 'mirage' ? 'Мираж' : R.mr === 'plisse' ? 'Плиссе' : R.rf ? 'Рулонные шторы Roof' : 'Рулонные шторы', lam: 0, sys: R.sys, fab: R.fab, rw: R.rf ? R.rw || undefined : undefined, fab2: (R.rf && R.sys === 'ROOF-DN') || (R.mr === 'plisse' && plNeed2()) ? R.fab2 || undefined : undefined, w: +R.w || 0, h: +R.h || 0, ctrl: R.rf || R.sys === 'UNI-2П' || RMOT() ? '' : VG() ? (R.vf && R.vf.side === 'R' ? 'R' : R.vf && R.vf.side === 'L' ? 'L' : '') : R.ctrl, vf: VG() || R.mr === 'plisse' ? Object.assign(VF0(), R.vf, RMOT() ? { side: '', ck: '', len: '' } : {}) : undefined, sel: R.sel, flags: R.v ? Object.assign({}, R.flags, { 'Металлическая фурнитура': !!R.vf && R.vf.chain === 'Металл', 'Прозрачная комплектация': !!R.vf && R.vf.chain === 'Прозрачная' }) : R.flags, tubeLock: !!R.tubeLock, auto: (R.auto && (R.auto.drive || R.auto.remote)) ? { drive: R.auto.drive || '', remote: R.auto.remote || '', wire: R.auto.wire || '' } : undefined });
  /* автоматика Амиго под текущую систему: привод и пульт входят в цену изделия (правило: есть привод под этот тип, значит автоматика в расчёте) */
  const rAuto = () => {
    const J = JC(), sv = RJ().sysOf(R.sys) || {}, none = { drive: [], remote: [] }; if (!J.hasAuto('Amigo')) return none;
    let t = '', lam = 0;
    if (R.g) { if (/^V/.test(sv.vt || '')) t = 'Венус (кассетные ГЖ)'; else { t = 'Горизонтальные'; lam = +sv.vt === 50 ? 50 : 25; } } else if (R.v) t = 'Вертикальные';
    let nm = null;
    if (R.mr === 'plisse') { /* привод только у электро-моделей; комплект по серии модели */
      const pm = plM(); if (!pm || !pm.el) return none; const c = pm.code, pats = [];
      if (/^P[13]9\d\d$/.test(c)) pats.push('P19xx\\/P39xx'); if (/^P[13]9[12]\d$/.test(c)) pats.push('Px91x\\/Px92x'); if (/^P89/.test(c)) pats.push('P89xx|\\/89xx');
      const re = new RegExp('для (' + pats.join('|') + ')'); if (!pats.length) return none;
      const L = k => (J.autoList('Amigo', k) || []).filter(f => !f.hid);
      return { drive: L('drive').filter(f => f.t === 'Плиссе' && re.test(f.name)), remote: L('remote').filter(f => f.pk) };
    }
    if (R.mr) { t = R.mr === 'roman' ? 'Римские' : 'Мираж'; nm = false; }
    else if (R.rf) { if (sv.code !== 'ROOF') return none; t = 'Roof'; }
    else if (!R.g && !R.v) { /* рулонные и зебра: комплект по системе, у Бентина по трубе (43 → Benthin 43 и 44) */
      t = 'Рулонные шторы'; const c = String(sv.code || '').replace(/^Z-/, ''), tube = (String(R.sel && R.sel['Труба'] || '').match(/\d+/) || [''])[0];
      if (/^MINI/.test(c)) nm = /руло MINI/; else if (/^(UNI|ROLLA)/.test(c)) nm = /руло UNI/; else if (/^(BNT|K-)/.test(c) && tube) nm = new RegExp('Benthin (' + tube + (tube === '43' ? '|44' : '') + ')\\b'); else return none;
    }
    const L = k => (J.autoList('Amigo', k) || []).filter(f => !f.hid);
    return { drive: L('drive').filter(f => f.t === t && (!lam || !f.lam || f.lam === lam) && (!nm || nm.test(f.name)) && (!R.mr || !/MAXI/i.test(f.name))), remote: L('remote').filter(f => f.pk) };
  };
  const NW = () => R.rf || R.mr, sysAll = J => (R.g || R.v || R.z || R.mr) ? J.systems(RM()) : J.systems('rolo').concat(J.systems('roof'));
  function normRolo() {
    const J = RJ(); if (!R.g && !R.v && !R.z && !R.mr) R.rf = /^ROOF/.test(R.sys); const sy = sysAll(J); if (!sy.some(x => x.code === R.sys)) R.sys = sy.length ? sy[0].code : '';
    { const fb = R.fab && J.fabOf(R.fab), sv = J.sysOf(R.sys); if (R.fab && (!fb || (fb.m || (fb.z ? 'zebra' : 'rolo')) !== (R.rf ? 'rolo' : RM()) || (VG() && sv && fb.vt !== sv.vt) || (R.rf && fb.roof === 'нет'))) R.fab = ''; }
    if (R.rf) { /* Roof: размер штор берётся из выбранной модели окна */
      const mans = J.roofMans(); if (mans.indexOf(R.rm) < 0) R.rm = mans[0] || '';
      const wn = J.winOf(R.rw); if (R.rw && (!wn || wn.man !== R.rm)) R.rw = '';
      const f2 = R.fab2 && J.fabOf(R.fab2); if (R.fab2 && (!f2 || f2.m || f2.z || f2.roof === 'нет')) R.fab2 = '';
      const w2 = J.winOf(R.rw); R.w = w2 ? String(w2.w) : ''; R.h = w2 ? String(w2.h) : '';
    }
    if (R.g) { const vf = R.vf = Object.assign(VF0(), R.vf || {}), ck = RMOT() ? '' : vf.ck || (vf.side && R.flags && R.flags['Разведенное управление'] ? (vf.side === 'R' ? 'TR' : 'TL') : vf.side || ''); vf.ck = ck; vf.side = ck === 'L' || ck === 'TL' ? 'L' : ck ? 'R' : ''; const sv = J.sysOf(R.sys), razv = ck === 'TL' || ck === 'TR'; R.flags = Object.assign({}, R.flags, { 'Разведенное управление': razv, 'Совмещенное управление': !!ck && !razv && !!sv && sv.vt === '50' }); }
    const o = J.opts(roloItem()); R.sel = o.sel; R.flags = o.flags;
    { const al = rAuto(), a = R.auto = Object.assign({ drive: '', remote: '', wire: '' }, R.auto); if (a.drive && !al.drive.some(f => f.key === a.drive)) a.drive = ''; if (a.remote && !al.remote.some(f => f.key === a.remote)) a.remote = ''; if (!a.drive || !JC().wireInfo({ sup: 'Amigo', auto: { drive: a.drive } })) a.wire = ''; }
    const r = JC().withAuto(roloItem(), J.calc(roloItem())); if (r.tubeSel) R.sel['Труба'] = r.tubeSel;
    return { it: roloItem(), r, groups: J.groups(R.sys) };
  }
  const roloName = (it, c) => { const d = RJ() ? RJ().describe(it, c) : { title: 'Рулонная штора', sub: '' }; return { title: d.title + ' (Амиго)', sub: it.w + '×' + it.h + ' мм · ' + d.sub + (c.ok && c.termDays ? ' · срок ' + c.termDays + ' дн' : '') }; };
  function formRolo() {
    const J = RJ(), showProfit = !!S.showCost;
    if (!J || !J.ready()) return '<div class="card cform"><div class="ftop"><h2>Рулонные шторы</h2></div><div class="fbody"><div class="empty" style="padding:28px">Цены на рулонки не загружены.<br><small>Добавьте в Google Таблицу «Цены для приложения» листы из файла «Рулонки_цены.xlsx» (Файл → Импорт → Вставить новые листы) и нажмите «Обновить цены».</small></div>' + pricesBar() + '</div></div>';
    const n = normRolo(), r = n.r, it = n.it, qty = Math.max(1, +R.qty || 1);
    const own = R.own !== '' && !isNaN(+R.own) && +R.own >= 0, unit = own ? Math.round(+R.own) : (r.ok ? r.unit : 0);
    let f = J.fabOf(R.fab); if (f && f.gone) { R.fab = ''; f = null; } const q = (F.cq || '').trim().toLowerCase();
    const sObj = J.sysOf(R.sys), isCorn = !!(sObj && sObj.vt === 'карниз');
    const shown = J.fabrics(RM()).filter(x => (!VG() || !sObj || x.vt === sObj.vt) && (!q || (x.name + ' ' + x.ser + ' ' + x.cat).toLowerCase().indexOf(q) >= 0));
    const sy = sysAll(J), grpNames = sy.map(x => x.group).filter((g, i, a) => a.indexOf(g) === i);
    const ICW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>';
    const ICH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3"/></svg>';
    /* прибавка в рознице за вариант опции: считаем тем же расчётом с подставленным значением */
    const delta = (g, val) => { if (!r.ok) return ''; const t = roloItem(); t.sel = Object.assign({}, R.sel); t.flags = Object.assign({}, R.flags);
      if (g.type === 'flag') t.flags[g.name] = !R.flags[g.name]; else t.sel[g.name] = val;
      const r2 = J.calc(t); if (!r2.ok) return ''; const d = r2.unit - r.unit; return d ? (d > 0 ? ' +' : ' −') + fmt(Math.abs(d)) + ' ₽' : ''; };
    /* редуктор и большой механизм подходят только к своей трубе: пометка у вариантов, которые не подходят к выбранной */
    const tubeHint = (g, x) => { if (!/^(Редуктор BNT|Большой механизм)$/.test(g.name) || !x.usd) return ''; const tb = +String(R.sel['Труба'] || '').replace(/\D.*$/, '') || 0, need = String(x.value).match(/\d+/g) || []; return tb && need.length && need.indexOf(String(tb)) < 0 ? ' (нужна труба ' + need[0] + ')' : ''; };
    let h = '<div class="card cform"><div class="ftop"><h2>' + (R.edit >= 0 ? (R.g ? 'Алюминиевые жалюзи' : R.v ? 'Вертикальные жалюзи' : R.z ? 'Штора зебра' : R.mr === 'roman' ? 'Римская штора' : R.mr === 'mirage' ? 'Штора Мираж' : 'Рулонная штора') + ', позиция ' + (R.edit + 1) : R.g ? 'Новые алюминиевые жалюзи' : R.v ? 'Новые вертикальные жалюзи' : R.z ? 'Новая штора зебра' : R.mr === 'roman' ? 'Новая римская штора' : R.mr === 'mirage' ? 'Новая штора Мираж' : 'Новая рулонная штора') + '</h2><span class="sp"></span>' + (R.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div><div class="fbody rbody">';
    let fabFld = '<div class="fld colf"><label>' + (R.g ? 'Лента' : R.v ? 'Материал' : R.rf && R.sys === 'ROOF-DN' ? 'Ткань 1' : 'Ткань') + '</label><button class="ul sel fabsel" data-a="ccol" data-v="fab">' + (f ? (f.stock !== null ? '<i class="sd" style="background:' + DOT[f.stock] + '"></i>' : '') + '<span class="fabtx"><b>' + e(f.name) + '</b><span class="mut sm">' + (R.g ? e(f.ser) + (f.perf ? ' · перфорация' : '') : 'категория ' + e(f.cat) + ' · серия ' + e(f.ser)) + '</span></span>' : '<span class="ph">' + (R.g ? 'Выберите ленту' : R.v ? 'Выберите материал' : 'Выберите ткань') + '</span>') + '</button>';
    const fabPop = cur => '<div class="colpop"><input class="in" data-c="ccolq" placeholder="' + (R.g ? 'Поиск ленты (код)' : 'Поиск ткани (название, серия, категория)') + '" value="' + e(F.cq) + '" id="ccolq"><div class="colist sc">' + (shown.length ? shown.map(x => '<button class="coli ' + (x.key === cur ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(x.key) + '">' + (J.photoUrl(x) ? '<img class="fth" loading="lazy" alt="" src="' + e(J.photoUrl(x)) + '" onerror="this.style.display=\'none\'">' : '') + (x.stock !== null ? '<i class="sd" style="background:' + DOT[x.stock] + '"></i>' : '') + '<span><b>' + e(x.name) + '</b> <span class="mut sm">' + (R.g ? '' : 'серия ' + e(x.ser)) + '</span></span><span class="sp"></span>' + (R.g ? (x.perf ? '<span class="pill">перф.</span>' : '') : '<span class="pill">кат. ' + e(x.cat) + '</span>') + '</button>').join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>';
    if (F.colOpen === true) fabFld += fabPop(R.fab);
    fabFld += '</div>';
    let roofFlds = '';
    if (R.rf) { /* Roof: производитель окна → модель окна (с поиском) → ткань (для день-ночь две) */
      const wn = J.winOf(R.rw), qq = (F.cq || '').trim().toLowerCase().split(/\s+/).filter(Boolean), dn = R.sys === 'ROOF-DN';
      roofFlds = '<div class="fld"><label>Производитель окна</label><select class="ul" data-c="rrm">' + J.roofMans().map(x => '<option value="' + e(x) + '"' + (x === R.rm ? ' selected' : '') + '>' + e(x) + '</option>').join('') + '</select></div>';
      roofFlds += '<div class="fld colf"><label>Модель окна</label><button class="ul sel fabsel" data-a="ccol" data-v="win">' + (wn ? '<span class="fabtx"><b>' + e(wn.mod) + '</b><span class="mut sm">' + e(wn.ser.length > 60 ? wn.ser.slice(0, 58) + '…' : wn.ser) + ' · штора ' + wn.w + '×' + wn.h + ' мм</span></span>' : '<span class="ph">Выберите модель окна</span>') + '</button>';
      if (F.colOpen === 'win') {
        const hay = x => (x.mod + ' ' + x.ser + ' ' + x.w + 'x' + x.h + ' ' + x.w + '×' + x.h).toLowerCase(), sc = x => { const tk = x.mod.toLowerCase().split(/[,\s]+/); return qq.length && tk.indexOf(qq[0]) >= 0 ? 0 : qq.length && tk.some(t => t.indexOf(qq[0]) === 0) ? 1 : 2; };
        const wl = J.roofWins(R.rm).filter(x => qq.every(t => hay(x).indexOf(t) >= 0)).map((x, i) => ({ x, i, s: sc(x) })).sort((a, b) => a.s - b.s || a.i - b.i).map(o => o.x);
        roofFlds += '<div class="colpop"><input class="in" data-c="ccolq" placeholder="Поиск модели окна (например, C04, MK06, GGL, 5/7)" value="' + e(F.cq) + '" id="ccolq"><div class="colist sc">' + (wl.length ? wl.map(x => '<button class="coli ' + (x.id === R.rw ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(x.id) + '"><span><b>' + e(x.mod) + '</b> <span class="mut sm">' + e(x.ser.length > 70 ? x.ser.slice(0, 68) + '…' : x.ser) + '</span></span><span class="sp"></span><span class="pill">' + x.w + '×' + x.h + '</span></button>').join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>';
      }
      roofFlds += '</div>';
      if (dn) {
        const f2 = J.fabOf(R.fab2);
        roofFlds += '<div class="fld colf"><label>Ткань 2</label><button class="ul sel fabsel" data-a="ccol" data-v="fab2">' + (f2 ? (f2.stock !== null ? '<i class="sd" style="background:' + DOT[f2.stock] + '"></i>' : '') + '<span class="fabtx"><b>' + e(f2.name) + '</b><span class="mut sm">категория ' + e(f2.cat) + ' · серия ' + e(f2.ser) + '</span></span>' : '<span class="ph">Выберите вторую ткань</span>') + '</button>' + (F.colOpen === 'fab2' ? fabPop(R.fab2) : '') + '</div>';
      }
    }
    h += '<div class="fgrid">' + modelRow() + '<div class="fld"><label>Система</label><select class="ul" data-c="rsys">' + grpNames.map(g => '<optgroup label="' + e(g) + '">' + sy.filter(x => x.group === g).map(x => '<option value="' + e(x.code) + '"' + (x.code === R.sys ? ' selected' : '') + '>' + e(x.name) + '</option>').join('') + '</optgroup>').join('') + '</select></div>' + (R.rf ? roofFlds + fabFld : isCorn ? '' : fabFld) + '</div>';
    if (R.rf) h += '<div class="fld sz"><label>Размер штор, мм (по модели окна)</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<b class="num">' + (R.w ? e(R.w) : '—') + '</b></span><span class="szi" title="Высота">' + ICH + '<b class="num">' + (R.h ? e(R.h) : '—') + '</b></span></div></div>';
    else h += '<div class="fld sz"><label>Размер, мм</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<input class="ul num" type="number" min="0" value="' + e(R.w) + '" data-c="rf" data-k="w"></span><span class="szi" title="Высота">' + ICH + '<input class="ul num" type="number" min="0" value="' + e(R.h) + '" data-c="rf" data-k="h"></span></div></div>';
    if (R.rf) { /* у Roof ручка, стороны управления нет */ }
    else if (R.g && RMOT()) h += MOTNOTE;
    else if (R.g) {
      const vf = R.vf = Object.assign(VF0(), R.vf || {});
      const gl = +(RJ().sysOf(R.sys) || {}).vt === 50 ? 50 : 25, gk = CS().CTRL_ORDER[gl].filter(k => !/^V/.test((RJ().sysOf(R.sys) || {}).vt || '') || k === 'L' || k === 'R'); /* Венус: только слева/справа */
      h += '<div class="fld"><label>Управление</label><div class="ctrls">' + gk.map(k => '<button class="ctr ' + (vf.ck === k ? 'on' : '') + '" data-a="gck" data-v="' + k + '" title="' + e(CTRL_TXT[k]) + '">' + ctrlSvg(gl, k, false, 52) + '<span>' + e(CTRL_TXT[k]) + '</span></button>').join('') + '</div></div>' +
        '<div class="fgrid"><div class="fld"><label>Длина управления, мм</label><input class="ul num" type="number" min="0" data-c="vf" data-k="len" value="' + e(vf.len !== '' && vf.len != null ? vf.len : (+R.h ? Math.round(+R.h * 0.75) : '')) + '"></div></div>';
    } else if (R.v) {
      const vf = R.vf = Object.assign(VF0(), R.vf || {}), sel = (k, lab, opts) => '<div class="fld"><label>' + lab + '</label><select class="ul" data-c="vf" data-k="' + k + '">' + opts.map(o => '<option value="' + e(o[0]) + '"' + (vf[k] === o[0] ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select></div>';
      if (RMOT()) h += MOTNOTE;
      h += '<div class="fgrid">' + (RMOT() ? '' : '<div class="fld"><label>Управление</label><div class="seg">' + [['L', 'левое'], ['R', 'правое']].map(k => '<button class="' + (vf.side === k[0] ? 'on' : '') + '" data-a="vside" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</div></div>' +
        '<div class="fld"><label>Длина управления, мм</label><input class="ul num" type="number" min="0" data-c="vf" data-k="len" value="' + e(vf.len !== '' && vf.len != null ? vf.len : (+R.h ? Math.max(0, +R.h - 500) : '')) + '"></div>') +
        sel('chain', 'Фурнитура', [['Пластиковая', 'пластиковая'], ['Металл', 'металлическая (цепь + нижняя обвязка)'], ['Прозрачная', 'прозрачная (цепь + замок)']]) +
        sel('ceil', 'Тип потолочного кронштейна', [['Обычный', 'обычный'], ['Армстронг', 'армстронг'], ['Не класть', 'не класть']]) +
        sel('ctype', 'Тип управления', [['К управлению', 'к управлению'], ['От управления', 'от управления'], ['От центра', 'от центра'], ['К центру', 'к центру']]) +
        sel('wall', 'Тип стенового кронштейна', [['7,5 см', '7,5 см'], ['10 см', '10 см'], ['Не класть', 'не класть']]) + '</div>';
    } else if (R.sys === 'UNI-2П') h += '<div class="fld"><label>Управление</label><div class="fnote ok" style="margin:0">Ручка по центру нижней планки, сторону указывать не нужно</div></div>';
    else if (RMOT()) h += MOTNOTE;
    else     h += '<div class="fld"><label>Управление</label><div class="ctrls">' + [['L', 'цепочка слева'], ['R', 'цепочка справа']].map(k => '<button class="ctr ' + (R.ctrl === k[0] ? 'on' : '') + '" data-a="rf" data-k="ctrl" data-v="' + k[0] + '">' + ctrlSvg(50, k[0], true, 52) + '<span>' + k[1] + '</span></button>').join('') + '</div></div>';
    const choice = n.groups.filter(g => g.type === 'choice' && g.items.length > 1), flags = n.groups.filter(g => g.type === 'flag' && !(R.v && /^(Металлическая фурнитура|Прозрачная комплектация)$/.test(g.name)) && !(R.g && /^(Разведенное|Совмещенное) управление$/.test(g.name)));
    if (choice.length) h += '<div class="fgrid ropts">' + choice.map(g => '<div class="fld"><label>' + e(g.name) + '</label><select class="ul" data-c="ropt" data-k="' + e(g.name) + '">' + g.items.map(x => '<option value="' + e(x.value) + '"' + (R.sel[g.name] === x.value ? ' selected' : '') + '>' + e(x.value + (R.sel[g.name] === x.value ? '' : delta(g, x.value)) + tubeHint(g, x)) + '</option>').join('') + '</select>' + (g.name === 'Плитки' ? '<small class="mut" style="display:block;margin-top:4px;line-height:1.35">Плитка подкладочная для штапика менее 20 мм (толщина 4 мм):<br>штапик 16–20 мм — 1 пара<br>12–16 мм — 2 пары<br>8–12 мм — 3 пары<br>4–8 мм — 4 пары<br>0–4 мм — 5 пар</small>' : '') + '</div>').join('') + '</div>';
    if (flags.length) h += '<div class="fld"><label>Дополнительно</label><div class="ochips">' + flags.map(g => { const fo = g.name === 'Редуктор и цепь-петля' && RJ().venusReducer(R.sys, +R.w || 0, +R.h || 0), pd = g.name === 'Монтажный профиль' && R.sel['Кронштейны'] === 'Металлические', on = R.flags[g.name] || fo; return '<button class="oc ' + (on ? 'on' : '') + (pd ? ' dis' : '') + '" data-a="rflag" data-v="' + e(g.name) + '"' + (fo ? ' title="В этом размере Венус делается только с редуктором"' : pd ? ' title="Нельзя с металлическими кронштейнами"' : '') + '>' + e(g.name) + (r.ok && on && r.optP[g.name] ? ' +' + fmt(r.optP[g.name]) : (on ? '' : delta(g))) + '</button>'; }).join('') + '</div></div>';
    { const al = rAuto();
      if (al.drive.length || al.remote.length) {
        const opt = (list, cur) => '<option value="">Нет</option>' + list.map(f => '<option value="' + e(f.key) + '"' + (cur === f.key ? ' selected' : '') + '>' + e(f.name + ' +' + fmt(f.price) + ' ₽') + '</option>').join('');
        h += '<div class="fgrid">' + (al.drive.length ? '<div class="fld"><label>Электропривод</label><select class="ul" data-c="rau" data-k="drive">' + opt(al.drive, R.auto.drive) + '</select></div>' : '') +
          (al.remote.length ? '<div class="fld"><label>Пульт / выключатель</label><select class="ul" data-c="rau" data-k="remote">' + opt(al.remote, R.auto.remote) + '</select></div>' : '') + '</div>';
        if (R.auto.drive && JC().wireInfo({ sup: 'Amigo', auto: { drive: R.auto.drive } })) h += '<div class="fld"><label>Провод привода выходит</label><div class="seg">' + [['L', 'слева'], ['R', 'справа']].map(k => '<button class="' + (R.auto.wire === k[0] ? 'on' : '') + '" data-a="rwire" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</div></div>';
      } }
    let st = '';
    if (!VG() && !NW() && !J.windReady() && !F.windTried) { F.windTried = true; setTimeout(() => A.act.cprices(), 0); }
    const wd = f && !VG() && !NW() ? J.wind(it) : null;
    if (wd) { const over = (+R.h > 0 && wd.max < 6 && +R.h / 10 > wd.max * 100 + 0.01); st += '<div class="fnote ' + (over ? 'bad' : 'ok') + '"><b>Макс. высота намотки:</b> ' + (wd.max >= 6 ? 'без ограничений (до 600 см)' : Math.floor(wd.max * 100) + ' см') + '</div>'; }
    else if (f && R.sys && !VG() && !NW()) st += '<div class="fnote mut">Макс. высота намотки: ' + (J.windReady() ? 'нет данных для этой ткани и системы' : 'таблицы намоток ещё не загружены, обновляю цены…') + '</div>';
    if (+R.w > 0 && +R.h > 0 && f) st += '<div class="fnote ' + (r.ok && !r.warn.length ? 'ok' : 'bad') + '">' + (!r.ok ? e(r.msg) : r.warn.length ? '<b>НЕ ГАРАНТ.: </b>' + e(r.warn.join('; ')) : (r.areaNote || 'Размеры в пределах прайса (считаем по сетке ' + Math.round(r.gridW * 1000) + '×' + Math.round(r.gridH * 1000) + ' мм)')) + '</div>';
    (r.notes || []).forEach(t => { st += '<div class="fnote bad"><b>Внимание:</b> ' + e(t) + '</div>'; });
    if (r.tubeAuto) st += '<div class="fnote ok"><b>Труба ' + e(r.tubeAuto.to) + ':</b> на трубе ' + e(r.tubeAuto.from) + ' размеры вне гарантии, подобрали большую (цена пересчитана)</div>';
    if (r.rec) st += '<div class="fnote"><b>Рекомендуется редуктор' + (r.rec === 'q' ? ' с большой цепью 6×12' : '') + '</b> (по диаграмме Амиго)</div>';
    if (f && f.stock !== null && f.stock < 2) st += '<div class="fnote"><i class="sd" style="background:' + DOT[f.stock] + '"></i> ' + e(STOCK_TXT[f.stock][0].toUpperCase() + STOCK_TXT[f.stock].slice(1)) + '</div>';
    if (r.ok) st += '<div class="fnote"><b>Срок:</b> ' + r.termDays + ' дней</div>';
    if (own && r.ok && showProfit && unit < r.cost) st += '<div class="fnote bad">Ниже закупа: убыток ' + m((r.cost - unit) * qty) + ' на позицию.</div>';
    h += '</div>';
    h += rFoot(J, r, f, st, qty, own, unit, showProfit);
    return h;
  }

  /* нижняя часть формы изделия: фото, заметки, цена, «В корзину» (общая для рулонок и плиссе) */
  function rFoot(J, r, f, st, qty, own, unit, showProfit, nph) {
    let h = '';
    const ph = J.photoUrl(f);
    h += '<div class="ffoot">' + (ph && !nph ? '<button class="rph" data-a="rphoto" title="Увеличить фото ткани"><img src="' + e(ph) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></button>' : '') + '<div class="fright"><div class="fnotes">' + st + '</div><div class="frow">' + '<button class="coin ' + (showProfit ? 'on' : '') + '" data-a="chide" title="' + (showProfit ? 'Закуп и прибыль показаны' : 'Показать закуп и прибыль') + '">' + A.icon('coin', 22) + '</button>' +
      '<div class="fld"><label>Количество</label><div class="qst"><button data-a="rqty" data-d="-1">−</button><input class="num" type="number" min="1" max="99" value="' + qty + '" data-c="rf" data-k="qty"><button data-a="rqty" data-d="1">+</button></div></div>' +
      '<div class="fprice"><div class="fown"><label>Своя цена за шт</label><input class="ul num" value="' + e(R.own) + '" data-c="rf" data-k="own" placeholder="' + (r.ok ? Math.round(r.unit) : '') + '"></div>' +
      '<small class="mut">' + (r.ok ? (qty > 1 ? fmt(unit) + ' ₽ × ' + qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : '') + (own ? ' · своя цена' : '') + '</small>' +
      '<div class="big num">' + (r.ok ? m(unit * qty) : '—') + '</div>' + (showProfit && r.ok ? '<small class="mut">прибыль ' + m((r.profit + (own ? unit - r.unit : 0)) * qty) + ' · закуп ' + m(r.cost * qty) + '</small>' : '') + '</div>' +
      '<button class="btn pri fadd" data-a="cadd" style="opacity:' + (r.ok ? 1 : .45) + '">' + (R.edit >= 0 ? 'Сохранить' : 'В корзину') + '</button></div></div></div></div>' +
      (R.photo && ph ? '<div class="rphbig" data-a="rphoto"><img src="' + e(ph) + '" alt=""><div class="mut">' + e(f.name) + (f.qty !== null ? ' · на складе ' + fmt(f.qty) + ' м' : '') + '</div></div>' : '');
    return h;
  }
  /* ===== плиссе Амиго: тип → модель (схема и справка) → ткань → размер → управление → опции ===== */
  const plM = () => RJ() && RJ().pl ? RJ().pl.M(R.sys) : null;
  const plCtl = () => { const m = plM(); return !!m && (m.ctl === 'шнур' || m.ctl === 'цепь'); };
  const plNeed2 = () => { const m = plM(); return !!m && m.n === 2; };
  const PLCTL = { 'ручка': 'ручка на подвижном карнизе', 'шнур': 'шнур', 'цепь': 'цепь', 'электро': 'электропривод', 'неподвижная': 'неподвижная, без управления', 'пружина': 'пружинный механизм' };
  const PLGT = { 'ручка': 'Ручка на подвижном карнизе', 'шнур': 'Шнур', 'цепь': 'Цепочка', 'электро': 'Электропривод', 'пружина': 'Пружинный механизм', 'неподвижная': 'Неподвижные, без управления' };
  const c2 = x => String(x).replace('.', ',');
  const plShort = m => [PLCTL[m.ctl] || m.ctl, m.mv > 1 ? 'подвижных ' + m.mv : '', m.n === 2 ? 'день-ночь' : '', m.form === 'сложная' ? 'непрямоугольная' : ''].filter(Boolean).join(', ');
  /* справка только по выбранной модели: всё, что нужно знать об особенностях этой модели */
  function plHelp(m, showCost) {
    const J = RJ(), grp = J.pl.groups('PL-' + m.code), row = (k, v) => v ? '<div class="plh-r"><span>' + e(k) + '</span><div>' + v + '</div></div>' : '';
    const brk = grp.find(g => g.name === 'Кронштейн'), others = grp.filter(g => g.name !== 'Кронштейн' && g.name !== 'Лицевая сторона');
    const ps = J.pl.P('скидка', 0.4), fxk = 0;
    let size = '';
    if (m.wmax || m.hmax) {
      size = '<div>ширина ' + c2(m.wmin) + '–' + c2(m.wmax) + ' м' + (m.wusil && m.wusil > m.wmax ? ' (с усиленным профилем до ' + c2(m.wusil) + ' м)' : '') + '</div><div>высота ' + c2(m.hmin) + '–' + c2(m.hmax) + ' м' + (m.hbo ? ', для блэкаута до ' + c2(m.hbo) + ' м' : '') + '</div>' + (m.amax ? '<div>площадь до ' + c2(m.amax) + ' м²</div>' : '');
      const rs = String(m.rule || '').split(';').map(x => x.split(':').map(Number)).filter(x => x.length === 2 && !isNaN(x[0]) && !isNaN(x[1])).sort((a, b) => a[0] - b[0]);
      if (rs.length) size += '<div>' + rs.map(x => 'при ширине до ' + c2(x[0]) + ' м высота до ' + c2(x[1]) + ' м').join('; ') + '</div>';
    } else size = '<div class="mut">В брошюре для этой модели размеры не указаны</div>';
    const form = m.form === 'сложная' ? 'непрямоугольная' + (m.pct ? ' (цена по сетке +' + m.pct + '%)' : '') + ', цена считается по габаритам; с тканью гофре доплата' : 'прямоугольная';
    return '<div class="plhelp"><h3>' + e(m.code) + ': справка по модели</h3>' +
      row('Система', e(m.sys + (m.ser ? ', серия ' + m.ser : ''))) + row('Управление', e(PLCTL[m.ctl] || m.ctl)) + row('Полотен', m.n === 2 ? '2, день-ночь (цена = ткань 1 + ткань 2)' : '1') +
      row('Подвижных карнизов', m.mv ? String(m.mv) : '') + row('Форма', e(form)) + row('Ткани', m.fab === 'плиссе' ? 'только плиссе' : 'плиссе и гофре') + row('Установка на окно с наклоном', m.tilt && m.tilt !== '—' ? e(m.tilt) : '') +
      row('Размеры', size) + row('Кронштейны', brk ? brk.items.map(x => e(x.value) + (x.usd ? ' <span class="mut">(доплата)</span>' : '')).join('<br>') : '<span class="mut">по брошюре кронштейн не выбирается</span>') +
      row('Доступные опции', others.length ? others.map(g => e(g.name)).join(', ') : '<span class="mut">нет</span>') + row('Наценка модели (закуп)', showCost && m.nat ? c2(m.nat) + ' $' : '') +
      row('Предупреждения', J.pl.warns('PL-' + m.code, [], {}).map(x => '<div>' + e(x) + '</div>').join('')) + row('Примечание', m.note ? e(m.note) : '') + (m.check ? '<div class="plh-n">Данные по этой модели в брошюре неполные или приблизительные: перед запуском в производство сверьте с поставщиком.</div>' : '') + '</div>';
  }
  function normPl() {
    const J = RJ(), PL = J.pl, ts = PL.types();
    if (!ts.some(t => t.id === R.pt)) R.pt = ts.length ? ts[0].id : '';
    const ms = PL.models(R.pt); if (R.sys && !ms.some(x => 'PL-' + x.code === R.sys)) R.sys = '';
    const fl = PL.fabrics(R.pt); if (R.fab && !fl.some(x => x.key === R.fab)) R.fab = ''; if (R.fab2 && (!plNeed2() || !fl.some(x => x.key === R.fab2))) R.fab2 = '';
    const m = plM(), fs = [J.fabOf(R.fab), plNeed2() ? J.fabOf(R.fab2) : null].filter(Boolean), gof = fs.some(x => /гофре/i.test(x.kind || ''));
    /* шнур с петлями: у гофре он уже в комплекте (опцию убираем), у MAXI плиссе включён по умолчанию, пока его не трогали */
    if (m) { R.flags = Object.assign({}, R.flags); const PN = 'Шнур с петлями'; if (gof) delete R.flags[PN]; else if (m.sys === 'MAXI' && !(R.tch && R.tch[PN])) R.flags[PN] = true; }
    const o = R.sys ? J.opts(roloItem()) : { sel: {}, flags: {} }; R.sel = o.sel; R.flags = o.flags;
    { const al = rAuto(), a = R.auto = Object.assign({ drive: '', remote: '', wire: '' }, R.auto); if (a.drive && !al.drive.some(f => f.key === a.drive)) a.drive = ''; if (a.remote && !al.remote.some(f => f.key === a.remote)) a.remote = ''; if (!a.drive || !JC().wireInfo({ sup: 'Amigo', auto: { drive: a.drive } })) a.wire = ''; }
    const r = R.sys ? JC().withAuto(roloItem(), J.calc(roloItem())) : { ok: false, warn: [], msg: 'Выберите модель' };
    return { it: roloItem(), r, groups: R.sys ? J.groups(R.sys).filter(g => !(gof && g.name === 'Шнур с петлями')) : [], m, ts, ms, fl, warns: R.sys ? J.pl.warns(R.sys, fs, R.flags) : [] };
  }
  function formPl() {
    if (!RJ() || !RJ().pl || !RJ().pl.types().length) return '<div class="card cform"><div class="ftop"><h2>Плиссе</h2></div><div class="fbody"><div class="empty" style="padding:28px">Цены на плиссе не загружены.<br><small>Нажмите «Синхронизировать» в Настройках, раздел «Данные».</small></div></div></div>';
    const J = RJ(), showProfit = !!S.showCost, n = normPl(), r = n.r, pm = n.m, qty = Math.max(1, +R.qty || 1);
    const own = R.own !== '' && !isNaN(+R.own) && +R.own >= 0, unit = own ? Math.round(+R.own) : (r.ok ? r.unit : 0), q = (F.cq || '').trim().toLowerCase();
    const f = J.fabOf(R.fab), f2 = J.fabOf(R.fab2), shown = n.fl.filter(x => !q || (x.name + ' ' + x.ser + ' ' + x.cat).toLowerCase().indexOf(q) >= 0);
    const ICW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M6 12h12M9 9l-3 3 3 3M15 9l3 3-3 3"/></svg>';
    const ICH = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3"/></svg>';
    const delta = (g, val) => { if (!r.ok) return ''; const t = roloItem(); t.sel = Object.assign({}, R.sel); t.flags = Object.assign({}, R.flags);
      if (g.type === 'flag') t.flags[g.name] = !R.flags[g.name]; else t.sel[g.name] = val;
      const r2 = J.calc(t); if (!r2.ok) return ''; const d = r2.unit - r.unit; return d ? (d > 0 ? ' +' : ' −') + fmt(Math.abs(d)) + ' ₽' : ''; };
    const fabBtn = (cur, key, lab) => '<div class="fld colf"><label>' + lab + '</label><button class="ul sel fabsel" data-a="ccol" data-v="' + key + '">' + (cur ? (cur.stock !== null ? '<i class="sd" style="background:' + DOT[cur.stock] + '"></i>' : '') + '<span class="fabtx"><b>' + e(cur.name) + '</b><span class="mut sm">категория ' + e(cur.cat) + ' · серия ' + e(cur.ser) + '</span></span>' : '<span class="ph">Выберите ткань</span>') + '</button>' +
      (F.colOpen === (key === 'fab' ? true : key) ? '<div class="colpop"><input class="in" data-c="ccolq" placeholder="Поиск ткани (название, серия, категория)" value="' + e(F.cq) + '" id="ccolq"><div class="colist sc">' + (shown.length ? shown.map(x => '<button class="coli ' + (x.key === (key === 'fab' ? R.fab : R.fab2) ? 'on' : '') + '" data-a="ccolpick" data-v="' + e(x.key) + '">' + (J.photoUrl(x) ? '<img class="fth" loading="lazy" alt="" src="' + e(J.photoUrl(x)) + '" onerror="this.style.display=\'none\'">' : '') + (x.stock !== null ? '<i class="sd" style="background:' + DOT[x.stock] + '"></i>' : '') + '<span><b>' + e(x.name) + '</b> <span class="mut sm">серия ' + e(x.ser) + '</span></span><span class="sp"></span><span class="pill">кат. ' + e(x.cat) + '</span></button>').join('') : '<div class="mut" style="padding:10px">Ничего не найдено</div>') + '</div></div>' : '') + '</div>';
    let h = '<div class="card cform"><div class="ftop"><h2>' + (R.edit >= 0 ? 'Плиссе, позиция ' + (R.edit + 1) : 'Новое плиссе') + '</h2><span class="sp"></span>' + (R.edit >= 0 ? '<button class="btn sm" data-a="cedcancel">Отменить правку</button>' : '') + '</div><div class="fbody rbody">';
    /* тип (система и вид ткани) → модель: выбор модели обязателен, она задаёт размеры, кронштейны, опции и наценку */
    h += '<div class="fgrid">' + modelRow() + '<div class="fld"><label>Тип</label><select class="ul" data-c="plt">' + n.ts.map(t => '<option value="' + t.id + '"' + (t.id === R.pt ? ' selected' : '') + '>' + e(t.label) + '</option>').join('') + '</select></div></div>';
    /* выбор модели плиткой: группы по способу управления, на плитке эскиз и артикул, клик сразу ставит нужную модель */
    if (!pm || R.plgrid) {
      const CO = ['ручка', 'шнур', 'цепь', 'электро', 'пружина', 'неподвижная'], cs = CO.filter(c => n.ms.some(x => x.ctl === c)).concat(n.ms.map(x => x.ctl).filter((c, i, a) => CO.indexOf(c) < 0 && a.indexOf(c) === i));
      h += '<div class="fld"><label>Модель плиссе: выбери способ управления и эскиз</label><div class="plgrid">' + cs.map(c => '<div class="plgrp"><div class="plgt">' + e(PLGT[c] || c) + '</div><div class="pltiles">' + n.ms.filter(x => x.ctl === c).sort((a, b) => a.code.localeCompare(b.code)).map(x => '<button class="pltile ' + (R.sys === 'PL-' + x.code ? 'on' : '') + '" data-a="plpick" data-v="' + e(x.code) + '" title="' + e(x.code + ': ' + plShort(x)) + '"><img loading="lazy" src="img/plisse/' + e(x.code) + '.png" alt="" onerror="this.style.visibility=\'hidden\'"><b>' + e(x.code) + '</b></button>').join('') + '</div></div>').join('') + '</div></div>';
    }
    if (pm) {
      h += '<div class="plhead"><div class="plpic"><img src="img/plisse/' + e(pm.code) + '.png" alt="Схема ' + e(pm.code) + '" onerror="this.parentNode.style.display=\'none\'"></div><div class="pltx"><b>' + e(pm.code) + '</b><span class="mut">' + e(plShort(pm)) + '</span><span class="mut sm">' + e(pm.sys + (pm.ser ? ' · серия ' + pm.ser : '')) + '</span><span class="plbtns"><button class="btn sm" data-a="plgrid">' + (R.plgrid ? 'Скрыть список моделей' : 'Сменить модель') + '</button><button class="btn sm" data-a="plhelp">' + (R.plhelp ? 'Скрыть справку' : 'Справка по модели') + '</button></span></div>' + (J.photoUrl(f) ? '<button class="rph plph" data-a="rphoto" title="Увеличить фото ткани"><img src="' + e(J.photoUrl(f)) + '" alt="" onerror="this.parentNode.style.display=\'none\'"></button>' : '') + '</div>';
      if (R.plhelp) h += plHelp(pm, showProfit);
    }
    if (pm) {
      const szH = '<div class="fld sz"><label>Размер, мм' + (pm.form === 'сложная' ? ' (габарит: макс. ширина и высота)' : '') + '</label><div class="szr"><span class="szi" title="Ширина">' + ICW + '<input class="ul num" type="number" min="0" value="' + e(R.w) + '" data-c="rf" data-k="w"></span><span class="szi" title="Высота">' + ICH + '<input class="ul num" type="number" min="0" value="' + e(R.h) + '" data-c="rf" data-k="h"></span></div></div>';
      h += '<div class="fgrid">' + fabBtn(f, 'fab', pm.n === 2 ? 'Ткань 1 (верх)' : 'Ткань') + (pm.n === 2 ? fabBtn(f2, 'fab2', 'Ткань 2 (низ)') : '') + (pm.n === 2 ? '' : szH) + '</div>' + (pm.n === 2 ? szH : '');
      if (plCtl() && RMOT()) h += MOTNOTE;
      else if (plCtl()) h += '<div class="fgrid"><div class="fld"><label>Сторона управления (' + e(pm.ctl) + ')</label><div class="seg">' + [['L', 'слева'], ['R', 'справа']].map(k => '<button class="' + (R.ctrl === k[0] ? 'on' : '') + '" data-a="rf" data-k="ctrl" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</div></div>' +
        '<div class="fld"><label>Длина управления, мм</label><input class="ul num" type="number" min="0" data-c="vf" data-k="len" value="' + e(R.vf && R.vf.len !== '' && R.vf.len != null ? R.vf.len : (+R.h ? Math.round(+R.h * 0.75) : '')) + '"></div></div>';
      const choice = n.groups.filter(g => g.type === 'choice' && g.items.length > 1), flags = n.groups.filter(g => g.type === 'flag');
      if (choice.length) h += '<div class="fgrid ropts">' + choice.map(g => '<div class="fld"><label>' + e(g.name) + '</label><select class="ul" data-c="ropt" data-k="' + e(g.name) + '">' + g.items.map(x => '<option value="' + e(x.value) + '"' + (R.sel[g.name] === x.value ? ' selected' : '') + '>' + e(x.value + (R.sel[g.name] === x.value ? '' : delta(g, x.value))) + '</option>').join('') + '</select></div>').join('') + '</div>';
      if (flags.length) h += '<div class="fld"><label>Дополнительно</label><div class="ochips">' + flags.map(g => { const on = R.flags[g.name]; return '<button class="oc ' + (on ? 'on' : '') + '" data-a="rflag" data-v="' + e(g.name) + '">' + e(g.name) + (r.ok && on && r.optP[g.name] ? ' +' + fmt(r.optP[g.name]) : (on ? '' : delta(g))) + '</button>'; }).join('') + '</div></div>';
      { const al = rAuto();
        if (al.drive.length || al.remote.length) {
          const opt = (list, cur) => '<option value="">' + (list === al.drive ? 'Выберите комплект' : 'Нет') + '</option>' + list.map(f => '<option value="' + e(f.key) + '"' + (cur === f.key ? ' selected' : '') + '>' + e(f.name + ' +' + fmt(f.price) + ' ₽') + '</option>').join('');
          h += '<div class="fgrid">' + (al.drive.length ? '<div class="fld"><label>Электропривод (входит в цену)</label><select class="ul" data-c="rau" data-k="drive">' + opt(al.drive, R.auto.drive) + '</select></div>' : '') +
            (al.remote.length ? '<div class="fld"><label>Пульт / выключатель</label><select class="ul" data-c="rau" data-k="remote">' + opt(al.remote, R.auto.remote) + '</select></div>' : '') + '</div>';
          if (R.auto.drive && JC().wireInfo({ sup: 'Amigo', auto: { drive: R.auto.drive } })) h += '<div class="fld"><label>Провод привода выходит</label><div class="seg">' + [['L', 'слева'], ['R', 'справа']].map(k => '<button class="' + (R.auto.wire === k[0] ? 'on' : '') + '" data-a="rwire" data-v="' + k[0] + '">' + k[1] + '</button>').join('') + '</div></div>';
        } }
    }
    let st = '';
    if (pm && pm.el && !R.auto.drive) st += '<div class="fnote bad"><b>Электропривод:</b> у электро-модели он входит в цену, выбери комплект</div>';
    if (pm && +R.w > 0 && +R.h > 0 && f && (pm.n !== 2 || f2)) st += '<div class="fnote ' + (r.ok && !r.warn.length ? 'ok' : 'bad') + '">' + (!r.ok ? e(r.msg) : r.warn.length ? '<b>' + (r.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + '</b>' + e(r.warn.join('; ')) : e(r.areaNote || 'Размеры в пределах прайса')) + '</div>';
    n.warns.forEach(t => { st += '<div class="fnote warn"><b>Внимание:</b> ' + e(t) + '</div>'; });
    (r.notes || []).forEach(t => { st += '<div class="fnote warn"><b>Внимание:</b> ' + e(t) + '</div>'; });
    if (pm && pm.check) st += '<div class="fnote">Данные по модели ' + e(pm.code) + ' неполные: размеры и комплектация приблизительные, смотри «Справку по модели»</div>';
    [f, f2].forEach(x => { if (x && x.stock !== null && x.stock < 2) st += '<div class="fnote"><i class="sd" style="background:' + DOT[x.stock] + '"></i> ' + e(x.name.replace(/,.*$/, '')) + ': ' + e(STOCK_TXT[x.stock]) + (x.arrival ? ', приход ' + e(x.arrival) : '') + '</div>'; });
    if (r.ok && r.termDays) st += '<div class="fnote"><b>Срок:</b> ' + r.termDays + ' дней</div>';
    if (own && r.ok && showProfit && unit < r.cost) st += '<div class="fnote bad">Ниже закупа: убыток ' + m((r.cost - unit) * qty) + ' на позицию.</div>';
    h += '</div>' + rFoot(J, r, f, st, qty, own, unit, showProfit, true);
    return h;
  }
  A.fld.plt = v => { R.tch = {}; R.pt = v; R.sys = ''; R.plgrid = false; R.fab = ''; R.fab2 = ''; R.sel = {}; R.flags = {}; R.auto = { drive: '', remote: '', wire: '' }; F.colOpen = false; F.cq = ''; rr(); };
  A.fld.plm = v => { R.sys = 'PL-' + v; R.sel = {}; R.flags = {}; R.auto = { drive: '', remote: '', wire: '' }; R.ctrl = ''; R.fab2 = ''; F.colOpen = false; rr(); };
  A.act.plpick = el => { R.tch = {}; R.sys = 'PL-' + el.dataset.v; R.sel = {}; R.flags = {}; R.auto = { drive: '', remote: '', wire: '' }; R.ctrl = ''; R.fab2 = ''; R.plgrid = false; F.colOpen = false; rr(); };
  A.act.plgrid = () => { R.plgrid = !R.plgrid; rr(); };
  A.act.plhelp = () => { R.plhelp = !R.plhelp; rr(); };


  function itemName(it, c) {
    const extra = Object.keys(it.opts || {}).filter(k => it.opts[k]).map(k => (k === 'Цепочка' || k === 'Цепочка металлическая') && it.chainCol ? k + ' (' + it.chainCol.toLowerCase() + ')' : k); if (it.fix) extra.push(CS().FIXLBL[it.fix] || it.fix);
    const col = c.col ? c.col.name + (/^серия (Классик|Модерно)$/.test(c.col.ser || '') ? ' ' + c.col.ser : '') : '';
    const chain = !!(it.opts && (it.opts['Цепочка'] || it.opts['Цепочка металлическая'] || it.opts['Цепочка металлическая цветная']));
    return { title: CS().COLL_ALL[it.sup] + ' (' + ru(it.sup) + ')', sub: it.mat + ' ' + it.lam + (col ? ' · ' + col : '') + ' · ' + (it.auto && it.auto.drive ? 'электропривод' : (chain ? CHAIN_TXT : CTRL_TXT)[it.ctrl || 'L']) + (extra.length ? ' · ' + extra.join(', ').toLowerCase() : '') };
  }

  /* строка корзины: основные параметры, остальное по кнопке «подробнее» */
  const CX = {};
  const sizeM2 = it => ((+it.w || 0) * (+it.h || 0) / 1e6).toFixed(2).replace('.', ',') + ' м²';
  const mainSub = (it, c) => {
    if (it.prod === 'rolo') { const J = RJ(), sy = J && J.sysOf(it.sys), fb = J && J.fabOf(it.fab); const f2 = J && J.fabOf(it.fab2), wn = J && J.winOf(it.rw); return [sy ? sy.name : '', wn ? 'окно ' + wn.man + ' ' + wn.mod : '', fb ? fb.name + (f2 ? ' + ' + f2.name : '') : '', it.w + '×' + it.h + ' мм'].filter(Boolean).join(' · '); }
    return [it.mat + ' ' + it.lam + ' мм', c.col ? c.col.name : '', it.w + '×' + it.h + ' мм'].filter(Boolean).join(' · ');
  };
  const details = (it, c) => {
    const cs = CS(), d = [];
    d.push(['Коллекция', COLLN()[it.sup] + ' (' + ru(it.sup) + ')']);
    if (it.prod === 'rolo') {
      const J = RJ(), sy = J && J.sysOf(it.sys), fb = J && J.fabOf(it.fab), ds = J ? J.describe(it, c) : { sub: '' };
      d.push(['Система', sy ? sy.name : '—'], [it.mat === 'ГЖ алюминий' ? 'Лента' : it.mat === 'Вертикальные' ? 'Материал' : 'Ткань', fb ? fb.name : '—'], ['Размеры', it.w + '×' + it.h + ' мм'], ['Площадь', sizeM2(it)]);
      String(ds.sub || '').split(' · ').filter(t => t && !(fb && fb.name && t.indexOf(':') < 0 && t.toLowerCase().indexOf(String(fb.name).toLowerCase()) >= 0)).forEach(t => { const k = t.indexOf(':'); d.push(k > 0 ? [t.slice(0, k)[0].toUpperCase() + t.slice(1, k), t.slice(k + 1).trim()] : ['', t]); });
      if (it.auto && (it.auto.drive || it.auto.remote)) { const al = k => ((JC().autoList('Amigo', k) || []).find(f => f.key === it.auto[k]) || {}).name; d.push(['Электропривод', it.auto.drive ? (al('drive') || it.auto.drive) + (it.auto.wire ? ' (провод ' + (it.auto.wire === 'R' ? 'справа' : 'слева') + ')' : '') : 'Нет'], ['Пульт / выключатель', it.auto.remote ? (al('remote') || it.auto.remote) : 'Нет']); }
    } else {
      const chain = !!(it.opts && (it.opts['Цепочка'] || it.opts['Цепочка металлическая'] || it.opts['Цепочка металлическая цветная'])), opts = Object.keys(it.opts || {}).filter(k => it.opts[k]);
      d.push(['Материал', it.mat + ' ' + it.lam + ' мм'], ['Цвет', c.col ? c.col.name : '—'], ['Размеры', it.w + '×' + it.h + ' мм'], ['Площадь', sizeM2(it)],
        ['Управление', it.auto && it.auto.drive ? 'электропривод' : (chain ? CHAIN_TXT : CTRL_TXT)[it.ctrl || 'L']], ['Нижняя фиксация', it.fix ? (cs.FIXLBL[it.fix] || it.fix) : 'Нет'], ['Опции', opts.length ? opts.join(', ') : 'Нет']);
      const a = it.auto || {}, al = (k, key) => ((JC().autoList(it.sup, k) || []).find(f => f.key === key) || {}).name;
      d.push(['Электропривод', a.drive ? (al('drive', a.drive) || a.drive) : 'Нет'], ['Пульт / выключатель', a.remote ? (al('remote', a.remote) || a.remote) : 'Нет']);
    }
    if (c.ok && c.autoAdd) d.push(['Автоматика в цене', m(c.autoAdd)]);
    if (it.own !== '' && it.own != null) d.push(['Своя цена', m(+it.own)]);
    if (it.note) d.push(['Комментарий', it.note]);
    return d.filter(x => x[1] !== '' && x[1] != null);
  };

  /* ===== правая часть: корзина, итог, действия ===== */
  /* последняя строка заказа: доставка от производителей (1500 за партию, Уют и Форум бесплатно), можно править */
  const shipRow = (FF, C) => !C.region && (FF.shipAuto || FF.ship) ? '<tr class="shiprow"><td></td><td><b>Доставка от производителя</b><div class="mut sm">' + (C.shipFix !== '' && C.shipFix != null && FF.ship !== FF.shipAuto ? 'по правилу: ' + m(FF.shipAuto) + ' · изменено вручную' : '1500 ₽ за партию каждого производителя (без Уюта и Форума)') + '</div></td><td class="r">1</td><td class="r"><input class="ul num cp" value="' + (FF.ship || 0) + '" data-c="cship"></td><td class="r num b">' + m(FF.ship) + '</td><td></td></tr>' : '';
  function cart() {
    const E = window.Eng; if (!E || !E.ready) return '<div class="card ccart"><h2>Корзина</h2>' + noPrices() + '</div>';
    const C = JC().C, FF = JC().compute(), items = C.cart, hide = !S.showCost;
    let prof = 0; items.forEach((it, i) => { const c = FF.calcs[i]; if (c.ok) prof += c.profit * it.qty; });
    const shipCost = FF.shipAuto || 0, cost = FF.goodsSum - prof + shipCost, netProf = FF.netTotal - cost, /* закуп включает доставку производителя; монтаж и услуги в клиентской цене — выручка */ pct = C.discMode !== 'rub';
    const row = (it, i) => {
      const c = FF.calcs[i], nm = it.kind ? kindName(it, c) : { title: (it.prod === 'rolo' ? roloName(it, c) : itemName(it, c)).title, sub: mainSub(it, c) + (c.ok && c.termDays ? ' · срок ' + c.termDays + ' дн' : '') }, lineUnit = c.ok ? FF.lineSum[i] / it.qty : 0;
      const dw = JC().driveWarn(it), warn = (dw ? '<div class="cwarn">' + e(dw) + '</div>' : '') + (it.prod === 'rolo' && !c.ok ? '<div class="cwarn">' + e(c.msg || 'Нет цены') + '</div>' : c.ok && c.warn && c.warn.length ? '<div class="cwarn">' + (c.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + e(c.warn.join('; ')) + '</div>' : '') + (it.prod === 'rolo' && c.ok && c.notes && c.notes.length ? c.notes.map(t => '<div class="cwarn">' + e(t) + '</div>').join('') : '');
      const q = it.kind === 'custom' ? '<button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="-1">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="ccq" data-i="' + i + '" data-d="1">+</button>' :
        it.kind ? '<button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="-1" data-sup="' + e(it.sup) + '">−</button><b>' + it.qty + '</b><button class="btn sm" data-a="cast" data-kind="' + it.kind + '" data-key="' + e(it.key) + '" data-d="1" data-sup="' + e(it.sup) + '">+</button>' : '<b>' + it.qty + '</b>';
      const open = !!CX[i] && !it.kind;
      return '<tr><td class="num mut">' + (i + 1) + '</td><td><b>' + e(nm.title) + '</b><div class="mut sm">' + e(nm.sub) + '</div>' + wireSeg(it, i) + (it.note ? '<div class="mut sm">' + e(it.note) + '</div>' : '') + warn +
        (!hide && c.ok && !c.noCost ? '<div class="sm" style="color:' + (c.profit < 0 ? 'var(--bad)' : 'var(--mut)') + '">прибыль ' + m(c.profit) + ' за шт' + (c.cost != null ? ' · закуп ' + m(c.cost) : '') + '</div>' : '') + '</td>' +
        '<td class="cq">' + q + '</td>' +
        '<td class="r">' + (it.kind ? (c.ok ? '<span class="num">' + m(lineUnit) + '</span>' : '<span class="mut">нет цены</span>') : c.ok ? '<input class="ul num cp' + (c.ownPrice ? ' own' : '') + '" value="' + (c.ownPrice ? Math.round(c.unit) : '') + '" placeholder="' + Math.round(lineUnit) + '" data-c="cprice" data-i="' + i + '" title="' + (c.ownPrice ? 'своя цена, по прайсу было ' + fmt(c.listUnit) : 'впишите свою цену за шт') + '">' : '<span class="mut">нет цены</span>') + '</td>' +
        '<td class="r num b">' + (c.ok ? m(FF.lineSum[i]) : '—') + '</td><td class="r cact">' + (it.kind ? '' : '<button class="ib cxb' + (open ? ' on' : '') + '" data-a="cx" data-i="' + i + '" title="' + (open ? 'Свернуть' : 'Подробнее') + '">' + A.icon('chev', 15) + '</button><button class="ib" data-a="cedit" data-i="' + i + '" title="Изменить">' + A.icon('edit', 15) + '</button><button class="ib" data-a="cdup" data-i="' + i + '" title="Копия">' + A.icon('copy', 15) + '</button>') + '<button class="ib" data-a="cdel" data-i="' + i + '" title="Убрать">' + A.icon('close', 15) + '</button></td></tr>' + (open ? '<tr class="cdet"><td></td><td colspan="5"><div class="cdgrid">' + details(it, c).map(x => '<div><span class="mut">' + e(x[0]) + (x[0] ? ': ' : '') + '</span><b>' + e(x[1]) + '</b></div>').join('') + '</div></td></tr>' : ''); };
    return '<div class="card ccart"><div class="ctop"><h2>Корзина</h2><span class="pill">' + items.length + ' поз.</span><span class="sp"></span>' +
      '<div class="seg" title="СПб: розница с доставкой и монтажом. Регионы: опт без доставки и монтажа"><button class="' + (!C.region ? 'on' : '') + '" data-a="creg" data-v="0">СПб</button><button class="' + (C.region ? 'on' : '') + '" data-a="creg" data-v="1">Регионы</button></div>' +
      '</div>' +
      '<div class="clist sc">' + (items.length ? '<table class="tbl cartline"><thead><tr><th>№</th><th>Изделие</th><th class="r">Шт</th><th class="r">Цена за шт</th><th class="r">Сумма</th><th></th></tr></thead><tbody>' + items.map(row).join('') + shipRow(FF, C) + '</tbody></table>' :
        '') + (FF.svcLeft ? '<div class="cwarn" style="color:var(--mut);margin:8px 0">Доставка и установка: +' + m(FF.svcLeft) + '</div>' : '') + autoErrors(FF).map(t => '<div class="callout bad" style="margin:8px 0;font-size:13px">' + e(t) + '</div>').join('') + '</div>' +
      customRow() +
      '<div class="cfoot"><div class="cline">' +
      (C.region ? '<input class="ul" style="flex:1" value="' + e(C.pvz || '') + '" placeholder="Адрес ПВЗ и транспортная компания" data-c="cpvz">' :
        '<label style="font-size:13px;font-weight:700;color:var(--fg)">Доставка и установка, ₽</label><input class="ul num" style="width:96px;font-size:15px;font-weight:700;padding:4px 8px;border:2px solid var(--acc,#F1780F);border-radius:8px" value="' + (C.service || '') + '" placeholder="0" data-c="cserv">' + (function () { const g = JC().instSugg(FF); return g.sum ? '<div style="display:flex;flex-direction:column;gap:4px;margin-left:10px"><small class="mut" style="max-width:360px">По ставкам монтажа (ориентировочно): ' + e(g.text) + ' = <b>' + m(g.sum) + '</b></small><button class="btn sm" style="align-self:flex-start;' + (+C.service === g.sum ? 'opacity:.6' : '') + '" data-a="cservsug" data-v="' + g.sum + '">Подставить ' + m(g.sum) + '</button></div>' : ''; })()) +
      '<div class="cdisc"><label title="Со знаком минус — наценка">Скидка</label><div class="seg"><button class="' + (pct ? 'on' : '') + '" data-a="cdm" data-v="pct">%</button><button class="' + (!pct ? 'on' : '') + '" data-a="cdm" data-v="rub">₽</button></div><input class="ul num" type="number" style="width:72px" value="' + (C.disc || '') + '" data-c="cdisc" placeholder="0" title="Скидка; значение со знаком минус = наценка"' + (FF.fixed ? ' disabled' : '') + '><label title="Итоговая стоимость заказа, заданная вручную. Главнее скидки">Итог, ₽</label><input class="ul num" type="number" style="width:110px' + (FF.fixed ? ';font-weight:700' : '') + '" value="' + (C.fixTotal || '') + '" data-c="cfixt" placeholder="свой итог" title="Впиши итоговую сумму заказа: она станет главной, скидка отключится"></div></div>' + (FF.fixed ? '<div class="fixwarn"><svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M9 1.2 17 14.8H1z" fill="none" stroke="#d9381e" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 6v4.2" stroke="#d9381e" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="12.3" r="1" fill="#d9381e"/></svg><span>Стоимость задана менеджером, не расчётная: по прайсу ' + m(FF.total) + ', в заказ идёт ' + m(FF.netTotal) + ' (' + (FF.discAmt > 0 ? 'ниже расчёта на ' : 'выше расчёта на ') + m(Math.abs(FF.discAmt)) + ')</span></div>' : '') +
      '<div class="sumbar" style="grid-template-columns:repeat(' + (hide ? 2 : 4) + ',1fr)"><div><small>Сумма без скидки</small><b>' + m(FF.total) + '</b></div><div><small>Итого' + (FF.discAmt ? (FF.discAmt > 0 ? ' (скидка −' : ' (наценка +') + m(Math.abs(FF.discAmt)) + ')' : '') + '</small><b style="color:var(--acc)">' + m(FF.netTotal) + '</b></div>' +
      (hide ? '' : '<div><small>Закуп (оценка)</small><b>' + m(Math.max(0, cost)) + '</b></div><div><small>Прибыль</small><b' + (netProf < 0 ? ' style="color:var(--bad)"' : '') + '>' + m(netProf) + '</b></div>') + '</div>' +
      '<div class="cacts"><button class="btn pri" data-a="cord">' + (C.editNo ? 'Сохранить в ' + eno() : 'Оформить заказ') + '</button><button class="btn" data-a="creq" title="Клиент, телефон, адрес, предоплата, срок: заполни и вернись в расчёт">Реквизиты заказчика</button><button class="btn" data-a="cdraft">Сохранить как просчёт</button>' + (C.editNo && (rec0 => rec0 && (rec0.status === 'Черновик' || rec0.status === 'КП отправлено'))(DB.byKey(C.editNo)) ? '<button class="btn" data-a="ctoorder">Перевести в заказ</button>' : '') + '<button class="btn" data-a="cclear">Без сохранения</button></div></div></div>' +
      (O.open ? checkout() : '') + (DR.open ? draftModal() : '');
  }
  /* форма «Сохранить как просчёт»: ФИО, телефон, примечание и фото (всё необязательно), чтобы потом узнать расчёт */
  const DR = { open: false, name: '', phone: '', note: '', files: [] };
  function draftModal() {
    return '<div class="mback" data-a="drcancel"></div><div class="modal" style="width:min(520px,calc(100vw - 32px))"><div class="mhead"><h2>Сохранить как просчёт</h2><span class="sp"></span><button class="ib" data-a="drcancel" title="Закрыть">' + A.icon('close', 18) + '</button></div>' +
      '<div class="mbody"><p class="mut" style="margin:0 0 12px">Все поля необязательные: впиши то, что поможет потом быстро понять, чей это расчёт.</p>' +
      '<div class="fld"><label>ФИО</label><input class="ul" id="drname" value="' + e(DR.name) + '" data-c="drname" placeholder="Иван Петров"></div>' +
      '<div class="fld"><label>Телефон</label><input class="ul" value="' + e(DR.phone) + '" data-c="drphone" placeholder="+7 ___ ___-__-__"></div>' +
      '<div class="fld"><label>Примечание</label><textarea class="ul" rows="3" data-c="drnote" placeholder="Например: кухня и спальня, звонил с Авито">' + e(DR.note) + '</textarea></div>' +
      '<div class="fld"><label>Фото</label><div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><label class="btn" style="cursor:pointer">Приложить фото<input type="file" id="drpick" multiple accept="image/*,application/pdf" hidden></label>' +
      DR.files.map((f, i) => '<span class="pill">' + e(f.name) + ' <a href="#" data-a="drrm" data-i="' + i + '" title="Убрать" style="margin-left:4px">×</a></span>').join('') + '</div></div></div>' +
      '<div class="mfoot"><button class="btn" data-a="drcancel">Отмена</button><span class="sp"></span><button class="btn pri" data-a="drsave">Сохранить просчёт</button></div></div>';
  }
  document.addEventListener('change', ev => { if (ev.target.id === 'drpick') { DR.files = DR.files.concat(Array.from(ev.target.files || [])); rr(); } });
  A.fld.drname = v => { DR.name = v; }; A.fld.drphone = v => { DR.phone = v; }; A.fld.drnote = v => { DR.note = v; };
  A.act.drcancel = () => { DR.open = false; rr(); };
  A.act.drrm = el => { DR.files.splice(+el.dataset.i, 1); rr(); };
  /* оформление: окно по центру экрана, три шага: клиент, условия, документы и отправка */
  A.calcO = () => O;
  const eno = () => { const r = DB.byKey(JC().C.editNo); return r && r.no ? 'заказ № ' + r.no : 'просчёт'; }, cap = t => e(t.charAt(0).toUpperCase() + t.slice(1));
  const resetO = () => { Object.assign(O, O0(), { term: termDefault(), kept: false, req: false }); };
  const STEPS = ['Клиент', 'Условия', 'Документы'];
  function checkout() {
    const C = JC().C, q = O.q.trim().toLowerCase(), D = A.D, edit = !!C.editNo && !O.fresh, st = edit ? 1 : O.step, svc = !C.region && (+C.service || 0) > 0; const smOn = O.selfMeas == null ? !svc : !!O.selfMeas;
    const found = q.length >= 2 ? D.clients.filter(c => (c.name + ' ' + c.phone + ' ' + String(c.phone).replace(/\D/g, '')).toLowerCase().indexOf(q) >= 0).slice(0, 6) : [];
    const fld = (k, l) => '<div class="fld"><label>' + l + '</label><input class="ul" value="' + e(O[k]) + '" data-c="cof" data-k="' + k + '"></div>';
    let b = '';
    if (!edit && st === 0) {
      const yur = O.ct === 'yur', ip = O.ct === 'ip', reg = !!C.region, instOn = !reg && svc;
      const typ = '<div class="seg" style="align-self:flex-start">' + [['fiz', 'Физ. лицо'], ['yur', 'Юр. лицо'], ['ip', 'ИП']].map(t => '<button class="' + (O.ct === t[0] ? 'on' : '') + '" data-a="coct" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
      const innRow = (yur || ip) ? '<div class="fld"><label>ИНН</label><div class="row" style="gap:8px"><input class="ul num" inputmode="numeric" value="' + e(O.inn) + '" data-c="cof" data-k="inn"><button class="btn" data-a="cinn" style="flex:none">' + (O.innBusy ? 'Ищу…' : 'Найти по ИНН') + '</button></div>' + (O.innMsg ? '<small style="color:' + (O.innOk ? 'var(--ok)' : 'var(--bad)') + '">' + e(O.innMsg) + '</small>' : '') + '</div>' : '';
      const fields = yur ? [innRow, fld('company', 'Название'), fld('ogrn', 'ОГРН'), fld('uaddr', 'Юридический адрес'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('repr', 'ФИО представителя'), fld('email', 'E-mail'), instOn ? fld('addr', 'Адрес установки') : '', fld('bank', 'Банковские реквизиты')]
        : ip ? [innRow, fld('name', 'ФИО индивидуального предпринимателя'), fld('ogrn', 'ОГРНИП'), fld('uaddr', 'Адрес регистрации'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('email', 'E-mail'), instOn ? fld('addr', 'Адрес установки') : '', fld('bank', 'Банковские реквизиты')]
        : [fld('name', 'ФИО'), fld('phone', 'Телефон'), fld('phone2', 'Доп. телефон'), fld('email', 'E-mail'), fld('addr', reg ? 'Адрес получателя' : instOn ? 'Адрес установки' : 'Адрес')];
      b = '<div class="fld"><label>Найти клиента в базе</label><input class="ul" id="cofq" value="' + e(O.q) + '"></div>' +
        (found.length ? '<div class="chips" style="margin:8px 0">' + found.map(c => '<button class="btn sm" data-a="cofpick" data-id="' + c.id + '">' + e(c.name) + (c.phone ? ' · ' + e(c.phone) : '') + '</button>').join('') + '</div>' : '') +
        '<div style="margin-top:14px">' + typ + '</div><div class="fgrid cgrid" style="margin-top:12px">' + fields.join('') + '</div>' +
        (reg ? '<div class="fld" style="margin-top:12px"><label>Отправка: адрес ПВЗ и транспортная компания</label><input class="ul" value="' + e(C.pvz || '') + '" data-c="cpvz"></div>' : '');
    } else if (st === 1) {
      b = (edit ? '<div class="mut sm" style="margin-bottom:10px">Состав обновится, клиент и условия останутся как были.</div>' : '<div class="fgrid"><div class="fld"><label>Предоплата</label><div class="row" style="gap:8px"><input class="ul num" value="' + e(O.pre) + '" data-c="cof" data-k="pre"><select class="ul" style="width:64px" data-c="cof" data-k="preU"><option' + (O.preU !== '₽' ? ' selected' : '') + '>%</option><option' + (O.preU === '₽' ? ' selected' : '') + '>₽</option></select></div></div>' + fld('term', 'Срок изготовления, календарных дней') + (instOn ? '<div class="fld"><label>Оплата монтажника, ₽ <span class="mut">(необязательно)</span></label><input class="ul num" placeholder="по расценкам" value="' + e(O.instPay) + '" data-c="cof" data-k="instPay"></div>' : '') + '</div>') +
        (edit ? '' : '<div style="margin-top:14px"><button class="oc ' + (smOn ? 'on' : '') + '" data-a="cosm" title="Включено: в договоре будет, что замер делает заказчик и отвечает за размеры. Выключено: замер делает продавец, этот текст из договора убирается">Замер делает заказчик</button></div>') + '<div class="fld" style="margin-top:14px"><label>Примечания</label><textarea class="ul ta" rows="4" data-c="cof" data-k="note">' + e(O.note) + '</textarea></div>';
    } else {
      b = '<div class="mdocs"><button class="btn" data-a="cdoc" data-fn="kpHtml">КП</button><button class="btn" data-a="cdoc" data-fn="kpVarHtml">КП три варианта</button><button class="btn" data-a="codoc" data-fn="zamernikHtml">Замерник</button><button class="btn" data-a="codoc" data-fn="dogovorHtml">Договор</button><button class="btn" data-a="codoc" data-fn="aktHtml">Акт приёмки-передачи</button></div>' +
        '<div class="fld" style="margin-top:18px"><label>Отправить клиенту КП</label><div class="chs"><button class="btn" data-a="csend" data-ch="wa">WhatsApp</button><button class="btn" data-a="csend" data-ch="tg">Telegram</button><button class="btn" data-a="csend" data-ch="max">Макс</button><button class="btn" data-a="csend" data-ch="mail">Почта</button></div></div>';
    }
    return '<div class="mback" data-a="cocancel"></div><div class="modal"><div class="mhead"><h2>' + (C.editNo && !O.fresh ? cap(eno()) : O.req ? 'Реквизиты заказчика' : 'Оформление заказа') + '</h2><span class="sp"></span><button class="ib" data-a="cocancel" title="Закрыть">' + A.icon('close', 18) + '</button></div>' +
      (edit ? '' : '<div class="mtabs">' + STEPS.slice(0, O.req ? 2 : 3).map((t, i) => '<button class="' + (st === i ? 'on' : '') + '" data-a="costep" data-v="' + i + '">' + (i + 1) + '. ' + t + '</button>').join('') + '</div>') +
      '<div class="mbody">' + b + '</div>' +
      '<div class="mfoot"><button class="btn" data-a="cocancel">Отмена</button><span class="sp"></span>' + (!edit && st > 0 ? '<button class="btn" data-a="costep" data-v="' + (st - 1) + '">Назад</button>' : '') +
      (O.req ? (!edit && st < 1 ? '<button class="btn pri" data-a="conext">Далее</button>' : '<button class="btn pri" data-a="coreq">Сохранить и вернуться в расчёт</button>') : !edit && st < 2 ? '<button class="btn pri" data-a="conext">Далее</button>' : '<button class="btn pri" data-a="cosave">Сохранить заказ</button>') + '</div></div>';
  }

  A.module('calc', {
    render() { const C = JC() ? JC().C : {}, E = window.Eng, when = E && E.at ? new Date(E.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      return '<div class="head" style="display:flex;align-items:center;gap:12px"><h1>' + (C.editNo ? cap(eno()) : 'Новый заказ') + '</h1><button class="btn pri sm" data-a="cnew" title="Очистить корзину и все поля, начать с нуля">Новый расчёт</button><span class="sp"></span>' + (when ? '<span class="mut sm">Цены из таблицы: ' + e(when) + '</span>' : '') + '<button class="btn sm" data-a="cprices" title="Загрузить свежие цены, наличие и ткани из Google Таблицы">Обновить цены</button></div><div class="calcwrap">' + form() + cart() + '</div>'; }
  });

  /* ===== Tab по полям формы: слева направо, сверху вниз; выпадающее поле открывается сразу ===== */
  let want = null, kbd = false, tabSel = false;
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
    kbd = true; tabSel = true;
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
      const cur = document.activeElement, sel = tabSel; tabSel = false;
      if (sel && cur.matches && cur.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=file])')) { try { cur.select(); } catch (x) {} }
      if (cur.matches && cur.matches('select')) { try { cur.showPicker(); } catch (x) {} }
      else if (cur.matches && cur.matches('[data-a=ccol]') && !F.colOpen) { F.colOpen = cur.dataset.v === 'win' || cur.dataset.v === 'fab2' ? cur.dataset.v : true; F.cq = ''; want = '#ccolq'; rr(); }
      else if (cur.matches && cur.matches('[data-a=cauto]') && !F.autoOpen) { F.autoOpen = true; rr(); }
    }, 0);
  });
  A.fld.cmodel = v => { if (v === 'auto' || v === 'blinds' || v === 'rolo' || v === 'zebra' || v === 'vert' || v === 'gja' || v === 'roof' || v === 'roman' || v === 'mirage' || v === 'plisse') { const m = v === 'zebra' || v === 'vert' || v === 'rolo' || v === 'gja' || v === 'roof' || v === 'roman' || v === 'mirage' || v === 'plisse' ? v : ''; if (m) { if (RMM() !== m) { R.sys = ''; R.fab = ''; R.sel = {}; R.flags = {}; R.vf = null; R.tch = {}; } R.z = m === 'zebra'; R.v = m === 'vert'; R.g = m === 'gja'; R.rf = m === 'roof'; R.mr = m === 'roman' || m === 'mirage' || m === 'plisse' ? m : ''; } F.mode = m ? 'rolo' : v; F.colOpen = false; F.autoOpen = false; F.cq = ''; rr(); if ((m === 'zebra' && !RJ().systems(true).length) || (m === 'vert' && !RJ().systems('vert').length) || (m === 'gja' && !RJ().systems('gja').length) || (m === 'roof' && !RJ().systems('roof').length) || ((m === 'roman' || m === 'mirage' || m === 'plisse') && !RJ().systems(m).length)) A.act.cprices(); } };
  A.fld.ctype = v => { const p = String(v).split('|'); F.mat = p[0]; F.lam = +p[1]; F.color = ''; F.colOpen = false; rr(); };
  /* при смене поставщика тип, управление, фиксация и опции сохраняются, если он их поддерживает (иначе norm подставит допустимое) */
  A.fld.csup = v => { F.sup = v; F.colOpen = false; F.auto = { drive: '', remote: '' }; rr(); };
  A.act.cwire = el => { F.auto = Object.assign({ drive: '', remote: '' }, F.auto, { wire: el.dataset.v }); rr(); };
  A.act.cwirec = el => { JC().setWireAt(+el.dataset.i, el.dataset.v); rr(); };
  A.fld.rau = (v, el) => { R.auto = Object.assign({ drive: '', remote: '', wire: '' }, R.auto, { [el.dataset.k]: v }); rr(); };
  A.act.rwire = el => { R.auto = Object.assign({ drive: '', remote: '', wire: '' }, R.auto, { wire: el.dataset.v }); rr(); };
  A.fld.cau = (v, el) => { F.auto = Object.assign({ drive: '', remote: '' }, F.auto, { [el.dataset.k]: v }); rr(); };
  A.fld.cfix = v => { F.fix = v; rr(); };
  A.fld.rrm = v => { R.rm = v; R.rw = ''; F.colOpen = false; F.cq = ''; rr(); };
  A.fld.rsys = v => { R.sys = v; if (!R.g && !R.v && !R.z && !R.mr) R.rf = /^ROOF/.test(v); R.sel = {}; R.flags = {}; R.tch = {}; R.tubeLock = false; rr(); };
  A.fld.rf = (v, el) => { const k = el.dataset.k; R[k] = k === 'qty' ? Math.max(1, Math.min(99, +v || 1)) : v; rr(); };
  A.fld.vf = (v, el) => { R.vf = Object.assign(VF0(), R.vf || {}); R.vf[el.dataset.k] = v; rr(); };
  A.act.rf = el => { R[el.dataset.k] = el.dataset.v; rr(); };
  A.fld.ropt = (v, el) => { R.sel[el.dataset.k] = v; if (el.dataset.k === 'Кронштейны' && v !== 'Металлические' && R.flags['Монтажный профиль'] === false) delete R.flags['Монтажный профиль']; if (el.dataset.k === 'Труба') R.tubeLock = true; if (el.dataset.k === 'Кронштейны' && v === 'Металлические' && R.flags['Монтажный профиль']) { R.flags['Монтажный профиль'] = false; A.toast('Монтажный профиль снят: с металлическими кронштейнами его не ставят'); } rr(); };
  A.act.rphoto = () => { R.photo = !R.photo; rr(); };
  A.act.vside = el => { R.vf = Object.assign(VF0(), R.vf || {}); R.vf.side = el.dataset.v; rr(); };
  A.act.gck = el => { R.vf = Object.assign(VF0(), R.vf || {}); R.vf.ck = el.dataset.v; rr(); };
  A.act.rflag = el => { if (el.dataset.v === 'Монтажный профиль' && R.sel['Кронштейны'] === 'Металлические') { A.toast('Монтажный профиль нельзя с металлическими кронштейнами: выбери пластиковые'); return; } if (el.dataset.v === 'Редуктор и цепь-петля' && RJ().venusReducer(R.sys, +R.w || 0, +R.h || 0)) return; R.flags[el.dataset.v] = !R.flags[el.dataset.v]; (R.tch = R.tch || {})[el.dataset.v] = true; rr(); };
  A.act.rqty = el => { R.qty = Math.max(1, Math.min(99, (+R.qty || 1) + (+el.dataset.d))); rr(); };
  A.act.cqty = el => { F.qty = Math.max(1, Math.min(99, (+F.qty || 1) + (+el.dataset.d))); rr(); };
  A.act.cdraft = () => {
    const J = JC(), C = J.C; if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    if (!J.toOrder().items.length) { A.toast('В корзине нет изделий с ценой'); return; }
    { const wm = J.wireMissing(); if (wm.length) { A.toast('Укажи, с какой стороны выходит провод привода (позиция ' + wm.join(', ') + ')'); return; } }
    const old = C.editNo ? DB.byKey(C.editNo) : null;
    if (old && old.status === 'Оплачен') { A.toast('Заказ оплачен: это уже не просчёт. Используй «Сохранить в заказ»'); return; }
    Object.assign(DR, { open: true, name: old ? old.name || '' : '', phone: old ? old.phone || '' : '', note: old ? old.comment || '' : '', files: [] });
    rr(); setTimeout(() => { const i = document.getElementById('drname'); if (i) i.focus(); }, 0);
  };
  A.act.drsave = async () => {
    const J = JC(), C = J.C;
    const co = J.toOrder(); if (!co.items.length) { A.toast('В корзине нет изделий с ценой'); return; }
    { const wm = J.wireMissing(); if (wm.length) { A.toast('Укажи, с какой стороны выходит провод привода (позиция ' + wm.join(', ') + ')'); return; } }
    const total = Math.max(0, co.items.reduce((a, i) => a + (+i.price || 0), 0) - (+co.disc || 0)), reg = !!C.region, pvz = (C.pvz || '').trim(), editing = !!C.editNo;
    const old = editing ? DB.byKey(C.editNo) : null;
    if (old && old.status === 'Оплачен') { A.toast('Заказ оплачен: это уже не просчёт. Используй «Сохранить в заказ»'); return; }
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: reg ? 0 : co.delivery, cart: J.snapshot(), region: reg, pvz: reg ? pvz : '', status: 'Черновик' };
    if (!editing) Object.assign(data, { name: '', phone: '', addr: '', install: !reg && (+co.delivery || 0) > 0, buyer: 'физ', pre: '100', preU: '%', term: termDefault(), note: reg && pvz ? 'Отправка (ПВЗ, ТК): ' + pvz : '' });
    if (DR.name.trim()) data.name = DR.name.trim(); if (DR.phone.trim()) data.phone = DR.phone.trim(); if (DR.note.trim()) data.comment = DR.note.trim();
    const rec = DB.saveOrder(data, co.items, editing ? C.editNo : null, 'Просчёт (компьютер)', m(total));
    const pics = DR.files; DR.open = false; DR.files = [];
    J.clear(); resetO(); Object.assign(F, { edit: -1 }); A.toast('Сохранено как просчёт: вкладка «Просчёты» в «Заказах»');
    A.S.selOrder = 'ph' + rec.uid; A.S.ordersFilter = 'calc'; A.S.orderTab = 'main'; A.save(); A.open('orders');
    if (pics.length && A.attachFiles) { A.toast('Загружаю фото…'); await A.attachFiles(rec.uid, pics); }
  };
  A.act.cf = el => { const k = el.dataset.k, v = el.dataset.v; F[k] = k === 'lam' ? +v : v; if (k === 'sup') F.colOpen = false; rr(); };
  A.fld.cf = (v, el) => { const k = el.dataset.k; F[k] = k === 'qty' ? Math.max(1, Math.min(99, +v || 1)) : v; rr(); };
  A.act.copt = el => { const v = el.dataset.v, on = !F.opts[v]; F.opts[v] = on; if (on && /^Цепочка/.test(v)) ['Цепочка', 'Цепочка металлическая', 'Цепочка металлическая цветная'].forEach(k => { if (k !== v) delete F.opts[k]; }); if (!F.opts['Цепочка'] && !F.opts['Цепочка металлическая'] && !F.opts['Цепочка металлическая цветная']) F.chainCol = ''; rr(); };
  A.act.cchc = el => { F.chainCol = el.dataset.v; rr(); };
  A.act.ccol = el => { let v = (el && el.dataset && el.dataset.v) || true; if (v === 'fab') v = true; F.colOpen = F.colOpen === v ? false : v; F.cq = ''; rr(); };
  A.act.ccolpick = el => { if (F.mode === 'rolo') { if (F.colOpen === 'win') R.rw = el.dataset.v; else if (F.colOpen === 'fab2') R.fab2 = el.dataset.v; else R.fab = el.dataset.v; } else F.color = el.dataset.v; F.colOpen = false; F.cq = ''; rr(); };
  document.addEventListener('input', ev => { if (ev.target.id === 'ccolq' && ev.target.value !== F.cq) A.fld.ccolq(ev.target.value); });
  A.fld.ccolq = v => { F.cq = v; rr(); const q = document.getElementById('ccolq'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
  A.act.cprices = () => { A.toast('Обновляю цены…'); Eng.refresh().then(() => { A.toast('Цены обновлены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.fld.cscript = v => { const u = String(v).trim(); if (!u) return; try { localStorage.setItem('jal_prices_url', u); } catch (x) {} A.toast('Загружаю цены…'); Eng.refresh().then(() => { A.toast('Цены загружены'); rr(); }).catch(x => A.toast('Ошибка: ' + x.message)); };
  A.act.creg = el => { JC().setRegion(el.dataset.v === '1'); rr(); };
  A.act.chide = () => { S.showCost = !S.showCost; A.save(); rr(); };
  A.act.cdm = el => { JC().C.discMode = el.dataset.v; JC().save(); rr(); };
  A.fld.cship = v => { const C = JC().C, t = String(v).replace(/\s/g, ''); C.shipFix = t === '' ? '' : Math.max(0, Math.round(+t || 0)); JC().save(); rr(); };
  A.fld.cfixt = v => { const C = JC().C; C.fixTotal = Math.max(0, Math.round(+String(v).replace(/\s/g, '') || 0)) || ''; JC().save(); rr(); };
  A.fld.cdisc = v => { const C = JC().C; C.disc = (+v || 0) || ''; JC().save(); rr(); };
  A.act.cservsug = el => { JC().C.service = +el.dataset.v || 0; JC().save(); rr(); };
  A.fld.cserv = v => { const n = Math.round(+String(v).replace(/\s/g, '') || 0); if (n < 0) A.toast('Доставка и установка не может быть отрицательной'); JC().C.service = Math.max(0, n); JC().save(); rr(); };
  A.fld.cprice = (v, el) => { const C = JC().C, i = +el.dataset.i, s = String(v).replace(/\s/g, ''); if (!C.cart[i]) return; C.cart[i] = Object.assign({}, C.cart[i], { own: s === '' ? '' : Math.max(0, Math.round(+s || 0)) }); JC().save(); rr(); };
  A.act.cdel = el => { const C = JC().C; C.cart.splice(+el.dataset.i, 1); JC().save(); rr(); };
  A.act.cclear = () => { JC().clear(); resetO(); rr(); };
  /* «Новый расчёт»: корзина, скидка, итог, клиент и поля изделия — всё в ноль; выбранные модель и поставщик остаются */
  /* окно реквизитов заказчика отдельно от оформления: данные остаются в форме, вернуться в расчёт можно в любой момент */
  A.act.creq = () => { const C = JC().C; if (!C.editNo && !O.kept) resetO(); O.req = true; O.step = 0; O.open = true; rr(); };
  A.act.coreq = () => { O.kept = true; O.req = false; O.open = false; rr(); A.toast('Реквизиты сохранены, можно продолжать расчёт'); };
  A.act['new-order'] = () => { A.open('calc'); setTimeout(() => { A.act.cnew(); A.act.creq(); }, 0); };
  A.act.cnew = () => {
    JC().clear(); resetO();
    Object.assign(F, { color: '', colOpen: false, cq: '', w: '', h: '', qty: 1, ctrl: '', fix: '', opts: {}, chainCol: '', auto: { drive: '', remote: '' }, own: '', note: '', edit: -1 });
    Object.assign(R, { fab: '', fab2: '', rw: '', fq: '', w: '', h: '', qty: 1, vf: null, sel: {}, flags: {}, own: '', note: '', edit: -1 });
    Object.assign(CU, { title: '', price: '', sum: '', qty: 1, cost: '', drv: 'price' }); Object.assign(DR, { open: false, name: '', phone: '', note: '', files: [] });
    rr(); A.toast('Новый расчёт: корзина и поля очищены');
  };
  A.act.cocancel = () => { if (O.req) O.kept = true; O.req = false; O.open = false; rr(); };
  const load = (it, edit) => { if (it.prod === 'rolo') { Object.assign(F, { mode: 'rolo', colOpen: false, cq: '' }); Object.assign(R, { z: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'zebra'), v: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'vert'), g: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'gja'), rf: !!(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'roof'), pt: (RJ() && RJ().pl && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model === 'plisse') ? RJ().pl.typeOf(it.sys, it.fab) : '', plhelp: false, mr: (m => m === 'roman' || m === 'mirage' || m === 'plisse' ? m : '')(RJ() && RJ().sysOf(it.sys) && RJ().sysOf(it.sys).model), rw: it.rw || '', rm: (RJ() && RJ().winOf(it.rw) || {}).man || R.rm, fab2: it.fab2 || '', sys: it.sys, fab: it.fab, w: String(it.w), h: String(it.h), qty: it.qty || 1, ctrl: it.ctrl || 'L', vf: it.vf ? Object.assign(VF0(), it.vf) : null, sel: Object.assign({}, it.sel), flags: Object.assign({}, it.flags), auto: Object.assign({ drive: '', remote: '', wire: '' }, it.auto), tch: { 'Разведенное управление': true, 'Шнур с петлями': true }, own: it.own === '' || it.own == null ? '' : String(it.own), note: it.note || '', edit }); rr(); return; }
    F.mode = 'blinds'; Object.assign(F, { sup: it.sup, lam: it.lam, mat: it.mat, color: it.color || '', ctrl: it.ctrl || '', fix: it.fix || '', chainCol: it.chainCol || '', opts: Object.assign({}, it.opts), auto: Object.assign({ drive: '', remote: '' }, it.auto), w: String(it.w), h: String(it.h), qty: it.qty || 1, own: it.own === '' || it.own == null ? '' : String(it.own), note: it.note || '', edit, colOpen: false }); rr(); };
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
  A.act.cx = el => { CX[el.dataset.i] = !CX[el.dataset.i]; rr(); };
  A.act.cdup = el => load(JC().C.cart[+el.dataset.i], -1);
  A.act.cedcancel = () => { F.edit = -1; R.edit = -1; rr(); };
  A.act.cadd = () => {
    if (F.mode === 'rolo') {
      const pl = R.mr === 'plisse', n = pl ? normPl() : normRolo(); if (!n.r.ok) { A.toast(n.r.msg || 'Заполните форму'); return; }
      if (pl && n.m && n.m.el && !R.auto.drive) { A.toast('У электро-модели выбери комплект привода'); return; }
      if (pl && plCtl() && !RMOT() && !R.ctrl) { A.toast('Выбери сторону управления'); return; }
      if (!pl && !R.rf && !RMOT() && R.sys !== 'UNI-2П' && (VG() ? !(R.vf && R.vf.side) : !R.ctrl)) { A.toast('Выбери сторону управления'); return; }
      if (R.auto && R.auto.drive && JC().wireInfo({ sup: 'Amigo', auto: { drive: R.auto.drive } }) && !R.auto.wire) { A.toast('Выбери, с какой стороны выходит провод привода'); return; }
      const own = R.own !== '' && !isNaN(+R.own) && +R.own >= 0 ? Math.round(+R.own) : '';
      const item = Object.assign(roloItem(), { qty: Math.max(1, +R.qty || 1), own, note: R.note, sel: Object.assign({}, R.sel), flags: Object.assign({}, R.flags) });
      if (R.edit >= 0) JC().replaceItem(R.edit, item); else JC().addItem(item);
      Object.assign(R, { qty: 1, own: '', note: '', edit: -1, tch: {}, auto: { drive: '', remote: '', wire: '' } }); A.toast('Добавлено в корзину'); rr(); return;
    }
    const n = norm(); if (!n.r.ok) { A.toast(n.r.needColor ? 'Выбери цвет' : (n.r.msg || 'Введи размеры')); return; }
    if (!n.ctrl && !n.auto.drive) { A.toast('Выбери сторону управления'); return; }
    if (n.auto.drive && JC().wireInfo({ sup: F.sup, auto: { drive: n.auto.drive } }) && !n.auto.wire) { A.toast('Выбери, с какой стороны выходит провод привода'); return; }
    const own = F.own !== '' && !isNaN(+F.own) && +F.own >= 0 ? Math.round(+F.own) : '';
    const item = { chainCol: n.chainCol || undefined, sup: F.sup, lam: n.lam, mat: n.mat, color: n.color, ctrl: n.auto.drive ? '' : n.ctrl, fix: n.fix, opts: Object.assign({}, n.opts), auto: n.auto.drive || n.auto.remote ? Object.assign({}, n.auto) : undefined, w: +F.w, h: +F.h, qty: Math.max(1, +F.qty || 1), own, note: F.note };
    if (F.edit >= 0) JC().replaceItem(F.edit, item); else JC().addItem(item);
    Object.assign(F, { qty: 1, own: '', note: '', edit: -1, auto: { drive: '', remote: '' } }); A.toast('Добавлено в корзину'); rr();
  };
  A.fld.cof = (v, el) => { O[el.dataset.k] = v; };
  A.act.cosm = () => { const C = JC().C, instOn = !C.region && (+C.service || 0) > 0; O.selfMeas = !(O.selfMeas == null ? !instOn : O.selfMeas); A.render(); };
  document.addEventListener('input', ev => { if (ev.target.id === 'cofq') cofq(ev.target.value); });
  const cofq = v => { O.q = v; rr(); const q = document.getElementById('cofq'); if (q) { q.focus(); q.setSelectionRange(v.length, v.length); } };
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
    if (fill) Object.assign(data, { name: cl, phone: DB.phoneFmt(O.phone.trim()), phone2: DB.phoneFmt(O.phone2.trim()), comment: O.comment.trim(), email: O.email.trim(), addr: O.addr.trim(), install: !reg && (+C.service || 0) > 0, buyer: yur ? 'юр' : ip ? 'ип' : 'физ', company: yur ? O.company.trim() : '', inn: yur || ip ? O.inn.replace(/\D/g, '') : '', uaddr: yur || ip ? O.uaddr.trim() : '', ogrn: yur || ip ? O.ogrn.trim() : '', bank: yur || ip ? O.bank.trim() : '', status: autoStatus(), pre: O.pre === '' ? '100' : O.pre, preU: O.preU, instCost: String(O.instPay).replace(/\s/g, '') !== '' && !reg ? Math.max(0, Math.round(+String(O.instPay).replace(/\s/g, '').replace(',', '.') || 0)) : undefined, term: O.term || '12', selfMeas: O.selfMeas == null ? (!reg && (+C.service || 0) > 0 ? false : true) : !!O.selfMeas,
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
    const wm = JC().wireMissing(); if (wm.length) { A.toast('Укажи, с какой стороны выходит провод привода (позиция ' + wm.join(', ') + ')'); return false; }
    return true;
  }
  /* срок по умолчанию: 12 дней для дерева и прочего, у рулонок срок завода + 5 дней (берём самый долгий) */
  const termDefault = () => { const cart = JC().C.cart, rt = cart.filter(x => x.prod === 'rolo').reduce((mx, x) => Math.max(mx, (RJ() && RJ().termFor(x)) || 0), 0), other = cart.some(x => !x.prod && x.kind !== 'custom' || x.kind === 'drive');
    return String(rt && !other ? rt : Math.max(12, rt)); };
  A.act.cord = () => {
    const C = JC().C; if (!C.cart.length) { A.toast('Корзина пуста'); return; }
    if (!O.open) {
      if (!C.editNo && !O.kept) resetO();
      O.open = true; O.req = false; rr(); return;
    }
    A.act.cosave();
  };
  A.act.ctoorder = () => {
    if (!checkReady()) return;
    const J = JC(), rec = persist(); DB.patchRec(rec.uid, { status: 'Договор' }); const no = DB.ensureNo(rec.uid); DB.addEvent(rec.uid, 'Договор', 'просчёт переведён в заказ');
    J.clear(); resetO(); Object.assign(F, { edit: -1 });
    A.S.selOrder = 'ph' + rec.uid; A.S.orderTab = 'items'; A.S.ordersFilter = 'all'; A.save(); A.toast('Просчёт стал заказом № ' + no); A.open('orders');
  };
  A.act.cosave = () => {
    if (!checkReady()) return;
    const J = JC(), rec = persist();
    J.clear(); resetO(); Object.assign(F, { edit: -1 });
    A.S.selOrder = 'ph' + rec.uid; A.S.orderTab = 'items'; A.S.ordersFilter = (rec.status === 'Черновик' || rec.status === 'КП отправлено') ? 'calc' : 'all'; A.save();
    A.toast(rec.no && A.S.ordersFilter === 'all' ? 'Заказ № ' + rec.no + ' сохранён' : 'Просчёт сохранён'); A.open('orders');
  };
  /* замерник и договор строятся по сохранённому заказу: сохраняем и открываем */
  A.act.codoc = el => {
    if (!checkReady()) return;
    const fn = el.dataset.fn, rec = persist(); if (fn === 'dogovorHtml' || fn === 'aktHtml') DB.ensureNo(rec.uid);
    if (fn === 'aktHtml') { A.docOpen(fn, rec.uid); return; }
    if (fn === 'dogovorHtml') { O.dog = true; DB.patchRec(rec.uid, { status: 'Договор' }); DB.addEvent(rec.uid, 'Договор', 'договор сформирован'); } else { DB.patchRec(rec.uid, { zamDone: true }); DB.addEvent(rec.uid, 'Замер', 'замерник сформирован'); }
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
      O.sent = true; DB.patchRec(uid, { status: O.dog ? 'Договор' : 'КП отправлено', sent: new Date().toISOString().slice(0, 10) }); DB.addEvent(uid, 'КП отправлено', ch === 'wa' ? 'WhatsApp' : ch === 'tg' ? 'Telegram' : ch === 'max' ? 'Макс' : 'почта');
      const shared = ch !== 'mail' && window.JalExport && await JalExport.share([file], text, 'Жалюзи-СПБ, коммерческое предложение');
      if (!shared) {
        JalExport.save(file);
        const d = String(O.phone || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7'), enc = encodeURIComponent;
        const url = ch === 'wa' ? 'https://wa.me/' + d + '?text=' + enc(text) : ch === 'tg' ? 'https://t.me/' + (d ? '+' + d : '') : ch === 'max' ? 'https://max.ru/' : 'mailto:' + O.email.trim() + '?subject=' + enc('Жалюзи-СПБ, коммерческое предложение') + '&body=' + enc(text);
        window.open(url, '_blank'); A.toast('КП скачан: приложи файл к сообщению');
      }
      rr();
    } catch (x) { A.toast('Не получилось: ' + (x && x.message || x)); }
  };
})();
