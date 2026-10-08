/* Календарь: неделя, цвета как в Google Calendar Андрея (замер жёлтый, рабочее синее, личное зелёное) */
(function () {
  const A = App, D = A.D, e = A.esc;
  A.module('calendar', {
    render() {
      const days = ['Пн 5', 'Вт 6', 'Ср 7', 'Чт 8', 'Пт 9', 'Сб 10', 'Вс 11'], hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      let g = '<div class="h"></div>' + days.map((d, i) => '<div class="h' + (i === 3 ? ' today' : '') + '">' + d + '</div>').join('');
      hours.forEach(h => {
        g += '<div class="tm">' + h + ':00</div>';
        for (let d = 0; d < 7; d++) {
          const evs = D.events.filter(x => x.d === d && parseInt(x.t, 10) === h);
          g += '<div class="' + (d === 3 ? 'today' : '') + '">' + evs.map(x => '<div class="ev ' + x.kind + '" data-a="stub" data-t="карточка события">' + x.t + ' ' + e(x.txt) + '</div>').join('') + '</div>';
        }
      });
      return '<div class="head"><h1>Календарь</h1><div class="seg"><button>День</button><button class="on">Неделя</button><button>Месяц</button></div><span class="pill">5–11 октября 2026</span><div class="sp"></div>' +
        '<span class="pill warn">замер</span><span class="pill info">рабочее</span><span class="pill ok">личное</span><button class="btn" data-a="stub" data-t="синхронизация с Google Calendar">Синхронизация с Google</button><button class="btn pri" data-a="stub" data-t="новое событие">' + A.icon('plus', 16) + ' Событие</button></div>' +
        '<div class="cal">' + g + '</div><p class="mut">Замеры, доставки и монтажи привязываются к заказу и клиенту. Синхронизация с Google Calendar двусторонняя (этап 2).</p>';
    }
  });
})();
