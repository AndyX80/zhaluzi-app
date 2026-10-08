/* Документы, Справочники, Настройки */
(function () {
  const A = App, S = A.S, e = A.esc;
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
  A.module('settings', {
    render() {
      return '<div class="head"><h1>Настройки</h1></div><div class="g2"><div class="card"><h2>Вид</h2><div class="stack" style="gap:12px;margin-top:10px"><div class="field"><label>Тема</label><div class="seg">' + [['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Как в системе']].map(x => '<button class="' + (S.theme === x[0] ? 'on' : '') + '" data-a="sth" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div><div class="field"><label>Меню слева</label><div class="seg"><button class="' + (!S.collapsed ? 'on' : '') + '" data-a="scol" data-v="0">Развёрнуто</button><button class="' + (S.collapsed ? 'on' : '') + '" data-a="scol" data-v="1">Свёрнуто</button></div></div><p class="mut">Режимы работы переключаются сверху или Alt+1…6. Цвета и шрифты уточним после согласования каркаса.</p></div></div>' +
        '<div class="card"><h2>Подключения</h2><table class="tbl" style="margin-top:6px"><tbody>' + INTEG.map(i => '<tr><td>' + i[0] + '</td><td class="r"><span class="pill ' + (i[1].indexOf('работает') === 0 ? 'ok' : '') + '">' + i[1] + '</span></td></tr>').join('') + '</tbody></table></div>' +
        '<div class="card"><h2>Данные</h2><p class="mut">Сейчас на экране демонстрационные данные. На этапе 1 включается общая база с телефоном, на этапе 2 импорт «Учёт заказов» с начала 2026 года.</p><button class="btn" data-a="sreset">Сбросить состояние вкладок</button></div>' +
        '<div class="card"><h2>Безопасность</h2><p class="mut">Вход: логин и ПИН. Пользователь один (владелец), роли заложены в модель данных. Закуп и прибыль видны только владельцу.</p></div></div>';
    }
  });
  A.act.sth = el => { S.theme = el.dataset.v; A.save(); A.render(); };
  A.act.scol = el => { S.collapsed = el.dataset.v === '1'; A.save(); A.render(); };
  A.act.sreset = () => { try { localStorage.removeItem('jald_state_v1'); } catch (x) {} location.reload(); };
})();
