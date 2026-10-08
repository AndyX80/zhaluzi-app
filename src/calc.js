/* Ядро расчёта цены изделия (порт calc_reference.py, «Промт 2», разд. 2-6).
   Вход: sheets = { 'Лист': [[заголовок...], [строка...], ...] } — как отдаёт SheetJS (header:1).
   Размеры W, H в см. Автоматика и проверка размеров (разд. 7) — позже. */
(function (root) {
  'use strict';

  function ceilTo(x, step) { step = step || 100; return Math.ceil(x / step - 1e-9) * step; }
  function rnd(x) { return Math.floor(x + 0.5); }
  const nz = v => v === undefined || v === null || v === '' ? null : v;

  function rows(sheet) {
    const head = sheet[0];
    return sheet.slice(1).filter(r => r.some(c => nz(c) !== null)).map(r => {
      const o = {};
      head.forEach((h, i) => { o[h] = nz(r[i]); });
      return o;
    });
  }

  function grid(sheet) {
    return {
      widths: sheet[0].slice(1).map(nz),
      hs: sheet.slice(1).filter(r => nz(r[0]) !== null).map(r => [r[0], r.slice(1).map(nz)]),
    };
  }

  function lookup(g, W, H) {
    const col = g.widths.findIndex(w => w !== null && w >= W);
    const hit = g.hs.find(([h]) => h >= H);
    if (col < 0 || !hit) return null;
    return hit[1][col] === undefined ? null : hit[1][col];
  }

  function makePrice(sheets) {
    const P = {};
    P.par = {}; rows(sheets['Параметры']).forEach(r => { P.par[r['Ключ']] = r['Значение']; });
    P.x = {}; rows(sheets['Прибыль']).forEach(r => { P.x[r['Продукт']] = r['X_руб_м2']; });
    P.sup = {}; rows(sheets['Поставщики']).forEach(r => { P.sup[r['Поставщик']] = r; });
    P.rates = {}; rows(sheets['Ставки']).forEach(r => { P.rates[r['Продукт']] = r; });
    P.opt = {}; if (sheets['Опт']) rows(sheets['Опт']).forEach(r => { if (typeof r['Наценка'] === 'number') P.opt[r['Поставщик'] + '|' + r['Продукт']] = r['Наценка']; });
    P.amigo = rows(sheets['Амиго_цвета']);
    P.opts = rows(sheets['Опции']);
    P.forum = rows(sheets['Форум_цвета']);
    P.mono = rows(sheets['РДО_моно']);
    P.grids = {};
    Object.keys(sheets).forEach(n => {
      if ((n.startsWith('РДО_') && n !== 'РДО_моно') || n.startsWith('Форум_кат')) P.grids[n] = grid(sheets[n]);
    });
    return P;
  }

  const fail = msg => ({ ok: false, msg });

  /* opts: [{...}] не нужен — опции именами. fix: имя нижней фиксации. sides: число боковин валанса. */
  function calc(P, sup, mat, lam, W, H, o) {
    o = o || {};
    const wh = !!o.wh, color = o.color || null, opts = o.opts || [], fix = o.fix || null, sides = o.sides || 0;
    const prod = mat + ' ' + lam;
    const S = W * H / 10000;
    const par = P.par, s = P.sup[sup];
    const msgs = [];
    let zak;
    if (mat === 'Пластик' && sup !== 'Амиго') return fail('пластик есть только у Амиго');
    if (sup === 'Амиго') {
      const lst = P.amigo.filter(r => r['Продукт'] === prod);
      if (!lst.length) return fail('не поставляется');
      let row;
      if (color) {
        row = lst.find(r => r['Цвет'] === color);
        if (!row) return fail('этого цвета нет в серии «' + prod + '» у Амиго');
      } else {
        row = lst.reduce((a, b) => (b['Цена_usd_м2'] < a['Цена_usd_м2'] ? b : a));
        msgs.push('цвет не выбран, взята мин. цена');
      }
      const rate = rnd(row['Цена_usd_м2'] * (1 - par['скидка_амиго']) * par['курс_usd']);
      zak = rnd(rate * Math.max(S, s['Мин_площадь_закупа']));
    } else if (sup === 'Интерьер' || sup === 'Уют') {
      const rr = P.rates[prod];
      const rate = rr ? rr[sup] : null;
      if (rate === null || rate === undefined) return fail('не поставляется');
      zak = rnd(rate * Math.max(S, s['Мин_площадь_закупа']));
    } else if (sup === 'РДО') {
      const g = P.grids['РДО_' + mat + lam];
      const v = g ? lookup(g, W, H) : null;
      if (v === null) return fail('размер вне таблицы поставщика');
      zak = rnd(v * par['курс_рдо']);
    } else if (sup === 'Форум') {
      if (lam !== 50) return fail('у Форума нет 25 мм');
      const c = P.forum.find(r => r['Код'] === color);
      if (!c) return fail('цвет Форума не выбран');
      const v = lookup(P.grids['Форум_кат' + c['Категория']], W, H);
      if (v === null) return fail('размер вне таблицы поставщика');
      zak = rnd(v);
    } else {
      throw new Error('поставщик? ' + sup);
    }
    const whM = wh ? P.opt[sup + '|' + prod] : undefined;
    if (wh && whM === undefined) return fail('нет оптовой наценки (лист «Опт»)');
    const dlv = 0; /* доставка от поставщика считается в корзине: 1500 ₽ на партию производителя */
    const profitM2 = P.x[prod] + s['Доп_к_X'];
    const base = wh ? ceilTo(zak * (1 + whM), par['округление'])
      : ceilTo(zak + dlv + profitM2 * Math.max(S, par['мин_площадь_прибыли']), par['округление']);
    const pr = base - zak - dlv;
    let totalOpts = 0, optProfit = 0;
    const optPrices = {};
    const want = (fix ? [fix] : []).concat(opts, sides ? ['Боковины валанса'] : []);
    for (const name of want) {
      const op = P.opts.find(r => r['Опция'] === name && r['Поставщик'] === sup);
      const none = !op || (op['Закуп'] === null && op['Единица'] !== 'табл') ||
        (op['Только_ламель'] && op['Только_ламель'] !== lam);
      if (none) { msgs.push('опция «' + name + '» нет у поставщика'); continue; }
      let zo;
      if (op['Единица'] === 'табл') {
        const r = P.mono.find(m => m['Продукт'] === prod && m['Ширина_до_см'] >= W);
        if (!r) { msgs.push('опция «' + name + '» нет у поставщика'); continue; }
        zo = rnd(r['Доплата_уе'] * par['курс_рдо']);
      } else {
        const z = op['Закуп'], cur = op['Валюта'];
        const zr = cur === 'уе' ? z * par['курс_рдо']
          : cur === 'usd' ? rnd(z * (1 - par['скидка_амиго']) * par['курс_usd']) : z;
        zo = op['Единица'] === 'изд' ? rnd(zr)
          : op['Единица'] === 'шт' ? rnd(zr * sides)
          : rnd(zr * Math.max(S, par['мин_площадь_опций']));
      }
      optPrices[name] = ceilTo(wh ? zo * (1 + whM) : zo * s['Коэф_опций'], par['округление']);
      totalOpts += optPrices[name];
      optProfit += optPrices[name] - zo;
    }
    return { ok: true, zakup: zak, base: base, opts: optPrices, price: base + totalOpts,
      profit: pr + optProfit, msg: msgs.join('; ') };
  }

  const api = { ceilTo, rnd, makePrice, calc, lookup };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JalCalc = api;
})(typeof self !== 'undefined' ? self : this);
