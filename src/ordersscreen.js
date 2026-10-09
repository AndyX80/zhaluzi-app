/* Экраны «Заказы» и «Заказ» (карточка) по макетам Orders.dc.html и OrderOpen.dc.html. */
(function () {
  'use strict';
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const dshort = d => d.getDate() + ' ' + MON[d.getMonth()];
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const F = { f: 'Все', from: '', to: '', q: '', openNo: null };
  const COLOR = { 'Черновик': ['#EADFD1', '#6B5545'], 'КП отправлено': ['#FFF1DE', '#8A4B00'], 'Договор': ['#F1E2D2', '#4A2C18'], 'Оплачен': ['#E1F3E3', '#1E6B24'] };
  const scrList = JalScreen.make('ordersRoot', 'tpl_ordersRoot');
  const scrOne = JalScreen.make('orderOpenRoot', 'tpl_orderOpenRoot');
  const App = () => window.JalApp;
  const total = o => o.legacy ? (+o.sum || 0) : JalDocs.orderTotal(o);
  const nPos = o => (o.cart && o.cart.cart ? o.cart.cart.length : o.items.length);
  const itemsText = o => o.legacy ? [o.cat, o.sup].filter(Boolean).join(' · ') || 'из Excel' : nPos(o) + ' ' + plural(nPos(o), 'позиция', 'позиции', 'позиций');

  function renderList() {
    const all = JalOrders.load().filter(o => F.f === 'Архив' ? o.archived : !o.archived), today = new Date(), T = iso(today);
    const q = F.q.trim().toLowerCase();
    const list = all.filter(o => (F.f === 'Все' || F.f === 'Архив' || o.status === F.f) && (!F.from || o.created.slice(0, 10) >= F.from) && (!F.to || o.created.slice(0, 10) <= F.to) &&
      (!q || (String(o.name || '') + ' ' + (o.phone || '') + ' ' + o.no).toLowerCase().indexOf(q) >= 0));
    const day = d => { const x = new Date(today); x.setDate(x.getDate() - d); return iso(x); };
    const QK = [['Сегодня', T, T], ['7 дней', day(6), T], ['Этот месяц', T.slice(0, 8) + '01', T], ['Всё время', '', '']];
    const qs = on => 'min-height: 52px; border: 0; background: transparent; padding: 0 4px; font-size: 14px; text-align: center; line-height: 1.2; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? 800 : 600) + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');
    const set = p => { Object.assign(F, p); render('ord'); };
    const vm = {
      count: list.length, q: F.q, setQ: e => set({ q: e.target.value }),
      from: F.from, to: F.to, setFrom: e => set({ from: e.target.value }), setTo: e => set({ to: e.target.value }),
      quick: QK.map(q => ({ name: q[0], pick: () => set({ from: q[1], to: q[2] }), style: qs(F.from === q[1] && F.to === q[2]) })),
      chips: ['Все'].concat(JalOrders.STATUSES).concat(['Архив']).map((n, k) => { const on = F.f === n; return { name: n, pick: () => set({ f: n }),
        style: 'grid-column: span ' + (k < 3 ? 2 : 3) + '; height: 44px; min-width: 0; padding: 0 4px; border-radius: 12px; font-size: 14px; font-weight: 600; color: var(--ink); background: ' + (on ? 'var(--sel)' : 'var(--chip)') + '; border: 1.5px solid ' + (on ? 'var(--ac)' : 'transparent') }; }),
      orders: list.map(o => {
        const s = total(o), old = o.status === 'КП отправлено' && o.sent && (today - new Date(o.sent)) / 86400000 > 14, last = (o.history || [])[0];
        return { client: o.name || 'без имени', num: o.no, date: dshort(new Date(o.created)), sum: s ? fmt(s) + ' ₽' : '—',
          items: itemsText(o), status: old ? 'КП: срок истёк' : o.status,
          note: last ? last.title + ' · ' + dshort(new Date(last.at)) : 'Не отправлялся',
          badge: 'font-size: 12px; font-weight: 700; border-radius: 10px; padding: 3px 8px; background: ' + (old ? '#FBE3E1' : COLOR[o.status][0]) + '; color: ' + (old ? '#B3261E' : COLOR[o.status][1]),
          open: () => { if (o.legacy) { legacyView(o); return; } F.openNo = o.no; App().tab('orderOpen'); } };
      }),
      cartCount: JalCart.count(), go: JalScreen.go
    };
    scrList.render(vm);
  }

  const digits = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); return d; };

  /* заказ из Excel-учёта (пришёл из общей базы): без изделий, поэтому простая карточка поверх списка */
  function legacyView(o) {
    const old = document.getElementById('legacyBox'); if (old) old.remove();
    const box = document.createElement('div'), root = document.getElementById('ordersRoot'), esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    box.id = 'legacyBox'; box.className = 'scr ' + (root ? root.className.replace(/\bscr\b/, '').trim() : 'p0');
    const dd = x => x ? String(x).slice(0, 10).split('-').reverse().join('.') : '—', debt = Math.max(0, (+o.sum || 0) - (+o.paid || 0)), show = !!(App().st && App().st.show);
    const FLN = { work: 'в работе', sup: 'оплачен поставщику', sent: 'отправлен', got: 'получен', zp: 'ЗП отдана', closed: 'закрыто' };
    const fl = Object.keys(FLN).filter(k => o.fl && o.fl[k]).map(k => FLN[k]).join(', ') || '—';
    let ask = false;
    const draw = () => {
      box.innerHTML = '<div style="padding:16px;display:flex;flex-direction:column;gap:10px;min-height:100%;box-sizing:border-box;background:var(--bg);color:var(--ink);font-family:Inter,-apple-system,system-ui,sans-serif">' +
        '<div style="display:flex;align-items:center;gap:10px"><button data-x="close" style="border:0;background:transparent;font-size:26px;color:var(--ink)">‹</button><div style="font-size:19px;font-weight:800;flex:1">Заказ № ' + esc(o.no) + '</div><span style="font-size:12px;color:var(--m2)">из Excel-учёта</span></div>' +
        '<div style="background:var(--card);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:6px"><div style="font-size:17px;font-weight:700">' + esc(o.name || 'без имени') + '</div>' +
        (o.phone ? '<a href="tel:+' + esc(String(o.phone).replace(/\D/g, '').replace(/^8/, '7')) + '" style="color:var(--dk);font-size:15px;font-weight:600">' + esc(o.phone) + '</a>' : '') +
        '<div style="font-size:14px;color:var(--m1)">' + esc([o.cat, o.sup, o.src].filter(Boolean).join(' · ')) + '</div>' +
        '<div style="font-size:14px;color:var(--m1)">Дата ' + dd(o.created) + ' · изготовление ' + dd(o.due) + '</div></div>' +
        '<div style="background:var(--card);border-radius:16px;padding:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center"><div><div style="font-size:12px;color:var(--m2)">Сумма</div><b>' + fmt(o.sum || 0) + ' ₽</b></div><div><div style="font-size:12px;color:var(--m2)">Оплачено</div><b>' + fmt(o.paid || 0) + ' ₽</b></div><div><div style="font-size:12px;color:var(--m2)">Долг</div><b style="color:' + (debt ? '#B3261E' : 'inherit') + '">' + fmt(debt) + ' ₽</b></div>' +
        (show ? '<div style="grid-column:span 3;font-size:13px;color:var(--m1)">закуп ' + fmt(o.cost || 0) + ' · установка ' + fmt(o.instCost || 0) + ' · прибыль ' + fmt((o.sum || 0) - (o.cost || 0) - (o.instCost || 0)) + ' ₽</div>' : '') + '</div>' +
        '<div style="background:var(--card);border-radius:16px;padding:14px;font-size:14px;line-height:1.4"><b>Отметки:</b> ' + esc(fl) + (o.tk ? '<br><b>Примечание:</b> ' + esc(o.tk) : '') + '</div>' +
        '<div style="font-size:12px;color:var(--m2)">Заказ из Excel-учёта: изделий и документов здесь нет. Править его можно на компьютере.</div>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">' +
        (ask ? '<div style="font-weight:700;text-align:center">Удалить заказ № ' + esc(o.no) + '?</div><div style="display:flex;gap:8px"><button data-x="yes" style="flex:1;height:52px;border:0;border-radius:14px;background:#C0392B;color:#fff;font-size:15px;font-weight:700">Да, удалить</button><button data-x="no" style="flex:1;height:52px;border:0;border-radius:14px;background:#2E8B57;color:#fff;font-size:15px;font-weight:700">Нет</button></div>' :
          '<button data-x="arch" style="height:52px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--dk);font-size:14px;font-weight:700">' + (o.archived ? 'Вернуть из архива' : 'В архив') + '</button><button data-x="del" style="height:52px;border-radius:14px;border:1.5px solid #E7B7B7;background:var(--card);color:#B3261E;font-size:14px;font-weight:700">Удалить заказ</button>') + '</div></div>';
    };
    const close = () => { box.remove(); document.body.style.overflow = ''; renderList(); };
    box.setAttribute('style', 'position:fixed;inset:0;z-index:50;overflow:auto;background:var(--bg)');
    box.onclick = ev => { const x = ev.target.closest('[data-x]'); if (!x) return; const k = x.dataset.x;
      if (k === 'close') close(); else if (k === 'arch') { JalOrders.update(o.no, { archived: !o.archived }); close(); }
      else if (k === 'del') { ask = true; draw(); } else if (k === 'no') { ask = false; draw(); } else if (k === 'yes') { JalOrders.remove(o.no); close(); } };
    draw(); document.body.appendChild(box); document.body.style.overflow = 'hidden';
  }

  let delAsk = false;
  function renderOne() {
    const o = JalOrders.get(F.openNo); if (!o) { App().tab('ord'); return; }
    const today = new Date(), set = p => { JalOrders.update(o.no, p); render('orderOpen'); };
    const snap = o.cart, sum = total(o);
    let newSum = sum, changed = false;
    if (snap && snap.cart) { try { const n = JalCart.toOrder(snap); newSum = JalDocs.orderTotal(Object.assign({}, o, { items: n.items, priced: true, delivery: n.delivery, disc: n.disc })); changed = newSum !== sum; } catch (e) {} }
    const pieces = o.items.length, area = o.items.reduce((a, it) => a + (it.W ? it.W * it.H / 10000 : 0), 0);
    const d = new Date(today); d.setDate(d.getDate() + (o.rem || 0));
    const dPlus = new Date(o.created); dPlus.setDate(dPlus.getDate() + 14);
    const revOn = o.rev !== false;
    const lastName = String(o.name || '').split(' ')[0];
    const doc = (fn, label) => { JalOrders.addVersion(o.no, label, fmt(total(o)) + ' ₽', 'документ открыт на экране'); App().showDoc(fn, o, 'orderOpen'); };
    const vm = {
      no: o.no, client: o.name || 'без имени', sum: fmt(sum) + ' ₽',
      contactLine: [o.phone, o.addr].filter(Boolean).join(' · ') || 'контакты не указаны',
      summaryLine: nPos(o) + ' ' + plural(nPos(o), 'позиция', 'позиции', 'позиций') + ' · ' + pieces + ' ' + plural(pieces, 'изделие', 'изделия', 'изделий') + (area ? ' · ' + (Math.round(area * 10) / 10).toString().replace('.', ',') + ' м²' : '') + (+o.delivery > 0 ? ' · с установкой' : ' · самовывоз'),
      tel: 'tel:+' + digits(o.phone), wa: 'https://wa.me/' + digits(o.phone), tg: 'https://t.me/+' + digits(o.phone),
      route: 'https://yandex.ru/maps/?text=' + encodeURIComponent(o.addr || ''),
      statuses: JalOrders.STATUSES.map(n => { const on = n === o.status; return { name: n, pick: () => { JalOrders.setStatus(o.no, n); render('orderOpen'); },
        style: 'min-height: 52px; border: 0; background: transparent; padding: 0 4px; font-size: 14px; text-align: center; line-height: 1.2; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (on ? 800 : 600) + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)') }; }),
      rems: [['Нет', 0], ['2 дня', 2], ['3 дня', 3], ['7 дней', 7]].map(r => { const on = (o.rem || 0) === r[1]; return { name: r[0], pick: () => set({ rem: r[1] }),
        style: 'height: 44px; min-width: 0; padding: 0 4px; border-radius: 12px; font-size: 14px; font-weight: 600; color: var(--ink); background: ' + (on ? 'var(--sel)' : 'var(--chip)') + '; border: 1.5px solid ' + (on ? 'var(--ac)' : 'transparent') }; }),
      remOn: (o.rem || 0) > 0,
      remNote: (o.rem || 0) > 0 ? 'Напомню ' + dshort(d) + ' в 10:00: «Позвонить ' + (lastName || 'клиенту') + ' по КП, ответа нет». Если клиент ответит или статус сменится, напоминание уйдёт само.' : 'Без напоминания. Выберите срок, и приложение напомнит позвонить клиенту.',
      revOn, toggleRev: () => set({ rev: !revOn }),
      revRow: 'height: 52px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); font-size: 14px; font-weight: 700; text-align: left; width: 100%; box-sizing: border-box; background: ' + (revOn ? 'var(--sel)' : 'var(--chip)'),
      revBox: 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid var(--ac); background: ' + (revOn ? 'var(--ac)' : 'transparent'),
      revMark: revOn ? '✓' : '',
      revNote: revOn ? 'Заказ оформлен ' + dshort(new Date(o.created)) + ', напомню ' + dshort(dPlus) + ' в 10:00: отправить клиенту запрос отзыва с QR-кодами Яндекса и Авито.' : 'Без напоминания об отзыве.',
      hasDelta: changed, newSum: fmt(newSum) + ' ₽', deltaText: 'на ' + fmt(Math.abs(newSum - sum)) + ' ₽ ' + (newSum > sum ? 'больше' : 'меньше'),
      history: (o.history || []).map(h => ({ title: 'v' + h.v + ' · ' + h.title, sum: h.sum, sub: dshort(new Date(h.at)) + ', ' + new Date(h.at).toTimeString().slice(0, 5) + (h.sub ? ' · ' + h.sub : '') })),
      posList: (snap && snap.cart ? JalCart.toOrder(snap).items : o.items).filter((x, i, a) => !x.W || true).reduce((acc, it) => {
        const key = JSON.stringify([it.title, it.sup, it.mat, it.lam, it.W, it.H, it.price, it.o && it.o.color, it.o && it.o.fix]);
        const f = acc.find(x => x.key === key); if (f) f.n++; else acc.push({ key, it, n: 1 }); return acc; }, []).map((x, i) => ({
        t: (i + 1) + '. ' + (x.it.title || JalDocs.itemName(x.it) + ', ' + Math.round(x.it.W * 10) + '×' + Math.round(x.it.H * 10)) + (x.n > 1 ? ' × ' + x.n : ''), sum: fmt(x.it.price * x.n) + ' ₽' })),
      act: {
        recalc: () => { if (!changed) { alert('Цены не изменились'); return; } const n = JalCart.toOrder(snap);
          JalOrders.update(o.no, { items: n.items, delivery: n.delivery, disc: n.disc, priced: true });
          JalOrders.addVersion(o.no, 'Пересчёт по новым ценам', fmt(newSum) + ' ₽', 'позиции пересчитаны'); render('orderOpen'); },
        kp: () => doc('kpHtml', 'КП'),
        self: () => { alert('Word добавим позже. Сейчас откроется КП: в окне печати выбери «Сохранить как PDF».'); doc('kpHtml', 'КП (себе)'); },
        dup: () => { const c0 = Object.assign({}, o, { status: 'Черновик', created: new Date().toISOString(), history: [], archived: false }); delete c0.no; delete c0.sent; delete c0.uid; delete c0.upd; delete c0.del;
          const c = JalOrders.create(c0, o.items); F.openNo = c.no; render('orderOpen'); },
        archLabel: o.archived ? 'Вернуть из архива' : 'В архив',
        delAsk: () => { delAsk = true; render('orderOpen'); }, delNo: () => { delAsk = false; render('orderOpen'); },
        delYes: () => { delAsk = false; JalOrders.remove(o.no); App().tab('ord'); },
        arch: () => { JalOrders.update(o.no, { archived: !o.archived }); App().tab('ord'); },
        cal: () => { const ds = new Date(d); ds.setHours(10, 0, 0, 0); const e = new Date(ds.getTime() + 30 * 60000);
          const f = x => x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0') + 'T' + String(x.getHours()).padStart(2, '0') + String(x.getMinutes()).padStart(2, '0') + '00';
          window.open('https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Позвонить ' + (o.name || 'клиенту') + ' по КП') + '&dates=' + f(ds) + '/' + f(e) + '&details=' + encodeURIComponent('Заказ № ' + o.no), '_blank'); },
        txt: () => { const tx = 'Здравствуйте! Напоминаю про коммерческое предложение по жалюзи (заказ № ' + o.no + ') на ' + fmt(sum) + ' ₽. Подскажите, удобно ли сейчас обсудить?';
          try { navigator.clipboard.writeText(tx); alert('Текст скопирован'); } catch (e) { prompt('Скопируй текст', tx); } }
      },
      delOn: delAsk, delOff: !delAsk, delText: 'Удалить заказ № ' + o.no + '?',
      back: () => { delAsk = false; App().tab('ord'); },
      editOrder: () => { if (!snap || !snap.cart) { alert('Это старый заказ без сохранённых параметров, открыть для правки нельзя.'); return; } JalCart.restore(snap, o.no); App().tab('cart'); },
      go: JalScreen.go
    };
    scrOne.render(vm);
  }

  function render(which) { if (which === 'orderOpen') renderOne(); else renderList(); }
  window.JalOrdersScreen = { render, F };
})();
