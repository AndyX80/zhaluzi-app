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
      if (o.email || o._e) c.email = o.email || o._e; if (o._p2 || o.phone2) c.phone2 = o._p2 || o.phone2; if (o.cnote) c.note = o.cnote;
      o.client = c.id; delete o.name; delete o.phone;
    });
    orders.reverse();
    const last = {}; orders.forEach(o => { if (!last[o.client]) last[o.client] = o.created; });
    clients.sort((a, b) => (last[a.id] < last[b.id] ? 1 : last[a.id] > last[b.id] ? -1 : 0));
    return { clients, orders, ops: ops.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)) };
  };


  /* ===== Общая база =====
     Единственный источник заказов — список записей (raw), такой же, как на телефоне и в файле «заказы.json» на Диске.
     Запись бывает двух видов: заказ с телефона (изделия внутри) и заказ из Excel-учёта (legacy:true, поля учёта как есть).
     Из записей собираются D.orders и D.clients; правки пишутся обратно в запись и уходят на Диск. */
  const RAW = 'jald_ph_v1', OPS = 'jald_ops_v1', OLD = 'jald_db_v1';
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const nowIso = () => new Date().toISOString();
  const STAGE_PH = { 'Черновик': 0, 'КП отправлено': 2, 'Договор': 3, 'Оплачен': 4 };
  DB.raw = () => { try { return JSON.parse(lsGet(RAW) || '[]') || []; } catch (e) { return []; } };
  DB.phRaw = DB.raw;
  DB.setRaw = list => lsSet(RAW, JSON.stringify(list));
  const statusOf = o => (o.sum > 0 && o.paid >= o.sum) || (o.fl && o.fl.closed) ? 'Оплачен' : 'Договор';

  /* заказ из Excel → запись; имя и телефон берутся у клиента */
  function toRec(o, c) {
    const r = Object.assign({}, o); delete r.client; delete r.id; delete r.ph; delete r.dupOf;
    r.uid = o.uid || ('x' + String(o.id).slice(1)); r.legacy = true; r.name = o.name != null && o.name !== '' ? o.name : ((c && c.name) || ''); r.phone = o.phone != null && o.phone !== '' ? o.phone : ((c && c.phone) || '');
    r.status = statusOf(o); r.created = o.created || ''; return r;
  }
  function fromRec(r) {
    const o = Object.assign({}, r); o.id = 'o' + String(r.uid).slice(1); o._n = r.name; o._p = r.phone; delete o.name; delete o.phone; delete o.sat; delete o.upd; delete o.status; delete o.legacy;
    o.uid = r.uid; o.legacy = true; o.archived = !!r.archived; return o;
  }
  /* просчёт = пока нет договора и предоплаты (черновик, КП отправлено) */
  const isDraftSt = st => !st || st === 'Черновик' || st === 'КП отправлено';
  function fromPhone(r) {
    const items = r.items || [], goods = items.reduce((a, i) => a + (+i.price || 0), 0), prof = items.reduce((a, i) => a + (+i.profit || 0), 0);
    const sum = Math.max(0, goods + (r.priced ? 0 : (+r.delivery || 0)) - (+r.disc || 0)), cat = items.some(i => /дерев|бамбук/i.test(i.mat || i.title || '')) ? 'Дерево' : items.some(i => i.prod === 'rolo') ? 'Рулонные' : 'Разное';
    const sups = {}; items.forEach(i => { if (i.sup) sups[i.sup] = 1; });
    return { id: 'ph' + r.uid, no: r.no ? String(r.no) : 'Просчёт', cnote: r.cnote || '', draft: isDraftSt(r.status), rawNo: r.no ? String(r.no) : '', uid: r.uid, ph: true, pre: r.pre, preU: r.preU, term: r.term, meas: !!r.meas, _p2: r.phone2 || '', _e: r.email || '', sup: Object.keys(sups).join(', '), cat, title: items.length ? items.length + ' поз.' : 'Заказ с телефона', src: r.src || '', factory: r.factory || '',
      inst: !!r.install, zone: r.region ? 'Регионы' : 'СПб', sum, paid: r.status === 'Оплачен' ? sum : 0, cost: Math.max(0, goods - prof), instCost: 0,
      created: (r.created || '').slice(0, 10), due: r.due || '', tk: r.tk != null ? r.tk : (r.note || ''), review: '', stage: STAGE_PH[r.status] != null ? STAGE_PH[r.status] : 2, status: r.status, claim: !!r.claim, legacy: false, archived: !!r.archived,
      _n: r.company || r.name || 'Без имени', _p: r.phone || '', _a: r.addr || '', items, disc: +r.disc || 0, delivery: +r.delivery || 0, priced: !!r.priced, hasCart: !!(r.cart && r.cart.cart), supSent: !!r.supSent,
      needCost: Object.keys(items.filter(i => i.kind === 'custom' && !i.costOk && !(+i.cost > 0)).reduce((a, i) => { a[i.title || 'Услуга'] = 1; return a; }, {})) };
  }
  DB.dups = [];
  DB.dupPick = () => { try { return JSON.parse(lsGet('jald_dup_v1') || '{}') || {}; } catch (e) { return {}; } };

  /* сборка D.orders и D.clients из записей */
  DB.derive = function () {
    const live = DB.raw().filter(r => !r.del), pick = DB.dupPick(); DB.dups = [];
    const legacyNo = {}; live.forEach(r => { if (r.legacy) legacyNo[String(r.no)] = r; });
    const orders = [];
    live.forEach(r => {
      if (r.legacy) { orders.push(fromRec(r)); return; }
      const lg = legacyNo[String(r.no)];
      if (lg) { const ch = pick[r.uid]; if (ch === 'phone') { const i = orders.findIndex(x => x.uid === lg.uid); if (i >= 0) orders.splice(i, 1); } else { if (!ch) DB.dups.push(r); return; } }
      orders.push(fromPhone(r));
    });
    /* пометка «phone» стирает Excel-версию только на экране; в базе она остаётся, пока Андрей её не удалит */
    orders.forEach(o => { o.name = o._n; o.phone = o._p; delete o._n; delete o._p; });
    const data = DB.build(orders, DB.loadOps());
    data.orders.forEach(o => { const c = data.clients.find(x => x.id === o.client); if (c && !c.addr && o._a) c.addr = o._a; delete o._a; });
    D.clients = data.clients; D.calcs = data.orders.filter(o => o.draft); D.orders = data.orders.filter(o => !o.draft); D.ops = data.ops; D.events = []; D.real = DB.real = true;
    return orders.length;
  };
  DB.loadOps = () => { try { return JSON.parse(lsGet(OPS) || '[]') || []; } catch (e) { return []; } };
  DB.saveOps = () => lsSet(OPS, JSON.stringify(D.ops || []));

  /* запись → в список, с меткой правки */
  function put(rec) {
    const list = DB.raw(), i = list.findIndex(x => x.uid === rec.uid); rec.upd = nowIso();
    if (i >= 0) list[i] = rec; else list.push(rec); DB.setRaw(list); DB.later(); return rec;
  }
  /* сквозной номер: больше всех номеров в базе (Excel и телефон) и отметки телефона jal_no_max */
  DB.nextNo = function () {
    let mx = 1325; mx = Math.max(mx, +lsGet('jal_no_max') || 0);
    DB.raw().forEach(r => { if (/^\d+$/.test(String(r.no))) mx = Math.max(mx, +r.no); });
    return String(mx + 1);
  };
  /* заказ из корзины: новый или (editNo) обновление уже оформленного; запись такая же, как делает телефон */
  /* ключ заказа в корзине: номер, а у черновика без номера — uid */
  DB.byKey = k => k ? DB.raw().find(r => !r.del && !r.legacy && (String(r.no) === String(k) || r.uid === k)) : null;
  DB.keyOf = r => r.no ? String(r.no) : r.uid;
  const needNo = st => st === 'Договор' || st === 'Оплачен'; /* КП — это просчёт без номера; номер у заказа с договора/предоплаты */
  /* номер присваивается, когда просчёт стал заказом: договор или предоплата */
  DB.ensureNo = function (uid) {
    const r = DB.raw().find(x => x.uid === uid); if (!r) return '';
    if (!r.no) { const no = DB.nextNo(); DB.patchRec(uid, { no }); try { lsSet('jal_no_max', String(Math.max(+lsGet('jal_no_max') || 0, +no))); } catch (e) {} return no; }
    return String(r.no);
  };
  /* ручная смена номера: пусто = вернуть в черновик без номера; занятый номер не принимается */
  DB.setNo = function (uid, v) {
    v = String(v == null ? '' : v).trim();
    if (v && DB.raw().some(r => !r.del && r.uid !== uid && String(r.no) === v)) return { ok: false, msg: 'Номер ' + v + ' уже занят' };
    DB.patchRec(uid, { no: v }); if (/^\d+$/.test(v)) try { lsSet('jal_no_max', String(Math.max(+lsGet('jal_no_max') || 0, +v))); } catch (e) {}
    return { ok: true };
  };
  DB.saveOrder = function (data, items, editNo, title, sum) {
    const t = nowIso(), old = editNo ? DB.byKey(editNo) : null;
    let rec;
    if (old) {
      rec = Object.assign({}, old, data, { items });
      rec.history = [{ v: (old.history || []).length + 1, title, sum, at: t, sub: '' }].concat(old.history || []);
    } else {
      rec = Object.assign({ uid: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), no: '', status: 'Черновик', created: t, history: [], rev: true, rem: 0 }, data, { items });
    }
    if (!rec.no && needNo(rec.status)) rec.no = DB.nextNo();
    put(rec); try { lsSet('jal_no_max', String(Math.max(+lsGet('jal_no_max') || 0, +rec.no || 0))); } catch (e) {}
    DB.derive(); return rec;
  };
  /* закуп своей позиции: v = число или '' (не указан); ok = «закуп действительно нулевой» подтверждён. Правится и состав заказа, и снимок корзины */
  DB.setCost = function (uid, idxs, v, ok) {
    const r = DB.raw().find(x => x.uid === uid); if (!r) return;
    const cost = v === '' || v == null ? '' : Math.max(0, Math.round(+String(v).replace(/\s/g, '') || 0)), conf = ok || cost > 0;
    const items = (r.items || []).map((it, i) => idxs.indexOf(i) < 0 ? it : Object.assign({}, it, { cost, costOk: !!conf, profit: cost === '' ? 0 : (+it.price || 0) - cost }));
    const patch = { items };
    if (r.cart && r.cart.cart) {
      const cart = r.cart.cart.map(x => x), seen = {};
      idxs.forEach(i => { const ci = (r.items[i] || {}).ci; if (ci != null && cart[ci] && !seen[ci]) { seen[ci] = 1; cart[ci] = Object.assign({}, cart[ci], { cost, costOk: !!conf }); } });
      patch.cart = Object.assign({}, r.cart, { cart });
    }
    DB.patchRec(uid, patch);
  };
  DB.patchRec = function (uid, patch) { const r = DB.raw().find(x => x.uid === uid); if (!r) return; const n = Object.assign({}, r, patch); if (!n.no && !n.legacy && needNo(n.status) && patch.status !== undefined) { n.no = DB.nextNo(); } put(n); DB.derive(); };
  /* после правки заказа на экране */
  DB.commit = function (o) {
    if (!o) return;
    if (o.legacy) put(toRec(o, D.clients.find(c => c.id === o.client)));
    else if (o.ph) { const r = DB.raw().find(x => x.uid === o.uid); if (r) put(Object.assign({}, r, { archived: !!o.archived })); }
    DB.later();
  };
  /* правка карточки клиента: пишется во все его заказы (клиент собирается из заказов) */
  DB.editClient = function (cid, patch) {
    const os = (D.orders || []).filter(o => o.client === cid && o.uid); if (!os.length) return null;
    const map = { name: 'name', phone: 'phone', phone2: 'phone2', email: 'email', addr: 'addr', src: 'src', note: 'cnote' }, p = {};
    Object.keys(patch).forEach(k => { if (map[k]) p[map[k]] = patch[k]; });
    const list = DB.raw(), t = nowIso(), uids = {}; os.forEach(o => { uids[o.uid] = 1; });
    DB.setRaw(list.map(r => { if (!uids[r.uid]) return r; const q = Object.assign({}, p); if (q.name !== undefined && r.company && !r.legacy) { q.company = q.name; delete q.name; } return Object.assign({}, r, q, { upd: t }); })); DB.later(); DB.derive();
    const o2 = (D.orders || []).find(o => o.uid === os[0].uid); return o2 ? o2.client : null;
  };
  /* история по заказу: события правятся вручную (отмена, звонок и т.п.) */
  const evId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  DB.addEvent = function (uid, t, x, d) { const r = DB.raw().find(y => y.uid === uid); if (!r) return; DB.patchRec(uid, { events: (r.events || []).concat([{ id: evId(), d: d || nowIso().slice(0, 10), t, x: x || '' }]) }); };
  DB.editEvent = function (uid, id, patch) { const r = DB.raw().find(y => y.uid === uid); if (!r) return; DB.patchRec(uid, { events: (r.events || []).map(e => e.id === id ? Object.assign({}, e, patch) : e) }); };
  DB.delEvent = function (uid, id) { const r = DB.raw().find(y => y.uid === uid); if (!r) return; DB.patchRec(uid, { events: (r.events || []).filter(e => e.id !== id) }); };
  DB.delOrder = function (o) { DB.patchRec(o.uid, { del: true }); };
  DB.archive = function (o, on) { DB.patchRec(o.uid, { archived: !!on }); };
  DB.delPhone = uid => DB.patchRec(uid, { del: true });
  DB.dupSet = (uid, v) => { const p = DB.dupPick(); p[uid] = v; lsSet('jald_dup_v1', JSON.stringify(p)); DB.derive(); };

  /* Excel → записи. Повторная загрузка обновляет только изменившееся и не воскрешает удалённое */
  DB.importExcel = function (data) {
    const list = DB.raw(), byUid = {}; list.forEach(r => { byUid[r.uid] = r; });
    const cl = {}; data.clients.forEach(c => { cl[c.id] = c; });
    let n = 0, t = nowIso();
    data.orders.forEach(o => {
      const rec = toRec(o, cl[o.client]), old = byUid[rec.uid];
      if (old && old.del) return;
      const strip = x => { const y = Object.assign({}, x); delete y.upd; delete y.sat; delete y.archived; return JSON.stringify(y, Object.keys(y).sort()); };
      if (old && strip(old) === strip(rec)) return;
      rec.upd = t; rec.archived = old ? !!old.archived : false; byUid[rec.uid] = rec; n++;
    });
    DB.setRaw(Object.keys(byUid).map(k => byUid[k])); lsSet(OPS, JSON.stringify(data.ops || []));
    DB.derive(); return n;
  };
  DB.load = function () {
    let raw = DB.raw();
    /* перенос из прежнего хранилища (v1): заказы из Excel и операции */
    const old = lsGet(OLD);
    if (old) { try {
      const j = JSON.parse(old), cl = {}; (j.clients || []).forEach(c => { cl[c.id] = c; });
      const have = {}; raw.forEach(r => { have[r.uid] = 1; }); const t = nowIso();
      (j.orders || []).filter(o => o.legacy).forEach(o => { const rec = toRec(o, cl[o.client]); if (!have[rec.uid]) { rec.upd = t; raw.push(rec); } });
      DB.setRaw(raw); if (j.ops && j.ops.length && !lsGet(OPS)) lsSet(OPS, JSON.stringify(j.ops));
    } catch (e) {} try { localStorage.removeItem(OLD); } catch (e) {} }
    raw = DB.raw();
    if (!raw.length) return false;
    DB.derive(); return true;
  };
  DB.clear = function () { [RAW, OPS, OLD, 'jald_dup_v1', 'jald_ph_since', 'jald_push_at'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); };
  DB.save = DB.saveOps; /* прежние вызовы: операции */
  DB.exportJson = () => JSON.stringify({ v: 2, at: Date.now(), raw: DB.raw(), ops: DB.loadOps() });
  DB.importJson = function (text) {
    const j = JSON.parse(text);
    if (j && j.v === 2 && Array.isArray(j.raw)) { const m = {}; DB.raw().concat(j.raw).forEach(r => { if (!m[r.uid] || String(r.upd || '') >= String(m[r.uid].upd || '')) m[r.uid] = r; }); DB.setRaw(Object.keys(m).map(k => m[k])); lsSet(OPS, JSON.stringify(j.ops || [])); DB.derive(); return true; }
    if (j && Array.isArray(j.orders) && Array.isArray(j.clients)) { lsSet(OLD, JSON.stringify(j)); DB.load(); return true; }
    throw new Error('Это не файл базы');
  };

  /* ===== синхронизация через Диск ===== */
  DB.scriptUrl = () => lsGet('jal_prices_url');
  DB.syncPhone = async function () {
    const base = DB.scriptUrl(); if (!base) throw new Error('Вставь ссылку на скрипт (Настройки → Данные)');
    const m = base.match(/[?&]key=([^&]+)/), all = DB.raw(), pushAt = lsGet('jald_push_at'), since = lsGet('jald_ph_since');
    const list = pushAt ? all.filter(o => String(o.upd || '') > pushAt) : all;
    const r = await fetch(base.split('?')[0], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: m ? decodeURIComponent(m[1]) : '', sync: list, since }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не ответил (обнови скрипт)'));
    const got = j.orders || [], cur = DB.raw(), mp = {}; cur.forEach(x => { mp[x.uid] = x; });
    got.forEach(x => { const c = mp[x.uid]; if (!c || String(x.upd || '') > String(c.upd || '')) mp[x.uid] = x; });
    DB.setRaw(Object.keys(mp).map(k => mp[k]));
    let mx = pushAt; list.concat(got).forEach(o => { if (String(o.upd || '') > mx) mx = String(o.upd); });
    if (mx) lsSet('jald_push_at', mx); if (j.now) lsSet('jald_ph_since', j.now); lsSet('jald_ph_at', String(Date.now()));
    DB.derive(); return got.length;
  };
  DB.fullSync = () => { lsSet('jald_push_at', ''); lsSet('jald_ph_since', ''); return DB.syncPhone(); };
  let tm = 0;
  DB.later = function () { if (!DB.scriptUrl()) return; clearTimeout(tm); tm = setTimeout(() => DB.syncPhone().then(() => { if (window.App && App.render) App.render(); }).catch(() => {}), 3000); };
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
  /* при запуске тихо подтягиваем заказы с телефона */
  setTimeout(() => { if (DB.real && DB.scriptUrl()) DB.syncPhone().then(() => { if (window.App && App.render) App.render(); }).catch(() => {}); }, 1500);
})();
