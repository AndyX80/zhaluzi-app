/* Таблицы как в Excel: ширину столбцов можно тянуть за правый край заголовка (двойной щелчок = авто), ширины запоминаются */
(function () {
  const A = App, KEY = 'jald_cw'; let W = {}; try { W = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };
  const mk = () => String(A.S.active || '').split(':')[0];
  const nm = th => th.textContent.replace(/[▲▼]/g, '').trim();
  const cols = tb => { const tr = tb.querySelector('thead tr'); return tr ? [].slice.call(tr.children) : []; };
  const fix = tb => { const ths = cols(tb); if (tb.classList.contains('tfix')) return ths;
    const ws = ths.map(t => t.offsetWidth); ths.forEach((t, i) => { t.style.width = ws[i] + 'px'; }); tb.classList.add('tfix'); tb.style.width = ws.reduce((a, b) => a + b, 0) + 'px'; return ths; };
  const total = tb => { tb.style.width = cols(tb).reduce((a, t) => a + (parseFloat(t.style.width) || t.offsetWidth), 0) + 'px'; };
  function setup(tb) {
    const ths = cols(tb), m = mk(); if (!ths.length) return;
    let any = false;
    ths.forEach(t => { if (!nm(t)) return; if (!t.querySelector('.rsz')) { const h = document.createElement('i'); h.className = 'rsz'; h.title = 'Потяни, чтобы изменить ширину; двойной щелчок — авто'; t.appendChild(h); } if (W[m + '|' + nm(t)]) any = true; });
    if (!any) return;
    const ws = ths.map(t => W[m + '|' + nm(t)] || 0);
    const auto = ths.map((t, i) => ws[i] ? 0 : t.offsetWidth); ths.forEach((t, i) => { t.style.width = (ws[i] || auto[i]) + 'px'; });
    tb.classList.add('tfix'); total(tb);
  }
  const r0 = A.render;
  A.render = function () { const r = r0.apply(this, arguments); document.querySelectorAll('#view table.tbl').forEach(setup); return r; };
  let drag = null;
  document.addEventListener('mousedown', ev => { const h = ev.target.closest && ev.target.closest('.rsz'); if (!h) return; ev.preventDefault(); ev.stopPropagation();
    const th = h.parentNode, tb = th.closest('table'); fix(tb); drag = { th, tb, x: ev.clientX, w: th.offsetWidth }; document.body.classList.add('rszing'); }, true);
  document.addEventListener('mousemove', ev => { if (!drag) return; drag.th.style.width = Math.max(44, drag.w + ev.clientX - drag.x) + 'px'; total(drag.tb); });
  document.addEventListener('mouseup', () => { if (!drag) return; const m = mk(); cols(drag.tb).forEach(t => { if (nm(t)) W[m + '|' + nm(t)] = Math.round(parseFloat(t.style.width) || t.offsetWidth); }); save(); drag = null; document.body.classList.remove('rszing'); });
  document.addEventListener('click', ev => { if (ev.target.closest && ev.target.closest('.rsz')) { ev.stopPropagation(); ev.preventDefault(); } }, true);
  document.addEventListener('dblclick', ev => { const h = ev.target.closest && ev.target.closest('.rsz'); if (!h) return; const th = h.parentNode, tb = th.closest('table'), m = mk(); delete W[m + '|' + nm(th)]; save(); cols(tb).forEach(t => { t.style.width = ''; }); tb.classList.remove('tfix'); tb.style.width = ''; A.render(); });
})();
