/* Рулонные шторы Амиго: расчёт по прайсу (цены в $ за готовое изделие по категории ткани, высоте и ширине).
   Данные читаются из листов Google Таблицы «Рулонки_параметры», «Рулонки_системы», «Рул_<сетка>», «Рулонки_опции», «Рулонки_ткани».
   Цены в репозиторий не попадают: всё приходит вместе с остальными листами (setSheets). Подключается только на десктопе. */
(function () {
  'use strict';
  const ceilTo = (x, s) => Math.ceil(x / s - 1e-9) * s;
  const SUP = 'Amigo';
  let P = {}, SYS = [], GRID = {}, OPT = {}, FAB = [], FX = 85, ready = false, FAB_BY = {};

  const unitOf = u => (u === 'м_шир' || u === 'м_выс' || u === 'м_шов' || u === 'м_цепь') ? u : 'изд';

  function setSheets(sh) {
    ready = false; P = {}; SYS = []; GRID = {}; OPT = {}; FAB = []; FAB_BY = {};
    if (!sh || !sh['Рулонки_системы'] || !sh['Рулонки_параметры']) return;
    sh['Рулонки_параметры'].slice(1).forEach(r => { if (r[0]) P[r[0]] = r[1]; });
    const par = sh['Параметры'] || []; par.forEach(r => { if (r[0] === 'курс_usd') FX = Number(r[1]) || FX; });
    sh['Рулонки_системы'].slice(1).forEach(r => {
      if (!r[0]) return;
      SYS.push({ code: String(r[0]), name: String(r[1] || r[0]), group: String(r[2] || ''), grid: String(r[3] || ''), term: Number(r[4]) || 1, mk: r[5] === '' || r[5] == null ? 2 : Number(r[5]) || 2, profit: r[6] === '' || r[6] == null ? 1000 : Number(r[6]) || 0, note: String(r[7] || '') });
    });
    SYS.forEach(s => {
      if (GRID[s.grid] || !sh[s.grid]) return;
      const rows = sh[s.grid], widths = rows[0].slice(2).map(Number), cats = {};
      rows.slice(1).forEach(r => { if (r[0] === '' || r[0] == null) return; const k = String(r[0]); (cats[k] = cats[k] || []).push({ h: Number(r[1]), v: r.slice(2).map(Number) }); });
      Object.keys(cats).forEach(k => cats[k].sort((a, b) => a.h - b.h));
      GRID[s.grid] = { widths, cats };
    });
    (sh['Рулонки_опции'] || []).slice(1).forEach(r => {
      if (!r[0] || !r[1]) return;
      const g = OPT[r[0]] = OPT[r[0]] || { order: [], groups: {} };
      let gr = g.groups[r[1]];
      if (!gr) { gr = g.groups[r[1]] = { name: String(r[1]), type: r[3] === 'флаг' ? 'flag' : 'choice', ord: Number(r[7]) || 99, items: [], i: g.order.length }; g.order.push(gr.name); }
      gr.items.push({ value: String(r[2]), usd: Number(r[4]) || 0, unit: unitOf(r[5]), def: !!Number(r[6]) });
    });
    const SER = {};
    (sh['Рулонки_ткани'] || []).slice(1).forEach(r => { if (r[1]) SER[String(r[1])] = { maxs: String(r[4] || ''), dens: Number(r[5]) || 0, wgrp: String(r[6] || ''), wet: String(r[7] || ''), coll: String(r[8] || ''), roll: Number(r[3]) || 0 }; });
    /* список тканей с цветами (выгрузка из кабинета Амиго: один на все системы); иначе только серии */
    (sh['Рулонки_ткани_цвета'] || []).slice(1).forEach(r => {
      if (!r[0]) return;
      const sr = SER[String(r[1])] || {}, f = Object.assign({ maxs: '', dens: 0, wgrp: '', wet: '', coll: '' }, sr, { key: String(r[0]), name: String(r[2]), ser: String(r[1] || ''), cat: String(r[4]), roll: Number(r[3]) || sr.roll || 0, prodW: Number(r[5]) || 0, stock: r[6] === '' || r[6] == null ? null : Number(r[6]), qty: r[7] === '' || r[7] == null ? null : Number(r[7]), img: (v => !v ? '' : v.charAt(0) === '/' ? v : '/storage-new/materials/rollers/' + String(r[0]) + '.' + v.replace(/^\./, ''))(String(r[8] || '')) });
      FAB.push(f); FAB_BY[f.key] = f;
    });
    if (!FAB.length) (sh['Рулонки_ткани'] || []).slice(1).forEach(r => {
      if (!r[0]) return;
      const f = { key: String(r[1]) + '|' + String(r[0]), name: String(r[0]), ser: String(r[1] || ''), cat: String(r[2]), roll: Number(r[3]) || 0, maxs: String(r[4] || ''), dens: Number(r[5]) || 0, wgrp: String(r[6] || ''), wet: String(r[7] || ''), coll: String(r[8] || '') };
      FAB.push(f); FAB_BY[f.key] = f;
    });
    /* свежее наличие из листа «Наличие» (его обновляет скрипт сбора) перекрывает снимок из листа тканей */
    const nal = sh['Наличие'];
    if (nal && nal.length > 1) {
      const h = nal[0], ix = n => h.indexOf(n), L = { 'есть': 2, 'мало': 1, 'нет': 0 };
      nal.slice(1).forEach(r => { if (r[ix('Продукт')] !== 'Рулонные шторы') return; const f = FAB_BY[String(r[ix('Артикул')])]; if (!f) return;
        const st = L[r[ix('Статус')]]; if (st !== undefined) f.stock = st; const q = r[ix('Остаток_м')]; if (q !== '' && q != null) f.qty = Number(q); });
    }
    FAB.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    ready = SYS.length > 0 && FAB.length > 0;
  }

  const sysOf = code => SYS.find(s => s.code === code) || null;
  const groupsOf = code => { const o = OPT[code]; return o ? o.order.map(n => o.groups[n]).sort((a, b) => a.ord - b.ord || a.i - b.i) : []; };
  const fabOf = key => FAB_BY[key] || null;

  /* значения опций по умолчанию и допустимые выбранные */
  function opts(it) {
    const sel = {}, flags = {};
    groupsOf(it.sys).forEach(g => {
      if (g.type === 'flag') { if (it.flags && it.flags[g.name]) flags[g.name] = true; return; }
      const v = it.sel && it.sel[g.name], ok = g.items.some(x => x.value === v);
      sel[g.name] = ok ? v : (g.items.find(x => x.def) || g.items[0]).value;
    });
    return { sel, flags };
  }

  function lookup(code, cat, wMm, hMm) {
    const s = sysOf(code), g = s && GRID[s.grid], rows = g && g.cats[cat];
    if (!rows) return { err: 'Для этой системы нет цены на категорию ткани ' + cat };
    const w = wMm / 1000, h = hMm / 1000;
    const maxW = g.widths[g.widths.length - 1], maxH = rows[rows.length - 1].h;
    if (w > maxW + 1e-9) return { err: 'Ширина больше максимальной для системы (' + Math.round(maxW * 1000) + ' мм)', hard: true };
    if (h > maxH + 1e-9) return { err: 'Высота больше максимальной для системы (' + Math.round(maxH * 1000) + ' мм)', hard: true };
    const ci = g.widths.findIndex(x => x >= w - 1e-9), row = rows.find(r => r.h >= h - 1e-9);
    const usd = row && ci >= 0 ? row.v[ci] : NaN;
    if (!(usd > 0)) return { err: 'В прайсе нет цены на такой размер' };
    return { usd, w: g.widths[ci], h: row.h };
  }

  /* длина металлической цепи: высота изделия минус 15 см */
  const chainLen = hMm => Math.max(0, hMm - 150) / 1000;

  function calc(it) {
    const out = { ok: false, warn: [], msg: '' };
    if (!ready) { out.msg = 'Цены на рулонки не загружены (листы «Рулонки_…» в таблице)'; return out; }
    const s = sysOf(it.sys), f = fabOf(it.fab), W = Number(it.w) || 0, H = Number(it.h) || 0;
    if (!s) { out.msg = 'Выберите систему'; return out; }
    if (!f) { out.needFab = true; out.msg = 'Выберите ткань'; return out; }
    if (!(W > 0 && H > 0)) { out.msg = 'Введите размеры'; return out; }
    const L = lookup(s.code, f.cat, W, H);
    if (L.err) { out.msg = L.err; if (L.hard) out.warn.hard = true; return out; }
    const disc = P['скидка_рулонки'] != null ? Number(P['скидка_рулонки']) : 0.4, k = (1 - disc) * FX;
    const coef = s.mk, step = Number(P['округление']) || 100;
    const base = Math.round(L.usd * k);
    const o = opts(it), optP = {}, optCost = {};
    let optUsd = 0;
    groupsOf(s.code).forEach(g => {
      const pick = g.type === 'flag' ? (o.flags[g.name] ? g.items[0] : null) : g.items.find(x => x.value === o.sel[g.name]);
      if (!pick || !pick.usd) return;
      const q = pick.unit === 'м_шир' ? W / 1000 : (pick.unit === 'м_выс' || pick.unit === 'м_шов') ? H / 1000 : pick.unit === 'м_цепь' ? chainLen(H) : 1;
      const usd = pick.usd * q; optUsd += usd;
      const label = g.type === 'flag' ? g.name : pick.value;
      optCost[label] = Math.round(usd * k); optP[label] = Math.ceil(usd * k * coef / step - 1e-9) * step;
    });
    const costOpt = Math.round(optUsd * k), profit0 = s.profit;
    const baseRetail = ceilTo(base * s.mk, step), addSum = Object.keys(optP).reduce((a, n) => a + optP[n], 0);
    const unit = baseRetail + addSum, cost = base + costOpt;
    const pw = f.prodW || (f.roll ? f.roll - 10 : 0);
    if (pw && W / 10 > pw && !(o.flags['Сварка ткани'])) out.warn.push('ширина больше рабочей ширины ткани (' + pw + ' см): нужна сварка ткани');
    Object.assign(out, { ok: true, unit, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: profit0, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, gridW: L.w, gridH: L.h, usd: L.usd });
    return out;
  }

  function describe(it, c) {
    const s = sysOf(it.sys), f = fabOf(it.fab), o = opts(it), parts = [];
    groupsOf(it.sys).forEach(g => {
      if (g.type === 'flag') { if (o.flags[g.name]) parts.push(g.name.toLowerCase()); return; }
      const d = g.items.find(x => x.def) || g.items[0]; if (o.sel[g.name] !== d.value) parts.push(g.name.toLowerCase() + ': ' + o.sel[g.name].toLowerCase());
    });
    const fc = o.sel['Цвет фурнитуры'];
    return { title: 'Рулонная штора' + (s ? ' ' + s.name : ''), sub: (f ? 'ткань ' + f.name : 'ткань не выбрана') + (fc ? ' · фурнитура ' + fc.toLowerCase() : '') + ' · цепочка ' + (it.ctrl === 'R' ? 'справа' : 'слева') + (parts.length ? ' · ' + parts.join(', ') : '') };
  }

  window.JalRolo = {
    SUP, setSheets, ready: () => ready, systems: () => SYS, sysOf, fabrics: () => FAB, fabOf, groups: groupsOf, opts, calc, describe,
    termFor: it => { const s = sysOf(it.sys); return s ? s.term + (Number(P['срок_добавка_дн']) || 5) : 0; },
    photoUrl: f => (f && f.img ? String(P['фото_адрес'] || 'https://customizer.amigo.ru').replace(/\/$/, '') + f.img : ''),
    param: k => P[k]
  };
})();
