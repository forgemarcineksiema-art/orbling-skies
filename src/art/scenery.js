'use strict';
/* Painterly zone backdrops (1280x720, horizon ≈ y400, walkable ground below).
 * Every biome is painted back-to-front in depth layers with atmospheric perspective:
 * sky + sun bloom, painted cumulus, hazy mountain ranges with lit/shadow faces and snow,
 * forested hills, mesas, cliffs, floating isles, water, a textured ground plane with a worn path,
 * clustered detail, light shafts, a warm/cool colour grade, vignette and canvas grain.
 * The result is rasterized once per session (WArt.bake), so SVG filters are affordable here;
 * cheap radial fades (C.soft) are still preferred over blurs. */

const Scenery = (() => {
  const W = 1280, H = 720, HZ = 400;
  const f = n => Math.round(n * 10) / 10;
  const a2 = n => Math.round(n * 100) / 100;
  const Cn = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
  const En = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
  const Pn = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;
  const Ln = (d, c, w, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${x}/>`;
  const Rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
  const G = (inner, x = '') => inner ? `<g${x}>${inner}</g>` : '';
  const op = a => ` opacity="${a2(a)}"`;
  const poly = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  const pline = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L');
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const depth = y => U.clamp((y - HZ) / (H - HZ), 0, 1);

  /* ======================= GEOMETRY ======================= */
  /** smooth 1-D noise in [-1, 1] (sum of detuned sines) */
  function wave(R, oct = 4, f0 = 1 / 260) {
    const cs = [];
    let norm = 0;
    for (let i = 0; i < oct; i++) { const a = 1 / Math.pow(1.8, i); cs.push([f0 * Math.pow(2.05, i) * (0.75 + R() * 0.5), R() * 6.283, a]); norm += a; }
    return x => { let v = 0; for (const c of cs) v += Math.sin(x * c[0] + c[1]) * c[2]; return v / norm; };
  }
  /** Catmull-Rom → cubic Bézier through points (open) */
  function smooth(pts) {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
  }
  /** closed Catmull-Rom outline */
  function smoothClosed(pts) {
    const n = pts.length;
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + 'Z';
  }
  /** jitter a closed polygon: subdivide every edge and push the new points sideways */
  function roughen(pts, R, amt, sub = 2) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push(a);
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      for (let k = 1; k <= sub; k++) { const t = k / (sub + 1), j = (R() - 0.5) * 2 * amt; out.push([a[0] + dx * t - dy / len * j, a[1] + dy * t + dx / len * j]); }
    }
    return out;
  }
  const lerpPts = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return pts[pts.length - 1][1];
  };
  const qAt = (p0, p1, p2, t) => { const u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; };
  const qTan = (p0, p1, p2, t) => { const u = 1 - t; const x = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]), y = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]); const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

  /* ======================= DRAWING CONTEXT ======================= */
  function newCtx(R) {
    const C = { R, defs: '', n: 0, fx: {} };
    C.id = p => p + (C.n++);
    const stops = st => st.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${a2(s[2])}"` : ''}/>`).join('');
    const norm = st => st.map((s, i) => Array.isArray(s) ? s : [a2(i / Math.max(1, st.length - 1)), s]);
    const v = n => typeof n === 'number' ? f(n) : n;
    C.lin = (st, x1 = 0, y1 = 0, x2 = 0, y2 = 1, user = false) => {
      const id = C.id('l');
      C.defs += `<linearGradient id="${id}" x1="${v(x1)}" y1="${v(y1)}" x2="${v(x2)}" y2="${v(y2)}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops(norm(st))}</linearGradient>`;
      return `url(#${id})`;
    };
    C.rad = (st, o = {}) => {
      const id = C.id('r');
      const at = o.cx != null ? ` cx="${v(o.cx)}" cy="${v(o.cy)}" r="${v(o.r)}"` : '';
      C.defs += `<radialGradient id="${id}"${at}${o.user ? ' gradientUnits="userSpaceOnUse"' : ''}${o.tf ? ` gradientTransform="${o.tf}"` : ''}>${stops(norm(st))}</radialGradient>`;
      return `url(#${id})`;
    };
    /** soft-edged fill (radial fade, objectBoundingBox) — a cheap stand-in for a blurred shape */
    C.soft = (c, a = 1, core = 0.35) => {
      const k = 's' + c + a + core;
      if (!C.fx[k]) { C.fx[k] = C.id('sf'); C.defs += `<radialGradient id="${C.fx[k]}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/><stop offset="${core}" stop-color="${c}" stop-opacity="${a2(a * 0.8)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; }
      return `url(#${C.fx[k]})`;
    };
    /** vertical fade used by curtains / waterfalls (objectBoundingBox) */
    C.vfade = (c, a0, a1, a3 = 0) => {
      const k = 'v' + c + a0 + a1 + a3;
      if (!C.fx[k]) { C.fx[k] = C.id('vf'); C.defs += `<linearGradient id="${C.fx[k]}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity="${a0}"/><stop offset=".6" stop-color="${c}" stop-opacity="${a1}"/><stop offset="1" stop-color="${c}" stop-opacity="${a3}"/></linearGradient>`; }
      return `url(#${C.fx[k]})`;
    };
    C.blur = sd => {
      const k = 'b' + sd;
      if (!C.fx[k]) { C.fx[k] = C.id('fb'); C.defs += `<filter id="${C.fx[k]}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${sd}"/></filter>`; }
      return ` filter="url(#${C.fx[k]})"`;
    };
    /** painterly edge: displaced outline (clouds) */
    C.brush = (scale = 5, freq = 0.02) => {
      const k = 'br' + scale + '_' + freq;
      if (!C.fx[k]) {
        C.fx[k] = C.id('fd');
        C.defs += `<filter id="${C.fx[k]}" x="-12%" y="-20%" width="124%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="${Math.floor(R() * 90)}" result="t"/>` +
          `<feDisplacementMap in="SourceGraphic" in2="t" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
      }
      return ` filter="url(#${C.fx[k]})"`;
    };
    return C;
  }

  /* ======================= SKY ======================= */
  // (at dawn, dusk and night the sky's own layers are repainted for the hour and kept out of the land's grade: see TIME OF DAY)
  function sky(C, st) {
    if (!C.tod) return Rect(0, 0, W, H, C.lin(st));
    C.pre += Rect(0, 0, W, H, C.lin(todSkyStops(C, st)));
    if (C.tod === 'night' && C.todSky >= 0.5) C.pre += todStars(C);
    return '';
  }
  /** sun disc with a wide bloom */
  function sun(C, x, y, r, core, glow, a = 0.55) {
    if (C.tod) { C.pre += todSun(C, x, y, r, a); return ''; }
    const bloom = C.rad([[0, glow, a], [0.18, glow, a * 0.55], [0.5, glow, a * 0.16], [1, glow, 0]], { cx: x, cy: y, r: r * 10, user: 1 });
    return Rect(0, 0, W, H, bloom) + Cn(x, y, r * 2.1, C.soft(glow, 0.6, 0.45)) + Cn(x, y, r, core) + Cn(x, y, r * 0.86, C.soft('#ffffff', 0.7, 0.6));
  }
  function moon(C, x, y, r, core, glow) {
    const R = C.R;
    let s = Rect(0, 0, W, H, C.rad([[0, glow, 0.45], [0.2, glow, 0.2], [1, glow, 0]], { cx: x, cy: y, r: r * 7, user: 1 })) + Cn(x, y, r * 1.6, C.soft(glow, 0.5, 0.5)) + Cn(x, y, r, core);
    const cr = U.shade(core, -0.1);
    for (let i = 0; i < 6; i++) { const a = R() * 6.28, d = R() * r * 0.6, rr = r * (0.08 + R() * 0.14); s += Cn(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, cr, op(0.55)) + Cn(x + Math.cos(a) * d - rr * 0.2, y + Math.sin(a) * d - rr * 0.2, rr * 0.7, U.shade(core, -0.04), op(0.6)); }
    return s + Pn(`M${f(x + r * 0.1)} ${f(y - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r * 0.2)} ${f(y + r * 0.98)}A${f(r * 1.25)} ${f(r * 1.25)} 0 0 0 ${f(x + r * 0.1)} ${f(y - r)}Z`, '#6a5a9a', op(0.18));
  }
  function stars(C, n, yMax, col = '#ffffff') {
    const R = C.R;
    let s = '', big = '';
    for (let i = 0; i < n; i++) { const x = R() * W, y = Math.pow(R(), 1.3) * yMax, r = 0.5 + R() * 1.4; s += Cn(x, y, r, col, op(0.3 + R() * 0.7)); }
    for (let i = 0; i < Math.round(n / 22); i++) {
      const x = R() * W, y = R() * yMax * 0.8, r = 4 + R() * 4;
      big += Cn(x, y, r * 1.8, C.soft(col, 0.35, 0.2)) + Pn(`M${f(x)} ${f(y - r)}Q${f(x + r * 0.14)} ${f(y - r * 0.14)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.14)} ${f(y + r * 0.14)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.14)} ${f(y + r * 0.14)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.14)} ${f(y - r * 0.14)} ${f(x)} ${f(y - r)}Z`, '#fffbe6', op(0.9));
    }
    if (C.tod) { C.pre += s + big; return ''; } // (always drawn right over the sky, so they stay bright behind the graded land)
    return s + big;
  }
  /** thin high streaks of cirrus */
  function streaks(C, n, y0, y1, col, a = 0.35) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = y0 + R() * (y1 - y0), w = 90 + R() * 200;
      s += En(x, y, w, 5 + R() * 6, C.soft(col, 1, 0.3), op(a * (0.6 + R() * 0.7)) + ` transform="rotate(${f((R() - 0.5) * 5)} ${f(x)} ${f(y)})"`);
    }
    return s;
  }
  /** billowy painted cumulus: shadowed flat base, soft body, sunlit tops with a glowing rim */
  function cumulus(C, x, y, w, pal, o = {}) {
    const R = C.R;
    const n = 6 + Math.floor(R() * 4), lobes = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), hump = Math.sin(t * Math.PI);
      const lr = w * (0.08 + hump * 0.12 + R() * 0.05);
      lobes.push([x - w * 0.44 + t * w * 0.88 + (R() - 0.5) * w * 0.05, y - hump * w * (0.08 + R() * 0.07) - lr * 0.25, lr]);
    }
    const tops = 2 + Math.floor(R() * 3);
    for (let i = 0; i < tops; i++) { const t = 0.22 + R() * 0.56; lobes.push([x - w * 0.44 + t * w * 0.88, y - w * (0.17 + R() * 0.1) * Math.sin(t * Math.PI), w * (0.09 + R() * 0.07)]); }
    const lx = o.lx != null ? o.lx : -1;
    let sil = En(x, y + w * 0.02, w * 0.5, w * 0.075, pal.sh);
    for (const [cx, cy, r] of lobes) sil += Cn(cx, cy, r, pal.sh);
    let body = '';
    for (const [cx, cy, r] of lobes) body += Cn(cx + lx * r * 0.08, cy - r * 0.14, r * 0.88, pal.mid);
    for (const [cx, cy, r] of lobes) if (cy < y - w * 0.015) body += Cn(cx + lx * r * 0.22, cy - r * 0.3, r * 0.6, pal.lit);
    let rim = '';
    for (const [cx, cy, r] of lobes) if (cy < y - w * 0.05) rim += Cn(cx + lx * r * 0.4, cy - r * 0.5, r * 0.5, C.soft(pal.rim || '#ffffff', 0.55, 0.3));
    const a = (o.a || 1) * (C.tod === 'night' ? 0.72 : 1); // (moonlit clouds let the night sky through)
    return `<g${C.brush(o.brush != null ? o.brush : 5, 0.02)}${a < 1 ? op(a) : ''}>${sil}<g${C.blur(Math.min(3, Math.max(1.5, Math.round(w * 0.014))))}>${body}</g>${rim}</g>`;
  }
  /** a whole band of cumulus sitting on a line (sea of clouds, horizon banks) */
  function cloudBank(C, y, pal, n = 7, w0 = 200, a) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) s += cumulus(C, -80 + (i + R() * 0.6) * (W + 160) / n, y + (R() - 0.5) * 24, w0 * (0.8 + R() * 0.5), pal, { a });
    return s;
  }
  /** aurora curtain: streaked light hanging from a wavy line */
  function aurora(C, y, amp, col, h = 120, a = 0.5) {
    const R = C.R;
    const wv = wave(R, 3, 1 / 300), wv2 = wave(R, 4, 1 / 40), fill = C.vfade(col, 0, 0.9, 0);
    let s = '';
    for (let x = -10; x < W + 10; x += 7) {
      const yy = y + wv(x) * amp, hh = h * (0.55 + 0.45 * (wv2(x) * 0.5 + 0.5));
      s += Rect(x, yy - hh * 0.25, 8, hh, fill, op(a * (0.35 + 0.65 * Math.max(0, wv2(x + 40) * 0.5 + 0.5))));
    }
    return s;
  }
  /** fan of soft light shafts from (x, y) */
  function shafts(C, x, y, n, len, col, a = 0.16, a0 = 0.15, a1 = 0.85) {
    const R = C.R;
    const fade = C.rad([[0, col, 1], [0.5, col, 0.5], [1, col, 0]], { cx: x, cy: y, r: len * 1.05, user: 1 });
    let s = '';
    for (let i = 0; i < n; i++) {
      const ang = Math.PI * (a0 + (a1 - a0) * (i + R() * 0.8) / n), w = 0.018 + R() * 0.04, l = len * (0.6 + R() * 0.5);
      s += Pn(`M${f(x)} ${f(y)}L${f(x + Math.cos(ang - w) * l)} ${f(y + Math.sin(ang - w) * l)}L${f(x + Math.cos(ang + w) * l)} ${f(y + Math.sin(ang + w) * l)}Z`, fade, op(a * (0.45 + R() * 0.8)));
    }
    return s;
  }

  /* ======================= LAND FORMS ======================= */
  /** jagged mountain range: lit left faces, cool shadow faces, snow caps, warm rim light, valley fog */
  function range(C, o) {
    const R = C.R;
    const n = o.n || 4, base = o.base, floor = o.floor || base + 80, tooth = o.rough != null ? o.rough : 8;
    const rough = wave(R, 5, 1 / 30), jit = wave(R, 3, 1 / 18);
    const span = (W + 260) / n, peaks = [];
    for (let i = 0; i < n; i++) {
      const sl = (o.slope || 0.75) * (0.75 + R() * 0.55);
      peaks.push({ px: -130 + span * (i + 0.2 + R() * 0.6), py: o.top + R() * (base - o.top) * (o.vary != null ? o.vary : 0.5), sl, sr: sl * (0.8 + R() * 0.5) });
    }
    const pts = [], own = [];
    for (let x = -30; x <= W + 30; x += 5) {
      let best = 1e9, bi = 0;
      for (let i = 0; i < n; i++) { const p = peaks[i], dx = x - p.px, y = p.py + Math.abs(dx) * (dx < 0 ? p.sl : p.sr); if (y < best) { best = y; bi = i; } }
      const near = Math.min(1, Math.abs(x - peaks[bi].px) / 24);
      pts.push([x, Math.min(base, best + rough(x) * tooth * near)]);
      own.push(bi);
    }
    const sil = `M-30 ${floor}L` + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + `L${W + 30} ${floor}Z`;
    let s = Pn(sil, C.lin([[0, o.lit || U.shade(o.color, 0.08)], [0.55, o.color], [1, o.foot || o.color]]));
    if (o.snow) {
      const sn = wave(R, 3, 1 / 55), sn2 = wave(R, 3, 1 / 23), top = [], bot = [];
      pts.forEach(([x, y], i) => {
        const p = peaks[own[i]];
        const tri = Math.abs(((x + sn2(x) * 14) / 13 % 2 + 2) % 2 - 1) * (0.5 + 0.5 * Math.abs(sn2(x * 1.7)));
        const line = p.py + (base - p.py) * (o.snowLine || 0.3) + sn(x) * 14 + tri * 22;
        top.push([x, y]); bot.push([x, Math.max(y, line)]);
      });
      s += Pn('M' + top.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'L' + bot.reverse().map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z', o.snow);
    }
    let sh = '';
    for (let i = 0; i < n; i++) {
      const p = peaks[i];
      let i0 = -1, i1 = -1;
      pts.forEach(([x, y], j) => { if (own[j] === i && x >= p.px && y < base - 1) { if (i0 < 0) i0 = j; i1 = j; } });
      if (i0 < 0) continue;
      const xe = pts[i1][0];
      const face = [[p.px, p.py], ...pts.slice(i0, i1 + 1), [xe, floor]];
      const sp = 0.1 + R() * 0.25, spur = [];
      for (let y = floor; y > p.py; y -= 12) spur.push([Math.min(xe, p.px + (y - p.py) * sp + jit(y + i * 50) * 8 * Math.min(1, (y - p.py) / 40)), y]);
      sh += poly(face.concat(spur));
      if (o.rim !== false) {
        const lit = [];
        pts.forEach(([x, y], j) => { if (own[j] === i && x < p.px && x > p.px - (base - p.py) / p.sl * 0.7 && y < base - 2) lit.push([x, y + 1.5]); });
        if (lit.length > 2) s += Ln(pline(lit), o.rimC || '#fff6d8', o.rimW || 2.2, op(o.rimA || 0.45));
      }
    }
    s += Pn(sh, o.shadow, op(o.shadowA || 0.42));
    if (o.fog) s += Pn(sil, C.lin([[0, o.fog, 0], [o.fogFrom || 0.5, o.fog, 0], [1, o.fog, o.fogA != null ? o.fogA : 0.85]]));
    return G(s, o.blur ? C.blur(o.blur) : '');
  }

  /** rolling hills with a lit crest and shaded far-side slopes */
  function hills(C, o) {
    const R = C.R;
    const wv = wave(R, 3, 1 / (o.len || 240));
    const pts = [];
    for (let x = -60; x <= W + 60; x += 24) pts.push([x, o.base - (wv(x) * 0.5 + 0.5) * o.amp]);
    const top = smooth(pts), floor = o.floor || H;
    let s = Pn(top + `L${W + 60} ${floor}L-60 ${floor}Z`, C.lin([[0, o.lit], [0.3, o.color], [1, o.dark || o.color]]));
    let sh = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (y1 - y0 > 2) sh += poly([[x0, y0 + 2], [x1, y1 + 2], [x1 + 30, y1 + 60], [x0 + 20, y0 + 60]]);
    }
    if (sh) s += Pn(sh, o.shadow || U.shade(o.color, -0.12), op(0.26) + C.blur(10));
    if (o.rim) s += Ln(top, o.rim, 2.6, op(0.6) + ' transform="translate(0 1.5)"');
    if (o.fog) s += Rect(0, o.base - o.amp, W, floor - o.base + o.amp, C.lin([[0, o.fog, 0], [0.55, o.fog, 0], [1, o.fog, o.fogA || 0.6]]));
    return { s: G(s, o.blur ? C.blur(o.blur) : ''), yAt: x => lerpPts(pts, x) };
  }

  /** flat-topped butte: talus skirt, eroded walls, strata, lit plateau lip, shadowed right wall */
  function mesa(C, x, y, w, h, pal, o = {}) {
    const R = C.R;
    const topY = y - h, bw = w * (1.3 + R() * 0.25);
    const L = [[x - bw * 0.6, y + 2], [x - bw * 0.5, y - h * 0.1], [x - w * 0.56, y - h * 0.3], [x - w * 0.5, y - h * 0.5], [x - w * 0.53, y - h * 0.62], [x - w * 0.48, y - h * 0.84], [x - w * 0.46, topY]];
    const T = [];
    for (let i = 1; i < 6; i++) T.push([x - w * 0.46 + w * 0.92 * i / 6, topY + (R() - 0.5) * 6]);
    const Rt = [[x + w * 0.46, topY + 2], [x + w * 0.5, y - h * 0.76], [x + w * 0.47, y - h * 0.6], [x + w * 0.54, y - h * 0.44], [x + w * 0.58, y - h * 0.26], [x + bw * 0.5, y - h * 0.08], [x + bw * 0.62, y + 2]];
    const pts = roughen([...L, ...T, ...Rt], R, 2.5, 1);
    const d = poly(pts), cid = C.id('mc');
    C.defs += `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
    let s = Pn(d, C.lin([[0, pal.lit], [0.45, pal.mid], [1, pal.foot || pal.sh]]));
    let inner = '';
    for (let k = 1; k < 7; k++) { const yy = topY + h * k / 7 + (R() - 0.5) * 4; inner += Ln(`M${f(x - bw)} ${f(yy)}Q${f(x)} ${f(yy + (R() - 0.5) * 8)} ${f(x + bw)} ${f(yy + (R() - 0.5) * 6)}`, k % 2 ? pal.band || pal.lit : pal.sh, 2 + R() * 3, op(0.35)); }
    for (let k = 0; k < 7; k++) { const xx = x - w * 0.4 + R() * w * 0.8; inner += Ln(`M${f(xx)} ${f(topY + 4)}l${f((R() - 0.5) * 6)} ${f(h * (0.2 + R() * 0.4))}`, pal.sh, 1.6 + R() * 1.6, op(0.35)); }
    inner += Pn(poly([[x + w * (0.08 + R() * 0.14), topY - 4], [x + w * 0.6, topY - 4], [x + bw * 0.7, y + 4], [x + w * 0.2, y + 4]]), pal.shadow || '#3a2a5a', op(0.42));
    inner += Rect(x - bw, y - h * 0.16, bw * 2, h * 0.2, C.lin([[0, pal.foot || pal.sh, 0], [1, pal.foot || pal.sh, 0.7]]));
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    s += Pn(poly([[x - w * 0.46, topY], ...T, [x + w * 0.46, topY + 2], [x + w * 0.4, topY - 5], [x - w * 0.4, topY - 6]]), pal.top || pal.lit) + Ln(pline([[x - w * 0.46, topY], ...T]), pal.rim || '#fff0d0', 2, op(0.7));
    if (o.grass) for (let i = 0; i < 5; i++) s += tuft(C, x - w * 0.4 + R() * w * 0.8, topY - 3, 6 + R() * 4, o.grass);
    return s;
  }

  /** a tall rock cliff filling one side of the frame (side -1 = left, 1 = right) */
  function cliff(C, side, top, bottom, width, pal, o = {}) {
    const R = C.R;
    const x0 = side < 0 ? -30 : W + 30, xi = side < 0 ? width : W - width;
    const pts = [[x0, bottom], [x0, top]];
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, xx = x0 + (xi - x0) * Math.min(1, t * 1.1), yy = top + Math.pow(t, 1.8) * (bottom - top) * 0.92 + (R() - 0.5) * 14;
      pts.push([xx + (R() - 0.5) * 16, yy]);
    }
    pts.push([xi - side * 8, bottom]);
    const outline = roughen(pts, R, 4, 1), d = poly(outline), cid = C.id('cl');
    C.defs += `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
    let s = Pn(d, C.lin([[0, pal.lit], [0.5, pal.mid], [1, pal.sh]]));
    let inner = '';
    for (let k = 0; k < 11; k++) { const yy = top + 20 + k * (bottom - top) / 11 + (R() - 0.5) * 8; inner += Ln(`M${f(Math.min(x0, xi) - 20)} ${f(yy)}Q${f((x0 + xi) / 2)} ${f(yy + (R() - 0.5) * 16)} ${f(Math.max(x0, xi) + 20)} ${f(yy + (R() - 0.5) * 10)}`, k % 2 ? pal.band : pal.sh, 3 + R() * 5, op(0.4)); }
    for (let k = 0; k < 6; k++) { const xx = Math.min(x0, xi) + R() * Math.abs(xi - x0); inner += Ln(`M${f(xx)} ${f(top + R() * 60)}l${f((R() - 0.5) * 10)} ${f(60 + R() * 120)}`, pal.sh, 2 + R() * 2, op(0.35)); }
    // the face turned toward the centre: in shade on the left cliff, sunlit on the right one
    inner += Rect(Math.min(x0, xi) - 20, top - 20, Math.abs(xi - x0) + 40, bottom - top + 40, C.lin(side < 0 ? [[0, pal.shadow, 0], [0.55, pal.shadow, 0], [1, pal.shadow, 0.55]] : [[0, '#fff4d8', 0.35], [0.4, '#fff4d8', 0], [1, pal.shadow, 0.25]], 0, 0, 1, 0));
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    const ridge = outline.filter(p => p[1] < bottom - 4 && Math.abs(p[0] - x0) > 5);
    s += Ln(pline(ridge), pal.rim || '#fff0d0', 2.2, op(side < 0 ? 0.35 : 0.7));
    if (o.grass) {
      let g = '';
      for (let i = 0; i < ridge.length; i++) { const [px, py] = ridge[i]; if (py > top + (bottom - top) * 0.55) continue; g += crown(C, px, py, 10 + R() * 8, o.grass, { n: 4, dabs: 1 }); }
      s += g;
    }
    return s;
  }

  /** floating isle: grassy cap with a lip, eroded rocky underside, hanging roots, trees, optional waterfall */
  function floatIsle(C, x, y, w, pal, o = {}) {
    const R = C.R;
    const capPts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; capPts.push([x + Math.cos(a) * w * (0.92 + R() * 0.12), y + Math.sin(a) * w * 0.2 * (0.9 + R() * 0.2)]); }
    const under = [[x - w * 0.98, y + 2]];
    for (let i = 1; i < 8; i++) { const t = i / 8, xx = x - w + t * w * 2, dd = Math.sin(t * Math.PI); under.push([xx + (R() - 0.5) * w * 0.1, y + dd * w * (0.55 + R() * 0.25) + (i === 4 ? w * 0.4 : 0)]); }
    under.push([x + w * 0.98, y + 2]);
    const ud = smooth(under) + 'Z', cid = C.id('fi');
    C.defs += `<clipPath id="${cid}"><path d="${ud}"/></clipPath>`;
    let s = '';
    if (o.fall) {
      const fx = x + w * (o.fall - 0.5), fw = w * 0.1;
      s += Rect(fx - fw / 2, y, fw, 260, C.vfade('#eaf8ff', 0.95, 0.5, 0)) + Rect(fx - fw * 0.15, y, fw * 0.3, 240, C.vfade('#ffffff', 0.9, 0.4, 0));
      s += Cn(fx, y + 220, fw * 2.2, C.soft('#ffffff', 0.35, 0.3));
    }
    s += Pn(ud, C.lin([[0, pal.rock], [1, pal.rockSh]]));
    let inner = '';
    for (let k = 1; k < 5; k++) inner += Ln(`M${f(x - w)} ${f(y + k * w * 0.13)}Q${f(x)} ${f(y + k * w * 0.13 + (R() - 0.5) * 10)} ${f(x + w)} ${f(y + k * w * 0.12)}`, pal.band || pal.rockLt, 2 + R() * 2, op(0.4));
    inner += Pn(poly([[x + w * 0.1, y - 4], [x + w * 1.1, y - 4], [x + w * 1.1, y + w * 1.5], [x - w * 0.2, y + w * 1.5]]), pal.rockSh, op(0.4));
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    for (let i = 0; i < 5; i++) { const rx = x - w * 0.7 + R() * w * 1.4, ry = y + w * 0.12 + R() * w * 0.2; s += Ln(`M${f(rx)} ${f(ry)}q${f((R() - 0.5) * 12)} ${f(w * 0.3)} ${f((R() - 0.5) * 8)} ${f(w * (0.4 + R() * 0.4))}`, pal.root || '#5a4a3a', 1.2 + R(), op(0.7)); }
    s += Pn(smoothClosed(capPts), pal.grassSh) + Pn(smoothClosed(capPts.map(([px, py]) => [px - w * 0.02, py - w * 0.03])), C.lin([[0, pal.grassLt], [1, pal.grass]]));
    for (let i = 0; i < 9; i++) { const a = R() * Math.PI, px = x + Math.cos(a) * w * 0.95, py = y + Math.sin(a) * w * 0.18; s += Pn(`M${f(px - 5)} ${f(py)}Q${f(px)} ${f(py + 8 + R() * 8)} ${f(px + 5)} ${f(py)}Z`, pal.grassSh); }
    if (o.trees !== false) {
      const nT = o.trees || (1 + Math.floor(R() * 3));
      for (let i = 0; i < nT; i++) { const tx = x - w * 0.5 + R() * w, th = w * (0.45 + R() * 0.35); s += broadleaf(C, tx, y - w * 0.04, th, pal.leaf, { dabs: 2 }); }
    }
    return s;
  }

  /** cluster of ice / crystal shards with facets and an inner glow */
  function shards(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const n = o.n || (3 + Math.floor(R() * 3));
    let s = En(x, y - h * 0.35, h * 0.7, h * 0.6, C.soft(pal.glow, 0.28, 0.2));
    const list = [];
    for (let i = 0; i < n; i++) list.push([x + (i - (n - 1) / 2) * h * 0.22 + (R() - 0.5) * h * 0.1, h * (0.45 + R() * 0.6) * (i === Math.floor(n / 2) ? 1.25 : 1), (R() - 0.5) * 40 + (i - (n - 1) / 2) * 8]);
    list.sort((a, b) => a[1] - b[1]);
    for (const [sx, sh, rot] of list) {
      const w = sh * 0.2;
      const P = [[-w, 0], [-w, -sh * 0.72], [0, -sh], [w, -sh * 0.72], [w, 0]];
      const g = Pn(poly(P), pal.mid) + Pn(poly([[0, -sh], [w, -sh * 0.72], [w, 0], [w * 0.1, 0]]), pal.sh) + Pn(poly([[-w, -sh * 0.72], [0, -sh], [-w * 0.2, -sh * 0.6]]), pal.hi, op(0.9)) +
        Ln(`M${f(-w * 0.45)} ${f(-sh * 0.1)}L${f(-w * 0.45)} ${f(-sh * 0.66)}`, '#ffffff', Math.max(1, w * 0.12), op(0.55)) + Pn(poly(P), 'none', ` stroke="${pal.line || pal.sh}" stroke-width="1.4"` + op(0.6));
      s += `<g transform="translate(${f(sx)} ${f(y)}) rotate(${f(rot)})">${g}</g>`;
    }
    return s;
  }

  /* ======================= VEGETATION ======================= */
  /** round broadleaf crown of clumps: dark mass, mid body, sunlit clumps, bright dabs */
  function crown(C, x, y, r, pal, o = {}) {
    const R = C.R;
    const n = o.n || Math.max(5, Math.round(r / 7)), cl = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.6, d = r * (0.36 + R() * 0.24);
      cl.push([x + Math.cos(a) * d * 1.05 * (o.wide || 1), y + Math.sin(a) * d * 0.8, r * (0.4 + R() * 0.2)]);
    }
    cl.push([x, y - r * 0.05, r * 0.66]);
    let s = '';
    for (const [cx, cy, cr] of cl) s += Cn(cx + cr * 0.08, cy + cr * 0.1, cr, pal.sh);
    for (const [cx, cy, cr] of cl) if (cy < y + r * 0.3) s += Cn(cx - cr * 0.12, cy - cr * 0.15, cr * 0.8, pal.mid);
    for (const [cx, cy, cr] of cl) if (cx < x + r * 0.25 && cy < y + r * 0.05) s += Cn(cx - cr * 0.26, cy - cr * 0.3, cr * 0.5, pal.lit);
    const dabs = o.dabs != null ? o.dabs : 4;
    for (let i = 0; i < dabs; i++) { const a = Math.PI * (1.05 + R() * 0.6), d = r * (0.45 + R() * 0.4), dx = x + Math.cos(a) * d, dy = y + Math.sin(a) * d * 0.8; s += En(dx, dy, r * 0.1 + 1, r * 0.06 + 0.8, pal.hi, op(0.8) + ` transform="rotate(${f(-30 + R() * 40)} ${f(dx)} ${f(dy)})"`); }
    return s;
  }
  function broadleaf(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const r = h * 0.42, tw = Math.max(1.5, h * 0.055), bend = (R() - 0.5) * h * 0.08;
    const trunk = `M${f(x - tw)} ${f(y)}Q${f(x - tw * 0.7 + bend)} ${f(y - h * 0.3)} ${f(x - tw * 0.55 + bend)} ${f(y - h * 0.55)}L${f(x + tw * 0.55 + bend)} ${f(y - h * 0.55)}Q${f(x + tw * 0.7 + bend)} ${f(y - h * 0.3)} ${f(x + tw)} ${f(y)}Z`;
    return Pn(trunk, o.trunk || '#5a4034') + Pn(`M${f(x + tw * 0.1)} ${f(y)}Q${f(x + tw * 0.4 + bend)} ${f(y - h * 0.3)} ${f(x + tw * 0.2 + bend)} ${f(y - h * 0.55)}L${f(x + tw * 0.55 + bend)} ${f(y - h * 0.55)}Q${f(x + tw * 0.7 + bend)} ${f(y - h * 0.3)} ${f(x + tw)} ${f(y)}Z`, '#000000', op(0.25)) +
      crown(C, x + bend, y - h * 0.6, r, pal, o);
  }
  /** a grove: several overlapping trees of different sizes with bushes at their feet */
  function grove(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const n = o.n || (2 + Math.floor(R() * 4)), items = [];
    for (let i = 0; i < n; i++) items.push([x + (i - (n - 1) / 2) * h * 0.4 + (R() - 0.5) * h * 0.3, y + (R() - 0.3) * h * 0.1, h * (0.62 + R() * 0.5)]);
    items.sort((a, b) => a[1] - b[1]);
    let s = En(x + h * 0.1, y + 2, h * (0.3 + n * 0.22), h * 0.09, C.soft(o.shadowC || '#1a3020', 0.4, 0.4));
    for (const [tx, ty, th] of items) s += broadleaf(C, tx, ty, th, o.pals ? pick(R, o.pals) : pal, o);
    for (let i = 0; i <= n; i++) s += crown(C, x + (R() - 0.5) * h * (0.3 + n * 0.3), y - h * 0.05 + R() * 3, h * (0.1 + R() * 0.08), pal, { n: 4, dabs: 1 });
    return s;
  }
  /** far forest mass: a continuous band of hazy crowns (or spires) along a ridge */
  function forestMass(C, yAt, h, pal, o = {}) {
    const R = C.R;
    let s = '', x = -40;
    const pts = [];
    while (x < W + 40) { pts.push([x, yAt(x) + (o.dy || 0), h * (0.6 + R() * 0.7)]); x += h * (0.35 + R() * 0.35); }
    let base = 'M-40 ' + f(yAt(-40) + h * 0.6);
    for (const [px, py] of pts) base += `L${f(px)} ${f(py)}`;
    s += Pn(base + `L${W + 40} ${f(yAt(W + 40) + h)}L${W + 40} ${f(yAt(W + 40) + h * 1.2)}L-40 ${f(yAt(-40) + h * 1.2)}Z`, pal.sh);
    for (const [px, py, r] of pts) s += o.kind === 'pine' ? Pn(poly([[px - r * 0.3, py + r * 0.1], [px, py - r * 0.9], [px + r * 0.3, py + r * 0.1]]), pal.sh) : Cn(px, py - r * 0.35, r * 0.5, pal.sh);
    for (const [px, py, r] of pts) s += o.kind === 'pine' ? Pn(poly([[px - r * 0.28, py + r * 0.05], [px, py - r * 0.88], [px, py + r * 0.05]]), pal.mid) : Cn(px - r * 0.1, py - r * 0.45, r * 0.38, pal.mid);
    if (o.kind !== 'pine') for (const [px, py, r] of pts) if (R() < 0.7) s += Cn(px - r * 0.2, py - r * 0.58, r * 0.2, pal.lit);
    return G(s, (o.blur ? C.blur(o.blur) : '') + (o.a ? op(o.a) : ''));
  }
  /** layered conifer: lit left half, cool right half, optional snow on the tiers */
  function pine(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const w = h * (o.wk || 0.34), tiers = o.tiers || 4, R0 = [], L0 = [], T = [];
    for (let i = 1; i <= tiers; i++) {
      const ty = y - h + (h * 0.88) * i / tiers, tw = w * (0.3 + 0.7 * i / tiers) * (0.9 + R() * 0.2);
      R0.push([x + tw, ty + h * 0.02]); L0.push([x - tw, ty + h * 0.02 - R() * h * 0.02]);
      T.push([ty, tw]);
      if (i < tiers) { R0.push([x + tw * 0.42, ty - h * 0.03]); L0.push([x - tw * 0.42, ty - h * 0.03]); }
    }
    const tip = [x, y - h], bot = y - h * 0.1;
    const shape = [tip, ...R0, [x, bot], ...L0.slice().reverse()];
    const left = [tip, [x + w * 0.05, bot], ...L0.slice().reverse()];
    let s = Rect(x - h * 0.03, y - h * 0.14, h * 0.06, h * 0.14, o.trunk || '#4a3530') + Pn(poly(shape), pal.sh) + Pn(poly(left), pal.mid);
    if (pal.lit) s += Pn(poly([tip, [x - w * 0.12, y - h * 0.55], ...L0.slice(0, 2).reverse()]), pal.lit, op(0.6));
    if (o.snow) {
      // snow resting along every tier: a sliver from the notch above out to the tier corner
      let sn = '';
      T.forEach(([ty, tw], i) => {
        const [py, pw] = i ? T[i - 1] : [y - h, 0];
        const ay = i ? py - h * 0.03 : y - h, ax = i ? pw * 0.42 : 0;
        for (const sd of [-1, 1]) {
          const A = [x + sd * ax, ay], B = [x + sd * tw, ty + h * 0.02];
          const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
          sn += Pn(`M${f(A[0])} ${f(A[1] - h * 0.012)}Q${f(M[0])} ${f(M[1] - h * 0.035)} ${f(B[0] + sd * 2)} ${f(B[1] - h * 0.005)}Q${f(M[0] + sd * tw * 0.1)} ${f(M[1] + h * 0.02)} ${f(A[0])} ${f(A[1] + h * 0.03)}Z`, sd < 0 ? o.snow : (o.snowSh || '#d8e4f6'));
        }
      });
      s += sn + Pn(poly([tip, [x + w * 0.14, y - h * 0.86], [x, y - h * 0.83], [x - w * 0.14, y - h * 0.86]]), o.snow);
    }
    return s;
  }
  /** a clump of conifers of different heights (tallest in the middle) */
  function pineGroup(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const n = o.n || (3 + Math.floor(R() * 4)), list = [];
    for (let i = 0; i < n; i++) { const t = (i - (n - 1) / 2) / Math.max(1, n - 1); list.push([x + t * h * 0.28 * n + (R() - 0.5) * h * 0.12, y + (R() - 0.5) * h * 0.06, h * (1 - Math.abs(t) * 0.5) * (0.8 + R() * 0.3)]); }
    list.sort((a, b) => a[1] - b[1]);
    let s = En(x, y + 2, h * 0.2 * n, h * 0.06, C.soft(o.shadowC || '#203040', 0.35, 0.4));
    for (const [px, py, ph] of list) s += pine(C, px, py, ph, pal, o);
    return s;
  }
  /** palm with a ringed, curving trunk and drooping feathered fronds */
  function palm(C, x, y, h, pal, o = {}) {
    const R = C.R;
    const lean = o.lean != null ? o.lean : (R() - 0.5) * 0.4;
    const P0 = [x, y], P1 = [x + lean * h * 0.15, y - h * 0.55], P2 = [x + lean * h, y - h];
    const [tx, ty] = P2;
    const Lp = [], Rp = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, [px, py] = qAt(P0, P1, P2, t), [dx, dy] = qTan(P0, P1, P2, t), wd = h * (0.042 - t * 0.018);
      Lp.push([px + dy * wd, py - dx * wd]); Rp.push([px - dy * wd, py + dx * wd]);
    }
    let s = Pn(smooth(Lp) + 'L' + smooth(Rp.slice().reverse()).slice(1) + 'Z', pal.trunk || '#b08658');
    s += Pn(smooth(Rp) + 'L' + smooth(Rp.map(([px, py], i) => { const t = i / 12, [dx, dy] = qTan(P0, P1, P2, t), wd = h * (0.042 - t * 0.018) * 0.9; return [px + dy * wd, py - dx * wd]; }).reverse()).slice(1) + 'Z', pal.trunkSh || '#7a5634', op(0.7));
    for (let i = 1; i < 12; i++) { const t = i / 12, [px, py] = qAt(P0, P1, P2, t), [dx, dy] = qTan(P0, P1, P2, t), wd = h * (0.042 - t * 0.018); s += Ln(`M${f(px + dy * wd)} ${f(py - dx * wd)}Q${f(px + dx * 4)} ${f(py + dy * 4 + 3)} ${f(px - dy * wd)} ${f(py + dx * wd)}`, pal.trunkSh || '#7a5634', 1.6, op(0.75)); }
    const fr = [];
    for (let i = 0; i < 9; i++) fr.push(-Math.PI * (i / 8) + (R() - 0.5) * 0.25);
    fr.sort((a, b) => Math.sin(b) - Math.sin(a));
    for (const a of fr) {
      const L = h * (0.4 + R() * 0.16) * (o.fk || 1);
      const E = [tx + Math.cos(a) * L, ty + Math.sin(a) * L * 0.45 + L * 0.42], M = [tx + Math.cos(a) * L * 0.55, ty + Math.sin(a) * L * 0.62 - L * 0.1];
      let leaf = '';
      for (let k = 2; k <= 16; k++) {
        const t = k / 17, [px, py] = qAt([tx, ty], M, E, t), [dx, dy] = qTan([tx, ty], M, E, t), ll = L * 0.2 * Math.sin(t * Math.PI * 0.9 + 0.2);
        for (const sd of [-1, 1]) leaf += `M${f(px)} ${f(py)}l${f((dx * 0.55 - sd * dy) * ll)} ${f((dy * 0.55 + sd * dx) * ll + ll * 0.45)}`;
      }
      const c = Math.sin(a) > -0.35 ? pal.sh : pal.mid;
      s += `<path d="${leaf}" fill="none" stroke="${c}" stroke-width="${f(Math.max(1.6, L * 0.035))}" stroke-linecap="round"/>`;
      s += Ln(`M${f(tx)} ${f(ty)}Q${f(M[0])} ${f(M[1])} ${f(E[0])} ${f(E[1])}`, pal.lit, Math.max(1.2, L * 0.02));
    }
    return s + Cn(tx - h * 0.02, ty + h * 0.03, h * 0.028, '#6a4a30') + Cn(tx + h * 0.02, ty + h * 0.035, h * 0.028, '#5a3a24') + Cn(tx, ty + h * 0.05, h * 0.026, '#7a5634');
  }
  /** grass blades texture (denser & larger toward the viewer) */
  function blades(C, n, cols, y0, y1, o = {}) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = Math.pow(R(), o.pow || 0.8), y = y0 + t * (y1 - y0), x = R() * W, k = 0.4 + t * 1.1;
      const h = (5 + R() * 7) * k * (o.k || 1), lean = (R() - (o.wind != null ? o.wind : 0.4)) * h * 0.8;
      s += Ln(`M${f(x)} ${f(y)}q${f(lean * 0.3)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)}`, pick(R, cols), Math.max(0.8, 1.5 * k), op(0.5 + R() * 0.45));
    }
    return s;
  }
  /** filled grass tuft: dark back blades + lit front blades */
  function tuft(C, x, y, h, pal) {
    const R = C.R;
    let s = '';
    const blade = (dx, hh, lean, c) => Pn(`M${f(x + dx - h * 0.07)} ${f(y)}Q${f(x + dx + lean * 0.3)} ${f(y - hh * 0.6)} ${f(x + dx + lean)} ${f(y - hh)}Q${f(x + dx + lean * 0.2 + h * 0.04)} ${f(y - hh * 0.5)} ${f(x + dx + h * 0.07)} ${f(y)}Z`, c);
    const n = 4 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) s += blade((i - n / 2) * h * 0.14 + R() * 2, h * (0.6 + R() * 0.45), (R() - 0.5) * h * 0.7, i % 2 ? pal.sh : pal.mid);
    for (let i = 0; i < 2; i++) s += blade((R() - 0.6) * h * 0.4, h * (0.5 + R() * 0.3), -h * (0.1 + R() * 0.3), pal.lit);
    return s;
  }
  /** flower dabs: a cluster of tiny painted blossoms */
  function blossoms(C, x, y, k, cols) {
    const R = C.R;
    let s = '';
    const n = 2 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const bx = x + (R() - 0.5) * 22 * k, by = y + (R() - 0.5) * 7 * k, r = (1.8 + R() * 1.6) * k, c = pick(R, cols);
      s += Ln(`M${f(bx)} ${f(by)}l${f((R() - 0.5) * 3 * k)} ${f(5 * k)}`, '#3f8a3a', 0.9 * k, op(0.7)) +
        Cn(bx + r * 0.25, by + r * 0.3, r, U.shade(c, -0.18)) + Cn(bx, by, r, c) + Cn(bx - r * 0.3, by - r * 0.3, r * 0.42, '#ffffff', op(0.7));
    }
    return s;
  }
  function flowerPatch(C, x, y, rx, n, cols) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()), px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * rx * 0.28 * d;
      s += blossoms(C, px, py, 0.45 + depth(py) * 0.95, cols);
    }
    return s;
  }
  function fern(C, x, y, h, pal) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * (0.08 + 0.84 * i / 6) + (R() - 0.5) * 0.2, L = h * (0.7 + R() * 0.45);
      const ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L * 0.75, mx = (x + ex) / 2, my = (y + ey) / 2 - L * 0.18;
      const nx = -Math.sin(a) * L * 0.12, ny = Math.cos(a) * L * 0.12;
      s += Pn(`M${f(x)} ${f(y)}Q${f(mx + nx)} ${f(my + ny)} ${f(ex)} ${f(ey)}Q${f(mx - nx)} ${f(my - ny)} ${f(x)} ${f(y)}Z`, i % 2 ? pal.sh : pal.mid) +
        Ln(`M${f(x)} ${f(y)}Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`, pal.lit, Math.max(0.8, h * 0.03), op(0.7));
    }
    return s;
  }
  function mushrooms(C, x, y, k, cap, o = {}) {
    const R = C.R;
    let s = En(x, y + 1, 10 * k, 3 * k, C.soft('#000000', 0.25, 0.3));
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const mx = x + (i - (n - 1) / 2) * 9 * k + (R() - 0.5) * 4 * k, mh = (8 + R() * 8) * k, mw = mh * (0.7 + R() * 0.3);
      if (o.glow) s += Cn(mx, y - mh, mw * 2.2, C.soft(o.glow, 0.35, 0.25));
      s += Pn(`M${f(mx - mw * 0.16)} ${f(y)}Q${f(mx - mw * 0.2)} ${f(y - mh * 0.6)} ${f(mx - mw * 0.1)} ${f(y - mh * 0.9)}L${f(mx + mw * 0.1)} ${f(y - mh * 0.9)}Q${f(mx + mw * 0.2)} ${f(y - mh * 0.6)} ${f(mx + mw * 0.16)} ${f(y)}Z`, o.stem || '#f4ead8');
      const P = Paint.ramp(cap);
      s += Pn(`M${f(mx - mw * 0.6)} ${f(y - mh * 0.82)}Q${f(mx - mw * 0.55)} ${f(y - mh * 1.35)} ${f(mx)} ${f(y - mh * 1.36)}Q${f(mx + mw * 0.55)} ${f(y - mh * 1.35)} ${f(mx + mw * 0.6)} ${f(y - mh * 0.82)}Q${f(mx)} ${f(y - mh * 0.72)} ${f(mx - mw * 0.6)} ${f(y - mh * 0.82)}Z`, cap) +
        Pn(`M${f(mx + mw * 0.05)} ${f(y - mh * 1.33)}Q${f(mx + mw * 0.55)} ${f(y - mh * 1.3)} ${f(mx + mw * 0.6)} ${f(y - mh * 0.82)}Q${f(mx + mw * 0.3)} ${f(y - mh * 0.76)} ${f(mx + mw * 0.1)} ${f(y - mh * 0.78)}Z`, P.sh, op(0.6)) +
        En(mx - mw * 0.25, y - mh * 1.18, mw * 0.14, mh * 0.07, '#ffffff', op(0.85)) + Cn(mx + mw * 0.12, y - mh * 1.06, mw * 0.07, '#ffffff', op(0.8));
    }
    return s;
  }
  /** charred dead tree silhouette with a warm rim light */
  function deadTree(C, x, y, h, col, rim) {
    const R = C.R;
    let s = '', lit = '';
    const branch = (x0, y0, a, len, w, gen) => {
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len, mx = (x0 + x1) / 2 + (R() - 0.5) * len * 0.2, my = (y0 + y1) / 2;
      s += Ln(`M${f(x0)} ${f(y0)}Q${f(mx)} ${f(my)} ${f(x1)} ${f(y1)}`, col, w);
      lit += Ln(`M${f(x0 - w * 0.3)} ${f(y0)}Q${f(mx - w * 0.3)} ${f(my)} ${f(x1 - w * 0.3)} ${f(y1)}`, rim, Math.max(0.8, w * 0.25));
      if (gen > 0) for (let i = 0; i < 2; i++) branch(x1, y1, a + (i ? 1 : -1) * (0.35 + R() * 0.4), len * (0.55 + R() * 0.2), w * 0.6, gen - 1);
    };
    branch(x, y, -Math.PI / 2 + (R() - 0.5) * 0.2, h * 0.45, h * 0.07, 3);
    return s + G(lit, op(0.55));
  }

  /* ======================= GROUND ======================= */
  /** ground plane: gradient, soft painted patches, mottling and a hazy far edge */
  function groundPlane(C, o) {
    const R = C.R;
    const y0 = o.y0 || HZ;
    const wv = wave(R, 3, 1 / 300);
    const edge = [];
    for (let x = -20; x <= W + 20; x += 40) edge.push([x, y0 + wv(x) * (o.bump || 5)]);
    let s = Pn(smooth(edge) + `L${W + 20} ${H}L-20 ${H}Z`, C.lin([[0, o.cols[0]], [0.3, o.cols[1]], [1, o.cols[2]]]));
    for (let i = 0; i < (o.patchN || 18); i++) {
      const t = R(), y = y0 + 16 + t * (H - y0 - 10), rx = (70 + R() * 180) * (0.5 + t), ry = rx * (0.07 + R() * 0.06);
      s += En(R() * W, y, rx, ry, C.soft(R() < 0.5 ? o.patch[0] : o.patch[1]), op(0.3 + R() * 0.3));
    }
    for (let i = 0; i < (o.mottle || 120); i++) {
      const t = Math.pow(R(), 0.8), y = y0 + 6 + t * (H - y0), r = (2 + R() * 5) * (0.4 + t);
      s += En(R() * W, y, r * 2.4, r * 0.8, C.soft(R() < 0.5 ? o.patch[0] : o.patch[1], 1, 0.5), op(0.3 + R() * 0.35));
    }
    if (o.haze) s += Rect(0, y0 - 16, W, 90, C.lin([[0, o.haze, 0], [0.25, o.haze, o.hazeA || 0.5], [1, o.haze, 0]]));
    return s;
  }
  /** big soft cloud shadows and sunlit pools lying on the ground */
  function lightPools(C, y0, n, dark, light, a = 0.2) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) { const t = R(), y = y0 + 20 + t * (H - y0), rx = (160 + R() * 240) * (0.6 + t * 0.6); s += En(R() * W, y, rx, rx * (0.12 + R() * 0.06), C.soft(i % 2 ? dark : light, 1, 0.2), op(a * 1.4 * (0.7 + R() * 0.6))); }
    return s;
  }
  /** a worn winding path: a filled ribbon (wider toward the viewer) with ruts, worn edges and grass overhang */
  function path(C, o) {
    const R = C.R;
    const y = o.y;
    const P0 = [-80, y + (R() - 0.5) * 40], P1 = [330, y - 34 + (R() - 0.5) * 40], P2 = [800, y + 30 + (R() - 0.5) * 40], P3 = [W + 80, y + (R() - 0.5) * 40];
    const at = t => { const u = 1 - t; return [0, 1].map(i => u * u * u * P0[i] + 3 * u * u * t * P1[i] + 3 * u * t * t * P2[i] + t * t * t * P3[i]); };
    const nz = wave(R, 4, 1 / 60), nz2 = wave(R, 4, 1 / 48);
    const w0 = (o.w || 64) / 2, top = [], bot = [], mid = [];
    for (let i = 0; i <= 40; i++) {
      const [x, yy] = at(i / 40), k = 0.7 + depth(yy) * 0.55;
      top.push([x, yy - w0 * k * (1 + nz(x) * 0.22)]);
      bot.push([x, yy + w0 * k * (1 + nz2(x) * 0.22)]);
      mid.push([x, yy]);
    }
    const shape = smooth(top) + 'L' + smooth(bot.slice().reverse()).slice(1) + 'Z';
    const off = (pts, dy) => smooth(pts.map(p => [p[0], p[1] + dy]));
    let s = Pn(shape, 'none', ` stroke="${o.edge}" stroke-width="18"` + op(0.14)) + Pn(shape, 'none', ` stroke="${o.edge}" stroke-width="9"` + op(0.22)) +
      Pn(shape, C.lin([[0, o.edge], [0.25, o.col], [0.8, o.col], [1, U.mix(o.col, o.edge, 0.3)]]));
    s += Ln(off(mid, -w0 * 0.35), o.edge, 2.4, op(0.3)) + Ln(off(mid, w0 * 0.4), o.edge, 3, op(0.28)) + Ln(off(mid, -w0 * 0.05), o.light, w0 * 0.5, op(0.28)) + Ln(off(mid, -w0 * 0.05), o.light, w0 * 0.25, op(0.3));
    let det = '';
    for (let i = 0; i < 90; i++) { const [px, py] = at(R()); det += En(px + (R() - 0.5) * 30, py + (R() - 0.5) * w0 * 1.3, 1 + R() * 2.5, 0.8 + R() * 1.2, R() < 0.5 ? o.light : o.edge, op(0.35 + R() * 0.4)); }
    for (let i = 0; i < 16; i++) { const [px, py] = at(R()); det += pebble(C, px + (R() - 0.5) * 60, py + (R() - 0.5) * w0 * 1.1, 4 + R() * 6, pick(R, o.stones || ['#b8a58a', '#9a8a78', '#d8c8a8'])); }
    if (o.tufts) {
      for (let i = 0; i < 34; i++) { const j = Math.floor(R() * top.length), [px, py] = top[j]; det += tuft(C, px + (R() - 0.5) * 30, py + 5, 8 + R() * 8, o.tufts); }
      for (let i = 0; i < 26; i++) { const j = Math.floor(R() * bot.length), [px, py] = bot[j]; det += tuft(C, px + (R() - 0.5) * 30, py + 4, 10 + R() * 10, o.tufts); }
    }
    return { s: s + det, at };
  }
  function pebble(C, x, y, w, c) {
    const P = Paint.ramp(c);
    return En(x + w * 0.1, y + w * 0.12, w * 0.6, w * 0.24, C.soft('#000000', 0.35, 0.3)) + En(x, y, w * 0.5, w * 0.3, P.sh) + En(x - w * 0.08, y - w * 0.08, w * 0.36, w * 0.18, c) + En(x - w * 0.18, y - w * 0.14, w * 0.14, w * 0.06, P.hi, op(0.8));
  }
  /** clustered pebbles/rocks (reads as intentional detail rather than noise) */
  function stoneClusters(C, n, cols, y0 = 430) {
    const R = C.R;
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = y0 + Math.pow(R(), 0.8) * (H - y0 - 10), k = 0.5 + depth(y);
      s += En(x + 6 * k, y + 2, 30 * k, 6 * k, C.soft('#000000', 0.3, 0.3)) + Paint.rock(x, y, (18 + R() * 16) * k, (10 + R() * 8) * k, pick(R, cols), R);
      for (let j = 0; j < 3; j++) s += pebble(C, x + (R() - 0.3) * 40 * k, y + (R() - 0.2) * 8 * k, (4 + R() * 5) * k, pick(R, cols));
    }
    return s;
  }
  /** soft snow drifts: rounded mounds with a lit crest and blue lee shadow */
  function drifts(C, n, y0, pal) {
    const R = C.R;
    let s = '';
    const list = [];
    for (let i = 0; i < n; i++) { const t = Math.pow(R(), 0.8); list.push([R() * W, y0 + t * (H - y0), t]); }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, t] of list) {
      const w = (70 + R() * 120) * (0.5 + t), h = (8 + R() * 10) * (0.5 + t);
      const d = `M${f(x - w)} ${f(y)}C${f(x - w * 0.6)} ${f(y - h * 0.4)} ${f(x - w * 0.35)} ${f(y - h)} ${f(x)} ${f(y - h)}C${f(x + w * 0.4)} ${f(y - h)} ${f(x + w * 0.7)} ${f(y - h * 0.3)} ${f(x + w)} ${f(y)}Z`;
      s += En(x + w * 0.15, y + h * 0.15, w * 1.05, h * 0.5, C.soft(pal.sh, 0.5, 0.3)) + Pn(d, C.lin([[0, pal.lit], [0.6, pal.mid], [1, pal.sh]])) + Ln(`M${f(x - w * 0.55)} ${f(y - h * 0.62)}C${f(x - w * 0.3)} ${f(y - h * 1.02)} ${f(x + w * 0.1)} ${f(y - h * 1.02)} ${f(x + w * 0.3)} ${f(y - h * 0.85)}`, '#ffffff', 1.5 + t * 1.5, op(0.8));
    }
    return s;
  }
  /** branching glowing lava veins */
  function lavaVeins(C, n, y0, cols = ['#ff5a1e', '#ff8a2e', '#fff0a0']) {
    const R = C.R;
    let glow = '', core = '', hot = '';
    const walk = (x, y, dir, len, k, gen) => {
      let d = `M${f(x)} ${f(y)}`;
      for (let j = 0; j < len; j++) {
        x += dir * (12 + R() * 16) * k; y += (R() - 0.5) * 12 * k;
        d += `L${f(x)} ${f(y)}`;
        if (gen < 2 && R() < 0.25) walk(x, y, R() < 0.5 ? dir : -dir, 2 + Math.floor(R() * 3), k * 0.8, gen + 1);
      }
      const w = k * (gen ? 0.6 : 1);
      glow += Ln(d, cols[0], 10 * w, op(0.14)) + Ln(d, cols[0], 5 * w, op(0.3));
      core += Ln(d, cols[1], 2.4 * w);
      hot += Ln(d, cols[2], 0.9 * w);
    };
    for (let i = 0; i < n; i++) { const t = R(), y = y0 + t * (H - y0 - 20); walk(R() * W, y, R() < 0.5 ? 1 : -1, 3 + Math.floor(R() * 4), 0.6 + depth(y) * 0.9, 0); }
    if (C.tod) C.post += glow; // lava keeps its own light at any hour
    return glow + core + hot;
  }
  /** tide pool: organic basin with a rock rim, deep water, sky reflection and a starfish */
  function tidePool(C, x, y, rx, ry, pal) {
    const R = C.R;
    const pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([x + Math.cos(a) * rx * (0.85 + R() * 0.3), y + Math.sin(a) * ry * (0.85 + R() * 0.3)]); }
    const d = smoothClosed(pts);
    let s = Pn(d, 'none', ` stroke="${pal.rimSh}" stroke-width="${f(ry * 0.9)}"` + ' transform="translate(2 3)"') + Pn(d, 'none', ` stroke="${pal.rim}" stroke-width="${f(ry * 0.7)}"`);
    s += Pn(d, C.rad([[0, pal.deep], [0.7, pal.water], [1, pal.shallow]]));
    s += En(x - rx * 0.25, y - ry * 0.25, rx * 0.45, ry * 0.18, C.soft('#ffffff', 0.6, 0.3));
    for (let i = 0; i < 5; i++) { const a = R() * Math.PI * 2; s += Paint.rock(x + Math.cos(a) * rx * 1.02, y + Math.sin(a) * ry * 1.02 + 3, 10 + R() * 12, 6 + R() * 6, pal.rock, R); }
    if (R() < 0.8) { const sx = x + (R() - 0.5) * rx * 0.8, sy = y + (R() - 0.3) * ry * 0.5, k = ry / 14; s += Pn(`M${f(sx)} ${f(sy - 6 * k)}L${f(sx + 1.8 * k)} ${f(sy - 1.8 * k)}L${f(sx + 6 * k)} ${f(sy - 1.5 * k)}L${f(sx + 2.7 * k)} ${f(sy + 1.2 * k)}L${f(sx + 3.8 * k)} ${f(sy + 5.7 * k)}L${f(sx)} ${f(sy + 3 * k)}L${f(sx - 3.8 * k)} ${f(sy + 5.7 * k)}L${f(sx - 2.7 * k)} ${f(sy + 1.2 * k)}L${f(sx - 6 * k)} ${f(sy - 1.5 * k)}L${f(sx - 1.8 * k)} ${f(sy - 1.8 * k)}Z`, '#ff7a5a', op(0.85)); }
    return s;
  }

  /* ======================= STRUCTURES ======================= */
  function windmill(C, x, y, h, pal) {
    const R = C.R;
    const w = h * 0.34;
    let s = Pn(poly([[x - w * 0.5, y], [x - w * 0.34, y - h * 0.72], [x + w * 0.34, y - h * 0.72], [x + w * 0.5, y]]), pal.wall) + Pn(poly([[x + w * 0.05, y], [x + w * 0.1, y - h * 0.72], [x + w * 0.34, y - h * 0.72], [x + w * 0.5, y]]), pal.wallSh, op(0.6));
    s += Pn(poly([[x - w * 0.45, y - h * 0.7], [x, y - h * 0.98], [x + w * 0.45, y - h * 0.7]]), pal.roof) + Pn(poly([[x, y - h * 0.98], [x + w * 0.45, y - h * 0.7], [x + w * 0.05, y - h * 0.7]]), '#000000', op(0.2));
    s += Rect(x - w * 0.1, y - h * 0.24, w * 0.2, h * 0.24, pal.door) + Rect(x - w * 0.08, y - h * 0.52, w * 0.16, w * 0.16, pal.door);
    litWindow(C, x - w * 0.1, y - h * 0.24, w * 0.2, h * 0.24, h * 0.5);
    const hx = x, hy = y - h * 0.74, rot = R() * 90;
    let bl = '';
    for (let i = 0; i < 4; i++) bl += `<g transform="rotate(${f(rot + i * 90)} ${f(hx)} ${f(hy)})">${Rect(hx - w * 0.07, hy - h * 0.62, w * 0.14, h * 0.6, pal.blade, op(0.95))}${Ln(`M${f(hx)} ${f(hy - h * 0.6)}L${f(hx)} ${f(hy - h * 0.05)}`, pal.bladeSh, 1.2)}</g>`;
    return s + bl + Cn(hx, hy, w * 0.1, pal.roof);
  }
  function cottage(C, x, y, w, pal) {
    const h = w * 0.55;
    let s = Rect(x - w * 0.5, y - h, w, h, pal.wall) + Rect(x + w * 0.1, y - h, w * 0.4, h, pal.wallSh, op(0.5));
    s += Pn(poly([[x - w * 0.62, y - h + 2], [x - w * 0.2, y - h - w * 0.42], [x + w * 0.3, y - h - w * 0.42], [x + w * 0.62, y - h + 2]]), pal.roof) + Pn(poly([[x + w * 0.05, y - h - w * 0.42], [x + w * 0.3, y - h - w * 0.42], [x + w * 0.62, y - h + 2], [x + w * 0.2, y - h + 2]]), '#000000', op(0.2));
    s += Rect(x + w * 0.18, y - h - w * 0.5, w * 0.1, w * 0.2, pal.wallSh) + Rect(x - w * 0.34, y - h * 0.6, w * 0.16, w * 0.14, pal.win) + Rect(x - w * 0.02, y - h * 0.62, w * 0.14, h * 0.62, pal.door);
    litWindow(C, x - w * 0.34, y - h * 0.6, w * 0.16, w * 0.14, w * 0.6);
    s += Cn(x + w * 0.26, y - h - w * 0.62, w * 0.1, C.soft('#ffffff', 0.7, 0.4)) + Cn(x + w * 0.34, y - h - w * 0.8, w * 0.14, C.soft('#ffffff', 0.5, 0.4));
    return s;
  }
  /** broken tower / arch of the Eclipse citadel, rim-lit by the corona */
  function ruin(C, x, y, w, h, pal, o = {}) {
    const R = C.R;
    let s = '';
    const col = (cx, ch, cw) => {
      const top = [];
      for (let k = 0; k <= 4; k++) top.push([cx - cw / 2 + cw * k / 4, y - ch + (k % 2 ? 6 + R() * 12 : R() * 6)]);
      let c = Pn(poly([[cx - cw / 2, y], ...top, [cx + cw / 2, y]]), pal.stone) + Rect(cx + cw * 0.12, y - ch + 10, cw * 0.38, ch - 10, pal.sh, op(0.55));
      for (let k = 1; k < ch / 22; k++) c += Ln(`M${f(cx - cw / 2)} ${f(y - k * 22)}L${f(cx + cw / 2)} ${f(y - k * 22)}`, pal.sh, 1.4, op(0.4));
      c += Ln(`M${f(cx - cw / 2 + 1)} ${f(y - ch + 6)}L${f(cx - cw / 2 + 1)} ${f(y)}`, pal.rim, 1.8, op(0.7));
      return c;
    };
    if (o.arch) {
      const pw = w * 0.2;
      s += col(x - w / 2 + pw / 2, h, pw) + col(x + w / 2 - pw / 2, h * (0.55 + R() * 0.2), pw);
      const ay = y - h + pw * 0.2;
      s += Pn(`M${f(x - w / 2)} ${f(ay + pw)}Q${f(x - w / 2)} ${f(ay - w * 0.35)} ${f(x + w * 0.12)} ${f(ay - w * 0.3)}L${f(x + w * 0.16)} ${f(ay - w * 0.1)}Q${f(x - w / 2 + pw)} ${f(ay - w * 0.12)} ${f(x - w / 2 + pw)} ${f(ay + pw)}Z`, pal.stone) +
        Ln(`M${f(x - w / 2 + 1)} ${f(ay + pw)}Q${f(x - w / 2 + 1)} ${f(ay - w * 0.34)} ${f(x + w * 0.1)} ${f(ay - w * 0.29)}`, pal.rim, 1.8, op(0.7));
    } else s += col(x, h, w);
    for (let k = 0; k < (o.windows != null ? o.windows : 2); k++) { const wy = y - h * (0.3 + k * 0.22), wx = x - w * 0.12; s += Rect(wx - 6, wy - 6, w * 0.2 + 12, 24, C.soft(pal.win, 0.3, 0.2)) + Rect(wx, wy, w * 0.2, 12, pal.win, op(0.35 + R() * 0.55)); }
    return s;
  }

  /** a window that lights up at dusk and at night: a warm pane and the glow it throws, drawn over the graded land */
  function litWindow(C, x, y, w, h, r) {
    const L = todLight(C);
    if (L) C.post += Cn(x + w / 2, y + h / 2, r, C.soft('#ffc05a', a2(0.5 * L), 0.18)) + Rect(x, y, w, h, '#ffe39a', op(0.6 + 0.35 * L));
  }
  /** a little star lantern on a post: a warm glow in the hedge (3.0 Base) */
  function starLantern(C, x, yb, h = 64) {
    const top = yb - h;
    let s = En(x + 4, yb + 2, 12, 4, C.soft('#12301a', 0.5, 0.3)) + Rect(x - 2.6, top + 12, 5.2, h - 12, '#5a4a6a') + Rect(x - 0.6, top + 12, 2, h - 12, '#8a7aa0', op(0.7));
    s += Cn(x, top + 4, 22, C.soft('#fff49a', 0.55, 0.2));
    let d = '';
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 11; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * r) + ' ' + f(top + 4 + Math.sin(a) * r); }
    s += Pn(d + 'Z', '#ffe680', ' stroke="#5a4a6a" stroke-width="2" stroke-linejoin="round"') + Cn(x - 2, top + 1, 2.2, '#fffbe0');
    const L = todLight(C);
    if (L) C.post += Cn(x, top + 4, 34 + 40 * L, C.soft('#ffe98a', a2(0.4 * L), 0.18)) + Pn(d + 'Z', '#ffe680', op(0.85)) + Cn(x - 2, top + 1, 2.2, '#fffbe0');
    return s;
  }
  /** a small forest pond: dark water with a bright rim, lily pads, reflections and a ring of rocks */
  function pond(C, x, y, rx, ry) {
    const R = C.R;
    const pts = [];
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([x + Math.cos(a) * rx * (0.88 + R() * 0.2), y + Math.sin(a) * ry * (0.88 + R() * 0.2)]); }
    const d = smoothClosed(pts);
    let s = Pn(d, '#3a2a1e', ` stroke="#6a5a3a" stroke-width="16" stroke-linejoin="round"` + op(0.8));
    s += Pn(d, C.rad([[0, '#8fe0e0'], [0.55, '#3aa0b8'], [1, '#1c5a78']], { cx: '40%', cy: '30%', r: '80%' }));
    s += Pn(d, 'none', ' stroke="#ffffff" stroke-width="3"' + op(0.5));
    for (let k = 0; k < 5; k++) { const gx = x + (R() - 0.5) * rx, gy = y + (R() - 0.6) * ry * 0.8; s += Ln(`M${f(gx - 16)} ${f(gy)}q16 -5 32 0`, '#ffffff', 2.4, op(0.55)); }
    for (let k = 0; k < 3; k++) { const lx = x + (R() - 0.5) * rx * 1.2, ly = y + (R() - 0.3) * ry * 0.8, lr = 9 + R() * 7; s += Pn(`M${f(lx)} ${f(ly)}L${f(lx + lr)} ${f(ly - lr * 0.2)}A${f(lr)} ${f(lr * 0.5)} 0 1 1 ${f(lx + lr * 0.9)} ${f(ly + lr * 0.25)}Z`, '#5ab04a') + (k === 0 ? Cn(lx - 2, ly - 3, 4, '#ff9ac8') + Cn(lx - 2, ly - 3, 1.6, '#ffe070') : ''); }
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * (0.95 + i / 11 * 1.1) + (R() - 0.5) * 0.2, bx = x + Math.cos(a) * rx * 1.02, by = y + Math.sin(a) * ry * 1.05;
      s += Paint.rock(bx, by + 6, 26 + R() * 22, 14 + R() * 10, pick(R, ['#a89a92', '#8f8a9e', '#b0a490']), R, { line: 1.6 });
    }
    return s;
  }

  /* ======================= FINISH ======================= */
  function finish(C, o = {}) {
    let s = '';
    if (o.warm) s += Rect(0, 0, W, H, C.rad([[0, o.warm, o.warmA || 0.3], [1, o.warm, 0]], { cx: o.lx != null ? o.lx : 200, cy: o.ly != null ? o.ly : 100, r: o.lr || 900, user: 1 }));
    if (o.cool) s += Rect(0, 0, W, H, C.rad([[0, o.cool, o.coolA || 0.22], [1, o.cool, 0]], { cx: o.cx != null ? o.cx : W, cy: o.cy != null ? o.cy : H, r: 800, user: 1 }));
    s += Rect(0, 0, W, H, C.rad([[0.55, o.vig || '#140c30', 0], [1, o.vig || '#140c30', o.vigA != null ? o.vigA : 0.32]], { cx: '50%', cy: '42%', r: '75%' }));
    const gid = C.id('gr'), pid = C.id('gp');
    C.defs += `<filter id="${gid}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4" stitchTiles="stitch" result="n"/>` +
      `<feColorMatrix in="n" type="matrix" values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .55  .9 .9 .9 0 -1.1"/></filter>` +
      `<pattern id="${pid}" width="256" height="256" patternUnits="userSpaceOnUse"><rect width="256" height="256" filter="url(#${gid})"/></pattern>`;
    s += Rect(0, 0, W, H, `url(#${pid})`, op(o.grain != null ? o.grain : 0.14));
    return s;
  }

  /* ======================= BIOMES ======================= */
  const PAL = {
    cloud: { lit: '#ffffff', mid: '#eef3ff', sh: '#b7c6e6', rim: '#fffdf0' },
    leaf: { hi: '#e6ff9a', lit: '#9ad65a', mid: '#6cb448', sh: '#3f7f3c' },
    leafWarm: { hi: '#fff3a0', lit: '#b8dc5e', mid: '#88bf48', sh: '#4c8a3a' },
    leafFar: { hi: '#d8f0b0', lit: '#a8d38e', mid: '#8cbf80', sh: '#6a9f78' },
    grassTuft: { lit: '#b5e67a', mid: '#6cb44c', sh: '#3a8a38' },
  };

  const BIOMES = {
    /* the home glade: a sunny clearing deep in the forest seen from a high angle — a wall of trees behind a row of
     * giant stumps with spiral rings, a warm clearing with worn paths, flowers, mushrooms and a pond with rocks */
    home(C) {
      const R = C.R;
      let s = Rect(0, 0, W, H, C.lin([[0, '#2f5a38'], [0.35, '#4f8a44'], [1, '#6aa84a']]));
      // the forest wall: hazy far crowns, dark trunks, then rich near crowns catching the light
      let far = '';
      for (let i = 0; i < 22; i++) far += crown(C, R() * W, 30 + R() * 150, 60 + R() * 50, { hi: '#e8f6c0', lit: '#b8dc92', mid: '#94c47c', sh: '#6f9f68' }, { dabs: 0 });
      s += G(far, C.blur(3)) + Rect(0, 0, W, 260, C.lin([[0, '#eaf8c8', 0.35], [1, '#eaf8c8', 0]]));
      for (let i = 0; i < 14; i++) {
        const x = 20 + i * 96 + (R() - 0.5) * 50, w = 18 + R() * 22;
        s += Pn(`M${f(x)} 60L${f(x + w)} 60L${f(x + w * 1.1)} 300L${f(x - w * 0.1)} 300Z`, '#3a4a30') + Rect(x + 2, 60, w * 0.3, 240, '#5a6a44', op(0.6));
      }
      for (let i = 0; i < 18; i++) { const x = -40 + i * 78 + (R() - 0.5) * 30; s += crown(C, x, 60 + R() * 90, 70 + R() * 40, { hi: '#e6ffa0', lit: '#8fce5c', mid: '#5a9e44', sh: '#2f6a34' }, { dabs: 5 }); }
      s += shafts(C, 120, -60, 8, 900, '#fffbd0', 0.28, 0.1, 0.4);
      // bushes and ferns along the foot of the wall
      for (let i = 0; i < 20; i++) s += crown(C, R() * W, 250 + R() * 22, 26 + R() * 20, { hi: '#e0f5b0', lit: '#a2d27a', mid: '#6ea85a', sh: '#3f7f46' }, { n: 6, dabs: 3 });
      for (let i = 0; i < 14; i++) s += fern(C, R() * W, 280 + R() * 12, 26 + R() * 18, { lit: '#c8f08a', mid: '#5aa545', sh: '#2f7a3a' });
      // the ground
      s += groundPlane(C, { y0: 284, cols: ['#8ecf62', '#77bc52', '#5ea344'], patch: ['#d8f08e', '#4a8a3c'], haze: '#f0f8c8', hazeA: 0.35, mottle: 160, patchN: 22, bump: 8 });
      // the sunlit clearing and the worn earth in its middle
      s += En(600, 520, 600, 190, C.soft('#fff6b0', 0.5, 0.45)) + En(600, 530, 470, 140, C.soft('#e8d08a', 0.42, 0.5)) + En(620, 540, 300, 80, C.soft('#d8b878', 0.32, 0.4));
      s += lightPools(C, 300, 10, '#2f6a2a', '#fbffc0', 0.2);
      // a flowering hedge closes the back of the glade, little star lanterns glowing in it (3.0: the Base's own look)
      const hedge = { hi: '#eaffb8', lit: '#a2d866', mid: '#5aa545', sh: '#2f6a34' }, fl = ['#ff9ac8', '#ffffff', '#ffe066', '#c9a8ff'];
      for (let x = -30; x < W + 40; x += 40 + R() * 22) s += crown(C, x, 270 + R() * 14 + Math.sin(x / 210) * 6, 34 + R() * 14, hedge, { n: 7, wide: 1.3, dabs: 4 });
      for (let i = 0; i < 90; i++) { const x = R() * W, y = 244 + R() * 58, c = pick(R, fl); s += Cn(x, y, 3 + R() * 2.4, c) + Cn(x, y, 1.2, '#ffd23f'); }
      for (let x = 70 + R() * 60; x < W; x += 210 + R() * 60) s += starLantern(C, x, 318 + R() * 8);
      for (let i = 0; i < 10; i++) s += fern(C, R() * W, 312 + R() * 8, 22 + R() * 12, { lit: '#c8f08a', mid: '#5aa545', sh: '#2f7a3a' });
      // a worn path that curls through the clearing
      s += path(C, { y: 610, col: '#dcbd82', edge: '#9a7a50', light: '#f4dca8', w: 58, tufts: { lit: '#a8e070', mid: '#5aa545', sh: '#2f7030' }, stones: ['#b8a58a', '#9a8a78', '#d8c8a8'] }).s;
      // the pond, lower right, ringed with rocks
      s += pond(C, 1112, 652, 150, 58);
      const cols = ['#ff8fb8', '#ffffff', '#ffd23f', '#b18cff', '#ff6b6b'];
      for (let i = 0; i < 7; i++) s += flowerPatch(C, 60 + R() * 880, 360 + R() * 330, 50 + R() * 80, 8 + Math.floor(R() * 10), [pick(R, cols), pick(R, cols), '#ffffff']);
      for (let i = 0; i < 5; i++) { const t = R(); s += mushrooms(C, 40 + R() * 900, 340 + t * 330, 0.6 + t * 0.8, pick(R, ['#e8503a', '#f0a040', '#d84a6a'])); }
      for (let i = 0; i < 40; i++) { const t = Math.pow(R(), 0.8), y = 320 + t * 390, x = R() * W; if (Math.hypot((x - 1112) / 190, (y - 652) / 80) < 1) continue; s += tuft(C, x, y, 9 + t * 18, { lit: '#a8e070', mid: '#5aa545', sh: '#2f7030' }); }
      s += blades(C, 520, ['#3f8a36', '#4f9b3e', '#6cb44c', '#2f7030'], 300, 725);
      s += finish(C, { warm: '#fff0b8', warmA: 0.32, lx: 150, ly: 40, cool: '#1f4a3a', coolA: 0.18, vig: '#0f2a1a', vigA: 0.32 });
      return s;
    },
    /* the Base's Workshop Yard (3.0): an orchard behind a low fence — fruit trees, a sunny yard of grass and a stone
     * path; the workshops, Bruno's stall and the decorations stand on it */
    yard(C) {
      const R = C.R;
      let s = Rect(0, 0, W, H, C.lin([[0, '#3a6a44'], [0.35, '#5c9a4c'], [1, '#78b654']]));
      let far = '';
      for (let i = 0; i < 20; i++) far += crown(C, R() * W, 30 + R() * 130, 60 + R() * 50, { hi: '#eef8c8', lit: '#bfe29a', mid: '#9cc884', sh: '#76a470' }, { dabs: 0 });
      s += G(far, C.blur(3)) + Rect(0, 0, W, 240, C.lin([[0, '#f2fad0', 0.4], [1, '#f2fad0', 0]]));
      s += shafts(C, 1100, -60, 7, 860, '#fffbd0', 0.24, 0.1, 0.4);
      // the orchard: round fruit trees with apples and oranges
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 150 + (R() - 0.5) * 40, yb = 292 + (R() - 0.5) * 10, fr = pick(R, ['#ff5a4a', '#ffb13b', '#ffd23f']);
        s += Pn(`M${f(x - 8)} ${f(yb)}L${f(x - 5)} ${f(yb - 70)}L${f(x + 5)} ${f(yb - 70)}L${f(x + 9)} ${f(yb)}Z`, '#6a4a34') + crown(C, x, yb - 96, 58 + R() * 12, { hi: '#e6ffa0', lit: '#8fce5c', mid: '#5a9e44', sh: '#2f6a34' }, { dabs: 5 });
        for (let k = 0; k < 9; k++) { const a = R() * Math.PI * 2, r = R() * 44; s += Cn(x + Math.cos(a) * r, yb - 96 + Math.sin(a) * r * 0.8, 5, fr) + Cn(x + Math.cos(a) * r - 1.6, yb - 98 + Math.sin(a) * r * 0.8, 1.6, '#ffffff', op(0.7)); }
      }
      for (let i = 0; i < 16; i++) s += crown(C, R() * W, 286 + R() * 16, 22 + R() * 16, { hi: '#e0f5b0', lit: '#a2d27a', mid: '#6ea85a', sh: '#3f7f46' }, { n: 6, dabs: 3 });
      s += groundPlane(C, { y0: 300, cols: ['#9ad466', '#80c257', '#62a646'], patch: ['#d8f08e', '#4e9640'], haze: '#f0f8c8', hazeA: 0.32, mottle: 150, patchN: 20, bump: 8 });
      s += lightPools(C, 310, 9, '#2f6a2a', '#fbffc0', 0.2);
      // a low picket fence along the back, a star lantern at every few posts
      s += Rect(0, 318, W, 7, '#e8c690') + Rect(0, 336, W, 7, '#e8c690') + Rect(0, 323, W, 2, '#a8804a', op(0.6)) + Rect(0, 341, W, 2, '#a8804a', op(0.6));
      for (let x = 10; x < W; x += 46) s += Pn(`M${f(x - 7)} 356L${f(x - 7)} 312L${f(x)} 303L${f(x + 7)} 312L${f(x + 7)} 356Z`, '#f4dcaa') + Rect(x + 1, 311, 5, 45, '#c49a5e', op(0.7));
      for (let x = 240; x < W; x += 400) s += starLantern(C, x, 362, 58);
      // the stone path that crosses the yard, flowers and grass
      s += path(C, { y: 606, col: '#d8c8a8', edge: '#9a8a70', light: '#f4e8c8', w: 54, tufts: { lit: '#a8e070', mid: '#5aa545', sh: '#2f7030' }, stones: ['#b8a58a', '#a89a8a', '#d8c8a8'] }).s;
      const cols = ['#ff8fb8', '#ffffff', '#ffd23f', '#b18cff', '#ff6b6b'];
      for (let i = 0; i < 6; i++) s += flowerPatch(C, 40 + R() * 1200, 380 + R() * 300, 50 + R() * 70, 8 + Math.floor(R() * 8), [pick(R, cols), pick(R, cols), '#ffffff']);
      for (let i = 0; i < 44; i++) { const t = Math.pow(R(), 0.8); s += tuft(C, R() * W, 360 + t * 350, 9 + t * 18, { lit: '#a8e070', mid: '#5aa545', sh: '#2f7030' }); }
      s += blades(C, 460, ['#3f8a36', '#4f9b3e', '#6cb44c', '#2f7030'], 340, 725);
      s += finish(C, { warm: '#fff0b8', warmA: 0.3, lx: 1100, ly: 40, cool: '#1f4a3a', coolA: 0.16, vig: '#0f2a1a', vigA: 0.3 });
      return s;
    },
    meadow(C) {
      const R = C.R;
      let s = sky(C, [[0, '#3f95e6'], [0.35, '#72bdf2'], [0.7, '#b6e0f7'], [1, '#f4f6d8']]) + sun(C, 180, 92, 36, '#fffbe8', '#fff0b0', 0.55);
      s += streaks(C, 9, 40, 170, '#ffffff', 0.4);
      s += cumulus(C, 560, 128, 270, PAL.cloud) + cumulus(C, 900, 82, 190, PAL.cloud) + cumulus(C, 1170, 176, 250, PAL.cloud) + cumulus(C, 330, 236, 170, PAL.cloud, { a: 0.9 });
      s += range(C, { base: 346, top: 168, n: 5, color: '#93b2dc', lit: '#b9ceee', shadow: '#55649f', snow: '#f6f9ff', snowLine: 0.3, fog: '#dcecf2', fogA: 0.9, blur: 1.4, rimC: '#fffbe8' });
      const h1 = hills(C, { base: 372, amp: 46, len: 230, lit: '#c3e2a6', color: '#a6d08e', dark: '#92c27e', rim: '#eefac8', fog: '#dcefd8', fogA: 0.5, blur: 0.8 });
      s += h1.s + forestMass(C, h1.yAt, 26, { lit: '#cfe9b0', mid: '#a3cc90', sh: '#86b582' }, { dy: 12, blur: 1 });
      const wx = 900 + R() * 200;
      s += windmill(C, wx, h1.yAt(wx) + 6, 54, { wall: '#f4ecdc', wallSh: '#b8b0c8', roof: '#c85a4a', door: '#6a4a4a', blade: '#fff8ec', bladeSh: '#a89a8a' });
      const h2 = hills(C, { base: 404, amp: 36, len: 170, lit: '#b6e084', color: '#8fca68', dark: '#78b656', rim: '#e4fab8' });
      s += h2.s;
      const cx = 250 + R() * 150;
      s += cottage(C, cx, h2.yAt(cx) + 10, 46, { wall: '#fff4e0', wallSh: '#c8b8b8', roof: '#d8604a', door: '#7a4a3a', win: '#ffe7a0' });
      for (let i = 0; i < 6; i++) { const x = R() * W; s += broadleaf(C, x, h2.yAt(x) + 8, 30 + R() * 16, PAL.leafFar, { dabs: 1 }); }
      for (const x of [60 + R() * 80, 520 + R() * 120, 1140 + R() * 100]) s += grove(C, x, h2.yAt(x) + 12, 62 + R() * 26, PAL.leaf, { pals: [PAL.leaf, PAL.leafWarm] });
      s += groundPlane(C, { y0: 414, cols: ['#a4d672', '#7fc257', '#5ea344'], patch: ['#c9ec8e', '#4e9640'], haze: '#eef8cc', hazeA: 0.3, mottle: 140 });
      s += lightPools(C, 414, 8, '#2f6a2a', '#f6ffb8', 0.22);
      for (let i = 0; i < 12; i++) s += crown(C, R() * W, 414 + R() * 8, 8 + R() * 8, PAL.leaf, { n: 4, dabs: 1 });
      s += blades(C, 650, ['#4f9b3e', '#5caa45', '#7cc45a', '#98d66a', '#3f8a36'], 420, 725);
      const cols = ['#ff8fb8', '#ffffff', '#ffd23f', '#b18cff', '#ff6b6b'];
      for (let i = 0; i < 6; i++) s += flowerPatch(C, R() * W, 450 + R() * 250, 60 + R() * 90, 10 + Math.floor(R() * 10), [pick(R, cols), pick(R, cols), '#ffffff']);
      s += path(C, { y: 572, col: '#e2c790', edge: '#a88660', light: '#fbeac0', w: 60, tufts: { lit: '#a8e070', mid: '#6cb44c', sh: '#3f8a36' } }).s;
      for (let i = 0; i < 36; i++) { const t = Math.pow(R(), 0.7), y = 430 + t * 290; s += tuft(C, R() * W, y, 8 + t * 18, PAL.grassTuft); }
      s += shafts(C, 180, 92, 7, 900, '#fff6c8', 0.12, 0.08, 0.42);
      s += finish(C, { warm: '#fff0c0', warmA: 0.28, lx: 180, ly: 92, cool: '#2c3a8a', coolA: 0.14, vigA: 0.26 });
      return s;
    },

    forest(C) {
      const R = C.R;
      let s = sky(C, [[0, '#cfeccd'], [0.5, '#eaf5d4'], [1, '#f6f2d0']]);
      let far = '';
      for (let i = 0; i < 26; i++) { const x = R() * W, w = 10 + R() * 16; far += Rect(x, 60, w, 360, '#a9c9a8', op(0.7)); }
      for (let i = 0; i < 16; i++) far += crown(C, R() * W, 40 + R() * 120, 70 + R() * 50, { hi: '#e8f6d8', lit: '#cde5c0', mid: '#b8d6ae', sh: '#9fc29c' }, { dabs: 0 });
      s += G(far, C.blur(3));
      s += shafts(C, 140, -80, 9, 950, '#fffbd8', 0.3, 0.12, 0.4);
      for (let i = 0; i < 11; i++) {
        const x = 40 + i * 118 + (R() - 0.5) * 50, w = 20 + R() * 20;
        s += Pn(`M${f(x)} 0L${f(x + w)} 0L${f(x + w * 1.1)} 420L${f(x - w * 0.1)} 420Z`, '#809f78') + Rect(x + 2, 0, w * 0.28, 420, '#a8c49a', op(0.7)) + Rect(x + w * 0.7, 0, w * 0.3, 420, '#5f7f5c', op(0.5));
      }
      s += Rect(0, 300, W, 130, C.lin([[0, '#e8f5d0', 0], [1, '#e8f5d0', 0.6]]));
      for (let i = 0; i < 26; i++) s += crown(C, R() * W, 408 + R() * 10, 16 + R() * 18, { hi: '#e0f5b0', lit: '#9fcf7a', mid: '#6fa85a', sh: '#437f46' }, { n: 5, dabs: 2 });
      for (let i = 0; i < 18; i++) s += fern(C, R() * W, 424 + R() * 8, 22 + R() * 16, { lit: '#c8f08a', mid: '#5aa545', sh: '#2f7a3a' });
      // near trunks framing the scene: root flare, bark, moss
      for (const [x, w] of [[30 + R() * 30, 62], [1170 + R() * 30, 70], [320 + R() * 80, 40], [900 + R() * 80, 44]]) {
        const yb = 438;
        s += En(x + w / 2, yb, w * 1.4, 10, C.soft('#1a3020', 0.5, 0.3));
        s += Pn(`M${f(x)} -10L${f(x + w)} -10L${f(x + w * 1.02)} ${yb - 60}Q${f(x + w * 1.1)} ${yb - 10} ${f(x + w * 1.55)} ${yb}L${f(x - w * 0.55)} ${yb}Q${f(x - w * 0.1)} ${yb - 10} ${f(x - w * 0.02)} ${yb - 60}Z`, '#5a4838');
        s += Pn(`M${f(x + w * 0.62)} -10L${f(x + w)} -10L${f(x + w * 1.02)} ${yb - 60}Q${f(x + w * 1.1)} ${yb - 10} ${f(x + w * 1.55)} ${yb}L${f(x + w * 0.7)} ${yb}Z`, '#2e2420', op(0.55));
        s += Rect(x + 3, -10, w * 0.24, yb - 50, '#8a7258', op(0.75));
        for (let k = 0; k < 7; k++) { const bx = x + w * (0.15 + k * 0.12); s += Ln(`M${f(bx)} ${f(-10 + R() * 60)}q${f((R() - 0.5) * 8)} ${f(80 + R() * 60)} ${f((R() - 0.5) * 4)} ${f(160 + R() * 120)}`, '#2e2420', 1.6 + R() * 1.6, op(0.45)); }
        s += Pn(`M${f(x - w * 0.3)} ${yb - 4}Q${f(x + w * 0.2)} ${yb - 40} ${f(x + w * 0.5)} ${yb - 24}Q${f(x + w * 0.9)} ${yb - 36} ${f(x + w * 1.3)} ${yb - 4}Z`, '#6aa84a', op(0.85)) + fern(C, x + w * 1.3, yb, 26, { lit: '#c8f08a', mid: '#5aa545', sh: '#2f7a3a' });
      }
      for (let i = 0; i < 14; i++) { const x = -40 + i * 100 + (R() - 0.5) * 40; s += crown(C, x, -10 + R() * 40, 80 + R() * 40, { hi: '#d8f59a', lit: '#7cc050', mid: '#4f9a40', sh: '#2c6a34' }, { dabs: 5 }); }
      s += groundPlane(C, { y0: 430, cols: ['#8ecc66', '#62a84a', '#437f38'], patch: ['#f0f5a0', '#2f6a30'], haze: '#eef5c8', hazeA: 0.4, mottle: 140, patchN: 20 });
      for (let i = 0; i < 16; i++) { const y = 450 + R() * 250; s += En(R() * W, y, 40 + R() * 80, 10 + R() * 12, C.soft('#fff7b0', 0.6, 0.4)); }
      s += blades(C, 650, ['#3f8a36', '#4f9b3e', '#6cb44c', '#2f7030'], 434, 725);
      s += path(C, { y: 590, col: '#cfae7a', edge: '#8a6a48', light: '#ecd4a0', w: 60, tufts: { lit: '#9fdc70', mid: '#5aa545', sh: '#2f7030' }, stones: ['#a89a88', '#8a7e70'] }).s;
      for (let i = 0; i < 26; i++) { const t = R(), y = 440 + t * 270; s += tuft(C, R() * W, y, 10 + t * 20, { lit: '#a8e070', mid: '#4f9b3e', sh: '#2c6a34' }); }
      for (let i = 0; i < 7; i++) { const t = R(); s += mushrooms(C, R() * W, 450 + t * 250, 0.6 + t * 0.8, pick(R, ['#e8503a', '#f0a040', '#d84a6a'])); }
      const lx = 150 + R() * 900, ly = 650 + R() * 30;
      s += En(lx, ly + 8, 110, 12, C.soft('#1a3020', 0.5, 0.3)) + Pn(`M${f(lx - 100)} ${f(ly - 20)}L${f(lx + 90)} ${f(ly - 26)}Q${f(lx + 104)} ${f(ly - 8)} ${f(lx + 90)} ${f(ly + 8)}L${f(lx - 100)} ${f(ly + 6)}Z`, '#6a5040') + En(lx + 92, ly - 9, 11, 17, '#c8a070') + En(lx + 92, ly - 9, 6, 10, '#a07a50', op(0.8)) +
        Pn(`M${f(lx - 100)} ${f(ly - 20)}Q${f(lx - 20)} ${f(ly - 36)} ${f(lx + 60)} ${f(ly - 26)}L${f(lx + 60)} ${f(ly - 16)}Q${f(lx - 20)} ${f(ly - 22)} ${f(lx - 100)} ${f(ly - 10)}Z`, '#6ab04a') + fern(C, lx - 90, ly + 6, 24, { lit: '#c8f08a', mid: '#5aa545', sh: '#2f7a3a' });
      s += finish(C, { warm: '#fff4c0', warmA: 0.3, lx: 140, ly: 0, cool: '#1f4a3a', coolA: 0.2, vig: '#0f2a1a', vigA: 0.34 });
      return s;
    },

    beach(C) {
      const R = C.R;
      let s = sky(C, [[0, '#2f8fe6'], [0.4, '#5fb6f0'], [0.75, '#a8def6'], [1, '#eaf6ef']]) + sun(C, 210, 96, 34, '#fffbe8', '#fff3c0', 0.5);
      s += streaks(C, 7, 40, 150, '#ffffff', 0.4);
      s += cumulus(C, 640, 150, 230, PAL.cloud) + cumulus(C, 1010, 110, 280, PAL.cloud);
      s += cloudBank(C, 300, { lit: '#ffffff', mid: '#f3f7ff', sh: '#c9d6ee', rim: '#fffdf2' }, 6, 150, 0.85);
      const ipal = { lit: '#9fd0a0', mid: '#5f9f88', sh: '#4f8a80', trunk: '#8aa090', trunkSh: '#6a8a80' };
      for (const [ix, iw, ih] of [[300 + R() * 100, 160, 34], [860 + R() * 120, 220, 46]]) {
        s += G(Pn(`M${f(ix - iw)} 322Q${f(ix - iw * 0.6)} ${f(322 - ih * 0.9)} ${f(ix)} ${f(322 - ih)}Q${f(ix + iw * 0.5)} ${f(322 - ih * 0.8)} ${f(ix + iw)} 322Z`, '#78b0a0') + Pn(`M${f(ix)} ${f(322 - ih)}Q${f(ix + iw * 0.5)} ${f(322 - ih * 0.8)} ${f(ix + iw)} 322L${f(ix + iw * 0.1)} 322Z`, '#4f8a88', op(0.4)) +
          palm(C, ix - iw * 0.2, 322 - ih * 0.85, 34, ipal, { lean: 0.2 }) + palm(C, ix + iw * 0.1, 322 - ih * 0.95, 40, ipal, { lean: -0.15 }), op(0.8) + C.blur(0.8));
      }
      const seaTop = 318, shore = 432;
      s += Rect(0, seaTop, W, shore - seaTop + 20, C.lin([[0, '#9fdcef'], [0.18, '#4fb3dd'], [0.6, '#2a93cc'], [0.85, '#2fb0c8'], [1, '#6fd6d0']]));
      for (let i = 0; i < 90; i++) { const t = R(), y = seaTop + 4 + t * (shore - seaTop - 20), x = 210 + (R() - 0.5) * (80 + t * 520), w = 4 + t * 26 * R(); s += Rect(x, y, w, 1 + t * 1.6, '#ffffff', op(0.35 + R() * 0.55)); }
      for (let i = 0; i < 40; i++) { const t = R(), y = seaTop + 10 + t * (shore - seaTop - 20), x = R() * W, w = 20 + t * 60; s += Ln(`M${f(x)} ${f(y)}q${f(w * 0.25)} ${f(-3 - t * 3)} ${f(w * 0.5)} 0t${f(w * 0.5)} 0`, '#e8fbff', 1.2 + t * 1.5, op(0.35 + t * 0.35)); }
      const fw = wave(R, 3, 1 / 90), foam = [];
      for (let x = -20; x <= W + 20; x += 20) foam.push([x, shore + fw(x) * 8]);
      s += groundPlane(C, { y0: shore + 4, cols: ['#e6c68e', '#f3dca4', '#efcf8e'], patch: ['#fff2c8', '#d9b577'], mottle: 140, bump: 3 });
      s += Pn(smooth(foam) + `L${W + 20} ${shore + 34}L-20 ${shore + 34}Z`, C.lin([[0, '#b8925a', 0.55], [1, '#b8925a', 0]]));
      s += Ln(smooth(foam), '#ffffff', 7, op(0.85)) + Ln(smooth(foam.map(([x, y]) => [x, y + 10])), '#ffffff', 2.5, op(0.45) + ' stroke-dasharray="14 10"');
      for (let i = 0; i < 90; i++) { const t = Math.pow(R(), 0.8), y = shore + 34 + t * (H - shore - 20), x = R() * W, w = 14 + t * 40; s += Ln(`M${f(x)} ${f(y)}q${f(w * 0.5)} ${f(-3 - t * 3)} ${f(w)} 0`, '#fff6d8', 1.2 + t * 1.4, op(0.55)) + Ln(`M${f(x)} ${f(y + 2 + t * 2)}q${f(w * 0.5)} ${f(-3 - t * 3)} ${f(w)} 0`, '#d8b070', 1 + t, op(0.3)); }
      s += lightPools(C, shore, 5, '#c89a5a', '#fff8d8', 0.2);
      for (const [dx, dw] of [[-40, 300], [W + 40, 320]]) {
        s += Pn(`M${f(dx - dw)} ${H + 10}Q${f(dx - dw * 0.4)} ${H - 90} ${f(dx)} ${H - 96}Q${f(dx + dw * 0.4)} ${H - 90} ${f(dx + dw)} ${H + 10}Z`, C.lin([[0, '#fbe6b4'], [1, '#e8c68a']]));
        for (let i = 0; i < 14; i++) { const gx = dx + (R() - 0.5) * dw * 1.2, gy = H - 60 + R() * 60; s += tuft(C, gx, gy, 20 + R() * 20, { lit: '#d8e890', mid: '#9ab860', sh: '#6a8a48' }); }
      }
      for (let i = 0; i < 10; i++) {
        const t = R(), y = shore + 50 + t * 230, x = R() * W, k = 0.7 + t * 0.9, c = pick(R, ['#ffb3c7', '#ffd9a0', '#ffffff', '#ff9a7a']);
        if (R() < 0.35) s += Pn(`M${f(x)} ${f(y - 8 * k)}L${f(x + 2.4 * k)} ${f(y - 2.4 * k)}L${f(x + 8 * k)} ${f(y - 2 * k)}L${f(x + 3.6 * k)} ${f(y + 1.6 * k)}L${f(x + 5 * k)} ${f(y + 7.6 * k)}L${f(x)} ${f(y + 4 * k)}L${f(x - 5 * k)} ${f(y + 7.6 * k)}L${f(x - 3.6 * k)} ${f(y + 1.6 * k)}L${f(x - 8 * k)} ${f(y - 2 * k)}L${f(x - 2.4 * k)} ${f(y - 2.4 * k)}Z`, '#ff8a5a') + Cn(x - 1.5 * k, y - 2 * k, 1.3 * k, '#ffd0a0');
        else for (let j = 0; j < 3; j++) { const sx = x + (R() - 0.5) * 30 * k, sy = y + (R() - 0.5) * 6 * k; s += Pn(`M${f(sx)} ${f(sy)}L${f(sx - 7 * k)} ${f(sy - 8 * k)}Q${f(sx)} ${f(sy - 14 * k)} ${f(sx + 7 * k)} ${f(sy - 8 * k)}Z`, c) + Ln(`M${f(sx)} ${f(sy)}L${f(sx)} ${f(sy - 11 * k)}M${f(sx)} ${f(sy)}L${f(sx - 4 * k)} ${f(sy - 10 * k)}M${f(sx)} ${f(sy)}L${f(sx + 4 * k)} ${f(sy - 10 * k)}`, U.shade(c, -0.22), 0.9 * k); }
      }
      s += stoneClusters(C, 4, ['#d8c4a0', '#bfae8e', '#e8dcc0'], shore + 40);
      s += palm(C, W + 20, 470, 420, { lit: '#c6ec84', mid: '#4fa84a', sh: '#2f7a3c', trunk: '#c09060', trunkSh: '#8a6038' }, { lean: -0.32 });
      s += palm(C, -30, 500, 330, { lit: '#c6ec84', mid: '#58b04e', sh: '#347f40', trunk: '#c09060', trunkSh: '#8a6038' }, { lean: 0.28 });
      s += shafts(C, 210, 96, 6, 700, '#fff8d8', 0.1, 0.1, 0.45);
      s += finish(C, { warm: '#fff4d0', warmA: 0.26, lx: 210, ly: 96, cool: '#1f5a8a', coolA: 0.14, vigA: 0.24 });
      return s;
    },

    cove(C) {
      const R = C.R;
      let s = sky(C, [[0, '#3aa6d6'], [0.45, '#78cfe2'], [0.8, '#bdeaf0'], [1, '#f0f8ee']]) + sun(C, 640, 70, 30, '#fffbe8', '#fff6d0', 0.4);
      s += cumulus(C, 420, 120, 220, PAL.cloud) + cumulus(C, 880, 90, 250, PAL.cloud) + streaks(C, 6, 40, 160, '#ffffff', 0.35);
      const seaTop = 300, shore = 420;
      s += Rect(0, seaTop, W, 140, C.lin([[0, '#a8e6ef'], [0.25, '#48b8d8'], [0.75, '#2a9cc4'], [1, '#56cfd0']]));
      for (let i = 0; i < 50; i++) { const t = R(), y = seaTop + 4 + t * 100, x = 640 + (R() - 0.5) * (60 + t * 400); s += Rect(x, y, 4 + t * 20 * R(), 1.2 + t, '#ffffff', op(0.4 + R() * 0.5)); }
      const archPal = { stone: '#b8927a', sh: '#7a5a5a', rim: '#fff0d8' };
      s += G(Pn('M548 334Q552 262 604 246Q660 232 704 258Q748 284 752 334L722 334Q716 298 686 290Q650 282 628 298Q604 314 600 334Z', archPal.stone) + Pn('M704 258Q748 284 752 334L722 334Q716 298 700 280Z', archPal.sh, op(0.7)) +
        Ln('M552 300Q556 258 604 246Q640 236 668 240', archPal.rim, 2, op(0.7)) + Ln('M560 290Q640 282 740 296M556 314Q640 306 748 318', archPal.sh, 2, op(0.35)) +
        Pn('M430 334L436 290Q444 272 458 276L464 334Z', archPal.stone) + Pn('M450 276Q458 276 464 334L452 334Z', archPal.sh, op(0.6)), op(0.8) + C.blur(0.6));
      for (let i = 0; i < 16; i++) s += Ln(`M${f(560 + R() * 180)} ${f(336 + R() * 10)}l${f(10 + R() * 20)} 0`, '#ffffff', 1.5, op(0.6));
      const cpal = { lit: '#f0c090', mid: '#c98f6a', sh: '#9a6a58', band: '#f8d0a0', shadow: '#5a3a5a', rim: '#fff4d8' };
      const cgrass = { hi: '#e6ff9a', lit: '#9ad65a', mid: '#5aa545', sh: '#357a3a' };
      s += cliff(C, -1, 150, shore + 26, 250, cpal, { grass: cgrass }) + cliff(C, 1, 130, shore + 26, 270, cpal, { grass: cgrass });
      s += groundPlane(C, { y0: shore, cols: ['#e8cc94', '#e4c58c', '#d6b27a'], patch: ['#fff0c4', '#c89e6a'], mottle: 150, haze: '#ffffff', hazeA: 0.4 });
      const fw = wave(R, 3, 1 / 90), foam = [];
      for (let x = -20; x <= W + 20; x += 20) foam.push([x, shore + 2 + fw(x) * 6]);
      s += Pn(smooth(foam) + `L${W + 20} ${shore + 30}L-20 ${shore + 30}Z`, C.lin([[0, '#b8925a', 0.5], [1, '#b8925a', 0]])) + Ln(smooth(foam), '#ffffff', 6, op(0.8));
      s += lightPools(C, shore, 5, '#b08050', '#fff8d8', 0.2);
      const pool = { rim: '#b89878', rimSh: '#7a5a48', deep: '#1f7fa8', water: '#3fb0d0', shallow: '#8fe0e8', rock: '#9a7a68' };
      for (const [px, py] of [[150, 520], [470, 600], [820, 520], [1110, 610], [640, 680]]) s += tidePool(C, px + (R() - 0.5) * 80, py + (R() - 0.5) * 30, 56 + R() * 34, 14 + depth(py) * 10, pool);
      for (let i = 0; i < 10; i++) { const t = R(), x = R() * W, y = shore + 40 + t * 250, k = 0.7 + t; for (let j = 0; j < 3; j++) { const sx = x + (R() - 0.5) * 26 * k; s += Pn(`M${f(sx)} ${f(y)}L${f(sx - 7 * k)} ${f(y - 8 * k)}Q${f(sx)} ${f(y - 14 * k)} ${f(sx + 7 * k)} ${f(y - 8 * k)}Z`, pick(R, ['#ff9fbf', '#ffd09a', '#ffffff'])); } }
      s += stoneClusters(C, 5, ['#c9ad86', '#b89b75', '#a88a70'], shore + 40);
      s += finish(C, { warm: '#fff6d8', warmA: 0.22, lx: 640, ly: 70, cool: '#1a4a7a', coolA: 0.16, vigA: 0.26 });
      return s;
    },

    volcano(C) {
      const R = C.R;
      let s = sky(C, [[0, '#2a1532'], [0.3, '#5e2842'], [0.6, '#b8483c'], [0.84, '#f08a50'], [1, '#ffc27a']]);
      s += Rect(0, 0, W, H, C.rad([[0, '#ff8a3a', 0.5], [1, '#ff8a3a', 0]], { cx: 640, cy: 200, r: 560, user: 1 }));
      const smoke = { lit: '#9a7480', mid: '#6e5060', sh: '#3e2c40', rim: '#ffb080' };
      s += cumulus(C, 200, 150, 230, smoke, { a: 0.75 }) + cumulus(C, 1110, 110, 250, smoke, { a: 0.75 });
      s += range(C, { base: 372, top: 250, n: 5, color: '#5a3048', lit: '#74384a', shadow: '#2a1830', fog: '#e8805a', fogA: 0.65, rimC: '#ffb070', rimA: 0.6, blur: 1.2 });
      const vx = 640, vy = 142, bw = 380;
      const cone = `M${vx - bw} 414C${vx - bw * 0.5} 404 ${vx - 118} 300 ${vx - 64} ${vy + 8}Q${vx} ${vy - 6} ${vx + 64} ${vy + 8}C${vx + 118} 300 ${vx + bw * 0.5} 404 ${vx + bw} 414Z`;
      s += Pn(cone, C.lin([[0, '#6a3446'], [0.5, '#4a2838'], [1, '#2e1a28']]));
      for (let i = 0; i < 11; i++) {
        const t = i / 10 - 0.5, x0 = vx + t * 110, x1 = vx + t * bw * 1.7, cx = vx + t * 170;
        s += Ln(`M${f(x0)} ${f(vy + 14)}Q${f(cx)} 300 ${f(x1)} 414`, '#1e1020', 3 + R() * 3, op(0.35)) + (t < 0.1 ? Ln(`M${f(x0 - 3)} ${f(vy + 16)}Q${f(cx - 4)} 300 ${f(x1 - 6)} 414`, '#ff9a5a', 1.4, op(0.3)) : '');
      }
      s += Pn(`M${vx + 8} ${vy + 4}Q${vx + 40} 290 ${vx + 120} 414L${vx + bw} 414C${vx + bw * 0.5} 404 ${vx + 118} 300 ${vx + 64} ${vy + 8}Z`, '#12081a', op(0.45));
      s += Ln(`M${vx - bw} 414C${vx - bw * 0.5} 404 ${vx - 118} 300 ${vx - 64} ${vy + 8}`, '#ffa060', 3, op(0.45));
      const plume = { lit: '#b08a90', mid: '#7a5a6a', sh: '#40283e', rim: '#ffc090' };
      s += cumulus(C, vx + 40, vy - 30, 170, plume, { lx: 0 }) + cumulus(C, vx + 110, vy - 95, 250, plume, { lx: 0, a: 0.95 }) + cumulus(C, vx + 210, vy - 150, 300, plume, { lx: 0, a: 0.85 });
      s += En(vx + 30, vy - 60, 240, 150, C.soft('#ff7a2e', 0.45, 0.25));
      s += En(vx, vy + 6, 70, 13, '#ffcf6a') + En(vx, vy + 4, 58, 8, '#fff3a0') + Cn(vx, vy + 4, 100, C.soft('#ff8a3a', 0.5, 0.2));
      for (const [x0, dx, len, w] of [[vx - 38, -80, 262, 1], [vx + 6, 20, 258, 1.2], [vx + 42, 130, 240, 0.9]]) {
        const d = `M${f(x0)} ${f(vy + 12)}C${f(x0 + dx * 0.1)} ${f(vy + 70)} ${f(x0 + dx * 0.9)} ${f(vy + len * 0.55)} ${f(x0 + dx)} ${f(vy + len)}`;
        s += Ln(d, '#ff5a1e', 26 * w, op(0.12)) + Ln(d, '#ff5a1e', 15 * w, op(0.22)) + Ln(d, '#e8501e', 7 * w) + Ln(d, '#ffa03a', 4 * w) + Ln(d, '#fff0a0', 1.6 * w);
      }
      s += range(C, { base: 406, top: 330, n: 7, color: '#3a2432', lit: '#4a2c3a', shadow: '#1a0e1a', fog: '#c05a48', fogA: 0.5, rimC: '#ff9a60', rimA: 0.7 });
      for (let i = 0; i < 5; i++) { const x = R() * W; s += deadTree(C, x, 404 + R() * 6, 50 + R() * 40, '#241420', '#ff9a60'); }
      s += groundPlane(C, { y0: 412, cols: ['#6a4a52', '#4e3a44', '#3a2c36'], patch: ['#8a6a6a', '#2a1e28'], haze: '#d06a50', hazeA: 0.35, mottle: 170 });
      s += lightPools(C, 412, 6, '#1a0e18', '#ff9a60', 0.2);
      s += lavaVeins(C, 6, 450);
      s += path(C, { y: 590, col: '#7a6470', edge: '#3a2834', light: '#a88a90', w: 58, stones: ['#3c2e38', '#6a5662', '#2a2028'] }).s;
      for (let i = 0; i < 10; i++) { const t = R(), x = R() * W, y = 440 + t * 260, k = 0.7 + t * 0.8; s += Pn(poly([[x - 9 * k, y], [x - 5 * k, y - 12 * k], [x + 1 * k, y - 16 * k], [x + 8 * k, y - 8 * k], [x + 10 * k, y]]), '#241820') + Pn(poly([[x - 5 * k, y - 12 * k], [x + 1 * k, y - 16 * k], [x - 1 * k, y - 4 * k]]), '#5a4050') + Ln(`M${f(x - 5 * k)} ${f(y - 12 * k)}L${f(x + 1 * k)} ${f(y - 16 * k)}`, '#ff9a60', 1.2 * k, op(0.7)); }
      s += stoneClusters(C, 5, ['#3c2e38', '#5a4652', '#2a2028'], 440);
      for (let i = 0; i < 30; i++) s += Cn(R() * W, R() * 400, 0.8 + R() * 2, pick(R, ['#ffcf6a', '#ff8a3a', '#fff0a0']), op(0.5 + R() * 0.5));
      s += finish(C, { warm: '#ff9a50', warmA: 0.22, lx: 640, ly: 160, lr: 800, cool: '#2a0a2a', coolA: 0.3, vig: '#1a0612', vigA: 0.4 });
      return s;
    },

    caldera(C) {
      const R = C.R;
      let s = sky(C, [[0, '#1e0a26'], [0.35, '#5a1836'], [0.7, '#b8363a'], [1, '#f07a3a']]) + stars(C, 30, 180, '#ffd9b0');
      const ash = { lit: '#c06a5a', mid: '#8a3e4a', sh: '#4a1e34', rim: '#ffb080' };
      s += cumulus(C, 300, 110, 260, ash, { a: 0.85 }) + cumulus(C, 980, 80, 300, ash, { a: 0.85 });
      s += range(C, { base: 336, top: 170, n: 5, color: '#4a2036', lit: '#6a2a3e', shadow: '#1e0a1c', fog: '#ff7a3a', fogA: 0.55, rimC: '#ffa060', rimA: 0.7, blur: 0.8 });
      const top = 328, bot = 412;
      s += Pn(`M-20 ${top + 6}Q640 ${top - 16} ${W + 20} ${top + 6}L${W + 20} ${bot}L-20 ${bot}Z`, C.lin([[0, '#fff0a0'], [0.3, '#ffb03a'], [0.7, '#ff6a2a'], [1, '#d8402a']]));
      for (let i = 0; i < 22; i++) {
        const x = R() * W, y = top + 10 + R() * (bot - top - 16), w = (20 + R() * 60) * (0.6 + (y - top) / (bot - top));
        s += Pn(`M${f(x - w)} ${f(y)}Q${f(x - w * 0.4)} ${f(y - 5)} ${f(x)} ${f(y - 3)}Q${f(x + w * 0.6)} ${f(y - 4)} ${f(x + w)} ${f(y + 1)}Q${f(x)} ${f(y + 6)} ${f(x - w)} ${f(y)}Z`, '#4a2228', op(0.8)) + Ln(`M${f(x - w * 0.8)} ${f(y - 1)}Q${f(x)} ${f(y - 5)} ${f(x + w * 0.8)} ${f(y)}`, '#ffb050', 1.2, op(0.6));
      }
      s += Rect(0, top - 70, W, 130, C.lin([[0, '#ffb050', 0], [0.6, '#ffb050', 0.35], [1, '#ffb050', 0]]));
      const cols = (x0, n, dir) => {
        let c = '';
        for (let i = 0; i < n; i++) {
          const x = x0 + dir * i * 36, h = 170 - i * 22 + R() * 30, y = 424, w = 34;
          c += Pn(poly([[x, y], [x, y - h], [x + w * 0.5, y - h - 8], [x + w, y - h], [x + w, y]]), '#34222e') + Pn(poly([[x, y - h], [x + w * 0.5, y - h - 8], [x + w, y - h], [x + w * 0.5, y - h + 6]]), '#7a4450') +
            Rect(x + w * 0.55, y - h, w * 0.45, h, '#160c16', op(0.5)) + Ln(`M${f(x + 1)} ${f(y - h)}L${f(x + 1)} ${f(y)}`, '#ff8a4a', 1.8, op(0.6)) + Ln(`M${f(x + w * 0.3)} ${f(y - h * 0.6)}l2 ${f(h * 0.2)}`, '#160c16', 1.4, op(0.6));
        }
        return c;
      };
      s += cols(-10, 5, 1) + cols(1246, 5, -1);
      s += groundPlane(C, { y0: 414, cols: ['#5a3a44', '#46303a', '#33242c'], patch: ['#7a5058', '#241820'], haze: '#ff8a4a', hazeA: 0.4, mottle: 170 });
      s += lightPools(C, 414, 6, '#140a10', '#ff9a60', 0.2);
      s += lavaVeins(C, 7, 450);
      s += stoneClusters(C, 6, ['#2c2028', '#5a4450', '#3a2a34'], 440);
      for (let i = 0; i < 40; i++) s += Cn(R() * W, 120 + R() * 560, 1 + R() * 2.2, pick(R, ['#ffcf6a', '#ff8a3a']), op(0.4 + R() * 0.5));
      s += finish(C, { warm: '#ff8a3a', warmA: 0.25, lx: 640, ly: 380, lr: 700, cool: '#1a0418', coolA: 0.35, vig: '#12040e', vigA: 0.45 });
      return s;
    },

    snow(C) {
      const R = C.R;
      let s = sky(C, [[0, '#5e97dc'], [0.4, '#93bff0'], [0.78, '#d2e6f8'], [1, '#f6f9ff']]) + sun(C, 250, 110, 30, '#ffffff', '#f4f8ff', 0.5);
      s += streaks(C, 8, 40, 190, '#ffffff', 0.45);
      const cl = { lit: '#ffffff', mid: '#eef4ff', sh: '#c3d0ea', rim: '#ffffff' };
      s += cumulus(C, 700, 100, 240, cl) + cumulus(C, 1100, 150, 200, cl, { a: 0.9 });
      s += range(C, { base: 356, top: 120, n: 4, color: '#8ea8d4', lit: '#b5c8ea', shadow: '#4a5a9e', snow: '#f7faff', snowLine: 0.55, fog: '#e2eefa', fogA: 0.8, rimC: '#ffffff', blur: 1, rough: 10 });
      const h1 = hills(C, { base: 392, amp: 40, len: 220, lit: '#ffffff', color: '#e6eefa', dark: '#d2def2', rim: '#ffffff', fog: '#eef4fc', fogA: 0.5 });
      s += h1.s + forestMass(C, h1.yAt, 30, { lit: '#9ab8c0', mid: '#7a9aa8', sh: '#5a7a8e' }, { kind: 'pine', dy: 14, blur: 0.8, a: 0.9 });
      const pinePal = { lit: '#6fa0a0', mid: '#4a7f86', sh: '#2c566a' };
      for (const x of [80 + R() * 100, 380 + R() * 120, 760 + R() * 120, 1120 + R() * 100]) s += pineGroup(C, x, 410 + R() * 8, 70 + R() * 30, pinePal, { snow: '#ffffff', shadowC: '#5a6a9a' });
      s += groundPlane(C, { y0: 416, cols: ['#f2f7ff', '#e4eefb', '#d4e2f5'], patch: ['#ffffff', '#b8c8e8'], haze: '#ffffff', hazeA: 0.5, mottle: 80 });
      s += lightPools(C, 416, 6, '#8a9ad0', '#ffffff', 0.18);
      s += drifts(C, 12, 440, { lit: '#ffffff', mid: '#f0f5ff', sh: '#c4d0ec' });
      s += path(C, { y: 596, col: '#dce6f5', edge: '#9aaed4', light: '#ffffff', w: 58, stones: ['#a8b8d0', '#8a9ab8'] }).s;
      for (let i = 0; i < 30; i++) { const t = R(), x = R() * W, y = 430 + t * 280, r = 1.5 + t * 2.5; s += Pn(`M${f(x)} ${f(y - r * 2)}L${f(x + r * 0.4)} ${f(y - r * 0.4)}L${f(x + r * 2)} ${f(y)}L${f(x + r * 0.4)} ${f(y + r * 0.4)}L${f(x)} ${f(y + r * 2)}L${f(x - r * 0.4)} ${f(y + r * 0.4)}L${f(x - r * 2)} ${f(y)}L${f(x - r * 0.4)} ${f(y - r * 0.4)}Z`, '#ffffff', op(0.9)); }
      s += shafts(C, 250, 110, 6, 800, '#ffffff', 0.12, 0.1, 0.42);
      s += finish(C, { warm: '#fff8e0', warmA: 0.2, lx: 250, ly: 110, cool: '#3a4aa0', coolA: 0.2, vig: '#1a2050', vigA: 0.26 });
      return s;
    },

    glacier(C) {
      const R = C.R;
      let s = sky(C, [[0, '#131f5a'], [0.4, '#2a4a9a'], [0.75, '#5f8fd0'], [1, '#bde0f5']]) + stars(C, 90, 260);
      s += aurora(C, 110, 40, '#6affc8', 150, 0.55) + aurora(C, 150, 50, '#8a7aff', 110, 0.4) + aurora(C, 80, 30, '#5fd0ff', 90, 0.35);
      s += range(C, { base: 360, top: 150, n: 4, color: '#6a8fcf', lit: '#8fb0e0', shadow: '#2a3a8a', snow: '#e8f4ff', snowLine: 0.45, fog: '#a8d0f0', fogA: 0.7, rimC: '#bfffff', blur: 1 });
      const icePal = { hi: '#ffffff', mid: '#a9dcf5', sh: '#5a98d8', glow: '#9fe8ff', line: '#3a78b8' };
      for (let i = 0; i < 6; i++) s += shards(C, -30 + i * 250 + R() * 90, 416, 110 + R() * 90, icePal, { n: 3 + Math.floor(R() * 3) });
      s += groundPlane(C, { y0: 414, cols: ['#e0eefc', '#c8ddf5', '#b0cbee'], patch: ['#ffffff', '#8fb0e0'], haze: '#dff4ff', hazeA: 0.5, mottle: 90 });
      const lx = 380 + R() * 500, ly = 520 + R() * 60;
      s += En(lx, ly, 260, 42, C.lin([[0, '#6fa8e8'], [1, '#b8e0ff']])) + En(lx, ly, 260, 42, 'none', ' stroke="#ffffff" stroke-width="3"' + op(0.6));
      for (let i = 0; i < 8; i++) s += Ln(`M${f(lx - 200 + R() * 300)} ${f(ly - 20 + R() * 40)}l${f(30 + R() * 60)} ${f(-4 - R() * 6)}`, '#ffffff', 1.5 + R() * 1.5, op(0.6));
      for (let i = 0; i < 5; i++) s += Ln(`M${f(lx - 150 + R() * 300)} ${f(ly - 10 + R() * 20)}l${f(20 + R() * 30)} ${f(8 + R() * 8)}l${f(15 + R() * 20)} -6`, '#e8f6ff', 1, op(0.7));
      s += drifts(C, 9, 450, { lit: '#ffffff', mid: '#eaf2ff', sh: '#a8c0e8' });
      for (let i = 0; i < 4; i++) { const t = R(); s += shards(C, R() * W, 460 + t * 230, 26 + t * 30, icePal, { n: 2 + Math.floor(R() * 2) }); }
      for (let i = 0; i < 40; i++) { const t = R(), x = R() * W, y = 430 + t * 280, r = 1.4 + t * 2.4; s += Pn(`M${f(x)} ${f(y - r * 2)}L${f(x + r * 0.4)} ${f(y - r * 0.4)}L${f(x + r * 2)} ${f(y)}L${f(x + r * 0.4)} ${f(y + r * 0.4)}L${f(x)} ${f(y + r * 2)}L${f(x - r * 0.4)} ${f(y + r * 0.4)}L${f(x - r * 2)} ${f(y)}L${f(x - r * 0.4)} ${f(y - r * 0.4)}Z`, pick(R, ['#ffffff', '#bfe6ff']), op(0.9)); }
      s += finish(C, { warm: '#9ff0ff', warmA: 0.12, lx: 640, ly: 60, cool: '#0a1450', coolA: 0.3, vig: '#060a30', vigA: 0.36 });
      return s;
    },

    plains(C) {
      const R = C.R;
      let s = sky(C, [[0, '#23244e'], [0.35, '#474682'], [0.7, '#8a7fb2'], [1, '#e8d7a8']]);
      s += Rect(0, 250, W, 170, C.lin([[0, '#ffe0a0', 0], [1, '#ffe0a0', 0.55]]));
      const storm = { lit: '#8a88b8', mid: '#5c5a8c', sh: '#34325e', rim: '#d8d0ff' };
      s += cumulus(C, 300, 120, 380, storm) + cumulus(C, 820, 90, 420, storm) + cumulus(C, 1220, 150, 300, storm) + cumulus(C, 560, 210, 260, storm, { a: 0.8 });
      for (let i = 0; i < 3; i++) {
        const x = 200 + i * 430 + R() * 120, y0 = 130 + R() * 40;
        let d = `M${f(x)} ${f(y0)}`, cx = x, cy = y0, br = '';
        for (let j = 0; j < 6; j++) { cx += (R() - 0.5) * 50; cy += 30 + R() * 20; d += `L${f(cx)} ${f(cy)}`; if (j === 2) br = `M${f(cx)} ${f(cy)}l${f(20 + R() * 20)} 24l-6 20`; }
        s += Ln(d, '#c8b8ff', 22, op(0.1)) + Ln(d, '#c8b8ff', 10, op(0.22)) + Ln(d, '#fff7c0', 3.5) + Ln(d, '#ffffff', 1.4) + Ln(br, '#fff7c0', 1.6, op(0.8));
      }
      const mpal = { lit: '#c09aa0', mid: '#9a7890', foot: '#6a5a80', sh: '#5a4a72', band: '#d8b8b0', shadow: '#2a2050', top: '#d8b8a8', rim: '#ffe8c8' };
      for (let i = 0; i < 4; i++) s += G(mesa(C, 90 + i * 330 + R() * 90, 396, 110 + R() * 70, 70 + R() * 60, mpal), op(0.92) + C.blur(0.5));
      s += hills(C, { base: 404, amp: 18, len: 200, lit: '#d8c880', color: '#bfae66', dark: '#a89a58', rim: '#fff0b0' }).s;
      for (let i = 0; i < 4; i++) { const x = R() * W, y = 404 + R() * 6, h = 40 + R() * 20; s += Ln(`M${f(x)} ${f(y)}q4 ${f(-h * 0.5)} ${f(h * 0.2)} ${f(-h * 0.8)}`, '#4a3a4a', 3) + crown(C, x + h * 0.2, y - h * 0.85, h * 0.4, { hi: '#e8e0a0', lit: '#a8a860', mid: '#7a8048', sh: '#4a5238' }, { n: 5, wide: 1.8, dabs: 2 }); }
      s += groundPlane(C, { y0: 410, cols: ['#d4c47a', '#b9a855', '#8e8a42'], patch: ['#efe0a0', '#7a7a38'], haze: '#fff0c0', hazeA: 0.45, mottle: 140 });
      s += lightPools(C, 410, 6, '#4a4a30', '#fff4c0', 0.2);
      s += blades(C, 1000, ['#c9b060', '#a89a48', '#e0cc80', '#8a8a3a', '#d8c070'], 414, 725, { wind: 0.15, k: 1.4 });
      s += path(C, { y: 584, col: '#e6d6a0', edge: '#a8945a', light: '#fff4c8', w: 60, stones: ['#a89a88', '#8a7e70'] }).s;
      for (let i = 0; i < 34; i++) { const t = R(), y = 430 + t * 280; s += tuft(C, R() * W, y, 12 + t * 22, { lit: '#f0dc90', mid: '#c0a858', sh: '#7a7a38' }); }
      s += stoneClusters(C, 3, ['#a89a88', '#8a7e70'], 460);
      s += finish(C, { warm: '#ffe6a0', warmA: 0.18, lx: 640, ly: 400, lr: 800, cool: '#20184a', coolA: 0.3, vig: '#140c30', vigA: 0.36 });
      return s;
    },

    spire(C) {
      const R = C.R;
      let s = sky(C, [[0, '#4f56cf'], [0.4, '#8a88ee'], [0.75, '#c8bdf5'], [1, '#f6ecff']]) + sun(C, 1040, 120, 30, '#fffbf0', '#fff0ff', 0.45);
      s += streaks(C, 8, 40, 200, '#ffffff', 0.35);
      const isl = { rock: '#a88ac8', rockSh: '#4a3a7a', rockLt: '#c8b0e8', band: '#c8b0e8', grass: '#8ccf70', grassLt: '#c0ec90', grassSh: '#5a9a5a', root: '#5a4a6a', leaf: { hi: '#e8ffb0', lit: '#a8e080', mid: '#7abf66', sh: '#4f8a5a' } };
      s += G(floatIsle(C, 190, 150, 46, isl, { trees: 1 }), op(0.6) + C.blur(1.2)) + G(floatIsle(C, 900, 105, 38, isl, { trees: 1 }), op(0.55) + C.blur(1.4)) + G(floatIsle(C, 1190, 230, 42, isl, { fall: 0.6 }), op(0.65) + C.blur(1));
      let sp = '';
      for (let i = 0; i < 6; i++) { const x = 60 + i * 230 + R() * 60; sp += shards(C, x, 360, 120 + R() * 120, { hi: '#ffffff', mid: '#c8b8f8', sh: '#8a78d0', glow: '#e8d8ff', line: '#7a68c0' }, { n: 2 }); }
      s += G(sp, op(0.55) + C.blur(1.2));
      s += floatIsle(C, 520, 220, 86, isl, { fall: 0.35, trees: 2 }) + floatIsle(C, 1010, 280, 70, isl, { trees: 2 });
      s += cloudBank(C, 356, { lit: '#ffffff', mid: '#f1ecff', sh: '#c6bbea', rim: '#ffffff' }, 8, 230);
      s += cloudBank(C, 396, { lit: '#ffffff', mid: '#f4f0ff', sh: '#d0c6f0', rim: '#ffffff' }, 9, 200);
      s += groundPlane(C, { y0: 422, cols: ['#c8b8ec', '#a794d4', '#8672b8'], patch: ['#e8e0ff', '#6a58a0'], haze: '#ffffff', hazeA: 0.55, mottle: 130 });
      s += lightPools(C, 422, 6, '#4a3a8a', '#ffffff', 0.18);
      s += blades(C, 400, ['#9ad07a', '#7abf66', '#b8e090', '#6aa860'], 426, 725);
      s += path(C, { y: 596, col: '#ddd0f2', edge: '#8f7cc0', light: '#ffffff', w: 58, stones: ['#7c68a8', '#9a88c0'] }).s;
      const crys = { hi: '#ffffff', mid: '#c8b0ff', sh: '#8a6ae0', glow: '#e0c8ff', line: '#6a4ac0' };
      for (let i = 0; i < 6; i++) { const t = R(); s += shards(C, R() * W, 450 + t * 240, 20 + t * 26, i % 2 ? crys : { hi: '#ffffff', mid: '#9ff0ff', sh: '#4ab0e0', glow: '#bff8ff', line: '#3a90c0' }, { n: 2 + Math.floor(R() * 3) }); }
      for (let i = 0; i < 18; i++) { const t = R(); s += tuft(C, R() * W, 440 + t * 270, 10 + t * 16, { lit: '#c8f0a0', mid: '#8acf70', sh: '#5a9a5a' }); }
      s += stoneClusters(C, 4, ['#6d5a98', '#7c68a8', '#9a88c0'], 450);
      s += finish(C, { warm: '#fff0ff', warmA: 0.2, lx: 1040, ly: 120, cool: '#2a1a6a', coolA: 0.22, cx: 0, cy: H, vigA: 0.26 });
      return s;
    },

    twilight(C) {
      const R = C.R;
      let s = sky(C, [[0, '#0d0b30'], [0.35, '#221a5c'], [0.7, '#43307e'], [1, '#7a5aa8']]) + stars(C, 140, 360);
      s += moon(C, 990, 128, 58, '#fff6d6', '#e8d8ff');
      s += streaks(C, 7, 150, 300, '#b8a0ff', 0.3);
      s += range(C, { base: 376, top: 260, n: 5, color: '#3a2c70', lit: '#4a3a86', shadow: '#140e3a', fog: '#6a4aa8', fogA: 0.7, rimC: '#d8c8ff', rimA: 0.5, blur: 1 });
      const h1 = hills(C, { base: 398, amp: 30, len: 200, lit: '#4a3a86', color: '#3a2c70', dark: '#2a2058', rim: '#b8a0ff' });
      s += h1.s + forestMass(C, h1.yAt, 34, { lit: '#5a4aa0', mid: '#3c2e86', sh: '#261c5e' }, { dy: 12, blur: 0.8 });
      const glowPal = [{ hi: '#bafcff', lit: '#5a4ab0', mid: '#3c2e86', sh: '#221a5a' }, { hi: '#ffb8f0', lit: '#5a3aa0', mid: '#3a2878', sh: '#1e1650' }];
      for (const x of [90 + R() * 80, 480 + R() * 100, 830 + R() * 100, 1180 + R() * 60]) s += grove(C, x, 412 + R() * 6, 80 + R() * 30, glowPal[0], { pals: glowPal, dabs: 6, shadowC: '#0a0620', trunk: '#2a1e48' });
      for (let i = 0; i < 8; i++) s += En(R() * W, 404 + R() * 30, 220 + R() * 200, 20 + R() * 12, C.soft('#9a80e0', 0.45, 0.3));
      s += groundPlane(C, { y0: 416, cols: ['#4a3c86', '#382c6a', '#281e50'], patch: ['#6a58b0', '#1a1440'], haze: '#8a70d0', hazeA: 0.35, mottle: 130 });
      s += lightPools(C, 416, 6, '#140e3a', '#8a70d0', 0.18);
      s += blades(C, 650, ['#2d2360', '#3a2d70', '#4a3a86', '#221a50'], 420, 725);
      s += path(C, { y: 592, col: '#6a5aa8', edge: '#2e2466', light: '#9a88d8', w: 58, stones: ['#3a2d70', '#5a4a90'] }).s;
      for (let i = 0; i < 9; i++) { const t = R(); s += mushrooms(C, R() * W, 450 + t * 250, 0.7 + t * 0.9, pick(R, ['#6fd8ff', '#ff8fe8', '#b8a0ff']), { glow: '#8ffcff', stem: '#d8e0ff' }); }
      for (let i = 0; i < 20; i++) { const t = R(), x = R() * W, y = 430 + t * 280, k = 0.6 + t * 0.9, c = pick(R, ['#8ffcff', '#ff9ff3', '#fff49a']); s += Cn(x, y - 8 * k, 14 * k, C.soft(c, 0.35, 0.2)) + Ln(`M${f(x)} ${f(y)}q${f(2 * k)} ${f(-6 * k)} 0 ${f(-10 * k)}`, '#4a3a86', 1.4 * k) + Cn(x, y - 10 * k, 2.6 * k, c) + Cn(x - 0.8 * k, y - 10.8 * k, 1 * k, '#ffffff'); }
      s += finish(C, { warm: '#b8a0ff', warmA: 0.14, lx: 990, ly: 128, cool: '#06041e', coolA: 0.35, cx: 0, cy: H, vig: '#06041e', vigA: 0.42 });
      return s;
    },

    /* the Star Altar (3.1): Sunny Isle's meadow at night — the galaxy over the hills, far isles floating in the sky, a
     * lit windmill and cottage, dark groves full of fireflies and a moonlit clearing (the starters' pedestals and the
     * first battle stand on it) */
    altar(C) {
      const R = C.R;
      let s = sky(C, [[0, '#050b21'], [0.3, '#0b1c42'], [0.5, '#143a62'], [0.58, '#1d5572'], [1, '#2a767c']]);
      // the galaxy: a tilted river of light — soft clouds, dark dust lanes and a crowd of tiny stars along it
      const band = x => 36 + x * 0.19 + Math.sin(x / 190) * 22;
      let gal = '';
      for (let i = 0; i < 18; i++) { const x = -80 + i * 82 + R() * 40, y = band(x) + (R() - 0.5) * 24; gal += En(x, y, 140 + R() * 100, 40 + R() * 30, C.soft(pick(R, ['#6d86ff', '#9b7bff', '#57c8ff', '#c28cff']), 0.24 + R() * 0.12, 0.25), ` transform="rotate(${f(11 + (R() - 0.5) * 8)} ${f(x)} ${f(y)})"`); }
      for (let i = 0; i < 14; i++) { const x = R() * W, y = band(x) + (R() - 0.5) * 26; gal += En(x, y, 70 + R() * 80, 12 + R() * 9, C.soft('#fff2dc', 0.3, 0.4), ` transform="rotate(11 ${f(x)} ${f(y)})"`); }
      s += G(gal, C.blur(5));
      let lanes = '';
      for (let i = 0; i < 9; i++) { const x = R() * W, y = band(x) + (R() - 0.5) * 14; lanes += En(x, y, 50 + R() * 70, 5 + R() * 5, C.soft('#040818', 0.6, 0.4), ` transform="rotate(${f(12 + (R() - 0.5) * 10)} ${f(x)} ${f(y)})"`); }
      s += G(lanes, C.blur(2));
      for (let i = 0; i < 300; i++) { const x = R() * W, y = band(x) + (R() + R() + R() - 1.5) * 64; if (y < 380) s += Cn(x, y, 0.35 + R() * 1.05, pick(R, ['#ffffff', '#dfe8ff', '#fff2d8']), op(0.3 + R() * 0.65)); }
      s += stars(C, 140, 380);
      // far Star Isles floating over the horizon, and the teal glow of the sea of clouds beneath them
      const isl = { rock: '#2e3e6e', rockSh: '#141c3c', rockLt: '#46609a', band: '#46609a', grass: '#23506a', grassLt: '#3a7a8a', grassSh: '#16304a', root: '#1a2444', leaf: { hi: '#6ad0c8', lit: '#2f6a7a', mid: '#214e62', sh: '#15344a' } };
      s += G(floatIsle(C, 170, 196, 36, isl, { trees: 1 }), op(0.7) + C.blur(0.8)) + G(floatIsle(C, 1110, 150, 44, isl, { trees: 2 }), op(0.75) + C.blur(0.8));
      s += Rect(0, 250, W, 170, C.lin([[0, '#3fb8c0', 0], [0.7, '#3fb8c0', 0.16], [1, '#3fb8c0', 0.05]]));
      s += range(C, { base: 350, top: 214, n: 5, color: '#16284e', lit: '#1e3862', shadow: '#0a1230', fog: '#2a6a80', fogA: 0.55, rimC: '#8fe8ff', rimA: 0.45, blur: 1.2 });
      const h1 = hills(C, { base: 376, amp: 42, len: 230, lit: '#1f4a62', color: '#183c56', dark: '#12304a', rim: '#6fd8e0', fog: '#2a6a7a', fogA: 0.4, blur: 0.6 });
      s += h1.s + forestMass(C, h1.yAt, 26, { lit: '#24566a', mid: '#1a4258', sh: '#12324a' }, { dy: 12, blur: 0.8 });
      const wx = 930 + R() * 160;
      s += Cn(wx, h1.yAt(wx) - 14, 34, C.soft('#ffd47a', 0.3, 0.2)) + windmill(C, wx, h1.yAt(wx) + 6, 56, { wall: '#3a4a70', wallSh: '#1c2446', roof: '#5a2e4a', door: '#ffd47a', blade: '#8a98c0', bladeSh: '#3a4a70' });
      const h2 = hills(C, { base: 406, amp: 34, len: 170, lit: '#1c4e58', color: '#163f4c', dark: '#123440', rim: '#5fd0c8' });
      s += h2.s;
      const cx = 250 + R() * 150;
      s += Cn(cx - 12, h2.yAt(cx) - 8, 40, C.soft('#ffcf70', 0.3, 0.2)) + cottage(C, cx, h2.yAt(cx) + 10, 48, { wall: '#3e4c72', wallSh: '#1c2446', roof: '#4e2a48', door: '#ffcf70', win: '#ffd47a' });
      const leafN = { hi: '#5fd0b8', lit: '#1f5a5e', mid: '#17444e', sh: '#0f2e3a' };
      for (let i = 0; i < 6; i++) { const x = R() * W; s += broadleaf(C, x, h2.yAt(x) + 8, 30 + R() * 16, leafN, { dabs: 1, trunk: '#1a2236' }); }
      for (const x of [50 + R() * 70, 560 + R() * 100, 1170 + R() * 80]) s += grove(C, x, h2.yAt(x) + 12, 66 + R() * 24, leafN, { trunk: '#1a2236', shadowC: '#040a14' });
      s += groundPlane(C, { y0: 414, cols: ['#1d5a52', '#16463e', '#0f322e'], patch: ['#2f7a68', '#0a2420'], haze: '#4fb0b0', hazeA: 0.28, mottle: 140 });
      s += lightPools(C, 414, 7, '#06161a', '#7fe0d0', 0.14);
      s += En(900, 560, 420, 90, C.soft('#8ff0e0', 0.16, 0.2));
      for (let i = 0; i < 12; i++) s += crown(C, R() * W, 414 + R() * 8, 8 + R() * 8, leafN, { n: 4, dabs: 1 });
      s += blades(C, 650, ['#0f3a34', '#15473e', '#1d5a4c', '#0a2c28'], 420, 725);
      for (let i = 0; i < 5; i++) s += flowerPatch(C, R() * W, 460 + R() * 240, 60 + R() * 80, 8 + Math.floor(R() * 8), ['#8ff0ff', '#ffb8f0', '#fff49a']);
      for (let i = 0; i < 7; i++) { const t = R(); s += mushrooms(C, R() * W, 450 + t * 250, 0.6 + t * 0.8, pick(R, ['#6fd8ff', '#ff8fe8', '#b8a0ff']), { glow: '#8ffcff', stem: '#d8e8ff' }); }
      s += path(C, { y: 596, col: '#2e5a5a', edge: '#12302e', light: '#5a9a90', w: 58, stones: ['#3a5a66', '#2a4452'] }).s;
      for (let i = 0; i < 30; i++) { const t = Math.pow(R(), 0.7), y = 430 + t * 290; s += tuft(C, R() * W, y, 8 + t * 18, { lit: '#2f7a66', mid: '#1a5046', sh: '#0e302c' }); }
      for (let i = 0; i < 26; i++) { const x = R() * W, y = 300 + R() * 360, r = 1.4 + R() * 1.8; s += Cn(x, y, r * 6, C.soft('#d8ff8a', 0.35, 0.2)) + Cn(x, y, r, '#f4ffc0'); }
      s += finish(C, { warm: '#8fe8ff', warmA: 0.1, lx: 900, ly: 480, lr: 700, cool: '#020616', coolA: 0.4, cx: 0, cy: H, vig: '#020616', vigA: 0.5 });
      return s;
    },

    citadel(C) {
      const R = C.R;
      let s = sky(C, [[0, '#07061c'], [0.35, '#1a1045'], [0.7, '#3b1a6a'], [1, '#6a2a8a']]);
      for (const [x, y, rx, c] of [[260, 160, 340, '#6a3aff'], [980, 240, 320, '#ff4fa8'], [640, 80, 280, '#2fb8ff']]) s += En(x, y, rx, rx * 0.5, C.soft(c, 0.3, 0.2));
      s += stars(C, 160, 380);
      s += Rect(0, 0, W, H, C.rad([[0, '#ffd0ff', 0.5], [0.12, '#c070ff', 0.3], [0.4, '#7a3aff', 0.08], [1, '#7a3aff', 0]], { cx: 640, cy: 150, r: 520, user: 1 }));
      s += shafts(C, 640, 150, 14, 300, '#ffd8ff', 0.3, -1, 1);
      s += Cn(640, 150, 84, C.soft('#ffe8ff', 0.9, 0.7)) + Cn(640, 150, 66, '#0c0822') + Pn('M590 124A66 66 0 0 1 690 118', 'none', ' stroke="#ffffff" stroke-width="2" opacity=".6"');
      const far = { stone: '#241a48', sh: '#120c2c', rim: '#a078e0', win: '#ffd06a' };
      let ru = '';
      for (let i = 0; i < 5; i++) ru += ruin(C, 80 + i * 280 + R() * 80, 404, 34 + R() * 20, 120 + R() * 100, far, { windows: 1 });
      s += G(ru, op(0.7) + C.blur(0.8));
      for (let i = 0; i < 6; i++) s += Paint.rock(100 + i * 210 + R() * 60, 200 + R() * 120, 24 + R() * 20, 14 + R() * 10, '#3a2c64', R);
      const near = { stone: '#34285e', sh: '#1a1238', rim: '#d8b0ff', win: '#ffd06a' };
      s += ruin(C, 170 + R() * 60, 414, 170, 190, near, { arch: true, windows: 0 }) + ruin(C, 1080 + R() * 60, 414, 60, 230, near) + ruin(C, 700 + R() * 80, 412, 46, 140, near);
      s += range(C, { base: 414, top: 380, n: 8, color: '#2a2050', lit: '#3a2c64', shadow: '#0e0a24', fog: '#5a2a8a', fogA: 0.6, rimC: '#c8a0ff', rimA: 0.6 });
      s += groundPlane(C, { y0: 416, cols: ['#43356e', '#302554', '#201838'], patch: ['#5a4a8a', '#140e2a'], haze: '#8a5ac0', hazeA: 0.35, mottle: 110 });
      for (let r = 0; r < 7; r++) {
        const y = 440 + r * r * 6 + r * 20, hgt = 10 + r * 5;
        for (let x = -40 + (r % 2) * 40; x < W + 40; x += 70 + r * 14) { if (R() < 0.15) continue; s += Pn(poly([[x + 3, y + 2], [x + 60 + r * 14 - 3, y + 2], [x + 60 + r * 14 - 5, y + hgt], [x + 5, y + hgt]]), '#3a2e62', op(0.5)) + Ln(`M${f(x + 4)} ${f(y + 3)}L${f(x + 58 + r * 14)} ${f(y + 3)}`, '#6a58a0', 1.4, op(0.55)); }
      }
      for (let i = 0; i < 10; i++) { const t = R(), x = R() * W, y = 440 + t * 260, k = 0.7 + t; s += Cn(x, y, 16 * k, C.soft('#c9a0ff', 0.35, 0.2)) + Ln(`M${f(x - 6 * k)} ${f(y)}L${f(x)} ${f(y - 8 * k)}L${f(x + 6 * k)} ${f(y)}L${f(x)} ${f(y + 4 * k)}Z`, '#e0c8ff', 1.6 * k, op(0.9)); }
      const crys = { hi: '#ffffff', mid: '#c8a0ff', sh: '#7a4ae0', glow: '#e0c8ff', line: '#5a3ac0' };
      for (let i = 0; i < 4; i++) { const t = R(); s += shards(C, R() * W, 460 + t * 220, 22 + t * 26, crys, { n: 2 + Math.floor(R() * 2) }); }
      s += stoneClusters(C, 4, ['#3a2e62', '#2a2050', '#4a3a7a'], 450);
      s += finish(C, { warm: '#e0a0ff', warmA: 0.16, lx: 640, ly: 150, cool: '#04020f', coolA: 0.4, cx: 0, cy: H, vig: '#04020f', vigA: 0.45 });
      return s;
    },
  };

  /* ======================= BATTLE BASES ======================= */
  const BASE = {
    meadow: { top: ['#b6e27e', '#7fc257', '#5a9f43'], side: ['#9a6a44', '#6a4430'], tuft: { lit: '#c8f08a', mid: '#6cb44c', sh: '#3a8a38' }, flowers: ['#ff8fb8', '#ffffff', '#ffd23f'] },
    forest: { top: ['#9ad66e', '#62a84a', '#437f38'], side: ['#7a5436', '#4e3424'], tuft: { lit: '#a8e070', mid: '#4f9b3e', sh: '#2c6a34' }, flowers: ['#fff4a0', '#ffffff'] },
    beach: { top: ['#fff2c8', '#f0d496', '#d8b070'], side: ['#c89a5a', '#9a7040'], shells: true },
    cove: { top: ['#f6dca8', '#e2c088', '#c8a06a'], side: ['#b08a66', '#7a5a48'], shells: true },
    volcano: { top: ['#8a6a74', '#5d4a56', '#3e3040'], side: ['#3a2632', '#1e1218'], lava: true },
    caldera: { top: ['#7a5058', '#523c46', '#33242c'], side: ['#34222e', '#160c16'], lava: true },
    snow: { top: ['#ffffff', '#e8f0fc', '#c8d8f0'], side: ['#9ab0d8', '#6a80b0'], sparkle: true },
    glacier: { top: ['#f0f8ff', '#cfe4f8', '#a8c8ec'], side: ['#6a98d8', '#3a68a8'], sparkle: true },
    plains: { top: ['#e8d890', '#c0ae60', '#8e8a42'], side: ['#8a6a44', '#5a4430'], tuft: { lit: '#f0dc90', mid: '#c0a858', sh: '#7a7a38' } },
    spire: { top: ['#d8ccf5', '#a794d4', '#8672b8'], side: ['#6a58a0', '#3a2a70'], tuft: { lit: '#c8f0a0', mid: '#8acf70', sh: '#5a9a5a' } },
    twilight: { top: ['#6a58b0', '#4a3c86', '#2e2460'], side: ['#2a2058', '#140e3a'], tuft: { lit: '#6a5aa8', mid: '#3a2d70', sh: '#221a50' }, glow: true },
    citadel: { top: ['#5a4a8a', '#43356e', '#2a2050'], side: ['#241a48', '#0e0a24'], tiles: true, glow: true },
    arena: { top: ['#9ae8b8', '#5cbf8a', '#3f9e6c'], side: ['#6b58c4', '#3c2f78'], ring: true },
  };
  /** oval battle base under a fighter (viewBox 420x110, scaled to the slot) */
  function platform(biome) {
    const b = BASE[biome] || BASE.meadow, C = newCtx(U.rng(U.hash('base' + biome)));
    const R = C.R, cx = 210, cy = 46, rx = 196, ry = 40;
    let s = En(cx + 8, cy + 30, rx * 1.02, ry * 0.9, C.soft('#000000', 0.35, 0.4));
    s += Pn(`M${cx - rx} ${cy}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}L${cx + rx - 4} ${cy + 16}A${rx - 4} ${ry} 0 0 1 ${cx - rx + 4} ${cy + 16}Z`, C.lin([[0, b.side[0]], [1, b.side[1]]], 0, 0, 1, 0));
    const pts = [];
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * (0.98 + R() * 0.03), cy + Math.sin(a) * ry * (0.95 + R() * 0.08)]); }
    const top = smoothClosed(pts), cid = C.id('pc');
    C.defs += `<clipPath id="${cid}"><path d="${top}"/></clipPath>`;
    s += Pn(top, C.rad([[0, b.top[0]], [0.55, b.top[1]], [1, b.top[2]]], { cx: '38%', cy: '30%', r: '75%' }));
    let inner = '';
    for (let i = 0; i < 26; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.9; inner += En(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 10 + R() * 22, 3 + R() * 5, C.soft(R() < 0.5 ? b.top[0] : b.top[2], 0.5, 0.4)); }
    if (b.tiles) for (let k = -3; k <= 3; k++) inner += Ln(`M${cx + k * 56} ${cy - ry}L${cx + k * 70} ${cy + ry}`, b.side[1], 2, op(0.35)) + Ln(`M${cx - rx} ${cy + k * 12}L${cx + rx} ${cy + k * 12}`, b.side[1], 1.6, op(0.25));
    if (b.ring) inner += `<ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.72}" ry="${ry * 0.62}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".55"/>`;
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    s += Pn(`M${cx - rx + 10} ${cy - 6}A${rx - 10} ${ry - 8} 0 0 1 ${cx + rx * 0.4} ${cy - ry + 3}`, 'none', ` stroke="${U.mix(b.top[0], '#ffffff', 0.4)}" stroke-width="3" stroke-linecap="round"` + op(0.6));
    if (b.tuft) for (let i = 0; i < 26; i++) { const a = Math.PI * (0.02 + R() * 0.96), x = cx + Math.cos(a) * rx * 0.98, y = cy + Math.sin(a) * ry * 0.98 + 2; s += tuft(C, x, y, 10 + R() * 12, b.tuft); }
    if (b.tuft) for (let i = 0; i < 10; i++) { const a = Math.PI * (1.05 + R() * 0.9), x = cx + Math.cos(a) * rx * 0.97, y = cy + Math.sin(a) * ry * 0.95 + 2; s += tuft(C, x, y, 7 + R() * 7, b.tuft); }
    if (b.flowers) for (let i = 0; i < 5; i++) { const a = Math.PI * (0.1 + R() * 0.8); s += blossoms(C, cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.9, 1.1, b.flowers); }
    if (b.shells) for (let i = 0; i < 5; i++) { const a = R() * Math.PI * 2, x = cx + Math.cos(a) * rx * 0.8, y = cy + Math.sin(a) * ry * 0.7; s += Pn(`M${f(x)} ${f(y)}L${f(x - 6)} ${f(y - 7)}Q${f(x)} ${f(y - 12)} ${f(x + 6)} ${f(y - 7)}Z`, pick(R, ['#ffb3c7', '#ffd9a0', '#ffffff'])); }
    if (b.lava) { let d = ''; for (let i = 0; i < 4; i++) { const a = R() * Math.PI * 2, x = cx + Math.cos(a) * rx * 0.6, y = cy + Math.sin(a) * ry * 0.5; d += `M${f(x)} ${f(y)}l${f(14 + R() * 20)} ${f((R() - 0.5) * 8)}l${f(12 + R() * 16)} ${f((R() - 0.5) * 8)}`; } s += `<g clip-path="url(#${cid})">${Ln(d, '#ff5a1e', 7, op(0.3))}${Ln(d, '#ff8a2e', 2.4)}${Ln(d, '#fff0a0', 0.9)}</g>`; }
    if (b.sparkle) for (let i = 0; i < 8; i++) { const x = cx + (R() - 0.5) * rx * 1.6, y = cy + (R() - 0.5) * ry * 1.2, r = 2 + R() * 2.5; s += Pn(`M${f(x)} ${f(y - r * 2)}L${f(x + r * 0.4)} ${f(y - r * 0.4)}L${f(x + r * 2)} ${f(y)}L${f(x + r * 0.4)} ${f(y + r * 0.4)}L${f(x)} ${f(y + r * 2)}L${f(x - r * 0.4)} ${f(y + r * 0.4)}L${f(x - r * 2)} ${f(y)}L${f(x - r * 0.4)} ${f(y - r * 0.4)}Z`, '#ffffff', op(0.9)); }
    if (b.glow) for (let i = 0; i < 5; i++) { const a = Math.PI * (0.1 + R() * 0.8), x = cx + Math.cos(a) * rx * 0.85, y = cy + Math.sin(a) * ry * 0.8, c = pick(R, ['#8ffcff', '#ff9ff3', '#c9a0ff']); s += Cn(x, y - 6, 12, C.soft(c, 0.45, 0.2)) + Cn(x, y - 6, 2.6, c); }
    return { defs: C.defs, body: s };
  }

  /* Star Arena stadium (battle + arena scene): the pitch starts at FY so both fighters stand on turf */
  BIOMES.arena = C => {
    const R = C.R, FY = 292;
    let s = sky(C, [[0, '#0c0a2c'], [0.5, '#221a5c'], [1, '#43287e']]) + stars(C, 60, 50);
    const bow = (x, amp) => -(1 - Math.pow((x - 640) / 720, 2)) * amp;
    const tierC = [['#2e2466', '#3a2e78'], ['#352a74', '#42358a'], ['#3e3284', '#4a3d98'], ['#4a3c96', '#5646a8']];
    const crowd = ['#ffd23f', '#ff7ab6', '#5cd6ff', '#9dff7a', '#ffffff', '#ff8a3d', '#b08cff', '#ffb3c7'];
    for (let t = 0; t < 4; t++) {
      const y0 = 34 + t * 52, y1 = y0 + 54;
      let band = `M-20 ${f(y0 + 12)}`;
      for (let x = -20; x <= W + 20; x += 40) band += `L${f(x)} ${f(y0 + 12 + bow(x, 16))}`;
      for (let x = W + 20; x >= -20; x -= 40) band += `L${f(x)} ${f(y1 + 12 + bow(x, 16))}`;
      s += Pn(band + 'Z', C.lin([[0, tierC[t][0]], [1, tierC[t][1]]]));
      let heads = '';
      for (let i = 0; i < 92; i++) {
        const x = i * 14.2 + R() * 6, y = y0 + 40 + bow(x, 16) - R() * 5, c = pick(R, crowd), k = 0.85 + t * 0.07;
        heads += Cn(x, y + 9 * k, 7.6 * k, U.shade(c, -0.36)) + Cn(x, y, 6 * k, c) + Cn(x - 1.6, y - 1.8, 2 * k, '#ffffff', op(0.4));
        if (R() < 0.12) heads += Ln(`M${f(x + 5)} ${f(y + 6)}l${f(4 + R() * 3)} ${f(-12 - R() * 4)}`, U.shade(c, -0.2), 3 * k);
        if (R() < 0.05) heads += Rect(x - 7, y - 20, 14, 9, pick(R, ['#ffe066', '#ff5d8f', '#5cd6ff']), op(0.9));
      }
      s += heads + Ln(smooth([[-20, y1 + 10 + bow(-20, 16)], [320, y1 + 10 + bow(320, 16)], [640, y1 + 10 + bow(640, 16)], [960, y1 + 10 + bow(960, 16)], [W + 20, y1 + 10 + bow(W + 20, 16)]]), '#1e1848', 6);
    }
    // spotlight pools on the crowd
    for (let i = 0; i < 5; i++) s += En(130 + i * 255 + R() * 40, 150, 120, 80, C.soft('#fff4c8', 0.2, 0.3));
    // pitch wall with banners
    s += Rect(0, FY - 60, W, 64, C.lin([[0, '#7a66d4'], [1, '#5a48b0']])) + Rect(0, FY - 60, W, 7, '#a896f0') + Rect(0, FY - 4, W, 6, '#3a2e78');
    const Lc = ['#d9894a', '#b8c4dc', '#ffc21a', '#8fe3e0', '#b88cff'];
    for (let i = 0; i < 10; i++) {
      const x = 40 + i * 132, c = Lc[i % 5], P = Paint.ramp(c);
      s += Pn(`M${x} ${FY - 52}L${x + 70} ${FY - 52}L${x + 70} ${FY - 8}L${x + 35} ${FY - 18}L${x} ${FY - 8}Z`, c) + Pn(`M${x + 44} ${FY - 52}L${x + 70} ${FY - 52}L${x + 70} ${FY - 8}L${x + 44} ${FY - 15}Z`, P.sh, op(0.6)) +
        Ln(`M${x + 3} ${FY - 49}L${x + 40} ${FY - 49}`, P.hi, 2, op(0.7)) + Pn(`M${x + 35} ${FY - 44}L${x + 38} ${FY - 36}L${x + 46} ${FY - 35}L${x + 40} ${FY - 30}L${x + 42} ${FY - 22}L${x + 35} ${FY - 26}L${x + 28} ${FY - 22}L${x + 30} ${FY - 30}L${x + 24} ${FY - 35}L${x + 32} ${FY - 36}Z`, '#ffffff', op(0.9));
    }
    // turf with mowing stripes, perspective lines, ring and star emblem
    s += Rect(0, FY, W, H - FY, C.lin([[0, '#8ee0b0'], [0.35, '#5cbf8a'], [1, '#3a9464']]));
    for (let i = 0; i < 9; i++) { const y0 = FY + Math.pow(i / 9, 1.4) * (H - FY), y1 = FY + Math.pow((i + 0.5) / 9, 1.4) * (H - FY); s += Rect(0, y0, W, y1 - y0, '#ffffff', op(0.06)); }
    for (let k = -6; k <= 6; k++) s += Ln(`M${f(640 + k * 70)} ${FY}L${f(640 + k * 190)} ${H}`, '#ffffff', 1.4, op(0.05));
    s += Ln('M640 400C1110 400 1130 660 640 660C150 660 170 400 640 400Z', '#ffffff', 6, op(0.5)) + Ln(`M640 ${FY}L640 ${H}`, '#ffffff', 5, op(0.35));
    s += Pn('M640 480L656 516L696 520L666 546L676 586L640 566L604 586L614 546L584 520L624 516Z', '#ffffff', op(0.3));
    for (let i = 0; i < 26; i++) { const t = R(), x = R() * W, y = FY + 20 + t * (H - FY - 20); s += tuft(C, x, y, 8 + t * 12, { lit: '#b8f0c8', mid: '#5cbf8a', sh: '#2f8a5a' }); }
    // light towers with beams
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 216;
      s += Pn(`M${x - 18} 20L${x + 18} 20L${f(x + 150 - i * 50)} 470L${f(x - 150 - i * 16)} 470Z`, C.lin([[0, '#fffbe0', 0.14], [0.6, '#fffbe0', 0.04], [1, '#fffbe0', 0]]));
      s += Rect(x - 34, 6, 68, 22, '#3a2e6a') + Rect(x - 30, 10, 60, 14, '#fff6c0') + Cn(x, 17, 70, C.soft('#fffbe0', 0.55, 0.25));
    }
    s += finish(C, { warm: '#fff0c8', warmA: 0.12, lx: 640, ly: 0, cool: '#140a40', coolA: 0.3, cx: 640, cy: H, vig: '#0c0628', vigA: 0.4 });
    return s;
  };

  /* ======================= TIME OF DAY (3.4.1) ======================= */
  /* The zones follow the player's clock (U.dayPhase). The hour used to be a see-through sheet laid over the whole scene,
   * which flattened every sprite and read as a broken, dimmed screen. Now the backdrop is painted for the hour, once, at
   * bake time: the sky's own layers are swapped (its gradient pulled toward the hour's colours, the sun turned into the
   * moon at night or a warm evening / pale morning sun, stars at night), everything in front of the sky is colour-graded
   * under one SVG filter (a saturation step and per-channel curves, so shadows go blue or violet while lights stay light)
   * and windows, lanterns and lava glow on top, ungraded. The extras draw from their own random stream (C.R2), so a
   * zone keeps its exact layout at every hour. */
  const TOD = {
    // sky: colours at the offsets TOD_AT, top → the horizon behind the hills (y ≈ 400); curves: R, G and B output for
    // black, mid-grey and white
    night: { sky: ['#060d28', '#0f2049', '#20386a', '#3a5786'], sat: 0.68, curves: [[0.015, 0.2, 0.55], [0.03, 0.29, 0.66], [0.08, 0.45, 0.92]] },
    dusk: { sky: ['#28347a', '#74508f', '#dc707c', '#ffb660'], sat: 1.08, curves: [[0.07, 0.6, 1], [0.02, 0.45, 0.9], [0.08, 0.38, 0.74]] },
    dawn: { sky: ['#6380c8', '#ab9fd6', '#f3b8bc', '#ffdcb6'], sat: 0.95, curves: [[0.04, 0.55, 1], [0.03, 0.5, 0.97], [0.09, 0.53, 0.97]] },
  };
  const TOD_AT = [0, 0.2, 0.38, 0.55];
  const TOD_BIOMES = new Set(['meadow', 'forest', 'beach', 'cove', 'volcano', 'caldera', 'snow', 'glacier', 'plains', 'spire', 'home', 'yard']);
  /** [sky, land] strength per biome and hour (default [1, 1]): the volcanic, stormy and polar skies are dusky already */
  const TOD_K = {
    volcano: { night: [0.35, 0.5], dusk: [0.3, 0.35], dawn: [0.3, 0.3] },
    caldera: { night: [0.2, 0.4], dusk: [0.15, 0.25], dawn: [0.15, 0.25] },
    glacier: { night: [0.15, 0.5], dusk: [0.2, 0.4], dawn: [0.25, 0.4] },
    plains: { night: [0.6, 0.85], dusk: [0.45, 0.6], dawn: [0.45, 0.6] },
  };
  /** how brightly windows and lanterns burn at this hour */
  function todLight(C) { return C.tod === 'night' ? 1 : C.tod === 'dusk' ? 0.6 : 0; }
  /** a colour ramp [[offset, colour], …] read at o */
  function rampAt(st, o) {
    if (o <= st[0][0]) return st[0][1];
    for (let i = 1; i < st.length; i++) if (o <= st[i][0]) return U.mix(st[i - 1][1], st[i][1], (o - st[i - 1][0]) / Math.max(1e-6, st[i][0] - st[i - 1][0]));
    return st[st.length - 1][1];
  }
  /** the biome's sky ramp pulled toward the hour's, sampled at both ramps' stops */
  function todSkyStops(C, st) {
    st = st.map((s, i) => Array.isArray(s) ? s : [i / Math.max(1, st.length - 1), s]);
    if (st.some(s => s[2] != null)) return st; // (a see-through sky: not one of the zones')
    const P = TOD[C.tod].sky.map((c, i) => [TOD_AT[i], c]);
    const at = [...new Set([...st.map(s => s[0]), ...TOD_AT, 1])].sort((a, b) => a - b);
    return at.map(o => [o, U.mix(rampAt(st, o), rampAt(P, o), C.todSky)]);
  }
  function todStars(C) {
    const R = C.R2;
    let s = '';
    for (let i = 0; i < 150; i++) { const x = R() * W, y = Math.pow(R(), 1.5) * 330, r = 0.5 + R() * 1.25; s += Cn(x, y, r, '#ffffff', op((0.3 + R() * 0.7) * (1 - y / 420))); }
    for (let i = 0; i < 6; i++) {
      const x = R() * W, y = 24 + R() * 170, r = 3.5 + R() * 3.5;
      s += Cn(x, y, r * 1.9, C.soft('#cfe0ff', 0.4, 0.2)) + Pn(`M${f(x)} ${f(y - r)}Q${f(x + r * 0.14)} ${f(y - r * 0.14)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.14)} ${f(y + r * 0.14)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.14)} ${f(y + r * 0.14)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.14)} ${f(y - r * 0.14)} ${f(x)} ${f(y - r)}Z`, '#f4f8ff', op(0.9));
    }
    return s;
  }
  /** the sun as the hour has it: the moon at night, a big warm evening sun at dusk, a pale one at dawn */
  function todSun(C, x, y, r, a) {
    if (C.tod === 'night') {
      const R = C.R2, m = r * 0.95;
      let s = Rect(0, 0, W, H, C.rad([[0, '#bcd2ff', 0.3], [0.16, '#9ab6ff', 0.12], [1, '#9ab6ff', 0]], { cx: x, cy: y, r: m * 9, user: 1 }));
      s += Cn(x, y, m * 1.9, C.soft('#e2ecff', 0.45, 0.4)) + Cn(x, y, m, '#fbf5e2');
      for (let i = 0; i < 7; i++) { const t = R() * 6.28, d = R() * m * 0.6, rr = m * (0.07 + R() * 0.12), cx = x + Math.cos(t) * d, cy = y + Math.sin(t) * d; s += Cn(cx, cy, rr, '#ddd6c0', op(0.75)) + Cn(cx - rr * 0.25, cy - rr * 0.25, rr * 0.7, '#ece6d2', op(0.75)); }
      return s + Pn(`M${f(x + m * 0.1)} ${f(y - m)}A${f(m)} ${f(m)} 0 0 1 ${f(x + m * 0.2)} ${f(y + m * 0.98)}A${f(m * 1.25)} ${f(m * 1.25)} 0 0 0 ${f(x + m * 0.1)} ${f(y - m)}Z`, '#5a6aa8', op(0.2));
    }
    const [core, glow, k] = C.tod === 'dusk' ? ['#fff0c4', '#ff9a50', 1.35] : ['#fffaf0', '#ffc0b0', 1.1];
    const bloom = C.rad([[0, glow, a2(Math.min(0.9, a * k))], [0.18, glow, a2(a * k * 0.55)], [0.5, glow, a2(a * k * 0.16)], [1, glow, 0]], { cx: x, cy: y, r: r * 11, user: 1 });
    return Rect(0, 0, W, H, bloom) + Cn(x, y, r * 2.2, C.soft(glow, 0.6, 0.45)) + Cn(x, y, r * 1.08, core) + Cn(x, y, r * 0.9, C.soft('#ffffff', 0.6, 0.6));
  }
  /** the land's grade: saturation, then per-channel curves, both eased toward no change by the biome's strength */
  function todGrade(C) {
    const T = TOD[C.tod], k = C.todLand, id = C.id('tg'), s = U.lerp(1, T.sat, k), lr = 0.2126, lg = 0.7152, lb = 0.0722;
    const m = [lr + (1 - lr) * s, lg - lg * s, lb - lb * s, 0, 0, lr - lr * s, lg + (1 - lg) * s, lb - lb * s, 0, 0, lr - lr * s, lg - lg * s, lb + (1 - lb) * s, 0, 0, 0, 0, 0, 1, 0];
    const tab = c => c.map((v, j) => Math.round(U.lerp(j / 2, v, k) * 1000) / 1000).join(' ');
    C.defs += `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">` +
      `<feColorMatrix type="matrix" values="${m.map(v => Math.round(v * 1e4) / 1e4).join(' ')}"/>` +
      `<feComponentTransfer><feFuncR type="table" tableValues="${tab(T.curves[0])}"/><feFuncG type="table" tableValues="${tab(T.curves[1])}"/><feFuncB type="table" tableValues="${tab(T.curves[2])}"/></feComponentTransfer></filter>`;
    return id;
  }
  /** morning mist over the horizon and the low ground */
  function todMist(C) {
    return Rect(0, HZ - 100, W, 190, C.lin([[0, '#fff0ee', 0], [0.55, '#fff0ee', 0.22], [1, '#fff0ee', 0]])) + Rect(0, HZ + 90, W, 160, C.lin([[0, '#fff6f0', 0], [0.5, '#fff6f0', 0.08], [1, '#fff6f0', 0]]));
  }

  /** painted backdrop markup for a biome (at an hour: 'dawn' | 'dusk' | 'night', default day); returns { defs, body } */
  function paint(biome, seed, tod) {
    const C = newCtx(U.rng(seed));
    if (!TOD[tod] || !TOD_BIOMES.has(biome)) { const body = BIOMES[biome](C); return { defs: C.defs, body }; }
    const [ks, kl] = (TOD_K[biome] || {})[tod] || [1, 1];
    Object.assign(C, { tod, todSky: ks, todLand: kl, pre: '', post: '', R2: U.rng(seed * 31 + 7) });
    const land = BIOMES[biome](C);
    const body = C.pre + `<g filter="url(#${todGrade(C)})">${land}</g>` + (tod === 'dawn' && C.pre ? todMist(C) : '') + C.post; // (mist only where there is a horizon)
    return { defs: C.defs, body };
  }
  return { paint, platform, has: b => !!BIOMES[b], W, H, HZ, wave, smooth, smoothClosed, roughen, newCtx, sky, sun, stars, cumulus, crown, broadleaf, pine, pineGroup, palm, floatIsle, shards, mesa, tuft, deadTree, ruin, finish };
})();
