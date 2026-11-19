/* Bottom Line Bakery. Plain modules, no dependencies.
   Everything on the page reads right without this file; it adds the live parts. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const root = document.documentElement;

/* ---------------------------------------------------------------- entrance */
$$('[data-enter]').forEach((el, i) => el.style.setProperty('--i', i));
setTimeout(() => root.classList.add('is-ready'), 40);
setTimeout(() => root.classList.add('is-entered'), 2600);   // never leave the first screen waiting on a stalled clock

/* ---------------------------------------------------------------- links inside the page glide; the keyboard's focus never does */
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href^="#"]');
  const id = a?.getAttribute('href');
  if (!id || id.length < 2 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const target = document.getElementById(id.slice(1));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  history.pushState(null, '', id);
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
});

/* ---------------------------------------------------------------- announcement: days to the holiday */
(() => {
  const bar = $('[data-announce]');
  if (!bar) return;
  const days = Math.ceil((new Date(bar.dataset.until) - Date.now()) / 864e5);
  if (!(days > 0)) { bar.hidden = true; return; }
  $('[data-countdown]', bar).textContent = days === 1 ? '1 day to go.' : `${days} days to go.`;
})();

/* ---------------------------------------------------------------- opening hours, in the bakery's own time zone */
const hours = (() => {
  const dl = $('[data-hours]');
  if (!dl) return null;
  const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const clock = s => { const [h, m] = s.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}\u00a0${h < 12 ? 'am' : 'pm'}`; };
  const week = Array(7).fill(null);
  const rows = $$(':scope > div', dl);
  rows.forEach(row => row.dataset.days.split(',').forEach(d => { week[+d] = row.dataset.open ? { open: row.dataset.open, close: row.dataset.close, row } : { row }; }));
  const read = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: dl.dataset.tz }).formatToParts(new Date()).map(p => [p.type, p.value]));
    const today = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(parts.weekday.slice(0, 3).toLowerCase());
    const now = (+parts.hour % 24) * 60 + +parts.minute;
    const t = week[today];
    rows.forEach(r => r.classList.toggle('is-today', !!t && t.row === r));
    if (t && t.open && now >= mins(t.open) && now < mins(t.close)) return { open: true, text: `Open now until ${clock(t.close)}` };
    for (let k = 0; k < 8; k++) {
      const d = (today + k) % 7, n = week[d];
      if (!n || !n.open || (k === 0 && now >= mins(n.open))) continue;
      return { open: false, text: `Closed now. Opens ${k === 0 ? 'today' : k === 1 ? 'tomorrow' : NAMES[d]} at ${clock(n.open)}` };
    }
    return null;
  };
  const paint = () => {
    let s = null;
    try { s = read(); } catch { /* the hours stand as written */ }
    if (!s) return;
    $$('[data-status]').forEach(el => { el.classList.toggle('is-open', s.open); $('[data-status-text]', el).textContent = s.text; });
  };
  paint();
  setInterval(paint, 60000);
  return { week };
})();

/* ---------------------------------------------------------------- nav: solid past the hero, away on the way down, sheet on a phone */
(() => {
  const nav = $('[data-nav]'), hero = $('[data-hero]'), sheet = $('[data-sheet]'), toggle = $('.nav__toggle'), dock = $('[data-dock]'), build = $('#build');
  let last = scrollY, buildOn = false;
  const onScroll = () => {
    const y = scrollY, edge = hero ? hero.offsetTop + hero.offsetHeight - 90 : 200;
    nav.classList.toggle('is-solid', y > edge);
    if (!sheet || sheet.hidden) nav.classList.toggle('is-hidden', y > edge + 300 && y > last + 2 ? true : y < last - 2 ? false : nav.classList.contains('is-hidden'));
    if (dock) dock.classList.toggle('is-on', y > edge && !buildOn);
    last = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (build && 'IntersectionObserver' in window) new IntersectionObserver(es => { buildOn = es[0].isIntersecting; onScroll(); }, { rootMargin: '-30% 0px -30% 0px' }).observe(build);

  const setSheet = open => {
    sheet.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
    root.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-sheet', open);
    root.classList.toggle('sheet-open', open);
    if (open) nav.classList.remove('is-hidden');
  };
  toggle?.addEventListener('click', () => setSheet(sheet.hidden));
  sheet?.addEventListener('click', e => { if (e.target.closest('a')) setSheet(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sheet && !sheet.hidden) { setSheet(false); toggle.focus(); } });
  matchMedia('(min-width: 1181px)').addEventListener('change', e => { if (e.matches && sheet && !sheet.hidden) setSheet(false); });

  // the word for the section on screen
  const links = $$('.nav__links a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.getAttribute('href') === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });
  }
})();

/* ---------------------------------------------------------------- reveal as sections arrive. A frame waits until its photograph is ready, so nothing pops in half way. */
(() => {
  const els = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const photos = el => el.dataset.reveal === 'img' || el.dataset.reveal === 'set' ? $$('img', el) : [];
  const show = el => {
    const imgs = photos(el);
    let shown = false;
    const go = () => { if (!shown) { shown = true; el.classList.add('in'); } };
    if (!imgs.length) return go();
    imgs.forEach(img => { img.loading = 'eager'; });
    Promise.all(imgs.map(img => img.decode ? img.decode().catch(() => {}) : 0)).then(go);
    // a very slow connection: the frame comes in after a while anyway, and its photograph fades in when it lands
    setTimeout(() => {
      if (shown) return;
      imgs.filter(img => !img.complete).forEach(img => {
        const land = () => img.classList.remove('is-late');
        img.classList.add('is-late');
        img.addEventListener('load', land, { once: true });
        img.addEventListener('error', land, { once: true });
      });
      go();
    }, 2500);
  };
  // fetch these few photographs once the first screen is in, so each is ready before its section arrives
  const warm = () => els.forEach(el => photos(el).forEach(img => { img.loading = 'eager'; }));
  addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(warm, { timeout: 2500 }) : setTimeout(warm, 1200)));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  els.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 4));
    io.observe(el);
  });
})();

/* ---------------------------------------------------------------- hero: pick the occasion */
const hero = (() => {
  const OCC = {
    birthday: { word: 'birthdays', builder: 'Birthday' },
    wedding: { word: 'weddings', builder: 'Wedding' },
    work: { word: 'work things', builder: 'Work thing' },
    sorry: { word: 'apologies', builder: "I'm sorry" },
    party: { word: 'parties', builder: null },
    tuesday: { word: 'Tuesdays', builder: 'Just because' },
  };
  const keys = Object.keys(OCC);
  const el = $('[data-hero]');
  if (!el) return null;
  const word = $('[data-hero-word]', el), imgs = $$('[data-hero-frame] img', el), chips = $$('[data-hero-chips] .chip', el);
  let current = 'birthday', timer = null, touched = false, inView = true, swapping = null;
  const listeners = [];

  const set = (key, byUser) => {
    if (!OCC[key] || key === current) return;
    current = key;
    chips.forEach(c => { const on = c.dataset.occasion === key; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
    imgs.forEach(img => img.classList.toggle('is-on', img.dataset.occasion === key));
    clearTimeout(swapping);
    if (reduced) { word.textContent = OCC[key].word; }
    else {
      word.classList.add('is-out');
      word.classList.remove('is-in');
      swapping = setTimeout(() => {
        word.textContent = OCC[key].word;
        word.classList.add('is-pre');
        word.classList.remove('is-out');
        void word.offsetWidth;
        word.classList.remove('is-pre');
        requestAnimationFrame(() => word.classList.add('is-in'));
      }, 260);
    }
    if (byUser) listeners.forEach(fn => fn(OCC[key].builder));
  };
  const next = () => set(keys[(keys.indexOf(current) + 1) % keys.length], false);
  const play = () => { clearInterval(timer); if (!reduced && !touched && inView && !document.hidden) timer = setInterval(next, 3600); };
  chips.forEach(c => c.addEventListener('click', () => { touched = true; clearInterval(timer); set(c.dataset.occasion, true); }));
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; play(); }, { threshold: .35 }).observe(el);
  document.addEventListener('visibilitychange', play);
  play();

  // the seal turns a little with the page
  const media = $('.dome', el);
  if (!reduced && media) addEventListener('scroll', () => { if (scrollY < innerHeight * 1.2) media.style.transform = `translateY(${(scrollY * -0.06).toFixed(1)}px)`; }, { passive: true });

  return { onPick: fn => listeners.push(fn) };
})();

/* ---------------------------------------------------------------- drawings: one for every line the bakery has not photographed yet.
   Flat shapes on the ink disc of the rose mark. sketch('pie:pecan') returns the svg as a string. */
const sketch = (() => {
  const C = {
    floor: '#0d0b09', crust: '#dfa860', crustD: '#b8793a', crustL: '#f2cf98', dough: '#ecd29c',
    choc: '#6b4331', chocD: '#4a2c20', chocL: '#83573f', caramel: '#c8873a', amber: '#a8652b',
    cream: '#fffaf0', creamD: '#e7dcc4', custard: '#fbefd0', lemon: '#f3cf47', lemonL: '#f8df74',
    berry: '#b83a55', blue: '#4b5389', cherry: '#a8273b', pumpkin: '#d27a2c', lime: '#dfe6a2', limeD: '#97bb58',
    pecan: '#7a4a2a', pecanL: '#9a6640', graham: '#c2935a', crumb: '#d6ab6c', crumbL: '#ecd09a', crumbD: '#b98a4d',
    paper: '#b98a57', paperD: '#99703f', china: '#f6efe0', chinaD: '#d9ccb1'
  };
  const f = n => Math.round(n * 10) / 10;
  const pt = a => f(a[0]) + ' ' + f(a[1]);
  const E = (cx, cy, rx, ry, fill, more = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${more}/>`;
  const R = (x, y, w, h, fill, r = 0, more = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"${more}/>`;
  const P = (d, fill, more = '') => `<path d="${d}" fill="${fill}"${more}/>`;
  const L = (d, stroke, w, more = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${more}/>`;
  const G = (pts, fill, more = '') => `<polygon points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}" fill="${fill}"${more}/>`;
  const turn = (deg, x, y) => ` transform="rotate(${f(deg)} ${f(x)} ${f(y)})"`;
  const dim = o => ` opacity="${o}"`;
  const dice = seed => () => (seed = seed * 16807 % 2147483647) / 2147483647;   // the same scatter on every visit
  const scatter = (n, seed, put) => { const r = dice(seed); let s = ''; for (let i = 0; i < n; i++) s += put(r, i); return s; };
  const any = (r, list) => list[Math.floor(r() * list.length)];
  const floor = (cx, cy, rx, ry) => E(cx, cy, rx, ry, C.floor, dim(.6));
  const fit = (s, cx, cy, k = 1, to = 162) => `<g transform="translate(160 ${to}) scale(${k}) translate(${-cx} ${-cy})">${s}</g>`;   // centre a drawing on the disc
  // toppings laid on a surface: at(u, v) turns 0..1 across and 0..1 deep into a point
  const dust = (at, n, seed) => scatter(n, seed, r => { const [x, y] = at(.04 + r() * .92, .06 + r() * .88); return E(x, y, .8 + r() * 1.1, .6 + r() * .6, '#fff', dim(.9)); });
  const bits = (at, n, seed, fills, size = 4.5) => scatter(n, seed, r => { const [x, y] = at(.08 + r() * .84, .12 + r() * .76); return E(x, y, size * (.7 + r() * .6), size * .46, any(r, fills), turn(r() * 180, x, y)); });
  const crumbs = (at, n, seed) => scatter(n, seed, r => { const [x, y] = at(.07 + r() * .86, .12 + r() * .76); return E(x, y, 4 + r() * 5, 2.4 + r() * 2.4, any(r, [C.crumbL, C.crumbD, '#e3bd83'])); });

  const croissant = kind => {
    const half = [[40, 224, 12, 21, -66], [66, 207, 20, 27, -46], [98, 191, 27, 35, -27], [130, 181, 32, 42, -11]];
    const seg = ([x, y, rx, ry, a]) => E(x, y + 3, rx + 2.5, ry + 2, C.crustD, turn(a, x, y)) + E(x, y, rx, ry, C.crust, turn(a, x, y)) + E(x - rx * .1, y - ry * .5, rx * .52, ry * .2, C.crustL, turn(a, x, y) + dim(.8));
    let s = floor(160, 246, 124, 12);
    half.forEach(h => { s += seg(h) + seg([320 - h[0], h[1], h[2], h[3], -h[4]]); });
    s += seg([160, 177, 36, 46, 0]);
    if (kind === 'chocolate') { let d = ''; for (let i = 0; i <= 18; i++) { const x = 74 + i * 9.6, u = (x - 62) / 196; d += (i ? ' L' : 'M') + f(x) + ' ' + f(i % 2 ? 196 - Math.sin(u * Math.PI) * 50 : 216 - Math.sin(u * Math.PI) * 16); } s += L(d, C.chocD, 3.4); }
    if (kind === 'almond') {
      const top = (u, v) => [62 + u * 196, 204 - Math.sin(u * Math.PI) * 54 + (v - .5) * 30];
      s += scatter(13, 5, r => { const [x, y] = top(.08 + r() * .84, r()); return E(x, y, 8, 4, '#f7ecd2', turn(r() * 180, x, y) + ' stroke="#d9c49a" stroke-width="1"'); });
      s += scatter(60, 9, r => { const [x, y] = top(.05 + r() * .9, r()); return E(x, y, .8 + r() * 1.2, .7 + r() * .7, '#fff', dim(.92)); });
    }
    return fit(s, 160, 192, .97);
  };

  const scone = () => fit(floor(160, 246, 104, 12)
    + P('M60 212 C50 178 72 150 98 144 C104 116 140 100 166 108 C192 96 232 112 238 144 C264 152 274 188 258 214 C250 238 224 246 200 242 C176 252 142 250 120 242 C94 248 66 236 60 212Z', C.crustD)
    + P('M66 204 C58 176 78 152 102 148 C108 122 142 108 166 116 C190 104 226 118 232 148 C256 156 264 184 252 204 C244 224 222 230 200 226 C176 236 142 234 122 227 C98 232 72 224 66 204Z', '#e2b572')
    + scatter(16, 3, r => { const x = 84 + r() * 150, y = 150 + r() * 62; return E(x, y, 6 + r() * 8, 4 + r() * 4, any(r, [C.crustL, '#cf9a55']), dim(.7)); })
    + P('M92 152 C108 128 148 118 170 124 C196 114 226 128 232 152 C236 166 226 172 220 162 C216 178 204 178 200 164 C192 182 176 184 172 166 C162 186 146 184 142 168 C134 182 120 180 118 164 C108 174 94 168 92 152Z', C.cream)
    + scatter(7, 12, r => { const x = 96 + r() * 128, y = 184 + r() * 34; return E(x, y, 5 + r() * 2, 4.4 + r() * 2, '#5a2f52') + E(x - 1.5, y - 1.5, 1.6, 1.2, '#9a6a90'); }), 160, 176, 1.08);

  const muffin = () => {
    let s = floor(160, 258, 76, 10) + P('M96 178 L224 178 L211 250 Q210 258 201 258 L119 258 Q110 258 109 250Z', C.paper);
    for (let i = 0; i < 8; i++) s += L(`M${f(106 + i * 15.4)} 182 L${f(115 + i * 12.9)} 254`, C.paperD, 2, dim(.8));
    return fit(s + P('M78 182 C68 150 96 104 160 100 C224 104 252 150 242 182 C240 196 226 198 214 192 C196 200 124 200 106 192 C94 198 80 196 78 182Z', C.crustD)
      + P('M82 176 C74 148 100 108 160 104 C220 108 246 148 238 176 C236 188 224 190 213 185 C195 193 125 193 107 185 C96 190 84 188 82 176Z', '#e3b470')
      + E(134, 132, 40, 18, C.crustL, turn(-18, 134, 132) + dim(.75))
      + scatter(7, 8, r => { const x = 104 + r() * 112, y = 124 + r() * 48; return E(x, y, 8, 7, C.blue) + E(x - 2.5, y - 2.5, 2.4, 1.8, '#8088be'); })
      + scatter(26, 2, r => E(96 + r() * 128, 116 + r() * 60, 1 + r(), .9 + r() * .6, '#fff', dim(.85))), 160, 180, 1.1);
  };

  const crimp = (ax, ay, bx, by) => { const len = Math.hypot(bx - ax, by - ay), nx = (ay - by) / len, ny = (bx - ax) / len; let s = ''; for (let i = 1; i < 11; i++) { const x = ax + (bx - ax) * i / 11, y = ay + (by - ay) * i / 11; s += L(`M${f(x + nx * 5)} ${f(y + ny * 5)} l${f(nx * 9)} ${f(ny * 9)}`, '#cf9a55', 2.2); } return s; };
  const turnover = () => fit(floor(160, 250, 116, 11)
    + P('M72 244 L248 244 Q272 244 260 222 L192 104 Q178 82 164 104 L60 222 Q48 244 72 244Z', C.crustD)
    + P('M72 234 L248 234 Q270 234 259 213 L192 98 Q178 76 164 98 L61 213 Q50 234 72 234Z', '#e6b76e')
    + P('M100 216 L224 216 Q238 216 231 203 L187 128 Q178 113 169 128 L93 203 Q86 216 100 216Z', '#f3d6a0')
    + crimp(61, 213, 164, 98) + crimp(192, 98, 259, 213) + L('M84 224 L238 224', '#cf9a55', 1.8) + L('M92 229 L230 229', '#cf9a55', 1.4, dim(.7))
    + L('M150 196 l24 -11', '#8a4f24', 4.5) + L('M160 176 l19 -9', '#8a4f24', 4.5) + L('M169 157 l13 -6', '#8a4f24', 4.5)
    + scatter(30, 6, r => { const v = r(), u = r(), x = 178 + (u - .5) * (30 + v * 110), y = 126 + v * 84; return R(x, y, 2.4, 2.4, '#fff', 0, turn(r() * 90, x, y) + dim(.9)); }), 160, 166, 1.04);

  // a fluted white dish, its top edge at y0
  const dish = (y0, y1, w0, w1) => {
    const a = 160 - w0 / 2, b = 160 + w0 / 2, c = 160 + w1 / 2, d = 160 - w1 / 2;
    let s = P(`M${a} ${y0} L${b} ${y0} L${c} ${y1 - 8} Q${c - 1} ${y1} ${c - 10} ${y1} L${d + 10} ${y1} Q${d + 1} ${y1} ${d} ${y1 - 8}Z`, C.china);
    for (let i = 1; i < 9; i++) s += L(`M${f(a + i / 9 * w0)} ${y0 + 10} L${f(d + i / 9 * w1)} ${y1 - 6}`, C.chinaD, 2.2);
    return s;
  };

  const frenchtoast = () => {
    const cubes = [[112, 158, -14], [146, 164, 9], [182, 162, -7], [210, 154, 16], [128, 134, 11], [164, 138, -11], [196, 132, 7], [146, 110, -6], [178, 112, 13]];
    let s = floor(160, 258, 84, 10) + dish(172, 258, 156, 132) + E(160, 172, 78, 15, '#fffdf7') + E(160, 173, 68, 11, C.chinaD);
    cubes.forEach(([x, y, a], i) => { s += R(x - 17, y - 15, 34, 32, C.crustD, 7, turn(a, x, y)) + R(x - 17, y - 18, 34, 31, [C.crust, '#d39a48', '#e9bb72'][i % 3], 7, turn(a, x, y)) + R(x - 11, y - 14, 18, 12, C.crustL, 5, turn(a, x, y) + dim(.6)); });
    return fit(s + L('M83 174 A78 15 0 0 0 237 174', '#fffdf7', 6)
      + L('M104 150 C122 132 136 150 152 128 C166 108 184 132 196 122 C208 112 216 136 222 146', C.amber, 5.5) + L('M120 166 v24', C.amber, 5.5) + L('M204 164 v17', C.amber, 5.5)
      + scatter(7, 4, r => { const x = 116 + r() * 92, y = 110 + r() * 50; return E(x, y, 6, 3.4, C.pecan, turn(r() * 180, x, y)); })
      + scatter(36, 10, r => E(108 + r() * 108, 100 + r() * 66, .9 + r(), .8 + r() * .6, '#fff', dim(.9))), 160, 178, 1.12);
  };

  const brulee = () => fit(floor(160, 246, 104, 11) + dish(168, 244, 196, 168)
    + E(160, 168, 98, 25, '#fffdf7') + E(160, 169, 86, 20, '#c9772a')
    + scatter(9, 14, r => { const t = r() * 6.28, k = Math.sqrt(r()) * .8, x = 160 + Math.cos(t) * 86 * k, y = 169 + Math.sin(t) * 20 * k; return E(x, y, 7 + r() * 11, 2.6 + r() * 3, any(r, ['#7c4116', '#93531f', '#6a340f']), dim(.8)); })
    + E(132, 161, 34, 5.5, '#eab06a', dim(.7)) + L('M150 177 l14 -5 l10 6 l16 -4', '#f2c98a', 1.6, dim(.8)), 160, 196, 1.14);

  // a cut bar seen from the front corner: layers on the front and the side, the topping on the top
  const slab = ({ x = 68, y = 232, w = 150, dx = 34, dy = -20, layers, top, deco }) => {
    let s = G([[x - 8, y + 5], [x + w, y + 5], [x + w + dx + 6, y + dy + 5], [x + dx - 8, y + dy + 5]], C.floor, dim(.6)), yy = y;
    layers.forEach(([fill, h, crumbly]) => {
      s += R(x, yy - h, w, h + .5, fill) + G([[x + w, yy + .5], [x + w + dx, yy + dy + .5], [x + w + dx, yy + dy - h], [x + w, yy - h]], fill);
      if (crumbly) s += scatter(Math.round(w * h / 120), h * 7, r => E(x + 6 + r() * (w - 12), yy - h + 5 + r() * (h - 9), 4 + r() * 5, 3 + r() * 3, any(r, [C.crumbL, C.crumbD, '#e3bd83'])));
      yy -= h;
    });
    const at = (u, v) => [x + u * w + v * dx, yy + v * dy];
    return s + G([[x + w, y], [x + w + dx, y + dy], [x + w + dx, yy + dy], [x + w, yy]], C.floor, dim(.24))
      + G([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], top) + (deco ? deco(at) : '') + L(`M${f(x)} ${f(yy)} L${f(x + w)} ${f(yy)}`, '#fff', 1.2, dim(.28));
  };
  const sheen = (at, c) => L(`M${pt(at(.1, .62))} L${pt(at(.56, .62))}`, c, 2.4, dim(.6));
  const bars = {
    millionaire: { layers: [[C.dough, 36], [C.caramel, 34], [C.choc, 18]], top: C.chocL, deco: at => sheen(at, '#b08a74') },
    lemon: { layers: [[C.dough, 32], [C.lemon, 46]], top: C.lemonL, deco: at => dust(at, 110, 7) },
    cheesecake: { layers: [[C.graham, 22], [C.custard, 64]], top: '#fff8e4', deco: at => sheen(at, '#fff') },
    pecan: { layers: [[C.dough, 30], [C.amber, 44]], top: '#b9783a', deco: at => bits(at, 30, 11, [C.pecan, C.pecanL, '#5f3a20'], 5.5) },
    streusel: { layers: [[C.dough, 28], [C.berry, 18], [C.crumb, 36, 1]], top: C.crumb, deco: at => crumbs(at, 44, 5) + bits(at, 7, 3, [C.berry], 4) },
    toffee: { layers: [[C.dough, 34], ['#b8763a', 22], [C.choc, 18]], top: C.chocL, deco: at => bits(at, 34, 9, [C.crust, C.crustL, '#c98f4b'], 3.2) },
    crumbcake: { layers: [['#f3dc9c', 44], [C.crumb, 46, 1]], top: C.crumb, deco: at => crumbs(at, 48, 13) + dust(at, 80, 4) }
  };
  const rainbow = () => {
    const one = (x, y) => slab({ x, y, w: 66, dx: 24, dy: -14, layers: [[C.choc, 5], ['#7fb685', 15], ['#f1dc8a', 15], ['#e0646c', 15], [C.choc, 5]], top: C.chocL, deco: at => sheen(at, '#b08a74') });
    return fit(one(52, 190) + one(180, 184) + one(112, 246), 164, 184, 1.14);
  };

  const oatmeal = () => fit(floor(160, 246, 104, 13)
    + E(160, 226, 98, 30, '#8f5e33') + E(160, 218, 98, 30, '#b07a45')
    + E(160, 208, 92, 28, C.creamD) + E(160, 200, 92, 28, C.cream)
    + E(160, 188, 100, 31, '#8f5e33') + E(160, 178, 100, 31, '#bd8750')
    + scatter(34, 6, r => { const t = r() * 6.28, k = Math.sqrt(r()) * .88, x = 160 + Math.cos(t) * 100 * k, y = 178 + Math.sin(t) * 31 * k; return E(x, y, 3 + r() * 4, 1.8 + r() * 2, any(r, ['#d8ad78', '#9c6a3b', '#cc9a62']), turn(r() * 180, x, y)); })
    + E(126, 164, 36, 8, '#d7a873', dim(.5)), 160, 202, 1.14);

  const macarons = () => {
    const one = (x, y, k, shell, foot, fill) => {
      let s = P(`M${f(x - 46 * k)} ${f(y + 9 * k)} C${f(x - 46 * k)} ${f(y + 40 * k)} ${f(x + 46 * k)} ${f(y + 40 * k)} ${f(x + 46 * k)} ${f(y + 9 * k)}Z`, foot);
      for (let i = 0; i < 9; i++) s += E(x - 40 * k + i * 10 * k, y + 8 * k, 5.6 * k, 4 * k, foot);
      s += R(x - 41 * k, y - 4 * k, 82 * k, 11 * k, fill, 5 * k);
      for (let i = 0; i < 9; i++) s += E(x - 40 * k + i * 10 * k, y - 5 * k, 5.6 * k, 4 * k, foot);
      return s + P(`M${f(x - 46 * k)} ${f(y - 6 * k)} C${f(x - 46 * k)} ${f(y - 42 * k)} ${f(x + 46 * k)} ${f(y - 42 * k)} ${f(x + 46 * k)} ${f(y - 6 * k)}Z`, shell) + E(x - 14 * k, y - 24 * k, 17 * k, 5 * k, '#fff', dim(.35));
    };
    return fit(floor(160, 252, 112, 11) + one(108, 216, .92, '#f1dfb8', '#dcc493', '#fff6df') + one(212, 216, .92, '#bcd3a2', '#a2bd86', '#f3ead0') + one(160, 157, .92, '#a7745b', '#8d5d46', C.chocD), 160, 188, 1.1);
  };

  const disc = (x, y, rx, ry, edge, face, light) => E(x, y + 7, rx, ry, edge) + E(x, y, rx, ry, face) + E(x - rx * .2, y - ry * .3, rx * .6, ry * .5, light, dim(.7));
  const onDisc = (r, x, y, rx, ry, k = .78) => { const t = r() * 6.2832, q = Math.sqrt(r()) * k; return [x + Math.cos(t) * rx * q, y + Math.sin(t) * ry * q]; };
  const cookies = () => {
    const one = (x, y, rx, ry, seed) => disc(x, y, rx, ry, '#a9753f', '#d7a569', '#e3b87f')
      + scatter(9, seed, r => { const [cx, cy] = onDisc(r, x, y, rx, ry); return E(cx, cy, 6 + r() * 3, 3.6 + r() * 2, C.chocD, turn(r() * 60 - 30, cx, cy)) + E(cx - 1.5, cy - 1.2, 2, 1.1, '#8a5f49'); });
    return fit(floor(160, 250, 116, 12) + one(112, 140, 62, 32, 3) + one(214, 150, 58, 30, 8) + one(160, 204, 74, 38, 5), 162, 180, 1.05);
  };

  const pie = kind => {
    const cx = 160, cy = 160, RX = 124, RY = 52, rx = 101, ry = 38;
    const on = (X, Y) => [cx + rx * X, cy + ry * Y];                                   // a point on the filling, as on a unit circle
    const polar = r => { const t = r() * 6.2832, k = Math.sqrt(r()) * .93; return on(Math.cos(t) * k, Math.sin(t) * k); };
    const fill = c => E(cx, cy, rx, ry, c);
    const crimps = front => { let s = ''; for (let i = 0; i < 28; i++) { const t = (i + .5) / 28 * 6.2832, sn = Math.sin(t); if ((sn >= 0) !== front) continue; const x = cx + (RX - 10) * Math.cos(t), y = cy + (RY - 6.5) * sn; s += E(x, y, 12, 7.5, i % 2 ? C.crustL : '#e9bd7c', turn(Math.atan2(RY * Math.cos(t), -RX * sn) * 57.3, x, y)); } return s; };
    const lattice = () => { let s = ''; [1, -1].forEach(dir => [-.84, -.28, .28, .84].forEach(k => { const h = Math.sqrt(2.12 - k * k) / 2, d = `M${pt(on(k / 2 + h, dir * (k / 2 - h)))} L${pt(on(k / 2 - h, dir * (k / 2 + h)))}`; s += L(d, C.crustD, 13.5, ' transform="translate(1.5 2.5)"' + dim(.7)) + L(d, '#ecc281', 12); })); return s; };
    const dollop = (x, y, k = 1) => E(x, y + 4 * k, 27 * k, 12 * k, C.creamD) + E(x, y, 26 * k, 11.5 * k, C.cream) + E(x, y - 8 * k, 18 * k, 9 * k, C.creamD) + E(x, y - 10.5 * k, 17 * k, 8.5 * k, C.cream) + E(x + k, y - 18 * k, 9.5 * k, 6 * k, C.creamD) + E(x + k, y - 20.5 * k, 8.5 * k, 5.2 * k, C.cream);
    const toast = (x, y, a, w = 12) => E(x, y, w, w * .36, '#dba55e', turn(a, x, y) + dim(.9));
    const tops = {
      pumpkin: () => fill(C.pumpkin) + E(cx - 26, cy - 12, 52, 11, '#e69a4c', dim(.6)) + dollop(cx + 6, cy + 4, 1.15),
      apple: () => fill('#c58636') + lattice(),
      blueberry: () => fill(C.blue) + scatter(26, 4, r => { const [x, y] = polar(r); return E(x, y, 5, 3.4, '#6c75ad', dim(.8)); }) + lattice(),
      cherry: () => fill(C.cherry) + scatter(22, 6, r => { const [x, y] = polar(r); return E(x, y, 6, 4, '#c94257', dim(.85)); }) + lattice(),
      crumb: () => fill(C.crumb) + scatter(90, 21, r => { const [x, y] = polar(r); return E(x, y, 4 + r() * 6, 2.4 + r() * 3, any(r, [C.crumbL, C.crumbD, '#e3bd83'])); }),
      keylime: () => {
        const ring = []; for (let i = 0; i < 10; i++) { const t = i / 10 * 6.2832 + .3; ring.push(on(Math.cos(t) * .74, Math.sin(t) * .74)); }
        return fill(C.lime) + E(cx - 20, cy - 10, 54, 11, '#eef1c4', dim(.7)) + ring.sort((a, b) => a[1] - b[1]).map(([x, y]) => dollop(x, y + 4, .42)).join('')
          + E(cx, cy + 1, 22, 9.5, C.limeD) + E(cx, cy + 1, 17.5, 7.2, '#eef3bd') + L(`M${cx - 15} ${cy + 1} h30 M${cx} ${cy - 5} v12 M${cx - 10} ${cy - 3.5} l20 9 M${cx + 10} ${cy - 3.5} l-20 9`, C.limeD, 1.2);
      },
      meringue: () => fill(C.lemon) + P('M60 160 C56 132 82 124 96 120 C98 100 126 90 142 98 C150 78 178 76 186 96 C204 86 228 98 226 120 C246 124 266 136 260 160 A101 38 0 0 1 60 160Z', C.cream)
        + L('M96 120 C104 132 122 134 134 124', C.creamD, 3) + L('M142 98 C148 112 166 116 178 106', C.creamD, 3) + L('M186 96 C194 108 212 110 222 102', C.creamD, 3) + L('M226 120 C230 134 246 138 254 132', C.creamD, 3) + L('M84 152 C104 162 130 160 144 148', C.creamD, 3) + L('M168 152 C186 166 216 164 232 152', C.creamD, 3)
        + toast(118, 105, -22, 13) + toast(164, 83, 0, 13) + toast(208, 97, 18) + toast(245, 128, 34, 10) + toast(76, 131, -38, 9),
      coconut: () => P('M60 160 C60 130 104 110 160 110 C216 110 260 130 260 160 A101 38 0 0 1 60 160Z', C.cream)
        + L('M86 150 C112 128 150 122 178 128', C.creamD, 3) + L('M112 172 C142 152 192 148 226 158', C.creamD, 3) + L('M150 134 C176 128 208 132 228 142', C.creamD, 3)
        + scatter(54, 17, r => { const X = r() * 1.7 - .85, Y = r() * 1.5 - 1, x = 160 + 90 * X, y = 152 + 30 * Y - (1 - X * X) * 12; return R(x - 3.5, y - 1, 7, 2, any(r, ['#d9a25c', '#c28a45', '#edc78a']), 1, turn(r() * 180, x, y)); }),
      pecan: () => {
        let s = fill('#8f5527');
        [[.8, 15, 0], [.47, 9, .3], [.13, 3, .9]].forEach(([k, n, o]) => { for (let i = 0; i < n; i++) { const t = i / n * 6.2832 + o, [x, y] = on(Math.cos(t) * k, Math.sin(t) * k), a = turn(Math.atan2(ry * Math.sin(t), rx * Math.cos(t)) * 57.3, x, y); s += E(x, y + 1.5, 13.5, 6.5, '#5a3319', a) + E(x, y, 13, 6, C.pecan, a) + L(`M${f(x - 9)} ${f(y)} h18`, '#5a3319', 1.3, a) + E(x - 2, y - 2.2, 7, 1.6, C.pecanL, a); } });
        return s;
      }
    };
    return E(cx, cy + 36, 118, 30, C.floor, dim(.6))
      + P(`M${cx - RX} ${cy} A${RX} ${RY} 0 0 0 ${cx + RX} ${cy} L${cx + RX - 18} ${cy + 28} A${RX - 18} ${RY - 14} 0 0 1 ${cx - RX + 18} ${cy + 28}Z`, C.crustD)
      + E(cx, cy, RX, RY, C.crust) + crimps(false) + (tops[kind] || tops.pumpkin)() + crimps(true);
  };

  // an open bakery box from above, and what is packed in it
  const box = kind => {
    const cell = (cols, rows, i) => [66 + (i % cols + .5) * 188 / cols, 82 + (Math.floor(i / cols) + .5) * 156 / rows];
    let s = R(74, 54, 172, 26, C.chinaD, 5) + R(56, 72, 208, 176, C.cream, 9) + R(66, 82, 188, 156, '#e6dcc6', 5);
    if (kind === 'bars') {
      const tiles = [[C.lemonL, at => dust(at, 26, 3)], [C.choc, at => bits(at, 9, 5, [C.dough, C.chocL, '#3a2218'], 4)], ['#b9783a', at => bits(at, 9, 7, [C.pecan, C.pecanL], 4.6)],
        [C.crumb, at => crumbs(at, 12, 9) + dust(at, 18, 2)], [C.crumb, at => crumbs(at, 10, 4) + bits(at, 5, 6, [C.berry], 3.4)], ['#fff8e4', at => L(`M${pt(at(.16, .2))} L${pt(at(.6, .2))}`, '#fff', 2.4)]];
      tiles.forEach(([fill, deco], i) => { const [x, y] = cell(3, 2, i); s += R(x - 26, y - 30, 52, 66, C.floor, 5, dim(.3)) + R(x - 26, y - 33, 52, 66, fill, 5) + deco((u, v) => [x - 24 + u * 48, y - 31 + v * 62]); });
    }
    if (kind === 'cookies') {
      const kinds = [
        (x, y, n) => E(x, y, 20, 20, '#d7a569') + scatter(6, n, r => { const [a, b] = onDisc(r, x, y, 20, 20, .7); return E(a, b, 3.6, 2.8, C.chocD); }),
        (x, y, n) => E(x, y, 20, 20, '#5a382a') + scatter(7, n + 20, r => { const [a, b] = onDisc(r, x, y, 20, 20, .72); return L(`M${f(a - 4)} ${f(b)} l4 -3 l4 3`, '#f3e9d6', 1.8, turn(r() * 180, a, b)); }),
        (x, y, n) => E(x, y, 20, 20, '#c2915a') + scatter(6, n + 40, r => { const [a, b] = onDisc(r, x, y, 20, 20, .7); return E(a, b, 3.2, 2.4, '#4d2b30') + E(a + 5, b + 3, 2.2, 1.2, '#e3c08c'); })
      ];
      for (let i = 0; i < 12; i++) { const [x, y] = cell(4, 3, i); s += E(x, y + 3, 20.5, 20.5, C.floor, dim(.3)) + kinds[(i + Math.floor(i / 4)) % 3](x, y, i + 1); }
    }
    if (kind === 'holiday') {
      const star = (x, y, a, b, fill) => { const p = []; for (let i = 0; i < 10; i++) { const t = i / 10 * 6.2832 - 1.5708, q = i % 2 ? b : a; p.push([x + Math.cos(t) * q, y + Math.sin(t) * q]); } return G(p, fill, ` stroke="${fill}" stroke-width="3" stroke-linejoin="round"`); };
      const tree = (x, y, k, fill) => G([[x, y - 19 * k], [x + 16 * k, y + 12 * k], [x - 16 * k, y + 12 * k]], fill, ` stroke="${fill}" stroke-width="3" stroke-linejoin="round"`);
      const kinds = [
        (x, y, n) => E(x, y, 20, 20, '#e6c489') + E(x, y, 15.5, 15.5, C.cream) + scatter(7, n, r => { const [a, b] = onDisc(r, x, y, 15, 15, .75); return R(a - 2.6, b - .9, 5.2, 1.8, any(r, ['#c5383e', '#3f8a5a']), .9, turn(r() * 180, a, b)); }),
        (x, y) => star(x, y + 1, 21, 9.5, '#e6c489') + star(x, y + 1, 14.5, 6.5, '#c5383e') + E(x, y + 1, 2.2, 2.2, C.cream),
        (x, y) => R(x - 4, y + 12, 8, 8, '#e6c489', 1.5) + tree(x, y, 1, '#e6c489') + tree(x, y + 1.5, .68, '#3f8a5a') + E(x - 3, y + 3, 1.7, 1.7, C.cream) + E(x + 3.5, y + 7, 1.7, 1.7, '#f4c542') + E(x, y - 4, 1.6, 1.6, '#c5383e')
      ];
      for (let i = 0; i < 12; i++) { const [x, y] = cell(4, 3, i); s += kinds[(i + Math.floor(i / 4)) % 3](x, y, i + 1); }
    }
    if (kind === 'rolls') for (let i = 0; i < 12; i++) { const [x, y] = cell(4, 3, i); s += E(x, y + 1, 24, 26, C.crustD) + E(x, y - 1, 22, 23, '#e2ac5e') + E(x - 5, y - 9, 11, 6.5, '#f5d8a2', dim(.85)); }
    return fit(s, 160, 151, 1.04, 160);
  };

  const draw = { croissant, scone, muffin, turnover, frenchtoast, brulee, bar: k => fit(slab(bars[k] || bars.lemon), 160, 178, 1.2, 164), rainbow, oatmeal, macarons, cookies, pie, box };
  return name => {
    const [kind, variant] = String(name).split(':');
    return `<svg viewBox="0 0 320 320" aria-hidden="true" focusable="false"><circle cx="160" cy="160" r="158" fill="#1b1814"/><circle cx="160" cy="160" r="149.5" fill="none" stroke="#f4c542" stroke-width="1.4" opacity=".85"/>${draw[kind] ? draw[kind](variant) : ''}</svg>`;
  };
})();

/* ---------------------------------------------------------------- the case: tabs, and something to see for every line.
   Wide screens show it in the frame beside the list. Narrower ones open it under the line you tap. */
(() => {
  const tabs = $$('[data-tabs] .tab'), frame = $('[data-preview]');
  if (!tabs.length || !frame) return;
  const rows = $$('.case .row'), wide = matchMedia('(min-width: 1100px)');
  const hit = row => $('.row__hit', row);

  // a photograph where the bakery has one, a drawing where it does not
  const visual = row => {
    if (row.dataset.img) { const img = new Image(); img.alt = row.dataset.alt || ''; img.decoding = 'async'; img.src = 'assets/img/' + row.dataset.img; return img; }
    const el = document.createElement('div');
    el.className = 'sketch'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', 'A drawing: ' + $('.row__name', row).textContent);
    el.innerHTML = sketch(row.dataset.sketch);
    return el;
  };
  const key = row => row.dataset.img || 'drawn ' + row.dataset.sketch;
  let shown = ($('img', frame)?.getAttribute('src') || '').replace('assets/img/', '');
  const stage = row => {
    const k = key(row);
    if (k === shown) return;
    shown = k;
    const node = visual(row);
    frame.append(node);
    const on = () => requestAnimationFrame(() => {
      if (shown !== k) { node.remove(); return; }
      [...frame.children].forEach(c => { if (c !== node) { c.classList.remove('is-on'); setTimeout(() => c.remove(), 600); } });
      void node.offsetWidth;
      node.classList.add('is-on');
    });
    node.tagName === 'IMG' && !node.complete ? node.addEventListener('load', on, { once: true }) : on();
  };

  const mark = (row, on) => hit(row).setAttribute(wide.matches ? 'aria-pressed' : 'aria-expanded', String(on));
  const set = (row, on) => {
    row.classList.toggle('is-on', on);
    mark(row, on);
    const pic = $('.row__pic', row);
    if (on && !wide.matches && !pic.firstChild) pic.append(visual(row));
  };
  const pick = (row, toggle) => {
    const was = row.classList.contains('is-on');
    $$('.row.is-on', row.parentElement).forEach(r => set(r, false));
    if (toggle && was) return;
    set(row, true);
    if (wide.matches) stage(row);
  };

  frame.closest('.case').classList.add('is-live');
  rows.forEach(row => {
    const b = document.createElement('button'), more = document.createElement('div');
    b.type = 'button'; b.className = 'row__hit';
    b.append($('.row__name', row), $('.row__price', row));
    more.className = 'row__more'; more.innerHTML = '<div class="row__clip"><div class="row__pic"></div></div>';
    row.prepend(b); row.append(more);
    mark(row, false);
    b.addEventListener('click', () => pick(row, !wide.matches));
    b.addEventListener('focus', () => { if (wide.matches) pick(row); });
    row.addEventListener('pointerenter', e => { if (wide.matches && e.pointerType === 'mouse') pick(row); });
    b.addEventListener('keydown', e => {
      const list = $$('.row__hit', row.parentElement), to = { ArrowDown: list.indexOf(b) + 1, ArrowUp: list.indexOf(b) - 1, Home: 0, End: list.length - 1 }[e.key];
      if (to === undefined || !list[to]) return;
      e.preventDefault();
      list[to].focus();
    });
  });

  const select = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    const panel = $('#' + tab.getAttribute('aria-controls'));
    $$('.row', panel).forEach((r, n) => r.style.setProperty('--n', n));
    panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping');
    pick($('.row', panel));
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
    });
  });

  // the same line stays chosen when the layout changes between the two
  wide.addEventListener('change', () => {
    rows.forEach(r => { hit(r).removeAttribute('aria-pressed'); hit(r).removeAttribute('aria-expanded'); mark(r, r.classList.contains('is-on')); });
    const panel = $('.panel:not([hidden])');
    pick($('.row.is-on', panel) || $('.row', panel));
  });
  pick($('.panel:not([hidden]) .row'));
})();

