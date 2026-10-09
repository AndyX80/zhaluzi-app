/* Каркас: состояние, вкладки, режимы, поиск, события. Модули регистрируются через App.module(). */
(function () {
  const D = window.DEMO;
  const KEY = 'jald_state_v1';
  const ICONS = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    clients: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6M16 5.5a3 3 0 010 5.8M18 14.5c2 .7 3 2.6 3 5.5"/>',
    orders: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6.5h8M8 11h2M12 11h2M8 15h2M12 15h2M8 18.5h2M12 18.5h4"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    money: '<circle cx="12" cy="12" r="8.5"/><path d="M14.7 9.2c-.5-1-1.6-1.5-2.7-1.5-1.5 0-2.7.8-2.7 2.1 0 3 5.6 1.3 5.6 4.3 0 1.3-1.2 2.2-2.9 2.2-1.3 0-2.4-.6-3-1.7M12 6v1.7M12 16.3V18"/>',
    analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    docs: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    refs: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    bell: '<path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15zM10 21h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    kanban: '<rect x="3.5" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="16.5" y="4" width="4" height="13" rx="1"/>',
    warn: '<path d="M12 3.5l9.5 16.5h-19zM12 10v4.5M12 17.2v.1"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    layout: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16M9 11h11"/>',
    trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>'
  };
  const icon = (n, s) => '<svg class="ic" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[n] || '') + '</svg>';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => (n < 0 ? '−' : '') + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';

  /* режимы работы: переключатель под текущую задачу, Alt+1…6 */
  const WS = [
    { id: 'home', name: 'Рабочий стол', hint: 'Что сейчас происходит' },
    { id: 'calc', name: 'Продажи и расчёт', hint: 'Изделие слева, корзина справа' },
    { id: 'orders', name: 'Заказы', hint: 'Список, карточка, воронка' },
    { id: 'calendar', name: 'Календарь', hint: 'Замеры, монтажи, звонки' },
    { id: 'money', name: 'Деньги', hint: 'Приходы, расходы, долги' },
    { id: 'analytics', name: 'Аналитика', hint: 'Цифры и графики' }
  ];
  const NAV = [['home', 'Рабочий стол'], ['clients', 'Клиенты'], ['orders', 'Заказы'], ['calc', 'Расчёт'], ['calendar', 'Календарь'], ['money', 'Деньги'], ['analytics', 'Аналитика'], ['docs', 'Документы'], ['refs', 'Справочники'], ['settings', 'Настройки']];

  const S = Object.assign({
    tabs: [{ id: 'home' }], active: 'home', theme: 'auto', collapsed: false,
    ordersView: 'list', ordersFilter: 'all', selOrder: 'o3', orderTab: 'main', selClient: 'c1', clientTab: 'main',
    cart: [], region: false, hideProfit: false, disc: 0, refOpen: true, period: 'month', moneyF: 'all', refTab: 'sup', setTab: 'view'
  }, (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  const App = { S, D, icon, esc, money, ICONS, WS, NAV, save, mods: {}, act: {}, fld: {} };
  App.module = (id, def) => { App.mods[id] = def; };
  /* быстрый поиск по id (в реальных данных ~1000 заказов и ~800 клиентов) */
  const idx = {};
  const finder = k => id => { const arr = D[k], x = idx[k]; if (!x || x.arr !== arr || x.n !== arr.length) { const m = {}; arr.forEach(r => { m[r.id] = r; }); idx[k] = { arr, n: arr.length, m }; } return idx[k].m[id]; };
  App.client = finder('clients');
  App.order = finder('orders');
  const baseOf = id => id.indexOf(':') > 0 ? (id.indexOf('order:') === 0 ? 'orders' : 'clients') : id;

  const tabTitle = id => {
    if (id.indexOf('order:') === 0) { const o = App.order(id.slice(6)); return o ? '№ ' + o.no : id; }
    if (id.indexOf('client:') === 0) { const c = App.client(id.slice(7)); return c ? c.name : id; }
    const n = NAV.filter(x => x[0] === id)[0]; return n ? n[1] : id;
  };
  App.open = id => {
    /* первая вкладка = текущий раздел (меняется при переходе), остальные = открытые заказы и клиенты */
    if (id.indexOf(':') < 0) { S.tabs[0] = { id }; S.active = id; }
    else { if (!S.tabs.some(t => t.id === id)) S.tabs.push({ id }); S.active = id; }
    save(); closePop(); App.render();
  };
  App.toast = msg => {
    const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(App._tt); App._tt = setTimeout(() => { t.hidden = true; }, 2600);
  };
  App.stub = what => App.toast('Заглушка: ' + (what || 'функция') + ' появится на следующих этапах');

  function applyTheme() {
    const d = S.theme === 'dark' || (S.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
  }

  function renderTop() {
    const cur = WS.filter(w => w.id === baseOf(S.active))[0];
    const q = document.getElementById('q'), qv = q ? q.value : '';
    document.getElementById('top').innerHTML =
      '<button class="ibtn burger" data-a="collapse" title="Свернуть меню">' + icon('layout', 20) + '</button>' +
      '<div class="brand"><img src="../assets/icon-192.png" alt=""><b>Жалюзи-СПб</b></div>' +
      '<button class="mode" data-a="modes" title="Режим работы (Alt+1…6)"><span class="mode-l">Режим</span><b>' + esc(cur ? cur.name : 'Свой режим') + '</b>' + icon('chev', 16) + '</button>' +
      '<div class="search"><span class="s-ic">' + icon('search', 18) + '</span><input id="q" type="search" autocomplete="off" placeholder="Поиск: клиент, телефон, номер заказа…   /"></div>' +
      '<div class="quick"><button class="btn pri" data-a="new-order">' + icon('plus', 16) + ' Заказ</button><button class="btn" data-a="new-client">' + icon('plus', 16) + ' Клиент</button><button class="btn" data-a="new-pay">' + icon('plus', 16) + ' Платёж</button></div>' +
      '<div class="sp"></div>' +
      '<button class="ibtn" data-a="theme" title="Тема: светлая / тёмная / как в системе">' + icon(S.theme === 'dark' ? 'moon' : 'sun', 19) + '</button>' +
      '<button class="ibtn" data-a="bell" title="Напоминания">' + icon('bell', 19) + '<i class="dot">3</i></button>' +
      '<div class="user"><span class="ava">АХ</span><span class="uname">Андрей<small>владелец</small></span></div>';
    if (qv) document.getElementById('q').value = qv;
  }

  function renderSide() {
    const cur = baseOf(S.active);
    document.getElementById('side').innerHTML = NAV.map(n =>
      '<button class="ni' + (cur === n[0] ? ' on' : '') + '" data-a="nav" data-id="' + n[0] + '" title="' + n[1] + '">' + icon(n[0], 21) + '<span>' + n[1] + '</span></button>').join('') +
      '<div class="sp"></div><div class="ver">' + (D.real ? 'версия ' + (window.JALD_VER || 2) + '<br>ваши данные' : 'каркас v1<br>данные демо') + '</div>';
    document.getElementById('app').classList.toggle('collapsed', !!S.collapsed);
  }

  function renderTabs() {
    document.getElementById('tabs').innerHTML = S.tabs.map(t =>
      '<div class="tab' + (t.id === S.active ? ' on' : '') + '" data-a="tab" data-id="' + esc(t.id) + '"><span>' + esc(tabTitle(t.id)) + '</span>' +
      (t.id.indexOf(':') < 0 ? '' : '<button class="x" data-a="close" data-id="' + esc(t.id) + '" title="Закрыть">' + icon('close', 13) + '</button>') + '</div>').join('');
  }

  function renderBar() {
    let items;
    if (D.real) {
      const debts = D.orders.filter(x => x.sum - x.paid > 0), tot = debts.reduce((a, x) => a + x.sum - x.paid, 0), top = debts.slice().sort((x, y) => (y.sum - y.paid) - (x.sum - x.paid)).slice(0, 2);
      items = ['<b>Долги клиентов:</b> ' + debts.length + ' зак. на ' + money(tot)].concat(top.map(x => '№ ' + x.no + ' ' + esc((App.client(x.client) || {}).name) + ' ' + money(x.sum - x.paid)));
    } else {
      const debts = D.orders.filter(x => x.sum - x.paid > 0 && x.stage >= 3 && x.stage < 9);
      items = ['<b>Сегодня:</b>', '10:00 замер Иванова', '14:00 монтаж Альфа-Офис'].concat(debts.slice(0, 2).map(x => 'долг ' + esc(App.client(x.client).name) + ' ' + money(x.sum - x.paid)));
    }
    document.getElementById('bar').innerHTML = items.map(t => '<span class="chip">' + t + '</span>').join('') + '<span class="sp"></span><span class="hint">Alt+1…6 режимы · / поиск · ' + (D.real ? 'данные из вашего Excel' : 'данные демо') + '</span>';
  }

  App.render = () => {
    applyTheme(); renderTop(); renderSide(); renderTabs(); renderBar();
    const id = S.active, view = document.getElementById('view');
    let html = '';
    try {
      if (id.indexOf('order:') === 0) html = App.mods.orders.card(id.slice(6), true);
      else if (id.indexOf('client:') === 0) html = App.mods.clients.card(id.slice(7), true);
      else html = App.mods[id].render();
    } catch (e) { html = '<div class="empty">Раздел в разработке<br><small>' + esc(e.message) + '</small></div>'; }
    view.innerHTML = html;
    view.className = 'view v-' + baseOf(id);
    const m = App.mods[baseOf(id)]; if (m && m.after) m.after(view);
  };

  /* ---- события ---- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) { if (!e.target.closest('#pop')) closePop(); return; }
    const fn = App.act[el.dataset.a];
    if (fn) fn(el, e);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-c]'); if (!el) return;
    const fn = App.fld[el.dataset.c]; if (fn) fn(el.type === 'checkbox' ? el.checked : el.value, el);
  });
  function closePop() { const p = document.getElementById('pop'); p.hidden = true; p.innerHTML = ''; }
  function popAt(btn, html, cls) {
    const p = document.getElementById('pop'), r = btn.getBoundingClientRect();
    p.innerHTML = html; p.className = 'pop ' + (cls || ''); p.hidden = false;
    p.style.top = (r.bottom + 6) + 'px'; p.style.left = Math.max(8, Math.min(r.left, innerWidth - p.offsetWidth - 8)) + 'px';
  }
  App.act.nav = el => App.open(el.dataset.id);
  App.act.tab = el => { S.active = el.dataset.id; save(); App.render(); };
  App.act.close = (el, e) => {
    e.stopPropagation();
    const id = el.dataset.id, i = S.tabs.findIndex(t => t.id === id); S.tabs.splice(i, 1);
    if (S.active === id) S.active = S.tabs[Math.max(0, i - 1)].id; save(); App.render();
  };
  App.act.collapse = () => { S.collapsed = !S.collapsed; save(); renderSide(); };
  App.act.theme = () => { S.theme = S.theme === 'light' ? 'dark' : S.theme === 'dark' ? 'auto' : 'light'; save(); App.render(); App.toast('Тема: ' + ({ light: 'светлая', dark: 'тёмная', auto: 'как в системе' })[S.theme]); };
  App.act.bell = (el, e) => { e.stopPropagation(); const at = App.attention ? App.attention().slice(0, 5) : []; popAt(el, '<div class="ph">Напоминания</div>' + (at.length ? at.map(x => '<button class="pm" data-a="opn" data-id="' + x[0] + '"><b>' + esc(x[2]) + '</b></button>').join('') : '<div class="pi">Пока всё спокойно</div>'), 'right'); };
  App.act.modes = (el, e) => { e.stopPropagation(); popAt(el, '<div class="ph">Режим работы</div>' + WS.map((w, i) => '<button class="pm" data-a="nav" data-id="' + w.id + '"><b>' + w.name + '</b><small>' + w.hint + '</small><kbd>Alt+' + (i + 1) + '</kbd></button>').join('') + '<div class="pf">Режим меняет раскладку под задачу. Данные, выбранный клиент и заказ остаются.</div>'); };
  App.act['new-order'] = () => App.open('calc');
  App.act['new-client'] = () => App.stub('карточка нового клиента');
  App.act['new-pay'] = () => App.stub('ввод платежа');
  App.act.stub = el => App.stub(el.dataset.t);
  App.act.opn = el => App.open(el.dataset.id);
  App.act.selo = el => { S.selOrder = el.dataset.id; save(); App.render(); };
  App.act.selc = el => { S.selClient = el.dataset.id; save(); App.render(); };

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.altKey && /^[1-6]$/.test(e.key)) { e.preventDefault(); App.open(WS[+e.key - 1].id); return; }
    if (e.code === 'Digit1' && false) return;
    if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') { e.preventDefault(); const q = document.getElementById('q'); if (q) q.focus(); }
    if (e.key === 'Escape') closePop();
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'q') return;
    const v = e.target.value.trim().toLowerCase(); if (!v) { closePop(); return; }
    const cs = D.clients.filter(c => (c.name + ' ' + c.phone + ' ' + c.phone.replace(/\D/g, '') + ' ' + c.addr).toLowerCase().indexOf(v) >= 0).slice(0, 12);
    const os = D.orders.filter(o => (o.no + ' ' + o.title + ' ' + o.sup + ' ' + (o.factory || '') + ' ' + App.client(o.client).name).toLowerCase().indexOf(v) >= 0).slice(0, 15);
    let h = '<div class="ph">Найдено: ' + (cs.length + os.length) + '</div>';
    h += cs.map(c => '<button class="pm" data-a="opn" data-id="client:' + c.id + '"><b>' + esc(c.name) + '</b><small>' + esc(c.phone) + ' · клиент</small></button>').join('');
    h += os.map(o => '<button class="pm" data-a="opn" data-id="order:' + o.id + '"><b>№ ' + o.no + ' · ' + esc(App.client(o.client).name) + '</b><small>' + esc(o.title) + '</small></button>').join('');
    if (!cs.length && !os.length) h += '<div class="pi">Ничего не найдено</div>';
    popAt(e.target, h);
    document.getElementById('pop').style.minWidth = e.target.offsetWidth + 'px';
  });

  App.start = () => {
    if (!App.order(S.selOrder) && D.orders[0]) S.selOrder = D.orders[0].id;
    if (!App.client(S.selClient) && D.clients[0]) S.selClient = D.clients[0].id;
    S.tabs = S.tabs.filter(t => App.mods[baseOf(t.id)] && (t.id.indexOf(':') > 0 ? (t.id.indexOf('order:') === 0 ? App.order(t.id.slice(6)) : App.client(t.id.slice(7))) : true));
    const mod = S.tabs.filter(t => t.id.indexOf(':') < 0)[0] || { id: 'home' };
    S.tabs = [mod].concat(S.tabs.filter(t => t.id.indexOf(':') > 0));
    if (!S.tabs.some(t => t.id === S.active)) S.active = mod.id;
    App.render();
  };
  window.App = App;
})();
