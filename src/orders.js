/* База заказов на телефоне (localStorage). Статусы — как в макете. */
(function (root) {
  'use strict';
  const KEY = 'jal_orders';
  const STATUSES = ['Черновик', 'КП отправлено', 'Договор', 'Оплачен'];
  const stamp = () => new Date().toISOString();
  const uidOf = o => o.uid || (o.uid = 'n' + o.no);
  /* raw: все заказы, включая удалённые (метка del) — они нужны синхронизации; load: только живые */
  function raw() {
    let a = []; try { a = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
    a.forEach(o => { uidOf(o); if (!Array.isArray(o.items)) o.items = []; if (!o.created) o.created = o.upd || '2026-01-01T00:00:00.000Z'; if (STATUSES.indexOf(o.status) < 0) o.status = 'Черновик'; });
    return a;
  }
  const load = () => raw().filter(o => !o.del);
  function put(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function save(a) { put(a); try { root.dispatchEvent(new Event('jal-orders')); } catch (e) {} }
  /* слияние с общей базой: по uid, побеждает более поздняя правка (upd) */
  function merge(local, remote) {
    const m = {}; local.forEach(o => { m[uidOf(o)] = o; });
    (remote || []).forEach(r => { uidOf(r); const l = m[r.uid]; if (!l || String(r.upd || '') > String(l.upd || '')) m[r.uid] = r; });
    const out = Object.keys(m).map(k => m[k]); out.sort((x, y) => String(y.created || '').localeCompare(String(x.created || '')));
    return out;
  }
  function applyRemote(remote) {
    const a = merge(raw(), remote); put(a);
    let mx = 0; a.forEach(x => { if (/^\d+$/.test(String(x.no))) mx = Math.max(mx, +x.no); });
    try { if (mx > (+localStorage.getItem('jal_no_max') || 0)) localStorage.setItem('jal_no_max', String(mx)); } catch (e) {}
    return a.filter(o => !o.del).length;
  }
  /* сквозная нумерация: №1326, 1327…; продолжается от самого большого номера на телефоне и в общей базе (jal_no_max пишет синхронизация) */
  const FLOOR = 1325;
  function nextNo(a) {
    a = a || raw(); let mx = FLOOR; try { mx = Math.max(mx, +localStorage.getItem('jal_no_max') || 0); } catch (e) {}
    a.forEach(x => { if (/^\d+$/.test(String(x.no))) mx = Math.max(mx, +x.no); });
    return String(mx + 1);
  }
  function create(data, items) {
    const a = raw();
    const o = Object.assign({ uid: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), upd: stamp(), no: nextNo(a), status: 'Черновик', created: new Date().toISOString(), items: items, history: [], rev: true, rem: 0 }, data);
    a.unshift(o); save(a); return o;
  }
  const get = no => load().find(x => x.no === no) || null;
  function update(no, patch) { const a = raw(), o = a.find(x => x.no === no && !x.del); if (o) { Object.assign(o, patch, { upd: stamp() }); save(a); } return o; }
  function setStatus(no, st) { const p = { status: st }; if (st === 'КП отправлено') p.sent = new Date().toISOString().slice(0, 10); return update(no, p); }
  function addVersion(no, title, sum, sub) {
    const a = raw(), o = a.find(x => x.no === no && !x.del); if (!o) return;
    o.upd = stamp(); o.history = o.history || []; o.history.unshift({ v: o.history.length + 1, title, sum, at: new Date().toISOString(), sub: sub || '' }); save(a);
  }
  function remove(no) { const a = raw(), o = a.find(x => x.no === no && !x.del); if (o) { o.del = true; o.upd = stamp(); save(a); } }
  const api = { STATUSES, nextNo, load, raw, merge, applyRemote, get, create, update, setStatus, addVersion, remove };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JalOrders = api;
})(typeof self !== 'undefined' ? self : this);
