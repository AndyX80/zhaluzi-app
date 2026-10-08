/* Вес и ограничения размеров по поставщикам (перенесено из макета). */
(function(){
'use strict';
const ceil100 = (x) => Math.ceil(x / 100 - 1e-9) * 100;
const MIN_MM = 200, SPLIT25_MM = 300, MOTOR_MIN_W = 700;
// Вес по таблицам Интерьера (веревочное управление, 50 мм), приближение по формуле, погрешность до 0,3 кг. Одинаков для всех коллекций.
const WEIGHT50 = { 'Дерево': [2.2175, 0.4787, 0.0807, -0.0374], 'Бамбук': [1.8156, 0.5113, 0.0672, -0.0484] };
function weightKg(mat, lam, wmm, hmm) {
  const k = WEIGHT50[mat];
  if (lam !== 50 || !k || !(wmm > 0) || !(hmm > 0)) return 0;
  const w = wmm / 1000, h = hmm / 1000;
  return Math.max(0, k[0] * w * h + k[1] * w + k[2] * h + k[3]);
}
const fmtKg = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
// Сетки ограничений Интерьера (из таблиц поставщика): G гарантия, Y без гарантии, R невозможно. Строка = высота, символ = ширина.
const INT_GRID = {
  'Дерево 50|rope': { w: [36, 45, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270], h: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500], g: 'YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGYYY|YGGGGGGGGGGGGGGGGGGYYYYY|YGGGGGGGGGGGGGGGGYYYYYRR|YGGGGGGGGGGGGGGYYYYYRRRR|YGGGGGGGGGGGGGYYYYRRRRRR|YGGGGGGGGGGGGYYYYRRRRRRR|YGGGGGGGGGGGYYYRRRRRRRRR|YGGGGGGGGGGYYYRRRRRRRRRR|YGGGGGGGGGYYYRRRRRRRRRRR|YGGGGGGGGYYYRRRRRRRRRRRR|YGGGGGGGGYYYRRRRRRRRRRRR|YGGGGGGGYYYRRRRRRRRRRRRR|YGGGGGGGYYRRRRRRRRRRRRRR|YGGGGGGYYYRRRRRRRRRRRRRR|YGGGGGGYYRRRRRRRRRRRRRRR|YGGGGGYYYRRRRRRRRRRRRRRR|YGGGGGYYRRRRRRRRRRRRRRRR' },
  'Дерево 50|chain': { w: [42, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270], h: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500], g: 'YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGGYYY|YGGGGGGGGGGGGGGGGGYYYYYY|YGGGGGGGGGGGGGGGYYYYYYYY|YGGGGGGGGGGGGGYYYYYYYYYY|YGGGGGGGGGGGGYYYYYYYYYRR|YGGGGGGGGGGYYYYYYYYYRRRR|YGGGGGGGGGYYYYYYYYYRRRRR|YGGGGGGGGYYYYYYYYRRRRRRR|YGGGGGGGGYYYYYYYRRRRRRRR|YGGGGGGGYYYYYYYRRRRRRRRR|YGGGGGGYYYYYYYRRRRRRRRRR|YGGGGGGYYYYYYRRRRRRRRRRR|YGGGGGYYYYYYRRRRRRRRRRRR|YGGGGGYYYYYRRRRRRRRRRRRR|YGGGGYYYYYYRRRRRRRRRRRRR|YGGGGYYYYYRRRRRRRRRRRRRR|YGGGGYYYYRRRRRRRRRRRRRRR|YGGGYYYYYRRRRRRRRRRRRRRR|YGGGYYYYRRRRRRRRRRRRRRRR' },
  'Бамбук 50|rope': { w: [36, 45, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240], h: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500], g: 'YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGYY|YGGGGGGGGGGGGGGGGYYYY|YGGGGGGGGGGGGGGGYYYYY|YGGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRRR|YGGGGGGGGGGGGYYYYRRRR|YGGGGGGGGGGGYYYYRRRRR|YGGGGGGGGGGYYYYRRRRRR|YGGGGGGGGGYYYYRRRRRRR|YGGGGGGGGGYYYRRRRRRRR|YGGGGGGGGYYYRRRRRRRRR|YGGGGGGGGYYYRRRRRRRRR|YGGGGGGGYYYRRRRRRRRRR|YGGGGGGGYYYRRRRRRRRRR' },
  'Бамбук 50|chain': { w: [42, 45, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240], h: [60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460, 480, 500], g: 'YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGGG|YGGGGGGGGGGGGGGGGGGYY|YGGGGGGGGGGGGGGGGYYYY|YGGGGGGGGGGGGGGYYYYYY|YGGGGGGGGGGGGGYYYYYYY|YGGGGGGGGGGGYYYYYYYYY|YGGGGGGGGGGYYYYYYYYYY|YGGGGGGGGGYYYYYYYYYRR|YGGGGGGGGGYYYYYYYYRRR|YGGGGGGGGYYYYYYYYRRRR|YGGGGGGGYYYYYYYYRRRRR|YGGGGGGGYYYYYYYRRRRRR|YGGGGGGYYYYYYYRRRRRRR|YGGGGGGYYYYYYRRRRRRRR|YGGGGGYYYYYYRRRRRRRRR|YGGGGGYYYYYYRRRRRRRRR|YGGGGGYYYYYRRRRRRRRRR|YGGGGYYYYYYRRRRRRRRRR' },
  'Дерево 25|chain': { w: [38, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200], h: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300], g: 'YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYYRR|YGGGGGGGGGGYYYRRR|YGGGGGGGGGGYYRRRR|YGGGGGGGGGGYRRRRR|YGGGGGGGGGGRRRRRR|YYYYYYYYYYRRRRRRR|YYYYYYYYYRRRRRRRR|YYYYYYYYYRRRRRRRR|YYYYYYYYYRRRRRRRR|YYYYYYYYRRRRRRRRR' },
  'Дерево 25|rope': { w: [15, 23, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200], h: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300], g: 'YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYYRR|YGGGGGGGGGGGGGYYYRRR|YGGGGGGGGGGGGGYYRRRR|YGGGGGGGGGGGGGYRRRRR|YGGGGGGGGGGGGGRRRRRR|YYYYYYYYYYYYYRRRRRRR|YYYYYYYYYYYYRRRRRRRR|YYYYYYYYYYYYRRRRRRRR|YYYYYYYYYYYYRRRRRRRR|YYYYYYYYYYYRRRRRRRRR' },
};

