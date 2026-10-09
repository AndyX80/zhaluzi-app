/* Документы файлами: PDF (картинка страниц по макету) и Word (редактируемый .docx). Библиотеки лежат в vendor/ и грузятся при первом использовании. */
(function () {
  'use strict';
  const V = '?v=50', loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src + V; s.onload = ok; s.onerror = () => { delete loaded[src]; bad(new Error('Не загрузилась библиотека ' + src + '. Нужен интернет при первом разе.')); }; document.head.appendChild(s); }));
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const sigs = () => ({ sign: lsGet('jal_sign'), stamp: lsGet('jal_stamp') });
  const NAMES = { kpHtml: 'КП № {no}', kpVarHtml: 'КП № {no} (3 варианта)', zamernikHtml: 'Замерник № {no}', dogovorHtml: 'Договор № {no}' };
  const baseName = (fn, o) => (NAMES[fn] || 'Документ').replace('{no}', String(o.no || '').replace(/[\\/:*?"<>|]/g, '-'));

  async function pdf(fn, order) {
    await Promise.all([load('vendor/html2canvas.min.js'), load('vendor/jspdf.umd.min.js')]);
    const pg = await JalDocScreens.pagesOff(fn, order, sigs());
    try {
      const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4', compress: true });
      for (let i = 0; i < pg.els.length; i++) {
        const c = await window.html2canvas(pg.els[i], { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false });
        if (i) doc.addPage();
        doc.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 595.28, 841.89);
      }
      return new File([doc.output('blob')], baseName(fn, order) + '.pdf', { type: 'application/pdf' });
    } finally { pg.done(); }
  }

  /* ---------- Word ---------- */
  const imgInfo = src => new Promise(ok => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => ok(null); im.src = src; });
  async function pic(src, width) {
    if (!src) return null; const inf = await imgInfo(src); if (!inf) return null;
    const buf = await (await fetch(src)).arrayBuffer(), m = /^data:image\/(\w+)/.exec(src), t = m ? m[1].replace('jpeg', 'jpg') : 'png';
    return new window.docx.ImageRun({ data: buf, type: t === 'jpg' ? 'jpg' : 'png', transformation: { width, height: Math.round(width * inf.h / inf.w) } });
  }
  async function docx(fn, order) {
    await load('vendor/docx.umd.js');
    const X = window.docx, vm = JalDocScreens.vms[fn](order, sigs()), sg = sigs();
    const T = (t, o) => new X.TextRun(Object.assign({ text: String(t == null ? '' : t), font: 'Arial', size: 20 }, o || {}));
    const P = (t, o, r) => new X.Paragraph(Object.assign({ children: Array.isArray(t) ? t : [T(t, r)], spacing: { after: 80 } }, o || {}));
    const cell = (t, w, o) => new X.TableCell({ width: { size: w, type: X.WidthType.PERCENTAGE }, margins: { top: 50, bottom: 50, left: 80, right: 80 }, shading: o && o.fill ? { type: X.ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
      children: String(t == null ? '' : t).split('\n').map(x => new X.Paragraph({ alignment: o && o.right ? X.AlignmentType.RIGHT : (o && o.center ? X.AlignmentType.CENTER : X.AlignmentType.LEFT), children: [T(x, { bold: !!(o && o.bold), size: (o && o.size) || 18, color: o && o.color })] })) });
    const table = (rows, widths, head) => new X.Table({ width: { size: 100, type: X.WidthType.PERCENTAGE }, rows: rows.map((r, i) => new X.TableRow({ tableHeader: !!head && i === 0, children: r.map((c, k) => cell(c, widths[k], (head && i === 0) ? { bold: true, fill: 'EEEEEE' } : { right: k >= r.length - 2 && widths.length > 3 && i > 0 })) })) });
    const logo = await pic('assets/logo.png', 130), sign = await pic(sg.sign, 110), stamp = await pic(sg.stamp, 100);
    const ch = [];
    const sigRow = () => { const a = [T('С уважением, Хорошавин Андрей   ')]; if (sign) a.push(sign); if (stamp) a.push(stamp); return P(a, { spacing: { before: 200 } }); };
    const rows = (pgs) => pgs.reduce((a, p) => a.concat(p.rows || []), []);
    if (fn === 'kpHtml' || fn === 'kpVarHtml') {
      const c = vm.c; if (logo) ch.push(P([logo]));
      ch.push(P(c.phone + '  ' + c.address + '  ' + c.site + '  ' + c.email, null, { size: 16 }));
      ch.push(P(fn === 'kpVarHtml' ? 'Коммерческое предложение: три варианта' : 'Коммерческое предложение', { alignment: X.AlignmentType.CENTER }, { bold: true, size: 32, color: 'F1780F' }));
      ch.push(P(vm.date, { alignment: X.AlignmentType.RIGHT }, { italics: true, size: 16 })); ch.push(P(vm.intro));
      if (fn === 'kpVarHtml') {
        ch.push(table([['№', 'Изделие', 'Шт'].concat(vm.vars.map(v => v.name))].concat(rows(vm.pages).map(r => [r.n, r.name + (r.spec ? '\n' + r.spec : ''), r.qty].concat(r.sums.map(s => s.v)))), [5, 40, 7, 16, 16, 16], true));
        ch.push(P(''));
        ch.push(table([vm.vars.map(v => v.name + '\n' + v.about + '\nИТОГО ' + v.total + (v.tag.trim() ? '\n' + v.tag : ''))], [33, 33, 34]));
      } else {
        ch.push(table([['№', 'Наименование', 'Кол-во', 'Цена за шт', 'Сумма']].concat(rows(vm.pages).map(r => [r.n, r.name + (r.spec ? '\n' + r.spec : ''), r.qty, r.price, r.sum])), [6, 44, 10, 20, 20], true));
        ch.push(P('ИТОГО: ' + vm.total, { alignment: X.AlignmentType.RIGHT, spacing: { before: 120 } }, { bold: true, size: 28 }));
      }
      ch.push(P('Предложение действует до ' + vm.valid, null, { bold: true, color: 'F1780F' }));
      vm.conds.forEach(b => { ch.push(P(b.title, { spacing: { before: 100, after: 20 } }, { bold: true, color: 'F1780F' })); b.text.split('\n').forEach(x => ch.push(P(x))); });
      ch.push(P('Почему выбирают Жалюзи-СПБ', { spacing: { before: 120 } }, { bold: true, color: 'F1780F' })); vm.utp.forEach(u => ch.push(P('• ' + u)));
      ch.push(P('Готовы обсудить детали или ответить на вопросы: ' + vm.c.phone + ' или ' + vm.c.site, { spacing: { before: 120 } }, { bold: true }));
      ch.push(P('Надеемся на взаимовыгодное сотрудничество!', null, { bold: true })); ch.push(sigRow()); ch.push(P(vm.c.req, null, { size: 12, color: '777777' }));
    } else if (fn === 'zamernikHtml') {
      if (logo) ch.push(P([logo]));
      ch.push(P('ЗАКАЗ № ' + vm.num, null, { bold: true, size: 28 })); ch.push(P('Замерил: ' + vm.measurer + '    Дата: ' + vm.date));
      vm.fields.forEach(f => ch.push(P([T(f.k + ' ', { bold: true }), T(f.v)])));
      ch.push(P('Примечания:', { spacing: { before: 100 } }, { bold: true })); String(vm.notes || '').split('\n').forEach(x => ch.push(P(x)));
      ch.push(P([T('Установка: ', { bold: true }), T(vm.instYes + '   ' + vm.instNo)]));
      vm.mount.forEach(m => ch.push(P([T(m.k + ' ', { bold: true }), T(m.v)])));
      ch.push(P('Заполняется Потребителем (представителем Потребителя)', { spacing: { before: 100 } }, { bold: true }));
      ch.push(P('Есть ли «Часы тишины» в доме? ' + vm.quietYn)); ch.push(P('Время: с ' + vm.quietFrom + ' до ' + vm.quietTo)); ch.push(P('Стадия ремонта: ' + vm.stageText));
      ch.push(P('Эскизы изделий смотри в PDF-версии замерника.', null, { italics: true, size: 16, color: '777777' }));
      ch.push(P('ВНИМАНИЕ!!! ПРИ ИСПОЛНЕНИИ ЗАМЕРОВ ПРИСУТСТВИЕ ЗАКАЗЧИКА ОБЯЗАТЕЛЬНО!!! Жалюзи, изготовленные в соответствии с заказом, возврату не подлежат!*', { spacing: { before: 120 } }, { bold: true, size: 18 }));
      ch.push(table([['Наименование продукции', 'Кол-во', 'Стоимость', 'Общая стоимость']].concat(rows(vm.pages).map(r => [r.name, r.qty, r.price, r.sum])), [52, 12, 18, 18], true));
      ch.push(P('ИТОГО к оплате: ' + vm.total, { alignment: X.AlignmentType.RIGHT, spacing: { before: 100 } }, { bold: true }));
      ch.push(P('Оплата: ' + vm.payText + '. Предоплата: ' + vm.prepayText + '. Оставшаяся сумма: ' + vm.rest));
    } else if (fn === 'dogovorHtml') {
      ch.push(P(vm.title + ' № ' + vm.num, { alignment: X.AlignmentType.CENTER }, { bold: true, size: 26 }));
      ch.push(P('г. Санкт-Петербург    ' + vm.dateText));
      ch.push(P('Индивидуальный предприниматель Хорошавин Андрей Владимирович, именуемый в дальнейшем «' + vm.role + '», с одной стороны, и ' + vm.buyer + ', именуемый в дальнейшем «Покупатель», с другой стороны, вместе именуемые «Стороны», заключили настоящий Договор о нижеследующем:', { alignment: X.AlignmentType.JUSTIFIED }));
      const sec = a => a.forEach(b => { ch.push(P(b.h, { spacing: { before: 120 } }, { bold: true })); b.t.forEach(t => ch.push(P(t, { alignment: X.AlignmentType.JUSTIFIED }))); });
      sec(vm.p1);
      ch.push(table([['№', 'Наименование', 'Кол-во', 'Цена', 'Сумма']].concat(vm.rows.map(r => [r.n, r.name, r.qty + ' шт.', r.price, r.sum])), [6, 44, 10, 20, 20], true));
      ch.push(P('Итого: ' + vm.totalRub, { alignment: X.AlignmentType.RIGHT, spacing: { before: 80 } }, { bold: true }));
      sec(vm.p2); sec(vm.p3);
      ch.push(P('9. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН', { spacing: { before: 160 } }, { bold: true }));
      const col = (title, lines, who) => [title, ...lines, '', '_______________ / ' + who + ' /'].join('\n');
      ch.push(table([[col(vm.role, vm.seller, 'Хорошавин А.В.'), col('Покупатель', vm.buyerReq, vm.buyerShort)]], [50, 50]));
      if (sign || stamp) { const a = [T('Подпись и печать:   ')]; if (sign) a.push(sign); if (stamp) a.push(stamp); ch.push(P(a, { spacing: { before: 120 } })); }
      ch.push(P('Приложение № 1: замерный лист (бланк заказа) № ' + vm.num + '. Скачай его отдельно (кнопка «Замерник» в заказе).', null, { italics: true, size: 16 }));
    }
    const d = new X.Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children: ch }] });
    return new File([await X.Packer.toBlob(d)], baseName(fn, order) + '.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function save(file) {
    const a = document.createElement('a'), u = URL.createObjectURL(file); a.href = u; a.download = file.name; document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(u); }, 4000);
  }
  /* поделиться файлами (меню телефона: WhatsApp, Telegram, Почта…). false, если телефон не умеет */
  async function share(files, text, title) {
    if (!navigator.canShare || !navigator.canShare({ files })) return false;
    try { await navigator.share({ files, text, title }); return true; } catch (e) { if (e && e.name === 'AbortError') return true; return false; }
  }
  const dataFile = (src, name) => { const m = /^data:([^;]+);base64,(.*)$/.exec(src || ''); if (!m) return null; const b = atob(m[2]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new File([u], name, { type: m[1] }); };
  window.JalExport = { pdf, docx, save, share, dataFile, baseName };
})();
