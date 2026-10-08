/* Главный экран «Расчёт»: разметка из макета (Main.dc.html) + данные из ядра JalCalc. */
(function () {
  'use strict';
  const D = window.JAL_DATA, LM = window.JalLimits;
  const ENG = { Amigo: 'Амиго', Foroom: 'Форум' };
  const eng = s => ENG[s] || s;
  const SUPS = ['Amigo', 'Интерьер', 'РДО', 'Foroom', 'Уют'];
  const COLL = { Amigo: 'Стандарт', 'Интерьер': 'Классик', 'РДО': 'Урбан', Foroom: 'Тренд', 'Уют': 'Премиум' };
  const FIXLBL = { 'Ниж. фиксация': 'Уголки' };
  const CTRL_NAMES = { L: 'Поворот и подъём слева', R: 'Поворот и подъём справа', TL: 'Поворот слева, подъём справа', TR: 'Поворот справа, подъём слева' };
  const CHAIN_NAMES = { L: 'Управление слева', R: 'Управление справа' };
  const CTRL_ORDER = { 50: ['TL', 'TR', 'L', 'R'], 25: ['L', 'R', 'TL', 'TR'] };
  // 50 мм: подъём = 1 шнур, поворот = 2 шнура рядом. 25 мм: подъём = тонкий шнур, поворот = толстый прутик. Цепочка = «бусины».
  const DRAW = {
    50: { L: ['M5 6v23M7.5 6v23M11 6v19', ''], R: ['M29 6v23M26.5 6v23M23 6v19', ''], TL: ['M5 6v23M7.5 6v23M28 6v19', ''], TR: ['M6 6v19M26.5 6v23M29 6v23', ''] },
    25: { L: ['M11 6v19', 'M6 6v23'], R: ['M23 6v19', 'M28 6v23'], TL: ['M28 6v19', 'M6 6v23'], TR: ['M6 6v19', 'M28 6v23'] }
  };
  const DRAW_CHAIN = { L: 'M7 8v20', R: 'M27 8v20' };
  const DOT = { 2: '#2E9E48', 1: '#E0A800', 0: '#D64545' };
  const STOCK_TXT = { 2: 'есть на складе', 1: 'мало, уточни у технологов', 0: 'нет на складе' };
  const FT_MM = { 4: 1210, 5: 1520, 6: 1820, 7: 2130, 8: 2430, 9: 2740, 10: 3040 };
  const LVL = { 'нет': 0, 'мало': 1, 'есть': 2 };
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const rnd = x => Math.floor(x + 0.5);

  const S = { mode: 'blinds', q: '', w: '', h: '', sup: 'Amigo', lam: 50, mat: 'Дерево', qty: 1, color: '', colorOpen: false,
    ctrl: 'TR', fix: '', opts: {}, supOpen: false, justAdded: false, recent: [], editIdx: -1 };
  try { S.recent = JSON.parse(localStorage.getItem('jal_recent') || '[]'); } catch (e) {}
  let P = null, mounted = null;
  let STOCK = { rdo: D.RDO_STOCK, int: D.INT_STOCK, fo: D.FOROOM_STOCK, am: {} };

  const themeCls = () => { try { const o = JSON.parse(localStorage.getItem('jal_theme') || '{}'); return 'p' + ((o.pal | 0) % 5) + ((o.theme === 'night' || (o.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)) ? ' nt' : ''); } catch (e) { return 'p0'; } };

  /* Наличие из листа «Наличие» (если он есть в таблице цен). */
  function setSheets(sheets) {
    P = JalCalc.makePrice(sheets);
    const sh = sheets['Наличие'];
    if (!sh || sh.length < 2) return;
    const head = sh[0], rows = sh.slice(1).map(r => { const o = {}; head.forEach((h, i) => { o[h] = r[i]; }); return o; });
    const rdo = {}, int = {}, fo = {}, am = {};
    rows.forEach(r => {
      const lv = LVL[r['Статус']]; if (lv === undefined) return;
      const prod = r['Продукт'], cm = Number(r['Длина_см']), col = String(r['Цвет'] || '');
      const sup = r['Поставщик'];
      if (sup === 'РДО') {
        const ft = Object.keys(FT_MM).find(f => Math.abs(FT_MM[f] / 10 - cm) < 3); if (!ft) return;
        const k = prod + '|' + col.toLowerCase(); (rdo[k] = rdo[k] || {})[ft] = lv + 1;
      } else if (sup === 'Интерьер') {
        const kd = { 'ламель': 'л', 'нижняя планка': 'п', 'валанс': 'в' }[r['Серия']]; if (!kd || !cm) return;
        const k = prod + '|' + String(r['Артикул']).replace('K', 'К').toUpperCase(); const o = (int[k] = int[k] || {}); (o[kd] = o[kd] || {})[cm] = lv;
      } else if (sup === 'Форум' || sup === 'Foroom') fo[r['Артикул']] = lv;
      else if (sup === 'Амиго' || sup === 'Amigo') { const k = prod + '|' + col.toLowerCase(); (am[k] = am[k] || {})[cm || 0] = lv; }
    });
    STOCK = { rdo: Object.keys(rdo).length ? rdo : STOCK.rdo, int: Object.keys(int).length ? int : STOCK.int,
      fo: Object.keys(fo).length ? fo : STOCK.fo, am };
  }

  /* 2 есть, 1 мало, 0 нет, null — данных о наличии нет. */
  function stockOf(prod, key, sup, w) {
    if (sup === 'Foroom') return STOCK.fo[key] !== undefined ? STOCK.fo[key] : 2;
    if (sup === 'Интерьер') {
      const d = STOCK.int[prod + '|' + key.replace('K', 'К').toUpperCase()];
      if (d) {
        let r = 2;
        ['л', 'п', 'в'].forEach(k => {
          const best = Object.keys(d[k] || {}).map(Number).filter(l => l * 10 >= w + 50).reduce((m, l) => Math.max(m, d[k][l]), 0);
          r = Math.min(r, best);
        });
        return r;
      }
    }
    if (sup === 'РДО') {
      const d = STOCK.rdo[prod + '|' + key.toLowerCase()];
      if (d) {
        const fts = Object.keys(d).map(Number).filter(f => FT_MM[f] >= w + 50).sort((a, b) => a - b);
        return fts.length ? d[fts[0]] - 1 : 0;
      }
    }
    if (sup === 'Amigo') {
      const d = STOCK.am[prod + '|' + String(key).toLowerCase()];
      if (d) return Object.keys(d).map(Number).filter(l => !l || l * 10 >= w + 50).reduce((m, l) => Math.max(m, d[l]), 0);
    }
    return null;
  }

  function colorsFor(sup, prod) {
    if (sup === 'Amigo') {
      const par = P.par, k = (1 - par['скидка_амиго']) * par['курс_usd'];
      return P.amigo.filter(r => r['Продукт'] === prod).map(r => {
        const ser = r['Серия'] || '', nm = String(r['Цвет']).replace(/\s*\([^)]*\)\s*$/, '');
        return { key: r['Цвет'], name: nm, serRaw: ser, ser: ser ? (ser === 'липа' || ser === 'павловния' ? ser : 'серия ' + ser) : '', rate: rnd(r['Цена_usd_м2'] * k) };
      });
    }
    if (sup === 'Foroom' && prod.slice(-2) === '50') {
      const mat = prod.indexOf('Бамбук') === 0 ? 'Бамбук' : 'Дерево';
      return P.forum.filter(c => c['Материал'] === mat).sort((a, b) => a['Категория'] - b['Категория'])
        .map(c => ({ key: c['Код'], name: c['Код'] + ' ' + c['Цвет'], ser: 'кат.' + c['Категория'] + ' · ' + c['Порода'], cat: c['Категория'], maxW: (c['Макс_ширина_см'] || 0) * 10 }));
    }
    const L = (D.COLORS_CAT[sup] || {})[prod];
    return L ? L.map(c => ({ key: c[0] || c[1], name: c[1], ser: c[0] ? 'арт. ' + c[0] : '' })) : [];
  }

  function availOpts(sup, lam) {
    return P.opts.filter(o => o['Группа'] === 'опция' && o['Поставщик'] === eng(sup) && o['Опция'] !== 'Боковины валанса' &&
      (o['Закуп'] !== null || o['Единица'] === 'табл') && (!o['Только_ламель'] || o['Только_ламель'] === lam)).map(o => o['Опция']);
  }
  function availFixes(sup, lam) {
    return P.opts.filter(o => o['Группа'] === 'фиксация' && o['Поставщик'] === eng(sup) && o['Закуп'] !== null &&
      (!o['Только_ламель'] || o['Только_ламель'] === lam)).map(o => o['Опция']);
  }

  function calcItem(cur, colList) {
    const need = colList.length > 0, col = need ? colList.find(c => c.key === cur.color) : null;
    if (need && !col) return { ok: false, needColor: true, opts: {}, warn: [] };
    const W = +cur.w, H = +cur.h;
    if (!(W > 0 && H > 0)) return { ok: false, opts: {}, warn: [] };
    let res;
    try {
      res = JalCalc.calc(P, eng(cur.sup), cur.mat, cur.lam, W / 10, H / 10,
        { color: col && (cur.sup === 'Amigo' || cur.sup === 'Foroom') ? col.key : null, opts: Object.keys(cur.opts), fix: cur.fix || null });
    } catch (e) { return { ok: false, msg: String(e.message || e), opts: {}, warn: [] }; }
    if (!res.ok) return { ok: false, msg: res.msg, opts: {}, warn: [] };
    const lim = LM.sizeLimits({ sup: cur.sup, mat: cur.mat, lam: cur.lam, w: W, h: H, opts: cur.opts, ctrl: cur.ctrl, fix: cur.fix }, col, col && col.serRaw);
    const warn = lim.map(x => x.t); warn.hard = lim.some(x => x.hard);
    return { ok: true, base: res.base, unit: res.price, addSum: res.price - res.base, profit: res.profit, optP: res.opts, warn, col };
  }

  /* Расчёт позиции корзины: it = { sup, mat, lam, color, ctrl, fix, opts, w, h } (поставщик по-макетному: Amigo, Foroom). */
  function calcRow(it) {
    const cur = { sup: it.sup, mat: it.mat, lam: it.lam, color: it.color || '', ctrl: it.ctrl, fix: it.fix || '', w: it.w, h: it.h, opts: it.opts || {} };
    return calcItem(cur, colorsFor(it.sup, it.mat + ' ' + it.lam));
  }
  function edit(it, idx) {
    Object.assign(S, { mode: 'blinds', sup: it.sup, lam: it.lam, mat: it.mat, color: it.color || '', ctrl: it.ctrl || 'TR', fix: it.fix || '',
      opts: Object.assign({}, it.opts), w: it.w, h: it.h, qty: it.qty || 1, editIdx: idx, justAdded: false, supOpen: false });
  }
  function editAuto(sup) { Object.assign(S, { mode: 'auto', sup, editIdx: -1, justAdded: false }); }

  function build() {
    const App = window.JalApp, s = S;
    const lamOk = s.sup === 'Foroom' ? [50] : [25, 50];
    const lam = lamOk.indexOf(s.lam) >= 0 ? s.lam : 50;
    const matOk = (s.sup === 'Интерьер' && lam === 25) ? ['Дерево'] : (s.sup === 'Amigo' && lam === 50 ? ['Дерево', 'Бамбук', 'Пластик'] : ['Дерево', 'Бамбук']);
    const mat = matOk.indexOf(s.mat) >= 0 ? s.mat : 'Дерево';
    const prodKey = mat + ' ' + lam;
    const colList = colorsFor(s.sup, prodKey);
    const color = colList.some(c => c.key === s.color) ? s.color : '';
    const optNames = availOpts(s.sup, lam);
    const opts0 = {}; optNames.forEach(n => { if (s.opts[n]) opts0[n] = true; });
    const chain = !!opts0['Цепочка'];
    const splitOnly = s.sup === 'РДО' && lam === 50;
    const ctrl = chain ? (s.ctrl === 'R' || s.ctrl === 'TL' ? 'R' : 'L') : (splitOnly ? (s.ctrl === 'TL' ? 'TL' : 'TR') : (CTRL_NAMES[s.ctrl] ? s.ctrl : 'TR'));
    const fixNames = availFixes(s.sup, lam);
    const fix = fixNames.indexOf(s.fix) >= 0 ? s.fix : '';
    const cur = { sup: s.sup, lam, mat, color, ctrl, fix, w: s.w, h: s.h, opts: opts0 };
    const r = calcItem(cur, colList);
    const minRate = colList.length && colList[0].rate ? Math.min.apply(null, colList.map(c => c.rate)) : 0;
    const selCol = colList.find(c => c.key === color);
    const selStock = selCol ? stockOf(prodKey, selCol.key, s.sup, +s.w || 0) : null;
    const seg = sel => sel
      ? 'flex: 1 1 0; height: 46px; border: 0; border-radius: 11px; background: var(--card); color: var(--dk); font-size: 15px; font-weight: 700; box-shadow: 0 1px 2px rgba(20,40,60,0.18)'
      : 'flex: 1 1 0; height: 46px; border: 0; border-radius: 11px; background: transparent; color: var(--m1); font-size: 15px; font-weight: 600';
    const set = p => { Object.assign(S, p); render(); };
    const chg = p => set(Object.assign({ justAdded: false }, p));
    const pickSup = n => chg({ sup: n, lam: 50, mat: 'Дерево', color: '', ctrl: 'TR', fix: '', opts: {}, supOpen: false });

    const supTiles = SUPS.map((n, i) => ({ name: n, coll: COLL[n], on: s.sup === n ? 'true' : 'false', pick: () => pickSup(n),
      style: 'min-height: 78px; border: 0; border-radius: 20px; padding: 12px 14px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; text-align: left; ' + (i === 4 ? 'grid-column: span 2; ' : '') +
        (s.sup === n ? 'background: var(--dk); color: #FFFFFF' : 'background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(40,20,10,0.16)') }));

    const opts = optNames.map(name => {
      const on = !!opts0[name];
      return { name, on: on ? 'true' : 'false', price: r.ok && on && r.optP[name] ? '+' + fmt(r.optP[name]) : '',
        style: 'flex: 1 1 0; min-width: 0; min-height: 46px; padding: 4px 8px; border: 1.5px solid ' + (on ? 'var(--dk)' : 'var(--line)') + '; border-radius: 12px; display: flex; align-items: center; justify-content: center; text-align: center; gap: 7px; font-size: 14px; color: var(--ink); font-weight: ' + (on ? '700' : '500') + '; background: ' + (on ? 'var(--sel)' : 'var(--card)'),
        toggle: () => { const x = Object.assign({}, S.opts); x[name] = !x[name]; chg({ opts: x }); } };
    });
    const fixList = [{ name: 'Без фиксации', key: '' }].concat(fixNames.map(n => ({ name: FIXLBL[n] || n, key: n })));
    const fixes = fixList.map(f => {
      const on = f.key === fix;
      return { name: f.name, on: on ? 'true' : 'false', price: f.key && r.ok && on && r.optP[f.key] !== undefined ? '+' + fmt(r.optP[f.key]) : ' ',
        style: 'min-height: 52px; padding: 4px 2px; border: 0; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; background: transparent; color: ' + (on ? 'var(--ink)' : 'var(--m3)') + '; font-weight: ' + (on ? '800' : '500') + '; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px',
        pick: () => chg({ fix: f.key }) };
    });
    const ctrlKeys = chain ? ['L', 'R'] : (splitOnly ? ['TL', 'TR'] : CTRL_ORDER[lam]);
    const ctrls = ctrlKeys.map(kk => ({
      name: chain ? CHAIN_NAMES[kk] : CTRL_NAMES[kk],
      thin: chain ? '' : DRAW[lam][kk][0], thick: chain ? DRAW_CHAIN[kk] : DRAW[lam][kk][1], dash: chain ? '0.1 4' : '',
      on: kk === ctrl ? 'true' : 'false',
      style: kk === ctrl
        ? 'min-height: 46px; border-radius: 14px; border: 1.5px solid var(--dk); background: var(--chip); color: var(--dk); font-weight: 700; display: flex; align-items: center; gap: 8px; padding: 4px 10px'
        : 'min-height: 46px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); font-weight: 500; display: flex; align-items: center; gap: 8px; padding: 4px 10px',
      pick: () => chg({ ctrl: kk }) }));

    // поиск и недавние цвета в листе выбора
    const qlow = (s.q || '').trim().toLowerCase();
    const recKey = k => s.sup + '|' + prodKey + '|' + k;
    const rec = (s.recent || []).filter(x => x.indexOf(s.sup + '|' + prodKey + '|') === 0).map(x => x.split('|')[2]).slice(0, 5);
    const shown0 = colList.filter(c => !qlow || (c.name + ' ' + c.ser).toLowerCase().indexOf(qlow) >= 0);
    const shown = qlow ? shown0 : rec.map(k => shown0.find(c => c.key === k)).filter(Boolean).concat(shown0.filter(c => rec.indexOf(c.key) < 0));

    const good = r.ok && !r.warn.length, waiting = !!r.needColor;
    const kg = LM.weightKg(mat, lam, +s.w, +s.h);
    const showProfit = !!(App && App.st.show), JC = window.JalCart;
    const unit = r.ok ? r.unit : 0;
    const dotOf = st => st === null ? 'display: none' : 'width: 14px; height: 14px; border-radius: 7px; flex-shrink: 0; background: ' + DOT[st];

    const rowStyle = n => 'min-height: 64px; border-radius: 14px; border: 1.5px solid ' + (n ? 'var(--dk)' : 'var(--line)') + '; background: ' + (n ? 'var(--chip)' : '#FFFFFF') + '; display: flex; align-items: center; gap: 10px; padding: 6px 6px 6px 12px';
    const autoRows = kind => (JC.autoList(s.sup, kind) || []).map(f => { const q = JC.autoQty(s.sup, kind, f.key);
      return { name: f.name, sub: f.sub, price: fmt(f.price) + ' ₽', qty: q, style: rowStyle(q),
        minus: () => JC.autoStep(s.sup, kind, f.key, -1), plus: () => JC.autoStep(s.sup, kind, f.key, 1) }; });
    return {
      supName: s.sup, supColl: COLL[s.sup], supOpen: !!s.supOpen, toggleSup: () => set({ supOpen: !S.supOpen }),
      supArrow: 'flex-shrink: 0; transition: transform 0.25s ease; transform: rotate(' + (s.supOpen ? 180 : 0) + 'deg)',
      supWrap: 'overflow: hidden; transition: max-height 0.3s ease, opacity 0.25s ease; max-height: ' + (s.supOpen ? 320 : 0) + 'px; opacity: ' + (s.supOpen ? 1 : 0) + '; visibility: ' + (s.supOpen ? 'visible' : 'hidden'),
      supTiles,
      isBlinds: s.mode === 'blinds', isAuto: s.mode === 'auto',
      modeBlinds: () => set({ mode: 'blinds' }), modeAuto: () => set({ mode: 'auto' }),
      modeBlindsStyle: seg(s.mode === 'blinds'), modeAutoStyle: seg(s.mode === 'auto'),
      calcHeader: s.editIdx >= 0, calcTitle: s.mode === 'auto' ? 'Автоматика' : 'Изменение позиции ' + (s.editIdx + 1), posText: 'позиция ' + (s.editIdx >= 0 ? s.editIdx + 1 : JC.count() + 1),
      w: s.w, h: s.h,
      setW: e => chg({ w: e.target.value }), setH: e => chg({ h: e.target.value }),
      showLam: lamOk.length > 1,
      lams: lamOk.map(l => ({ name: l + ' мм', style: seg(lam === l), pick: () => chg({ lam: l, ctrl: l === 25 ? 'R' : 'TR' }) })),
      mats: matOk.map(m => ({ name: m, style: seg(mat === m), pick: () => chg({ mat: m }) })),
      hasColors: colList.length > 0,
      colorBtnStyle: 'min-height: 50px; border-radius: 14px; border: 1.5px solid ' + (selCol || !colList.length ? 'var(--line)' : 'var(--ac)') + '; background: var(--card); color: var(--ink); display: flex; align-items: center; gap: 10px; padding: 6px 12px 6px 14px; text-align: left',
      colorDotStyle: selCol && selStock !== null ? 'width: 14px; height: 14px; border-radius: 7px; flex-shrink: 0; background: ' + DOT[selStock] : 'display: none',
      colorNameStyle: 'font-size: 16px; font-weight: 700; color: ' + (selCol ? 'var(--ink)' : '#B35F00'),
      colorName: selCol ? selCol.name : 'Выбери цвет',
      colorSub: selCol ? [selCol.ser, minRate && selCol.rate > minRate ? '+' + fmt(selCol.rate - minRate) + ' ₽/м²' : ''].filter(Boolean).join(' · ') : '',
      openColors: () => set({ colorOpen: true, q: '' }),
      closeColors: () => set({ colorOpen: false, q: '' }),
      colorOpen: s.colorOpen && colList.length > 0,
      colorProd: s.sup + ' · ' + prodKey + ' мм',
      colorHint: 'коллекция ' + COLL[s.sup] + (s.sup === 'Foroom' ? ' · категория цвета определяет цену' : (s.sup === 'Amigo' ? ' · цена зависит от цвета' : '')),
      q: s.q, setQ: e => set({ q: e.target.value }),
      colorsEmpty: shown.length === 0,
      colors: shown.map(c => {
        const sel = c.key === color, extra = c.rate && c.rate > minRate;
        return {
          name: c.name, ser: c.ser, dotStyle: dotOf(stockOf(prodKey, c.key, s.sup, +s.w || 0)),
          tag: extra ? '+' + fmt(c.rate - minRate) + ' ₽/м²' : (c.cat !== undefined ? 'кат.' + c.cat : (c.rate ? 'мин.' : '')),
          tagStyle: !extra && c.cat === undefined && !c.rate ? 'display: none' : extra ? 'font-size: 13px; font-weight: 700; color: #8A4B00; background: #FFF1DE; border-radius: 10px; padding: 3px 8px' : 'font-size: 13px; font-weight: 700; color: var(--dk); background: var(--chip); border-radius: 10px; padding: 3px 8px',
          style: sel
            ? 'min-height: 54px; border-radius: 12px; border: 2px solid var(--dk); background: var(--chip); color: var(--ink); display: flex; align-items: center; gap: 12px; padding: 6px 12px'
            : 'min-height: 54px; border-radius: 12px; border: 1px solid #E6D8C6; background: var(--card); color: var(--ink); display: flex; align-items: center; gap: 12px; padding: 6px 12px',
          pick: () => {
            const recent = [recKey(c.key)].concat((S.recent || []).filter(x => x !== recKey(c.key))).slice(0, 30);
            try { localStorage.setItem('jal_recent', JSON.stringify(recent)); } catch (e) {}
            chg({ color: c.key, colorOpen: false, q: '', recent });
          }
        };
      }),
      hasOpts: opts.length > 0, opts,
      ctrls, ctrlTitle: chain ? 'Управление (цепочка)' : 'Управление',
      fixes, fixBoxStyle: 'display: grid; grid-template-columns: repeat(' + fixes.length + ', minmax(0, 1fr)); gap: 4px; background: var(--card); border-radius: 14px; padding: 4px 10px',
      compare: () => alert('Сравнение поставщиков добавим следующим шагом.'),
      qty: s.qty, qtyMinus: () => set({ qty: Math.max(1, S.qty - 1) }), qtyPlus: () => set({ qty: Math.min(99, S.qty + 1) }),
      noAuto: !JC.hasAuto(s.sup), hasAuto: JC.hasAuto(s.sup),
      driveRows: autoRows('drive'), remoteRows: autoRows('remote'),
      autoSummary: 'Приводов ' + JC.counts().drive + ', пультов ' + JC.counts().remote + ' в корзине',
      showCheck: !waiting,
      breakText: r.ok ? (s.qty > 1 ? fmt(unit) + ' ₽ × ' + s.qty + ' шт' : 'изделие ' + fmt(r.base) + ' + доп. ' + fmt(r.addSum)) : (waiting ? 'выбери цвет, и я посчитаю' : (r.msg ? '' : 'введи размеры')),
      weightText: kg ? 'вес ≈ ' + LM.fmtKg(kg * s.qty) + ' кг' + (s.qty > 1 ? ' (' + LM.fmtKg(kg) + ' кг × ' + s.qty + ')' : '') : '',
      checkText: waiting ? 'Ждёт выбора цвета' : (!r.ok ? (r.msg ? r.msg[0].toUpperCase() + r.msg.slice(1) : 'Не поставляется') : (r.warn.length ? (r.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + r.warn.join('; ') : 'Размеры в гарантии')),
      checkIcon: good ? 'M20 6L9 17l-5-5' : 'M12 8v5M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
      checkStyle: 'display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: ' + (waiting ? 'var(--m2)' : (good ? '#1E6B24' : '#B3261E')),
      hasStockWarn: r.ok && !!selCol && selStock !== null && selStock < 2,
      stockWarn: selStock !== null ? STOCK_TXT[selStock][0].toUpperCase() + STOCK_TXT[selStock].slice(1) : '',
      stockWarnDot: 'width: 12px; height: 12px; border-radius: 6px; flex-shrink: 0; background: ' + (selStock !== null ? DOT[selStock] : 'transparent'),
      justAdded: s.justAdded,
      priceText: r.ok ? fmt(unit * s.qty) + ' ₽' : '—',
      priceStyle: 'font-size: 24px; font-weight: 800; line-height: 1.05; color: ' + (r.ok ? '#FFFFFF' : '#C9B59C'),
      showProfit, profitText: r.ok ? '+' + fmt(r.profit * s.qty) : '—',
      addLabel: s.editIdx >= 0 ? 'Сохранить' : 'В корзину',
      addStyle: 'height: 48px; padding: 0 22px; border: 0; border-radius: 24px; background: var(--ac); color: #FFFFFF; font-size: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center; opacity: ' + (r.ok ? '1' : '0.45'),
      addToCart: () => {
        if (!r.ok || !App) return;
        const item = { sup: s.sup, lam, mat, color, ctrl, fix, opts: Object.assign({}, opts0), w: +s.w, h: +s.h, qty: s.qty };
        if (s.editIdx >= 0) { JC.replaceItem(s.editIdx, item); set({ editIdx: -1, qty: 1 }); App.tab('cart'); }
        else { JC.addItem(item); set({ qty: 1, justAdded: true }); }
      },
      cartCount: JC.count(),
      openCart: () => App.tab('cart'), closeEditHeader: null, openOrders: () => App.tab('ord'), openSettings: () => App.tab('set')
    };
  }

  function render() {
    if (!P) return;
    const box = document.getElementById('calcRoot');
    if (!mounted) mounted = JalTpl.mount(box, document.getElementById('tplCalc'));
    box.className = 'scr ' + themeCls();
    box.setAttribute('style', 'min-height: 100vh; box-sizing: border-box; background: var(--bg); font-family: Inter, -apple-system, system-ui, sans-serif; color: var(--ink); display: flex; flex-direction: column; position: relative');
    document.body.style.overflow = S.colorOpen ? 'hidden' : '';
    mounted.render(build());
  }

  window.JalCalcScreen = { render, setSheets, state: S, calcRow, edit, editAuto };
})();
