/* Экран «Замерник» (5 шагов) по макету Order.dc.html. Черновик хранится в localStorage jal_zam. */
(function () {
  'use strict';
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const KEY = 'jal_zam';
  const SUP_TERM = { 'Амиго': 11, 'Интерьер': 14, 'РДО': 14, 'Форум': 14, 'Уют': 14 };
  const UI_SUP = { 'Амиго': 'Amigo', 'Форум': 'Foroom' };
  const CTRL_TXT = { L: 'поворот и подъём слева', R: 'поворот и подъём справа', TL: 'поворот слева, подъём справа', TR: 'поворот справа, подъём слева' };
  const CTRL_CHAIN = { L: 'цепочка слева', R: 'цепочка справа' };
  const DRAW = {
    50: { L: ['M22 16v76M25 16v76M29 16v70', ''], R: ['M84 16v76M81 16v76M77 16v70', ''], TL: ['M22 16v76M25 16v76M84 16v70', ''], TR: ['M23 16v70M81 16v76M84 16v76', ''] },
    25: { L: ['M28 16v70', 'M23 16v76'], R: ['M78 16v70', 'M83 16v76'], TL: ['M83 16v70', 'M23 16v76'], TR: ['M23 16v70', 'M83 16v76'] }
  };
  const PAYS = ['QR', 'Наличные', 'СБП', 'Безнал'], STEPS = ['Клиент', 'Изделия', 'Монтаж', 'Оплата', 'Отправка'];
  const MOUNT = ['Демонтаж, шт', 'Сложный монтаж', 'Парковка', 'Расстояние от КАД', 'Высота установки h'];
  const scr = JalScreen.make('orderRoot', 'tpl_orderRoot');
  const App = () => window.JalApp;
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  const myMail = () => lsGet('jal_mail') || '89817645545@mail.ru';

  function nextNo() {
    const a = JalOrders.load(), y = new Date().getFullYear();
    const n = a.filter(o => String(o.no).startsWith(y + '-')).map(o => +String(o.no).split('-')[1]);
    return y + '-' + String((n.length ? Math.max.apply(null, n) : 0) + 1).padStart(3, '0');
  }
  function fresh(key) {
    return { key, to: 'client', ctype: 'fiz', pmode: 'pct', copy: true, inst: true, rep: 'fine', prepay: 100, term: '', pay: 'QR', step: 0, lad: {}, dm: '', di: '', cm: false, ci: false,
      mnotes: '', mount: ['', '', '', '', ''], no: key === 'new' ? nextNo() : key, date: today(), measurer: lsGet('jal_measurer') || 'Хорошавин', deliv: '', name: '', phone: '', addr: '', email: '',
      company: '', inn: '', uaddr: '', repr: '', notes: null, qFrom: '12', qTo: '14', qrBlank: lsGet('jal_qr_blank') === '1', savedNo: null };
  }
  function fromOrder(o) {
    if (o.zam) return Object.assign(fresh(o.no), o.zam, { key: o.no, savedNo: o.no });
    const s = fresh(o.no), yur = o.buyer === 'юр';
    Object.assign(s, { ctype: yur ? 'yur' : 'fiz', savedNo: o.no, date: today(), measurer: o.measurer || s.measurer, phone: o.phone || '', addr: o.addr || '', email: o.email || '',
      company: o.company || '', inn: o.inn || '', uaddr: o.uaddr || '', dm: String(o.meas || '').slice(0, 10), di: String(o.inst || '').slice(0, 10), inst: o.install !== false && +o.delivery > 0,
      prepay: +o.pre || 100, pmode: o.preU === '₽' ? 'rub' : 'pct', term: String(o.term || ''), notes: o.note || null });
    if (yur) s.repr = o.name || ''; else s.name = o.name || '';
    return s;
  }
  let S = null;
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function ensure() {
    const en = JalCart.C.editNo, key = en && JalOrders.get(en) ? en : 'new';
    if (S && S.key === key) return;
    let saved = null; try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (saved && saved.key === key) S = Object.assign(fresh(key), saved);
    else S = key === 'new' ? fresh('new') : fromOrder(JalOrders.get(key));
    persist();
  }

  /* позиции: одинаковые изделия объединяются, нумеруются только жалюзи */
  function groups(co) {
    const acc = [];
    co.items.forEach(it => {
      const key = JSON.stringify([it.kind, it.title, it.sup, it.mat, it.lam, it.W, it.H, it.price, it.ctrl, it.o && it.o.color, it.o && it.o.fix, it.o && it.o.opts]);
      const f = acc.find(x => x.key === key); if (f) f.n++; else acc.push({ key, it, n: 1 });
    });
    let k = 0; acc.forEach(g => { if (g.it.W) g.num = ++k; });
    return acc;
  }
  const supUi = s => UI_SUP[s] || s;
  const lc = s => String(s || '').toLowerCase();
  const short = it => [lc(it.o.fix).replace('ниж. фиксация', 'ниж. фикс.')].filter(Boolean).concat((it.o.opts || []).map(lc));
  function autoNotes(gs) {
    const out = [];
    gs.filter(g => g.num).forEach(g => {
      const it = g.it, chain = (it.o.opts || []).indexOf('Цепочка') >= 0;
      out.push('Поз. ' + g.num + ': ГЖ ' + it.lam + ' ' + supUi(it.sup) + ', ' + lc(it.mat) + (it.o.color ? ', ' + lc(it.o.color) : '') + (it.o.opts && it.o.opts.length ? ', ' + it.o.opts.map(lc).join(', ') : '') +
        '; управление: ' + ((chain ? CTRL_CHAIN : CTRL_TXT)[it.ctrl] || CTRL_TXT.TR) + '.');
      if (it.o.fix) out.push('Поз. ' + g.num + ': ' + lc(it.o.fix) + '.');
    });
    return out.join('\n');
  }

  function save(co) {
    if (!co.items.length) { alert('Корзина пуста'); return null; }
    const yur = S.ctype === 'yur', gs = groups(co);
    const mount = S.inst ? MOUNT.map((l, i) => S.mount[i] ? l + ': ' + S.mount[i] : '').filter(Boolean).join('; ') : '';
    const note = [S.notes == null ? autoNotes(gs) : S.notes, S.inst && S.mnotes ? 'Монтажнику: ' + S.mnotes : '', mount].filter(Boolean).join('\n');
    const lad = gs.filter(g => g.num && S.lad[g.num] && S.lad[g.num].own && S.lad[g.num].v).map(g => 'Поз. ' + g.num + ': лесенка/тесьма ' + S.lad[g.num].v);
    const total = JalDocs.orderTotal(Object.assign({}, co));
    const data = { priced: true, disc: co.disc, needDog: co.needDog, delivery: S.inst ? co.delivery : 0, install: S.inst, buyer: yur ? 'юр' : 'физ',
      name: yur ? S.repr : S.name, phone: S.phone, addr: S.addr, email: S.email, company: yur ? S.company : '', inn: yur ? S.inn : '', uaddr: yur ? S.uaddr : '',
      meas: S.dm, inst: S.di, measurer: S.measurer, pre: String(S.prepay || 100), preU: S.pmode === 'pct' ? '%' : '₽', term: String(S.term || 12), note: note + (lad.length ? '\n' + lad.join('\n') : ''),
      cart: JalCart.snapshot(), zam: JSON.parse(JSON.stringify(S)) };
    const no = S.savedNo || (JalCart.C.editNo && JalOrders.get(JalCart.C.editNo) ? JalCart.C.editNo : null);
    let o;
    if (no && JalOrders.get(no)) {
      o = JalOrders.update(no, Object.assign({ items: co.items }, data));
      JalOrders.addVersion(no, 'Замерник', fmt(total) + ' ₽');
    } else {
      if (S.no && S.no !== 'new' && !JalOrders.get(S.no)) data.no = S.no;
      o = JalOrders.create(data, co.items);
    }
    S.savedNo = o.no; persist();
    return o;
  }

  function render() {
    ensure();
    const co = JalCart.toOrder(), gs = groups(co), blinds = gs.filter(g => g.num);
    const total = JalDocs.orderTotal(co), service = co.delivery;
    const set = p => { Object.assign(S, p); persist(); render(); };
    const quiet = (k, f) => ({ value: S[k], set: e => { S[k] = e.target.value; persist(); } });
    const seg = on => 'min-height: 52px; border: 0; background: transparent; padding: 0 4px; font-size: 15px; text-align: center; line-height: 1.2; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? 800 : 600) + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');
    const segS = on => seg(on).replace('font-size: 15px', 'font-size: 15px');
    const sups = co.items.filter(i => i.sup && !i.kind).map(i => i.sup);
    const termMax = sups.reduce((m, x) => Math.max(m, SUP_TERM[x] || 12), 0) || 12, termSup = supUi(sups.filter(x => (SUP_TERM[x] || 12) === termMax)[0] || '');
    if (S.term === '') { S.term = String(termMax); persist(); }
    const preRub = S.pmode === 'pct' ? Math.round(total * Math.min(100, +S.prepay || 0) / 100) : Math.min(total, +S.prepay || 0);
    const yur = S.ctype === 'yur', s = S.step;
    const fld = (label, k, mode) => Object.assign({ label, mode: mode || 'text' }, quiet(k));
    const client = (yur ? [fld('Название', 'company'), fld('ИНН', 'inn', 'numeric'), fld('Юридический адрес', 'uaddr'), fld('Телефон', 'phone', 'tel')]
      .concat(S.inst ? [fld('Адрес установки', 'addr')] : []).concat([fld('E-mail', 'email', 'email'), fld('ФИО представителя', 'repr')])
      : [fld('ФИО', 'name'), fld('Телефон', 'phone', 'tel'), fld('Адрес' + (S.inst ? ' установки' : ''), 'addr'), fld('E-mail (необязательно)', 'email', 'email')]);
    const head = [['Заказ №', 'no', ''], ['Дата', 'date', ''], ['Замерил', 'measurer', ''], ['Дата поставки', 'deliv', 'дд.мм.гггг']].map(a => Object.assign({ label: a[0], ph: a[2] }, quiet(a[1])));
    const calUrl = (title, v) => { const d = v.replace(/-/g, ''), e = new Date(v + 'T00:00:00'); e.setDate(e.getDate() + 1);
      const n = e.getFullYear() + String(e.getMonth() + 1).padStart(2, '0') + String(e.getDate()).padStart(2, '0');
      return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + d + '/' + n + '&details=' + encodeURIComponent((S.name || S.repr || '') + ' ' + (S.phone || '') + ' ' + (S.addr || '')); };
    const dates = [['Дата замера', 'dm', 'cm', '#E0A800', 'Замеры'], ['Дата монтажа', 'di', 'ci', '#1C7FC0', 'Работа']].map(d => ({ name: d[0], value: S[d[1]],
      setVal: e => set({ [d[1]]: e.target.value, [d[2]]: false }), dot: 'width: 14px; height: 14px; border-radius: 7px; flex-shrink: 0; background: ' + d[3],
      calText: S[d[2]] ? 'В календаре «' + d[4] + '»' : 'В календарь',
      cal: () => { if (!S[d[1]]) { alert('Сначала выбери дату'); return; } window.open(calUrl((d[1] === 'dm' ? 'Замер' : 'Монтаж') + ': ' + (S.name || S.repr || 'клиент'), S[d[1]]), '_blank'); set({ [d[2]]: true }); },
      calStyle: 'height: 48px; border-radius: 12px; padding: 0 12px; font-size: 13px; font-weight: 700; white-space: nowrap; border: 1.5px solid ' + (S[d[2]] ? 'transparent' : 'var(--line)') + '; background: ' + (S[d[2]] ? '#E1F3E3' : 'var(--card)') + '; color: ' + (S[d[2]] ? '#1E6B24' : 'var(--dk)') }));
    const chk = (on, bg) => 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid ' + (on ? 'var(--ac)' : (bg || 'var(--chk)')) + '; background: ' + (on ? 'var(--ac)' : 'transparent');
    const doc = fn => () => { const o = save(JalCart.toOrder()); if (o) App().showDoc(fn, o, 'order'); };
    const noSend = S.inst && !(service > 0);
    const vm = {
      go: JalScreen.go, rootCls: '',
      steps: STEPS.map((n, i) => ({ name: n, pick: () => { set({ step: i }); window.scrollTo(0, 0); }, style: 'min-height: 48px; border: 0; background: transparent; padding: 0 2px; font-size: 13px; text-align: center; border-bottom: 3px solid ' + (s === i ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (s === i ? 800 : 600) + '; color: ' + (s === i ? 'var(--ink)' : 'var(--m3)') })),
      step0: s === 0, step1: s === 1, step2: s === 2, step3: s === 3, step4: s === 4, notLast: s < 4, isLast: s === 4,
      nextStep: () => { set({ step: Math.min(4, s + 1) }); window.scrollTo(0, 0); },
      stepHint: 'Шаг ' + (s + 1) + ' из 5',
      head, client, typeFiz: seg(!yur), typeYur: seg(yur), setFiz: () => set({ ctype: 'fiz' }), setYur: () => set({ ctype: 'yur' }),
      sketch: blinds.map(g => { const it = g.it, d = (DRAW[it.lam] || DRAW[50])[it.ctrl] || (DRAW[it.lam] || DRAW[50]).TR;
        return { n: String(g.num), w: String(Math.round(it.W * 10)), h: String(Math.round(it.H * 10)), thin: d[0], thick: d[1], note: 'ГЖ ' + it.lam + (short(it).length ? ' · ' + short(it).join(', ') : '') }; }),
      ladder: blinds.map(g => { const n = g.num, own = !!(S.lad[n] && S.lad[n].own); const sg = on => 'height: 40px; flex: 1 1 0; min-width: 0; border: 0; border-radius: 10px; font-size: 13px; font-weight: 600; color: var(--ink); background: ' + (on ? 'var(--sel)' : 'var(--chip)');
        return { n, pickAuto: () => { S.lad[n] = { own: false, v: '' }; set({}); }, pickOwn: () => { S.lad[n] = { own: true, v: (S.lad[n] || {}).v || '' }; set({}); },
          autoStyle: sg(!own), ownStyle: sg(own), value: own ? S.lad[n].v : '', setVal: e => { S.lad[n] = { own: true, v: e.target.value }; persist(); },
          inputStyle: 'width: 110px; height: 40px; border: 1.5px solid #E3D5C3; border-radius: 10px; padding: 0 8px; font-size: 14px; box-sizing: border-box; color: var(--ink); background: var(--card); ' + (own ? '' : 'visibility: hidden') }; }),
      addPhoto: () => alert('Фото и видео добавим позже.'), addVideo: () => alert('Фото и видео добавим позже.'), hasMedia: false, media: [],
      notes: S.notes == null ? autoNotes(gs) : S.notes, setNotes: e => { S.notes = e.target.value; persist(); },
      instY: seg(S.inst), instN: seg(!S.inst), setInstY: () => set({ inst: true }), setInstN: () => set({ inst: false }), inst: S.inst, instWarn: noSend,
      mount: MOUNT.map((l, i) => ({ label: l, value: S.mount[i], set: e => { S.mount[i] = e.target.value; persist(); } })),
      dates, mnotes: S.mnotes, setMnotes: e => { S.mnotes = e.target.value; persist(); },
      qFrom: S.qFrom, qTo: S.qTo, setQFrom: e => { S.qFrom = e.target.value; persist(); }, setQTo: e => { S.qTo = e.target.value; persist(); },
      repRough: seg(S.rep === 'rough'), repFine: seg(S.rep === 'fine'), setRepRough: () => set({ rep: 'rough' }), setRepFine: () => set({ rep: 'fine' }),
      lines: gs.map((g, i) => { const it = g.it; return { name: (i + 1) + '. ' + (it.title || ('ГЖ ' + it.lam + ' ' + supUi(it.sup) + (it.o.color ? ', ' + lc(it.o.color) : '') + ', ' + Math.round(it.W * 10) + '×' + Math.round(it.H * 10))), qty: g.n, price: fmt(it.price), sum: fmt(it.price * g.n) }; })
        .concat(co.disc > 0 ? [{ name: 'Скидка', qty: '', price: '', sum: '−' + fmt(co.disc) }] : []),
      total: fmt(total) + ' ₽', term: S.term, setTerm: e => { S.term = e.target.value; persist(); },
      termHint: 'Подсказка: самый долгий поставщик в заказе (' + termSup + ')', termHintN: termMax + ' дн.', useTerm: () => set({ term: String(termMax) }),
      modePct: segS(S.pmode === 'pct'), modeRub: segS(S.pmode === 'rub'),
      setPct: () => set({ pmode: 'pct', prepay: total ? Math.min(100, preRub / total * 100 | 0) : 100 }), setRub: () => set({ pmode: 'rub', prepay: preRub }),
      prepay: S.prepay, setPrepay: e => { const v = Math.max(0, Number(e.target.value) || 0); set({ prepay: S.pmode === 'pct' ? Math.min(100, v) : Math.min(total, v) }); },
      prepayNote: S.pmode === 'pct' ? '= ' + fmt(preRub) + ' ₽' : '= ' + (total ? Math.round(preRub / total * 1000) / 10 : 0).toString().replace('.', ',') + ' % от суммы',
      pays: PAYS.map(p => { const on = S.pay === p; return { name: p, pick: () => set({ pay: p }), style: seg(on).replace('font-size: 15px', 'font-size: 14px') }; }),
      rest: fmt(total - preRub) + ' ₽',
      qrOn: S.qrBlank, toggleQr: () => { try { localStorage.setItem('jal_qr_blank', S.qrBlank ? '0' : '1'); } catch (e) {} set({ qrBlank: !S.qrBlank }); },
      qrRow: 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); font-size: 15px; text-align: left; width: 100%; box-sizing: border-box; font-weight: ' + (S.qrBlank ? 700 : 400) + '; background: ' + (S.qrBlank ? 'var(--sel)' : 'var(--chip)'),
      qrBox: chk(S.qrBlank, 'var(--ac)'), qrMark: S.qrBlank ? '✓' : '',
      toClient: () => set({ to: 'client' }), toSelf: () => set({ to: 'self' }), toClientStyle: segS(S.to !== 'self'), toSelfStyle: segS(S.to === 'self'), toClientOn: S.to !== 'self',
      toHint: S.to === 'self' ? 'КП, замерник' + (co.needDog ? ' и договор' : '') + ' придут на ' + myMail() + ' в двух видах: Word (чтобы править руками) и PDF.' : 'Клиенту уходят PDF. Цены в замернике и договоре без доставки отдельной строкой.',
      needDog: co.needDog, docGrid: 'display: grid; gap: 8px; grid-template-columns: repeat(' + (co.needDog ? 3 : 2) + ', minmax(0, 1fr))',
      docKp: doc('kpHtml'), docZam: doc('zamernikHtml'), docDog: doc('dogovorHtml'),
      goSend: () => App().go('Send'),
      copyOn: S.copy, toggleCopy: () => set({ copy: !S.copy }), myMail: myMail(),
      copyRow: 'height: 46px; border: 0; border-radius: 14px; display: flex; align-items: center; gap: 10px; padding: 0 12px; font-size: 15px; color: var(--ink); width: 100%; box-sizing: border-box; background: ' + (S.copy ? 'var(--sel)' : '#FFFFFF') + '; font-weight: ' + (S.copy ? 700 : 400),
      copyBox: chk(S.copy), copyMark: S.copy ? '✓' : '',
      sendLabel: S.to === 'self' ? 'Отправить себе: Word + PDF' : (co.needDog ? 'Отправить замерник + договор' : 'Отправить замерник'),
      sendStyle: 'height: 48px; border: 0; border-radius: 24px; background: var(--ac); color: #FFFFFF; font-size: 14px; font-weight: 800; padding: 0 14px; line-height: 1.1; min-width: 0; opacity: ' + (noSend ? '0.45' : '1'),
      sendDo: () => {
        if (noSend) { alert('В корзине сумма доставки и установки 0 ₽. Укажи сумму в корзине.'); return; }
        const o = save(JalCart.toOrder()); if (!o) return;
        alert('Заказ № ' + o.no + ' сохранён. Отправку в мессенджер и на почту добавим следующим шагом: документы открываются из карточки заказа.');
        JalCart.clear(); S = null; try { localStorage.removeItem(KEY); } catch (e) {}
        window.JalOrdersScreen.F.openNo = o.no; App().tab('orderOpen');
      }
    };
    scr.render(vm);
  }
  window.JalOrderScreen = { render, saveNow: () => { ensure(); return save(JalCart.toOrder()); } };
})();
