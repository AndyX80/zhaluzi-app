/* Продажи и расчёт: слева набирается текущее изделие, справа корзина, справка по модели под рукой.
   Цены здесь демонстрационные: настоящий расчёт переносится из телефонной версии на этапе 1. */
(function () {
  const A = App, S = A.S, e = A.esc, m = A.money;
  const F = { coll: 'Стандарт', lam: '50', mat: 'Дерево', color: 0, w: '1200', h: '1500', qty: 1, ctrl: 'TR', opts: {}, comment: '', own: '' };
  const COLLS = [['Стандарт', 'Amigo'], ['Классик', 'Интерьер'], ['Урбан', 'РДО'], ['Тренд', 'Foroom'], ['Премиум', 'Уют']];
  const COLORS = [['Белый', 'павловния', 'g'], ['Слоновая кость', 'павловния', 'g'], ['Липа натуральная', 'липа', 'y'], ['Орех', 'липа', 'g'], ['Венге', 'липа', 'r']];
  const CTRL = { TR: 'Подъём справа, поворот слева', TL: 'Подъём слева, поворот справа', L: 'Подъём и поворот слева', R: 'Подъём и поворот справа' };
  const OPTS = ['Тесьма', 'Струна', 'Уголки', 'Цепочка'];
  const area = () => Math.max((+F.w || 0) * (+F.h || 0) / 1e6, 0.8);
  const price = () => { const a = area(), base = (F.lam === '25' ? 5200 : 6100) + (F.mat === 'Бамбук' ? 600 : 0) + COLLS.map(c => c[0]).indexOf(F.coll) * 900; let p = base * a + Object.keys(F.opts).filter(k => F.opts[k]).length * 700; if (S.region) p *= 0.88; return Math.ceil(p / 100) * 100; };
  const hasOwn = () => F.own !== '' && !isNaN(+F.own) && +F.own >= 0;
  const unit = () => hasOwn() ? Math.round(+F.own) : price();
  const costOf = () => Math.round(price() * 0.62);
  const seg = (k, vals) => '<div class="seg">' + vals.map(v => '<button class="' + (F[k] === v[0] ? 'on' : '') + '" data-a="cf" data-k="' + k + '" data-v="' + v[0] + '">' + v[1] + '</button>').join('') + '</div>';

  function form() {
    const sup = COLLS.filter(c => c[0] === F.coll)[0][1], col = COLORS[F.color];
    return '<div class="card"><h2>Текущее изделие</h2><div class="stack" style="gap:12px;margin-top:10px">' +
      '<div class="field"><label>Группа товара</label><select class="in" data-c="cf" data-k="group"><option>Горизонтальные деревянные жалюзи</option><option disabled>Рулонные шторы (скоро)</option><option disabled>Зебра (скоро)</option><option disabled>Плиссе (скоро)</option><option disabled>Вертикальные (скоро)</option></select></div>' +
      '<div class="field"><label>Коллекция</label><div class="chips">' + COLLS.map(c => '<button class="opt ' + (F.coll === c[0] ? 'on' : '') + '" data-a="cf" data-k="coll" data-v="' + c[0] + '">' + c[0] + ' (' + c[1] + ')</button>').join('') + '</div></div>' +
      '<div class="row wrap"><div class="field"><label>Ламель, мм</label>' + seg('lam', [['25', '25'], ['50', '50']]) + '</div><div class="field"><label>Материал</label>' + seg('mat', [['Дерево', 'Дерево'], ['Бамбук', 'Бамбук']]) + '</div></div>' +
      '<div class="field"><label>Цвет</label><select class="in" data-c="cf" data-k="color">' + COLORS.map((c, i) => '<option value="' + i + '"' + (F.color == i ? ' selected' : '') + '>' + (c[2] === 'r' ? '● ' : c[2] === 'y' ? '◐ ' : '● ') + c[0] + ' (' + c[1] + ')' + (c[2] === 'r' ? ' — нет на складе' : '') + '</option>').join('') + '</select></div>' +
      '<div class="g2"><div class="field"><label>Ширина, мм</label><input class="in" type="number" value="' + e(F.w) + '" data-c="cf" data-k="w"></div><div class="field"><label>Высота, мм</label><input class="in" type="number" value="' + e(F.h) + '" data-c="cf" data-k="h"></div></div>' +
      '<div class="field"><label>Управление</label><div class="chips">' + Object.keys(CTRL).map(k => '<button class="opt ' + (F.ctrl === k ? 'on' : '') + '" data-a="cf" data-k="ctrl" data-v="' + k + '">' + CTRL[k] + '</button>').join('') + '</div></div>' +
      '<div class="field"><label>Опции</label><div class="chips">' + OPTS.map(o => '<button class="opt ' + (F.opts[o] ? 'on' : '') + '" data-a="copt" data-v="' + o + '">' + o + '</button>').join('') + '</div></div>' +
      '<div class="row"><div class="field" style="width:100px"><label>Кол-во</label><input class="in" type="number" min="1" value="' + F.qty + '" data-c="cf" data-k="qty"></div><div class="field" style="flex:1"><label>Комментарий к позиции</label><input class="in" value="' + e(F.comment) + '" data-c="cf" data-k="comment"></div></div>' +
      '<div class="row wrap"><div class="field" style="width:190px"><label>Цена по прайсу, за шт</label><div class="in num" style="display:flex;align-items:center;background:var(--bg2,transparent)">' + m(price()) + '</div></div><div class="field" style="width:190px"><label>Своя цена, за шт (любая)</label><input class="in num" type="number" min="0" placeholder="как в прайсе" value="' + e(F.own) + '" data-c="cf" data-k="own"></div>' + (hasOwn() ? '<button class="btn sm ghost" data-a="cown0" title="Вернуть цену по прайсу">Сбросить</button>' : '') + '</div>' +
      (hasOwn() && unit() < costOf() ? '<div class="warn" style="color:var(--bad,#d33);font-size:13px">Ниже закупа: убыток ' + m((costOf() - unit()) * (+F.qty || 1)) + ' на позицию. Можно добавить, это ваше решение.</div>' : '') +
      '<div class="row"><div><small class="mut">Площадь ' + area().toFixed(2) + ' м²' + (hasOwn() ? ' · своя цена' : '') + '</small><div style="font-size:24px;font-weight:700" class="num">' + m(unit() * (+F.qty || 1)) + '</div></div><span class="sp"></span><button class="btn pri" data-a="cadd" style="height:42px;padding:0 22px">В корзину</button></div></div></div>' +
      '<div class="card refp" style="margin-top:14px"><div class="row"><h2>Справка по модели</h2><span class="soon">данные из справочника</span><span class="sp"></span><button class="btn sm ghost" data-a="cref">' + (S.refOpen ? 'Свернуть' : 'Развернуть') + '</button></div>' +
      (S.refOpen ? '<dl style="margin-top:10px"><dt>Коллекция</dt><dd>' + F.coll + ' (' + sup + ')</dd><dt>Размеры</dt><dd>ширина 250–2400 мм, высота до ' + (F.lam === '25' ? '2500' : '3000') + ' мм</dd><dt>Минимальная площадь</dt><dd>0,8 м² (меньше — считается как 0,8)</dd><dt>Фурнитура</dt><dd>' + (F.coll === 'Стандарт' || F.coll === 'Урбан' ? 'тайваньская (дешевле)' : 'голландская') + '</dd><dt>Срок</dt><dd>' + (F.coll === 'Стандарт' ? '≈ 5 дней' : '≈ 10–12 дней') + '</dd><dt>Наличие цвета</dt><dd><span class="dotc ' + col[2] + '"></span>' + e(col[0]) + ': ' + (col[2] === 'g' ? 'есть' : col[2] === 'y' ? 'мало' : 'нет') + '</dd><dt>Нюансы</dt><dd>Тесьма только на 50 мм. Привод требует ширину от 700 мм.</dd></dl>' : '') + '</div>';
  }

  function cart() {
    const items = S.cart, sum = items.reduce((a, i) => a + i.price * i.qty, 0);
    const dv = Math.min(+S.disc || 0, 50), dAmt = Math.round(sum * dv / 100 / 100) * 100, total = sum - dAmt, cost = items.reduce((a, i) => a + i.cost * i.qty, 0);
    const delivery = S.region ? 0 : (items.length ? 1500 : 0);
    return '<div class="card"><div class="row wrap" style="margin-bottom:10px"><h2>Корзина</h2><span class="pill">' + items.length + ' поз.</span><span class="sp"></span>' +
      '<div class="seg" title="СПб: розница с доставкой и монтажом. Регионы: опт без доставки и монтажа"><button class="' + (!S.region ? 'on' : '') + '" data-a="creg" data-v="0">СПб</button><button class="' + (S.region ? 'on' : '') + '" data-a="creg" data-v="1">Регионы</button></div>' +
      '<button class="btn sm ' + (S.hideProfit ? 'on' : '') + '" data-a="chide" title="Скрыть закуп и прибыль, когда клиент смотрит экран">Скрыть закуп</button></div>' +
      (items.length ? '<table class="tbl cartline"><thead><tr><th>№</th><th>Изделие</th><th>Размер</th><th class="r">Шт</th><th class="r">Цена</th><th class="r">Сумма</th><th></th></tr></thead><tbody>' + items.map((i, n) =>
        '<tr><td>' + (n + 1) + '</td><td><b>' + e(i.name) + '</b><div class="mut" style="font-size:12px">' + e(i.sub) + '</div></td><td class="num">' + i.w + '×' + i.h + '</td><td class="r">' + i.qty + '</td><td class="r"><input class="in num" type="number" min="0" style="width:96px;text-align:right' + (i.price < i.cost ? ';color:var(--bad,#d33)' : '') + '" value="' + i.price + '" data-c="cprice" data-i="' + n + '" title="Цена за штуку, можно менять"></td><td class="r num">' + m(i.price * i.qty) + (i.price !== i.list ? '<div class="mut" style="font-size:11px">' + (i.price < i.cost ? 'ниже закупа' : 'своя цена') + (i.list ? ', прайс ' + m(i.list) : '') + '</div>' : '') + '</td><td class="r"><button class="x" data-a="cdel" data-i="' + n + '" title="Удалить">' + A.icon('trash', 15) + '</button></td></tr>').join('') + '</tbody></table>' :
        '<div class="empty" style="padding:30px">Корзина пуста. Соберите изделие слева и нажмите «В корзину».</div>') +
      '<div class="stack" style="gap:10px;margin-top:14px">' +
      (S.region ? '<div class="field"><label>Адрес ПВЗ и транспортная компания</label><textarea class="in" rows="2" data-c="cpvz" placeholder="Например: СДЭК, Казань, ул. Баумана 1, ПВЗ KZN12">' + e(S.pvz || '') + '</textarea></div><div class="mut" style="font-size:12px">В опте доставка и монтаж в стоимость заказа не входят.</div>' :
        '<div class="row"><label style="flex:1">Доставка и установка (размазывается по позициям)</label><input class="in" style="width:130px;text-align:right" value="' + (items.length ? 4500 : 0) + '" data-c="cstub"></div>') +
      '<div class="row"><label style="flex:1">Скидка на заказ, % (не больше 50)</label><input class="in" type="number" min="0" max="50" style="width:130px;text-align:right" value="' + (S.disc || '') + '" data-c="cdisc" placeholder="0"></div></div>' +
      '<div class="sumbar" style="grid-template-columns:repeat(' + (S.hideProfit ? 2 : 4) + ',1fr)"><div><small>Сумма без скидки</small><b>' + m(sum) + '</b></div><div><small>Итого' + (dAmt ? ' (скидка −' + m(dAmt) + ')' : '') + '</small><b style="color:var(--acc)">' + m(total) + '</b></div>' +
      (S.hideProfit ? '' : '<div><small>Закуп (демо)</small><b>' + m(cost) + '</b></div><div><small>Прибыль (демо)</small>' + '<b' + (total - cost < 0 ? ' style="color:var(--bad,#d33)"' : '') + '>' + m(total - cost - delivery * 0) + '</b></div>') + '</div>' +
      '<div class="row wrap" style="margin-top:14px"><button class="btn" data-a="stub" data-t="КП">КП</button><button class="btn" data-a="stub" data-t="три варианта КП">КП: три варианта</button><button class="btn" data-a="stub" data-t="замерный лист">Замерник</button><button class="btn" data-a="stub" data-t="договор">Договор</button><span class="sp"></span><button class="btn pri" data-a="cord" style="height:42px;padding:0 20px">Оформить заказ</button></div></div>' +
      '<div class="card flat" style="margin-top:14px"><div class="row"><b>Клиент</b><span class="sp"></span><button class="btn sm" data-a="stub" data-t="выбор клиента">Выбрать</button><button class="btn sm" data-a="new-client">+ Новый</button></div><div class="mut" style="margin-top:4px">Заказ привязывается к клиенту. Пока клиент не выбран, это черновик расчёта.</div></div>';
  }

  A.module('calc', {
    render() { return '<div class="head"><h1>Продажи и расчёт</h1><span class="soon">цены демонстрационные, настоящий расчёт переносится из телефона на этапе 1</span></div><div class="calc"><div>' + form() + '</div><div>' + cart() + '</div></div>'; }
  });
  A.act.cf = el => { F[el.dataset.k] = el.dataset.v; if (F.lam === '25' && F.mat === 'Бамбук' && el.dataset.k === 'lam') F.mat = 'Дерево'; A.render(); };
  A.fld.cf = (v, el) => { F[el.dataset.k] = v; A.render(); };
  A.act.copt = el => { F.opts[el.dataset.v] = !F.opts[el.dataset.v]; A.render(); };
  A.act.cref = () => { S.refOpen = !S.refOpen; A.save(); A.render(); };
  A.act.creg = el => { S.region = el.dataset.v === '1'; A.save(); A.render(); };
  A.act.chide = () => { S.hideProfit = !S.hideProfit; A.save(); A.render(); };
  A.act.cdel = el => { S.cart.splice(+el.dataset.i, 1); A.save(); A.render(); };
  A.act.cadd = () => {
    const p = unit(), col = COLORS[F.color], sup = COLLS.filter(c => c[0] === F.coll)[0][1];
    S.cart.push({ name: F.mat + ' ' + F.lam + ' · ' + F.coll + ' (' + sup + ')', sub: col[0] + ' · ' + CTRL[F.ctrl] + (Object.keys(F.opts).filter(k => F.opts[k]).length ? ' · ' + Object.keys(F.opts).filter(k => F.opts[k]).join(', ') : '') + ' · ' + sup, w: F.w, h: F.h, qty: +F.qty || 1, price: p, list: price(), cost: costOf() });
    F.own = ''; A.save(); A.render(); A.toast('Добавлено в корзину');
  };
  A.act.cown0 = () => { F.own = ''; A.render(); };
  A.fld.cprice = (v, el) => { const i = S.cart[+el.dataset.i]; if (i) { i.price = Math.max(0, Math.round(+v || 0)); A.save(); A.render(); } };
  A.act.cord = () => A.stub('создание заказа из корзины (клиент, замер, документы)');
  A.fld.cpvz = v => { S.pvz = v; A.save(); };
  A.fld.cdisc = v => { S.disc = Math.max(0, Math.min(50, +v || 0)); A.save(); A.render(); };
  A.fld.cstub = () => {};
})();
