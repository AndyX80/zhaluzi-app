/* Рулонные шторы Амиго: расчёт по прайсу (цены в $ за готовое изделие по категории ткани, высоте и ширине).
   Данные читаются из листов Google Таблицы «Рулонки_параметры», «Рулонки_системы», «Рул_<сетка>», «Рулонки_опции», «Рулонки_ткани».
   Цены в репозиторий не попадают: всё приходит вместе с остальными листами (setSheets). Подключается только на десктопе. */
(function () {
  'use strict';
  const ceilTo = (x, s) => Math.ceil(x / s - 1e-9) * s;
  const SUP = 'Amigo';
  let P = {}, SYS = [], GRID = {}, OPT = {}, FAB = [], FX = 85, ready = false, FAB_BY = {}, WIND = {}, WINDZ = {}, VP = {}, VT = {};

  const unitOf = u => (u === 'м_шир' || u === 'м_выс' || u === 'м_шов' || u === 'м_цепь') ? u : 'изд';

  function setSheets(sh) {
    ready = false; P = {}; SYS = []; GRID = {}; OPT = {}; FAB = []; FAB_BY = {}; WIND = {}; WINDZ = {}; VP = {}; VT = {};
    if (!sh || !sh['Рулонки_системы'] || !sh['Рулонки_параметры']) return;
    sh['Рулонки_параметры'].slice(1).forEach(r => { if (r[0]) P[r[0]] = r[1]; });
    const par = sh['Параметры'] || []; par.forEach(r => { if (r[0] === 'курс_usd') FX = Number(r[1]) || FX; });
    sh['Рулонки_системы'].slice(1).forEach(r => {
      if (!r[0]) return;
      SYS.push({ code: String(r[0]), name: String(r[1] || r[0]), group: String(r[2] || ''), grid: String(r[3] || ''), term: Number(r[4]) || 1, mk: r[5] === '' || r[5] == null ? 2 : Number(r[5]) || 2, profit: r[6] === '' || r[6] == null ? 1000 : Number(r[6]) || 0, note: String(r[7] || ''), model: /зебр/i.test(String(r[8] || '')) ? 'zebra' : 'rolo' });
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
          if (!o[0] || (o[5] && String(o[5]).split(',').map(x => x.trim()).indexOf(t) < 0)) return;
          if (o[1] === 'флаг' && !num(o[4], 0) && !String(o[3] || '')) return;
          const nm = String(o[0]); og.order.push(nm);
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
        let b = null; Object.keys(ser).forEach(k => { const o = ser[k]; if (o.vt === t && (nm === o.name.toUpperCase() || nm.indexOf(o.name.toUpperCase() + ' ') === 0) && (!b || o.name.length > b.name.length)) b = o; });
        if (!b) return;
        const v = String(r[8] || 'png'), f = { z: false, m: 'vert', vt: t, key: String(r[0]), name: String(r[2]), ser: b.name, cat: b.cat, usd: b.usd, line: b.line, dens: b.dens, roll: 0, prodW: 0, stock: r[6] === '' || r[6] == null ? null : Number(r[6]), qty: r[7] === '' || r[7] == null ? null : Number(r[7]), img: v.charAt(0) === '/' ? v : '/storage-new/materials/' + (VP['фото_папка'] || 'vertical') + '/' + String(r[0]) + '.' + v.replace(/^\./, ''), maxs: '', wgrp: '', wet: '', coll: '' };
        FAB.push(f); FAB_BY[f.key] = f;
      });
    }
    FAB.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
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
    const baseRetail = ceilTo(base * s.mk, step), addSum = Object.keys(optP).reduce((a, n) => a + optP[n], 0), unit = baseRetail + addSum;
    Object.assign(out, { ok: true, unit, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: s.profit, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, areaNote: corn ? 'Карниз в сборе: ' + (W / 1000).toFixed(2) + ' м' : 'Расчётная площадь ' + calcA.toFixed(2) + ' м²' + (area < minA - 1e-9 ? ' (минимум ' + minA + ' м²)' : '') + (flag('Наклонные') ? ' · наклонные: введите большие ширину и высоту' : '') + (disc >= 0.55 ? ' · скидка Амиго 55% (Лайн)' : ''), usd: baseUsd });
    return out;
  }

  function calc(it) {
    const out = { ok: false, warn: [], msg: '' };
    if (!ready) { out.msg = 'Цены на рулонки не загружены (листы «Рулонки_…» в таблице)'; return out; }
    const s = sysOf(it.sys), f = fabOf(it.fab), W = Number(it.w) || 0, H = Number(it.h) || 0;
    if (!s) { out.msg = 'Выберите систему'; return out; }
    if (s.model === 'vert') return calcVert(it, s, f, W, H, out);
    if (!f) { out.needFab = true; out.msg = 'Выберите ткань'; return out; }
    if (!(W > 0 && H > 0)) { out.msg = 'Введите размеры'; return out; }
    const fit = tubeFit(it);
    if (fit && fit.auto) { it = Object.assign({}, it, { sel: Object.assign({}, it.sel, { 'Труба': fit.to }) }); out.tubeAuto = fit.to !== fit.from ? { from: fit.from, to: fit.to } : null; out.tubeSel = fit.to; }
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
    const wd = wind(it); out.wind = wd;
    if (wd && wd.max < 6 && H / 1000 > wd.max + 1e-9) out.warn.push('ткань не смотается: для этой системы и ткани максимум ' + Math.floor(wd.max * 100) + ' см, при ' + Math.round(H / 10) + ' см останется висеть около ' + Math.round(H / 10 - wd.max * 100) + ' см');
    {
      const tube = tubeNum(opts(it).sel['Труба']), zn = zoneOf(s.code, f, W, H, tube);
      if (zn.text) out.warn.push(zn.text + (fit && fit.lock ? '; на трубе ' + fit.to + ' размеры в гарантии, выберите её' : ''));
      if (zn.rec) out.rec = zn.rec;
    }
    const pw = f.prodW || (f.roll ? f.roll - 10 : 0);
    if (pw && W / 10 > pw && !(o.flags['Сварка ткани'])) out.warn.push('ширина больше рабочей ширины ткани (' + pw + ' см): нужна сварка ткани');
    Object.assign(out, { ok: true, unit, base: baseRetail, addSum, cost, profit: unit - cost, optP, optCost, minProfit: profit0, term: s.term, termDays: s.term + (Number(P['срок_добавка_дн']) || 5), fab: f, sys: s, gridW: L.w, gridH: L.h, usd: L.usd });
    return out;
  }

  function vfTxt(it) {
    const v = it.vf; if (!v) return ' · цепочка ' + (it.ctrl === 'R' ? 'справа' : 'слева');
    const a = [];
    if (v.side) a.push('управление ' + (v.side === 'R' ? 'правое' : 'левое'));
    if (v.len) a.push('длина упр. ' + v.len + ' мм');
    if (v.chain && v.chain !== 'Пластиковая') a.push('цепочка ' + v.chain.toLowerCase());
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
    const fc = o.sel['Цвет фурнитуры'];
    return { title: s && s.model === 'vert' ? 'Вертикальные жалюзи ' + s.name.toLowerCase() : (s && s.model === 'zebra' ? 'Штора зебра' : 'Рулонная штора') + (s ? ' ' + s.name : ''), sub: s && s.model === 'vert' ? (f ? f.name + ' · ' : '') + 'ламель 89 мм' + vfTxt(it) + (parts.length ? ' · ' + parts.join(', ') : '') : (f ? 'ткань ' + f.name : 'ткань не выбрана') + (fc ? ' · фурнитура ' + fc.toLowerCase() : '') + ' · цепочка ' + (it.ctrl === 'R' ? 'справа' : 'слева') + (parts.length ? ' · ' + parts.join(', ') : '') };
  }

  window.JalRolo = {
    SUP, setSheets, ready: () => ready, systems: z => z == null ? SYS : SYS.filter(x => x.model === (typeof z === 'string' ? z : z ? 'zebra' : 'rolo')), sysOf, fabrics: z => z == null ? FAB : FAB.filter(x => (x.m || (x.z ? 'zebra' : 'rolo')) === (typeof z === 'string' ? z : z ? 'zebra' : 'rolo')), fabOf, groups: groupsOf, opts, calc, describe, wind, windReady: () => Object.keys(WIND).length > 0 && Object.keys(WINDZ).length > 0,
    termFor: it => { const s = sysOf(it.sys); return s ? s.term + (Number(P['срок_добавка_дн']) || 5) : 0; },
    photoUrl: f => (f && f.img ? String(P['фото_адрес'] || 'https://customizer.amigo.ru').replace(/\/$/, '') + f.img : ''),
    param: k => P[k]
  };
})();
