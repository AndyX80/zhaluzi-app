/* Экран «Сравнить поставщиков» по макету Compare.dc.html: та же позиция у всех поставщиков, от дешёвой к дорогой. */
(function () {
  'use strict';
  const scr = JalScreen.make('compareRoot', 'tpl_compareRoot');
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const TAG = { 'Стандарт': '#E6F0E6; color: #1E6B24', 'Классик': '#F1E4D4; color: var(--dk)', 'Урбан': '#F1E4D4; color: var(--dk)', 'Тренд': '#F1E4D4; color: var(--dk)', 'Премиум': '#F6E9DA; color: #8A4B00' };
  function render() {
    const CS = window.JalCalcScreen, S = CS.state, rows = CS.compareRows();
    const sel = rows.findIndex(r => r.sup === S.sup);
    const opts = Object.keys(S.opts).filter(k => S.opts[k]).concat(S.fix ? [S.fix] : []);
    const sub = S.mat + ' ' + S.lam + ' · ' + S.w + '×' + S.h + ' мм' + (opts.length ? ' · ' + opts.join(', ').toLowerCase() : '');
    const cur = rows[sel];
    scr.render({
      go: JalScreen.go, sub,
      rows: rows.map((r, i) => {
        const bad = r.hard || r.warn.length, note = (r.miss.length ? r.miss.join(', ').toLowerCase() + ' нет у поставщика, посчитано без этого' : (bad ? r.warn.join('; ') : 'Гарантия OK')) + (i === sel ? ' · выбран' : '');
        return { name: r.label, tag: r.tag, price: fmt(r.price) + ' ₽', profit: 'прибыль +' + fmt(r.profit), note,
          tagStyle: 'font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: ' + (TAG[r.tag] || TAG['Тренд']),
          noteStyle: (bad || r.miss.length) ? 'font-size: 13px; color: #B3261E' : 'font-size: 13px; color: #1E6B24',
          pick: () => { CS.pickSupplier(r.sup); window.JalApp.tab('calc'); },
          style: 'min-height: 64px; border-radius: 16px; border: 2px solid ' + (i === sel ? 'var(--ac)' : 'transparent') + '; background: ' + (i === sel ? 'var(--sel)' : 'var(--card)') + '; box-shadow: 0 1px 3px rgba(20,40,60,.12); display: flex; align-items: center; gap: 10px; padding: 10px 14px; color: var(--ink)' };
      }),
      chosen: cur ? 'Выбран: ' + cur.label : 'Выбери поставщика'
    });
  }
  window.JalCompareScreen = { render };
})();
