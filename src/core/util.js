'use strict';
/* Orbling Skies — core utilities (shared by every module; loaded first) */

const GW = 1280, GH = 720;
const PW = 540; // width of the portrait stage (phones held upright); its height follows the screen

const U = {
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  rf(a, b) { return a + Math.random() * (b - a); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  chance(p) { return Math.random() < p; },
  /** items: [[value, weight], ...] */
  weighted(items, rnd = Math.random) {
    let tot = 0;
    for (const it of items) tot += it[1];
    let r = rnd() * tot;
    for (const it of items) { r -= it[1]; if (r <= 0) return it[0]; }
    return items[items.length - 1][0];
  },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  /** deterministic PRNG (mulberry32) */
  rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  uid() { return Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 7); },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); },
  fmt(n) {
    const s = Math.floor(n).toString();
    // thousands: 1,000 (en) · 1 000 (pl, fr, ru; a no-break space) · 1.000 (de, es, it, pt, tr)
    const l = typeof LANG !== 'undefined' ? LANG : 'en';
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, l === 'en' ? ',' : l === 'pl' || l === 'fr' || l === 'ru' ? '\u00a0' : '.');
  },
  today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },
  /** local time of day: dawn 5–8, day 8–18, dusk 18–21, night 21–5 */
  dayPhase(d = new Date()) {
    const h = d.getHours();
    return h >= 21 || h < 5 ? 'night' : h < 8 ? 'dawn' : h < 18 ? 'day' : 'dusk';
  },
  fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return typeof t === 'function' ? t('ui.hm', { h, m: String(m).padStart(2, '0') }) : h + 'h ' + String(m).padStart(2, '0') + 'm';
    return m + ':' + String(sec).padStart(2, '0');
  },

  /* ---------- DOM ---------- */
  el(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) e.style.setProperty(sk, v[sk]); else e.style[sk] = v[sk]; } }
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat(3)) {
      if (c == null || c === false) continue;
      e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return e;
  },
  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
  img(src, cls, extra) { return U.el('img', Object.assign({ src, class: cls || '', draggable: 'false', alt: '' }, extra || {})); },
  /** Web Animations helper; resolves when finished */
  anim(el, frames, opts) {
    if (!el || !el.animate) return Promise.resolve();
    const o = Object.assign({ duration: 300, easing: 'ease-out', fill: 'none' }, opts || {});
    const a = el.animate(frames, o);
    // Resolve on finish, or force-finish after the expected time if the timeline stalls (hidden/throttled page).
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(tm); res(a); };
      const tm = setTimeout(() => { try { a.finish(); } catch (e) { /* ignore */ } fin(); }, o.duration + (o.delay || 0) + 150);
      a.finished.then(fin, fin);
    });
  },

  /* ---------- colour ---------- */
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  },
  hexToHsl(hex) {
    let [r, g, b] = U.hexToRgb(hex).map(v => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  },
  hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return U.rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  },
  /** lighten (+) / darken (-) by absolute lightness amount */
  shade(hex, amt) {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h, s, U.clamp(l + amt, 0, 1));
  },
  hue(hex, deg) {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h + deg, s, l);
  },
  sat(hex, mul) {
    const [h, s, l] = U.hexToHsl(hex);
    return U.hslToHex(h, U.clamp(s * mul, 0, 1), l);
  },
  mix(a, b, t) {
    const A = U.hexToRgb(a), B = U.hexToRgb(b);
    return U.rgbToHex(U.lerp(A[0], B[0], t), U.lerp(A[1], B[1], t), U.lerp(A[2], B[2], t));
  },

  /* ---------- SVG → cached object URL ---------- */
  _svgCache: new Map(),
  svgUrl(key, gen) {
    let u = U._svgCache.get(key);
    if (!u) {
      const svg = gen();
      try { u = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); }
      catch (e) { u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
      U._svgCache.set(key, u);
    }
    return u;
  },
};
