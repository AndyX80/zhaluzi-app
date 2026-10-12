/* «Спросить Клода»: поиск и срезы по заказам обычной фразой. Работает без ключа и без интернета: разбирает фразу по шаблонам, данные не уходят из браузера. */
(function () {
  const A = App, D = A.D, e = A.esc, m = A.money;
  const pad = n => String(n).padStart(2, '0'), isoD = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const MS = [['январ', 0], ['феврал', 1], ['март', 2], ['апрел', 3], ['ма[йяе]', 4], ['июн', 5], ['июл', 6], ['август', 7], ['сентябр', 8], ['октябр', 9], ['ноябр', 10], ['декабр', 11]];
  const MF = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const CATS = [['плиссе', /плисс/, 'Плиссе'], ['дерево', /дерев|бамбук/, 'Дерево'], ['горизонтальные', /\bгж\b|горизонт|алюмин/, 'Горизонтальные'], ['вертикальные', /\bвж\b|вертикал/, 'Вертикальные'], ['рулонные', /рулон|\bрш\b/, 'Рулонные'], ['зебра', /зебр/, 'Зебра'], ['мираж', /мираж/, 'Мираж'], ['римские', /римск|римк/, 'Римские'], ['москитные сетки', /москит|сетк/, 'Москитные сетки']];
  const SUPS = [['Амиго', /амиго/], ['Уют', /\bуют/], ['Foroom', /форум|foroom/], ['Интерьер', /интерьер/], ['РДО', /\bрдо\b/], ['ТСК', /\bтск\b/]];
  const SRCS = [['Авито', /авито/], ['Яндекс Карты', /яндекс/], ['Сайт', /\bсайт/], ['Сарафан', /сарафан/], ['По рекомендации', /рекоменд/], ['Повторный', /повторн/], ['Telegram', /telegram|телеграм/], ['ВКонтакте', /вконтакте|\bвк\b/]];
  const GROUPS = [['источник', /по источник|по откуда/, 'src', 'Источник'], ['поставщик', /по поставщик/, 'sup', 'Поставщик'], ['категори', /по категори|по видам|по типам/, 'cat', 'Категория'], ['месяц', /по месяц/, 'month', 'Месяц'], ['регион', /по регион|по зон/, 'zone', 'СПб / регионы']];
  const blob = o => {
    if (o._blob) return o._blob; let t = [o.cat, o.title, o.sup, o.tk].join(' ');
    if (o.uid && window.DB && DB.raw) { const r = DB.raw().find(x => x.uid === o.uid); if (r) t += ' ' + (r.items || []).map(i => [i.title, i.mat, i.prod, i.sup, i.name].join(' ')).join(' '); }
    return o._blob = t.toLowerCase();
  };
  function parse(q) {
    const s = ' ' + q.toLowerCase().replace(/ё/g, 'е') + ' ', P = { tags: [], f: [], used: [] }, now = new Date(), y = now.getFullYear(), mo = now.getMonth();
    const take = (re) => { const x = re.exec(s); if (x) P.used.push(x[0].trim()); return x; };
    // период
    let from = '0000-01-01', to = '9999-12-31', pl = '';
    const set = (a, b, l) => { from = isoD(a); to = isoD(b); pl = l; };
    let x;
    if ((x = take(/прошл\S* месяц/))) set(new Date(y, mo - 1, 1), new Date(y, mo, 0), 'прошлый месяц (' + MF[(mo + 11) % 12] + ')');
    else if ((x = take(/(этот|текущ\S*|в этом) месяц/))) set(new Date(y, mo, 1), new Date(y, mo + 1, 0), 'этот месяц');
    else if ((x = take(/позапрошл\S* месяц/))) set(new Date(y, mo - 2, 1), new Date(y, mo - 1, 0), 'позапрошлый месяц');
    else if ((x = take(/прошл\S* недел/))) { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7); const e2 = new Date(d); e2.setDate(d.getDate() + 6); set(d, e2, 'прошлая неделя'); }
    else if ((x = take(/(эт\S* недел|на недел)/))) { const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); set(d, now, 'эта неделя'); }
    else if ((x = take(/сегодня/))) set(now, now, 'сегодня');
    else if ((x = take(/вчера/))) { const d = new Date(now); d.setDate(d.getDate() - 1); set(d, d, 'вчера'); }
    else if ((x = take(/прошл\S* год|в прошлом году/))) set(new Date(y - 1, 0, 1), new Date(y - 1, 11, 31), String(y - 1));
    else if ((x = take(/(этот год|в этом году|с начала года)/))) set(new Date(y, 0, 1), now, 'этот год');
    else if ((x = take(/прошл\S* квартал/))) { const q = Math.floor(mo / 3) - 1, yy = q < 0 ? y - 1 : y, qq = (q + 4) % 4; set(new Date(yy, qq * 3, 1), new Date(yy, qq * 3 + 3, 0), 'прошлый квартал'); }
    else if ((x = take(/(этот квартал|в этом квартале)/))) { const q = Math.floor(mo / 3); set(new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 0), 'этот квартал'); }
    else if ((x = take(/последни\S* (\d+) (дн|недел|месяц)\S*/))) { const n = +x[1], d = new Date(now); if (/дн/.test(x[2])) d.setDate(d.getDate() - n); else if (/недел/.test(x[2])) d.setDate(d.getDate() - 7 * n); else d.setMonth(d.getMonth() - n); set(d, now, 'последние ' + n + ' ' + x[2]); }
    else {
      for (const k of MS) { const re = new RegExp('(?:в|за|на|с)?\\s*' + k[0] + '\\S*(?:\\s+(20\\d\\d))?'); const r = re.exec(s); if (r) { const yy = r[1] ? +r[1] : (k[1] > mo ? y - 1 : y); set(new Date(yy, k[1], 1), new Date(yy, k[1] + 1, 0), MF[k[1]] + ' ' + yy); P.used.push(r[0].trim()); break; }
      }
      if (!pl && (x = /\b(20\d\d)\b/.exec(s))) { set(new Date(+x[1], 0, 1), new Date(+x[1], 11, 31), x[1]); P.used.push(x[1]); }
    }
    if (pl) P.tags.push(pl);
    P.from = from; P.to = to;
    // сущности
    const cats = CATS.filter(c => c[1].test(s)); if (cats.length) { P.cats = cats; P.tags.push(cats.map(c => c[2]).join(' / ')); cats.forEach(c => P.used.push((c[1].exec(s) || [''])[0].trim())); }
    const sups = SUPS.filter(c => c[1].test(s)); if (sups.length) { P.sups = sups.map(c => c[0]); P.tags.push('поставщик ' + P.sups.join('/')); sups.forEach(c => P.used.push(c[1].exec(s)[0].trim())); }
    const srcs = SRCS.filter(c => c[1].test(s)); if (srcs.length) { P.srcs = srcs.map(c => c[0]); P.tags.push('источник ' + P.srcs.join('/')); srcs.forEach(c => P.used.push(c[1].exec(s)[0].trim())); }
    if (/без (монтаж|установк)/.test(s)) { P.inst = false; P.tags.push('без монтажа'); P.used.push('монтаж'); }
    else if (/(монтаж|установк|монтирова)/.test(s)) { P.inst = true; P.tags.push('с монтажом'); P.used.push('монтаж'); }
    if (/регион/.test(s)) { P.zone = 'Регионы'; P.tags.push('регионы'); P.used.push('регион'); } else if (/\bспб\b|питер/.test(s)) { P.zone = 'СПб'; P.tags.push('СПб'); P.used.push('спб'); }
    if (/долг|должн|неоплач|не оплат|недоплат|ждут оплат/.test(s)) { P.debt = true; P.tags.push('есть долг клиента'); P.used.push('долг'); }
    if (/рекламац/.test(s)) { P.claim = true; P.tags.push('рекламации'); P.used.push('рекламац'); }
    if (/не закрыт|в работе|открыт/.test(s)) { P.open = true; P.tags.push('не закрыты'); P.used.push('открыт'); }
    else if (/закрыт|выполнен|завершен/.test(s)) { P.closed = true; P.tags.push('закрытые'); P.used.push('закрыт'); }
    if (/отказ|потерян|сорвал/.test(s)) { P.lost = true; P.tags.push('отказы'); P.used.push('отказ'); }
    else if (/кп\b|просчет|черновик|не оформ|в воронке/.test(s)) { P.calcs = true; P.tags.push('просчёты и КП (не оформлены)'); P.used.push('кп'); }
    const no = /(?:заказ|№|номер)\s*(\d{3,5})/.exec(s); if (no) { P.no = no[1]; P.tags.push('заказ № ' + no[1]); P.used.push(no[0]); }
    GROUPS.some(g => { if (g[1].test(s)) { P.group = g; P.used.push(g[1].exec(s)[0]); return true; } });
    // остаток слов: имя клиента
    const stop = /^(заказ\S*|поставщик\S*|источник\S*|категор\S*|месяц\S*|покажи|найди|все|всех|мне|за|в|на|по|и|а|или|заказ[аы]?|заказов|клиент[аы]?|клиентов|список|сколько|какие|какой|сумма|выручка|прибыль|средний|чек|их|мои|с|у|от|для|что|то|же|было|были|где|кто|дай|выведи|собери|выборку|срез|монтаж\S*|установк\S*|плиссе|жалюз\S*|штор\S*)$/;
    const used = P.used.join(' ');
    const left = s.replace(/[?!.,;:()]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stop.test(w) && used.indexOf(w) < 0 && !/^\d+$/.test(w) && !MS.some(k => new RegExp('^' + k[0]).test(w)) && !/недел|месяц|квартал|год|сегодня|вчера|прошл|последн|этот|эт[аоу]|текущ|регион|долг|должн|неоплач|отказ|кп|просчет|рекламац|закрыт|работе|открыт/.test(w));
    const known = w => D.clients.some(c => (c.name || '').toLowerCase().replace(/ё/g, 'е').indexOf(w.slice(0, Math.max(4, w.length - 2))) >= 0);
    const nm = left.filter(known), ig = left.filter(w => !known(w));
    if (nm.length) { P.name = nm; P.tags.push('клиент: ' + nm.join(' ')); }
    if (ig.length) P.ignored = ig;
    return P;
  }
  function run(P) {
    let pool = P.calcs ? (D.calcs || []).filter(o => !o.archived && !o.lost) : P.lost ? (D.calcs || []).concat(D.orders).filter(o => o.lost) : D.orders.filter(o => !o.archived);
    const nm = (o) => ((A.client(o.client) || {}).name || o.name || '') + ' ' + ((A.client(o.client) || {}).phone || o.phone || '') + ' ' + o.no;
    const res = pool.filter(o => {
      if (o.created < P.from || o.created > P.to) return false;
      if (P.cats && !P.cats.some(c => c[1].test(blob(o)))) return false;
      if (P.sups && !P.sups.some(sp => (o.sup || '').toLowerCase().indexOf(sp.toLowerCase()) >= 0 || (sp === 'Foroom' && /форум/i.test(o.sup || '')))) return false;
      if (P.srcs && P.srcs.indexOf(o.src) < 0) return false;
      if (P.inst !== undefined && !!o.inst !== P.inst) return false;
      if (P.zone && (o.zone || 'СПб') !== P.zone) return false;
      if (P.debt && !(DB.debt(o) > 0)) return false;
      if (P.claim && !o.claim) return false;
      if (P.open && o.fl && o.fl.closed) return false;
      if (P.closed && !(o.fl && o.fl.closed)) return false;
      if (P.no && String(o.no) !== P.no) return false;
      if (P.name && !P.name.every(w => nm(o).toLowerCase().replace(/ё/g, 'е').indexOf(w.slice(0, Math.max(4, w.length - 2))) >= 0)) return false;
      return true;
    }).sort((a, b) => a.created < b.created ? 1 : -1);
    return res;
  }
  const sumOf = os => os.reduce((g, o) => { g.n++; g.rev += o.sum || 0; g.prof += DB.prof(o); g.debt += DB.debt(o); return g; }, { n: 0, rev: 0, prof: 0, debt: 0 });
  const dmy = s => DB.dmy ? DB.dmy(s) : s;
  const cn = o => (A.client(o.client) || {}).name || o.name || '—';
  const stageOf = o => o.lost ? 'Отказ: ' + o.lost : (D.STAGES[o.stage] || '');
  const DIM = { src: o => o.src || 'не указан', sup: o => o.sup || 'не указан', cat: o => o.cat || 'Разное', month: o => (o.created || '').slice(0, 7), zone: o => o.zone || 'СПб' };
  let H = [], last = null;
  function answer(q) {
    const P = parse(q), os = run(P), g = sumOf(os), hp = !!A.S.hideProfit;
    last = { P, os };
    let html = '<div class="ask-tags">' + (P.tags.length ? 'Понял так: ' + P.tags.map(t => '<span class="pill">' + e(t) + '</span>').join(' ') : '<span class="mut">Фильтров не нашёл, показываю всё</span>') + '</div>';
    if (P.ignored) html += '<div class="mut sm">Не учёл слова: ' + e(P.ignored.join(', ')) + '</div>';
    html += '<div class="ask-sum"><b>' + g.n + '</b> ' + 'заказов · выручка <b>' + m(g.rev) + '</b>' + (hp ? '' : ' · прибыль <b>' + m(g.prof) + '</b>') + (g.debt ? ' · долг <b>' + m(g.debt) + '</b>' : '') + '</div>';
    if (P.group && os.length) {
      const by = {}; os.forEach(o => { const k = DIM[P.group[2]](o); (by[k] = by[k] || []).push(o); });
      const rows = Object.keys(by).map(k => [k, sumOf(by[k])]).sort((a, b) => P.group[2] === 'month' ? (a[0] < b[0] ? -1 : 1) : b[1].rev - a[1].rev);
      html += '<table class="tbl"><thead><tr><th>' + P.group[3] + '</th><th class="r">Заказов</th><th class="r">Выручка</th>' + (hp ? '' : '<th class="r">Прибыль</th>') + '</tr></thead><tbody>' + rows.map(r => '<tr><td>' + e(r[0]) + '</td><td class="r num">' + r[1].n + '</td><td class="r num">' + m(r[1].rev) + '</td>' + (hp ? '' : '<td class="r num">' + m(r[1].prof) + '</td>') + '</tr>').join('') + '</tbody></table>';
    } else if (os.length) {
      html += '<div class="ask-tbl"><table class="tbl"><thead><tr><th>№</th><th>Дата</th><th>Клиент</th><th>Категория</th><th class="r">Сумма</th><th>Этап</th></tr></thead><tbody>' + os.slice(0, 60).map(o => '<tr style="cursor:pointer" data-a="opn" data-id="order:' + o.id + '"><td>' + e(o.no) + '</td><td>' + dmy(o.created) + '</td><td>' + e(cn(o)) + '</td><td>' + e(o.cat || '') + '</td><td class="r num">' + m(o.sum) + '</td><td>' + e(stageOf(o)) + '</td></tr>').join('') + '</tbody></table></div>' + (os.length > 60 ? '<div class="mut sm">Показаны первые 60 из ' + os.length + '. Скопируй таблицу целиком кнопкой ниже.</div>' : '');
    } else html += '<p class="mut">Ничего не нашлось. Попробуй иначе: «монтажи плиссе за прошлый месяц», «долги по Амиго», «заказы с Авито за сентябрь по месяцам».</p>';
    html += '<div class="row wrap" style="margin-top:6px"><button class="btn" data-a="askcopy">Скопировать таблицей</button><span class="mut sm">Период считается по дате оформления заказа: даты монтажа в базе пока нет.</span></div>';
    H.push({ q, html }); if (H.length > 20) H.shift(); render();
  }
  A.act.askcopy = () => {
    if (!last) return; const t = ['№\tДата\tКлиент\tКатегория\tПоставщик\tСумма\tЭтап'].concat(last.os.map(o => [o.no, dmy(o.created), cn(o), o.cat, o.sup, o.sum, stageOf(o)].join('\t'))).join('\n');
    try { navigator.clipboard.writeText(t).then(() => A.toast('Скопировано, можно вставить в Excel'), () => A.toast('Не удалось скопировать')); } catch (x) { A.toast('Не удалось скопировать'); }
  };
  const ex = ['монтажи плиссе за прошлый месяц', 'долги клиентов по Амиго', 'заказы с Авито за сентябрь по месяцам', 'рекламации этого года', 'прибыль по категориям за год', 'КП без ответа'];
  function render() {
    const box = document.getElementById('askbox'); if (!box) return;
    box.innerHTML = '<div class="ask-h"><b>Спросить Клода</b><span class="sp"></span><button class="dw-b" data-a="askclose">✕</button></div><div class="ask-log" id="asklog">' +
      (H.length ? H.map(h => '<div class="ask-q">' + e(h.q) + '</div><div class="ask-a">' + h.html + '</div>').join('') : '<p class="mut">Пиши обычной фразой: что найти, за какой период, по каким признакам.</p><div class="row wrap">' + ex.map(x => '<button class="chip" data-a="askex" data-q="' + e(x) + '">' + e(x) + '</button>').join('') + '</div>') + '</div>' +
      '<form class="ask-f" id="askform"><input class="in" id="askin" autocomplete="off" placeholder="Например: все монтажи плиссе прошлого месяца"><button class="btn pri" type="submit">Найти</button></form>';
    const lg = document.getElementById('asklog'); if (lg) lg.scrollTop = lg.scrollHeight;
    const f = document.getElementById('askform'); f.onsubmit = ev => { ev.preventDefault(); const v = document.getElementById('askin').value.trim(); if (v) answer(v); };
    const i = document.getElementById('askin'); if (i && open) i.focus();
  }
  let open = false;
  function mount() {
    if (document.getElementById('askbtn')) return;
    const b = document.createElement('button'); b.id = 'askbtn'; b.title = 'Спросить Клода (Ctrl+K)'; b.setAttribute('data-a', 'asktoggle'); b.innerHTML = A.icon('spark', 24); document.body.appendChild(b);
    const x = document.createElement('div'); x.id = 'askbox'; x.hidden = true; document.body.appendChild(x);
  }
  const toggle = v => { open = v === undefined ? !open : v; const x = document.getElementById('askbox'); x.hidden = !open; if (open) render(); };
  A.act.asktoggle = () => toggle(); A.act.askclose = () => toggle(false);
  A.act.askex = el => { const i = document.getElementById('askin'); i.value = el.dataset.q; answer(el.dataset.q); };
  document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); toggle(true); } });
  A.askParse = parse; A.askRun = run;
  mount();
})();
