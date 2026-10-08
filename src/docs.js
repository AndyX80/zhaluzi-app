/* Документы: КП (печатная форма). PDF — через «Печать → Сохранить как PDF» на телефоне. */
(function (root) {
  'use strict';
  const rub = n => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const COLL = { 'Амиго': 'Стандарт', 'Интерьер': 'Классик', 'РДО': 'Урбан', 'Форум': 'Тренд', 'Уют': 'Премиум' };
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dateRu = d => d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ' г.';

  function itemName(it) {
    const parts = [it.mat + ' ' + it.lam + ' мм', COLL[it.sup] || it.sup];
    if (it.o.color) parts.push(it.o.color);
    return parts.join(', ');
  }
  function extras(it) { return [it.o.fix].concat(it.o.opts || []).filter(Boolean).join(', '); }

  function kpHtml(order) {
    const created = new Date(order.created), until = new Date(created.getTime() + 14 * 86400000);
    const total = order.items.reduce((a, b) => a + b.price, 0);
    const rows = order.items.map((it, i) =>
      '<tr><td>' + (i + 1) + '</td><td>' + esc(itemName(it)) + (extras(it) ? '<div class="s">' + esc(extras(it)) + '</div>' : '') +
      '</td><td>' + it.W + '×' + it.H + ' см</td><td class="r">' + rub(it.price) + '</td></tr>').join('');
    const pre = order.preU === '₽' ? +order.pre : Math.round(total * (+order.pre || 100) / 100);
    return '<div class="doc"><img class="logo" src="assets/logo.png" alt="Жалюзи-СПБ">' +
      '<h2>Коммерческое предложение № ' + esc(order.no) + '</h2>' +
      '<div class="s">от ' + dateRu(created) + ' · действительно до ' + dateRu(until) + '</div>' +
      '<p><b>' + esc(order.name || 'Клиент') + '</b>' + (order.addr ? '<br>' + esc(order.addr) : '') + '</p>' +
      '<table><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Цена</th></tr>' + rows +
      '<tr><td colspan="3" class="r"><b>Итого</b></td><td class="r"><b>' + rub(total) + '</b></td></tr></table>' +
      '<p class="s">Предоплата ' + rub(pre) + ' (' + esc(order.pre || 100) + (order.preU || '%') + '). Срок изготовления ' + esc(order.term || 12) + ' календарных дней.</p>' +
      '</div>';
  }

  const api = { kpHtml, dateRu, itemName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JalDocs = api;
})(typeof self !== 'undefined' ? self : this);
