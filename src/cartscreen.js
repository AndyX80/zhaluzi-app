/* Корзина (экран по макету Main.dc.html) и автоматика: данные из листа «Автоматика». */
(function () {
  'use strict';
  const LM = window.JalLimits;
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ceil100 = x => Math.ceil(x / 100 - 1e-9) * 100;
  const K0 = 'jal_cart2';
  const C = { cart: [], service: 0, disc: '', discMode: 'pct', needDog: true, cf: null, undoItem: null };
  try { Object.assign(C, JSON.parse(localStorage.getItem(K0) || '{}')); C.cf = null; C.undoItem = null; } catch (e) {}
  const save = () => { try { localStorage.setItem(K0, JSON.stringify({ cart: C.cart, service: C.service, disc: C.disc, discMode: C.discMode, needDog: C.needDog })); } catch (e) {} };

  const CTRL_TXT = { L: 'поворот и подъём слева', R: 'поворот и подъём справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' };
  const CTRL_TXT_CHAIN = { L: 'цепочка слева', R: 'цепочка справа' };
  // Ставки монтажа (ориентировочно) и минимальная прибыль на изделие
  const RATES = { w50: 3000, w50auto: 5000, w25: 1200, w25auto: 2000, delivery: 1000 };
  const MINP = { def: 2000, p: {} };
  const SUPNAME = { Amigo: 'Амиго', Foroom: 'Форум' };

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
  function compute(st) {
    const App = window.JalApp, s = st || C;
    const calcs = s.cart.map(calcRow);
    const S = Number(s.service) || 0;
    const adds = spread(s.cart.map((it, i) => ({ ok: calcs[i].ok && it.kind !== 'custom', qty: it.qty })), S);
    const lineSum = s.cart.map((it, i) => (calcs[i].ok ? ceil100(calcs[i].unit + adds[i]) * it.qty : 0));
    const total = lineSum.reduce((x, y) => x + y, 0);
    const dv = Math.max(0, Number(s.disc) || 0);
    const discAmt = Math.min(total, s.discMode === 'pct' ? Math.round(total * Math.min(dv, 100) / 100 / 100) * 100 : dv);
    const goodsSum = s.cart.reduce((x, it, i) => x + (calcs[i].ok ? calcs[i].unit * it.qty : 0), 0);
    return { calcs, S, adds, lineSum, total, dv, discAmt, goodsSum, netTotal: total - discAmt };
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
    const redWarn = on => on ? 'flex-grow: 1; font-size: 12px; color: #B3261E; font-weight: 600; align-self: center' : 'flex-grow: 1';
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
        dupShow: true, dup: () => { JalCalcScreen.edit(it, -1); window.JalApp.tab('calc'); }, remove: rm });
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
    if (goods.length && !hasDem) up.push({ text: 'Демонтаж старых жалюзи: ' + goods.reduce((a, x) => a + x.qty, 0) + ' шт по 500 ₽', cta: 'Добавить', act: () => set({ cart: C.cart.concat([{ kind: 'custom', title: 'Демонтаж старых жалюзи', qty: goods.reduce((a, x) => a + x.qty, 0), price: 500, cost: '' }]) }) });

    const cf = s.cf, cfOk = cf && Number(cf.price) > 0;
    const setCf = (k, v) => { C.cf = Object.assign({}, C.cf, { [k]: v }); rerender(); };
    return {
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
      service: s.service || '', setService: e => set({ service: Number(e.target.value) || 0 }),
      hasSugg: sugg > 0, suggText: 'По ставкам монтажа: ' + sp.join(' + ') + ' = ' + fmt(sugg) + ' ₽ (ориентировочно)',
      suggStyle: 'height: 36px; border-radius: 10px; border: 1.5px solid var(--line); background: ' + (S === sugg ? 'var(--chip)' : '#FFFFFF') + '; color: var(--dk); font-size: 13px; font-weight: 700; padding: 0 12px; white-space: nowrap',
      applySugg: () => set({ service: sugg }),
      disc: s.disc || '', setDisc: e => set({ disc: e.target.value }),
      discPct: () => set({ discMode: 'pct' }), discRub: () => set({ discMode: 'rub' }), discPctStyle: tabBtn(pctOn), discRubStyle: tabBtn(!pctOn),
      hasDisc: discAmt > 0, discLine: 'Сумма без скидки ' + fmt(total) + ' ₽ · скидка −' + fmt(discAmt) + ' ₽' + (pctOn ? ' (' + dv + '%)' : ''),
      hasBelow: showProfit && below.length > 0, belowText: 'Ниже минимальной прибыли: позиции ' + below.join(', ') + (discAmt > 0 ? '. Скидка съедает прибыль, уменьши её.' : '.'),
      needDog: s.needDog, toggleDog: () => set({ needDog: !C.needDog }),
      dogRowStyle: 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 10px; font-size: 15px; color: var(--ink); font-weight: ' + (s.needDog ? '700' : '500') + '; background: ' + (s.needDog ? 'var(--sel)' : 'transparent'),
      dogBoxStyle: 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid ' + (s.needDog ? 'var(--ac)' : 'var(--chk)') + '; background: ' + (s.needDog ? 'var(--ac)' : 'transparent'),
      dogMark: s.needDog ? '✓' : '',
      cartTotal: fmt(netTotal) + ' ₽', cartPieces: pcs, showProfit, cartProfit: (netProf >= 0 ? '+' : '') + fmt(netProf),
      cartCount: s.cart.length,
      openKp: () => window.JalApp.openKp(), openOrder: () => window.JalApp.tab('order'),
      openOrders: () => window.JalApp.tab('ord'), openSettings: () => window.JalApp.tab('set')
    };
  }

  /* Заказ для документов: цены уже с доставкой и установкой, скидка отдельной суммой. */
  function toOrder(st) {
    const sC = st || C, F = compute(sC), items = [];
    sC.cart.forEach((it, i) => {
      const c = F.calcs[i]; if (!c.ok) return;
      const price = ceil100(c.unit + F.adds[i]);
      for (let k = 0; k < it.qty; k++) {
        if (it.kind === 'custom') items.push({ kind: 'custom', title: it.title || 'Услуга', price, profit: c.profit });
        else if (it.kind) items.push({ kind: it.kind, sup: SUPNAME[it.sup] || it.sup, title: c.auto.name + (it.kind === 'drive' ? ' (привод)' : ''), price, profit: c.profit });
        else items.push({ sup: SUPNAME[it.sup] || it.sup, mat: it.mat, lam: it.lam, W: (+it.w) / 10, H: (+it.h) / 10, ctrl: it.ctrl,
          o: { color: c.col ? c.col.name : null, opts: Object.keys(it.opts || {}).filter(n => it.opts[n]), fix: it.fix || null }, price, profit: c.profit });
      }
    });
    return { items, priced: true, delivery: F.S, disc: F.discAmt, needDog: sC.needDog };
  }

  let mounted = null;
  function rerender() { if (window.JalApp && document.getElementById('cartRoot') && !document.getElementById('cartRoot').hidden) render(); else if (window.JalCalcScreen) { try { JalCalcScreen.render(); } catch (e) {} } }
  function render() {
    if (!AUTO) return;
    const box = document.getElementById('cartRoot');
    if (!mounted) mounted = JalTpl.mount(box, document.getElementById('tplCart'));
    let cls = 'p0'; try { const o = JSON.parse(localStorage.getItem('jal_theme') || '{}'); cls = 'p' + ((o.pal | 0) % 5) + (o.theme === 'night' ? ' nt' : ''); } catch (e) {}
    box.className = 'scr ' + cls;
    box.setAttribute('style', 'min-height: 100vh; box-sizing: border-box; background: var(--bg); font-family: Inter, -apple-system, system-ui, sans-serif; color: var(--ink); display: flex; flex-direction: column; position: relative');
    mounted.render(build());
  }

  /* для главного экрана */
  function addItem(item) { C.cart.push(item); save(); }
  function replaceItem(i, item) { C.cart[i] = item; save(); }
  const snapshot = () => JSON.parse(JSON.stringify({ cart: C.cart, service: C.service, disc: C.disc, discMode: C.discMode, needDog: C.needDog }));
  function restore(snap, no) { Object.assign(C, JSON.parse(JSON.stringify(snap)), { editNo: no || null, cf: null, undoItem: null }); save(); }
  function clear() { C.editNo = null; C.cart = []; C.service = 0; C.disc = ''; save(); }

  window.JalCart = { C, snapshot, restore, setSheets, render, addItem, replaceItem, clear, count: () => C.cart.length, toOrder, compute,
    autoList: (sup, kind) => (AUTO && AUTO[sup] ? AUTO[sup][kind] : null), autoQty, autoStep, hasAuto: sup => !!(AUTO && AUTO[sup]),
    counts: () => ({ drive: C.cart.filter(x => x.kind === 'drive').reduce((a, x) => a + x.qty, 0), remote: C.cart.filter(x => x.kind === 'remote').reduce((a, x) => a + x.qty, 0) }) };
})();
