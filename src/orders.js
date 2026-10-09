/* База заказов на телефоне (localStorage). Статусы — как в макете. */
(function (root) {
  'use strict';
  const KEY = 'jal_orders';
  const STATUSES = ['Черновик', 'КП отправлено', 'Договор', 'Оплачен'];
  function load() {
    let a = []; try { a = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    a.forEach(o => { if (STATUSES.indexOf(o.status) < 0) o.status = 'Черновик'; });
    return a;
  }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  /* сквозная нумерация: №1326, 1327…; продолжается от самого большого номера на телефоне и в общей базе (jal_no_max пишет синхронизация) */
  const FLOOR = 1325;
  function nextNo(a) {
    a = a || load(); let mx = FLOOR; try { mx = Math.max(mx, +localStorage.getItem('jal_no_max') || 0); } catch (e) {}
    a.forEach(x => { if (/^\d+$/.test(String(x.no))) mx = Math.max(mx, +x.no); });
    return String(mx + 1);
  }
  function create(data, items) {
    const a = load();
    const o = Object.assign({ no: nextNo(a), status: 'Черновик', created: new Date().toISOString(), items: items, history: [], rev: true, rem: 0 }, data);
    a.unshift(o); save(a); return o;
  }
  const get = no => load().find(x => x.no === no) || null;
  function update(no, patch) { const a = load(), o = a.find(x => x.no === no); if (o) { Object.assign(o, patch); save(a); } return o; }
  function setStatus(no, st) { const p = { status: st }; if (st === 'КП отправлено') p.sent = new Date().toISOString().slice(0, 10); return update(no, p); }
  function addVersion(no, title, sum, sub) {
    const a = load(), o = a.find(x => x.no === no); if (!o) return;
    o.history = o.history || []; o.history.unshift({ v: o.history.length + 1, title, sum, at: new Date().toISOString(), sub: sub || '' }); save(a);
  }
  function remove(no) { save(load().filter(x => x.no !== no)); }
  const api = { STATUSES, nextNo, load, get, create, update, setStatus, addVersion, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JalOrders = api;
})(typeof self !== 'undefined' ? self : this);
