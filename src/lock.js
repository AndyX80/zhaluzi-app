/* Заставка, PIN и отпечаток по макетам Splash / Pin. PIN хранится только как хэш, после 5 неверных попыток пауза 30 секунд. */
(function () {
  'use strict';
  const ls = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
  const FONT = 'font-family: Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
  const root = document.createElement('div');
  root.id = 'lock';
  root.setAttribute('style', 'position: fixed; inset: 0; z-index: 1000; background: radial-gradient(circle at 50% 42%, #5a3a28 0%, #2B1A12 62%, #1a0f0a 100%); color: #FFFFFF; display: flex; flex-direction: column; align-items: center; ' + FONT + '; overflow: auto');
  root.hidden = true;
  const css = document.createElement('style');
  css.textContent = '@keyframes lkDot{0%{background:#FFB27A;box-shadow:0 0 12px 3px rgba(255,150,70,.85);transform:var(--t) scale(1.25)}12%,100%{background:#FF7520;box-shadow:none;transform:var(--t) scale(1)}}.lkd{position:absolute;left:-5px;top:-5px;width:10px;height:10px;border-radius:5px;background:#FF7520;opacity:.9;animation:lkDot 1s linear infinite}#lock button{font-family:inherit;cursor:pointer;transition:transform .08s}#lock button:active{transform:scale(.96)}';
  document.head.appendChild(css);
  document.body.appendChild(root);

  const pinOn = () => ls.get('jal_pin_on') === '1' && !!ls.get('jal_pin_h');
  const fpOn = () => ls.get('jal_fp') === '1' && !!ls.get('jal_fp_id');
  const hash = async p => {
    const s = 'jal|' + p;
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'x' + h; }
  };
  const b64 = u8 => btoa(String.fromCharCode.apply(null, u8)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  function logo(w, mt) { return '<div style="background: #FFFFFF; border-radius: 22px; padding: 14px 20px; margin-top: ' + mt + 'px; box-shadow: 0 10px 30px rgba(0,0,0,.35)"><img src="assets/logo.png" alt="Жалюзи-СПБ" style="width: ' + w + 'px; display: block"></div>'; }
  function spinner() {
    let d = ''; for (let i = 0; i < 8; i++) d += '<span class="lkd" style="--t: rotate(' + (i * 45) + 'deg) translateY(-22px); transform: rotate(' + (i * 45) + 'deg) translateY(-22px); animation-delay: -' + (1 - i / 8).toFixed(3) + 's"></span>';
    return '<div style="position: absolute; bottom: 90px; left: 50%; width: 0; height: 0">' + d + '</div>';
  }
  function splash() {
    root.hidden = false; root.style.justifyContent = 'center';
    root.innerHTML = logo(220, 0) + spinner();
  }
  function hide() { root.hidden = true; root.innerHTML = ''; }

  /* mode: 'enter' (ввод для входа), 'new' (задать новый), 'again' (повторить новый) */
  function keypad(opts) {
    let v = '', err = '', first = '', busy = false;
    const title = () => opts.mode === 'enter' ? 'Введите PIN' : (opts.mode === 'new' ? 'Придумайте PIN' : 'Повторите PIN');
    const key = 'width: 72px; height: 72px; border-radius: 36px; border: 1.5px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.1); color: #FFFFFF; font-size: 28px; font-weight: 600';
    function draw() {
      const dots = [0, 1, 2, 3].map(i => '<span style="width: 16px; height: 16px; border-radius: 8px; box-sizing: border-box; border: 2px solid ' + (err ? '#FFB27A' : '#FFFFFF') + '; background: ' + (i < v.length ? (err ? '#FFB27A' : '#FF7520') : 'transparent') + '"></span>').join('');
      const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map(n => n === '' ? '<span style="width: 72px; height: 72px"></span>'
        : '<button data-k="' + n + '" aria-label="' + (n === '⌫' ? 'Стереть' : n) + '" style="' + key + (n === '⌫' ? '; border-color: transparent; background: transparent; font-size: 26px' : '') + '">' + n + '</button>').join('');
      const fp = opts.mode === 'enter' && fpOn() ? '<button data-fp="1" style="margin-top: 14px; height: 52px; border-radius: 26px; border: 1.5px solid rgba(255,255,255,0.45); background: rgba(255,255,255,0.12); color: #FFFFFF; font-size: 15px; font-weight: 600; padding: 0 22px; display: flex; align-items: center; gap: 10px">Войти по отпечатку</button>' : '';
      const cancel = opts.cancel ? '<button data-cancel="1" style="margin-top: 14px; background: transparent; border: 0; color: #FFFFFF; opacity: .75; font-size: 15px; padding: 10px">Отмена</button>' : '';
      root.hidden = false; root.style.justifyContent = 'flex-start';
      root.innerHTML = logo(190, 56) + '<div style="margin-top: 26px; font-size: 18px; font-weight: 600">' + title() + '</div><div style="margin-top: 18px; display: flex; gap: 18px">' + dots + '</div>' + fp +
        '<div style="margin-top: 10px; min-height: 20px; font-size: 14px; color: #FFB27A; text-align: center">' + err + '</div><div style="margin-top: 8px; display: grid; grid-template-columns: repeat(3, 72px); gap: 14px">' + keys + '</div>' + cancel;
      root.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => press(b.getAttribute('data-k')); });
      const f = root.querySelector('[data-fp]'); if (f) f.onclick = () => finger();
      const c = root.querySelector('[data-cancel]'); if (c) c.onclick = () => { hide(); opts.onCancel && opts.onCancel(); };
    }
    async function finger() { try { await fingerprint(); hide(); opts.onOk && opts.onOk(); } catch (e) { err = 'Отпечаток не распознан'; draw(); } }
    async function press(d) {
      if (busy) return;
      const lockedUntil = +ls.get('jal_pin_lock') || 0;
      if (opts.mode === 'enter' && lockedUntil > Date.now()) { err = 'Подождите ' + Math.ceil((lockedUntil - Date.now()) / 1000) + ' с'; draw(); return; }
      if (d === '⌫') { v = v.slice(0, -1); err = ''; draw(); return; }
      if (v.length >= 4) return;
      v += d; err = ''; draw();
      if (v.length < 4) return;
      busy = true;
      if (opts.mode === 'enter') {
        if (await hash(v) === ls.get('jal_pin_h')) { ls.del('jal_pin_bad'); hide(); busy = false; opts.onOk && opts.onOk(); return; }
        const bad = (+ls.get('jal_pin_bad') || 0) + 1; ls.set('jal_pin_bad', String(bad));
        if (bad >= 5) { ls.set('jal_pin_lock', String(Date.now() + 30000)); ls.del('jal_pin_bad'); err = 'Слишком много попыток, пауза 30 секунд'; } else err = 'Неверный PIN';
        draw(); setTimeout(() => { v = ''; busy = false; draw(); }, 600);
      } else if (opts.mode === 'new') { first = v; v = ''; opts.mode = 'again'; busy = false; draw(); }
      else {
        if (v === first) { ls.set('jal_pin_h', await hash(v)); ls.set('jal_pin_on', '1'); hide(); busy = false; opts.onOk && opts.onOk(); }
        else { err = 'PIN не совпал, начните заново'; draw(); setTimeout(() => { v = ''; first = ''; opts.mode = 'new'; err = ''; busy = false; draw(); }, 900); }
      }
    }
    draw();
    if (opts.mode === 'enter' && fpOn()) finger();
  }

  /* отпечаток: WebAuthn с встроенным сканером телефона */
  async function fpRegister() {
    if (!window.PublicKeyCredential || !navigator.credentials) throw new Error('Телефон или браузер не поддерживает отпечаток');
    const c = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Жалюзи-СПБ' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'owner', displayName: 'Владелец' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
    ls.set('jal_fp_id', b64(new Uint8Array(c.rawId))); ls.set('jal_fp', '1');
  }
  async function fingerprint() {
    await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(ls.get('jal_fp_id')), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
  }

  let hiddenAt = 0, showing = false;
  function ask(onOk) { showing = true; keypad({ mode: 'enter', onOk: () => { showing = false; onOk && onOk(); } }); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (pinOn() && !showing && hiddenAt && Date.now() - hiddenAt > 60000) ask();
  });
  /* старт: заставка на секунду, потом PIN, если включён */
  splash();
  setTimeout(() => { if (pinOn()) ask(); else hide(); }, 2500);

  window.JalLock = {
    setPin: cb => keypad({ mode: 'new', cancel: true, onOk: cb, onCancel: cb }),
    off: () => { ls.set('jal_pin_on', '0'); },
    on: () => { if (ls.get('jal_pin_h')) ls.set('jal_pin_on', '1'); },
    hasPin: () => !!ls.get('jal_pin_h'),
    fpRegister, fpOff: () => ls.set('jal_fp', '0'), fpHas: () => !!ls.get('jal_fp_id')
  };
})();
