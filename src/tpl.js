/* Мини-шаблонизатор для разметки макета: <sc-if value="{{x}}">, <sc-for list="{{xs}}" as="x">, {{путь}} в тексте и атрибутах,
   onClick/onChange/onInput="{{функция}}". Рендер строкой + «морфинг» в живой DOM, чтобы не терялись фокус поля и нажатия. */
(function (root) {
  'use strict';
  const VOID = { input: 1, br: 1, img: 1, hr: 1 };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const EV = { onclick: 'click', onchange: 'change', oninput: 'input' };

  function get(path, sc) {
    const p = path.trim().split('.');
    let v = p[0] in sc.loc ? sc.loc[p[0]] : sc.vm[p[0]];
    for (let i = 1; i < p.length && v != null; i++) v = v[p[i]];
    return v;
  }
  const single = s => { const m = /^\s*\{\{([^}]+)\}\}\s*$/.exec(s); return m ? m[1] : null; };
  const interp = (s, sc) => s.replace(/\{\{([^}]+)\}\}/g, (_, p) => { const v = get(p, sc); return v == null ? '' : String(v); });
  const truthy = v => !!v && v !== 'false';

  function walk(node, sc, out, hs) {
    if (node.nodeType === 3) { out.push(esc(interp(node.data, sc))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      const p = single(node.getAttribute('value') || '');
      if (p && truthy(get(p, sc))) node.childNodes.forEach(c => walk(c, sc, out, hs));
      return;
    }
    if (tag === 'sc-for') {
      const p = single(node.getAttribute('list') || ''), as = node.getAttribute('as');
      const list = (p && get(p, sc)) || [];
      list.forEach(item => {
        const loc = Object.assign({}, sc.loc); loc[as] = item;
        node.childNodes.forEach(c => walk(c, { vm: sc.vm, loc }, out, hs));
      });
      return;
    }
    out.push('<' + tag);
    for (const a of node.attributes) {
      const n = a.name;
      if (n.startsWith('hint-placeholder')) continue;
      if (EV[n]) {
        const p = single(a.value), f = p && get(p, sc);
        if (typeof f === 'function') { hs.push(f); out.push(' data-h-' + EV[n] + '="' + (hs.length - 1) + '"'); }
        continue;
      }
      out.push(' ' + n + '="' + esc(interp(a.value, sc)) + '"');
    }
    out.push('>');
    if (VOID[tag]) return;
    node.childNodes.forEach(c => walk(c, sc, out, hs));
    out.push('</' + tag + '>');
  }

  function patch(a, b) {
    if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { a.replaceWith(b); return; }
    if (a.nodeType === 3) { if (a.data !== b.data) a.data = b.data; return; }
    if (a.nodeType !== 1) return;
    for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    if (a.nodeName === 'INPUT' && a !== document.activeElement) {
      const v = b.getAttribute('value') || '';
      if (a.value !== v) a.value = v;
    }
    morph(a, b);
  }
  function morph(a, b) {
    const fc = Array.from(a.childNodes), tc = Array.from(b.childNodes);
    tc.forEach((n, i) => { if (i < fc.length) patch(fc[i], n); else a.appendChild(n); });
    for (let i = tc.length; i < fc.length; i++) a.removeChild(fc[i]);
  }

  /* mount(box, tplElement) -> { render(vm) } */
  function mount(box, tpl) {
    let hs = [];
    ['click', 'change', 'input'].forEach(ev => box.addEventListener(ev, e => {
      const el = e.target.closest && e.target.closest('[data-h-' + ev + ']');
      if (el && box.contains(el)) { const f = hs[+el.getAttribute('data-h-' + ev)]; if (f) f(e); }
    }));
    return {
      render(vm) {
        const out = [], nh = [];
        tpl.content.childNodes.forEach(c => walk(c, { vm, loc: {} }, out, nh));
        const t = document.createElement('template'); t.innerHTML = out.join('');
        hs = nh;
        morph(box, t.content);
      }
    };
  }
  root.JalTpl = { mount };
})(window);
