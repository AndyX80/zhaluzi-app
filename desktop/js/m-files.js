/* Замерники и файлы заказа: фото и сканы, PDF. Хранятся на Google Диске (через Apps Script), копия кэшируется на устройстве (IndexedDB).
   Фото можно обрезать по листу с выпрямлением перспективы и сжать, а можно загрузить как есть. */
(function () {
  const A = App, e = A.esc;
  const DAY = () => new Date().toISOString().slice(0, 10);

  /* ---------- кэш на устройстве ---------- */
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('jal_files', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async k => { try { const db = await idb(); return await new Promise(res => { const q = db.transaction('f').objectStore('f').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (x) { return null; } };
  const idbPut = async (k, v) => { try { const db = await idb(); await new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (x) {} };
  const idbDel = async k => { try { const db = await idb(); await new Promise(res => { const t = db.transaction('f', 'readwrite'); t.objectStore('f').delete(k); t.oncomplete = res; t.onerror = res; }); } catch (x) {} };

  /* ---------- Диск ---------- */
  const base = () => { try { return localStorage.getItem('jal_prices_url') || ''; } catch (x) { return ''; } };
  const keyOf = () => { const m = base().match(/[?&]key=([^&]+)/); return m ? decodeURIComponent(m[1]) : ''; };
  const post = async body => {
    if (!base()) throw new Error('Нет ссылки на скрипт (Настройки → Данные)');
    const r = await fetch(base().split('?')[0], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key: keyOf() }, body)) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error === 'bad key' ? 'Неверный пароль в ссылке' : (j.error || 'Скрипт не ответил (обнови скрипт)')); return j;
  };
  const toB64 = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
  const fromB64 = (b64, mime) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); };

  /* ---------- список файлов заказа ---------- */
  const recOf = uid => DB.raw().find(x => x.uid === uid);
  const filesOf = uid => ((recOf(uid) || {}).files || []);
  const setFiles = (uid, fn) => { const r = recOf(uid); if (!r) return; DB.patchRec(uid, { files: fn((r.files || []).slice()) }); };
  const patchFile = (uid, id, p) => setFiles(uid, l => l.map(f => f.id === id ? Object.assign({}, f, p) : f));
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(n / 1024)) + ' КБ';
  const uid0 = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  async function push(uid, id) {
    const f = filesOf(uid).find(x => x.id === id); if (!f || f.fid) return;
    const blob = await idbGet(id); if (!blob) return;
    try {
      const j = await post({ fput: { order: uid, name: f.name + (/\.\w{2,4}$/.test(f.name) ? '' : f.ext || ''), mime: f.mime, data: await toB64(blob) } });
      patchFile(uid, id, { fid: j.fid, pend: false });
    } catch (x) { patchFile(uid, id, { pend: true, err: String(x.message || x) }); A.toast('Файл сохранён здесь, но не ушёл на Диск: ' + (x.message || x)); }
    A.render();
  }
  async function add(uid, blob, name, mime, th) {
    const id = uid0(), ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
    await idbPut(id, blob);
    setFiles(uid, l => l.concat([{ id, name, ext, mime, size: blob.size, d: DAY(), th: th || '', fid: '', pend: true }]));
    A.render(); push(uid, id);
  }

  /* ---------- редактор: обрезка по листу, поворот, сжатие ---------- */
  const loadImg = blob => new Promise((res, rej) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('не открылась картинка')); }; im.src = u; });
  /* гомография: квадрат (0,0)-(w,h) → четырёхугольник p[0..3] (tl,tr,br,bl); решаем 8×8 */
  function homog(w, h, p) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A8 = [], b = [];
    for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = p[i]; A8.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A8.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
    const n = 8; for (let i = 0; i < n; i++) A8[i].push(b[i]);
    for (let c = 0; c < n; c++) { let m = c; for (let r = c + 1; r < n; r++) if (Math.abs(A8[r][c]) > Math.abs(A8[m][c])) m = r; [A8[c], A8[m]] = [A8[m], A8[c]]; const d = A8[c][c] || 1e-9; for (let k = c; k <= n; k++) A8[c][k] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = A8[r][c]; for (let k = c; k <= n; k++) A8[r][k] -= f * A8[c][k]; } }
    return A8.map(r => r[n]);
  }
  function warp(srcCv, pts, maxSide, bw) {
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let w = Math.max(d(pts[0], pts[1]), d(pts[3], pts[2])), h = Math.max(d(pts[0], pts[3]), d(pts[1], pts[2]));
    const k = Math.min(1, maxSide / Math.max(w, h)); w = Math.max(10, Math.round(w * k)); h = Math.max(10, Math.round(h * k));
    const H = homog(w, h, pts), sc = srcCv.getContext('2d'), sw = srcCv.width, sh = srcCv.height, sd = sc.getImageData(0, 0, sw, sh).data;
    const out = document.createElement('canvas'); out.width = w; out.height = h; const oc = out.getContext('2d'), od = oc.createImageData(w, h), o = od.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const z = H[6] * x + H[7] * y + 1, u = (H[0] * x + H[1] * y + H[2]) / z, v = (H[3] * x + H[4] * y + H[5]) / z, i = (y * w + x) * 4;
      if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) { o[i] = o[i + 1] = o[i + 2] = 255; o[i + 3] = 255; continue; }
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, a = (y0 * sw + x0) * 4, b2 = a + 4, c = a + sw * 4, dd = c + 4;
      for (let t = 0; t < 3; t++) o[i + t] = (sd[a + t] * (1 - fx) + sd[b2 + t] * fx) * (1 - fy) + (sd[c + t] * (1 - fx) + sd[dd + t] * fx) * fy;
      o[i + 3] = 255;
    }
    if (bw) { /* чёрно-белый скан: серый + растяжение уровней */
      const hist = new Uint32Array(256); for (let i = 0; i < o.length; i += 4) { const g = (o[i] * 0.3 + o[i + 1] * 0.59 + o[i + 2] * 0.11) | 0; o[i] = o[i + 1] = o[i + 2] = g; hist[g]++; }
      const tot = w * h; let acc = 0, lo = 0, hi = 255; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > tot * 0.02) { lo = i; break; } } acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > tot * 0.25) { hi = i; break; } }
      const span = Math.max(30, hi - lo); for (let i = 0; i < o.length; i += 4) { const g = Math.max(0, Math.min(255, (o[i] - lo) * 255 / span)); o[i] = o[i + 1] = o[i + 2] = g; }
    }
    oc.putImageData(od, 0, 0); return out;
  }
  const toBlob = (cv, q) => new Promise(res => cv.toBlob(res, 'image/jpeg', q));
  const thumbOf = cv => { const s = 110 / Math.max(cv.width, cv.height), t = document.createElement('canvas'); t.width = Math.max(1, Math.round(cv.width * s)); t.height = Math.max(1, Math.round(cv.height * s)); t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', 0.5); };

  let Q = [], ED = null; /* очередь выбранных файлов и текущий редактор */
  function nextEditor() {
    if (ED || !Q.length) return; const job = Q.shift();
    loadImg(job.file).then(im => {
      const MAXSRC = 3200, k = Math.min(1, MAXSRC / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      ED = { uid: job.uid, file: job.file, name: job.file.name.replace(/\.\w+$/, '') || 'Замерник', src: cv, pts: null, bw: false, side: 1800, busy: false };
      resetPts(); drawEd();
    }).catch(x => { A.toast('Не открылось ' + job.file.name + ': ' + x.message); nextEditor(); });
  }
  const resetPts = () => { const w = ED.src.width, h = ED.src.height, mx = w * 0.04, my = h * 0.04; ED.pts = [[mx, my], [w - mx, my], [w - mx, h - my], [mx, h - my]]; };
  function rotate(dir) {
    const s = ED.src, c = document.createElement('canvas'); c.width = s.height; c.height = s.width; const x = c.getContext('2d'); x.translate(dir > 0 ? c.width : 0, dir > 0 ? 0 : c.height); x.rotate(dir * Math.PI / 2); x.drawImage(s, 0, 0); ED.src = c; resetPts(); drawEd();
  }
  function drawEd() {
    let ov = document.getElementById('fled');
    if (!ED) { if (ov) ov.remove(); nextEditor(); return; }
    if (!ov) { ov = document.createElement('div'); ov.id = 'fled'; ov.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(10,12,20,.78);display:flex;align-items:center;justify-content:center;padding:16px'; document.body.appendChild(ov); }
    ov.innerHTML = '<div class="card" style="max-width:1100px;width:100%;max-height:96vh;overflow:auto;display:flex;flex-direction:column;gap:10px"><div class="row wrap" style="gap:8px"><b>Обрезка по листу</b><span class="mut">Потяни за углы так, чтобы рамка легла на края листа' + (Q.length ? ' · в очереди ещё ' + Q.length : '') + '</span></div>' +
      '<div style="position:relative;align-self:center;line-height:0"><canvas id="fledcv" style="max-width:100%;max-height:62vh;touch-action:none;border:1px solid var(--fb);border-radius:8px"></canvas></div>' +
      '<div class="row wrap" style="gap:8px;align-items:center"><button class="btn sm" data-a="fedrot" data-d="-1">↺ Повернуть</button><button class="btn sm" data-a="fedrot" data-d="1">↻ Повернуть</button><button class="btn sm" data-a="fedreset">Рамка по краям</button>' +
      '<label class="row" style="gap:6px"><input type="checkbox" data-c="fedbw"' + (ED.bw ? ' checked' : '') + '> Чёрно-белый скан</label>' +
      '<label class="row" style="gap:6px">Размер <select class="in" style="height:34px;width:150px" data-c="fedside">' + [[1200, 'Мелкий (1200 px)'], [1800, 'Обычный (1800 px)'], [2600, 'Крупный (2600 px)']].map(x => '<option value="' + x[0] + '"' + (ED.side === x[0] ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select></label>' +
      '<input class="in" style="flex:1;min-width:200px;height:34px" placeholder="Название файла" value="' + e(ED.name) + '" data-c="fedname"></div>' +
      '<div class="row wrap" style="gap:8px"><button class="btn pri" data-a="fedsave"' + (ED.busy ? ' disabled' : '') + '>' + (ED.busy ? 'Обрабатываю…' : 'Обрезать и сохранить') + '</button><button class="btn" data-a="fedraw">Загрузить как есть</button><button class="btn" data-a="fedskip">Пропустить</button></div></div>';
    const cv = document.getElementById('fledcv'), s = ED.src, W = Math.min(1000, s.width);
    cv.width = s.width; cv.height = s.height; const cx = cv.getContext('2d'); cx.drawImage(s, 0, 0);
    const r = Math.max(10, s.width / 70);
    cx.strokeStyle = '#f1780f'; cx.lineWidth = Math.max(3, s.width / 400); cx.beginPath(); ED.pts.forEach((p, i) => { i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); }); cx.closePath(); cx.stroke();
    ED.pts.forEach(p => { cx.fillStyle = 'rgba(241,120,15,.9)'; cx.beginPath(); cx.arc(p[0], p[1], r, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.stroke(); });
    let drag = -1; const pos = ev => { const b = cv.getBoundingClientRect(); return [(ev.clientX - b.left) * cv.width / b.width, (ev.clientY - b.top) * cv.height / b.height]; };
    cv.onpointerdown = ev => { const q = pos(ev); let bi = -1, bd = 1e9; ED.pts.forEach((p, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; } }); if (bd < r * 3.5) { drag = bi; cv.setPointerCapture(ev.pointerId); } };
    cv.onpointermove = ev => { if (drag < 0) return; const q = pos(ev); ED.pts[drag] = [Math.max(0, Math.min(cv.width, q[0])), Math.max(0, Math.min(cv.height, q[1]))]; drawEdCanvasOnly(); };
    cv.onpointerup = () => { drag = -1; };
    void W;
  }
  function drawEdCanvasOnly() {
    const cv = document.getElementById('fledcv'); if (!cv || !ED) return; const s = ED.src, cx = cv.getContext('2d'), r = Math.max(10, s.width / 70);
    cx.drawImage(s, 0, 0); cx.strokeStyle = '#f1780f'; cx.lineWidth = Math.max(3, s.width / 400); cx.beginPath(); ED.pts.forEach((p, i) => { i ? cx.lineTo(p[0], p[1]) : cx.moveTo(p[0], p[1]); }); cx.closePath(); cx.stroke();
    ED.pts.forEach(p => { cx.fillStyle = 'rgba(241,120,15,.9)'; cx.beginPath(); cx.arc(p[0], p[1], r, 0, 7); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 2; cx.stroke(); });
  }
  const finish = () => { ED = null; drawEd(); };
  A.act.fedrot = el => { if (ED) rotate(+el.dataset.d); };
  A.act.fedreset = () => { if (ED) { resetPts(); drawEd(); } };
  A.fld.fedbw = v => { if (ED) ED.bw = !!v; };
  A.fld.fedside = v => { if (ED) ED.side = +v; };
  A.fld.fedname = v => { if (ED) ED.name = v; };
  A.act.fedskip = () => finish();
  A.act.fedraw = async () => { if (!ED) return; const j = ED; const im = await loadImg(j.file).catch(() => null); const th = im ? (() => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return thumbOf(c); })() : ''; finish(); add(j.uid, j.file, j.name, j.file.type || 'image/jpeg', th); };
  A.act.fedsave = async () => {
    if (!ED || ED.busy) return; const j = ED; j.busy = true; drawEd(); await new Promise(r => setTimeout(r, 30));
    try { const out = warp(j.src, j.pts, j.side, j.bw), blob = await toBlob(out, 0.75), th = thumbOf(out); finish(); await add(j.uid, blob, j.name, 'image/jpeg', th); A.toast('Сохранено: ' + kb(blob.size)); }
    catch (x) { j.busy = false; drawEd(); A.toast('Не получилось: ' + (x.message || x)); }
  };

  /* ---------- выбор файлов ---------- */
  document.addEventListener('change', async ev => {
    const el = ev.target; if (!el.classList || !el.classList.contains('flpick')) return;
    const uid = el.dataset.uid, files = Array.from(el.files || []); el.value = '';
    for (const f of files) {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) { add(uid, f, f.name.replace(/\.pdf$/i, ''), 'application/pdf', ''); }
      else if (/^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name)) Q.push({ uid, file: f });
      else A.toast('Этот тип файла не принимаю: ' + f.name);
    }
    nextEditor();
  });
  document.addEventListener('dragover', ev => { if (ev.target.closest && ev.target.closest('.fldrop')) ev.preventDefault(); });
  document.addEventListener('drop', ev => { const z = ev.target.closest && ev.target.closest('.fldrop'); if (!z) return; ev.preventDefault(); const dt = ev.dataTransfer; if (dt && dt.files.length) handleDrop(z.dataset.uid, Array.from(dt.files)); });
  function handleDrop(uid, files) { files.forEach(f => { if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) add(uid, f, f.name.replace(/\.pdf$/i, ''), 'application/pdf', ''); else if (/^image\//.test(f.type)) Q.push({ uid, file: f }); }); nextEditor(); }

  /* ---------- просмотр, имя, скачать, удалить, повторить ---------- */
  async function blobOf(uid, f) {
    let b = await idbGet(f.id); if (b) return b;
    if (!f.fid) throw new Error('файла нет на этом устройстве');
    const r = await fetch(base().split('?')[0] + '?key=' + encodeURIComponent(keyOf()) + '&fget=' + encodeURIComponent(f.fid)), j = await r.json();
    if (!j.ok) throw new Error(j.error || 'не удалось скачать'); b = fromB64(j.data, j.mime || f.mime); await idbPut(f.id, b); return b;
  }
  A.act.flview = async el => {
    const f = filesOf(el.dataset.uid).find(x => x.id === el.dataset.id); if (!f) return; A.toast('Открываю…');
    try {
      const b = await blobOf(el.dataset.uid, f), u = URL.createObjectURL(b);
      const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;z-index:90;background:rgba(10,12,20,.85);display:flex;flex-direction:column;align-items:center;padding:12px;gap:8px';
      ov.innerHTML = '<div class="row" style="gap:8px"><b style="color:#fff">' + e(f.name) + '</b><a class="btn sm" href="' + u + '" download="' + e(f.name + (f.ext || '')) + '">Скачать</a><button class="btn sm" id="flclose">Закрыть</button></div>' +
        (f.mime === 'application/pdf' ? '<iframe src="' + u + '" style="flex:1;width:min(1100px,100%);border:0;background:#fff;border-radius:8px"></iframe>' : '<div style="flex:1;overflow:auto;max-width:100%"><img src="' + u + '" style="max-width:100%;border-radius:6px;background:#fff"></div>');
      document.body.appendChild(ov); ov.querySelector('#flclose').onclick = () => { ov.remove(); URL.revokeObjectURL(u); }; ov.addEventListener('click', ev => { if (ev.target === ov) { ov.remove(); URL.revokeObjectURL(u); } });
    } catch (x) { A.toast('Не открылось: ' + (x.message || x)); }
  };
  A.fld.flname = (v, el) => { patchFile(el.dataset.uid, el.dataset.id, { name: v.trim() || 'Файл' }); };
  A.act.flretry = el => { A.toast('Отправляю на Диск…'); push(el.dataset.uid, el.dataset.id); };
  A.act.fldel = async el => {
    if (el.dataset.y !== '1') { el.dataset.y = '1'; el.textContent = 'Точно удалить?'; return; }
    const uid = el.dataset.uid, f = filesOf(uid).find(x => x.id === el.dataset.id); if (!f) return;
    setFiles(uid, l => l.filter(x => x.id !== f.id)); idbDel(f.id); if (f.fid) post({ fdel: f.fid }).catch(() => {}); A.render();
  };

  /* ---------- вкладка в карточке заказа ---------- */
  A.filesTab = o => {
    const l = filesOf(o.uid), at = ' data-uid="' + o.uid + '"';
    const icon = f => f.th ? '<img src="' + f.th + '" style="width:64px;height:84px;object-fit:cover;border-radius:6px;border:1px solid var(--fb)">' : '<div style="width:64px;height:84px;border-radius:6px;border:1px solid var(--fb);display:grid;place-items:center;font-weight:700;color:var(--mut)">' + (f.mime === 'application/pdf' ? 'PDF' : 'ФОТО') + '</div>';
    return '<div class="fldrop" data-uid="' + o.uid + '" style="border:2px dashed var(--fb);border-radius:12px;padding:14px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:12px">' +
      '<label class="btn pri" style="cursor:pointer">Выбрать файлы<input type="file" class="flpick" multiple accept="image/*,application/pdf"' + at + ' hidden></label>' +
      '<label class="btn" style="cursor:pointer">Сфотографировать<input type="file" class="flpick" accept="image/*" capture="environment"' + at + ' hidden></label>' +
      '<span class="mut">или перетащи сюда фото и PDF (замерники, карта проёмов). Файлы сохраняются на Google Диске.</span></div>' +
      (l.length ? '<div class="stack" style="gap:10px">' + l.map(f => '<div class="row" style="gap:12px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:12px">' + icon(f) +
        '<div style="flex:1;min-width:0"><input class="in" style="width:100%;height:34px" value="' + e(f.name) + '" data-c="flname"' + at + ' data-id="' + f.id + '"><div class="mut" style="font-size:12px;margin-top:4px">' + e(f.d || '') + ' · ' + kb(f.size || 0) + ' · ' + (f.fid ? '<span style="color:var(--ok)">на Диске</span>' : '<span style="color:var(--bad)">ещё не на Диске' + (f.err ? ': ' + e(f.err) : '') + '</span>') + '</div></div>' +
        '<button class="btn sm" data-a="flview"' + at + ' data-id="' + f.id + '">Открыть</button>' + (f.fid ? '' : '<button class="btn sm" data-a="flretry"' + at + ' data-id="' + f.id + '">Отправить на Диск</button>') + '<button class="btn sm" data-a="fldel"' + at + ' data-id="' + f.id + '">Удалить</button></div>').join('') + '</div>'
        : '<p class="mut">Файлов пока нет. Загрузи фото замерника, скан или PDF: можно несколько страниц и по этажам.</p>');
  };
})();