/* ---------------------------------------------------------------- build your cake */
(() => {
  const form = $('[data-builder]');
  if (!form) return;
  const svg = $('[data-cake]', form);

  // the thirteen flavors of the tasting box; the colours are the crumb you see in the slice
  const FLAVORS = [
    { name: 'White velvet', sponge: '#f6e9c8', filling: '#fffaf0' },
    { name: 'Marble', sponge: '#f1ddb5', filling: '#fff6e2', fleck: '#6b4226', kind: 'swirl' },
    { name: 'Death by chocolate', sponge: '#4f2d1c', filling: '#2c1810' },
    { name: 'Bourbon pecan caramel', sponge: '#cfa064', filling: '#a86b2c', fleck: '#7a4a1e', kind: 'dots' },
    { name: 'Cookies and cream', sponge: '#efe6d6', filling: '#fbf6ea', fleck: '#2b2420', kind: 'dots' },
    { name: 'Double strawberry', sponge: '#f4b7b2', filling: '#e2706f' },
    { name: 'Lemon', sponge: '#f7e27a', filling: '#fff3b0' },
    { name: 'Biscoff cookie butter', sponge: '#d2a56d', filling: '#b77f45' },
    { name: 'Carrot', sponge: '#c98a4b', filling: '#fff6e5', fleck: '#e0782b', kind: 'dots' },
    { name: 'Berry streusel', sponge: '#ebd3c0', filling: '#a8405f', fleck: '#8e2f4f', kind: 'dots' },
    { name: 'Caramel', sponge: '#e3b66b', filling: '#c98b2e' },
    { name: 'Earl Grey tea honey', sponge: '#d9cdb8', filling: '#e9c46a', fleck: '#5b5146', kind: 'dots' },
    { name: 'Coconut', sponge: '#fbf7ee', filling: '#ffffff', fleck: '#e3d6bb', kind: 'dots' },
  ];
  const COLORS = [
    { name: 'Ivory', c: '#fbf3e0' }, { name: 'White', c: '#ffffff' }, { name: 'Blush', c: '#f6cfc4' }, { name: 'Butter', c: '#f6de8d' },
    { name: 'Sage', c: '#c9d5b5' }, { name: 'Sky', c: '#c8ddea' }, { name: 'Peach', c: '#f7c9a0' }, { name: 'Cocoa', c: '#6b4630' },
  ];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('[data-flavors]', form).innerHTML = FLAVORS.map((f, i) => `<label class="swatch"><input type="radio" name="flavor" value="${i}"${i ? '' : ' checked'}><span><i style="--c:${f.sponge}"></i>${esc(f.name)}</span></label>`).join('');
  $('[data-colors]', form).innerHTML = COLORS.map((c, i) => `<label class="swatch"><input type="radio" name="color" value="${i}"${i ? '' : ' checked'}><span><i style="--c:${c.c}"></i>${c.name}</span></label>`).join('');

  /* ---- the sketch */
  const CX = 330;
  const LAYOUTS = { 1: [[220, 116]], 2: [[250, 102], [170, 92]], 3: [[270, 96], [198, 86], [134, 76]], 4: [[280, 90], [214, 80], [154, 70], [100, 62]] };
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const n1 = v => +v.toFixed(1);
  const tiersFor = n => { let y = 432; return LAYOUTS[n].map(([w, h], i) => { const t = { i, w, h, x: CX - w / 2, yBot: y, yTop: y - h, ry: n1(w * 0.062) }; y -= h; return t; }); };
  const body = t => `M${t.x} ${t.yTop}V${t.yBot}A${t.w / 2} ${t.ry} 0 0 0 ${t.x + t.w} ${t.yBot}V${t.yTop}Z`;
  const edge = (t, x) => t.yTop + t.ry * Math.sqrt(Math.max(0, 1 - ((x - CX) / (t.w / 2)) ** 2));

  const textured = (t, r) => {
    let s = '';
    for (let y = t.yTop + 16; y < t.yBot + t.ry; y += 13) {
      let d = `M${t.x - 6} ${n1(y + (r() - .5) * 3)}`;
      for (let x = t.x; x < t.x + t.w + 24; x += 26) d += `q13 ${n1((r() - .5) * 9 - 3)} 26 ${n1((r() - .5) * 2)}`;
      s += `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="3.2" stroke-linecap="round"/>`;
    }
    return s;
  };
  const stencil = t => {
    let s = '', row = 0;
    for (let y = t.yTop + 22; y < t.yBot + t.ry - 6; y += 24, row++) for (let x = t.x + (row % 2 ? 26 : 11); x < t.x + t.w; x += 30)
      s += `<g transform="translate(${x} ${y})" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"><circle r="9"/><path d="M-5 1a5 5 0 0 1 9-3M-2 2a3 3 0 0 0 5 1"/></g>`;
    return s;
  };
  const drip = (t, r) => {
    const base = x => n1(edge(t, x) + 6), hw = 6;
    let d = `M${t.x} ${t.yTop}L${t.x} ${n1(t.yTop + 7)}`, x = t.x + 10 + r() * 8;
    while (x < t.x + t.w - 22) {
      const len = n1(8 + r() * 30);
      d += `L${n1(x)} ${base(x)}v${len}a${hw} ${hw} 0 0 0 ${hw * 2} 0V${base(x + hw * 2)}`;
      x += hw * 2 + 10 + r() * 16;
    }
    d += `L${t.x + t.w} ${n1(t.yTop + 7)}L${t.x + t.w} ${t.yTop}A${t.w / 2} ${t.ry} 0 0 0 ${t.x} ${t.yTop}Z`;
    return `<path d="${d}" fill="#4a2c1c"/><path d="M${t.x + t.w * .2} ${n1(t.yTop - t.ry * .45)}a${n1(t.w * .3)} ${n1(t.ry * .5)} 0 0 1 ${n1(t.w * .34)} ${n1(-t.ry * .3)}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2.5" stroke-linecap="round"/>`;
  };
  const gold = (t, r) => {
    let s = `<path d="M${t.x + 2} ${t.yTop + 2}A${t.w / 2} ${t.ry} 0 0 0 ${t.x + t.w - 2} ${t.yTop + 2}" fill="none" stroke="#d9a93c" stroke-width="3.2" stroke-dasharray="18 4 9 6 26 5 12 7" stroke-linecap="round"/>`;
    const k = 4 + Math.round(t.w / 60);
    for (let i = 0; i < k; i++) {
      const x = t.x + 14 + r() * (t.w - 28), y = t.yTop + 18 + r() * (t.h - 22), m = 5 + Math.floor(r() * 2), pts = [];
      for (let j = 0; j < m; j++) { const a = j / m * Math.PI * 2, rad = 3 + r() * 6; pts.push(`${n1(x + Math.cos(a) * rad)},${n1(y + Math.sin(a) * rad * .8)}`); }
      s += `<polygon points="${pts.join(' ')}" fill="${r() > .5 ? '#d9a93c' : '#eccb6a'}"/>`;
    }
    return s;
  };
  const rosettes = t => {
    let s = '';
    const k = Math.max(3, Math.floor(t.w / 30));
    for (let i = 0; i < k; i++) {
      const x = t.x + 12 + (i + .5) / k * (t.w - 24), y = t.yTop - 8 + Math.sqrt(Math.max(0, 1 - ((x - CX) / (t.w / 2)) ** 2)) * t.ry * .55;
      s += `<g transform="translate(${n1(x)} ${n1(y)})"><circle r="12.5" class="c-top" stroke="rgba(0,0,0,.14)" stroke-width="1"/><path d="M-7 1a7 7 0 0 1 13-4M-4 3a4.5 4.5 0 0 0 8 0M-1-1a2 2 0 0 1 3 1" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="1.3" stroke-linecap="round"/></g>`;
    }
    return s;
  };
  const bloom = (x, y, k = 1) => `<g transform="translate(${n1(x)} ${n1(y)}) scale(${k})"><ellipse cx="-17" cy="6" rx="12" ry="5.5" transform="rotate(-24 -17 6)" fill="#9fb48c"/><ellipse cx="18" cy="8" rx="11" ry="5" transform="rotate(20 18 8)" fill="#8aa37a"/><circle cx="-4" cy="-2" r="13" fill="#f4c3b6"/><path d="M-10-2a7 7 0 0 1 12-4M-7 1a4.5 4.5 0 0 0 8-1" fill="none" stroke="#d99987" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="-6" r="9.5" fill="#f8dcae"/><path d="M8-6a4.5 4.5 0 0 1 8-2" fill="none" stroke="#dcb777" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="7" r="7.5" fill="#fff8ee"/><path d="M4 7a3.5 3.5 0 0 1 6-1" fill="none" stroke="#e5d3bd" stroke-width="1.2" stroke-linecap="round"/></g>`;
  const flowers = ts => {
    const top = ts[ts.length - 1];
    let s = bloom(top.x + top.w - 20, top.yTop - 4, .95);
    s += ts.length > 1 ? bloom(ts[1].x + 4, ts[1].yBot - 6, 1.1) : bloom(top.x + 16, top.yBot + 8, .9);
    if (ts.length > 2) s += bloom(ts[2].x + ts[2].w - 6, ts[2].yBot - 5, .8);
    return s;
  };
  const candles = t => {
    let s = '';
    const k = t.w > 150 ? 5 : 3, gap = Math.min(28, t.w / (k + 1));
    for (let i = 0; i < k; i++) s += `<g transform="translate(${n1(CX + (i - (k - 1) / 2) * gap)} ${t.yTop - 3 + (i % 2 ? 3 : 0)})"><rect x="-2.6" y="-34" width="5.2" height="34" rx="2" fill="#fffdf7"/><path d="M-2.6-27l5.2-4M-2.6-19l5.2-4M-2.6-11l5.2-4" stroke="#f4c542" stroke-width="2"/><path d="M0-50c5 6 5 10 0 13c-5-3-5-7 0-13z" fill="#f4c542"/><path d="M0-44c2 3 2 5 0 6.500c-2-1.500-2-3.500 0-6.500z" fill="#fffdf7"/></g>`;
    return s;
  };
  const flag = t => `<g transform="translate(${n1(CX + Math.min(30, t.w / 4))} ${t.yTop - 2})"><path d="M0 0V-54" stroke="#fffdf7" stroke-width="2.4" stroke-linecap="round"/><path d="M1-54h48l-9 10.500l9 10.500h-48z" fill="#f4c542"/><text x="7" y="-39" font-family="Hanken Grotesk, sans-serif" font-size="12.500" font-weight="600" fill="#1b1814">sorry</text></g>`;
  const slice = (fl, r) => {
    const x = 52, y = 434, w = 88;
    let s = `<ellipse cx="${x + w / 2}" cy="504" rx="74" ry="10" class="c-stand-rim"/><ellipse cx="${x + w / 2}" cy="501" rx="74" ry="10" class="c-stand"/><g transform="translate(${x} ${y})"><rect width="${w}" height="64" rx="4" class="c-body"/>`;
    let yy = 9;
    for (let i = 0; i < 3; i++) {
      s += `<rect x="8" y="${yy}" width="${w - 8}" height="15" class="c-sponge"/>`;
      if (fl.kind === 'dots') for (let j = 0; j < 9; j++) s += `<circle cx="${n1(12 + r() * (w - 16))}" cy="${n1(yy + 2.500 + r() * 10)}" r="${n1(.9 + r() * 1.3)}" class="c-fleck"/>`;
      if (fl.kind === 'swirl') s += `<path d="M9 ${yy + 5 + i}q9 ${6 - i * 2} 19 0t20 2t19-3t12 2" class="c-swirl"/>`;
      yy += 15;
      if (i < 2) { s += `<rect x="8" y="${yy}" width="${w - 8}" height="4" class="c-filling"/>`; yy += 4; }
    }
    return s + `<rect width="${w}" height="9" rx="4" class="c-top"/><rect x="${w - 3}" y="9" width="3" height="55" fill="#000" opacity=".08"/></g>`;
  };

  let shape = '', prevTiers = 0;
  const draw = st => {
    const ts = tiersFor(st.tiers), top = ts[ts.length - 1];
    const grew = prevTiers && st.tiers > prevTiers;
    let s = `<defs><linearGradient id="cake-shade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`;
    ts.forEach(t => { s += `<clipPath id="cake-clip-${t.i}"><path d="${body(t)}"/></clipPath>`; });
    s += `</defs>`;
    s += `<ellipse cx="${CX}" cy="505" rx="86" ry="10" class="c-stand-rim"/><ellipse cx="${CX}" cy="501" rx="86" ry="10" class="c-stand"/><path d="M${CX - 14} 446h28l11 54h-50z" class="c-stand"/><path d="M${CX + 2} 446h12l11 54h-14z" fill="#000" opacity=".07"/>`;
    s += `<path d="M${CX - 178} 438a178 15 0 0 0 356 0v8a178 15 0 0 1-356 0z" class="c-stand-rim"/><ellipse cx="${CX}" cy="438" rx="178" ry="15" class="c-stand"/>`;
    ts.forEach(t => {
      const r = rng(97 + t.i * 31 + st.tiers * 7);
      s += `<g class="tier${grew && t.i === st.tiers - 1 ? ' tier--new' : ''}"><path class="c-body" d="${body(t)}"/><path d="${body(t)}" fill="url(#cake-shade)"/>`;
      if (st.finish === 'textured') s += `<g clip-path="url(#cake-clip-${t.i})">${textured(t, r)}</g>`;
      if (st.finish === 'stencilled') s += `<g clip-path="url(#cake-clip-${t.i})">${stencil(t)}</g>`;
      s += `<ellipse class="c-top" cx="${CX}" cy="${t.yTop}" rx="${t.w / 2}" ry="${t.ry}"/>`;
      if (st.finish === 'drip') s += drip(t, r);
      if (st.extras.gold) s += `<g clip-path="url(#cake-clip-${t.i})">${gold(t, r)}</g>`;
      s += `</g>`;
    });
    if (st.extras.rosettes) s += `<g class="fx${st.changed === 'rosettes' ? ' fx-in' : ''}">${rosettes(top)}</g>`;
    if (st.extras.flowers) s += `<g class="fx${st.changed === 'flowers' ? ' fx-in' : ''}">${flowers(ts)}</g>`;
    if (st.occasion === 'Birthday') s += `<g class="fx${st.changed === 'occasion' ? ' fx-in' : ''}">${candles(top)}</g>`;
    if (st.occasion === "I'm sorry") s += `<g class="fx${st.changed === 'occasion' ? ' fx-in' : ''}">${flag(top)}</g>`;
    s += slice(st.flavor, rng(11 + FLAVORS.indexOf(st.flavor)));
    svg.innerHTML = s;
    prevTiers = st.tiers;
  };
  const mix = (hex, to, k) => { const a = hex.match(/\w\w/g).map(h => parseInt(h, 16)), b = to.match(/\w\w/g).map(h => parseInt(h, 16)); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };

  /* ---- the state, read from the form */
  const TIER_WORDS = ['', 'single-tier', 'two-tier', 'three-tier', 'four-tier'], TIER_COUNT = ['', 'one tier', 'two tiers', 'three tiers', 'four tiers'];
  const FINISH = { smooth: 'smooth', textured: 'textured', stencilled: 'stencilled', drip: 'with a chocolate drip' };
  const FINISH_NAME = { smooth: 'Smooth', textured: 'Textured', stencilled: 'Stencilled', drip: 'Chocolate drip' };
  const EXTRA = { rosettes: 'piped rosettes', flowers: 'fresh flowers', gold: 'gold leaf' };
  const FOR = { Wedding: 'For a wedding', Birthday: 'For a birthday', Anniversary: 'For an anniversary', Graduation: 'For a graduation', Retirement: 'For a retirement', Promotion: 'For a promotion', 'Work thing': 'For a work thing', 'Just because': 'Just because', "I'm sorry": 'To say sorry' };
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  const longDate = v => { if (!v) return ''; const d = new Date(v + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); };

  const read = () => {
    const fd = new FormData(form), servings = +fd.get('servings');
    const extras = fd.getAll('extras');
    return {
      occasion: fd.get('occasion'), servings, tiers: servings <= 20 ? 1 : servings <= 50 ? 2 : servings <= 100 ? 3 : 4,
      flavor: FLAVORS[+fd.get('flavor')] || FLAVORS[0], color: COLORS[+fd.get('color')] || COLORS[0], finish: fd.get('finish'),
      extras: { rosettes: extras.includes('rosettes'), flowers: extras.includes('flowers'), gold: extras.includes('gold') },
      date: fd.get('date'), name: (fd.get('name') || '').trim(), email: (fd.get('email') || '').trim(), phone: (fd.get('phone') || '').trim(), notes: (fd.get('notes') || '').trim(),
    };
  };
  const sentence = st => {
    const ex = Object.keys(EXTRA).filter(k => st.extras[k]).map(k => EXTRA[k]);
    const when = longDate(st.date).replace(/, \d{4}$/, '');
    return `A ${TIER_WORDS[st.tiers]} ${st.flavor.name.toLowerCase().replace('earl grey', 'Earl Grey').replace('biscoff', 'Biscoff')} cake in ${st.color.name.toLowerCase()} buttercream, ${FINISH[st.finish]}${ex.length ? ', with ' + list(ex) : ''}, for about ${st.servings}. ${FOR[st.occasion]}${when ? ' on ' + when : ''}.`;
  };
  const range = $('[data-servings]', form);
  const update = changed => {
    const st = read();
    st.changed = changed;
    svg.style.setProperty('--bc', st.color.c);
    svg.style.setProperty('--bc-top', mix(st.color.c.slice(1), 'ffffff', st.color.name === 'Cocoa' ? .18 : .45));
    svg.style.setProperty('--sponge', st.flavor.sponge);
    svg.style.setProperty('--filling', st.flavor.filling);
    svg.style.setProperty('--fleck', st.flavor.fleck || st.flavor.sponge);
    const key = [st.tiers, st.finish, st.extras.rosettes, st.extras.flowers, st.extras.gold, st.occasion === 'Birthday', st.occasion === "I'm sorry", st.flavor.kind || '', st.flavor.kind ? st.flavor.name : ''].join('|');
    if (key !== shape) { shape = key; draw(st); }
    svg.style.setProperty('--zoom', [1, 1.25, 1.15, 1.06, 1][st.tiers]);
    range.style.setProperty('--fill', ((st.servings - range.min) / (range.max - range.min) * 100).toFixed(1) + '%');
    $('[data-servings-out]', form).textContent = `About ${st.servings} people, ${TIER_COUNT[st.tiers]}`;
    $('[data-flavor-name]', form).textContent = st.flavor.name;
    $('[data-color-name]', form).textContent = st.color.name;
    $('[data-summary]', form).textContent = sentence(st);
    return st;
  };
  form.addEventListener('input', e => update(e.target.name === 'extras' ? e.target.value : e.target.name));
  form.addEventListener('change', e => update(e.target.name === 'extras' ? e.target.value : e.target.name));
  update();
  hero?.onPick(occasion => { if (!occasion) return; const input = $$('input[name="occasion"]', form).find(i => i.value === occasion); if (input) { input.checked = true; update('occasion'); } });

  /* ---- sending it: the request on paper, then the visitor's own email */
  const dialog = $('[data-receipt]'), err = $('[data-error]', form);
  const fail = (field, msg) => { err.textContent = msg; err.hidden = false; const el = form.elements[field]; el.setAttribute('aria-invalid', 'true'); el.focus(); return false; };
  const check = st => {
    $$('[aria-invalid]', form).forEach(el => el.removeAttribute('aria-invalid'));
    err.hidden = true;
    if (!st.date) return fail('date', 'Pick the day you need the cake.');
    const d = new Date(st.date + 'T12:00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) return fail('date', 'That day has passed. Pick a day from tomorrow on.');
    if (d.getDay() === 0 || d.getDay() === 1) return fail('date', 'We are closed Sunday and Monday. Pick a day from Tuesday to Saturday.');
    if (!st.name) return fail('name', 'Add the name the order is under.');
    if (!/^\S+@\S+\.\S+$/.test(st.email)) return fail('email', 'Add an email address with an @, so we can send the quote.');
    return true;
  };
  const sprinkle = () => {
    if (reduced) return;
    const hues = ['#f4c542', '#fffdf7', '#f4c3b6', '#9fb48c', '#c8ddea'];
    for (let i = 0; i < 34; i++) {
      const b = document.createElement('i');
      b.className = 'sprinkle';
      b.style.cssText = `left:50%;top:38%;background:${hues[i % hues.length]};--dx:${Math.round((Math.random() - .5) * 620)}px;--dy:${Math.round(-60 - Math.random() * 300 + (i % 3) * 140)}px;--rot:${Math.round((Math.random() - .5) * 720)}deg;animation-delay:${i * 9}ms`;
      dialog.append(b);
      setTimeout(() => b.remove(), 1700);
    }
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const st = update();
    if (!check(st)) return;
    const ex = Object.keys(EXTRA).filter(k => st.extras[k]).map(k => EXTRA[k]);
    const rows = [
      ['Occasion', st.occasion], ['Date', longDate(st.date)], ['Size', `About ${st.servings} people, ${TIER_COUNT[st.tiers]}`], ['Flavor', st.flavor.name],
      ['Buttercream', st.color.name], ['Finish', FINISH_NAME[st.finish] + (ex.length ? ', ' + list(ex) : '')], ...(st.notes ? [['Notes', st.notes]] : []), ['Name', st.name], ['Reply to', st.email + (st.phone ? ', ' + st.phone : '')],
    ];
    $('[data-receipt-rows]').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('[data-receipt-line]').textContent = sentence(st);
    const mail = `Cake request from the website\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${sentence(st)}`;
    $('[data-receipt-mail]').href = `mailto:blcakeorder@gmail.com?subject=${encodeURIComponent(`Cake request: ${st.occasion}, ${longDate(st.date)}`)}&body=${encodeURIComponent(mail)}`;
    dialog.showModal();
    sprinkle();
  });
  $('[data-receipt-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
})();

/* ---------------------------------------------------------------- the strip: drag it with a mouse, swipe it with a thumb */
(() => {
  const film = $('[data-film]'), thumb = $('[data-film-thumb]');
  if (!film) return;
  const paint = () => {
    if (!thumb) return;
    const max = film.scrollWidth - film.clientWidth, w = clamp(film.clientWidth / film.scrollWidth, .08, 1), p = max > 0 ? film.scrollLeft / max : 0;
    thumb.style.transform = `translateX(${(p * (1 - w) * 100).toFixed(2)}%) scaleX(${w.toFixed(3)})`;
  };
  film.addEventListener('scroll', paint, { passive: true });
  addEventListener('resize', paint);
  paint();
  let down = false, startX = 0, startLeft = 0, lastX = 0, v = 0, raf = 0;
  film.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; startX = lastX = e.clientX; startLeft = film.scrollLeft; v = 0;
    cancelAnimationFrame(raf);
    film.classList.add('is-dragging');
    film.setPointerCapture(e.pointerId);
  });
  film.addEventListener('pointermove', e => {
    if (!down) return;
    film.scrollLeft = startLeft - (e.clientX - startX);
    v = e.clientX - lastX; lastX = e.clientX;
  });
  const up = () => {
    if (!down) return;
    down = false;
    film.classList.remove('is-dragging');
    const glide = () => { if (Math.abs(v) < .4) return; film.scrollLeft -= v; v *= .94; raf = requestAnimationFrame(glide); };
    if (!reduced) glide();
  };
  film.addEventListener('pointerup', up);
  film.addEventListener('pointercancel', up);
})();