function intLimits(it) {
  const key = it.mat + ' ' + it.lam + '|' + (it.opts && it.opts['Цепочка'] ? 'chain' : 'rope');
  const G = INT_GRID[key] || INT_GRID[it.mat + ' ' + it.lam + '|rope'];
  if (!G) return [];
  const wc = (Number(it.w) || 0) / 10, hc = (Number(it.h) || 0) / 10;
  const rows = G.g.split('|'), out = [];
  const wi = G.w.findIndex((x) => x >= wc), hi = G.h.findIndex((x) => x >= hc);
  if (wc && wc < G.w[0]) return [{ hard: true, t: 'ширина ' + wc + ' см меньше минимальной у Интерьера (' + G.w[0] + ' см)' }];
  if (wi < 0) return [{ hard: true, t: 'ширина ' + wc + ' см больше максимальной у Интерьера (' + G.w[G.w.length - 1] + ' см)' }];
  if (hi < 0) return [{ hard: true, t: 'высота ' + hc + ' см больше максимальной у Интерьера (' + G.h[G.h.length - 1] + ' см)' }];
  if (rows[hi][0] === 'Y' && G.w[1] && wc < G.w[1]) return [{ hard: false, t: 'ширина ' + wc + ' см у Интерьера без гарантии (гарантия от ' + G.w[1] + ' см)' }];
  const cls = rows[hi][wi];
  if (cls === 'G') return [];
  let gMax = 0, nMax = 0;
  rows.forEach((r, i) => { if (r[wi] === 'G') gMax = G.h[i]; if (r[wi] !== 'R') nMax = G.h[i]; });
  const head = 'при ширине ' + G.w[wi] + ' см ';
  if (!gMax && !(cls === 'R' && nMax)) {
    const gw = G.w.filter((x, j) => rows.some((r) => r[j] === 'G'));
    const t = wc > gw[gw.length - 1] ? 'гарантия по ширине до ' + gw[gw.length - 1] + ' см' : 'гарантия от ' + gw[0] + ' см';
    return [{ hard: cls === 'R', t: 'ширина ' + wc + ' см у Интерьера ' + (cls === 'R' ? 'не делается' : 'без гарантии') + ' (' + t + ')' }];
  }
  if (cls === 'Y') return [{ hard: false, t: head + 'у Интерьера гарантия до высоты ' + gMax + ' см, у вас ' + hc + ' см (изготовят без гарантии, до ' + nMax + ' см)' }];
  return [{ hard: true, t: head + 'Интерьер делает высоту максимум ' + (nMax || 'нисколько') + ' см' + (gMax ? ' (с гарантией до ' + gMax + ' см)' : ' (с гарантией при такой ширине нельзя)') + ', у вас ' + hc + ' см: изготовить нельзя' }];
}
const uyutH = (lam, chain, wc) => {
  const cols = [120, 140, 160, 180, 200, 220, 240];
  const h25 = [250, 210, 190, 170, 150, 135, chain ? 120 : 125], h50 = [400, 360, 315, 280, 250, 230, 210];
  const i = cols.findIndex((c) => c >= wc);
  return i < 0 ? 0 : (lam === 25 ? h25 : h50)[i];
};
// Ограничения размеров по поставщикам: список { hard, t }. hard = изготовить нельзя, иначе без гарантии.
function sizeLimits(it, col, ser) {
  const W = Number(it.w) || 0, H = Number(it.h) || 0, S = W * H / 1e6, wc = W / 10, hc = H / 10;
  const chain = !!(it.opts && it.opts['Цепочка']);
  const apart = it.ctrl === 'TL' || it.ctrl === 'TR';
  const out = [];
  const add = (hard, t) => out.push({ hard, t });
  const m2 = (x) => String(x).replace('.', ',') + ' м²';
  if (!W || !H) return out;
  if (it.sup === 'Amigo') {
    const minW = it.lam === 50 ? 420 : 330;
    const maxW = it.lam === 50 ? 2400 : (it.mat === 'Бамбук' ? 1800 : (ser === 'липа' ? 2100 : 2300));
    const maxH = it.lam === 50 ? 4300 : 3000;
    const maxS = ({ 'Дерево 50': ser === 'липа' ? 3.5 : 4.5, 'Бамбук 50': 3.8, 'Пластик 50': 3.2, 'Дерево 25': ser === 'липа' ? 3.3 : 3.6, 'Бамбук 25': 3.6 })[it.mat + ' ' + it.lam];
    if (W < minW) add(false, 'ширина меньше гарантийной у Amigo (' + minW + ' мм)');
    if (W > maxW) add(false, 'ширина больше гарантийной у Amigo (' + maxW + ' мм)');
    if (H > maxH) add(false, 'высота больше гарантийной у Amigo (' + maxH + ' мм)');
    if (maxS && S > maxS) add(false, 'площадь ' + m2(Math.round(S * 100) / 100) + ' больше гарантийной у Amigo (' + m2(maxS) + ')');
    if (it.lam === 25 && W < SPLIT25_MM && !apart && !chain) add(false, 'при ширине меньше ' + SPLIT25_MM + ' мм у Amigo только раздельное управление');
  } else if (it.sup === 'Интерьер') {
    intLimits(it).forEach((x) => add(x.hard, x.t));
  } else if (it.sup === 'Уют') {
    const key = it.lam;
    const minW = key === 25 ? (chain ? 50 : (apart ? (it.fix === 'Струна' ? 36 : 26) : (it.fix === 'Струна' ? 45 : 40)))
      : (chain ? 52 : (apart ? (it.fix === 'Струна' ? 50 : 37) : 50));
    if (wc < minW) add(false, 'у Уюта минимальная ширина для такого управления ' + (it.fix === 'Струна' ? 'с боковой фиксацией ' : '') + minW + ' см, у вас ' + wc + ' см');
    if (wc > 240) add(false, 'у Уюта ширина не больше 240 см');
    else {
      const mh = uyutH(key, chain, wc);
      if (mh && hc > mh) add(false, 'у Уюта при ширине до ' + ([120, 140, 160, 180, 200, 220, 240].find((c) => c >= wc)) + ' см высота не больше ' + mh + ' см, у вас ' + hc + ' см');
    }
    if (chain && it.fix === 'Струна') add(false, 'у Уюта цепочка не делается с боковой фиксацией');
    if (chain && key === 50) {
      const bands = [[110, 320, 2.3], [160, 300, 3.4], [200, 250, 4], [240, 220, 4.5]];
      const b = bands.find((x) => wc <= x[0]);
      if (b && S > b[2]) add(false, 'у Уюта при цепочке 50 мм в этом диапазоне ширины площадь не больше ' + m2(b[2]));
    }
  } else if (it.sup === 'РДО') {
    const mono = it.lam === 25 && chain;
    const bamboo = it.mat === 'Бамбук';
    const minW = it.lam === 25 ? (mono ? 400 : 250) : 420;
    const maxW = it.lam === 25 && bamboo ? 1800 : (it.lam === 25 ? 2700 : 2400);
    const maxH = mono ? 2500 : 3000, minH = it.lam === 25 ? 300 : 400;
    const maxS = mono ? 1.5 : (it.lam === 25 ? 2.5 : 3.8);
    const who = mono ? 'у РДО при моноуправлении (цепочка 25 мм) ' : 'у РДО ';
    if (W < minW) add(false, who + 'ширина не меньше ' + minW + ' мм');
    if (W > maxW) add(false, who + 'ширина не больше ' + maxW + ' мм');
    if (H < minH) add(false, who + 'высота не меньше ' + minH + ' мм');
    if (H > maxH) add(false, who + 'высота не больше ' + maxH + ' мм');
    if (S > maxS) add(false, who + 'площадь не больше ' + m2(maxS) + ', у вас ' + m2(Math.round(S * 100) / 100));
  } else if (it.sup === 'Foroom') {
    const minW = chain ? 500 : 485;
    if (W < minW) add(false, 'у Foroom минимальная ширина ' + minW + ' мм (' + (chain ? 'цепь' : 'шнур') + ')');
    if (H < 400) add(false, 'у Foroom высота не меньше 400 мм');
    let maxW = 2500;
    if (col && col.maxW) maxW = Math.min(maxW, col.maxW);
    if (W > maxW) add(false, 'у Foroom ширина по гарантии не больше ' + maxW + ' мм');
    if (H > 3000) add(false, 'у Foroom высота по гарантии не больше 3000 мм');
    const pav = col && col.cat <= 1;
    const gS = pav ? 5.5 : 4.5, nS = pav ? 11 : 5.5;
    if (S > nS) add(true, 'у Foroom площадь больше ' + m2(nS) + ': изготовить нельзя');
    else if (S > gS) add(false, 'у Foroom гарантия до ' + m2(gS) + ', у вас ' + m2(Math.round(S * 100) / 100) + ' (без гарантии допускается до ' + m2(nS) + ')');
  }
  // Красные клетки сеток Интерьера считаем общей нормой отрасли: если не проходит даже там, делать нельзя у любого поставщика.
  if (it.sup !== 'Интерьер' && it.mat !== 'Пластик') intLimits(it).filter((x) => x.hard).forEach((x) => add(true, 'не проходит даже по нормам Интерьера: ' + x.t));
  return out;
}
const limitLabel = (arr) => arr.length ? (arr.some((x) => x.hard) ? 'НЕЛЬЗЯ ИЗГОТОВИТЬ: ' : 'НЕ ГАРАНТ.: ') + arr.map((x) => x.t).join('; ') : '';
window.JalLimits = { sizeLimits, weightKg, fmtKg, limitLabel };
})();
