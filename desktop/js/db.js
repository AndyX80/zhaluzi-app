/* Реальные данные десктопа. Хранятся только в браузере владельца (localStorage), в репозиторий и на сервер не попадают.
   Источник на старте: файл «Учёт заказов.xlsm» (листы Заказы, Доход-расход, ЮРЛИЦА), выбирается кнопкой в «Настройки → Данные». */
(function () {
  const D = window.DEMO, KEY = 'jald_db_v1';
  const DB = { real: false, at: 0 };
  const pad = n => String(n).padStart(2, '0');
  const iso = serial => { if (typeof serial !== 'number' || !isFinite(serial)) return ''; const d = new Date(Math.round((serial - 25569) * 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const dmy = s => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? m[3] + '.' + m[2] + '.' + m[1] : (s || ''); };
  const num = v => { const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const yes = v => /^да$/i.test(String(v == null ? '' : v).trim()) || v === 1 || v === true;
  const str = v => v == null ? '' : String(v).trim();

  const CAT = { 'гж': 'Горизонтальные', 'дерево': 'Дерево', 'рш': 'Рулонные', 'вж': 'Вертикальные', 'м/с': 'Москитные сетки', 'плиссе': 'Плиссе', 'римки': 'Римские', 'разное': 'Разное' };
  const SUP = { 'амиго': 'Амиго', 'тск': 'ТСК', 'foroom': 'Foroom', 'форум': 'Foroom', 'интерьер': 'Интерьер', 'уют': 'Уют', 'рдо': 'РДО', 'павел м/с': 'Павел м/с', 'другой': 'Другой', 'невасетки': 'Невасетки', 'кортин': 'Кортин', 'роллрезка': 'РоллРезка' };
  const SRC = { 'авито': 'Авито', 'повторный': 'Повторный', 'другое': 'Другое', 'по рекомендации': 'По рекомендации', 'яндекс': 'Яндекс Карты', 'сарафан': 'Сарафан', 'сайт': 'Сайт', 'telegram': 'Telegram', 'вконтакте': 'ВКонтакте' };
  const norm = (map, v, dflt) => { const s = str(v); return s ? (map[s.toLowerCase()] || s) : (dflt || ''); };
  const phoneDigits = v => { let d = String(v == null ? '' : v).replace(/\D/g, ''); if (d.length === 11 && /^[78]/.test(d)) d = d.slice(1); return d; };
  const phoneFmt = v => { const d = phoneDigits(v); return d.length === 10 ? '+7 ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + '-' + d.slice(6, 8) + '-' + d.slice(8) : str(v); };

  /* линейная воронка из галочек Excel */
  const STAGE_OF = f => f.closed ? 9 : f.zp ? 8 : f.got ? 7 : f.sent ? 6 : f.sup ? 5 : f.work ? 4 : 3;
  DB.stageOf = STAGE_OF;
  DB.prof = o => (o.sum || 0) - (o.cost || 0) - (o.instCost != null ? o.instCost : 0);
  DB.debt = o => Math.max(0, (o.sum || 0) - (o.paid || 0));

  function rowsOf(wb, name) {
    const k = wb.SheetNames.filter(x => x.trim().toLowerCase() === name.toLowerCase())[0];
    return k ? XLSX.utils.sheet_to_json(wb.Sheets[k], { header: 1, raw: true, defval: null }) : null;
  }
  function table(rows, keyCol) {
    const hi = rows.findIndex(r => r && r.some(c => str(c).toLowerCase() === keyCol.toLowerCase()));
    if (hi < 0) throw new Error('В листе нет столбца «' + keyCol + '»');
    const head = rows[hi].map(h => str(h).replace(/\s+/g, ' ').toLowerCase()), col = {};
    head.forEach((h, i) => { if (h && col[h] === undefined) col[h] = i; });
    return { col, rows: rows.slice(hi + 1) };
  }

  DB.parse = function (wb) {
    const zr = rowsOf(wb, 'Заказы'); if (!zr) throw new Error('В файле нет листа «Заказы»');
    const T = table(zr, 'Номер заказа'), c = T.col, g = (r, n) => r[c[n]];
    const yur = {}; const yr = rowsOf(wb, 'ЮРЛИЦА');
    if (yr) { const Y = table(yr, 'Номер заказа'); Y.rows.forEach(r => { const no = num(r[Y.col['номер заказа']]); if (no) yur[no] = { name: str(r[Y.col['контрагент']]), edo: yes(r[Y.col['эдо есть']]), upd: yes(r[Y.col['упд отдали']]), sign: yes(r[Y.col['упд подписан']]), note: str(r[Y.col['примечания']]) }; }); }
    const orders = [], seen = {};
    T.rows.forEach(r => {
      const no = num(g(r, 'номер заказа')); if (!no) return; seen[no] = (seen[no] || 0) + 1;
      const fl = { work: yes(g(r, 'в работе')), sup: yes(g(r, 'оплачен поставщику')), sent: yes(g(r, 'отправлен')), got: yes(g(r, 'получен')), zp: yes(g(r, 'зп отдал')), other: yes(g(r, 'другое')), closed: yes(g(r, 'закрыто')) };
      const cat = norm(CAT, g(r, 'категория'), 'Разное'), sup = norm(SUP, g(r, 'поставщик')), reg = yes(g(r, 'доставка в регионы'));
      const y = yur[no];
      orders.push({ id: 'o' + no + (seen[no] > 1 ? '-' + seen[no] : ''), no: String(no), name: str(g(r, 'фио')), phone: phoneFmt(g(r, 'телефон')), src: norm(SRC, g(r, 'источник')), factory: str(g(r, 'заводской номер')),
        cat, sup, inst: yes(g(r, 'установка')), zone: reg ? 'Регионы' : 'СПб', sum: num(g(r, 'стоимость')), paid: num(g(r, 'предоплата')) + num(g(r, 'доплата')), cost: num(g(r, 'закуп')), instCost: num(g(r, 'стоимость установки')),
        created: iso(g(r, 'дата')), due: iso(g(r, 'дата изготов-ления') != null ? g(r, 'дата изготов-ления') : g(r, 'дата изготовления')), tk: str(g(r, 'примечания')), review: str(g(r, 'отзыв')),
        fl, stage: STAGE_OF(fl), title: cat + (sup ? ' · ' + sup : ''), yur: y || null, claim: false, legacy: true });
    });
    /* операции */
    const ops = []; const dr = rowsOf(wb, 'Доход-расход');
    if (dr) { const O = table(dr, 'Статья'); let k = 0; O.rows.forEach(r => { const d = iso(r[O.col['дата']]); if (!d) return; const inn = num(r[O.col['приход']]), out = num(r[O.col['расход']]); if (!inn && !out) return;
      ops.push({ id: 'p' + (++k), d, kind: inn ? 'in' : 'out', what: str(r[O.col['статья']]), who: '', way: '', sum: inn || out }); }); }
    return DB.build(orders, ops);
  };

  /* клиенты по телефону (или по ФИО, если телефона нет); заказы получают ссылку client */
  DB.build = function (orders, ops) {
    orders.sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : (+a.no) - (+b.no)));
    const byKey = {}, clients = [];
    orders.forEach(o => {
      const pd = phoneDigits(o.phone), key = pd.length >= 10 ? 'p' + pd.slice(-10) : 'n' + (o.yur && o.yur.name || o.name).toLowerCase().replace(/\s+/g, ' ');
      let c = byKey[key];
      if (!c) { c = byKey[key] = { id: 'c' + (clients.length + 1), name: '', phone: '', addr: '', src: '', note: '' }; clients.push(c); }
      c.name = (o.yur && o.yur.name) || o.name || c.name || 'Без имени'; if (o.phone) c.phone = o.phone; if (o.src) c.src = o.src;
      if (o.yur) c.note = 'Юр. лицо / ИП' + (o.yur.edo ? ', ЭДО есть' : '');
      o.client = c.id; delete o.name; delete o.phone;
    });
    orders.reverse();
    const last = {}; orders.forEach(o => { if (!last[o.client]) last[o.client] = o.created; });
    clients.sort((a, b) => (last[a.id] < last[b.id] ? 1 : last[a.id] > last[b.id] ? -1 : 0));
    return { clients, orders, ops: ops.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)) };
  };

  DB.apply = function (data) {
    D.clients = data.clients; D.orders = data.orders; D.ops = data.ops; D.events = []; D.real = DB.real = true;
  };
  DB.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, at: Date.now(), clients: D.clients, orders: D.orders, ops: D.ops })); return true; } catch (e) { return false; }
  };
  DB.load = function () {
    try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.orders && j.orders.length) { DB.apply(j); DB.at = j.at || 0; return true; } } catch (e) {}
    return false;
  };
  DB.clear = function () { try { localStorage.removeItem(KEY); } catch (e) {} };
  DB.exportJson = function () { return JSON.stringify({ v: 1, at: Date.now(), clients: D.clients, orders: D.orders, ops: D.ops }); };
  DB.importJson = function (text) { const j = JSON.parse(text); if (!j || !Array.isArray(j.orders) || !Array.isArray(j.clients)) throw new Error('Это не файл базы'); DB.apply({ clients: j.clients, orders: j.orders, ops: j.ops || [] }); return DB.save(); };

  DB.readFile = function (file) {
    return new Promise((ok, no) => {
      if (!window.XLSX) { no(new Error('Не загрузилась библиотека чтения Excel (нужен интернет при первом запуске)')); return; }
      const r = new FileReader();
      r.onload = () => { try { ok(DB.parse(XLSX.read(new Uint8Array(r.result), { type: 'array' }))); } catch (e) { no(e); } };
      r.onerror = () => no(new Error('Файл не прочитался'));
      r.readAsArrayBuffer(file);
    });
  };

  /* показатели за период [from, to] (ISO-даты включительно) */
  DB.stats = function (from, to, orders) {
    const os = (orders || D.orders).filter(o => o.created >= from && o.created <= to && o.cat !== undefined);
    const r = { n: os.length, rev: 0, prof: 0, cost: 0, debt: 0, bySup: {}, bySrc: {}, byCat: {}, byMonth: {} };
    os.forEach(o => { const p = DB.prof(o); r.rev += o.sum; r.prof += p; r.cost += o.cost; r.debt += DB.debt(o);
      const add = (m, k, v) => { m[k] = (m[k] || 0) + v; };
      add(r.bySup, o.sup || 'не указан', 1); add(r.bySrc, o.src || 'не указан', 1); add(r.byCat, o.cat || 'Разное', p); add(r.byMonth, o.created.slice(0, 7), o.sum); });
    r.margin = r.rev ? r.prof / r.rev : 0; r.avg = r.n ? r.rev / r.n : 0; return r;
  };
  DB.dmy = dmy; DB.iso = iso; DB.phoneFmt = phoneFmt;
  window.DB = DB;
  DB.load();
})();
