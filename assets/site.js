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

/* ---------------------------------------------------------------- reveal as sections arrive */
(() => {
  const els = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
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

/* ---------------------------------------------------------------- the case: tabs, and the photograph for the line you point at */
(() => {
  const tabs = $$('[data-tabs] .tab'), frame = $('[data-preview]');
  if (!tabs.length || !frame) return;
  let shown = $('img', frame)?.getAttribute('src') || '';
  const show = (file, alt) => {
    const src = 'assets/img/' + file;
    if (src === shown) return;
    shown = src;
    const img = new Image();
    img.alt = alt; img.decoding = 'async'; img.src = src;
    frame.append(img);
    const on = () => requestAnimationFrame(() => {
      if (shown !== src) { img.remove(); return; }
      $$('img', frame).forEach(i => { if (i !== img) { i.classList.remove('is-on'); setTimeout(() => i.remove(), 600); } });
      img.classList.add('is-on');
    });
    img.complete ? on() : img.addEventListener('load', on, { once: true });
  };
  const select = (tab, focus) => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    const panel = $('#' + tab.getAttribute('aria-controls'));
    $$('.row', panel).forEach((r, n) => { r.style.setProperty('--n', n); r.classList.remove('is-on'); });
    panel.classList.remove('is-swapping'); void panel.offsetWidth; panel.classList.add('is-swapping');
    show(panel.dataset.default, panel.dataset.defaultAlt);
    $('.row.has-pic', panel)?.classList.add('is-on');
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
  $$('.row.has-pic').forEach(row => {
    const pick = () => { $$('.row.is-on', row.parentElement).forEach(r => r.classList.remove('is-on')); row.classList.add('is-on'); show(row.dataset.img, row.dataset.alt); };
    row.addEventListener('pointerenter', pick);
    row.addEventListener('focus', pick);
    row.addEventListener('click', pick);
  });
  $('.panel:not([hidden]) .row.has-pic')?.classList.add('is-on');
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
        const p = clamp((vh * .86 - r.top) / (vh * .5 + r.height * .5));
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
  let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0;
  const loop = () => { x += (tx - x) * .22; y += (ty - y) * .22; el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`; raf = on || Math.abs(tx - x) > .5 || Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0; };
  addEventListener('pointermove', e => {
    tx = e.clientX; ty = e.clientY;
    const host = e.target.closest?.('[data-cursor]');
    const want = !!host && !host.classList.contains('is-dragging');
    if (want !== on) { on = want; if (on) { label.textContent = host.dataset.cursor; x = tx; y = ty; } el.classList.toggle('is-on', on); }
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => { on = false; el.classList.remove('is-on'); });
})();