/* ---------------------------------------------------------------- the story: the line fills, the years light up; then the name, word by word */
(() => {
  const tl = $('[data-timeline]'), quote = $('[data-words]');
  let words = [];
  if (quote) {
    quote.innerHTML = quote.textContent.trim().split(/[ \n\t]+/).map(w => `<span class="w">${w}</span>`).join(' ');   // a no-break space keeps two words in one piece
    words = $$('.w', quote);
  }
  if (reduced) { words.forEach(w => w.classList.add('is-on')); $$('.timeline__item').forEach(i => i.classList.add('is-on')); tl?.style.setProperty('--p', 1); return; }
  let ticking = false;
  const paint = () => {
    ticking = false;
    const vh = innerHeight;
    if (tl) {
      const r = tl.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        tl.style.setProperty('--p', clamp((vh * .6 - r.top) / r.height).toFixed(3));
        $$('.timeline__item', tl).forEach(item => item.classList.toggle('is-on', item.getBoundingClientRect().top < vh * .62));
      }
    }
    if (quote) {
      const r = quote.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        const p = clamp((vh * .9 - r.top) / (vh * .4 + r.height * .5));   // every word is lit by the time the line sits mid-screen
        const on = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('is-on', i < on));
      }
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  addEventListener('resize', paint);
  paint();
})();

/* ---------------------------------------------------------------- the pointer's label over things you can drag */
(() => {
  const el = $('[data-cursor-el]');
  if (!el || !finePointer || reduced) return;
  const label = $('span', el);
  let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0, seen = false, checking = false;
  const loop = () => { x += (tx - x) * .22; y += (ty - y) * .22; el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = on || Math.abs(tx - x) > .5 || Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0; };
  // the label belongs to whatever is under the pointer now
  const sync = target => {
    const host = target?.closest?.('[data-cursor]');
    const want = !!host && !host.classList.contains('is-dragging');
    if (want !== on) { on = want; if (on) { label.textContent = host.dataset.cursor; x = tx; y = ty; } el.classList.toggle('is-on', on); }
    if (!raf) raf = requestAnimationFrame(loop);
  };
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; seen = true; sync(e.target); }, { passive: true });
  // a page that scrolls under a still pointer sends no move, so look again: the label must not ride along onto the next section
  addEventListener('scroll', () => {
    if (!seen || checking) return;
    checking = true;
    requestAnimationFrame(() => { checking = false; sync(document.elementFromPoint(tx, ty)); });
  }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; el.classList.remove('is-on'); });
})();
