/* Печатные формы по макетам Kp / KpMany, Blank / BlankMany, Dogovor (A4, 595 px шириной, масштабируются под экран). */
(function () {
  'use strict';
  const D = () => window.JalDocs;
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const rubS = n => fmt(n) + ' ₽';
  const rubZ = n => fmt(n) + ',00 руб.';
  const lc = s => String(s || '').toLowerCase();
  const form = (x, f) => { const a = x % 100, b = x % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2]; };
  const days = n => n + ' ' + form(+n, ['календарный день', 'календарных дня', 'календарных дней']);
  const dmy = d => String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  const CTRL = { L: 'поворот и подъём слева', R: 'поворот и подъём справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' };
  const CHAIN = { L: 'цепочка слева', R: 'цепочка справа' };
  const OPT = { 'Тесьма': 'декоративная тесьма', 'Цепочка': '', 'Окраска': 'окраска' };
  const FIX = { 'Ниж. фиксация': 'нижняя фиксация', 'Струна': 'боковая фиксация (струна)', 'Магниты': 'магниты' };
  const C = { phone: '+7 981-764-55-45', address: 'г. Санкт-Петербург, ул. Ильюшина, д. 14, ТК «Долгоозерный», 3 эт.', site: 'жалюзи-спб.рф', email: '89817645545@mail.ru', signer: 'Хорошавин Андрей',
    req: 'ИП Хорошавин Андрей Владимирович  •  ИНН 575404581100  •  ОГРН 318574900000760  •  Банк: ООО «Банк Точка» г. Москва  •  БИК 044525104  •  Р/с 40802810002500165928  •  Корр/с 30101810745374525104' };
  try { Object.assign(C, JSON.parse(localStorage.getItem('jal_req') || '{}')); } catch (e) {}
  const SUP = { 'Амиго': 'Amigo', 'Форум': 'Foroom' };

  /* строки: одинаковые изделия объединяются, цена уже с доставкой */
  function rowsOf(order, nameFn, specFn) {
    const acc = [];
    D().itemsWithDelivery(order).forEach(x => {
      const it = x.it, key = JSON.stringify([it.kind, it.title, it.sup, it.mat, it.lam, it.W, it.H, it.ctrl, it.o && it.o.color, it.o && it.o.fix, it.o && it.o.opts, x.price]);
      const f = acc.find(r => r.key === key); if (f) f.qty++; else acc.push({ key, it, price: x.price, qty: 1 });
    });
    return acc.map((r, i) => ({ n: String(i + 1), name: nameFn(r.it), spec: specFn(r.it), qty: r.qty, price: r.price, it: r.it }));
  }
  const isBl = it => !!it.W;
  const colorOf = it => it.o && it.o.color ? it.o.color : '';
  const sizeTxt = it => Math.round(it.W * 10) + '×' + Math.round(it.H * 10);
  function specKp(it) {
    if (!isBl(it) || it.prod) return '';
    const chain = (it.o.opts || []).indexOf('Цепочка') >= 0;
    const parts = [it.mat + ' ' + it.lam + ' мм', sizeTxt(it) + ' мм'].concat((it.o.opts || []).map(o => OPT[o] != null ? OPT[o] : lc(o)).filter(Boolean)).concat(it.o.fix ? [FIX[it.o.fix] || lc(it.o.fix)] : []);
    return parts.join(', ') + '; ' + ((chain ? CHAIN : CTRL)[it.ctrl] || CTRL.TR);
  }
  const nameKp = it => it.title ? it.title : 'Горизонтальные жалюзи' + (colorOf(it) ? ' «' + colorOf(it) + '»' : '');

  function vmKp(order, sig) {
    const rows = rowsOf(order, nameKp, specKp), total = D().orderTotal(order);
    const all = rows.map(r => ({ n: r.n, name: r.name, spec: r.spec, qty: String(r.qty), price: rubS(r.price), sum: rubS(r.qty * r.price) }));
    if (+order.disc > 0) all.push({ n: '', name: 'Скидка', spec: '', qty: '', price: '', sum: '−' + rubS(+order.disc) });
    const FIRST = 14, CONT = 19, WITH_LOWER = 5, pages = [];
    if (all.length <= WITH_LOWER) pages.push({ first: true, rows: all, hasTotal: true, hasLower: true });
    else {
      pages.push({ first: true, rows: all.slice(0, FIRST) });
      for (let k = FIRST; k < all.length; k += CONT) pages.push({ rows: all.slice(k, k + CONT) });
      const last = pages[pages.length - 1]; last.hasTotal = true;
      if (last.first || last.rows.length > WITH_LOWER) pages.push({ rows: [], hasLower: true }); else last.hasLower = true;
    }
    pages.forEach((p, k) => { p.hasRows = p.rows.length > 0; p.cont = !p.first; p.num = k + 1; p.count = pages.length; });
    const created = new Date(order.created), until = new Date(created.getTime() + 14 * 86400000);
    const pre = order.preU === '₽' ? Math.round(+order.pre / (total || 1) * 100) : (+order.pre || 100), term = +order.term || 12;
    const inst = order.install !== false && +order.delivery > 0;
    return { c: C, date: D().dateRu(created), valid: dmy(until), pages, total: rubS(total), hasSign: !!sig.sign, signSrc: sig.sign, hasStamp: !!sig.stamp, stampSrc: sig.stamp,
      intro: 'Подготовили для вас расчёт стоимости жалюзи по вашей заявке — учли все пожелания по размерам, материалам и цвету.',
      conds: [
        { title: 'Оплата', text: (pre >= 100 ? '100% предоплата' : pre + '% предоплата\n' + (100 - pre) + '% после установки') + '\nБез НДС' },
        { title: 'Сроки и гарантия', text: 'Изготовление — ' + days(term) + '\nГарантия на изделия — 1 год' },
        { title: 'Расчёт', text: (inst ? 'Включает изготовление, доставку и установку' : 'Включает изготовление. Доставка и установка не входят') + '\nПо замерам, согласованным с заказчиком' }],
      utp: ['Полный цикл: замер → производство → монтаж', 'Собственная команда монтажников в СПб и Ленобласти', 'Гарантия на изделия — 1 год', 'Работаем с деревом, тканью и фурнитурой премиум-класса'] };
  }

  function vmKpVar(order, sig, lower) {
    const base = vmKp(Object.assign({}, order, { items: [] }), sig), vs = order.vars || [], acc = [];
    order.items.forEach(it => { const key = JSON.stringify([it.kind, it.title, it.sup, it.mat, it.lam, it.W, it.H, it.ctrl, it.o && it.o.color, it.o && it.o.fix, it.o && it.o.opts, it.pv]);
      const f = acc.find(r => r.key === key); if (f) f.qty++; else acc.push({ key, it, pv: it.pv || vs.map(() => it.price), qty: 1 }); });
    const disc = +order.disc || 0, cell = v => 'text-align: center; font-weight: 700' + (v.best ? '; background: #FDEBDB; padding: 12px 0' : '');
    const all = acc.map((r, i) => ({ n: String(i + 1), name: r.it.title ? r.it.title : 'Горизонтальные жалюзи', spec: specKp(r.it), qty: String(r.qty), sums: vs.map((v, k) => ({ v: r.pv[k] == null ? 'нет' : rubS(r.qty * r.pv[k]), style: cell(v) })) }));
    if (disc > 0) all.push({ n: '', name: 'Скидка', spec: '', qty: '', sums: vs.map(v => ({ v: '−' + rubS(disc), style: cell(v) })) });
    const FIRST = 14, CONT = 19, WITH_LOWER = lower == null ? 5 : lower, pages = [];
    if (all.length <= WITH_LOWER) pages.push({ first: true, rows: all, hasTotal: true, hasLower: true });
    else {
      pages.push({ first: true, rows: all.slice(0, FIRST) });
      for (let k = FIRST; k < all.length; k += CONT) pages.push({ rows: all.slice(k, k + CONT) });
      const last = pages[pages.length - 1]; last.hasTotal = true;
      if (last.first || last.rows.length > WITH_LOWER) pages.push({ rows: [], hasLower: true }); else last.hasLower = true;
    }
    pages.forEach((p, k) => { p.hasRows = p.rows.length > 0; p.cont = !p.first; p.num = k + 1; p.count = pages.length; });
    const vars = vs.map(v => ({ name: v.name, about: v.about, total: rubS(Math.max(0, v.total - disc)) + (v.miss ? '*' : ''),
      headStyle: 'padding: 6px 0; text-align: center' + (v.best ? '; background: #F1780F' : ''),
      boxStyle: 'border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; ' + (v.best ? 'background: #F1780F; color: #FFFFFF' : 'background: #F4F4F4; color: #1A1A1A'),
      tag: v.best ? 'Рекомендуем' : ' ', tagStyle: 'font-size: 8px; font-weight: 700; text-align: center; border-radius: 4px; padding: 2px 0; ' + (v.best ? 'background: #FFFFFF; color: #F1780F' : '') }));
    return Object.assign(base, { pages, vars });
  }
  const DRAW = { 50: { L: ['M18 12v80M21 12v80M25 12v72', ''], R: ['M82 12v80M79 12v80M75 12v72', ''], TL: ['M18 12v80M21 12v80M82 12v72', ''], TR: ['M19 12v72M79 12v80M82 12v80', ''] },
    25: { L: ['M24 12v72', 'M19 12v80'], R: ['M76 12v72', 'M81 12v80'], TL: ['M82 12v72', 'M19 12v80'], TR: ['M19 12v72', 'M82 12v80'] } };
  function vmBlank(order, sig) {
    const z = order.zam || {}, items = D().itemsWithDelivery(order);
    const acc = [];
    items.forEach(x => { const it = x.it, key = JSON.stringify([it.kind, it.title, it.sup, it.mat, it.lam, it.W, it.H, it.ctrl, it.o, x.price]); const f = acc.find(g => g.key === key); if (f) f.qty++; else acc.push({ key, it, price: x.price, qty: 1 }); });
    const bl = acc.filter(g => isBl(g.it)), ot = acc.filter(g => !isBl(g.it));
    const gs = bl.concat(ot);
    const lines = gs.map((g, i) => ({ name: (i + 1) + '. ' + (g.it.title || ('ГЖ ' + g.it.lam + ' ' + (SUP[g.it.sup] || g.it.sup) + (colorOf(g.it) ? ', ' + lc(colorOf(g.it)) : '') + ', ' + sizeTxt(g.it))), qty: String(g.qty), price: fmt(g.price), sum: fmt(g.price * g.qty) }));
    if (+order.disc > 0) lines.push({ name: 'Скидка', qty: '', price: '', sum: '−' + fmt(+order.disc) });
    const total = D().orderTotal(order);
    const cellOf = (g, i) => { if (!g) return { n: String(i + 1), w: '', h: '', thin: '', thick: '', opt: '', box: '#888888', bw: '0.8', dash: '2 2' };
      const it = g.it, d = (DRAW[it.lam] || DRAW[50])[it.ctrl] || (DRAW[it.lam] || DRAW[50]).TR, opt = (it.o.fix ? '+' + lc(it.o.fix).replace('ниж. фиксация', 'ниж. фиксация') : '');
      return { n: String(i + 1), w: String(Math.round(it.W * 10)), h: String(Math.round(it.H * 10)), thin: d[0], thick: d[1], opt, box: '#111111', bw: '1.4', dash: '' }; };
    const SK_FIRST = 12, SK_CONT = 12, ROWS_P1 = 4, ROWS_PAGE = 30, pages = [];
    const cellsFor = (from, cnt) => { const a = []; for (let i = from; i < from + cnt; i++) a.push(cellOf(bl[i], i)); return a; };
    const single = bl.length <= SK_FIRST && lines.length <= ROWS_P1;
    pages.push({ first: true, cells: cellsFor(0, SK_FIRST), rows: single ? lines : [], hasTotal: single });
    for (let k = SK_FIRST; k < bl.length; k += SK_CONT) pages.push({ sk: true, cells: cellsFor(k, SK_CONT) });
    if (!single) for (let k = 0; k < lines.length; k += ROWS_PAGE) pages.push({ rows: lines.slice(k, k + ROWS_PAGE), hasTotal: k + ROWS_PAGE >= lines.length });
    const inst = order.install !== false && +order.delivery > 0;
    pages.forEach((p, k) => { p.inst = inst; p.hasRows = !!(p.rows && p.rows.length); p.cont = k > 0; p.num = k + 1; p.count = pages.length; });
    const yur = order.buyer === 'юр', pre = order.preU === '₽' ? Math.min(total, +order.pre) : Math.round(total * (+order.pre || 100) / 100);
    const pct = total ? Math.round(pre / total * 100) : 100;
    const MOUNT = ['Демонтаж, шт:', 'Сложный монтаж:', 'Парковка:', 'Расстояние от КАД:', 'Высота установки изделий h:'];
    const PAY = { 'QR': 'Оплата QR-кодом', 'Наличные': 'Наличные', 'СБП': 'СБП', 'Безнал': 'Безналичный расчёт' };
    const q1 = z.qFrom || '', q2 = z.qTo || '';
    return { pages, num: order.no, measurer: order.measurer || '', date: dmy(new Date(order.created)), payText: PAY[z.pay] || 'Оплата QR-кодом',
      fields: [{ k: 'Заказчик', v: yur ? (order.company || order.name) : order.name }, { k: 'Адрес замера', v: order.addr || '' }, { k: 'Телефон', v: order.phone || '' }, { k: 'Срок изготовления', v: days(+order.term || 12) }],
      notes: order.note || '', instYes: inst ? '☑ есть' : '☐ есть', instNo: inst ? '☐ нет' : '☑ нет',
      mount: MOUNT.map((k, i) => ({ k, v: (z.mount && z.mount[i]) || '' })).filter(m => m.v),
      quietShow: !!(q1 || q2), quietYn: (q1 || q2) ? '☑ да ☐ нет' : '☐ да ☐ нет', quietFrom: q1 || '____', quietTo: q2 || '____',
      stageText: z.rep === 'rough' ? '☑ черновая отделка ☐ чистовая отделка' : (z.rep === 'fine' ? '☐ черновая отделка ☑ чистовая отделка' : '☐ черновая отделка ☐ чистовая отделка'),
      total: fmt(total), prepayText: pct + '% · ' + fmt(pre), rest: fmt(total - pre) };
  }

  const words = n => D().rublesWords(n) + ' 00 копеек';
  const NB = String.fromCharCode(160), numZ = n => fmt(n).replace(/ /g, NB) + ',00';
  const shortName = rep => { rep = (rep || '').trim(); if (/\./.test(rep)) return rep; const w = rep.split(/\s+/); return w.length >= 2 ? w[0] + ' ' + w.slice(1).map(x => x[0].toUpperCase() + '.').join('') : rep; };
  /* Договор: два юридических шаблона (после правок юриста).
     Только товар (самовывоз или ТК) → «Договор купли-продажи» (Продавец); товар с установкой → «Договор поставки и монтажа» (Поставщик).
     Тип заказчика (физ / юр / ИП) и предоплата (любая сумма, полная или частичная) меняют только подстановки. */
  function vmDog(order, sig) {
    const total = D().orderTotal(order), inst = order.install !== false && +order.delivery > 0, reg = !!order.region;
    const R = inst ? 'Поставщик' : 'Продавец', Rg = inst ? 'Поставщика' : 'Продавца';
    const bt = order.buyer === 'юр' ? 'юр' : order.buyer === 'ип' ? 'ип' : 'физ';
    const rows = rowsOf(order, it => it.title ? it.title : 'Горизонтальные жалюзи (' + [lc(it.mat) + ' ' + it.lam + ' мм', colorOf(it) ? '«' + colorOf(it) + '»' : '', sizeTxt(it) + ' мм'].concat((it.o.opts || []).map(o => OPT[o] != null ? OPT[o] : lc(o)).filter(Boolean)).concat(it.o.fix ? [FIX[it.o.fix] || lc(it.o.fix)] : []).filter(Boolean).join(', ') + ')', () => '');
    const tr = rows.map(r => ({ n: r.n, name: r.name, qty: String(r.qty), price: numZ(r.price), sum: numZ(r.qty * r.price) }));
    if (+order.disc > 0) tr.push({ n: '', name: 'Скидка', qty: '', price: '', sum: '−' + numZ(+order.disc) });
    const pre = Math.max(0, Math.min(total, order.preU === '₽' ? +order.pre : Math.round(total * (+order.pre || 100) / 100))), rest = total - pre;
    const pay = '2.2. Оплата по настоящему Договору производится следующим образом: предоплата в размере ' + numZ(pre) + ' руб. (' + words(pre) + ') вносится на расчётный счёт или в кассу ' + Rg + ' при подписании настоящего Договора'
      + (rest > 0 ? '; оставшаяся сумма в размере ' + numZ(rest) + ' руб. (' + words(rest) + ') вносится на расчётный счёт или в кассу ' + Rg + (inst ? ' в течение 3 (трёх) дней после установки Товара.' : ' при получении Товара.') : '.');
    const rep = (order.name || '').trim(), company = (order.company || '').trim();
    const buyer = bt === 'юр' ? company + (rep ? ' в лице представителя ' + rep + ', действующего на основании Устава' : '') : bt === 'ип' ? 'ИП ' + rep : rep;
    const req = (bt === 'физ' ? [['Ф.И.О.', rep], ['Адрес', order.addr], ['Телефон', order.phone], ['E-mail', order.email]]
      : [['Наименование / Ф.И.О.', bt === 'ип' ? 'ИП ' + rep : company], ['ИНН', order.inn], ['ОГРН / ОГРНИП', order.ogrn], ['Адрес', order.uaddr || order.addr], ['Телефон', order.phone], ['E-mail', order.email], ['Банковские реквизиты', order.bank]]);
    const buyerReq = req.filter(r => r[1] && String(r[1]).trim()).map(r => r[0] + ': ' + String(r[1]).trim());
    const term = +order.term || 12, who = order.measurer ? 'Поставщиком' : 'Покупателем самостоятельно';
    const SUBJ = inst
      ? ['1.1. Поставщик обязуется передать в собственность Покупателю Товар (жалюзи/шторы) согласно Замерному листу/Спецификации (Приложение № 1), а также выполнить работы по его доставке и монтажу. Покупатель обязуется принять и оплатить Товар и работы.',
        '1.2. Доставка и установка (монтаж) осуществляются Поставщиком. Стоимость включена в цену Товара.',
        '1.3. Адрес доставки и монтажа: ' + (order.addr || '—') + '.']
      : ['1.1. Продавец обязуется передать в собственность Покупателю Товар (жалюзи/шторы) согласно Замерному листу/спецификации (Приложение № 1), а Покупатель обязуется его принять и оплатить.',
        '1.2. Работы по доставке, замеру и монтажу данным Договором не предусмотрены и осуществляются силами Покупателя или по отдельному соглашению.',
        reg ? '1.3. Передача Товара осуществляется через транспортную компанию. Адрес пункта выдачи и транспортная компания: ' + (order.pvz || '—') + '. Доставка до пункта выдачи в цену Договора не включена.'
          : '1.3. Место передачи Товара: склад Продавца по адресу: г. Санкт-Петербург, ул. Ильюшина, д. 14, ТК «Долгоозерный». (Самовывоз)'];
    SUBJ.push('1.4. Количество, размеры, конфигурация, цвет и стоимость Товара указаны в Спецификации (Приложение № 1):');
    const P2 = inst ? [
      { h: '2. ЦЕНА И ПОРЯДОК ОПЛАТЫ', t: ['2.1. Общая цена Договора составляет: ' + numZ(total) + ' руб. (' + words(total) + '). НДС не облагается.', pay,
        '2.3. Изменение состава заказа после подписания оформляется дополнительным соглашением с пересчётом цены и сроков.',
        '2.4. Право собственности на Товар переходит к Покупателю с момента полной оплаты цены Договора.'] },
      { h: '3. ЗАМЕР И СРОКИ', t: ['3.1. Замер изделий выполняется: ' + who + '.',
        '3.2. Если замер выполняет Поставщик, Покупатель обеспечивает доступ к проёмам и после замера не изменяет их размеры и конфигурацию.',
        '3.3. Если замер выполняет Покупатель самостоятельно, Покупатель несёт полную ответственность за точность и достоверность переданных Поставщику размеров. Поставщик не отвечает за несоответствие Товара размерам проёма, невозможность монтажа и иные последствия, вызванные ошибками замера, и не производит в этом случае бесплатную переделку, замену или гарантийный ремонт Товара за свой счёт.',
        '3.4. Поставщик приступает к исполнению обязательств с момента поступления предоплаты.',
        '3.5. Срок изготовления и поставки Товара: ' + days(term) + ' с даты поступления предоплаты (при замере Покупателем — с даты получения размеров от Покупателя). Дата и время поставки/монтажа согласовываются дополнительно по телефону.',
        '3.6. Поставщик не отвечает за нарушение сроков, вызванное форс-мажором, либо действиями/бездействием Покупателя (недоступ к месту установки, просрочка оплаты, задержка предоставления размеров при самостоятельном замере).'] },
      { h: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', t: [
        '4.1. При установке Поставщиком Покупатель обеспечивает свободный доступ работников Поставщика к месту монтажа в согласованную дату, а также возможность подключения электроинструмента к электросети 220В на объекте. При монтаже собственными силами Покупатель самостоятельно отвечает за соответствие проёма и крепежа техническим требованиям изделия.',
        '4.2. Поставщик не несёт ответственности за невозможность корректной установки вследствие неровности, кривизны стен/откосов/потолков либо недостаточной несущей способности поверхностей, если это не было выявлено при замере.',
        '4.3. Покупатель обязан осмотреть Товар при получении и подписать Акт приёма-передачи. Если акт не подписан и претензии не заявлены в течение 3 дней, Товар считается принятым надлежащего качества.'] }] : [
      { h: '2. ЦЕНА И ПОРЯДОК ОПЛАТЫ', t: ['2.1. Общая цена Договора составляет: ' + numZ(total) + ' руб. (' + words(total) + '). НДС не облагается.', pay,
        '2.3. Изменение состава заказа после подписания оформляется дополнительным соглашением с пересчётом цены и сроков.',
        '2.4. Право собственности переходит в момент полной оплаты и передачи Товара.'] },
      { h: '3. ЗАМЕР И СРОКИ', t: ['3.1. Замер изделий Продавцом по настоящему Договору не выполняется. Размеры Товара определяет Покупатель самостоятельно.',
        '3.2. Покупатель несёт полную ответственность за точность и достоверность переданных Продавцу размеров. Продавец не отвечает за несоответствие Товара размерам проёма, невозможность монтажа и иные последствия, вызванные ошибками замера, и не производит в этом случае бесплатную переделку, замену или гарантийный ремонт Товара за свой счёт.',
        '3.3. Срок изготовления и передачи Товара: ' + days(term) + ' с даты подписания Договора (но не ранее получения размеров от Покупателя). О готовности Товара Продавец уведомляет Покупателя по телефону.',
        '3.4. Продавец не отвечает за нарушение сроков, вызванное форс-мажором, либо действиями/бездействием Покупателя (задержка предоставления размеров).'] },
      { h: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', t: [
        '4.1. Покупатель обязан осмотреть Товар при получении' + (reg ? '' : ' на складе Продавца') + ' и подписать Акт приёма-передачи. Если акт не подписан и претензии не заявлены в течение 3 дней, Товар считается принятым надлежащего качества.',
        '4.2. Монтаж (установку) Товара Покупатель осуществляет самостоятельно и отвечает за соответствие проёма и крепежа техническим требованиям изделия.'] }];
    const P3 = [
      { h: '5. ГАРАНТИЯ', t: ['5.1. Гарантийный срок — 12 месяцев с даты передачи Товара. Недостатки устраняются ' + Rg + ' без дополнительной оплаты в течение 15 рабочих дней либо возвращается уплаченная за изделие сумма.',
        '5.2. Гарантия не распространяется на дефекты вследствие: механических повреждений; самостоятельного ремонта или изменения конструкции; монтажа, выполненного Покупателем или третьими лицами с нарушением технических требований изделия; использования несоответствующих чистящих средств; попадания строительных смесей в механизм или на ткань/ламели. Незначительные оттеночные отличия материалов природного происхождения браком не являются.'] },
      { h: '6. ОТВЕТСТВЕННОСТЬ СТОРОН', t: inst ? [
        '6.1. За нарушение сроков поставки Поставщик уплачивает Покупателю пеню 0,5% от стоимости Товара за каждый день просрочки.',
        '6.2. За нарушение сроков оплаты Покупатель уплачивает Поставщику пеню 0,1% от неоплаченной суммы за каждый день просрочки.',
        '6.3. При просрочке Покупателем окончательной оплаты более чем на 5 (пять) рабочих дней после установки, Поставщик вправе приостановить действие гарантийных обязательств. В случае просрочки более чем на 30 (тридцать) календарных дней, Поставщик имеет право осуществить демонтаж и вывоз Товара. Все расходы по демонтажу, транспортировке и хранению Товара возлагаются на Покупателя.',
        '6.4. В остальном Стороны несут ответственность согласно действующему законодательству РФ.'] : [
        '6.1. За нарушение сроков передачи Товара Продавец уплачивает Покупателю пеню 0,1% от стоимости за каждый день просрочки.',
        '6.2. За нарушение сроков оплаты (если применимо) Покупатель уплачивает пеню 0,1% от неоплаченной суммы за каждый день просрочки.',
        '6.3. При просрочке Покупателем оплаты (если Товар передан до оплаты) более чем на 5 (пять) рабочих дней, Продавец вправе приостановить гарантийные обязательства. При просрочке более 30 (тридцати) календарных дней, Продавец вправе потребовать возврата Товара. Расходы на возврат несет Покупатель.',
        '6.4. В остальном Стороны несут ответственность согласно действующему законодательству РФ.'] },
      { h: '7. ПРОЧИЕ УСЛОВИЯ', t: ['7.1. Споры разрешаются переговорами, а при недостижении согласия — в суде по законодательству РФ.',
        '7.2. Изменения и дополнения действительны только в письменной форме за подписью обеих Сторон. Стороны признают юридическую силу документов и уведомлений, направленных по телефону/e-mail, указанным в разделе 9.',
        '7.3. Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами обязательств. Составлен в 2 (двух) экземплярах, по одному для каждой Стороны.'] },
      { h: '8. СОГЛАСИЕ ПОКУПАТЕЛЯ', t: ['8.1. Покупатель ознакомлен с образцами, характеристиками Товара, ценой и условиями оплаты и согласен с ними в полном объёме.',
        '8.2. Покупатель даёт согласие на обработку своих персональных данных в целях исполнения настоящего Договора.'] }];
    return { num: order.no, title: inst ? 'ДОГОВОР ПОСТАВКИ И МОНТАЖА' : 'ДОГОВОР КУПЛИ-ПРОДАЖИ', role: R, dateText: D().dateRu(new Date(order.created)), buyer, buyerShort: shortName(rep), rows: tr, totalRub: numZ(total), hasSign: !!sig.sign, signSrc: sig.sign, hasStamp: !!sig.stamp, stampSrc: sig.stamp,
      p1: [{ h: '1. ПРЕДМЕТ ДОГОВОРА', t: SUBJ }], p2: P2, p3: P3,
      seller: ['ИП Хорошавин Андрей Владимирович', 'ИНН: 575404581100', 'ОГРНИП: 318574900000760', 'Адрес: г. Санкт-Петербург, ул. Ильюшина, д. 14, оф. 326/1', 'Р/с: 40802810002500165928', 'Банк: ООО «Банк Точка», г. Москва', 'БИК: 044525104', 'Корр/с: 30101810745374525104'],
      buyerReq };
  }

  /* показ: имя функции из docs.js → шаблоны. Договор идёт вместе с приложением (замерный лист). */
  /* КП на три варианта: нижний блок (условия, подпись, печать) остаётся на первом листе, только если там всё помещается; иначе уходит на следующий лист */
  function pickLower(order, sig) {
    const host = document.createElement('div'); host.setAttribute('style', 'position: fixed; left: -10000px; top: 0; width: 595px; zoom: ' + Math.min(1.6, (Math.min(window.innerWidth, 900) - 24) / 595));
    document.body.appendChild(host);
    const box = document.createElement('div'); host.appendChild(box); const mt = JalTpl.mount(box, document.getElementById('tpl_docKpVar'));
    let pick = 0;
    for (const w of [5, 4, 3, 2, 1]) {
      mt.render(vmKpVar(order, sig, w)); let bad = false;
      box.querySelectorAll('div[style*="height: 842px"]').forEach(d => { if (d.scrollHeight > d.clientHeight) bad = true; });
      if (!bad) { pick = w; break; }
    }
    host.remove(); return pick;
  }
  const LOW = [5, 4, 3, 2, 1, 0];
  const overflows = box => Array.from(box.querySelectorAll('div[style*="height: 842px"]')).some(d => d.scrollHeight > d.clientHeight);
  const imgsReady = box => Promise.all(Array.from(box.querySelectorAll('img')).map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
  /* после загрузки картинок (логотип, печать) проверяем по-настоящему и при переполнении переносим нижний блок на следующий лист */
  async function settleReal(mt, box, order, sig, w) {
    for (let guard = 0; guard < 6; guard++) {
      await imgsReady(box); await new Promise(r => setTimeout(r, 30));
      if (!box.offsetParent && !box.getClientRects().length) return;
      if (!overflows(box)) return;
      const nx = LOW.find(x => x < w); if (nx === undefined) return;
      w = nx; mt.render(vmKpVar(order, sig, w));
    }
  }
  const settleLower = (render, order, sig, after) => { const w = pickLower(order, sig); render(w); if (after) after(w); };
  const mounts = {};
  const SET = { kpHtml: [['docKpRoot', 'tpl_docKp', vmKp]], kpVarHtml: [['docKpVarRoot', 'tpl_docKpVar', vmKpVar]], zamernikHtml: [['docBlankRoot', 'tpl_docBlank', vmBlank]], dogovorHtml: [['docDogRoot', 'tpl_docDog', vmDog], ['docBlankRoot', 'tpl_docBlank', vmBlank]] };
  const ALL = ['docKpRoot', 'docKpVarRoot', 'docBlankRoot', 'docDogRoot'];
  function fit() { const w = Math.min(window.innerWidth, 900) - 24, z = Math.min(1.6, w / 595); ALL.forEach(id => { const b = document.getElementById(id); if (b) b.style.zoom = z; }); }
  window.addEventListener('resize', fit);
  function show(fn, order, sig) {
    const set = SET[fn]; if (!set) return false;
    ALL.forEach(id => { document.getElementById(id).hidden = true; });
    set.forEach(s => {
      const box = document.getElementById(s[0]); box.hidden = false;
      if (!mounts[s[0]]) mounts[s[0]] = JalTpl.mount(box, document.getElementById(s[1]));
      if (s[2] === vmKpVar) settleLower(w => mounts[s[0]].render(vmKpVar(order, sig, w)), order, sig, w => setTimeout(() => settleReal(mounts[s[0]], box, order, sig, w), 60)); else mounts[s[0]].render(s[2](order, sig));
    });
    fit(); return true;
  }
  /* Страницы документа вне экрана: нужны для PDF. Возвращает { els: [page div], done() }. */
  async function pagesOff(fn, order, sig) {
    const set = SET[fn]; if (!set) throw new Error('нет такого документа');
    const host = document.createElement('div'); host.setAttribute('style', 'position: fixed; left: -10000px; top: 0; width: 595px; background: #fff');
    document.body.appendChild(host); const fixes = [];
    set.forEach(s => { const box = document.createElement('div'); host.appendChild(box); const mt = JalTpl.mount(box, document.getElementById(s[1]));
      if (s[2] === vmKpVar) settleLower(w => mt.render(vmKpVar(order, sig, w)), order, sig, w => { fixes.push(() => settleReal(mt, box, order, sig, w)); }); else mt.render(s[2](order, sig)); });
    const imgs = Array.from(host.querySelectorAll('img'));
    await Promise.all(imgs.map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; })));
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    for (const f of fixes) await f();
    return { els: Array.from(host.querySelectorAll('div[style*="height: 842px"]')), done: () => host.remove() };
  }
  window.JalDocScreens = { C, pagesOff, vms: { kpHtml: vmKp, kpVarHtml: vmKpVar, zamernikHtml: vmBlank, dogovorHtml: vmDog }, show, hideAll: () => ALL.forEach(id => { const b = document.getElementById(id); if (b) b.hidden = true; }) };
})();
