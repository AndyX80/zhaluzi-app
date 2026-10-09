/* Корзина (экран по макету Main.dc.html) и автоматика: данные из листа «Автоматика». */
(function () {
  'use strict';
  const LM = window.JalLimits;
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ceil100 = x => Math.ceil(x / 100 - 1e-9) * 100;
  const K0 = window.JAL_CART_KEY || 'jal_cart2'; /* десктоп ведёт свою корзину под другим ключом */
  const C = { cart: [], service: 0, region: false, pvz: '', disc: '', discMode: 'pct', needDog: true, cf: null, undoItem: null };
  try { Object.assign(C, JSON.parse(localStorage.getItem(K0) || '{}')); C.cf = null; C.undoItem = null; } catch (e) {}
  const save = () => { try { localStorage.setItem(K0, JSON.stringify({ cart: C.cart, service: C.service, region: C.region, pvz: C.pvz, disc: C.disc, discMode: C.discMode, needDog: C.needDog })); } catch (e) {} };

  const CTRL_TXT = { L: 'поворот и подъём слева', R: 'поворот и подъём справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' };
  const CTRL_TXT_CHAIN = { L: 'цепочка слева', R: 'цепочка справа' };
  // Ставки монтажа (ориентировочно) и минимальная прибыль на изделие
  const RATES = { w50: 3000, w50auto: 5000, w25: 1200, w25auto: 2000, delivery: 1000, ship: 1500 };
  const MINP = { def: 2000, p: {} };
  const SUPNAME = { Amigo: 'Амиго', Foroom: 'Форум' };
  const FREE_SHIP = { Foroom: 1, 'Уют': 1 }; /* у них доставка до нас бесплатная */
  try { Object.assign(RATES, JSON.parse(localStorage.getItem('jal_rates') || '{}')); const mp = JSON.parse(localStorage.getItem('jal_minp') || '{}'); if (mp.def !== undefined) MINP.def = mp.def; if (mp.p) MINP.p = mp.p; } catch (e) {}
  const saveCfg = () => { try { localStorage.setItem('jal_rates', JSON.stringify(RATES)); localStorage.setItem('jal_minp', JSON.stringify(MINP)); } catch (e) {} };

  /* ---------- автоматика из листа ---------- */
  let AUTO = null;
  function setSheets(sheets) {
    AUTO = {};
    const sh = sheets['Автоматика'];
    if (!sh || sh.length < 2) return;
    sh.slice(1).forEach(r => {
      if (!r[0] || !r[2]) return;
      const sup = r[0], kind = r[1] === 'Привод' ? 'drive' : 'remote';
      const text = (r[2] || '') + ' ' + (r[3] || ''), m = /(25|50) мм/.exec(text);
      const line = sup === 'РДО' ? (/ WS| WSE| WSR/.test(' ' + text) ? 'ws' : (/\bD\b|DM35|DV24|DC3/.test(text) ? 'd' : '')) : '';
      const price = r[6] || ceil100((r[4] || 0) * (r[5] || 1));
      ((AUTO[sup] = AUTO[sup] || { drive: [], remote: [] })[kind]).push({ key: r[2], name: r[2], sub: r[3] || '', cost: r[4] || 0, price, lam: m ? +m[1] : 0, line });
    });
  }
  const autoOf = it => { const A = AUTO && AUTO[it.sup]; const f = A ? A[it.kind].find(x => x.key === it.key) : null; return f ? { f, price: f.price } : null; };
  const autoQty = (sup, kind, key) => { const it = C.cart.find(x => x.kind === kind && x.sup === sup && x.key === key); return it ? it.qty : 0; };
  function autoStep(sup, kind, key, d) {
    const i = C.cart.findIndex(x => x.kind === kind && x.sup === sup && x.key === key);
    if (i < 0) { if (d > 0) C.cart.push({ kind, sup, key, qty: 1, wire: '' }); }
    else { const q = C.cart[i].qty + d; if (q <= 0) C.cart.splice(i, 1); else C.cart[i] = Object.assign({}, C.cart[i], { qty: q }); }
    save(); rerender();
  }
  const chanOf = f => { const m = f && /(\d+)[‑-]канал/.exec(f.name || ''); return m ? Number(m[1]) : 1; };

  /* ---------- расчёт строки ---------- */
  function calcRow(it) {
    if (it.kind === 'custom') {
      const p = Number(it.price) || 0, hasCost = it.cost !== '' && it.cost != null;
      return { ok: p > 0, unit: p, profit: hasCost ? p - Number(it.cost) : 0, noCost: !hasCost, warn: [] };
    }
    if (it.kind) {
      const a = autoOf(it);
      return a ? { ok: true, unit: a.price, profit: a.price - a.f.cost, warn: [], auto: a.f } : { ok: false, warn: [] };
    }
    return window.JalCalcScreen.calcRow(it);
  }
  function spread(rows, S) {
    const out = rows.map(() => 0), idx = rows.map((r, i) => (r.ok ? i : -1)).filter(i => i >= 0);
    if (!S || !idx.length) return out;
    idx.forEach(i => { out[i] = Math.round(S / idx.length / rows[i].qty); });
    let diff = S - idx.reduce((a, i) => a + out[i] * rows[i].qty, 0);
    for (let j = 0; j < idx.length && diff !== 0; j++) { if (rows[idx[j]].qty === 1) { out[idx[j]] += diff; diff = 0; } }
    return out;
  }

  /* Все расчётные величины корзины в одном месте: для экрана и для заказа. */
  function compute(st, ov) {
    const App = window.JalApp, s = st || C;
    const calcs = (ov ? ov.calcs : s.cart.map(calcRow)).map((c, i) => { const it = s.cart[i], o = it && !it.kind && it.own !== '' && it.own != null ? Number(it.own) : NaN;
      return c.ok && o >= 0 ? Object.assign({}, c, { ownPrice: true, listUnit: c.unit, unit: o, profit: c.profit + (o - c.unit) }) : c; });
    const reg = !!s.region, S = reg ? 0 : (Number(s.service) || 0);
    const adds = spread(s.cart.map((it, i) => ({ ok: calcs[i].ok && it.kind !== 'custom' && !calcs[i].ownPrice, qty: it.qty })), S);
    /* доставка от производителя: RATES.ship на каждую партию (кроме Уюта и Форума), делится на жалюзи этой партии */
    const ships = s.cart.map(() => 0), bySup = {};
    s.cart.forEach((it, i) => { const sp = ov ? ov.sups[i] : it.sup; if (!reg && !it.kind && calcs[i].ok && !calcs[i].ownPrice && !FREE_SHIP[sp]) (bySup[sp] = bySup[sp] || []).push(i); });
    Object.keys(bySup).forEach(k => { const ix = bySup[k], part = spread(ix.map(i => ({ ok: true, qty: s.cart[i].qty })), Number(RATES.ship) || 0); ix.forEach((i, j) => { ships[i] = part[j]; }); });
    const lineSum = s.cart.map((it, i) => (calcs[i].ok ? (calcs[i].ownPrice || it.kind === 'custom' ? calcs[i].unit : ceil100(calcs[i].unit + ships[i] + adds[i])) * it.qty : 0));
    /* доставка и установка некуда разложить (все строки со своей ценой или свои товары): идёт отдельной суммой, чтобы не пропадала */
    const svcLeft = S && !s.cart.some((it, i) => calcs[i].ok && it.kind !== 'custom' && !calcs[i].ownPrice) ? S : 0;
    const total = lineSum.reduce((x, y) => x + y, 0) + svcLeft;
    const dv = Math.max(0, Number(s.disc) || 0);
    const discAmt = Math.min(total, s.discMode === 'pct' ? Math.round(total * Math.min(dv, 50) / 100 / 100) * 100 : Math.min(dv, total * 0.5));
    const goodsSum = s.cart.reduce((x, it, i) => x + (calcs[i].ok ? calcs[i].unit * it.qty : 0), 0);
    return { calcs, S, svcLeft, adds, ships, lineSum, total, dv, discAmt, goodsSum, netTotal: total - discAmt };
  }

  function build() {
    const App = window.JalApp, s = C, F = compute();
    const { calcs, S, adds, lineSum, total, dv, discAmt, goodsSum, netTotal } = F;
    const showProfit = !!(App && App.st.show);
    const set = p => { Object.assign(C, p); save(); rerender(); };

    // проверка пультов: приводы, пульты и каналы по поставщику (для РДО ещё и по серии)
    const grp = {};
    s.cart.forEach((it, i) => { if (it.kind === 'drive' || it.kind === 'remote') {
      const f = calcs[i].auto, ln = (f && f.line) || '', g = it.sup + ln;
      const o = grp[g] || (grp[g] = { sup: it.sup, ln, D: 0, R: 0, C: 0 });
      if (it.kind === 'drive') o.D += it.qty; else { o.R += it.qty; o.C += chanOf(f) * it.qty; } } });
    const grpName = o => o.sup + (o.ln === 'ws' ? ' (серия WS)' : o.ln === 'd' ? ' (серия D)' : '');
    const autoErrors = [];
    Object.keys(grp).forEach(g => { const o = grp[g];
      if (o.D && !o.R) autoErrors.push(grpName(o) + ': заказано приводов ' + o.D + ', а пультов или выключателей нет.');
      else if (o.D && o.C < o.D) autoErrors.push('ОШИБКА, ' + grpName(o) + ': приводов ' + o.D + ', а каналов в пультах только ' + o.C + '. Нужны 1-канальные пульты на каждый привод или один многоканальный.'); });
    // лимиты привода (по таблице РДО, принято для всех поставщиков)
    const hasDrive = {}; s.cart.forEach(x => { if (x.kind === 'drive') hasDrive[x.sup] = true; });
    const driveNote = it => {
      if (!hasDrive[it.sup]) return '';
      const W = Number(it.w) || 0, H = Number(it.h) || 0, mn = it.lam === 25 ? 500 : 700, mx = it.lam === 25 ? 2400 : 2700, bad = [];
      if (W && W < mn) bad.push('ширина меньше ' + mn + ' мм');
      if (W > mx) bad.push('ширина больше ' + mx + ' мм');
      if (H > 3000) bad.push('высота больше 3000 мм');
      return bad.length ? ' ПРИВОД не подходит: ' + bad.join(', ') : '';
    };
    const minFor = it => { const pk = it.kind === 'drive' ? 'Привод' : it.kind === 'remote' ? 'Пульт' : it.kind === 'custom' ? 'Своя строка' : it.mat + ' ' + it.lam;
      const v = (MINP.p[it.sup] || {})[pk]; if (v !== undefined) return v; return (pk === 'Пульт' || pk === 'Своя строка') ? 0 : MINP.def; };
    const below = [];
    const profInfo = s.cart.map((it, i) => { const c = calcs[i];
      if (!c.ok || (it.kind === 'custom' && c.noCost)) return null;
      const share = goodsSum ? discAmt * (c.unit * it.qty) / goodsSum / it.qty : 0, pp = c.profit - share, mn = minFor(it);
      const low = mn > 0 && pp < mn; if (low) below.push(i + 1);
      return { pp, mn, low }; });
    const wireBtn = on => 'min-height: 44px; border: 0; background: transparent; font-size: 14px; text-align: center; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? '800' : '600') + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');
    const mkRow = (it, i, base) => {
      const pi = profInfo[i], isDr = it.kind === 'drive';
      return Object.assign({ dupShow: false, dup: () => {}, n: i + 1, qty: it.qty,
        profShow: showProfit && (!!pi || it.kind === 'custom'),
        profLine: pi ? 'прибыль ' + (pi.pp >= 0 ? '+' : '') + fmt(Math.round(pi.pp)) + ' ₽ за шт' + (pi.low ? ' · ниже минимальной прибыли (' + fmt(pi.mn) + ')' : '') : 'закуп не указан, прибыль не считается',
        profStyle: 'font-size: 12px; font-weight: 600; text-align: right; color: ' + (pi && pi.low ? '#B3261E' : '#8A4B00'),
        isDrive: isDr, wireLStyle: wireBtn(isDr && it.wire === 'L'), wireRStyle: wireBtn(isDr && it.wire === 'R'),
        wireL: () => setWire(i, 'L'), wireR: () => setWire(i, 'R'),
        wireNote: isDr && !it.wire ? 'выбери сторону' : '', wireNoteStyle: 'font-size: 12px; color: #B35F00; font-weight: 600' }, base);
    };
    const setWire = (i, side) => { C.cart[i] = Object.assign({}, C.cart[i], { wire: side }); save(); rerender(); };
    const redWarn = on => on ? 'flex: 1 1 100%; font-size: 12px; color: #B3261E; font-weight: 600; text-align: left; line-height: 1.3' : 'display: none';
    const cartRows = s.cart.map((it, i) => {
      const c = calcs[i];
      const rm = () => { const gone = C.cart[i]; C.cart = C.cart.filter((_, j) => j !== i); C.undoItem = { it: gone, i }; save();
        try { clearTimeout(C._undoT); } catch (e) {} C._undoT = setTimeout(() => { C.undoItem = null; rerender(); }, 5000); rerender(); };
      if (it.kind === 'custom') {
        return mkRow(it, i, { title: it.title || 'Своя строка', sub: 'своя строка' + (c.noCost ? '' : ' · закуп ' + fmt(Number(it.cost)) + ' ₽'), size: '—', sum: c.ok ? fmt(lineSum[i]) : '—',
          warn: c.ok ? '' : 'Укажи цену', warnStyle: redWarn(!c.ok),
          edit: () => set({ cf: { i, title: it.title || '', qty: String(it.qty), price: String(it.price || ''), cost: it.cost == null ? '' : String(it.cost) } }), remove: rm });
      }
      if (it.kind) {
        const a = c.ok ? c.auto : null, g = grp[it.sup + ((a && a.line) || '')] || { D: 0, R: 0, C: 0 };
        const needMsg = it.kind === 'drive' ? (!g.R ? (a && a.line ? 'К приводу нужен пульт этой же серии' : 'К приводу нужен пульт или выключатель') : (g.C < g.D ? 'Каналов в пультах меньше, чем приводов' : '')) : '';
        return mkRow(it, i, { title: it.sup, sub: (a ? a.name : '') + (it.kind === 'drive' ? ' · привод' : ' · пульт'), size: '—', sum: c.ok ? fmt(lineSum[i]) : '—',
          warn: needMsg, warnStyle: redWarn(!!needMsg), edit: () => { JalCalcScreen.editAuto(it.sup); window.JalApp.tab('calc'); }, remove: rm });
      }
      const extra = Object.keys(it.opts || {}).filter(n => it.opts[n]);
      if (it.fix) extra.push(it.fix === 'Ниж. фиксация' ? 'Уголки' : it.fix);
      const colName = c.col ? (it.sup === 'Foroom' ? c.col.name + ' (' + c.col.ser.split(' · ')[0] + ')' : c.col.name) : '';
      const isChain = !!(it.opts && it.opts['Цепочка']);
      const w1 = (c.warn && c.warn.length ? (c.warn.hard ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + c.warn.join('; ') : '') + driveNote(it);
      return mkRow(it, i, { title: it.sup, sub: it.mat + ' ' + it.lam + (colName ? ' · ' + colName.toLowerCase() : '') + ' · ' + (isChain ? CTRL_TXT_CHAIN : CTRL_TXT)[it.ctrl || 'L'] + (extra.length ? ' · ' + extra.join(', ').toLowerCase() : ''),
        size: it.w + '×' + it.h, sum: c.ok ? fmt(lineSum[i]) : '—', warn: w1, warnStyle: redWarn(!!w1),
        edit: () => { JalCalcScreen.edit(it, i); window.JalApp.tab('calc'); },
        dupShow: true, dup: () => { JalCalcScreen.edit(it, -1); window.JalApp.tab('calc'); }, remove: rm,
        ownShow: c.ok, ownVal: c.ownPrice ? String(c.unit) : '', ownPh: c.ok ? String((c.ownPrice ? c.listUnit : lineSum[i] / it.qty) || '') : '', ownHint: c.ownPrice ? 'своя цена за шт, по прайсу было ' + fmt(Math.round(c.listUnit)) + ' ₽ (доставка и установка в неё не добавляются)' : 'своя цена за шт, ₽',
        ownSet: e => { const v = String(e.target.value).replace(/\s/g, ''); C.cart[i] = Object.assign({}, C.cart[i], { own: v === '' ? '' : Math.max(0, Math.round(Number(v) || 0)) }); save(); rerender(); } });
    });

    let pcs = 0, areaSum = 0, kgSum = 0, kgPart = true, prof = 0, n50 = 0, n25 = 0, nAuto50 = 0, nAuto25 = 0;
    s.cart.forEach((it, i) => { const c = calcs[i]; if (c.ok) prof += c.profit * it.qty; pcs += it.qty;
      if (!it.kind) { areaSum += (Number(it.w) || 0) * (Number(it.h) || 0) / 1e6 * it.qty; const kg = LM.weightKg(it.mat, it.lam, Number(it.w), Number(it.h)); if (kg) kgSum += kg * it.qty; else kgPart = false;
        if (it.lam === 50) n50 += it.qty; else if (it.lam === 25) n25 += it.qty; }
      else if (it.kind === 'drive' && c.auto) { if (c.auto.lam === 50) nAuto50 += it.qty; else if (c.auto.lam === 25) nAuto25 += it.qty; } });
    nAuto50 = Math.min(nAuto50, n50); nAuto25 = Math.min(nAuto25, n25);
    const n50plain = n50 - nAuto50;
    const sugg = (n50 + n25) ? n50plain * RATES.w50 + nAuto50 * RATES.w50auto + (n25 - nAuto25) * RATES.w25 + nAuto25 * RATES.w25auto + RATES.delivery : 0;
    const sp = [];
    if (n50plain) sp.push('50 мм ' + n50plain + '×' + fmt(RATES.w50));
    if (nAuto50) sp.push('50 мм с автоматикой ' + nAuto50 + '×' + fmt(RATES.w50auto));
    if (n25 - nAuto25) sp.push('25 мм ' + (n25 - nAuto25) + '×' + fmt(RATES.w25));
    if (nAuto25) sp.push('25 мм с автоматикой ' + nAuto25 + '×' + fmt(RATES.w25auto));
    if (sugg) sp.push('доставка ' + fmt(RATES.delivery) + ' (один раз)');
    const netProf = prof - discAmt;
    const pctOn = s.discMode === 'pct';
    const tabBtn = on => 'min-height: 52px; border: 0; background: transparent; font-size: 15px; text-align: center; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? '800' : '600') + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');

    // допродажи: подсказки по составу корзины, исчезают, когда выполнены
    const goods = s.cart.filter(x => !x.kind), w50 = goods.filter(x => x.lam === 50);
    const hasDr = s.cart.some(x => x.kind === 'drive'), hasDem = s.cart.some(x => x.kind === 'custom' && /демонтаж/i.test(x.title || ''));
    const up = [];
    if (w50.length && !hasDr) up.push({ text: 'Автоматика для 50 мм: привод и пульт (' + w50.length + ' ' + (w50.length === 1 ? 'окно' : 'окна') + ')', cta: 'Подобрать', act: () => { JalCalcScreen.editAuto(w50[0].sup); window.JalApp.tab('calc'); } });
    if (!s.region && goods.length && !hasDem) up.push({ text: 'Демонтаж старых жалюзи: ' + goods.reduce((a, x) => a + x.qty, 0) + ' шт по 500 ₽', cta: 'Добавить', act: () => set({ cart: C.cart.concat([{ kind: 'custom', title: 'Демонтаж старых жалюзи', qty: goods.reduce((a, x) => a + x.qty, 0), price: 500, cost: '' }]) }) });

    const cf = s.cf, cfOk = cf && Number(cf.price) > 0;
    const setCf = (k, v) => { C.cf = Object.assign({}, C.cf, { [k]: v }); rerender(); };
    const tabSt = on => 'min-height: 48px; border: 0; background: transparent; padding: 0 2px; font-size: 15px; text-align: center; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? 800 : 600) + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');
    return {
      cartTabs: [['Изделия', 'items'], ['Прочее', 'other']].map(x => ({ name: x[0], style: tabSt(TAB === x[1]), pick: () => { TAB = x[1]; render(); window.scrollTo(0, 0); } })), tabItems: TAB === 'items', tabOther: TAB === 'other',
      closeCart: () => window.JalApp.tab('calc'), clearCart: () => set({ cart: [] }),
      undoOn: !!s.undoItem, undoText: 'Позиция ' + (s.undoItem ? s.undoItem.i + 1 : '') + ' удалена',
      undo: () => { const u = C.undoItem; if (!u) return; C.cart.splice(u.i, 0, u.it); C.undoItem = null; try { clearTimeout(C._undoT); } catch (e) {} save(); rerender(); },
      cart: cartRows, cartEmpty: s.cart.length === 0,
      autoErrors: autoErrors.map(t => ({ t })), hasAutoErrors: autoErrors.length > 0,
      cfOpen: !!cf, cfTitle: cf ? cf.title : '', cfQty: cf ? cf.qty : '', cfPrice: cf ? cf.price : '', cfCost: cf ? cf.cost : '',
      cfSetTitle: e => setCf('title', e.target.value), cfSetQty: e => setCf('qty', e.target.value), cfSetPrice: e => setCf('price', e.target.value), cfSetCost: e => setCf('cost', e.target.value),
      cfSave: () => { const f = C.cf; if (!f) return;
        const item = { kind: 'custom', title: (f.title || '').trim(), qty: Math.max(1, Number(f.qty) || 1), price: Number(f.price) || 0, cost: f.cost === '' ? '' : Number(f.cost) };
        if (!item.price) return; if (f.i >= 0) C.cart[f.i] = item; else C.cart.push(item); C.cf = null; save(); rerender(); },
      cfCancel: () => set({ cf: null }), cfSaveLabel: cf && cf.i >= 0 ? 'Сохранить' : 'Добавить в заказ',
      cfSaveStyle: 'flex: 1 1 0; height: 48px; border: 0; border-radius: 12px; background: var(--dk); color: #FFFFFF; font-size: 15px; font-weight: 700; opacity: ' + (cfOk ? '1' : '0.45'),
      hasUpsell: up.length > 0, upsell: up,
      addCustom: () => set({ cf: { i: -1, title: '', qty: '1', price: '', cost: '' } }),
      cartArea: (Math.round(areaSum * 100) / 100).toFixed(2).replace('.', ',') + ' м²',
      cartWeight: kgSum ? (kgPart ? '' : 'от ') + LM.fmtKg(kgSum) + ' кг' : '—',
      isReg: !!s.region, notReg: !s.region, pvz: s.pvz || '', setPvz: e => { C.pvz = e.target.value; save(); },
      service: s.service || '', setService: e => set({ service: Number(e.target.value) || 0 }),
      hasSugg: sugg > 0, suggText: 'По ставкам монтажа: ' + sp.join(' + ') + ' = ' + fmt(sugg) + ' ₽ (ориентировочно)',
      suggStyle: 'height: 36px; border-radius: 10px; border: 1.5px solid var(--line); background: ' + (S === sugg ? 'var(--chip)' : '#FFFFFF') + '; color: var(--dk); font-size: 13px; font-weight: 700; padding: 0 12px; white-space: nowrap; flex-shrink: 0',
      applySugg: () => set({ service: sugg }),
      disc: s.disc || '', setDisc: e => { const v = Math.max(0, Number(e.target.value) || 0), mx = s.discMode === 'pct' ? 50 : Math.floor(total * 0.5); if (v > mx) alert('Скидка не больше 50% от суммы: ' + (s.discMode === 'pct' ? '50%' : fmt(mx) + ' ₽')); set({ disc: v ? String(Math.min(v, mx)) : '' }); },
      discPct: () => set({ discMode: 'pct', disc: '' }), discRub: () => set({ discMode: 'rub', disc: '' }), discPctStyle: tabBtn(pctOn), discRubStyle: tabBtn(!pctOn),
      hasDisc: discAmt > 0, discLine: 'Сумма без скидки ' + fmt(total) + ' ₽ · скидка −' + fmt(discAmt) + ' ₽' + (pctOn ? ' (' + dv + '%)' : ''),
      hasBelow: showProfit && below.length > 0, belowText: 'Ниже минимальной прибыли: позиции ' + below.join(', ') + (discAmt > 0 ? '. Скидка съедает прибыль, уменьши её.' : '.'),
      needDog: s.needDog, toggleDog: () => set({ needDog: !C.needDog }),
      dogRowStyle: 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 10px; font-size: 15px; color: var(--ink); font-weight: ' + (s.needDog ? '700' : '500') + '; background: ' + (s.needDog ? 'var(--sel)' : 'transparent'),
      dogBoxStyle: 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid ' + (s.needDog ? 'var(--ac)' : 'var(--chk)') + '; background: ' + (s.needDog ? 'var(--ac)' : 'transparent'),
      dogMark: s.needDog ? '✓' : '',
      cartTotal: fmt(netTotal) + ' ₽', cartPieces: pcs, showProfit, cartProfit: (netProf >= 0 ? '+' : '') + fmt(netProf),
      cartCount: s.cart.length,
      openKp: () => window.JalApp.openKp(), openKpVars: () => window.JalApp.openKpVars(), openOrder: () => window.JalApp.tab('order'),
      openOrders: () => window.JalApp.tab('ord'), openSettings: () => window.JalApp.tab('set')
    };
  }

  /* Три варианта КП: каждое жалюзи считается у поставщика коллекции (Стандарт, Классик, Премиум), прочие позиции без изменений. */
  function variants(st) {
    const sC = st || C, CS = window.JalCalcScreen, base = sC.cart.map(calcRow);
    return CS.VARIANTS.map(v => {
      const sups = sC.cart.map(it => (it.kind || it.sup === undefined ? it.sup : v.sup));
      const calcs = sC.cart.map((it, i) => {
        if (it.kind) return base[i];
        const r = CS.priceFor(it, v.sup, v.cat);
        return r ? { ok: true, unit: r.unit, profit: r.profit, warn: [] } : { ok: false, warn: [] };
      });
      const F = compute(sC, { calcs, sups });
      return { v, F, miss: sC.cart.some((it, i) => !it.kind && !calcs[i].ok) };
    });
  }

  /* Заказ для документов: цены уже с доставкой и установкой, скидка отдельной суммой. */
  function toOrder(st) {
    const sC = st || C, F = compute(sC), items = [];
    sC.cart.forEach((it, i) => {
      const c = F.calcs[i]; if (!c.ok) return;
      const price = c.ownPrice || it.kind === 'custom' ? c.unit : ceil100(c.unit + F.ships[i] + F.adds[i]);
      for (let k = 0; k < it.qty; k++) {
        if (it.kind === 'custom') items.push({ kind: 'custom', title: it.title || 'Услуга', price, profit: c.profit, cost: it.cost === '' || it.cost == null ? '' : Number(it.cost), costOk: !!it.costOk, ci: i });
        else if (it.kind) items.push({ kind: it.kind, sup: SUPNAME[it.sup] || it.sup, title: c.auto.name + (it.kind === 'drive' ? ' (привод)' : ''), price, profit: c.profit });
        else items.push({ sup: SUPNAME[it.sup] || it.sup, mat: it.mat, lam: it.lam, W: (+it.w) / 10, H: (+it.h) / 10, ctrl: it.ctrl,
          o: { color: c.col ? c.col.name : null, opts: Object.keys(it.opts || {}).filter(n => it.opts[n]), fix: it.fix || null }, price, profit: c.profit });
      }
    });
    let vars = null;
    try {
      const vs = variants(sC); vars = vs.map(x => ({ name: x.v.name, about: x.v.about, best: !!x.v.best, miss: x.miss, total: x.F.total }));
      let k = 0;
      sC.cart.forEach((it, i) => { if (!F.calcs[i].ok) return;
        for (let q = 0; q < it.qty; q++, k++) items[k].pv = vs.map(x => (x.F.calcs[i].ok ? (x.F.calcs[i].ownPrice ? x.F.calcs[i].unit : ceil100(x.F.calcs[i].unit + x.F.ships[i] + x.F.adds[i])) : null)); });
    } catch (e) { vars = null; }
    if (F.svcLeft) items.push({ kind: 'custom', title: 'Доставка и установка', price: F.svcLeft, profit: F.svcLeft, cost: 0, costOk: true, ci: -1, pv: (vars || []).map(() => F.svcLeft) });
    return { items, priced: true, delivery: F.S, disc: F.discAmt, needDog: sC.needDog, vars };
  }

  let mounted = null, TAB = 'items';
  function rerender() { if (window.JalApp && document.getElementById('cartRoot') && !document.getElementById('cartRoot').hidden) render(); else if (window.JalCalcScreen) { try { JalCalcScreen.render(); } catch (e) {} } }
  function render() {
    if (!AUTO) return;
    const box = document.getElementById('cartRoot');
    if (!mounted) mounted = JalTpl.mount(box, document.getElementById('tplCart'));
    let cls = 'p0'; try { const o = JSON.parse(localStorage.getItem('jal_theme') || '{}'); cls = 'p' + ((o.pal | 0) % 5) + ((o.theme === 'night' || (o.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)) ? ' nt' : ''); } catch (e) {}
    box.className = 'scr ' + cls;
    box.setAttribute('style', 'min-height: 100vh; box-sizing: border-box; background: var(--bg); font-family: Inter, -apple-system, system-ui, sans-serif; color: var(--ink); display: flex; flex-direction: column; position: relative');
    mounted.render(build());
  }

  /* для главного экрана */
  function addItem(item) { C.cart.push(item); save(); }
  function replaceItem(i, item) { C.cart[i] = item; save(); }
  const snapshot = () => JSON.parse(JSON.stringify({ cart: C.cart, service: C.service, region: C.region, pvz: C.pvz, disc: C.disc, discMode: C.discMode, needDog: C.needDog }));
  function restore(snap, no) { Object.assign(C, { region: false, pvz: '' }, JSON.parse(JSON.stringify(snap)), { editNo: no || null, cf: null, undoItem: null }); save(); }
  function clear() { C.editNo = null; C.cart = []; C.service = 0; C.pvz = ''; C.disc = ''; save(); }

  const setRegion = on => { C.region = !!on; save(); rerender(); };
  window.JalCart = { save, rerender, setRegion, RATES, MINP, saveCfg, C, snapshot, restore, setSheets, render, addItem, replaceItem, clear, count: () => C.cart.length, toOrder, compute,
    autoList: (sup, kind) => (AUTO && AUTO[sup] ? AUTO[sup][kind] : null), autoQty, autoStep, hasAuto: sup => !!(AUTO && AUTO[sup]),
    counts: () => ({ drive: C.cart.filter(x => x.kind === 'drive').reduce((a, x) => a + x.qty, 0), remote: C.cart.filter(x => x.kind === 'remote').reduce((a, x) => a + x.qty, 0) }) };
})();
