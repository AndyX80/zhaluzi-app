/* База заказов на телефоне (localStorage). Статусы — как в макете. */
(function (root) {
  'use strict';
  const KEY = 'jal_orders';
  const STATUSES = ['Новый', 'Замер', 'КП отправлено', 'В работе', 'Монтаж', 'Готово'];
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function nextNo(a) {
    const y = new Date().getFullYear();
    const n = a.filter(o => String(o.no).startsWith(y + '-')).map(o => +String(o.no).split('-')[1]);
    return y + '-' + String((n.length ? Math.max.apply(null, n) : 0) + 1).padStart(3, '0');
  }
  function create(data, items) {
    const a = load();
    const o = Object.assign({ no: nextNo(a), status: 'Новый', created: new Date().toISOString(), items: items }, data);
    a.unshift(o); save(a); return o;
  }
  function setStatus(no, st) { const a = load(); const o = a.find(x => x.no === no); if (o) { o.status = st; save(a); } }
  function remove(no) { save(load().filter(x => x.no !== no)); }
  const api = { STATUSES, load, create, setStatus, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JalOrders = api;
})(typeof self !== 'undefined' ? self : this);
