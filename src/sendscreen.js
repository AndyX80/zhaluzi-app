/* Экран «Отправка клиенту» по макету Send.dc.html. Текст уходит в выбранный канал. */
(function () {
  'use strict';
  const scr = JalScreen.make('sendRoot', 'tpl_sendRoot');
  const App = () => window.JalApp;
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const form = (x, f) => { const a = x % 100, b = x % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2]; };
  const S = { kinds: [], cat: true, ch: 'wa', edited: null, vars: false, qrSum: '5 000' };
  const KINDS = [['catalog', 'Каталог', []], ['kp', 'КП', ['КП № {no}.pdf']], ['blank', 'Замерник', ['Замерник № {no}.pdf']], ['dogovor', 'Договор', ['Договор № {no}.pdf']], ['remind', 'Напоминание о КП', []], ['review', 'Запрос отзыва', []], ['qr', 'QR на оплату', []]];
  const CAT = 'Каталог деревянных жалюзи.pdf';
  const CH = [
    { key: 'mail', name: 'Почта', ic: '@', c: '#8A4B00' }, { key: 'wa', name: 'WhatsApp', ic: 'W', c: '#1E8E3E' }, { key: 'tg', name: 'Telegram', ic: 'T', c: '#1C7FC0' },
    { key: 'max', name: 'MAX', ic: 'M', c: '#5B3F8C' }, { key: 'any', name: 'Другое', ic: '⋯', c: 'var(--dk)' }];
  const digits = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); return d; };

  function data(o) {
    if (!o) return { no: '—', name: 'Иван', items: '3 изделия', sum: '56 500 ₽', term: '12 календарных дней', until: '21 октября', pre: '56 500 ₽ (100%)', phone: '', email: '' };
    const w = String(o.name || '').trim().split(/\s+/), name = w.length >= 2 ? w[1] : (w[0] || 'клиент'), n = o.items.length, sum = JalDocs.orderTotal(o);
    const u = new Date(new Date(o.created).getTime() + 14 * 86400000), term = +o.term || 12;
    const pre = o.preU === '₽' ? +o.pre : Math.round(sum * (+o.pre || 100) / 100);
    return { no: o.no, name, items: n + ' ' + form(n, ['изделие', 'изделия', 'изделий']), sum: fmt(sum) + ' ₽', term: term + ' ' + form(term, ['календарный день', 'календарных дня', 'календарных дней']),
      until: u.getDate() + ' ' + MON[u.getMonth()], pre: fmt(pre) + ' ₽ (' + (sum ? Math.round(pre / sum * 100) : 100) + '%)', phone: o.phone, email: o.email };
  }

  function render() {
    const A = App(), o = A.st.sendNo ? JalOrders.get(A.st.sendNo) : null, D = data(o), s = S;
    const set = p => { Object.assign(S, p); render(); };
    const V = { 'имя': D.name, 'изделия': D.items, 'сумма': D.sum, 'срок': D.term, 'до': D.until, 'предоплата': D.pre, 'номер': D.no, 'qrсумма': s.qrSum || '5 000',
      'каталог': s.cat ? '\n\n' + JalDrive.text('kp_katalog') : '' };
    const T = {}; ['kp', 'catalog', 'blank', 'dogovor', 'review', 'qr', 'remind'].forEach(k => { T[k] = JalDrive.fill(JalDrive.text(k), V); });
    const sel = KINDS.filter(k => s.kinds.indexOf(k[0]) >= 0), has = k => s.kinds.indexOf(k) >= 0;
    const key = s.kinds.join('+') + (has('kp') && s.cat ? ':cat' : '');
    const text = s.edited && s.edited.key === key ? s.edited.v : sel.map((k, i) => (i ? T[k[0]].replace(/^Добрый день, [^!]*!\s*/, '') : T[k[0]])).join('\n\n'), none = !sel.length, empty = !none && !text.trim();
    const withCat = has('catalog') || (has('kp') && s.cat), qrBlank = lsGet('jal_qr_blank') === '1';
    const extra = [].concat(has('review') ? ['QR отзыв Яндекс.png', 'QR отзыв Авито.png'] : [], has('qr') ? ['QR оплаты ' + (s.qrSum || '5 000') + ' ₽.png'] : [], has('blank') && qrBlank ? ['QR оплаты предоплаты.png'] : []);
    const fnOf = k => k === 'kp' ? (s.vars && o && o.vars && o.vars.length ? 'kpVarHtml' : 'kpHtml') : k === 'blank' ? 'zamernikHtml' : 'dogovorHtml';
    const qrs = [].concat(has('review') ? [['jal_qr_ya', 'QR отзыв Яндекс.png'], ['jal_qr_av', 'QR отзыв Авито.png']] : [], has('qr') ? [['jal_qr_pay', 'QR оплаты ' + (s.qrSum || '5 000') + ' ₽.png']] : [], has('blank') && qrBlank ? [['jal_qr_pay', 'QR оплаты предоплаты.png']] : []);
    const pdfs = o ? ['kp', 'blank', 'dogovor'].filter(has).map(k => fnOf(k)) : [];
    const files = pdfs.map(fn => JalExport.baseName(fn, o) + '.pdf').concat(qrs.filter(q => lsGet(q[0])).map(q => q[1]));
    const pkey = pdfs.join(',') + '|' + qrs.map(q => q[1]).join(',') + '|' + (o ? o.no + ':' + JSON.stringify(o).length : '');
    if (!files.length) S.prep = null;
    else if (!S.prep || S.prep.key !== pkey) {
      const P = S.prep = { key: pkey, state: 'busy', files: [] };
      (async () => {
        try {
          for (const fn of pdfs) P.files.push(await JalExport.pdf(fn, o));
          qrs.forEach(q => { const f = JalExport.dataFile(lsGet(q[0]), q[1]); if (f) P.files.push(f); });
          P.state = 'ready';
        } catch (e) { P.state = 'err'; P.err = e.message || String(e); }
        if (S.prep === P) render();
      })();
    }
    const prep = S.prep && S.prep.key === pkey ? S.prep : null;
    const ch = CH.find(c => c.key === s.ch), ok = !(empty || none);
    const toggle = (on, plain) => 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); width: 100%; box-sizing: border-box; background: ' + (on ? 'var(--sel)' : plain) + '; font-weight: ' + (on ? 700 : 400);
    const box = (on, off) => 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid ' + (on ? 'var(--ac)' : off) + '; background: ' + (on ? 'var(--ac)' : 'transparent');
    const send = async () => {
      if (!ok) return;
      const enc = encodeURIComponent, subj = 'Жалюзи-СПБ' + (o ? ', заказ № ' + o.no : '');
      let done = false;
      if (prep && prep.state === 'err') alert('Файлы не собрались: ' + prep.err + '. Уйдёт только текст.');
      if (prep && prep.state === 'busy') { alert('Файлы ещё готовятся, подожди несколько секунд и нажми «Отправить» снова.'); return; }
      if (prep && prep.state === 'ready' && prep.files.length) {
        done = await JalExport.share(prep.files, text, subj);
        if (!done) { prep.files.forEach((f, i) => setTimeout(() => JalExport.save(f), i * 600)); alert('Телефон не умеет прикладывать файлы сам. Файлы скачаны, приложи их из «Загрузок» в открывшемся чате.'); }
      }
      if (!done) {
        if (s.ch === 'mail') location.href = 'mailto:' + (D.email || '') + '?subject=' + enc(subj) + '&body=' + enc(text);
        else if (s.ch === 'wa') window.open('https://wa.me/' + digits(D.phone) + '?text=' + enc(text), '_blank');
        else if (s.ch === 'tg') window.open('https://t.me/share/url?url=%20&text=' + enc(text), '_blank');
        else if (navigator.share) navigator.share({ title: subj, text }).catch(() => {});
        else { try { navigator.clipboard.writeText(text); alert('Текст скопирован, вставь его в нужное приложение'); } catch (e) { prompt('Скопируй текст', text); } }
      }
      if (o && has('kp') && o.status === 'Черновик') { JalOrders.setStatus(o.no, 'КП отправлено'); JalOrders.addVersion(o.no, 'КП отправлено (' + ch.name + ')', D.sum); }
    };
    scr.render({
      go: JalScreen.go, back: () => A.tab(A.st.sendBack || 'calc'),
      kinds: KINDS.map((k, i) => ({ name: k[1], pick: () => set({ kinds: has(k[0]) ? s.kinds.filter(x => x !== k[0]) : s.kinds.concat([k[0]]) }),
        style: 'grid-column: span ' + (i < 3 ? 2 : 3) + '; min-height: 48px; padding: 0 8px; border-radius: 14px; font-size: 14px; text-align: center; border: 1.5px solid ' + (has(k[0]) ? 'var(--dk)' : 'var(--line)') + '; background: ' + (has(k[0]) ? 'var(--sel)' : 'var(--card)') + '; color: var(--ink); font-weight: ' + (has(k[0]) ? 700 : 500) })),
      showQr: has('qr'), qrSum: s.qrSum, setQrSum: e => { S.qrSum = e.target.value; render(); },
      showCatSwitch: has('kp'), catOn: s.cat, toggleCat: () => set({ cat: !s.cat }), catRow: toggle(s.cat, 'var(--card)'), catBox: box(s.cat, 'var(--chk)'), catMark: s.cat ? '✓' : '',
      varOn: s.vars, toggleVar: () => { if (!s.vars && !(o && o.vars && o.vars.length)) alert('У этого заказа нет трёх вариантов. Собери их в корзине кнопкой «КП: три варианта», сохрани заказ и вернись сюда.'); else set({ vars: !s.vars }); },
      varRow: toggle(s.vars, 'var(--chip)'), varBox: box(s.vars, 'var(--ac)'), varMark: s.vars ? '✓' : '',
      files: files.length ? files.map(n => ({ name: n, ext: /\.png$/.test(n) ? 'QR' : 'PDF', size: prep ? (prep.state === 'busy' ? 'готовлю…' : prep.state === 'err' ? 'ошибка' : 'готов') : '' })) : [{ name: 'Без вложений, только текст', size: '' }], hasKind: !none,
      channels: CH.map(c => ({ name: c.name, ic: c.ic, pick: () => set({ ch: c.key }),
        style: 'min-height: 72px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 13px; color: var(--ink); border: 1.5px solid ' + (s.ch === c.key ? 'var(--ac)' : '#E3D5C3') + '; background: ' + (s.ch === c.key ? 'var(--sel)' : '#FFFFFF') + '; font-weight: ' + (s.ch === c.key ? 800 : 500),
        dot: 'width: 30px; height: 30px; border-radius: 15px; background: ' + c.c + '; color: #FFFFFF; font-size: 15px; font-weight: 800; display: flex; align-items: center; justify-content: center' })),
      text, empty, setText: e => { S.edited = { key, v: e.target.value }; }, resetText: () => set({ edited: null }),
      taStyle: 'width: 100%; box-sizing: border-box; min-height: 330px; font-family: inherit; border: 1.5px solid ' + (empty ? '#B3261E' : 'var(--line)') + '; border-radius: 12px; padding: 12px; font-size: 15px; line-height: 1.45; color: var(--ink); resize: vertical',
      sendLabel: prep && prep.state === 'busy' ? 'Готовлю файлы…' : (files.length ? 'Отправить с файлами' : (s.ch === 'any' ? 'Поделиться' : 'Отправить')), chName: ch.name, doSend: send,
      sendStyle: 'height: 48px; border: 0; border-radius: 24px; padding: 0 22px; font-size: 16px; font-weight: 800; color: #FFFFFF; background: ' + (ok ? 'var(--ac)' : 'var(--m3)') });
  }
  window.JalSendScreen = { render, S };
})();
