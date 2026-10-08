/* Общая обвязка экранов: корень .scr с темой, шаблон, переходы между экранами. */
(function () {
  'use strict';
  const themeCls = () => { try { const o = JSON.parse(localStorage.getItem('jal_theme') || '{}'); return 'p' + ((o.pal | 0) % 5) + (o.theme === 'night' ? ' nt' : ''); } catch (e) { return 'p0'; } };
  const ROOT = 'min-height: 100vh; box-sizing: border-box; background: var(--bg); font-family: Inter, -apple-system, system-ui, sans-serif; color: var(--ink); display: flex; flex-direction: column; position: relative';
  function make(rootId, tplId) {
    const box = document.getElementById(rootId); let m = null;
    return { box, render(vm) {
      if (!m) m = JalTpl.mount(box, document.getElementById(tplId));
      box.className = 'scr ' + themeCls(); box.setAttribute('style', ROOT);
      m.render(vm);
    } };
  }
  /* ссылки макетов (href="Main.dc.html" и т.п.) */
  const go = new Proxy({}, { get: (_, k) => () => window.JalApp.go(k) });
  window.JalScreen = { make, go, themeCls };
})();
