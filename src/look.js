/* Внешний вид: шрифт и размер шрифта из Настроек применяются ко всему приложению. */
(function () {
  'use strict';
  const FONTS = [
    ['Обычный', 'Inter, -apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif'],
    ['Читаемый', '"PT Sans", Verdana, Tahoma, sans-serif'],
    ['С засечками', '"PT Serif", Georgia, "Times New Roman", serif'],
    ['Узкий', '"Roboto Condensed", "Arial Narrow", sans-serif']];
  const SIZES = [['Мелкий', 13], ['Обычный', 15], ['Крупный', 17], ['Очень крупный', 19]];
  function apply() {
    let o = {}; try { o = JSON.parse(localStorage.getItem('jal_theme') || '{}') || {}; } catch (e) {}
    const f = FONTS[o.font | 0] || FONTS[0], z = SIZES[o.fs === undefined ? 1 : o.fs | 0] || SIZES[1], st = document.documentElement.style;
    st.setProperty('--ff', f[1]); st.setProperty('--zm', String(z[1] / 15));
  }
  apply();
  window.JalLook = { apply, FONTS, SIZES };
})();
