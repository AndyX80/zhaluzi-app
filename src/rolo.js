/* Рулонные шторы Амиго: расчёт по прайсу (цены в $ за готовое изделие по категории ткани, высоте и ширине).
   Данные читаются из листов Google Таблицы «Рулонки_параметры», «Рулонки_системы», «Рул_<сетка>», «Рулонки_опции», «Рулонки_ткани».
   Цены в репозиторий не попадают: всё приходит вместе с остальными листами (setSheets). Подключается только на десктопе. */
(function () {
  'use strict';
  const ceilTo = (x, s) => Math.ceil(x / s - 1e-9) * s;
  const SUP = 'Amigo';
  let RED = null, P = {}, SYS = [], GRID = {}, OPT = {}, FAB = [], FX = 85, ready = false, FAB_BY = {}, WIND = {}, WINDZ = {}, VP = {}, VT = {}, GT = {}, GP = {}, WIN = [], WIN_BY = {}, NOROOF = {};
  const numC = (v, d) => v === '' || v == null || isNaN(Number(String(v).replace(',', '.'))) ? d : Number(String(v).replace(',', '.'));

  const unitOf = u => (u === 'м_шир' || u === 'м_выс' || u === 'м_шов' || u === 'м_цепь') ? u : 'изд';

  function setSheets(sh) {
    ready = false; RED = null; P = {}; SYS = []; GRID = {}; OPT = {}; FAB = []; FAB_BY = {}; WIND = {}; WINDZ = {}; VP = {}; VT = {}; GT = {}; GP = {}; WIN = []; WIN_BY = {}; NOROOF = {};
    if (!sh || !sh['Рулонки_системы'] || !sh['Рулонки_параметры']) return;
    sh['Рулонки_параметры'].slice(1).forEach(r => { if (r[0]) P[r[0]] = r[1]; });
    const par = sh['Параметры'] || []; par.forEach(r => { if (r[0] === 'курс_usd') FX = Number(r[1]) || FX; });
    sh['Рулонки_системы'].slice(1).forEach(r => {
      if (!r[0]) return;
      SYS.push({ code: String(r[0]), name: String(r[1] || r[0]), group: String(r[2] || ''), grid: String(r[3] || ''), term: Number(r[4]) || 1, mk: r[5] === '' || r[5] == null ? 2 : Number(r[5]) || 2, profit: r[6] === '' || r[6] == null ? 1000 : Number(r[6]) || 0, note: String(r[7] || ''), model: /зебр/i.test(String(r[8] || '')) ? 'zebra' : /roof/i.test(String(r[8] || '')) ? 'roof' : 'rolo' });
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
    const colorRows = (sh['Рулонки_ткани_цвета'] || []).slice(1).map(r => ({ r, z: false })).concat((sh['Зебра_ткани_цвета'] || []).slice(1).map(r => ({ r, z: true })));
    colorRows.forEach(o => {
      const r = o.r; if (!r[0]) return;
      const sr = SER[String(r[1])] || {}, f = Object.assign({ maxs: '', dens: 0, wgrp: '', wet: '', coll: '' }, sr, { z: o.z, key: String(r[0]), name: String(r[2]), ser: String(r[1] || ''), cat: String(r[4]), roll: Number(r[3]) || sr.roll || 0, prodW: Number(r[5]) || 0, stock: r[6] === '' || r[6] == null ? null : Number(r[6]), qty: r[7] === '' || r[7] == null ? null : Number(r[7]), img: (v => !v && !o.z ? '' : (v = v || 'png').charAt(0) === '/' ? v : '/storage-new/materials/' + (o.z ? 'zebra' : 'rollers') + '/' + String(r[0]) + '.' + v.replace(/^\./, ''))(String(r[8] || '')) });
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
      nal.slice(1).forEach(r => { if (r[ix('Продукт')] !== 'Рулонные шторы' && r[ix('Продукт')] !== 'Зебра') return; const f = FAB_BY[String(r[ix('Артикул')])]; if (!f) return;
        const st = L[r[ix('Статус')]]; if (st !== undefined) f.stock = st; const q = r[ix('Остаток_м')]; if (q !== '' && q != null) f.qty = Number(q); });
    }
    /* Roof: мансардные окна (производитель, серия, модель, размер штор и цены по категориям ткани 1–5, $) и ткани, непригодные для Roof */
    (sh['Roof_окна'] || []).slice(1).forEach(r => {
      if (!r[0] || !r[1]) return;
      const o = { id: String(r[0]), man: String(r[1]), ser: String(r[2] || ''), mod: String(r[3] || '').trim(), w: numC(r[4], 0), h: numC(r[5], 0), p: [6, 7, 8, 9, 10].map(i => numC(r[i], 0)) };
      if (o.w && o.h && o.p[0] > 0) { WIN.push(o); WIN_BY[o.id] = o; }
    });
    const noRoof = {}; (sh['Roof_ткани_нет'] || []).slice(1).forEach(r => { if (r[0]) noRoof[String(r[0]).trim().toUpperCase()] = 1; });
    (sh['Рулонки_ткани'] || []).slice(1).forEach(r => { if (r[0] && noRoof[String(r[0]).trim().toUpperCase()]) String(r[1] || '').split(/\s+/).forEach(c => { if (c) NOROOF[c] = 1; }); });
    FAB.forEach(f => { if (!f.m && !f.z && NOROOF[f.ser]) f.roof = 'нет'; });
    /* вертикальные жалюзи: листы «Верт_типы», «Верт_серии», «Верт_опции», «Верт_параметры», «Верт_ткани_цвета» */
    if (sh['Верт_типы'] && sh['Верт_серии']) {
      (sh['Верт_параметры'] || []).slice(1).forEach(r => { if (r[0]) VP[r[0]] = String(r[1]).replace(',', '.'); });
      const num = (v, d) => v === '' || v == null || isNaN(Number(String(v).replace(',', '.'))) ? d : Number(String(v).replace(',', '.'));
      sh['Верт_типы'].slice(1).forEach(r => {
        if (!r[0]) return;
        const t = String(r[0]); VT[t] = { wmin: num(r[2], 0), wmax: num(r[3], 0), hmin: num(r[4], 0), hmax: num(r[5], 0), amax: num(r[6], 0), corn: num(r[10], 0) };
        SYS.push({ code: 'V-' + t, name: String(r[1] || t), group: 'Вертикальные', grid: '', term: num(r[9], 1), mk: num(r[7], 2), profit: num(r[8], 1000), note: '', model: 'vert', vt: t });
        const og = OPT['V-' + t] = { order: [], groups: {} };
        (sh['Верт_опции'] || []).slice(1).forEach(o => {
          if (!o[0] || (o[5] && String(o[5]).split(/[,;.\s]+/).map(x => x.trim()).indexOf(t) < 0)) return;
          if (o[1] === 'флаг' && !num(o[4], 0) && !String(o[3] || '')) return;
          const nm = /^декоративный карниз$/i.test(String(o[0]).trim()) ? 'Грувер' : String(o[0]); og.order.push(nm);
          og.groups[nm] = { name: nm, type: 'flag', ord: og.order.length, items: [{ value: nm, usd: num(o[4], 0), unit: String(o[3] || ''), def: false }], i: og.order.length };
        });
      });
      const ser = {};
      sh['Верт_серии'].slice(1).forEach(r => {
        if (!r[1]) return;
        const o = { vt: String(r[0]), name: String(r[1]), cat: String(r[2] || ''), usd: num(r[3], 0), dens: num(r[4], 0), line: String(r[5]) === 'лайн' };
        ser[o.vt + '|' + o.name.toUpperCase()] = o;
        if (VT[o.vt]) { const f = { z: false, m: 'vert', vt: o.vt, key: 'V|' + o.vt + '|' + o.name, name: o.name, ser: o.name, cat: o.cat, usd: o.usd, line: o.line, dens: o.dens, roll: 0, prodW: 0, stock: null, qty: null, img: '', maxs: '', wgrp: '', wet: '', coll: '' }; FAB.push(f); FAB_BY[f.key] = f; }
      });
      /* цвета/артикулы из кабинета Амиго (если выгружены): серия ищется по началу названия */
      (sh['Верт_ткани_цвета'] || []).slice(1).forEach(r => {
        if (!r[0]) return; const t = String(r[3] || 'ткань'), nm = String(r[2] || '').toUpperCase();
        const ye = x => String(x || '').toUpperCase().replace(/Ё/g, 'Е').trim(); /* серия: явная из колонки B, иначе по началу названия */
        let b = null; const sn = ye(r[1]); if (sn) Object.keys(ser).forEach(k => { const o = ser[k]; if (o.vt === t && ye(o.name) === sn) b = o; });
        if (!b) Object.keys(ser).forEach(k => { const o = ser[k]; if (o.vt === t && (ye(nm) === ye(o.name) || ye(nm).indexOf(ye(o.name) + ' ') === 0) && (!b || o.name.length > b.name.length)) b = o; });
        if (!b) return;
        const v = String(r[8] || 'png'), f = { z: false, m: 'vert', vt: t, key: String(r[0]), name: String(r[2]), ser: b.name, cat: b.cat, usd: b.usd, line: b.line, dens: b.dens, roll: 0, prodW: 0, stock: r[6] === '' || r[6] == null ? null : Number(r[6]), qty: r[7] === '' || r[7] == null ? null : Number(r[7]), img: v.charAt(0) === '/' ? v : '/storage-new/materials/' + (VP['фото_папка'] || 'vertical') + '/' + String(r[0]) + '.' + v.replace(/^\./, ''), maxs: '', wgrp: '', wet: '', coll: '' };
        FAB.push(f); FAB_BY[f.key] = f;
      });
    }
    /* горизонтальные алюминиевые жалюзи Амиго: листы «ГЖА_типы», «ГЖА_ленты», «ГЖА_опции», «ГЖА_параметры» */
    if (sh['ГЖА_типы'] && sh['ГЖА_ленты']) {
      (sh['ГЖА_параметры'] || []).slice(1).forEach(r => { if (r[0]) GP[String(r[0])] = numC(r[1], 0); });
      sh['ГЖА_типы'].slice(1).forEach(r => {
        if (!r[0]) return;
        const t = String(r[0]); GT[t] = { wmin: numC(r[2], 0), wmax: numC(r[3], 0), hmin: numC(r[4], 0), hmax: numC(r[5], 0), amax: numC(r[6], 0), grid: String(r[10] || ''), base: String(r[11] || '') };
        const gnm = GT[t].grid;
        if (gnm && sh[gnm] && !GRID[gnm]) { /* кассетные (Венус): цена за изделие из сетки «Кат | Высота | ширины…» */
          const rows = sh[gnm], widths = rows[0].slice(2).map(Number), cats = {};
          rows.slice(1).forEach(q => { if (q[0] === '' || q[0] == null) return; const k = String(q[0]); (cats[k] = cats[k] || []).push({ h: Number(q[1]), v: q.slice(2).map(Number) }); });
          Object.keys(cats).forEach(k => cats[k].sort((a, b) => a.h - b.h));
          GRID[gnm] = { widths, cats };
        }
        SYS.push({ code: 'A-' + t, name: String(r[1] || t), group: 'Горизонтальные алюминиевые', grid: gnm, term: numC(r[9], 1), mk: numC(r[7], 2), profit: numC(r[8], 1000), note: '', model: 'gja', vt: t });
        const og = OPT['A-' + t] = { order: [], groups: {} };
        (sh['ГЖА_опции'] || []).slice(1).forEach(o => {
          if (!o[0] || (o[5] && String(o[5]).split(/[,;.\s]+/).map(x => x.trim()).indexOf(t) < 0)) return;
          const nm = String(o[0]).trim(), ch = String(o[1]) === 'выбор';
          let g = og.groups[nm]; if (!g) { g = og.groups[nm] = { name: nm, type: ch ? 'choice' : 'flag', ord: og.order.length + 1, items: [], i: og.order.length }; og.order.push(nm); }
          g.items.push({ value: ch ? String(o[2]) : nm, usd: numC(o[3], 0), unit: String(o[4] || ''), def: ch && (/^да/i.test(String(o[6] || '')) || (!g.items.length && !(sh['ГЖА_опции'] || []).some(q => q[0] === o[0] && /^да/i.test(String(q[6] || ''))))) });
        });
      });
      sh['ГЖА_ленты'].slice(1).forEach(r => {
        const t = String(r[0]); if (!r[1] || !GT[t]) return;
        const f = { z: false, m: 'gja', vt: t, key: 'A|' + t + '|' + r[1], name: String(r[2] || r[1]), ser: (SYS.find(x => x.code === 'A-' + t) || {}).name || t, cat: '', usd: numC(r[3], 0), perf: /^да/i.test(String(r[4] || '')), roll: 0, prodW: 0, stock: r[6] === '' || r[6] == null ? null : Number(r[6]), qty: r[7] === '' || r[7] == null ? null : numC(r[7], null), img: String(r[5] || ''), maxs: '', wgrp: '', wet: '', coll: '' };
        FAB.push(f); FAB_BY[f.key] = f;
      });
      /* Венус: те же ленты, что у обычных 16/25 мм; категория цены из «Венус_категории» (нет в списке = в Венус не поставляется) */
      if (sh['Венус_редуктор'] && sh['Венус_редуктор'].length > 1) { /* клетки сетки, где Венус делается только с редуктором и цепью-петлёй (тёмно-серые в прайсе) */
        const rr = sh['Венус_редуктор']; RED = { widths: rr[0].slice(1).map(Number), rows: rr.slice(1).filter(q => q[0] !== '' && q[0] != null).map(q => ({ h: Number(q[0]), v: q.slice(1).map(x => /^[рp]/i.test(String(x || '').trim())) })).sort((a, b) => a.h - b.h) };
      }
      const VC = {}; (sh['Венус_категории'] || []).slice(1).forEach(q => { if (q[1] !== '' && q[1] != null) VC[String(q[0]) + '|' + String(q[1])] = String(q[2]); });
      Object.keys(GT).forEach(t => {
        if (!GT[t].grid || !GT[t].base) return;
        const sn = (SYS.find(x => x.code === 'A-' + t) || {}).name || t;
        FAB.filter(b => b.m === 'gja' && b.vt === GT[t].base).slice().forEach(b => {
          const code = b.key.split('|')[2], cat = VC[GT[t].base + '|' + code]; if (!cat) return;
          const f = Object.assign({}, b, { vt: t, key: 'A|' + t + '|' + code, ser: sn, cat: GT[t].base + '|' + cat, usd: 0 });
          FAB.push(f); FAB_BY[f.key] = f;
        });
      });
    }
    /* серия, у которой выгружены цвета, в списке не дублируется общей строкой (в FAB_BY она остаётся для старых просчётов) */
    /* если для типа цвета выгружены, серии без цветов в кабинете нет: снята с продажи, не показываем */
    const hasCol = {}, typCol = {}; FAB.forEach(f => { if (f.m === 'vert' && f.key.indexOf('V|') !== 0) { hasCol[f.vt + '|' + f.ser] = 1; typCol[f.vt] = 1; } });
    FAB.forEach(f => { if (f.m === 'vert' && f.key.indexOf('V|') === 0 && (hasCol[f.vt + '|' + f.ser] || typCol[f.vt])) f.gone = true; });
    FAB = FAB.filter(f => !f.gone);
    const pin = f => (f.m === 'gja' && (f.vt === '25' || f.vt === 'V25') && /^0225 /.test(f.name) ? 1 : 0); /* ГЖ 25: «0225 Белый глянец» первой в списке */
    FAB.sort((a, b) => pin(b) - pin(a) || a.name.localeCompare(b.name, 'ru'));
    /* максимальные высоты намотки ткани по системе (таблицы Амиго «максимальных намоток»), м */
    [['Рул_намотка', WIND], ['Зебра_намотка', WINDZ]].forEach(([nm, dst]) => {
      const t = sh[nm]; if (!t || !t.length) return; const hd = t[0].map(String);
      t.slice(1).forEach(r => { if (!r[0]) return; const o = {}; hd.forEach((k, i) => { if (i > 0 && r[i] !== '' && r[i] != null && !isNaN(Number(r[i]))) o[k] = Number(r[i]); }); dst[String(r[0])] = o; });
    });
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

  /* категория ткани → колонка цен Roof (1–5); E в таблицах Roof нет, считается как 1 */
  const roofIdx = f => { const c = String(f && f.cat || '').trim().toUpperCase(), n = /^[EЕ]$/.test(c) ? numC(P['roof_категория_E'], 1) : parseInt(c, 10); return n >= 1 && n <= 5 ? n - 1 : -1; };

  /* максимальная высота (м), на которую смотается ткань в этой системе с выбранной трубой и кронштейном; null = нет данных в таблице */
  function wind(it) {
    const s = sysOf(it.sys), f = fabOf(it.fab); if (!s || !f) return null;
    const z = s.model === 'zebra', T = (z ? WINDZ : WIND)[f.ser]; if (!T) return null;
    const o = opts(it), num = n => { const m = String(o.sel[n] || '').match(/\d+/); return m ? m[0] : ''; };
    const c = s.code, base = { 'ROLLA1': 'UNI-1', 'ROLLA2': 'UNI-2', 'Z-ROLLA1': 'Z-UNI1', 'Z-ROLLA2': 'Z-UNI2' }[c] || c;
    let key = base;
    if (/^(Z-)?(BNT-M|BNT-L|K-M|K-M\+|K-L)$/.test(c)) {
      const dbr = { 'K-M': '36', 'K-M+': '45', 'K-L': '51', 'Z-K-M': '36' }[c];
      key = c + '|' + num('Труба') + '|' + (dbr || num('Кронштейн'));
    }
    const max = T[key]; if (max == null) return null;
    let wl = null;
    if (z) { const g = /MGS/.test(c) ? T['Шир_MGS_м'] : /BNT|K-M/.test(c) ? T['Шир_BNT_м'] : T['Шир_UNI_MINI_м']; if (g) wl = g; }
    return { max, key, wlim: wl, th: T['Толщина_мм'] };
  }

  /* диаграммы гарантийных размеров Амиго по группе ткани: [ширина м, минимальная высота м], с которой размеры негарантийные */
  const DIAG = {
    uni: { w: 1.4, h: 2.4, A: [[1.4, 2.2]], B: [[1.4, 1.4], [1.3, 2.2]], C: [[1.4, 0.8], [1.3, 1.4], [1.2, 2.2]] },
    mg: { w: 2.0, h: 3.0, A: [[2.0, 2.0]], B: [[2.0, 1.2], [1.9, 1.8], [1.8, 2.2], [1.7, 3.0]], C: [[2.0, 0.8], [1.9, 1.0], [1.8, 1.4], [1.7, 1.8], [1.6, 2.2], [1.5, 3.0]] }
  };
  const DIAG_OF = { 'MINI': 'uni', 'UNI-1': 'uni', 'UNI-2': 'uni', 'UNI-2П': 'uni', 'ROLLA1': 'uni', 'ROLLA2': 'uni', 'Z-MINI': 'uni', 'Z-UNI1': 'uni', 'Z-UNI2': 'uni', 'Z-ROLLA1': 'uni', 'Z-ROLLA2': 'uni', 'MG': 'mg', 'Z-MGS': 'mg' };

  const BNTD = {
    'M29A': '.................|.................|.................|.................|.................|g................|gg...............|gg...............|ggg..............|gggg.............|gggg.............|ggggg............|gggggg...........|gggggg...........',
    'M29B': '.................|.................|.................|.................|.................|g................|gg...............|gg...............|ggg..............|gggg.............|gggg.............|ggggg...........D|gggggg..........D|gggggg..........D',
    'M29C': '.................|.................|.................|.................|.................|g................|gg..............D|gg..............D|ggg.............D|gggg...........DD|gggg...........DD|ggggg..........DD|gggggg........DDD|gggggg........DDD',
    'M43A': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg.........................|ggg........................|gggg.......................|gggg.......................|ggggg......................|gggggg.....................|gggggg.....................|ggggggg....................|gggggggg...................|gggggggg...................|ggggggggg..................|gggggggggg.................|gggggggggg.................|ggggggggggg................|ggggggggggg................',
    'M43B': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg.........................|ggg........................|gggg.......................|gggg.......................|ggggg......................|gggggg....................D|gggggg....................D|ggggggg...................D|gggggggg..................D|gggggggg.................DD|ggggggggg................DD|gggggggggg...............DD|gggggggggg...............DD|ggggggggggg.............DDD|ggggggggggg.............DDD',
    'M43C': '...........................|...........................|...........................|...........................|...........................|g..........................|gg........................D|gg........................D|ggg......................DD|gggg.....................DD|gggg....................DDD|ggggg..................DDDD|gggggg................DDDDD|gggggg...............DDDDDD|ggggggg............DDDDDDDD|gggggggg..........DDDDDDDDD|gggggggg.........DDDDDDDDDD|ggggggggg.......DDDDDDDDDDD|gggggggggg.....DDDDDDDDDDDD|gggggggggg....DDDDDDDDDDDDD|ggggggggggg..DDDDDDDDDDDDDD|ggggggggggg.DDDDDDDDDDDDDDD',
    'ZM43C': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg.......................DD|ggg......................DD|gggg.....................DD|gggg.....................DD|ggggg...................DDD|gggggg..................DDD|gggggg................DDDDD|ggggggg..............DDDDDD|gggggggg............DDDDDDD|gggggggg...........DDDDDDDD|ggggggggg.........DDDDDDDDD|gggggggggg.......DDDDDDDDDD|gggggggggg......DDDDDDDDDDD|ggggggggggg.....DDDDDDDDDDD|ggggggggggg....DDDDDDDDDDDD',
    'L43A': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg.........................|ggg........................|gggg.......................|gggg.......................|ggggg......................|gggggg.....................|gggggg.....................|ggggggg....................|gggggggg...................|gggggggg...................|ggggggggg..................|gggggggggg................D|gggggggggg................D|ggggggggggg...............D|ggggggggggg...............D',
    'L43B': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg.........................|ggg........................|gggg.......................|gggg......................D|ggggg.....................D|gggggg....................D|gggggg....................D|ggggggg..................DD|gggggggg.................DD|gggggggg.................DD|ggggggggg................DD|gggggggggg..............DDD|gggggggggg..............DDD|ggggggggggg.............DDD|ggggggggggg.............DDD',
    'L43C': '...........................|...........................|...........................|...........................|...........................|g..........................|gg.........................|gg........................D|ggg.......................D|gggg.....................DD|gggg.....................DD|ggggg...................DDD|gggggg..................DDD|gggggg.................DDDD|ggggggg................DDDD|gggggggg...............DDDD|gggggggg..............DDDDD|ggggggggg.............DDDDD|gggggggggg............DDDDD|gggggggggg............DDDDD|ggggggggggg..........DDDDDD|ggggggggggg..........DDDDDD',
    'L52A': '.....................................|.....................................|.....................................|.....................................|.....................................|g...................................p|gg..................................p|gg..................................g|ggg.................................g|gggg................................g|gggg................................g|ggggg..............................gg|gggggg.............................gg|gggggg.............................gg|ggggggg....................DDDDDDDDDD|gggggggg...................DDDDDDDDDD|gggggggg...................DDDDDDDDDD|ggggggggg..................DDDDDDDDDD|gggggggggg.................DDDDDDDDDD|gggggggggg.................DDDDDDDDDD|ggggggggggg................DDDDDDDDDD|ggggggggggg................DDDDDDDDDD',
    'L52B': '.....................................|.....................................|...................................pp|................................ppppg|.............................pppppppg|g..........................pppppppppg|gg.......................ppppppppppgg|gg......................pppppppppppgg|ggg...................pppppppppppppgg|gggg.................pppppppppppppggg|gggg................ppppppppppppppggg|ggggg..............ppppppppppppppqggg|gggggg............ppppppppppppppqgggg|gggggg...........pppppppppppppqqqgggg|ggggggg.........pppppppppppDDDDDDDDDD|gggggggg.......ppppppppppppDDDDDDDDDD|gggggggg.......pppppppppppqDDDDDDDDDD|ggggggggg.....pppppppppppqqDDDDDDDDDD|gggggggggg...pppppppppppqqqDDDDDDDDDD|gggggggggg...ppppppppppqqqqDDDDDDDDDD|ggggggggggg.pppppppppppqqqqDDDDDDDDDD|ggggggggggg.ppppppppppqqqqqDDDDDDDDDD',
    'L52C': '.................................pppp|.............................pppppppg|..........................pppppppppgg|.......................ppppppppppppgg|.....................pppppppppppppggg|g..................ppppppppppppppqggg|gg...............pppppppppppppqqqgggg|gg..............ppppppppppppqqqqqgggg|ggg...........ppppppppppppqqqqqqggggg|gggg.........pppppppppppqqqqqqqqggggg|gggg........pppppppppppqqqqqqqqgggggg|ggggg.......pppppppppqqqqqqqqqqgggggg|gggggg.....pppppppppqqqqqqqqqqggggggg|gggggg....pppppppppqqqqqqqqqqqggggggg|ggggggg...ppppppppqqqqqqqqqDDDDDDDDDD|gggggggg.ppppppppqqqqqqqqqqDDDDDDDDDD|ggggggggppppppppqqqqqqqqqqqDDDDDDDDDD|gggggggggppppppqqqqqqqqqqqqDDDDDDDDDD|ggggggggggpppppqqqqqqqqqqqqDDDDDDDDDD|ggggggggggppppqqqqqqqqqqqqqDDDDDDDDDD|gggggggggggppqqqqqqqqqqqqqqDDDDDDDDDD|gggggggggggppqqqqqqqqqqqqqqDDDDDDDDDD',
    'L65A': '.....................................|.....................................|.....................................|.....................................|.....................................|g..................................p.|gg...............................ppp.|gg..............................pppp.|ggg...........................pppppp.|gggg.........................ppppppp.|gggg.......................ppppppppp.|ggggg.....................pppppppppp.|gggggg...................ppppppppppp.|gggggg..................pppppppppppp.|ggggggg................ppppDDDDDDDDDD|gggggggg..............pppppDDDDDDDDDD|gggggggg.............ppppppDDDDDDDDDD|ggggggggg............ppppppDDDDDDDDDD|gggggggggg...........ppppppDDDDDDDDDD|gggggggggg...........ppppppDDDDDDDDDD|ggggggggggg..........ppppppDDDDDDDDDD|ggggggggggg..........ppppppDDDDDDDDDD',
    'L65B': '.....................................|.....................................|...................................pp|................................ppppp|.............................pppppppp|g..........................pppppppppp|gg.......................pppppppppppp|gg......................ppppppppppppp|ggg...................ppppppppppppppp|gggg.................pppppppppppppppp|gggg................pppppppppppppppqq|ggggg..............ppppppppppppppqqqq|gggggg............ppppppppppppppqqqqq|gggggg...........pppppppppppppqqqqqqq|ggggggg.........pppppppppppDDDDDDDDDD|gggggggg.......ppppppppppppDDDDDDDDDD|gggggggg.......pppppppppppqDDDDDDDDDD|ggggggggg.....pppppppppppqqDDDDDDDDDD|gggggggggg...pppppppppppqqqDDDDDDDDDD|gggggggggg...ppppppppppqqqqDDDDDDDDDD|ggggggggggg.pppppppppppqqqqDDDDDDDDDD|ggggggggggg.ppppppppppqqqqqDDDDDDDDDD',
    'L65C': '.................................pppp|.............................pppppppp|..........................ppppppppppp|.......................pppppppppppppp|.....................pppppppppppppppq|g..................ppppppppppppppqqqq|gg...............pppppppppppppqqqqqqq|gg..............ppppppppppppqqqqqqqqq|ggg...........ppppppppppppqqqqqqqqqqq|gggg.........pppppppppppqqqqqqqqqqqqq|gggg........pppppppppppqqqqqqqqqqqqqq|ggggg.......pppppppppqqqqqqqqqqqqqqqq|gggggg.....pppppppppqqqqqqqqqqqqqqqqq|gggggg....pppppppppqqqqqqqqqqqqqqqqqq|ggggggg...ppppppppqqqqqqqqqDDDDDDDDDD|gggggggg.ppppppppqqqqqqqqqqDDDDDDDDDD|ggggggggppppppppqqqqqqqqqqqDDDDDDDDDD|gggggggggppppppqqqqqqqqqqqqDDDDDDDDDD|ggggggggggpppppqqqqqqqqqqqqDDDDDDDDDD|ggggggggggppppqqqqqqqqqqqqqDDDDDDDDDD|gggggggggggppqqqqqqqqqqqqqqDDDDDDDDDD|gggggggggggppqqqqqqqqqqqqqqDDDDDDDDDD'
  };
  const ROWS_CACHE = {};
  const bntGrid = k => ROWS_CACHE[k] || (BNTD[k] ? (ROWS_CACHE[k] = BNTD[k].split('|')) : null);
  const tubeNum = v => { const m = String(v || '').match(/\d+/); return m ? +m[0] : 0; };
  /* имя диаграммы BNT по системе, трубе и группе ткани; null, если диаграммы нет */
  function bntKey(code, tube, grp) {
    const m = /^(Z-)?(BNT-M|K-M)$/.test(code) ? 'M' : /^(Z-)?(BNT-L|K-L)$/.test(code) || code === 'K-M+' ? 'L' : '';
    if (!m || !tube) return null;
    let k = m + tube + grp;
    if (code === 'Z-BNT-M' && k === 'M43C') k = 'ZM43C';
    return BNTD[k] ? k : null;
  }
  const grpOf = f => ({ 'А': 'A', 'В': 'B', 'С': 'C' }[String(f.wgrp || '').trim().toUpperCase()] || String(f.wgrp || '').trim().toUpperCase());

  /* проверка габаритов по диаграмме Амиго: { s: 'ok'|'ratio'|'bad'|'out'|'', text, rec } (s пусто, если диаграммы для системы нет) */
  function zoneOf(code, f, W, H, tube) {
    const g0 = grpOf(f), wm = W / 1000, hm = H / 1000;
    const D = DIAG[DIAG_OF[code]];
    if (D) {
      const grp = D[g0] ? g0 : 'C';
      const wc = Math.ceil(W / 100 - 1e-9) / 10, hc = Math.max(0.4, Math.ceil(H / 200 - 1e-9) * 0.2);
      if (wc > D.w + 1e-9 || hc > D.h + 1e-9) return { s: 'out', text: 'размеры вне диаграммы гарантии (до ' + D.w + '×' + D.h + ' м)' };
      if (D[grp].some(x => wc >= x[0] - 1e-9 && hc >= x[1] - 1e-9)) return { s: 'bad', text: 'негарантийные размеры для ткани группы ' + grp + ' (по диаграмме Амиго)' };
      if (hc > 3 * wc + 1e-9) return { s: 'ratio', text: 'высота больше трёх ширин: превышено гарантийное соотношение 1:3, ткань может сматываться неравномерно' };
      return { s: 'ok', text: '' };
    }
    const key = bntKey(code, tube, ['A', 'B', 'C'].includes(g0) ? g0 : 'C'); if (!key) return { s: '', text: '' };
    const g = bntGrid(key), nr = g.length, nc = g[0].length;
    const ci = Math.max(0, Math.ceil((wm - 0.4) / 0.1 - 1e-9));
    const hMax = nr === 22 ? 4.5 : 3.0, wMax = Math.round((0.4 + 0.1 * (nc - 1)) * 10) / 10;
    if (hm > hMax + 1e-9 || ci >= nc) return { s: 'out', text: 'размеры вне диаграммы гарантии для трубы ' + tube + ' (до ' + wMax + '×' + hMax + ' м)' };
    const ri = nr === 22 && hm > 4.4 + 1e-9 ? 21 : Math.max(0, Math.ceil((hm - 0.4) / 0.2 - 1e-9));
    const c = g[ri][ci];
    if (c === 'D') return { s: 'bad', text: 'негарантийные размеры для трубы ' + tube + ' и ткани группы ' + (g0 || 'C') + ' (по диаграмме Амиго)' };
    if (c === 'g') return { s: 'ratio', text: 'превышено гарантийное соотношение размеров для трубы ' + tube + ', ткань может сматываться неравномерно' };
    return { s: 'ok', text: '', rec: c === 'p' ? 'p' : c === 'q' ? 'q' : '' };
  }

  /* подбор трубы (вала): когда не зафиксирована вручную, берём самую малую, на которой размеры в гарантии и ткань смотается */
  function tubeFit(it) {
    const s = sysOf(it.sys), f = fabOf(it.fab), W = Number(it.w) || 0, H = Number(it.h) || 0;
    if (!s || !f || !(W > 0 && H > 0)) return null;
    const g = groupsOf(s.code).find(x => x.name === 'Труба' && x.type !== 'flag'); if (!g) return null;
    const tubes = g.items.map(x => ({ v: x.value, n: tubeNum(x.value) })).filter(x => x.n).sort((a, b) => a.n - b.n);
    if (tubes.length < 2 || !bntKey(s.code, tubes[0].n, 'C')) return null;
    const cur = (it.sel && it.sel['Труба']) || (g.items.find(x => x.def) || g.items[0]).value;
    const test = t => { const z = zoneOf(s.code, f, W, H, t.n); const wd = wind(Object.assign({}, it, { sel: Object.assign({}, it.sel, { 'Труба': t.v }) })); return { z, okWind: !(wd && wd.max < 6 && H / 1000 > wd.max + 1e-9) }; };
    const good = t => { const r = test(t); return r.z.s === 'ok' && r.okWind; };
    if (it.tubeLock) {
      const c = tubes.find(x => x.v === cur) || tubes[0];
      if (good(c)) return null;
      const alt = tubes.find(x => x.n > c.n && good(x));
      return alt ? { lock: true, from: c.v, to: alt.v } : null;
    }
    const pick = tubes.find(good);
    return pick ? { from: tubes[0].v, to: pick.v, auto: true } : null;
  }

  /* длина металлической цепи: высота изделия минус 15 см */
  const chainLen = hMm => Math.max(0, hMm - 150) / 1000;

  /* вертикальные жалюзи: цена за кв. м (минимум 1 м²) или за погонный метр карниза, опции из «Верт_опции», скидка Амиго 50%, на Лайн 55% */
  function calcVert(it, s, f, W, H, out) {
    const T = VT[s.vt], corn = s.vt === 'карниз';
    if (!corn && !f) { out.needFab = true; out.msg = 'Выберите материал'; return out; }
    if (!(W > 0 && (corn || H > 0))) { out.msg = corn ? 'Введите ширину' : 'Введите размеры'; return out; }
    const w = W / 10, h = H / 10, num = k => { const v = Number(String(VP[k] == null ? '' : VP[k]).replace(',', '.')); return isNaN(v) ? NaN : v; };
    const bad = m => { out.msg = m; out.warn.hard = true; return out; };
    if (T.wmin && w < T.wmin) return bad('ширина меньше минимальной (' + T.wmin + ' см)');
    if (T.wmax && w > T.wmax) return bad('ширина больше максимальной для этого материала (' + T.wmax + ' см)');
    let area = W * H / 1e6;
    if (!corn) {
      if (T.hmin && h < T.hmin) return bad('высота меньше минимальной (' + T.hmin + ' см)');
      if (T.hmax && h > T.hmax) return bad('высота больше максимальной для этого материала (' + T.hmax + ' см)');
      if (T.amax && area > T.amax + 1e-9) return bad('площадь больше максимальной (' + T.amax + ' м²)');
    }
    const minA = num('мин_площадь_м2') || 1, calcA = Math.max(area, minA);
    const o = opts(it), step = Number(P['округление']) || Number(VP['округление']) || 100;
    const disc = f && f.line ? (num('скидка_лайн') || 0.55) : (num('скидка_вж') || 0.5), k = (1 - disc) * FX;
    const flag = n => !!o.flags[n], gi = n => { const g = groupsOf(s.code).find(x => x.name === n); return g ? g.items[0] : null; };
    const only = flag('Только ламели') ? (gi('Только ламели') || {}).usd || 0 : 0;
    const perM2 = corn ? 0 : (f.usd + only);
    let baseUsd = corn ? T.corn * (W / 1000) : calcA * perM2;
    const extra = [];
    if (!corn) {
      /* арка и наклонные считаются процентом от стоимости изделия */
      const arch = flag('Арка') ? (gi('Арка') || {}).usd || 0.5 : 0, tilt = flag('Наклонные') ? (gi('Наклонные') || {}).usd || 1 : 0;
      baseUsd *= 1 + arch + tilt;
    }
    const optUsd = {};
    groupsOf(s.code).forEach(g => {
      if (!flag(g.name)) return; const it0 = g.items[0], u = it0.unit;
      if (!it0.usd || /^%/.test(u) || g.name === 'Только ламели') return;
      optUsd[g.name] = /кв/.test(u) ? it0.usd * calcA : /м шир/.test(u) ? it0.usd * W / 1000 : it0.usd;
    });
    const base = Math.round(baseUsd * k), optCost = {}, optP = {};
    let cost = base;
    Object.keys(optUsd).forEach(n => { optCost[n] = Math.round(optUsd[n] * k); optP[n] = Math.ceil(optUsd[n] * k * s.mk / step - 1e-9) * step; cost += optCost[n]; });
    const baseRetail = ceilTo(base * s.mk, step), exact = base * s.mk + Object.keys(optUsd).reduce((a, n) => a + optUsd[n] * k * s.mk, 0), unit = ceilTo(exact, step), addSum = unit - baseRetail; /* округление до сотни один раз в конце */
    Object.assign(out, { ok: true, unit, exact, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: s.profit, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, areaNote: corn ? 'Карниз в сборе: ' + (W / 1000).toFixed(2) + ' м' : 'Расчётная площадь ' + calcA.toFixed(2) + ' м²' + (area < minA - 1e-9 ? ' (минимум ' + minA + ' м²)' : '') + (flag('Наклонные') ? ' · наклонные: введите большие ширину и высоту' : '') + (disc >= 0.55 ? ' · скидка Амиго 55% (Лайн)' : ''), usd: baseUsd });
    return out;
  }

  /* Венус: изделие этого размера делается только с редуктором и цепью-петлёй (клетка сетки тёмно-серая в прайсе) */
  function venusReducer(code, wMm, hMm) {
    const s = sysOf(code), T = s && s.model === 'gja' && GT[s.vt]; if (!T || !T.grid || !RED) return false;
    const w = wMm / 1000, h = hMm / 1000, ci = RED.widths.findIndex(x => x >= w - 1e-9), row = RED.rows.find(r => r.h >= h - 1e-9);
    return !!(row && ci >= 0 && row.v[ci]);
  }

  /* горизонтальные алюминиевые жалюзи: цена ленты за кв. м (минимум 1 м²), скидка Амиго из «ГЖА_параметры», опции из «ГЖА_опции» */
  function calcGja(it, s, f, W, H, out) {
    const T = GT[s.vt];
    if (!f) { out.needFab = true; out.msg = 'Выберите ленту'; return out; }
    if (!(W > 0 && H > 0)) { out.msg = 'Введите размеры'; return out; }
    const w = W / 10, h = H / 10, bad = m => { out.msg = m; out.warn.hard = true; return out; };
    if (T.wmin && w < T.wmin) return bad('ширина меньше минимальной (' + T.wmin + ' см)');
    if (T.wmax && w > T.wmax) return bad('ширина больше максимальной (' + T.wmax + ' см)');
    if (T.hmin && h < T.hmin) return bad('высота меньше минимальной (' + T.hmin + ' см)');
    if (T.hmax && h > T.hmax) return bad('высота больше максимальной (' + T.hmax + ' см)');
    const area = W * H / 1e6;
    if (T.amax && area > T.amax + 1e-9) return bad('площадь больше максимальной (' + T.amax + ' м²)');
    const minA = GP['мин_площадь_м2'] || 1, calcA = T.grid ? area : Math.max(area, minA), step = GP['округление'] || 100;
    const disc = GP['скидка'] != null ? GP['скидка'] : 0.4, k = (1 - disc) * FX;
    let baseUsd = calcA * f.usd, gridNote = '', gridUsd = 0;
    if (T.grid) { /* Венус: цена за изделие из сетки, размеры округляются вверх до шага сетки */
      const L = lookup(s.code, f.cat, W, H);
      if (L.err) { out.msg = L.err; if (L.hard) out.warn.hard = true; return out; }
      gridUsd = baseUsd = L.usd; gridNote = 'Считаем по сетке ' + Math.round(L.w * 1000) + '×' + Math.round(L.h * 1000) + ' мм';
      const nsW = GP['венус_без_стопора_шир_см'] || 0, nsU = GP['венус_без_стопора_usd'] || 0;
      if (nsW && w < nsW - 1e-9 && nsU) { baseUsd -= nsU; gridNote += ' · без стопора (ширина < ' + nsW + ' см)'; }
    }
    const o = opts(it), optUsd = {}, optRub = {}, notes = [], redName = 'Редуктор и цепь-петля';
    if (T.grid) {
      if (venusReducer(s.code, W, H)) { o.flags[redName] = true; notes.push('Изделие этого размера изготавливается только с редуктором и цепью-петлёй (добавлено в цену)'); }
      else if (gridNote.indexOf('без стопора') >= 0) notes.push('Изделие шириной менее ' + (GP['венус_без_стопора_шир_см'] || 43.5) + ' см изготавливается без стопора');
      if (o.flags[redName] && !notes.some(x => /редуктор/.test(x))) notes.push('Изделие с редуктором и цепью-петлёй');
    }
    groupsOf(s.code).forEach(g => {
      const pick = g.type === 'flag' ? (o.flags[g.name] ? g.items[0] : null) : g.items.find(x => x.value === o.sel[g.name]);
      if (!pick || !pick.usd) return;
      const lb = g.type === 'flag' ? g.name : pick.value;
      if (/^руб/.test(pick.unit)) optRub[lb] = pick.usd; else optUsd[lb] = /^%/.test(pick.unit) ? pick.usd / 100 * (gridUsd || baseUsd) : /кв/.test(pick.unit) ? pick.usd * calcA : pick.usd;
    });
    const base = Math.round(baseUsd * k), optCost = {}, optP = {};
    let cost = base;
    Object.keys(optUsd).forEach(n => { optCost[n] = Math.round(optUsd[n] * k); optP[n] = Math.ceil(optUsd[n] * k * s.mk / step - 1e-9) * step; cost += optCost[n]; });
    Object.keys(optRub).forEach(n => { optCost[n] = 0; optP[n] = optRub[n]; }); /* опции в рублях: фиксированная цена в рознице */
    const baseRetail = ceilTo(base * s.mk, step), exact = base * s.mk + Object.keys(optUsd).reduce((a, n) => a + optUsd[n] * k * s.mk, 0) + Object.keys(optRub || {}).reduce((a, n) => a + optRub[n], 0), unit = ceilTo(exact, step), addSum = unit - baseRetail; /* округление до сотни один раз в конце */
    Object.assign(out, { ok: true, unit, exact, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: s.profit, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, notes, areaNote: T.grid ? gridNote : 'Расчётная площадь ' + calcA.toFixed(2) + ' м²' + (area < minA - 1e-9 ? ' (минимум ' + minA + ' м²)' : ''), usd: baseUsd });
    return out;
  }

  function calc(it) {
    const out = { ok: false, warn: [], msg: '' };
    if (!ready) { out.msg = 'Цены на рулонки не загружены (листы «Рулонки_…» в таблице)'; return out; }
    const s = sysOf(it.sys), f = fabOf(it.fab); let W = Number(it.w) || 0, H = Number(it.h) || 0;
    if (!s) { out.msg = 'Выберите систему'; return out; }
    if (s.model === 'vert') return calcVert(it, s, f, W, H, out);
    if (s.model === 'gja') return calcGja(it, s, f, W, H, out);
    const roof = s.model === 'roof';
    if (roof && !WIN_BY[it.rw]) { out.needWin = true; out.msg = 'Выберите производителя и модель окна'; return out; }
    if (!f) { out.needFab = true; out.msg = roof && s.code === 'ROOF-DN' ? 'Выберите первую ткань' : 'Выберите ткань'; return out; }
    let L, fit = null, win = null, f2 = null;
    if (roof) { /* Roof: размер штор задаёт модель окна, цена из таблицы по категории ткани; день-ночь: две ткани минус вычет за высоту */
      win = WIN_BY[it.rw]; W = win.w; H = win.h; it = Object.assign({}, it, { w: W, h: H });
      const dn = s.code === 'ROOF-DN'; f2 = dn ? fabOf(it.fab2) : null;
      if (dn && !f2) { out.needFab = true; out.msg = 'Выберите вторую ткань'; return out; }
      const i1 = roofIdx(f), i2 = dn ? roofIdx(f2) : 0;
      if (i1 < 0 || i2 < 0) { out.msg = 'Для этой ткани нет категории цены'; return out; }
      const ded = numC(P['roof_день_ночь_вычет_usd_м'], 14.12);
      L = { usd: win.p[i1] + (dn ? win.p[i2] - ded * H / 1000 : 0), w: W / 1000, h: H / 1000 };
    } else {
      if (!(W > 0 && H > 0)) { out.msg = 'Введите размеры'; return out; }
      fit = tubeFit(it);
      if (fit && fit.auto) { it = Object.assign({}, it, { sel: Object.assign({}, it.sel, { 'Труба': fit.to }) }); out.tubeAuto = fit.to !== fit.from ? { from: fit.from, to: fit.to } : null; out.tubeSel = fit.to; }
      L = lookup(s.code, f.cat, W, H);
      if (L.err) { out.msg = L.err; if (L.hard) out.warn.hard = true; return out; }
    }
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
    const baseRetail = ceilTo(base * s.mk, step), exact = base * coef + optUsd * k * coef;
    const unit = ceilTo(exact, step), addSum = unit - baseRetail, cost = base + costOpt;
    if (!roof) {
    const wd = wind(it); out.wind = wd;
    if (wd && wd.max < 6 && H / 1000 > wd.max + 1e-9) out.warn.push('ткань не смотается: для этой системы и ткани максимум ' + Math.floor(wd.max * 100) + ' см, при ' + Math.round(H / 10) + ' см останется висеть около ' + Math.round(H / 10 - wd.max * 100) + ' см');
    {
      const tube = tubeNum(opts(it).sel['Труба']), zn = zoneOf(s.code, f, W, H, tube);
      if (zn.text) out.warn.push(zn.text + (fit && fit.lock ? '; на трубе ' + fit.to + ' размеры в гарантии, выберите её' : ''));
      if (zn.rec) out.rec = zn.rec;
    }
    const pw = f.prodW || (f.roll ? f.roll - 10 : 0);
    if (pw && W / 10 > pw && !(o.flags['Сварка ткани'])) out.warn.push('ширина больше рабочей ширины ткани (' + pw + ' см): нужна сварка ткани');
    }
    Object.assign(out, { ok: true, unit, exact, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: profit0, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, gridW: L.w, gridH: L.h, usd: L.usd, win, fab2: f2, areaNote: roof ? 'Окно ' + win.man + ' ' + win.mod + ': штора ' + W + '×' + H + ' мм, категория ткани ' + (f2 ? f.cat + ' + ' + f2.cat : f.cat) + (/^[EЕ]$/i.test(String(f.cat).trim()) ? ' (E считаем как 1)' : '') : undefined });
    return out;
  }

  function vfTxt(it) {
    const v = it.vf; if (!v) return ' · цепочка ' + (it.ctrl === 'R' ? 'справа' : 'слева');
    const a = [];
    if (v.side) a.push('управление ' + (v.side === 'R' ? 'правое' : 'левое'));
    { const ln = v.len || (Number(it.h) > 500 ? Number(it.h) - 500 : 0); if (ln) a.push('длина упр. ' + ln + ' мм'); }
    if (v.chain && v.chain !== 'Пластиковая') a.push(v.chain === 'Металл' ? 'фурнитура металлическая' : 'прозрачная комплектация');
    if (v.ceil && v.ceil !== 'Обычный') a.push('потолочный кронштейн: ' + v.ceil.toLowerCase());
    if (v.ctype && v.ctype !== 'К управлению') a.push(v.ctype.toLowerCase());
    if (v.wall && v.wall !== '7,5 см') a.push('стеновой кронштейн: ' + v.wall.toLowerCase());
    return a.length ? ' · ' + a.join(', ') : '';
  }

  function describe(it, c) {
    const s = sysOf(it.sys), f = fabOf(it.fab), o = opts(it), parts = [];
    groupsOf(it.sys).forEach(g => {
      if (g.type === 'flag') { if (o.flags[g.name] && !(it.vf && /^(металлическая фурнитура|прозрачная комплектация)$/.test(g.name.toLowerCase()))) parts.push(g.name.toLowerCase()); return; }
      const d = g.items.find(x => x.def) || g.items[0]; if (o.sel[g.name] !== d.value) parts.push(g.name.toLowerCase() + ': ' + o.sel[g.name].toLowerCase());
    });
    if (s && s.model === 'gja') {
      const v = it.vf || {}, ln = v.len || (Number(it.h) > 0 ? Math.round(Number(it.h) * 0.75) : 0), a = [];
      if (v.ck) a.push(({ L: 'подъём и поворот слева', R: 'подъём и поворот справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' })[v.ck]); else if (v.side) a.push('управление ' + (v.side === 'R' ? 'правое' : 'левое'));
      if (ln) a.push('длина упр. ' + ln + ' мм');
      return { title: 'Алюминиевые жалюзи ' + s.name, sub: (f ? 'лента ' + f.name : 'лента не выбрана') + (a.length ? ' · ' + a.join(', ') : '') + (parts.length ? ' · ' + parts.join(', ') : '') };
    }
    if (s && s.model === 'roof') {
      const w = WIN_BY[it.rw], f2 = fabOf(it.fab2), dn = s.code === 'ROOF-DN';
      return { title: 'Рулонная штора Roof' + (dn ? ' день-ночь' : ''), sub: [w ? 'окно: ' + w.man + ' ' + w.mod : 'окно не выбрано', f ? 'ткань ' + f.name : 'ткань не выбрана', dn ? (f2 ? 'ткань 2: ' + f2.name : 'вторая ткань не выбрана') : ''].concat(parts).filter(Boolean).join(' · ') };
    }
    const fc = o.sel['Цвет фурнитуры'];
    return { title: s && s.model === 'vert' ? 'Вертикальные жалюзи ' + s.name.toLowerCase() : (s && s.model === 'zebra' ? 'Штора зебра' : 'Рулонная штора') + (s ? ' ' + s.name : ''), sub: s && s.model === 'vert' ? (f ? f.name + ' · ' : '') + 'ламель 89 мм' + vfTxt(it) + (parts.length ? ' · ' + parts.join(', ') : '') : (f ? 'ткань ' + f.name : 'ткань не выбрана') + (fc ? ' · фурнитура ' + fc.toLowerCase() : '') + ' · цепочка ' + (it.ctrl === 'R' ? 'справа' : 'слева') + (parts.length ? ' · ' + parts.join(', ') : '') };
  }

  window.JalRolo = {
    SUP, setSheets, ready: () => ready, systems: z => z == null ? SYS : SYS.filter(x => x.model === (typeof z === 'string' ? z : z ? 'zebra' : 'rolo')), sysOf, fabrics: z => z === 'roof' ? FAB.filter(x => !x.m && !x.z && x.roof !== 'нет') : z == null ? FAB : FAB.filter(x => (x.m || (x.z ? 'zebra' : 'rolo')) === (typeof z === 'string' ? z : z ? 'zebra' : 'rolo')), fabOf, groups: groupsOf, opts, calc, venusReducer, describe, wind, windReady: () => Object.keys(WIND).length > 0 && Object.keys(WINDZ).length > 0,
    termFor: it => { const s = sysOf(it.sys); return s ? s.term + (Number(P['срок_добавка_дн']) || 5) : 0; },
    photoUrl: f => (f && f.img ? String(P['фото_адрес'] || 'https://customizer.amigo.ru').replace(/\/$/, '') + f.img : ''),
    roofMans: () => WIN.map(x => x.man).filter((m, i, a) => a.indexOf(m) === i), roofWins: man => WIN.filter(x => !man || x.man === man), winOf: id => WIN_BY[id] || null,
    param: k => P[k]
  };
})();
