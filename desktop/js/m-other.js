/* Документы, Справочники, Настройки */
(function () {
  const D = window.DEMO, A = App, S = A.S, e = A.esc;
  const DOCS = [['Коммерческое предложение (КП)', 'phone', 'Перенос из телефона'], ['КП: три варианта', 'phone', 'Перенос из телефона'], ['Замерный лист', 'phone', 'Перенос из телефона'], ['Договор и приложение', 'phone', 'Перенос из телефона'],
    ['Счёт на оплату', 'later', 'Позже, с передачей в Эльбу'], ['УПД', 'later', 'Позже, с передачей в Эльбу и Диадок'], ['Акт', 'later', 'Редко нужен'], ['Гарантийный талон', 'later', 'Редко нужен'], ['Отчёт за месяц', 'later', 'Как ваш дашборд в разрезе месяца'], ['Заказ поставщику (шпаргалка)', 'later', 'Позиции для ввода в кабинете поставщика']];
  A.module('docs', {
    render() {
      return '<div class="head"><h1>Документы</h1><div class="sp"></div><span class="pill">шаблоны</span></div><div class="card p0"><table class="tbl"><thead><tr><th>Документ</th><th>Статус</th><th>Примечание</th><th></th></tr></thead><tbody>' + DOCS.map(d => '<tr><td class="b">' + d[0] + '</td><td><span class="pill ' + (d[1] === 'phone' ? 'ok' : '') + '">' + (d[1] === 'phone' ? 'есть в телефоне' : 'в планах') + '</span></td><td class="mut">' + d[2] + '</td><td class="r"><button class="btn sm" data-a="stub" data-t="шаблон документа">Открыть</button></td></tr>').join('') + '</tbody></table></div>';
    }
  });
  const SUP = [['Амиго', 'Стандарт', 'Основной поставщик', 'тайваньская'], ['Интерьер', 'Классик', '', 'голландская'], ['РДО', 'Урбан', '', 'тайваньская'], ['Форум', 'Тренд', 'доставка бесплатно', 'голландская'], ['Уют', 'Премиум', 'доставка бесплатно', 'голландская'], ['ТСК', '—', 'другие товары', ''], ['Павел м/с', '—', 'москитные сетки', '']];
  A.module('refs', {
    render() {
      const t = S.refTab, tabs = [['sup', 'Поставщики'], ['price', 'Каталог и цены'], ['stock', 'Наличие'], ['lim', 'Ограничения размеров'], ['cats', 'Категории и источники']];
      let b = '';
      if (t === 'sup') b = '<table class="tbl"><thead><tr><th>Поставщик</th><th>Коллекция</th><th>Условия</th><th>Фурнитура</th></tr></thead><tbody>' + SUP.map(s => '<tr><td class="b">' + s[0] + '</td><td>' + s[1] + '</td><td class="mut">' + s[2] + '</td><td>' + s[3] + '</td></tr>').join('') + '</tbody></table>';
      else if (t === 'price') b = '<div class="callout info">Цены пока живут в Google Таблице «Цены для приложения» и подтягиваются в приложение. Редактор цен и наценок в самой системе появится позже. Таблица «Закуп 1000×1000» и лист «Опт» уже работают.</div>';
      else if (t === 'stock') b = '<p class="mut">Наличие цветов у поставщиков: зелёный, жёлтый, красный индикатор в выборе цвета. Источник: выгрузки поставщиков.</p>';
      else if (t === 'lim') b = '<p class="mut">Таблица ограничений размеров по всем позициям (поставщик × материал × ламель × управление) переносится из телефона, плюс справка по модели в расчёте.</p>';
      else b = '<div class="g2"><div><h3>Категории</h3><div class="chips" style="margin-top:8px">' + ['Дерево', 'ГЖ', 'РШ', 'ВЖ', 'Плиссе', 'М/С', 'Римки', 'Разное'].map(x => '<span class="pill">' + x + '</span>').join('') + '</div></div><div><h3>Источники клиентов</h3><div class="chips" style="margin-top:8px">' + ['Авито', 'Сайт', 'Сарафан', 'Telegram', 'ВКонтакте', 'Яндекс Карты', 'Повторный', 'Другое'].map(x => '<span class="pill">' + x + '</span>').join('') + '</div></div></div>';
      return '<div class="head"><h1>Справочники</h1></div><div class="card"><div class="itabs">' + tabs.map(x => '<button class="' + (t === x[0] ? 'on' : '') + '" data-a="rtab" data-t="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' + b + '</div>';
    }
  });
  A.act.rtab = el => { S.refTab = el.dataset.t; A.save(); A.render(); };

  const INTEG = [['Google Таблицы (цены)', 'работает в телефоне'], ['Google Calendar', 'этап 2'], ['Эльба (Контур)', 'этап 3'], ['Диадок', 'этап 3'], ['Почта (письма клиентам)', 'работает в телефоне'], ['Telegram, MAX', 'отправка документов, этап 1']];
  const dataCard = () => {
    const real = window.DB && DB.real, n = real ? D.orders.length : 0;
    return (real ? '<p class="mut">В базе: заказов ' + n + ', клиентов ' + D.clients.length + ', операций ' + D.ops.length + (DB.at ? '. Сохранено ' + new Date(DB.at).toLocaleString('ru-RU') : '') + '. Данные хранятся только в этом браузере.</p>' : '<p class="mut">Сейчас на экране демонстрационные данные. Загрузи «Учёт заказов.xlsm» — подтянутся заказы, клиенты и доходы-расходы с 2024 года.</p>') +
      '<div class="stack" style="gap:8px;margin-top:10px"><label class="btn">Загрузить Excel (.xlsm)<input type="file" accept=".xlsm,.xlsx" data-file="xls" hidden></label>' +
      '<div class="field"><label>Ссылка на скрипт (та же, что «Цены» на телефоне)</label><input id="scr" value="' + e(DB.scriptUrl()) + '" placeholder="https://script.google.com/…?key=…" data-file="url"></div>' +
      '<button class="btn" data-a="phsync">Синхронизировать заказы с телефоном</button><p class="mut">' + (+localStorage.getItem('jald_ph_at') ? 'Последняя синхронизация: ' + new Date(+localStorage.getItem('jald_ph_at')).toLocaleString('ru-RU') : 'Заказы с телефона подтянутся из общей базы на Google Диске.') + '</p>' +
      (real ? '<button class="btn" data-a="dbexp">Скачать копию базы (файл)</button>' : '') +
      '<label class="btn">Загрузить копию базы<input type="file" accept=".json" data-file="json" hidden></label>' +
      (real ? '<button class="btn" data-a="dbclr">Удалить базу и вернуть демо</button>' : '') +
      '<button class="btn" data-a="sreset">Сбросить состояние вкладок</button></div>';
  };
  A.module('settings', {
    render() {
      return '<div class="head"><h1>Настройки</h1></div><div class="g2"><div class="card"><h2>Вид</h2><div class="stack" style="gap:12px;margin-top:10px"><div class="field"><label>Тема</label><div class="seg">' + [['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Как в системе']].map(x => '<button class="' + (S.theme === x[0] ? 'on' : '') + '" data-a="sth" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div><div class="field"><label>Меню слева</label><div class="seg"><button class="' + (!S.collapsed ? 'on' : '') + '" data-a="scol" data-v="0">Развёрнуто</button><button class="' + (S.collapsed ? 'on' : '') + '" data-a="scol" data-v="1">Свёрнуто</button></div></div><p class="mut">Режимы работы переключаются сверху или Alt+1…6. Цвета и шрифты уточним после согласования каркаса.</p></div></div>' +
        '<div class="card"><h2>Подключения</h2><table class="tbl" style="margin-top:6px"><tbody>' + INTEG.map(i => '<tr><td>' + i[0] + '</td><td class="r"><span class="pill ' + (i[1].indexOf('работает') === 0 ? 'ok' : '') + '">' + i[1] + '</span></td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Данные</h2>' + dataCard() + '</div>' +
        '<div class="card"><h2>Безопасность</h2><p class="mut">Вход: логин и ПИН. Пользователь один (владелец), роли заложены в модель данных. Закуп и прибыль видны только владельцу.</p></div></div>';
    }
  });
  A.act.sth = el => { S.theme = el.dataset.v; A.save(); A.render(); };
  A.act.scol = el => { S.collapsed = el.dataset.v === '1'; A.save(); A.render(); };
  A.act.phsync = () => {
    const u = document.getElementById('scr'); if (u && u.value.trim()) { try { localStorage.setItem('jal_prices_url', u.value.trim()); } catch (x) {} }
    if (!D.real) { A.toast('Сначала загрузи Excel'); return; }
    A.toast('Синхронизирую…'); DB.syncPhone().then(n => { A.toast('Готово, заказов с телефона: ' + n); A.render(); }).catch(x => A.toast('Ошибка: ' + x.message));
  };
  A.act.dbexp = () => { const u = URL.createObjectURL(new Blob([DB.exportJson()], { type: 'application/json' })), a = document.createElement('a'); a.href = u; a.download = 'jalousie-base-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); };
  A.act.dbclr = () => { if (!A.S.dbclr) { A.S.dbclr = 1; A.toast('Нажми ещё раз, чтобы удалить базу'); setTimeout(() => { A.S.dbclr = 0; }, 4000); return; } DB.clear(); location.reload(); };
  document.addEventListener('change', ev => {
    const f = ev.target && ev.target.dataset && ev.target.dataset.file, file = ev.target && ev.target.files && ev.target.files[0]; if (!f || !file) return;
    if (f === 'xls') DB.readFile(file).then(d => { DB.apply(d); DB.save(); A.toast('Загружено: заказов ' + d.orders.length); location.reload(); }).catch(x => A.toast('Ошибка: ' + x.message));
    else { const r = new FileReader(); r.onload = () => { try { DB.importJson(r.result); location.reload(); } catch (x) { A.toast('Ошибка: ' + x.message); } }; r.readAsText(file); }
  });
  A.act.sreset = () => { try { localStorage.removeItem('jald_state_v1'); } catch (x) {} location.reload(); };
})();
