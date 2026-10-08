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
    if (!isBl(it)) return '';
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
      return { n: String(i + 1), w: String(Math.round(it.W * 10)), h: String(Math.round(it.H * 10)), thin: d[0], thick: d[1], opt, box: '#1F4E78', bw: '1.4', dash: '' }; };
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
      quietYn: (q1 || q2) ? '☑ да ☐ нет' : '☐ да ☐ нет', quietFrom: q1 || '____', quietTo: q2 || '____',
      stageText: z.rep === 'rough' ? '☑ черновая отделка ☐ чистовая отделка' : (z.rep === 'fine' ? '☐ черновая отделка ☑ чистовая отделка' : '☐ черновая отделка ☐ чистовая отделка'),
      total: fmt(total), prepayText: pct + '% · ' + fmt(pre), rest: fmt(total - pre) };
  }

  const words = n => D().rublesWords(n) + ' 00 копеек';
  function vmDog(order, sig) {
    const total = D().orderTotal(order), inst = order.install !== false && +order.delivery > 0, yur = order.buyer === 'юр';
    const rows = rowsOf(order, it => it.title ? it.title : 'Горизонтальные жалюзи (' + [lc(it.mat) + ' ' + it.lam + ' мм', colorOf(it) ? '«' + colorOf(it) + '»' : '', sizeTxt(it) + ' мм'].concat((it.o.opts || []).map(o => OPT[o] != null ? OPT[o] : lc(o)).filter(Boolean)).concat(it.o.fix ? [FIX[it.o.fix] || lc(it.o.fix)] : []).filter(Boolean).join(', ') + ')', () => '');
    const tr = rows.map(r => ({ n: r.n, name: r.name, qty: String(r.qty), price: rubZ(r.price), sum: rubZ(r.qty * r.price) }));
    if (+order.disc > 0) tr.push({ n: '', name: 'Скидка', qty: '', price: '', sum: '−' + rubZ(+order.disc) });
    const prepay = order.preU === '₽' ? (total ? Math.round(+order.pre / total * 100) : 100) : (+order.pre || 100), pre = order.preU === '₽' ? +order.pre : Math.round(total * prepay / 100);
    const pay = prepay >= 100
      ? '2.2. Оплата по настоящему Договору производится следующим образом: предоплата в размере 100% стоимости настоящего Договора (' + rubZ(total) + ', ' + words(total) + ') вносится на расчётный счёт или в кассу Поставщика при подписании настоящего Договора.'
      : '2.2. Оплата по настоящему Договору производится следующим образом: предоплата в размере ' + prepay + '% стоимости настоящего Договора (' + rubZ(pre) + ', ' + words(pre) + ') вносится на расчётный счёт или в кассу Поставщика при подписании настоящего Договора; оставшаяся сумма ' + rubZ(total - pre) + ' (' + words(total - pre) + ') оплачивается ' + (inst ? 'в день установки Товара.' : 'до передачи Товара.');
    const rep = order.name || '', buyer = yur ? (order.company || '') + ', в лице представителя ' + rep : rep;
    const w = rep.trim().split(/\s+/), short = w.length >= 2 ? w[0] + ' ' + w.slice(1).map(x => x[0].toUpperCase() + '.').join('') : rep;
    const buyerReq = (yur ? ['Наименование: ' + order.company, 'ИНН: ' + order.inn, 'Юр. адрес: ' + order.uaddr, 'Телефон: ' + order.phone, inst ? 'Адрес установки: ' + order.addr : '', 'E-mail: ' + order.email, 'Представитель: ' + rep]
      : ['Ф.И.О.: ' + rep, 'Адрес: ' + order.addr, 'Телефон: ' + order.phone, order.email ? 'E-mail: ' + order.email : '']).filter(x => x && !/:\s*(undefined)?$/.test(x) && x.indexOf('undefined') < 0);
    const term = +order.term || 12;
    return { num: order.no, dateText: D().dateRu(new Date(order.created)), buyer, buyerShort: short, rows: tr, totalRub: rubZ(total), hasSign: !!sig.sign, signSrc: sig.sign, hasStamp: !!sig.stamp, stampSrc: sig.stamp,
      p1: [{ h: '1. ПРЕДМЕТ ДОГОВОРА', t: [
        '1.1. Поставщик обязуется передать в собственность Покупателю жалюзи/шторы/иные изделия (далее — «Товар») согласно замерному листу/спецификации, являющемуся неотъемлемой частью Договора (Приложение № 1), а Покупатель — принять и оплатить Товар.',
        inst ? '1.2. Доставка Товара по адресу, указанному в п. 1.3, и его установка (монтаж) осуществляются Поставщиком. Стоимость доставки и установки включена в цену Товара.'
          : '1.2. Поставщик не осуществляет доставку и установку заказанных изделий. Товар приобретается Покупателем на условиях самовывоза со склада Поставщика по адресу: г. Санкт-Петербург, ул. Ильюшина, д. 14, ТК «Долгоозерный», 3 этаж. Установку (монтаж) Покупатель осуществляет самостоятельно или силами третьих лиц, за свой счёт и на свой риск.',
        inst ? '1.3. Адрес доставки и установки Товара: ' + (order.addr || '—') + '.' : null,
        (inst ? '1.4.' : '1.3.') + ' Количество, размеры, конфигурация, цвет и стоимость Товара указаны в замерном листе.'].filter(Boolean) }],
      p2: [
        { h: '2. ЦЕНА И ПОРЯДОК ОПЛАТЫ', t: ['2.1. Общая цена Договора составляет: ' + rubZ(total) + ' (' + words(total) + '). НДС не облагается (УСН/НПД).', pay,
          '2.3. Изменение состава заказа после подписания оформляется дополнительным соглашением с пересчётом цены и сроков.',
          '2.4. Право собственности на Товар переходит к Покупателю с момента передачи, но не ранее полной оплаты цены Договора.'] },
        { h: '3. ЗАМЕР И СРОКИ', t: ['3.1. Замер изделий выполняется: ' + (order.measurer ? 'Поставщиком.' : 'Покупателем.'),
          '3.2. Если замер выполняет Поставщик, Покупатель обеспечивает доступ к проёмам и после замера не изменяет их размеры и конфигурацию.',
          '3.3. Если замер выполняет Покупатель самостоятельно, Покупатель несёт полную ответственность за точность и достоверность переданных Поставщику размеров. Поставщик не отвечает за несоответствие Товара размерам проёма, невозможность монтажа и иные последствия, вызванные ошибками замера, и не производит в этом случае бесплатную переделку, замену или гарантийный ремонт Товара за свой счёт.',
          '3.4. Поставщик приступает к исполнению обязательств с момента поступления предоплаты.',
          '3.5. Срок изготовления и поставки Товара: ' + days(term) + ' с даты поступления предоплаты (при замере Покупателем — с даты получения размеров от Покупателя). ' + (inst ? 'Дата и время поставки/монтажа' : 'Дата и время передачи Товара') + ' согласовываются дополнительно по телефону.',
          '3.6. Поставщик не отвечает за нарушение сроков, вызванное форс-мажором, либо действиями/бездействием Покупателя (недоступ к месту установки, просрочка оплаты, задержка предоставления размеров при самостоятельном замере).'] },
        { h: '4. ПРАВА И ОБЯЗАННОСТИ СТОРОН', t: [
          inst ? '4.1. При установке Поставщиком Покупатель обеспечивает свободный доступ работников Поставщика к месту монтажа в согласованную дату, а также возможность подключения электроинструмента к электросети 220В на объекте. При монтаже собственными силами Покупатель самостоятельно отвечает за соответствие проёма и крепежа техническим требованиям изделия.' : '4.1. Установку (монтаж) Товара Покупатель осуществляет самостоятельно или силами третьих лиц и самостоятельно отвечает за соответствие проёма и крепежа техническим требованиям изделия.',
          '4.2. Поставщик не несёт ответственности за невозможность корректной установки вследствие неровности, кривизны стен/откосов/потолков либо недостаточной несущей способности поверхностей, если это не было выявлено при замере.',
          '4.3. Покупатель обязан осмотреть Товар при получении и подписать Акт приёма-передачи. Если акт не подписан и претензии не заявлены в течение 3 дней, Товар считается принятым надлежащего качества.'] }],
      p3: [
        { h: '5. ГАРАНТИЯ', t: ['5.1. Гарантийный срок — 12 месяцев с даты передачи Товара. Недостатки устраняются Поставщиком без дополнительной оплаты в течение 15 рабочих дней либо возвращается уплаченная за изделие сумма.',
          '5.2. Гарантия не распространяется на дефекты вследствие: механических повреждений; самостоятельного ремонта или изменения конструкции; монтажа, выполненного Покупателем или третьими лицами с нарушением технических требований изделия; использования несоответствующих чистящих средств; попадания строительных смесей в механизм или на ткань/ламели. Незначительные оттеночные отличия материалов природного происхождения браком не являются.'] },
        { h: '6. ОТВЕТСТВЕННОСТЬ СТОРОН', t: ['6.1. За нарушение сроков поставки Поставщик уплачивает Покупателю пеню 0,5% от стоимости Товара за каждый день просрочки.',
          '6.2. За нарушение сроков оплаты Покупатель уплачивает Поставщику пеню 0,5% от неоплаченной суммы за каждый день просрочки.',
          '6.3. При просрочке Покупателем окончательной оплаты более чем на 30 дней после установки/передачи Товара Поставщик вправе демонтировать и изъять Товар; расходы на демонтаж и повторный монтаж несёт Покупатель.',
          '6.4. В остальном Стороны несут ответственность согласно действующему законодательству РФ.'] },
        { h: '7. ПРОЧИЕ УСЛОВИЯ', t: ['7.1. Споры разрешаются переговорами, а при недостижении согласия — в суде по законодательству РФ.',
          '7.2. Изменения и дополнения действительны только в письменной форме за подписью обеих Сторон. Стороны признают юридическую силу документов и уведомлений, направленных по телефону/e-mail, указанным в разделе 9.',
          '7.3. Договор вступает в силу с момента подписания и действует до полного исполнения Сторонами обязательств. Составлен в 2 (двух) экземплярах, по одному для каждой Стороны.'] },
        { h: '8. СОГЛАСИЕ ПОКУПАТЕЛЯ', t: ['8.1. Покупатель ознакомлен с образцами, характеристиками Товара, ценой и условиями оплаты и согласен с ними в полном объёме.',
          '8.2. Покупатель даёт согласие на обработку своих персональных данных в целях исполнения настоящего Договора.'] }],
      seller: ['ИП Хорошавин Андрей Владимирович', 'ИНН: 575404581100', 'ОГРНИП: 318574900000760', 'Адрес: г. Санкт-Петербург, ул. Ильюшина, д. 14, оф. 326/1', 'Р/с: 40802810002500165928', 'Банк: ООО «Банк Точка», г. Москва', 'БИК: 044525104', 'Корр/с: 30101810745374525104'],
      buyerReq };
  }

  /* показ: имя функции из docs.js → шаблоны. Договор идёт вместе с приложением (замерный лист). */
  const mounts = {};
  const SET = { kpHtml: [['docKpRoot', 'tpl_docKp', vmKp]], zamernikHtml: [['docBlankRoot', 'tpl_docBlank', vmBlank]], dogovorHtml: [['docDogRoot', 'tpl_docDog', vmDog], ['docBlankRoot', 'tpl_docBlank', vmBlank]] };
  const ALL = ['docKpRoot', 'docBlankRoot', 'docDogRoot'];
  function fit() { const w = Math.min(window.innerWidth, 900) - 24, z = Math.min(1.6, w / 595); ALL.forEach(id => { const b = document.getElementById(id); if (b) b.style.zoom = z; }); }
  window.addEventListener('resize', fit);
  function show(fn, order, sig) {
    const set = SET[fn]; if (!set) return false;
    ALL.forEach(id => { document.getElementById(id).hidden = true; });
    set.forEach(s => {
      const box = document.getElementById(s[0]); box.hidden = false;
      if (!mounts[s[0]]) mounts[s[0]] = JalTpl.mount(box, document.getElementById(s[1]));
      mounts[s[0]].render(s[2](order, sig));
    });
    fit(); return true;
  }
  window.JalDocScreens = { show, hideAll: () => ALL.forEach(id => { const b = document.getElementById(id); if (b) b.hidden = true; }) };
})();
