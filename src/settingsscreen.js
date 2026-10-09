/* Экран «Настройки» (5 вкладок) по макету Settings.dc.html. */
(function () {
  'use strict';
  const fmt = n => String(Math.round(n * 100) / 100).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { alert('Не хватает места в телефоне'); } };
  const App = () => window.JalApp;
  const scr = JalScreen.make('settingsRoot', 'tpl_settingsRoot');
  const T = { drv: false, drvErr: '', drvOk: '', tab: 0, openSup: '', sched: +lsGet('jal_sched') || 0, busy: false, err: '', url: lsGet('jal_prices_url') };
  const PAL = [['Орех', '#4A2C18'], ['Хвоя', '#1F4A3D'], ['Графит', '#2A3550'], ['Бордо', '#6B2C3B'], ['Индиго', '#34306B']];
  const SZ = JalLook.SIZES;
  const FN = JalLook.FONTS;
  const MPS = { 'Amigo': ['Дерево 50', 'Бамбук 50', 'Дерево 25', 'Бамбук 25', 'Пластик 50', 'Привод', 'Пульт'], 'РДО': ['Дерево 50', 'Бамбук 50', 'Дерево 25', 'Бамбук 25', 'Привод', 'Пульт'],
    'Интерьер': ['Дерево 50', 'Бамбук 50', 'Дерево 25', 'Привод', 'Пульт'], 'Foroom': ['Дерево 50', 'Бамбук 50', 'Привод', 'Пульт'], 'Уют': ['Дерево 50', 'Бамбук 50', 'Дерево 25', 'Бамбук 25', 'Привод', 'Пульт'] };
  const theme = () => { try { return JSON.parse(lsGet('jal_theme') || '{}'); } catch (e) { return {}; } };
  const saveTheme = p => { lsSet('jal_theme', JSON.stringify(Object.assign(theme(), p))); JalLook.apply(); };
  const seg = on => 'min-height: 52px; padding: 4px 4px; border: 0; border-bottom: 3px solid ' + (on ? 'var(--ac)' : 'transparent') + '; background: transparent; text-align: center; font-size: 14px; font-weight: ' + (on ? 800 : 500) + '; color: ' + (on ? 'var(--ink)' : 'var(--m3)');
  const row = on => 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); font-size: 15px; font-weight: 700; text-align: left; background: ' + (on ? 'var(--sel)' : 'var(--chip)');
  const box = on => 'width: 22px; height: 22px; border-radius: 6px; box-sizing: border-box; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-size: 15px; font-weight: 800; border: 2px solid var(--ac); background: ' + (on ? 'var(--ac)' : 'transparent');
  const dstr = ms => new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function pickImage(key, after) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { lsSet(key, rd.result); after(); }; rd.readAsDataURL(f); };
    i.click();
  }
  function pickJson(cb) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => cb(rd.result); rd.readAsText(f); };
    i.click();
  }

  function render() {
    const A = App(), JC = window.JalCart, st = A.st, R = JC.RATES, M = JC.MINP, sheets = st.sheets || {};
    const set = p => { Object.assign(T, p); render(); };
    const th = theme(), dark = th.theme === 'night', pal = th.pal | 0, fs = th.fs == null ? 1 : th.fs | 0, font = th.font | 0;
    const par = {}; (sheets['Параметры'] || []).slice(1).forEach(r => { par[r[0]] = r[1]; });
    const sup = {}; (sheets['Поставщики'] || []).slice(1).forEach(r => { sup[r[0]] = r; });
    const at = +lsGet('jal_prices_at'), loaded = !!st.P;
    const fxAuto = lsGet('jal_fx_auto') !== '0', fxVal = lsGet('jal_fx');
    const stockUrl = lsGet('jal_stock_url'), stockAt = (() => { try { return (JSON.parse(lsGet('jal_stock_cache') || 'null') || {}).at || 0; } catch (e) { return 0; } })();
    const orders = JalOrders.load(), vers = orders.reduce((a, o) => a + (o.history || []).length, 0);
    const pf = (r, k) => { const v = (sup[r] || [])[k]; return v == null ? '—' : fmt(v); };
    const names = ['Амиго', 'РДО', 'Интерьер', 'Уют', 'Форум'];
    const params = [['Курс у.е. РДО', par['курс_рдо'] != null ? fmt(par['курс_рдо']) + ' ₽' : '—'], ['Курс USD (Амиго)', par['курс_usd'] != null ? fmt(par['курс_usd']) + ' ₽' : '—']]
      .concat((sheets['Прибыль'] || []).slice(1).map(r => ['Прибыль X, ' + r[0].toLowerCase(), fmt(r[1]) + ' ₽/м²']))
      .concat([['Доставка закупа, ' + names.join(' / '), names.map(n => pf(n, 1)).join(' / ') + ' ₽'], ['Коэф. опций, ' + names.join(' / '), names.map(n => pf(n, 4)).join(' / ')]]).map(r => ({ k: r[0], v: r[1] }));
    const rt = {}, setRt = {};
    Object.keys(R).forEach(k => { rt[k] = R[k]; setRt[k] = e => { R[k] = Number(e.target.value) || 0; JC.saveCfg(); }; });
    const mpVal = (s, p) => { const v = (M.p[s] || {})[p]; return v !== undefined ? v : (p === 'Пульт' ? 0 : M.def); };
    const mpSet = (s, p, v) => { (M.p[s] = M.p[s] || {})[p] = v; };
    const mpSups = Object.keys(MPS).map(s => { const vals = MPS[s].filter(p => p !== 'Пульт').map(p => mpVal(s, p)), same = vals.every(v => v === vals[0]), open = T.openSup === s;
      return { name: s, open, summary: same ? vals[0].toLocaleString('ru-RU') + ' ₽ везде' : 'по-разному', headBg: open ? 'var(--chip)' : 'var(--hd)',
        arrow: 'transition: transform 0.15s; transform: rotate(' + (open ? 180 : 0) + 'deg)', toggle: () => set({ openSup: open ? '' : s }),
        setAll: e => { MPS[s].forEach(p => { if (p !== 'Пульт') mpSet(s, p, Number(e.target.value) || 0); }); JC.saveCfg(); render(); },
        rows: MPS[s].map(p => ({ name: p, val: mpVal(s, p), set: e => { mpSet(s, p, e.target.value === '' ? 0 : Number(e.target.value)); JC.saveCfg(); render(); } })) }; });
    const on = (k, def) => { const v = lsGet(k); return v === '' ? def : v === '1'; };
    const flag = (k, def) => () => { lsSet(k, on(k, def) ? '0' : '1'); render(); };
    const profitOn = !!st.show, fpOn = on('jal_fp', false) && JalLock.fpHas(), pinOn = on('jal_pin_on', false) && JalLock.hasPin();
    const bg = dark ? '#14181F' : '#F5EEE6', card = dark ? '#1F2630' : '#FFFFFF', tx = dark ? '#EFE4D6' : '#2A1A10', sub = dark ? '#A99683' : '#6B5545', acc = PAL[pal % 5][1], fsz = SZ[fs][1];
    const priceNote = !loaded ? 'Цены не загружены' : T.err ? T.err : 'Прайс' + (par['дата_прайса'] ? ' от ' + par['дата_прайса'] : '') + (at ? ' · загружен ' + dstr(at) : '');
    const qr = (key, name, note) => { const has = !!lsGet('jal_qr_' + key);
      return { name, note: has ? 'загружен' + (note ? ', ' + note : '') : 'не загружен', btn: has ? 'Заменить' : 'Загрузить', pick: () => pickImage('jal_qr_' + key, render),
        thumb: 'width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; border: 1.5px ' + (has ? 'solid var(--dk)' : 'dashed var(--line)') + '; color: ' + (has ? 'var(--dk)' : 'var(--m3)') }; };
    const vm = {
      go: JalScreen.go, cartCount: JalCart.count(), rootCls: '',
      driveLabel: T.drv ? 'Обновляю…' : 'Обновить файлы с диска',
      driveRefresh: async () => { if (T.drv) return; T.drvErr = ''; T.drvOk = ''; T.drv = true; render();
        try { const r = await JalDrive.refresh(); T.drvOk = 'Готово: файлов ' + r.files + ', текстов ' + r.tpl; } catch (e) { T.drvErr = 'Не получилось: ' + (e.message || e); } T.drv = false; render(); },
      driveNote: T.drvErr || T.drvOk || (JalDrive.at() ? 'Обновлено ' + dstr(JalDrive.at()) : 'Ещё не обновляли: пока берутся загруженные вручную файлы и стандартные тексты'),
      driveNoteStyle: 'font-size: 13px; color: ' + (T.drvErr ? '#B3261E' : (T.drvOk || JalDrive.at() ? '#1E6B24' : 'var(--m1)')),
      tabs: ['Цены', 'Прибыль', 'Документы', 'Вид', 'Данные'].map((n, i) => ({ name: n, pick: () => { set({ tab: i }); window.scrollTo(0, 0); },
        style: 'min-height: 48px; border: 0; background: transparent; padding: 0 2px; font-size: 13px; text-align: center; border-bottom: 3px solid ' + (T.tab === i ? 'var(--ac)' : 'transparent') + '; font-weight: ' + (T.tab === i ? 800 : 600) + '; color: ' + (T.tab === i ? 'var(--ink)' : 'var(--m3)') })),
      tab0: T.tab === 0, tab1: T.tab === 1, tab2: T.tab === 2, tab3: T.tab === 3, tab4: T.tab === 4,
      priceUrl: T.url, setPriceUrl: e => { T.url = e.target.value; }, loadLabel: T.busy ? 'Загружаю…' : 'Загрузить',
      loadPrices: async () => { const u = T.url.trim(); if (!u || T.busy) return; T.err = ''; set({ busy: true });
        try { await A.fetchPrices(u); T.err = ''; } catch (e) { T.err = 'Не получилось: ' + (e.message || e); } T.busy = false; render(); },
      pickFile: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx'; i.onchange = () => { if (i.files[0]) A.loadFile(i.files[0]); }; i.click(); },
      priceNote, priceNoteStyle: 'font-size: 13px; color: ' + (!loaded || T.err ? '#B3261E' : '#1E6B24'),
      stockUrl, setStockUrl: e => { lsSet('jal_stock_url', e.target.value.trim()); try { localStorage.removeItem('jal_stock_cache'); } catch (x) {} },
      stockNote: stockAt ? 'Загружено ' + dstr(stockAt) : (stockUrl ? 'Загрузится при следующем открытии расчёта' : 'Пусто: берутся данные из последней сохранённой выгрузки'),
      fxAutoPick: () => { lsSet('jal_fx_auto', '1'); relo(); render(); }, fxManPick: () => { lsSet('jal_fx_auto', '0'); relo(); render(); },
      fxAutoStyle: 'height: 46px; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); font-size: 15px; font-weight: 700; width: 100%; box-sizing: border-box; justify-content: center; background: ' + (fxAuto ? 'var(--sel)' : 'var(--chip)') + '; border: 2px solid ' + (fxAuto ? 'var(--ac)' : 'transparent'),
      fxManStyle: 'height: 46px; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; color: var(--ink); font-size: 15px; font-weight: 700; width: 100%; box-sizing: border-box; justify-content: center; background: ' + (fxAuto ? 'var(--chip)' : 'var(--sel)') + '; border: 2px solid ' + (fxAuto ? 'transparent' : 'var(--ac)'),
      fxVal: fxAuto ? (par['курс_usd'] != null ? fmt(par['курс_usd']) : '') : (fxVal || (par['курс_usd'] != null ? fmt(par['курс_usd']) : '')),
      setFx: e => { lsSet('jal_fx', e.target.value); relo(); },
      fxInput: 'width: 100px; height: 48px; border: 1.5px solid #E3D5C3; border-radius: 10px; padding: 0 10px; font-size: 16px; font-weight: 700; box-sizing: border-box; text-align: right; color: var(--ink); background: var(--card); ' + (fxAuto ? 'opacity: 0.6' : ''),
      fxNote: fxAuto ? 'Берётся из таблицы цен (лист «Параметры»), вместе с остальными ценами. Сейчас ' + (par['курс_usd'] != null ? fmt(par['курс_usd']) + ' ₽' : 'не загружен') + '.' : 'Курс задан вручную: цены Амиго считаются по нему, пока не вернёте «Автоматически».',
      queueNote: 'Очередь пуста. Отправку КП, замерника и договора добавим вместе с отправкой в мессенджер.',
      sendQueue: () => alert('Очереди пока нет: отправку добавим следующим шагом.'),
      params, rt, setRt,
      profitOn, profitStyle: row(profitOn), profitBox: box(profitOn), profitMark: profitOn ? '✓' : '', toggleProfit: () => { A.setShow(!st.show); render(); },
      fpOn, toggleFp: () => { if (fpOn) { JalLock.fpOff(); render(); return; }
        if (!pinOn) { alert('Сначала включи PIN: отпечаток работает вместе с ним.'); return; }
        JalLock.fpRegister().then(render).catch(e => alert('Отпечаток не включился: ' + (e && e.message ? e.message : 'отменено'))); }, fpStyle: row(fpOn), fpBox: box(fpOn), fpMark: fpOn ? '✓' : '',
      pinOn, togglePin: () => { if (pinOn) { JalLock.off(); render(); } else if (JalLock.hasPin()) { JalLock.on(); render(); } else JalLock.setPin(render); }, pinStyle: row(pinOn), pinBox: box(pinOn), pinMark: pinOn ? '✓' : '',
      changePin: () => JalLock.setPin(render),
      mpSups,
      qrs: [qr('pay', 'Оплата (СБП)', 'для замерника и доплат'), qr('ya', 'Отзывы на Яндексе', ''), qr('av', 'Отзывы на Авито', '')],
      hasSign: !!lsGet('jal_sign'), signSrc: lsGet('jal_sign'), pickSign: () => pickImage('jal_sign', render),
      hasStamp: !!lsGet('jal_stamp'), stampSrc: lsGet('jal_stamp'), pickStamp: () => pickImage('jal_stamp', render),
      reqFields: [['phone', 'Телефон'], ['address', 'Адрес'], ['site', 'Сайт'], ['email', 'E-mail'], ['signer', 'Подписант (в КП)'], ['req', 'Строка реквизитов внизу КП']].map(f => ({ label: f[1], value: JalDocScreens.C[f[0]] || '',
        set: e => { JalDocScreens.C[f[0]] = e.target.value; let o = {}; try { o = JSON.parse(lsGet('jal_req') || '{}'); } catch (x) {} o[f[0]] = e.target.value; lsSet('jal_req', JSON.stringify(o)); } })),
      themes: [['Дневной', 'day'], ['Ночной', 'night'], ['Как в телефоне', 'auto']].map(t => ({ name: t[0], pick: () => { saveTheme({ theme: t[1] }); render(); }, style: seg((th.theme || 'day') === t[1]) })),
      palettes: PAL.map((p, i) => ({ name: p[0], mark: pal === i ? '✓' : '', pick: () => { saveTheme({ pal: i }); render(); },
        style: 'width: 44px; height: 44px; border-radius: 22px; border: ' + (pal === i ? '3px solid var(--ink)' : '3px solid transparent') + '; background: ' + p[1] + '; display: flex; align-items: center; justify-content: center; padding: 0' })),
      sizes: SZ.map((z, i) => ({ name: z[0], pick: () => { saveTheme({ fs: i }); render(); }, style: seg(fs === i) })),
      fonts: FN.map((f, i) => { const o = font === i; return { name: f[0], on: o, mark: o ? '●' : '', pick: () => { saveTheme({ font: i }); render(); },
        box: 'width: 22px; height: 22px; box-sizing: border-box; border-radius: 11px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #FFFFFF; border: 2px solid ' + (o ? 'var(--ac)' : 'var(--chk)') + '; background: ' + (o ? 'var(--ac)' : 'transparent'),
        style: 'height: 46px; border: 0; border-radius: 12px; display: flex; align-items: center; gap: 12px; padding: 0 12px; font-size: 15px; text-align: left; color: var(--ink); font-family: ' + f[1] + '; font-weight: ' + (o ? 700 : 400) + '; background: ' + (o ? 'var(--sel)' : 'var(--chip)') }; }),
      pvBox: 'border-radius: 14px; overflow: hidden; border: 1px solid #E3D5C3; background: ' + bg + '; color: ' + tx + '; font-size: ' + fsz + 'px; font-family: ' + FN[font][1],
      pvHead: 'background: ' + acc + '; color: #FFFFFF; padding: 12px 14px; font-weight: 700; font-size: ' + (fsz + 3) + 'px',
      pvCard: 'background: ' + card + '; border-radius: 12px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.15)',
      pvSub: 'color: ' + sub + '; font-size: ' + (fsz - 2) + 'px; margin-top: 2px',
      pvBtn: 'background: ' + acc + '; color: #FFFFFF; border-radius: 12px; height: 46px; display: flex; align-items: center; justify-content: center; font-weight: 700',
      dbNote: 'Заказы хранятся в этом телефоне: ' + orders.length + ' ' + (orders.length % 10 === 1 && orders.length % 100 !== 11 ? 'заказ' : 'заказов') + ', ' + vers + ' версий документов.',
      exportDb: () => { const blob = new Blob([JSON.stringify({ app: 'zhaluzi', at: new Date().toISOString(), orders: JalOrders.load() }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'zhaluzi-zakazy-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); },
      importDb: () => pickJson(txt => { let j; try { j = JSON.parse(txt); } catch (e) { alert('Это не файл заказов'); return; }
        const list = Array.isArray(j) ? j : j.orders; if (!Array.isArray(list) || list.some(o => !o || !o.no || !o.items)) { alert('Это не файл заказов'); return; }
        if (!confirm('Загрузить заказов: ' + list.length + '. Заказы с теми же номерами заменятся.')) return;
        const cur = JalOrders.load().filter(o => !list.some(x => x.no === o.no)); lsSet('jal_orders', JSON.stringify(list.concat(cur))); render(); }),
      sched: ['Выкл.', 'Каждую ночь', 'Раз в неделю'].map((n, i) => ({ name: n, pick: () => { lsSet('jal_sched', String(i)); set({ sched: i }); }, style: seg(T.sched === i) })),
      driveNow: async () => { T.arch = 'Сохраняю…'; T.archBad = false; render(); try { const n = await JalDrive.backup(); T.arch = 'Общая база обновлена, заказов: ' + n; } catch (e) { T.arch = e.message || String(e); T.archBad = true; } render(); },
      driveRestore: async () => { T.arch = 'Загружаю…'; T.archBad = false; render(); try { const n = await JalDrive.restore(); T.arch = 'Общая база обновлена, заказов: ' + n; } catch (e) { T.arch = e.message || String(e); T.archBad = true; } render(); },
      archNote: T.arch || (JalDrive.backupAt() ? 'Последняя копия: ' + dstr(JalDrive.backupAt()) : 'Архив в Диск ещё не делался'),
      archStyle: 'font-size: 13px; color: ' + (T.archBad ? '#B3261E' : 'var(--m1)')
    };
    function relo() { try { const raw = JSON.parse(lsGet('jal_prices') || 'null'); if (raw) A.setPricesRaw(raw); } catch (e) {} }
    scr.render(vm);
  }
  window.JalSettingsScreen = { render };
})();
