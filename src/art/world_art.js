'use strict';
/* World art: zone backgrounds (per biome), props, characters (player/NPC), Pip the robot,
 * capture orbs, item icons, floating isles for the galaxy map, starfield, UI glyph icons.
 * Everything is procedural SVG → cached object URLs. */

const WArt = (() => {
  const OL = '#2b2040', SW = 4;
  const f = n => Math.round(n * 10) / 10;
  const D = (s, ...v) => s.reduce((a, str, i) => a + str + (i < v.length ? (typeof v[i] === 'number' ? f(v[i]) : v[i]) : ''), '');
  const rad = x => x * Math.PI / 180;
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  const op = a => ` opacity="${Math.round(a * 100) / 100}"`;
  const Rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
  const poly = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  let OW = 1; // outline weight multiplier (thin, finer lines for big dialogue portraits)
  const st = (w = SW) => ` stroke="${OL}" stroke-width="${f(w * OW)}" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, fill, x = '', w) => `<path d="${d}" fill="${fill}"${st(w)}${x}/>`;
  const Pn = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;
  const E = (cx, cy, rx, ry, fill, x = '', w) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${st(w)}${x}/>`;
  const En = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
  const Ci = (cx, cy, r, fill, x = '', w) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${st(w)}${x}/>`;
  const Cn = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
  const Ln = (d, color, w, x = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(color === OL ? w * Math.max(OW, 0.7) : w)}" stroke-linecap="round" stroke-linejoin="round"${x}/>`;
  const Tube = (d, color, w, ow = SW) => Ln(d, OL, w + ow * 2 * OW) + Ln(d, color, w);
  const Gt = (inner, t, x = '') => `<g${t ? ` transform="${t}"` : ''}${x}>${inner}</g>`;
  const tr = (x, y, r, s) => `translate(${f(x)} ${f(y)})` + (r ? ` rotate(${f(r)})` : '') + (s ? ` scale(${s})` : '');
  const rg = (id, c, hi = 0.14, lo = -0.14, cx = '36%', cy = '28%') =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="80%"><stop offset="0" stop-color="${U.shade(c, hi)}"/><stop offset=".62" stop-color="${c}"/><stop offset="1" stop-color="${U.shade(c, lo)}"/></radialGradient>`;
  const lg = (id, stops, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map((c, i) => `<stop offset="${f(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  const svg = (w, h, defs, body, css = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${css ? `<style>${css}</style>` : ''}<defs>${defs}</defs>${body}</svg>`;
  function starD(cx, cy, r1, r2, n = 5, rot = -90) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = rad(rot + (i * 180) / n);
      d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r);
    }
    return d + 'Z';
  }
  const sparkD = (x, y, r) => D`M${x} ${y - r}Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z`;
  function fluffy(cx, cy, rx, ry, n, bump) {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (i === 0) d += D`M${x} ${y}`;
      else {
        const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
        d += D`Q${cx + Math.cos(am) * (rx + bump * 2)} ${cy + Math.sin(am) * (ry + bump * 2)} ${x} ${y}`;
      }
    }
    return d + 'Z';
  }

  /* ======================= BACKGROUNDS (painted by Scenery) ======================= */
  /** the hour a backdrop is painted for: 'dawn' | 'dusk' | 'night', or '' for day (see Scenery TIME OF DAY) */
  const todOf = t => t === 'dawn' || t === 'dusk' || t === 'night' ? t : '';
  function bg(biome, seed, tod) {
    tod = todOf(tod);
    return U.svgUrl('bg:' + biome + ':' + seed + (tod ? ':' + tod : ''), () => {
      const out = Scenery.paint(biome, seed, tod);
      return svg(1280, 720, out.defs, out.body);
    });
  }
  /* The painted backdrops are filter-heavy vectors, so each one is rasterized once into a master
   * bitmap sized for the current display; every scene (explore, battles, re-visits) then gets a cheap
   * canvas copy and the vector painting is never re-rasterized. */
  const baked = new Map(), baking = new Map();
  const bakeK = () => Math.round(U.clamp(((typeof UI !== 'undefined' && UI.scale) || 1) * ((typeof window !== 'undefined' && window.devicePixelRatio) || 1), 1, 2) * 4) / 4;
  function bake(biome, seed, tod) {
    tod = todOf(tod);
    const k = bakeK(), key = biome + ':' + seed + ':' + k + ':' + tod;
    if (baked.has(key)) return Promise.resolve(baked.get(key));
    if (baking.has(key)) return baking.get(key);
    const p = new Promise(res => {
      const done = m => { baked.set(key, m); baking.delete(key); res(m); };
      if (typeof Image === 'undefined' || typeof document === 'undefined') return done(null);
      const im = new Image();
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = Math.round(1280 * k); c.height = Math.round(720 * k);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          done(c);
        } catch (e) { done(null); }
      };
      im.onerror = () => done(null);
      im.src = bg(biome, seed, tod);
    });
    baking.set(key, p);
    return p;
  }
  /** painted oval battle base for a biome */
  function plat(biome) {
    return U.svgUrl('plat:' + biome, () => { const o = Scenery.platform(biome); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 110" width="420" height="110" preserveAspectRatio="none"><defs>${o.defs}</defs>${o.body}</svg>`; });
  }
  /** backdrop element for a scene: a canvas copy of the baked master (falls back to the SVG <img>) */
  function bgImg(biome, seed, cls, tod) {
    tod = todOf(tod);
    const k = bakeK(), key = biome + ':' + seed + ':' + k + ':' + tod;
    const cv = document.createElement('canvas');
    if (!cv.getContext) return U.img(bg(biome, seed, tod), cls);
    cv.className = cls || '';
    cv.width = Math.round(1280 * k); cv.height = Math.round(720 * k);
    const paint = m => {
      if (m) { try { cv.getContext('2d').drawImage(m, 0, 0, cv.width, cv.height); return; } catch (e) { /* fall through */ } }
      const im = U.img(bg(biome, seed, tod), cls);
      if (cv.parentNode) cv.parentNode.replaceChild(im, cv);
    };
    if (baked.has(key)) paint(baked.get(key));
    else bake(biome, seed, tod).then(paint);
    return cv;
  }

  /* ======================= PROPS ======================= */
  const PROP = PropArt.PROP;
  function prop(type, v = 0) {
    const def = PROP[type];
    return {
      w: def.w, h: def.h,
      url: U.svgUrl('p:' + type + ':' + v, () => {
        const [defs, body] = def.svg(v).split('|');
        return svg(def.w, def.h, defs, body);
      }),
    };
  }

  /* ======================= CHARACTERS ======================= */
  const SKINS = ['#ffe3cc', '#f6c9a0', '#dca47a', '#b57b53', '#8a5a3c'];
  const HAIRC = ['#3b2a2a', '#7a4a2a', '#e8b04a', '#e8604a', '#4a6ae8', '#b56ae8', '#f2eef8', '#3fbf8f'];
  const SUITS = ['#3aa6ff', '#ff6b6b', '#4cd964', '#ffb13b', '#a07cff', '#ff7ab6', '#2fd0c0', '#5a6478'];
  const HAIRS = ['short', 'spiky', 'long', 'bob', 'pony', 'bun', 'curly'];

  /* ---- painted characters (Painter) ---- */
  function personSpec(L, o = {}) {
    const lg = o.size === 'lg';
    const key = 'pp:' + JSON.stringify(L) + (o.frame != null ? ':f' + o.frame : '') + (o.blink ? ':b' : '') + (lg ? ':L' : '');
    const po = { w: lg ? 360 : 240, h: lg ? 510 : 340, px: lg ? 3 : 2, ink: '#1a1226', inkW: 2, box: lg ? [30, 30, 300, 450] : [20, 20, 200, 300], rim: null, tex: 0.4, light: 0.3, shade: 0.35, step1: 6, step2: 3.5, seed: U.hash(JSON.stringify(L)) };
    if (o.urgent) po.urgent = true;
    return { key, o: po, svg: () => { OW = lg ? 0.42 : 0.5; try { return personSvg(L, { walk: o.frame != null ? o.frame / 8 : undefined, blink: o.blink }); } finally { OW = 1; } } };
  }
  /** synchronous url (idle pose): the painting when ready, else the vector stand-in (upgraded in place) */
  function person(L) {
    const q = personSpec(L);
    return Painter.get(q.key, q.svg, q.o);
  }
  /** big painted character for dialogues, VS screens and cards */
  function portrait(L) {
    const q = personSpec(L, { size: 'lg' });
    return Painter.get(q.key, q.svg, q.o);
  }
  /** painted bitmap → Promise<url>; o: frame (0..7 walk), blink, size, urgent */
  function painted(L, o = {}) {
    const q = personSpec(L, o);
    return Painter.bake(q.key, q.svg(), q.o);
  }
  /* body builds: head scale/offset, shoulder & hip heights, torso half-widths (shoulder, hip), leg width & spacing */
  const BUILD = {
    std:   { hs: 0.9,  hx: 0, hy: -6,  sh: 80,  hip: 112, tw: 16,   bw: 17,   lw: 6.2, lg: 6,   arm: 27, belly: 0 },
    kid:   { hs: 0.97, hx: 0, hy: 6,   sh: 92,  hip: 121, tw: 13.5, bw: 14.5, lw: 5.6, lg: 5.4, arm: 23, belly: 0 },
    tall:  { hs: 0.82, hx: 0, hy: -16, sh: 70,  hip: 106, tw: 15,   bw: 15.5, lw: 5.8, lg: 5.6, arm: 31, belly: 0 },
    stout: { hs: 0.9,  hx: 0, hy: -4,  sh: 82,  hip: 116, tw: 21,   bw: 26,   lw: 7.6, lg: 8.5, arm: 27, belly: 9 },
    elder: { hs: 0.88, hx: 4, hy: 2,   sh: 88,  hip: 117, tw: 16,   bw: 17,   lw: 6,   lg: 6,   arm: 26, belly: 4 },
  };
  const FUR = ['#f0a040', '#9a9aac', '#4a4452', '#f4f0e8', '#c8845a', '#e8c890'];
  /* ---------------- characters: an articulated rig (hips → knees → ankles, shoulders → elbows → hands) ----------------
   * pose: { walk: phase 0..1 (8-frame cycle) | undefined for the idle stance, blink: bool }.
   * The walk is keyed like a hand-animated cycle (contact · down · passing · up), both legs half a cycle apart,
   * arms swinging against the legs; the pelvis sits wherever the lower foot touches the ground, which gives the
   * natural bob. Faces right; the scene mirrors it. */
  const LEG_KEYS = [ // phase, thigh° (+ forward), knee flex°, foot°
    [0.000, 27, 4, -14], [0.125, 17, 22, 0], [0.250, 3, 9, 0], [0.375, -13, 5, 8],
    [0.500, -26, 17, 34], [0.625, -13, 56, 30], [0.750, 9, 70, 10], [0.875, 27, 30, -8],
  ];
  function legPose(ph) {
    ph = ((ph % 1) + 1) % 1;
    const n = LEG_KEYS.length, i = Math.floor(ph * n), t = ph * n - i;
    const k = j => LEG_KEYS[((j % n) + n) % n];
    const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    return [1, 2, 3].map(m => cr(k(i - 1)[m], k(i)[m], k(i + 1)[m], k(i + 2)[m]));
  }
  function personSvg(L, pose = {}) {
    const kind = L.kind || 'human', B = BUILD[L.body] || BUILD.std;
    const skin = kind === 'cat' ? (L.fur || FUR[0]) : kind === 'bot' ? '#c8d4e8' : (L.skin || SKINS[0]);
    const hair = L.hairC || HAIRC[0], top = L.top || SUITS[0], pants = L.pants || '#3a3f6a', shoes = L.shoes || '#2f2a44';
    const acc = [].concat(L.acc || []), has = a => acc.includes(a);
    const outfit = L.outfit || (has('labcoat') ? 'lab' : 'tee');
    const skinR = Paint.ramp(skin), topR = Paint.ramp(top), hairR = Paint.ramp(hair), pantsR = Paint.ramp(pants);
    const accC = L.accC || '#ff5d6c';
    const walking = pose.walk != null, ph = walking ? pose.walk : 0;
    const { tw, bw, lw, lg } = B, cx = 60, ground = 152;
    const rd = x => x * Math.PI / 180;
    // ---- legs: solve both, then drop the pelvis until the lower ankle stands on the ground
    const legLen = ground - B.hip, Lt = legLen * 0.5, Ls = legLen * 0.5;
    const legAt = (hx, thigh, knee, footA) => {
      const K = [hx + Math.sin(rd(thigh)) * Lt, B.hip + Math.cos(rd(thigh)) * Lt];
      const A = [K[0] + Math.sin(rd(thigh - knee)) * Ls, K[1] + Math.cos(rd(thigh - knee)) * Ls];
      return { H: [hx, B.hip], K, A, foot: footA };
    };
    let legN, legF;
    if (walking) {
      const [t1, k1, f1] = legPose(ph), [t2, k2, f2] = legPose(ph + 0.5);
      legN = legAt(cx + lg * 0.35, t1, k1, f1); legF = legAt(cx - lg * 0.35, t2, k2, f2);
    } else { legN = legAt(cx + lg, 3, 3, 0); legF = legAt(cx - lg, -3, 2, 0); }
    const drop = ground - Math.max(legN.A[1] + (walking && legN.foot > 12 ? -2 : 0), legF.A[1] + (walking && legF.foot > 12 ? -2 : 0));
    const lean = walking ? 3 : 0;
    const by = drop - (walking ? 0 : 0);
    for (const lgx of [legN, legF]) for (const pnt of [lgx.H, lgx.K, lgx.A]) pnt[1] += by;
    const sh = B.sh + by, hip = B.hip + by;
    const bodyTf = lean ? `rotate(${lean} ${cx} ${f(hip)})` : '';
    const torsoD = `M${cx - bw} ${hip}L${cx - tw} ${sh + 9}Q${cx - tw + 2} ${sh - 2} ${cx} ${sh - 2}Q${cx + tw - 2} ${sh - 2} ${cx + tw} ${sh + 9}L${cx + bw} ${hip}Q${cx} ${hip + 7} ${cx - bw} ${hip}Z`;
    const faceD = 'M27 50C27 27 43 17 61 17C80 17 94 30 94 50C94 66 89 77 80 83C73 88 65 89 57 86C42 82 27 70 27 50Z';
    const defs = rg('gt', top) + rg('gs', skin, 0.08, -0.1) + rg('gh', hair, 0.16, -0.12) + rg('ga', accC) + rg('gm', '#b8c4dc', 0.2, -0.14) +
      `<clipPath id="cth"><path d="${torsoD}"/></clipPath><clipPath id="chd"><path d="${faceD}"/></clipPath>`;
    const headBob = walking ? Math.cos(ph * Math.PI * 4) * 0.6 : 0;
    const headTf = `translate(${f(cx + B.hx + (walking ? 1.5 : 0))} ${f(52 + B.hy + by + headBob)}) rotate(${walking ? f(Math.sin(ph * Math.PI * 4) * 1.5) : 0}) scale(${B.hs}) translate(-60 -52)`;
    let back = '', s = '';

    /* ---- a limb: a tapered, bending tube through three joints with a soft shaded back edge ---- */
    const limb = (a, b, c, w0, w1, w2, fill, shadeC) => {
      const nrm = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
      const n1 = nrm(a, b), n2 = nrm(b, c), nk0 = [n1[0] + n2[0], n1[1] + n2[1]], nl = Math.hypot(nk0[0], nk0[1]) || 1, nk = [nk0[0] / nl, nk0[1] / nl];
      const pt2 = (p, n, w) => [p[0] + n[0] * w, p[1] + n[1] * w];
      const L0 = pt2(a, n1, w0), L1 = pt2(b, nk, w1), L2 = pt2(c, n2, w2), R2 = pt2(c, n2, -w2), R1 = pt2(b, nk, -w1), R0 = pt2(a, n1, -w0);
      const d = D`M${L0[0]} ${L0[1]}Q${L1[0]} ${L1[1]} ${L2[0]} ${L2[1]}A${w2} ${w2} 0 0 1 ${R2[0]} ${R2[1]}Q${R1[0]} ${R1[1]} ${R0[0]} ${R0[1]}Z`;
      const inner = D`M${R0[0]} ${R0[1]}Q${R1[0]} ${R1[1]} ${R2[0]} ${R2[1]}`;
      return P(d, fill) + (shadeC ? Ln(inner, shadeC, Math.max(1.6, w1 * 0.7), ` opacity=".45" transform="translate(${f(-n1[0] * w1 * 0.35)} ${f(-n1[1] * w1 * 0.35)})"`) : '');
    };
    /* ---- a shoe/boot at the ankle, tilted by the foot angle (rotates around the toe when the heel lifts) ---- */
    const shoe = (A, ang, col) => {
      const w = lw + 2.6;
      const g = P(D`M${-w * 0.55} ${-5}Q${-w * 0.7} ${4} ${-w * 0.45} ${6.5}L${w * 1.25} ${6.5}Q${w * 1.55} ${6} ${w * 1.4} ${1.5}Q${w * 1.1} ${-4} ${w * 0.35} ${-5}Z`, col, '', 3.2) +
        Ln(D`M${-w * 0.45} ${4.6}L${w * 1.3} ${4.6}`, U.shade(col, -0.25), 2.2, op(0.6)) + Ln(D`M${-w * 0.2} ${-2.5}Q${w * 0.4} ${-4} ${w * 0.9} ${-1.5}`, U.shade(col, 0.35), 1.6, op(0.55));
      return Gt(g, `translate(${f(A[0])} ${f(A[1] + 1)}) rotate(${f(ang)} ${f(w * 1.2)} ${6.5})`);
    };
    const legCol = outfit === 'wetsuit' ? top : outfit === 'armor' ? '#8a90b0' : outfit === 'dress' || outfit === 'robe' ? skin : pants;
    const drawLeg = (lgx, far) => {
      const col = far ? U.shade(legCol, -0.12) : legCol;
      let g = limb(lgx.H, lgx.K, lgx.A, lw * 1.08, lw * 0.92, lw * 0.78, col, Paint.ramp(col).sh);
      if (outfit === 'armor') g += Gt(E(0, 0, lw * 0.9, lw * 0.7, '#c8d0e8', '', 2.4), `translate(${f(lgx.K[0])} ${f(lgx.K[1])})`);
      if (outfit === 'overalls' || outfit === 'suit') g += Ln(D`M${lgx.K[0] - lw * 0.4} ${lgx.K[1] + 2}q${lw * 0.3} 3 ${lw * 0.8} 1`, Paint.ramp(col).sh, 1.4, op(0.6));
      g += shoe(lgx.A, lgx.foot, kind === 'bot' ? '#5a6478' : far ? U.shade(shoes, -0.1) : shoes);
      return g;
    };
    /* ---- arms ---- */
    const armLen = B.arm || 26, Lu = armLen * 0.52, Lf = armLen * 0.48;
    const armAt = (sx, sy, up, el) => { const E1 = [sx + Math.sin(rd(up)) * Lu, sy + Math.cos(rd(up)) * Lu]; const W1 = [E1[0] + Math.sin(rd(up + el)) * Lf, E1[1] + Math.cos(rd(up + el)) * Lf]; return { S: [sx, sy], E: E1, W: W1, fa: up + el }; };
    const swing = walking ? Math.cos(ph * Math.PI * 2) : 0;
    const armN = armAt(cx + tw - 3, sh + 6, walking ? -20 * swing + 2 : 8, walking ? 16 + 20 * (1 - swing) / 2 : 12);
    const armF = armAt(cx - tw + 4, sh + 6, walking ? 20 * swing + 2 : -6, walking ? 16 + 20 * (1 + swing) / 2 : 14);
    const sleeve = outfit === 'vest' ? skin : outfit === 'armor' ? '#9aa4c4' : outfit === 'lab' ? '#f4f6ff' : top;
    const hand = (W1, far) => kind === 'bot' ? Ci(W1[0], W1[1] + 1, 5.6, 'url(#gm)', '', 3) :
      Ci(W1[0], W1[1] + 1, 5.6, far ? U.shade(skin, -0.12) : 'url(#gs)', '', 3) + Cn(W1[0] - 1.6, W1[1] - 0.6, 1.8, skinR.hi, op(0.5));
    const drawArm = (a, far) => {
      const col = far ? U.shade(sleeve, -0.12) : sleeve;
      const fore = outfit === 'vest' || outfit === 'wetsuit' && false ? skin : col;
      return limb(a.S, a.E, a.W, 5.8, 4.8, 4.2, col, Paint.ramp(col).sh) + (fore !== col ? '' : '') + hand(a.W, far);
    };

    /* ---- behind the body: hair, capes, tails, packs ---- */
    let bh = '';
    if (kind === 'human') {
      if (L.hair === 'long') bh += P('M24 50C22 26 42 14 62 16C86 16 100 32 98 56L100 100C92 106 84 104 80 98L80 62L42 62L42 98C34 104 26 104 22 100Z', 'url(#gh)');
      if (L.hair === 'bob') bh += P('M24 56C20 28 40 14 62 15C86 15 102 30 98 58C98 72 92 80 86 82L38 82C30 80 24 70 24 56Z', 'url(#gh)');
      if (L.hair === 'pony') bh += Gt(P('M0 0C-14 6 -20 26 -12 44C-6 34 -2 20 6 12Z', 'url(#gh)'), tr(30, 44, walking ? Math.sin(ph * Math.PI * 4) * 6 : 0));
    }
    if (has('hood')) bh += Ci(60, 52, 41, '#2a2240');
    back += Gt(bh, headTf);
    const sway = walking ? Math.sin(ph * Math.PI * 2) * 5 : 0;
    if (has('cape')) back += P(`M${cx - tw} ${sh}Q${cx} ${sh - 4} ${cx + tw} ${sh}L${cx + tw + 12 - sway * 0.4} ${ground + 2}Q${cx - 6} ${ground + 10} ${cx - tw - 22 - Math.abs(sway)} ${ground - 2}Z`, 'url(#ga)') + Ln(`M${cx - tw - 16} ${ground - 16}Q${cx} ${ground - 8} ${cx + tw + 8} ${ground - 16}`, Paint.ramp(accC).sh, 3, op(0.5));
    if (kind === 'cat') back += Tube(`M${cx - bw + 4} ${hip - 6}C${cx - bw - 26} ${hip} ${cx - bw - 30 + sway} ${hip - 40} ${cx - bw - 14 + sway} ${hip - 52}`, skin, 9, 3.4) + Cn(cx - bw - 14 + sway, hip - 52, 5, skinR.lt);
    if (L.pack) back += P(`M${cx - tw - 14} ${sh + 4}Q${cx - tw - 18} ${sh + 30} ${cx - tw - 12} ${hip - 4}L${cx - tw + 4} ${hip - 4}L${cx - tw + 6} ${sh + 4}Z`, '#a0764e') + Rect(cx - tw - 16, sh + 16, 14, 10, '#7a5838');
    if (outfit === 'coat' || outfit === 'lab') back += P(`M${cx - bw - 2} ${hip - 10}L${cx - bw - 10 - Math.max(0, -sway)} ${hip + 22}L${cx + bw + 10} ${hip + 22}L${cx + bw + 2} ${hip - 10}Z`, outfit === 'lab' ? '#f4f6ff' : 'url(#gt)');

    /* ---- far leg & far arm (behind the body) ---- */
    const robe = outfit === 'robe';
    s += robe ? shoe(legF.A, legF.foot, U.shade(shoes, -0.1)) : drawLeg(legF, true);
    let bodyS = drawArm(armF, true);

    /* ---- skirts (robe / dress) sway over the legs ---- */
    if (outfit === 'robe' || outfit === 'dress') {
      const hem = outfit === 'robe' ? ground - 2 : hip + 20, fl = outfit === 'robe' ? 20 : 16;
      bodyS += P(`M${cx - tw} ${sh + 20}L${cx - bw - fl - sway * 0.3} ${hem}Q${cx + sway} ${hem + 8} ${cx + bw + fl - sway * 0.3} ${hem - Math.abs(sway) * 0.3}L${cx + tw} ${sh + 20}Z`, 'url(#gt)');
      bodyS += Ln(`M${cx - bw - fl + 6} ${hem - 6}Q${cx + sway} ${hem + 2} ${cx + bw + fl - 6} ${hem - 6}`, topR.lt, 3, op(0.6));
    }
    if (!robe) bodyS = drawLeg(legN, false) + bodyS;
    else s += shoe(legN.A, legN.foot, shoes);

    /* ---- torso & outfit ---- */
    const bodyFill = outfit === 'armor' ? 'url(#gm)' : outfit === 'vest' ? 'url(#gs)' : outfit === 'lab' ? '#f4f6ff' : 'url(#gt)';
    bodyS += P(torsoD, bodyFill);
    if (B.belly) bodyS += P(`M${cx + 4} ${sh + 16}Q${cx + bw + B.belly} ${(sh + hip) / 2 + 4} ${cx + 6} ${hip + 2}Z`, bodyFill) + Ln(`M${cx + 6} ${sh + 18}Q${cx + bw + B.belly - 2} ${(sh + hip) / 2 + 4} ${cx + 8} ${hip}`, 'rgba(255,255,255,.35)', 2);
    let tIn = Pn(`M${cx + 4} ${sh - 4}Q${cx + tw + 10} ${sh + 10} ${cx + bw - 2} ${hip + 6}L${cx + bw + 20} ${hip + 6}L${cx + bw + 20} ${sh - 4}Z`, (outfit === 'armor' ? '#4a5070' : topR.sh), op(0.5)) + Ln(`M${cx - tw + 4} ${sh + 12}Q${cx - tw + 6} ${sh + 4} ${cx - 4} ${sh + 1}`, topR.hi, 2.2, op(0.5));
    // cloth folds: a couple of soft creases that pull toward the moving side
    tIn += Ln(`M${cx - 4} ${sh + 16}q${f(3 + sway * 0.3)} 6 ${f(1 + sway * 0.2)} 12`, topR.sh, 1.6, op(0.45)) + Ln(`M${cx + 8} ${sh + 20}q-2 5 1 10`, topR.sh, 1.4, op(0.35));
    bodyS += `<g clip-path="url(#cth)">${tIn}</g>`;
    switch (outfit) {
      case 'overalls':
        bodyS += P(`M${cx - bw + 3} ${hip}L${cx - tw + 6} ${sh + 20}L${cx + tw - 6} ${sh + 20}L${cx + bw - 3} ${hip}Z`, pants, '', 3) + Ln(`M${cx - tw + 8} ${sh + 22}L${cx - tw + 6} ${sh}M${cx + tw - 8} ${sh + 22}L${cx + tw - 6} ${sh}`, pants, 4) + Rect(cx - 7, sh + 26, 14, 10, pantsR.lt, op(0.6)) + Cn(cx - tw + 8, sh + 22, 2.4, '#ffd23f') + Cn(cx + tw - 8, sh + 22, 2.4, '#ffd23f');
        break;
      case 'armor':
        bodyS += P(`M${cx - tw + 3} ${sh + 4}Q${cx} ${sh - 2} ${cx + tw - 3} ${sh + 4}L${cx + tw - 6} ${sh + 30}Q${cx} ${sh + 38} ${cx - tw + 6} ${sh + 30}Z`, 'url(#gm)', '', 3) + Ln(`M${cx} ${sh + 4}L${cx} ${sh + 32}`, '#6a7090', 2) +
          E(cx - tw - 2, sh + 6, 10, 8, 'url(#gm)', '', 3) + E(cx + tw + 2, sh + 6, 10, 8, 'url(#gm)', '', 3) + Rect(cx - bw + 2, hip - 10, (bw - 2) * 2, 7, '#8a6a3a') + Cn(cx, hip - 6.5, 3.4, '#ffd23f');
        break;
      case 'coat': case 'lab':
        bodyS += Ln(`M${cx - 3} ${sh}L${cx - 6} ${hip + 4}M${cx + 5} ${sh}L${cx + 8} ${hip + 4}`, OL, 2.4) + Pn(`M${cx - 3} ${sh}L${cx + 5} ${sh}L${cx + 8} ${hip + 4}L${cx - 6} ${hip + 4}Z`, outfit === 'lab' ? L.top && L.top !== '#ffffff' ? top : '#8fb8e8' : '#fff8ec') +
          P(`M${cx - 3} ${sh - 1}L${cx - 12} ${sh + 14}L${cx - 4} ${sh + 16}Z`, outfit === 'lab' ? '#e8ecf8' : topR.lt, '', 2) + P(`M${cx + 5} ${sh - 1}L${cx + 14} ${sh + 14}L${cx + 6} ${sh + 16}Z`, outfit === 'lab' ? '#e8ecf8' : topR.lt, '', 2);
        break;
      case 'suit':
        bodyS += P(`M${cx - 10} ${sh - 1}L${cx} ${sh + 16}L${cx + 10} ${sh - 1}Z`, '#ffffff', '', 2.4) + P(`M${cx - 3} ${sh + 4}L${cx + 3} ${sh + 4}L${cx + 4} ${sh + 24}L${cx} ${sh + 30}L${cx - 4} ${sh + 24}Z`, accC, '', 2);
        break;
      case 'sailor':
        bodyS += P(`M${cx - tw} ${sh + 2}L${cx} ${sh + 22}L${cx + tw} ${sh + 2}L${cx + tw - 4} ${sh - 2}L${cx} ${sh + 12}L${cx - tw + 4} ${sh - 2}Z`, '#3a5ab8', '', 2.4) + P(`M${cx - 6} ${sh + 16}L${cx + 6} ${sh + 16}L${cx} ${sh + 28}Z`, accC, '', 2);
        break;
      case 'jacket':
        for (let k = 1; k < 4; k++) bodyS += Ln(`M${cx - tw - 1 + k} ${sh + k * 9}Q${cx} ${sh + k * 9 + 4} ${cx + tw + 1 - k} ${sh + k * 9}`, topR.sh, 2, op(0.7));
        bodyS += Ln(`M${cx + 2} ${sh}L${cx + 3} ${hip + 2}`, topR.deep, 2, op(0.6)) + P(`M${cx - tw} ${sh + 2}Q${cx} ${sh - 8} ${cx + tw} ${sh + 2}Q${cx} ${sh + 6} ${cx - tw} ${sh + 2}Z`, topR.lt, '', 2.4);
        break;
      case 'vest':
        bodyS += P(`M${cx - tw} ${sh + 2}L${cx - 6} ${hip}L${cx - bw} ${hip}Z`, top, '', 2.4) + P(`M${cx + tw} ${sh + 2}L${cx + 8} ${hip}L${cx + bw} ${hip}Z`, top, '', 2.4) + Rect(cx - bw + 1, hip - 9, (bw - 1) * 2, 6, pants);
        break;
      case 'wetsuit':
        bodyS += Ln(`M${cx - tw + 2} ${sh + 16}L${cx + tw - 2} ${sh + 16}`, accC, 4) + Ln(`M${cx} ${sh}L${cx} ${hip}`, topR.deep, 2, op(0.5));
        break;
      case 'robe':
        bodyS += Ln(`M${cx - tw + 2} ${sh + 26}Q${cx} ${sh + 30} ${cx + tw - 2} ${sh + 26}`, accC, 5) + P(`M${cx - 8} ${sh - 1}L${cx} ${sh + 20}L${cx + 8} ${sh - 1}Z`, topR.lt, '', 2);
        break;
      case 'dress':
        bodyS += Ln(`M${cx - tw + 2} ${sh + 24}Q${cx} ${sh + 28} ${cx + tw - 2} ${sh + 24}`, accC, 4) + Cn(cx + 6, sh + 25, 3.2, '#ffffff');
        break;
      default: // tee with belt & star emblem
        bodyS += Pn(`M${cx - bw + 1} ${hip - 8}L${cx + bw - 1} ${hip - 8}L${cx + bw} ${hip - 2}L${cx - bw} ${hip - 2}Z`, U.shade(pants, -0.1)) + P(starD(cx + 8, sh + 13, 5.5, 2.6), '#ffe066', '', 2);
    }
    if (has('scarf')) bodyS += P(`M${cx - tw + 2} ${sh + 2}Q${cx} ${sh + 10} ${cx + tw - 2} ${sh + 2}L${cx + tw} ${sh + 10}Q${cx} ${sh + 18} ${cx - tw} ${sh + 10}Z`, 'url(#ga)', '', 3) + P(`M${cx - 14} ${sh + 8}L${cx - 20 - sway} ${sh + 28}L${cx - 10 - sway * 0.5} ${sh + 26}Z`, 'url(#ga)', '', 3);
    if (kind === 'bot') bodyS += Rect(cx - 8, sh + 12, 16, 12, '#2a3a5a', ' rx="3"') + Cn(cx - 3, sh + 18, 2, '#7ff8ff') + Cn(cx + 3, sh + 18, 2, '#ffe066');
    // neck shadow under the chin
    if (kind !== 'bot') bodyS += En(cx + 4, sh + 1, tw * 0.55, 3.2, skinR.deep, op(0.25));

    /* ---- head group (canonical head at 60,52, facing right) ---- */
    let h = '';
    if (kind === 'bot') {
      h += Ln('M60 20L60 8', OL, 3) + Ci(60, 6, 5, '#ff5d6c', '', 2.4);
      h += `<rect x="28" y="20" width="66" height="60" rx="18" fill="url(#gm)" stroke="${OL}" stroke-width="${f(3.8 * OW)}"/>` + `<rect x="36" y="34" width="54" height="26" rx="12" fill="#1c2350" stroke="${OL}" stroke-width="${f(3 * OW)}"/>`;
      h += pose.blink ? Ln('M62 47L70 47M78 47L86 47', '#7ff8ff', 3) : `<rect x="62" y="40" width="8" height="14" rx="4" fill="#7ff8ff"/><rect x="78" y="40" width="8" height="14" rx="4" fill="#7ff8ff"/>`;
      h += Ln('M66 68Q74 72 82 66', '#5a6a8a', 3) + Ci(28, 50, 6, '#9aa4c4', '', 3);
    } else {
      h += E(33, 58, 5.5, 7.5, 'url(#gs)', '', 3.2) + Ln('M31 55q3 3 1 7', skinR.sh, 1.4, op(0.6));
      if (kind === 'cat') h += P('M30 30L32 4L52 22Z', 'url(#gs)', '', 3.4) + P('M34 24L35 12L46 22Z', '#ffb0c8') + P('M70 20L90 2L92 30Z', 'url(#gs)', '', 3.4) + P('M76 20L88 10L88 24Z', '#ffb0c8');
      h += P(faceD, 'url(#gs)', '', 3.8);
      h += `<g clip-path="url(#chd)"><path d="M0 0H130V130H0Z ${Paint.shiftPath(faceD, -8, -8)}" fill-rule="evenodd" fill="${skinR.sh}" opacity=".4"/><path d="M0 0H130V130H0Z ${Paint.shiftPath(faceD, -3.5, -3.5)}" fill-rule="evenodd" fill="${skinR.deep}" opacity=".16"/>${En(46, 36, 11, 7, skinR.hi, op(0.4))}</g>`;
      if (kind === 'cat') h += En(78, 66, 14, 10, '#fff8f0') + P('M75 60L81 60L78 64Z', '#ff8fa8', '', 1.6) + Ln('M86 64L100 60M86 68L100 70M70 66L58 62M70 70L58 72', OL, 1.6, op(0.7));
      else h += Ln('M89 58q3.5 3.4 0.4 6.4', skinR.deep, 1.8, op(0.55));
      h += En(59, 67, 6.4, 3.4, '#ff8fa8', op(0.45)) + En(85, 66, 4.6, 3, '#ff8fa8', op(0.42));
      const ey = pose.blink ? 'closed' : (L.eyes || 'round');
      if (has('visor')) h += P('M40 46Q64 38 96 44L94 58Q64 52 40 60Z', '#ff3d6e', '', 3) + Ln('M46 50Q66 44 90 48', '#ffc0d0', 2);
      else if (ey === 'closed') h += Ln('M61 56Q66 59.5 71 56', OL, 2.8) + Ln('M78 55Q83 58.5 88 55', OL, 2.6);
      else if (ey === 'happy') h += Ln('M61 56Q66 49 71 56', OL, 3.4) + Ln('M78 55Q83 48 88 55', OL, 3.4);
      else if (ey === 'dot') h += Cn(66, 55, 3, OL) + Cn(83, 54, 2.8, OL) + Cn(65.2, 54, 1, '#fff') + Cn(82.2, 53, 1, '#fff');
      else if (ey === 'sleepy') h += Ln('M61 55Q66 59 71 55', OL, 3.2) + Ln('M78 54Q83 58 88 54', OL, 3.2);
      else {
        const sharp = ey === 'sharp', eyeC = U.mix(L.eyeC || (kind === 'cat' ? '#5fae3a' : '#5a3a8a'), OL, 0.3);
        h += En(66, 55.4, 4.4, sharp ? 4.6 : 6.4, OL) + En(83, 54.4, 4.1, sharp ? 4.4 : 6.1, OL) + En(66.3, 57.6, 3.1, 2.9, eyeC) + En(83.3, 56.6, 2.9, 2.7, eyeC) +
          En(66.3, 59.2, 2.2, 1.2, U.shade(eyeC, 0.35), op(0.7)) + En(83.3, 58.2, 2, 1.1, U.shade(eyeC, 0.35), op(0.7)) +
          Cn(64.8, 52.6, 1.9, '#fff') + Cn(81.8, 51.6, 1.8, '#fff') + Cn(67.6, 58.2, 0.9, '#fff', op(0.85)) + Cn(84.4, 57.2, 0.85, '#fff', op(0.85)) +
          Ln('M60.8 50.6Q66 47.6 71.4 50.4', OL, 2.4) + Ln('M78 49.6Q83 46.8 88.2 49.4', OL, 2.2);
        if (kind === 'cat') h += Rect(65.3, 51, 1.6, 8, '#140a20') + Rect(82.3, 50, 1.5, 7.6, '#140a20');
      }
      if (!has('visor')) {
        const bc = kind === 'cat' ? skinR.deep : U.shade(hair, -0.1);
        if (L.brows === 'angry') h += Ln('M60 44L71 47.5', bc, 3) + Ln('M78 46.5L89 42.5', bc, 3);
        else h += Ln('M61 43Q66 40 71 42', bc, 2.6) + Ln('M79 41Q84 39 88 41', bc, 2.6);
      }
      const mo = L.mouth || 'smile';
      if (mo === 'grin') h += P('M71 69Q77 77 84 68Z', '#7a1f3d', '', 2.4) + Pn('M73 70L82 69L81 71L74 72Z', '#ffffff');
      else if (mo === 'o') h += E(77, 71, 3, 3.6, '#7a1f3d', '', 2.2);
      else if (mo === 'flat') h += Ln('M72 71L82 70', OL, 2.8);
      else if (kind !== 'cat') h += Ln('M72 70Q77 74 82 69', OL, 2.8);
      else h += Ln('M72 72Q75 75 78 72Q81 75 84 72', OL, 2.2);
      if (L.mustache) h += P('M66 66Q72 60 77 65Q82 60 88 66Q82 70 77 67Q72 70 66 66Z', U.shade(hair, -0.05), '', 2.2);
      if (L.beard) h += P('M40 64Q44 88 66 92Q86 92 92 70Q88 80 78 80Q66 82 58 74Q48 76 40 64Z', 'url(#gh)', '', 3.2);
    }
    // front hair, with a couple of painted strands and a sheen band
    const HF = {
      short: 'M27 54C24 30 42 16 62 17C84 17 96 32 94 52C88 44 82 40 76 42C72 34 64 32 58 38C52 32 42 34 38 42C34 44 30 48 27 54Z',
      spiky: 'M26 52L22 34L34 38L32 22L46 30L50 13L60 26L70 11L74 28L88 20L86 36L98 36L92 50C86 42 78 40 72 42C66 34 56 34 50 40C44 36 36 40 34 46Z',
      long: 'M26 58C22 32 40 16 62 17C84 17 98 32 95 52C88 42 80 38 72 40C66 32 54 32 48 40C40 38 32 44 30 60Z',
      bob: 'M26 56C22 32 40 16 62 17C84 17 98 32 95 50C86 44 70 40 60 34C52 42 40 46 30 56Z',
      pony: 'M27 54C24 30 42 16 62 17C84 17 96 32 94 50C84 42 70 40 62 34C54 40 40 42 32 52Z',
      bun: 'M27 54C24 30 42 16 62 17C84 17 96 32 94 50C84 42 70 40 62 34C54 40 40 42 32 52Z',
      bald: 'M30 44C34 34 40 30 44 30C40 36 36 40 34 50Z',
      curly: '',
    };
    if (kind === 'human') {
      if (L.hair === 'bun') h += Ci(56, 16, 11, 'url(#gh)', '', 3.4);
      if (L.hair === 'curly') h += P(fluffy(60, 34, 34, 18, 9, 3.4), 'url(#gh)');
      else if (HF[L.hair || 'short']) h += P(HF[L.hair || 'short'], 'url(#gh)');
      if (L.hair !== 'bald') {
        h += Ln('M36 36Q44 24 58 21', hairR.hi, 3, op(0.55)) + Ln('M62 21Q70 21 76 25', hairR.hi, 2, op(0.4));
        h += Ln('M44 30Q48 36 46 42', hairR.deep, 1.6, op(0.45)) + Ln('M66 26Q70 32 68 38', hairR.deep, 1.4, op(0.4)) + Ln('M80 30Q84 36 82 42', hairR.deep, 1.4, op(0.35));
      }
    }
    // headwear
    if (has('goggles')) h += Ln('M28 38Q60 28 94 36', '#3a3050', 5) + Ci(58, 32, 8.5, '#8fe3ff', '', 3.4) + Ci(78, 30, 8.5, '#8fe3ff', '', 3.4) + Cn(55, 29, 2.6, '#fff', op(0.8)) + Cn(75, 27, 2.6, '#fff', op(0.8));
    if (has('cap')) h += P('M28 40C28 18 48 11 62 11C80 11 94 21 94 40Z', 'url(#ga)') + P('M86 37Q106 37 114 44Q100 49 86 44Z', U.shade(accC, -0.12), '', 3.4) + P(starD(60, 26, 6, 2.8), '#fff', '', 1.6);
    if (has('captain')) h += P('M26 36C24 18 44 8 62 8C82 8 98 18 96 36Z', '#ffffff') + Rect(26, 30, 70, 8, '#1c2350', ` stroke="${OL}" stroke-width="${f(3 * OW)}"`) + P('M84 36Q104 38 110 44Q98 48 84 42Z', '#1c2350', '', 3) + P(starD(60, 21, 6, 2.6), '#ffd23f', '', 1.6);
    if (has('hat')) h += E(60, 30, 48, 9, U.shade(L.accC || '#8a6a3a', -0.08), '', 3.6) + P('M36 30C36 10 48 4 60 4C72 4 84 10 84 30Z', 'url(#ga)') + Ln('M37 24L83 24', '#ffd23f', 4);
    if (has('fez')) h += P('M44 22L48 2L74 2L78 22Z', '#e0403a') + Ln('M70 4Q84 8 82 22', '#1c1640', 2.4) + Cn(82, 23, 3, '#ffd23f');
    if (has('bandana')) h += P('M27 40Q60 28 95 38L95 46Q60 36 27 48Z', 'url(#ga)', '', 3) + P('M28 44L16 52L20 40Z', 'url(#ga)', '', 3);
    if (has('headset')) h += Ln('M30 46Q32 14 62 14Q92 14 94 46', '#3a3050', 5) + E(31, 54, 7, 10, '#5a5a7a', '', 3) + Ln('M31 62Q34 76 50 78', '#3a3050', 3) + Ci(51, 78, 3, '#ff5d6c', '', 2);
    if (has('crown')) h += P('M44 22L42 6L52 14L60 2L68 14L78 6L76 22Z', '#ffd23f', '', 3.2);
    if (has('tiara')) h += P('M40 26Q60 16 82 24L80 30Q60 22 42 32Z', '#dff4ff', '', 2.4) + P(sparkD(62, 18, 6), '#8fe8ff', '', 1.6);
    if (has('flower')) h += [0, 72, 144, 216, 288].map(a => Ci(38 + Math.cos(rad(a)) * 6, 30 + Math.sin(rad(a)) * 6, 4.4, '#ff8fc2', '', 2.2)).join('') + Ci(38, 30, 3.4, '#ffe066', '', 2);
    if (has('glasses')) h += Ci(66, 55, 8, 'none', '', 3) + Ci(84, 54, 7.5, 'none', '', 3) + Ln('M74 55L77 55', OL, 3) + En(64, 52, 3, 1.6, '#fff', op(0.6));
    if (has('helmet')) h += Ci(60, 52, 41, '#cdefff', ' fill-opacity=".22"', 3.6) + Ln('M36 30Q48 18 64 16', '#ffffff', 4, op(0.8));
    if (has('knighthelm')) h += P('M26 52C24 22 42 10 62 10C84 10 98 24 96 52L90 52L88 40L36 40L34 52Z', 'url(#gm)') + Rect(58, 4, 6, 10, accC, ` stroke="${OL}" stroke-width="${f(2.4 * OW)}"`);
    if (has('hood')) h += P('M22 58C18 30 38 8 62 9C88 10 104 30 100 58C94 40 80 28 62 28C44 28 30 40 22 58Z', '#2a2240', '', 3.6) + P(starD(62, 18, 5, 2.4), '#ff5d8f', '', 1.6);

    /* ---- near arm & held item (the item rides the hand and leans a little with the forearm) ---- */
    const hx = armN.W[0], hy = armN.W[1] - 1, foot = ground + 6;
    let item = '';
    switch (L.hold) {
      case 'staff': item = Tube(D`M${hx} ${hy - 44}L${hx} ${foot - 2}`, '#8a5a3a', 5, 3) + Ci(hx, hy - 50, 9, 'url(#ga)', '', 3) + Cn(hx - 3, hy - 53, 3, '#ffffff', op(0.8)); break;
      case 'rod': item = Tube(D`M${hx} ${hy}L${hx + 36} ${hy - 60}`, '#6a4a30', 3.4, 2.6) + Ln(D`M${hx + 36} ${hy - 60}Q${hx + 44} ${hy - 20} ${hx + 40} ${hy + 20}`, '#ffffff', 1.4) + Ci(hx + 40, hy + 22, 3.4, '#ff5d6c', '', 1.6); break;
      case 'net': item = Tube(D`M${hx} ${hy}L${hx + 26} ${hy - 50}`, '#c8955e', 3.4, 2.6) + E(hx + 32, hy - 62, 13, 10, '#ffffff', ' fill-opacity=".35"', 2.6) + Ln(D`M${hx + 22} ${hy - 64}L${hx + 42} ${hy - 60}M${hx + 30} ${hy - 72}L${hx + 34} ${hy - 52}`, OL, 1.2, op(0.5)); break;
      case 'book': item = P(D`M${hx - 8} ${hy - 4}L${hx + 12} ${hy - 8}L${hx + 14} ${hy + 14}L${hx - 6} ${hy + 18}Z`, accC, '', 2.6) + Ln(D`M${hx - 4} ${hy - 2}L${hx + 10} ${hy - 5}`, '#ffffff', 1.4, op(0.8)); break;
      case 'lantern': item = Ln(D`M${hx} ${hy + 2}L${hx} ${hy + 10}`, OL, 2) + P(D`M${hx - 7} ${hy + 10}L${hx + 7} ${hy + 10}L${hx + 6} ${hy + 26}L${hx - 6} ${hy + 26}Z`, '#ffe680', '', 2.6) + Cn(hx, hy + 18, 16, '#fff49a', op(0.3)); break;
      case 'sword': item = Tube(D`M${hx} ${hy + 4}L${hx + 6} ${hy - 50}`, '#dfe6f8', 5, 3) + Ln(D`M${hx - 8} ${hy - 2}L${hx + 10} ${hy + 2}`, '#8a6a3a', 5) + Cn(hx - 1, hy + 8, 3, '#ffd23f'); break;
      case 'torch': item = Tube(D`M${hx} ${hy + 8}L${hx + 4} ${hy - 22}`, '#8a5a3a', 5, 3) + P(D`M${hx + 4} ${hy - 22}C${hx - 8} ${hy - 30} ${hx + 2} ${hy - 44} ${hx + 6} ${hy - 50}C${hx + 10} ${hy - 40} ${hx + 16} ${hy - 32} ${hx + 4} ${hy - 22}Z`, '#ff8a2e', '', 2.4) + Pn(D`M${hx + 4} ${hy - 24}C${hx} ${hy - 30} ${hx + 4} ${hy - 36} ${hx + 6} ${hy - 40}C${hx + 8} ${hy - 34} ${hx + 10} ${hy - 30} ${hx + 4} ${hy - 24}Z`, '#fff3a0'); break;
      case 'wrench': item = Tube(D`M${hx} ${hy + 6}L${hx + 18} ${hy - 22}`, '#b8c0d8', 5, 3) + Ci(hx + 20, hy - 26, 6, '#b8c0d8', '', 3); break;
      case 'cane': item = Tube(D`M${hx + 2} ${hy}L${hx + 4} ${foot - 2}`, '#6a4a30', 4, 3) + Ln(D`M${hx + 2} ${hy}Q${hx - 6} ${hy - 8} ${hx - 10} ${hy}`, '#6a4a30', 4); break;
      case 'flask': item = P(D`M${hx - 3} ${hy - 12}L${hx + 3} ${hy - 12}L${hx + 3} ${hy - 4}L${hx + 9} ${hy + 8}Q${hx} ${hy + 14} ${hx - 9} ${hy + 8}L${hx - 3} ${hy - 4}Z`, '#8fffc0', '', 2.4); break;
    }
    const tilt = walking ? U.clamp((armN.fa - 22) * 0.35, -14, 14) : 0;
    const itemG = item ? Gt(item, tilt ? `rotate(${f(tilt)} ${f(hx)} ${f(hy)})` : '') : '';
    const front = drawArm(armN, false);
    // long items (staff, cane) stand behind the hand; hand-held ones sit in it
    const armItem = ['staff', 'cane', 'rod', 'net', 'sword', 'torch', 'wrench'].includes(L.hold) ? itemG + front : front + itemG;
    s += Gt(bodyS + Gt(h, headTf) + armItem, bodyTf);
    return svg(120, 170, defs, Gt(back, bodyTf) + s, '');
  }

  function pip(mood) {
    return Painter.icon('pip:' + (mood || ''), () => {
      const defs = rg('pb', '#f4f8ff', 0.06, -0.18) + lg('pv', ['#1c2350', '#2c3a80']);
      const eyes = mood === 'wow' ? Ci(32, 38, 5, '#7ff8ff', '', 0.01) + Ci(48, 38, 5, '#7ff8ff', '', 0.01)
        : Ln('M27 40Q32 33 37 40', '#7ff8ff', 3.6) + Ln('M43 40Q48 33 53 40', '#7ff8ff', 3.6);
      const body = `<g class="th">` + P('M34 64Q40 80 46 64Z', '#ffb13b', '', 2.4) + Pn('M37 64Q40 73 43 64Z', '#fff3a0') + `</g>` +
        P('M12 36L4 28L6 46Z', '#58b7ff', '', 3) + P('M68 36L76 28L74 46Z', '#58b7ff', '', 3) +
        Ci(40, 38, 27, 'url(#pb)', '', 3.8) + `<rect x="21" y="27" width="38" height="22" rx="10" fill="url(#pv)" stroke="${OL}" stroke-width="3"/>` + eyes +
        Ln('M40 11L40 3', OL, 3) + `<circle class="bl" cx="40" cy="3" r="4.5" fill="#ffe066" stroke="${OL}" stroke-width="2.4"/>` + P(starD(40, 57, 4.5, 2), '#58b7ff', '', 1.6);
      return svg(80, 84, defs, body, '');
    }, 80, 84, { scale: 2.4, bs: 0.5 });
  }

  /* ======================= ITEMS / ORBS ======================= */
  const ORB_COL = { orb: ['#8fd8ff', '#3a8fe8', '#ffd23f'], nova: ['#ffc38a', '#ff6a8a', '#ffffff'], galaxy: ['#b88cff', '#3a1f7a', '#ff8fe0'] };
  /** part: undefined = the whole orb; 'core' = the sphere without its ring; 'belt' = the ring alone (the capture
   *  sequence throws the ring around the Orbling and snaps it back) */
  function orbSvg(type, part) {
    const [c1, c2, c3] = ORB_COL[type] || ORB_COL.orb;
    const belt = `<ellipse cx="30" cy="31" rx="24" ry="6.5" fill="none" stroke="${OL}" stroke-width="6"/><ellipse cx="30" cy="31" rx="24" ry="6.5" fill="none" stroke="${type === 'nova' ? '#fff3b0' : '#ffd23f'}" stroke-width="3"/>`;
    if (part === 'belt') return svg(60, 60, '', belt);
    const defs = `<radialGradient id="og" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
    let body = Ci(30, 30, 24, 'url(#og)', '', 3.4);
    if (type === 'galaxy') body += Ln('M14 34C22 22 40 22 46 30C40 40 24 40 20 32', '#ff8fe0', 2.4, ' opacity=".8"') + Cn(20, 22, 1.4, '#fff') + Cn(42, 40, 1.2, '#fff') + Cn(36, 18, 1.1, '#fff');
    body += P(starD(30, 30, 10, 4.4), c3, '', 2.4) + (part === 'core' ? '' : belt) + En(21, 19, 7, 4, '#fff', ' opacity=".7" transform="rotate(-30 21 19)"');
    return svg(60, 60, defs, body);
  }
  /** the painted sphere or ring of an orb, for the capture sequence */
  function orbPart(type, part) {
    return Painter.icon('it:' + type + ':' + part, () => { OW = 0.6; try { return orbSvg(ORB_COL[type] ? type : 'orb', part); } finally { OW = 1; } }, 60, 60, { scale: 2.2 });
  }
  const ITEM_SVG = {
    potion: () => rg('g', '#ff6f9a', 0.2) + '|' + P('M24 8L36 8L36 20C46 24 50 32 50 40C50 50 41 56 30 56C19 56 10 50 10 40C10 32 14 24 24 20Z', 'url(#g)') + P('M22 4L38 4L38 12L22 12Z', '#c9955e', '', 3) + En(22, 36, 5, 8, '#fff', ' opacity=".5"') + Pn('M30 48C22 42 22 34 30 38C38 34 38 42 30 48Z', '#fff'),
    superpotion: () => rg('g', '#b06aff', 0.2) + '|' + P('M22 4L38 4L38 16C46 20 50 30 50 40C50 50 41 57 30 57C19 57 10 50 10 40C10 30 14 20 22 16Z', 'url(#g)') + P('M20 2L40 2L40 10L20 10Z', '#ffd23f', '', 3) + P(starD(30, 40, 10, 4.6), '#fff', '', 2) + En(20, 34, 4, 8, '#fff', ' opacity=".45"'),
    ether: () => rg('g', '#4fb8ff', 0.2) + '|' + P('M16 10L44 10L46 54L14 54Z', 'url(#g)') + P('M14 6L46 6L46 14L14 14Z', '#c9d6ea', '', 3) + P('M32 18L22 34L30 34L26 48L38 30L30 30Z', '#ffe066', '', 2.4),
    revive: () => rg('g', '#ffe066', 0.2) + '|' + Cn(30, 30, 26, '#fff6b0', ' opacity=".4"') + P('M30 6C44 14 52 30 44 52C38 44 34 40 30 38C26 40 22 44 16 52C8 30 16 14 30 6Z', 'url(#g)') + Ln('M30 12L30 44', '#e0a21a', 2.4),
    candy: () => rg('g', '#ff8fd0', 0.2) + '|' + P('M8 30L2 20L4 40Z', '#ffe066', '', 3) + P('M52 30L58 20L56 40Z', '#ffe066', '', 3) + P(starD(30, 31, 20, 10), 'url(#g)') + Cn(26, 26, 3, '#fff', ' opacity=".6"'),
    coin: () => rg('g', '#ffd23f', 0.22, -0.1) + '|' + Ci(30, 30, 24, 'url(#g)') + Ci(30, 30, 17, 'none', ' opacity=".5"', 2.4) + P(starD(30, 31, 10, 4.6), '#fff3a0', '', 2.2),
    gem: () => lg('g', ['#9ff0ff', '#4fb8ff', '#6a4ae8']) + '|' + P('M14 22L22 10L38 10L46 22L30 52Z', 'url(#g)') + Ln('M14 22L46 22M22 10L26 22L30 52M38 10L34 22L30 52', '#fff', 1.8, ' opacity=".6"'),
    ticket: () => rg('g', '#ffb13b', 0.2) + '|' + P('M6 18L54 18L54 26C50 26 48 28 48 30C48 32 50 34 54 34L54 42L6 42L6 34C10 34 12 32 12 30C12 28 10 26 6 26Z', 'url(#g)') + P(starD(30, 30, 7, 3.2), '#fff', '', 2),
    xp: () => lg('g', ['#b8ff8a', '#4cd964']) + '|' + P(starD(30, 30, 24, 11), 'url(#g)') + `<text x="30" y="36" text-anchor="middle" font-size="15" font-weight="900" font-family="Arial" fill="#1c5a2a">XP</text>`,
    // berries (3.0, grown in the Base's Garden): three red berries on a leafy sprig
    berry: () => rg('g', '#ff5a64', 0.25, -0.1) + '|' + P('M30 10C38 6 48 8 52 16C44 18 36 16 30 10Z', '#4ea040', '', 2.4) + P('M30 10C24 4 14 4 10 12C18 16 26 14 30 10Z', '#3a8a30', '', 2.4) +
      [[20, 34, 12], [40, 32, 12], [30, 46, 12]].map(([x, y, r]) => Ci(x, y, r, 'url(#g)', '', 3) + Cn(x - 4, y - 4, 3, '#ffffff', ' opacity=".7"')).join('') + Ln('M30 12L22 24M30 12L38 22M30 12L30 36', '#3a8a30', 2),
    // stardust (2.9): a little heap of violet star-sand with sparkles over it
    dust: () => rg('g', '#d6b8ff', 0.25, -0.1) + '|' + P('M5 50C9 36 19 28 30 28C41 28 51 36 55 50Z', 'url(#g)') +
      [[20, 42, 3], [33, 38, 2.5], [41, 45, 2.2], [27, 47, 2]].map(([x, y, r]) => Cn(x, y, r, '#fff', ' opacity=".85"')).join('') +
      P(starD(18, 16, 9, 3, 4, -90), '#fff6b0', '', 2) + P(starD(40, 12, 6, 2.2, 4, -90), '#ffffff', '', 1.8) + P(starD(47, 26, 4.5, 1.8, 4, -90), '#fff6b0', '', 1.6),
    shard: () => rg('g', '#fff3a0', 0.25, -0.1) + '|' + Cn(30, 30, 26, '#fff6c0', ' opacity=".35"') + P(starD(30, 31, 22, 9, 4, -90), 'url(#g)') + P(starD(30, 31, 9, 4, 4, -45), '#ffffff', '', 1.6) + En(24, 22, 3, 2, '#fff', ' opacity=".9"'),
    egg_fire: () => eggSvg('#ff8a5c', '#ffd23f', 'fire'),
    egg_water: () => eggSvg('#6cc2ff', '#ffffff', 'water'),
    egg_earth: () => eggSvg('#8fd46b', '#c9955e', 'earth'),
    egg_air: () => eggSvg('#c3a8ff', '#fff6a0', 'air'),
    egg_star: () => eggSvg('#7a4ae8', '#ffe066', 'star'),
  };
  const EGG_D = 'M30 5C43 5 51 24 51 38C51 50 42 57 30 57C18 57 9 50 9 38C9 24 17 5 30 5Z';
  function eggSvg(c1, c2, kind) {
    let deco;
    if (kind === 'star') deco = [[22, 26, 6], [38, 38, 5], [26, 46, 4], [40, 20, 3.5]].map(([x, y, r]) => P(starD(x, y, r, r * 0.45), c2, '', 1.4)).join('') + Cn(33, 30, 1.6, '#fff') + Cn(18, 38, 1.4, '#fff');
    else if (kind === 'fire') deco = P('M9 36L18 30L24 38L31 28L38 38L44 31L51 37L51 42L9 42Z', c2, '', 2);
    else if (kind === 'water') deco = Ln('M11 30Q18 25 25 30T39 30T51 29', c2, 3.2) + Ln('M10 41Q17 36 24 41T38 41T51 40', c2, 3.2);
    else if (kind === 'earth') deco = [[21, 23, 5], [37, 31, 6], [24, 44, 6], [40, 47, 3.5]].map(([x, y, r]) => En(x, y, r, r * 0.8, c2)).join('');
    else deco = Ln('M13 27Q24 21 30 28Q36 35 47 28', c2, 3.2) + Ln('M12 41Q23 35 30 42Q37 48 48 41', c2, 3.2);
    const defs = `<radialGradient id="eg" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${c1}"/><stop offset="1" stop-color="${U.shade(c1, -0.2)}"/></radialGradient><clipPath id="ec"><path d="${EGG_D}"/></clipPath>`;
    return defs + '|' + Pn(EGG_D, 'url(#eg)') + `<g clip-path="url(#ec)">${deco}</g>` + `<path d="${EGG_D}" fill="none" stroke="${OL}" stroke-width="3.4"/>` + En(22, 18, 5, 7.5, '#fff', ' opacity=".55" transform="rotate(-20 22 18)"');
  }
  function itemSvg(id) {
    if (ORB_COL[id]) return orbSvg(id);
    const [defs, body] = (ITEM_SVG[id] || ITEM_SVG.coin)().split('|');
    return svg(60, 60, defs, body);
  }
  /** item art is painted like everything else (fine brush, thin inner lines, ink silhouette) */
  function item(id) {
    return Painter.icon('it:' + id, () => { OW = 0.6; try { return itemSvg(id); } finally { OW = 1; } }, 60, 60, { scale: 2.2 });
  }

  /* ======================= GALAXY MAP ======================= */
  function space(seed) {
    return U.svgUrl('space:' + seed, () => {
      const R = U.rng(seed), C = Scenery.newCtx(R);
      let body = `<rect width="1280" height="720" fill="${C.lin([[0, '#06051a'], [0.5, '#120d38'], [1, '#261048']])}"/>`;
      // painted nebulae: layered soft dabs of colour
      for (const [c, x, y, r] of [['#6a3aff', 260, 200, 420], ['#ff4fa8', 1000, 520, 360], ['#2fb8ff', 720, 150, 320], ['#8a2fff', 300, 610, 300], ['#ff8a5a', 1120, 180, 220]]) {
        for (let i = 0; i < 7; i++) body += En(x + (R() - 0.5) * r * 0.9, y + (R() - 0.5) * r * 0.5, r * (0.35 + R() * 0.4), r * (0.18 + R() * 0.22), C.soft(c, 0.22 + R() * 0.16, 0.25), ` transform="rotate(${f(-20 + R() * 40)} ${f(x)} ${f(y)})"`);
      }
      // a faint galactic band
      for (let i = 0; i < 40; i++) { const t = R(), x = t * 1400 - 60, y = 640 - t * 520 + (R() - 0.5) * 90; body += En(x, y, 60 + R() * 90, 20 + R() * 30, C.soft(pick(R, ['#c8b8ff', '#ffd8f0', '#b8e8ff']), 0.12, 0.3), ` transform="rotate(-20 ${f(x)} ${f(y)})"`); }
      for (let i = 0; i < 320; i++) { const x = R() * 1280, y = R() * 720, r = 0.5 + R() * 1.4; body += Cn(x, y, r, pick(R, ['#ffffff', '#fff4d8', '#d8e8ff']), op(0.3 + R() * 0.7)); }
      for (let i = 0; i < 14; i++) { const x = R() * 1280, y = R() * 720, r = 4 + R() * 5; body += Cn(x, y, r * 2, C.soft('#ffffff', 0.35, 0.2)) + Pn(sparkD(x, y, r), '#fffbe6', op(0.9)); }
      // distant planets for scale & wonder
      const planet = (x, y, r, c1, c2, ring) => {
        const P = Paint.ramp(c1);
        let s = Cn(x, y, r * 1.5, C.soft(c1, 0.25, 0.4)) + Cn(x, y, r, C.rad([[0, P.hi], [0.35, c1], [0.8, c2], [1, P.deep]], { cx: '35%', cy: '30%', r: '85%' }));
        s += Pn(`M${f(x - r)} ${f(y - r * 0.2)}Q${f(x)} ${f(y - r * 0.05)} ${f(x + r)} ${f(y - r * 0.3)}`, 'none', ` stroke="${P.lt}" stroke-width="${f(r * 0.12)}"` + op(0.35)) + Pn(`M${f(x - r * 0.95)} ${f(y + r * 0.3)}Q${f(x)} ${f(y + r * 0.45)} ${f(x + r * 0.95)} ${f(y + r * 0.2)}`, 'none', ` stroke="${P.sh}" stroke-width="${f(r * 0.1)}"` + op(0.4));
        if (ring) s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.9)}" ry="${f(r * 0.45)}" fill="none" stroke="${ring}" stroke-width="${f(r * 0.16)}" opacity=".55" transform="rotate(-14 ${f(x)} ${f(y)})"/>` + s + `<path d="M${f(x - r * 1.84)} ${f(y + r * 0.35)}A${f(r * 1.9)} ${f(r * 0.45)} -14 0 0 ${f(x + r * 1.84)} ${f(y - r * 0.55)}" fill="none" stroke="${ring}" stroke-width="${f(r * 0.16)}" opacity=".85" transform="rotate(0)"/>`;
        return s;
      };
      const pl = seed === 7 ? [[125, 330, 34], [1215, 400, 22], [930, 44, 10]] : [[1205, 356, 30], [58, 684, 22], [330, 150, 10]];
      body += planet(pl[0][0], pl[0][1], pl[0][2], '#ffb86a', '#c85a8a', '#ffe0b0') + planet(pl[1][0], pl[1][1], pl[1][2], '#8fe8ff', '#4a6ae0') + planet(pl[2][0], pl[2][1], pl[2][2], '#d8c8ff', '#7a5ae0');
      return svg(1280, 720, C.defs, body);
    });
  }
  /* painted floating isles for the galaxy map / title: eroded rock bowl with strata and roots,
   * a grassy (or sandy, ashen, snowy...) cap with an overhanging lip, and a little diorama per biome */
  const ISLE_TOP = {
    meadow: ['#a8e070', '#6cbf4e', '#4a9a3a'], beach: ['#fff0c0', '#ecd092', '#c8a060'], volcano: ['#8a6a74', '#5d4a56', '#3e3040'], snow: ['#ffffff', '#dce8f8', '#aac0e0'],
    plains: ['#dccf80', '#b0a458', '#80783a'], twilight: ['#7a68c8', '#4a3a8a', '#2e2460'], arena: ['#c8b8ff', '#8a74d8', '#5a48a8'],
  };
  function isle(biome, plain) {
    return U.svgUrl('isle:' + biome + (plain ? ':p' : ''), () => {
      const R = U.rng(U.hash('isle' + biome)), C = Scenery.newCtx(R);
      const [t1, t2, t3] = ISLE_TOP[biome];
      const cx = 130, cy = 100, rx = 106, ry = 28;
      // underside
      const pts = [[cx - rx - 2, cy]];
      for (let i = 1; i < 10; i++) { const t = i / 10, dd = Math.sin(t * Math.PI); pts.push([cx - rx + t * rx * 2 + (R() - 0.5) * 10, cy + dd * (62 + R() * 26) + (Math.abs(t - 0.5) < 0.12 ? 26 : 0)]); }
      pts.push([cx + rx + 2, cy]);
      const ud = Scenery.smooth(pts) + 'Z', cid = C.id('ic');
      C.defs += `<clipPath id="${cid}"><path d="${ud}"/></clipPath>`;
      const rock = biome === 'snow' ? ['#a8b0c8', '#6a6a90', '#3a3a60'] : biome === 'twilight' || biome === 'arena' ? ['#8a78b0', '#5a4a80', '#2e2450'] : biome === 'volcano' ? ['#7a5a60', '#4a3440', '#261820'] : ['#b88a62', '#80583c', '#4a3024'];
      let under = Pn(ud, C.lin([[0, rock[0]], [0.45, rock[1]], [1, rock[2]]]));
      let inner = '';
      for (let k = 1; k < 6; k++) inner += Ln(`M${f(cx - rx)} ${f(cy + k * 15)}Q${f(cx)} ${f(cy + k * 15 + (R() - 0.5) * 12)} ${f(cx + rx)} ${f(cy + k * 14)}`, k % 2 ? U.shade(rock[0], 0.08) : rock[2], 2 + R() * 3, op(0.45));
      for (let k = 0; k < 6; k++) { const x = cx - rx * 0.7 + R() * rx * 1.4; inner += Ln(`M${f(x)} ${f(cy + 8)}l${f((R() - 0.5) * 8)} ${f(30 + R() * 50)}`, rock[2], 1.6 + R() * 1.6, op(0.4)); }
      inner += Pn(poly([[cx + 10, cy - 4], [cx + rx + 20, cy - 4], [cx + rx + 20, cy + 140], [cx - 30, cy + 140]]), rock[2], op(0.45));
      inner += Pn(poly([[cx - rx - 10, cy - 4], [cx - 40, cy - 4], [cx - 70, cy + 140], [cx - rx - 10, cy + 140]]), '#fff0d8', op(0.12));
      under += `<g clip-path="url(#${cid})">${inner}</g>`;
      for (let i = 0; i < 6; i++) { const x = cx - rx * 0.75 + R() * rx * 1.5, y = cy + 14 + R() * 20; under += Ln(`M${f(x)} ${f(y)}q${f((R() - 0.5) * 12)} ${f(20 + R() * 20)} ${f((R() - 0.5) * 8)} ${f(34 + R() * 34)}`, biome === 'twilight' ? '#8ffcff' : '#5a3a28', 1.4 + R(), op(biome === 'twilight' ? 0.6 : 0.75)); }
      if (biome === 'twilight' || biome === 'arena' || biome === 'snow') under += Scenery.shards(C, cx + 30, cy + 70, 34, biome === 'snow' ? { hi: '#ffffff', mid: '#bfe8ff', sh: '#6aa8e0', glow: '#bfe8ff', line: '#3a78b8' } : { hi: '#ffffff', mid: '#c8a8ff', sh: '#7a5ae0', glow: '#e0c8ff', line: '#4a3aa0' }, { n: 3 }).replace(/rotate\(([-\d.]+)\)/g, (m, a) => `rotate(${f(180 + +a)})`);
      // cap with an overhanging lip
      const capPts = [];
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; capPts.push([cx + Math.cos(a) * rx * (0.97 + R() * 0.06), cy + Math.sin(a) * ry * (0.94 + R() * 0.1)]); }
      let cap = Pn(Scenery.smoothClosed(capPts.map(([x, y]) => [x, y + 7])), t3) + Pn(Scenery.smoothClosed(capPts), C.lin([[0, t1], [0.7, t2], [1, t3]]));
      cap += Pn(`M${f(cx - rx + 8)} ${f(cy - 4)}Q${f(cx - rx * 0.4)} ${f(cy - ry * 0.95)} ${f(cx + rx * 0.2)} ${f(cy - ry * 0.9)}`, 'none', ` stroke="${U.shade(t1, 0.12)}" stroke-width="3" stroke-linecap="round"` + op(0.6));
      if (biome !== 'snow' && biome !== 'arena') for (let i = 0; i < 12; i++) { const a = Math.PI * (0.08 + R() * 0.84), x = cx + Math.cos(a) * rx * 0.98, y = cy + Math.sin(a) * ry + 4; cap += Pn(`M${f(x - 4)} ${f(y)}Q${f(x)} ${f(y + 7 + R() * 7)} ${f(x + 4)} ${f(y)}Z`, t3); }
      for (let i = 0; i < 16; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * 0.85; cap += En(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 5 + R() * 8, 2 + R() * 3, C.soft(R() < 0.5 ? U.shade(t1, 0.08) : t3, 0.6, 0.4)); }
      // biome diorama
      let deco = '', glow = '';
      const leaf = { hi: '#eaffa0', lit: '#a8dc62', mid: '#6cb448', sh: '#3a7a3a' };
      if (!plain) switch (biome) {
        case 'meadow':
          deco = Scenery.broadleaf(C, 82, 96, 52, leaf, { dabs: 4 }) + Scenery.broadleaf(C, 100, 104, 40, { hi: '#fff3a0', lit: '#c2de5c', mid: '#8abf46', sh: '#4a8638' }, { dabs: 3 }) + Scenery.broadleaf(C, 176, 98, 44, leaf, { dabs: 3 });
          deco += Rect(130, 82, 26, 16, '#fff4e0') + Rect(143, 82, 13, 16, '#c8b8b8', op(0.5)) + Pn('M126 84L136 70L152 70L160 84Z', '#d8604a') + Rect(138, 88, 6, 10, '#7a4a3a');
          for (let i = 0; i < 10; i++) deco += Cn(96 + R() * 90, 104 + R() * 14, 1.8, pick(R, ['#ff8fb8', '#ffffff', '#ffd23f']));
          break;
        case 'beach':
          deco = En(96, 106, 34, 9, C.lin([[0, '#3fb8e0'], [1, '#8fe8f0']])) + En(96, 106, 34, 9, 'none', ' stroke="#ffffff" stroke-width="2"' + op(0.7)) + Scenery.palm(C, 160, 104, 70, { lit: '#c6ec84', mid: '#4fa84a', sh: '#2f7a3c', trunk: '#c09060', trunkSh: '#8a6038' }, { lean: 0.15, fk: 0.9 });
          deco += Pn('M186 104L178 98Q186 92 194 98Z', '#ffb3c7');
          break;
        case 'volcano': {
          deco = Pn('M72 104Q92 96 108 50Q130 40 152 50Q168 96 190 104Z', C.lin([[0, '#6a3446'], [1, '#3a2230']])) + Pn('M130 44Q152 48 152 50Q168 96 190 104L140 104Z', '#12081a', op(0.4));
          deco += En(130, 48, 22, 5, '#ffcf6a') + Ln('M122 52C118 66 126 78 120 96', '#ff7a2e', 4) + Ln('M122 52C118 66 126 78 120 96', '#fff0a0', 1.4) + Ln('M140 52C146 64 140 80 148 98', '#ff7a2e', 3) + Ln('M140 52C146 64 140 80 148 98', '#fff0a0', 1.2);
          glow = Cn(130, 46, 40, C.soft('#ff8a3a', 0.55, 0.2));
          deco += Scenery.cumulus(C, 138, 26, 60, { lit: '#b08a90', mid: '#7a5a6a', sh: '#40283e', rim: '#ffc090' }, { lx: 0, brush: 2 });
          break;
        }
        case 'snow':
          deco = Pn('M86 100L118 44L150 100Z', '#9aaed0') + Pn('M118 44L150 100L124 100Z', '#5a6a9e', op(0.6)) + Pn('M118 44L106 66L114 62L120 68L128 62L132 66Z', '#ffffff');
          for (const [x, h] of [[74, 44], [160, 52], [182, 40], [96, 34]]) deco += Scenery.pine(C, x, 104, h, { lit: '#7ab0b0', mid: '#4f8f84', sh: '#2c5a60' }, { tiers: 3, wk: 0.3, snow: '#ffffff' });
          break;
        case 'plains':
          deco = Scenery.mesa(C, 90, 100, 52, 34, { lit: '#c09aa0', mid: '#9a7890', foot: '#6a5a80', sh: '#5a4a72', band: '#d8b8b0', shadow: '#2a2050', top: '#d8b8a8', rim: '#ffe8c8' });
          deco += Pn('M150 102L153 50L159 50L162 102Z', '#6a5a8a') + Pn('M156 16L168 44L156 60L144 44Z', '#ffe066') + Pn('M156 16L168 44L156 60Z', '#e8b020', op(0.8)) + Ln('M156 34L144 22M156 40L172 28', '#fff7a0', 1.8);
          glow = Cn(156, 40, 28, C.soft('#fff7a0', 0.5, 0.2));
          break;
        case 'twilight':
          deco = Pn('M104 104Q98 84 108 72Q118 60 108 50L116 48Q126 62 116 74Q108 86 114 104Z', '#3c2a58') + Scenery.crown(C, 112, 46, 30, { hi: '#bafcff', lit: '#8a6ad8', mid: '#5f4ab0', sh: '#30246e' }, { n: 7, dabs: 5 });
          glow = Cn(170, 56, 30, C.soft('#fff6d6', 0.5, 0.3)) + Cn(112, 46, 40, C.soft('#8ffcff', 0.25, 0.2));
          deco += Cn(170, 56, 16, '#fff6d6') + Cn(165, 52, 4, '#e6d8b0') + Cn(174, 61, 3, '#e6d8b0');
          for (const [x, y] of [[80, 100], [150, 104], [184, 98]]) deco += Pn(`M${x - 5} ${y}Q${x} ${y - 10} ${x + 5} ${y}Z`, '#6fd8ff') + Rect(x - 1, y, 2, 4, '#d8e0ff');
          break;
        case 'arena':
          deco = Pn('M52 72L52 94Q130 120 208 94L208 72Q130 96 52 72Z', '#cdbdf5') + Pn('M130 84Q170 84 208 72L208 94Q170 110 130 110Z', '#8a74d8', op(0.5)) +
            [0, 1, 2, 3, 4, 5, 6].map(i => En(64 + i * 22, 90 + Math.sin(i / 6 * Math.PI) * 10, 5, 7, pick(R, ['#ffd23f', '#ff7ab6', '#5cd6ff', '#ffffff']))).join('') +
            En(130, 72, 78, 22, '#e8dcff') + En(130, 73, 60, 14, '#7fd4a8') + En(130, 73, 60, 14, 'none', ' stroke="#ffffff" stroke-width="1.6"' + op(0.6)) +
            Ln('M58 68L58 40M202 68L202 40', '#3a2a60', 3) + Pn('M58 40L78 46L58 52Z', '#ffc21a') + Pn('M202 40L182 46L202 52Z', '#8fe3e0') + Pn(starD(130, 30, 15, 6.5), '#ffe066');
          glow = Cn(130, 30, 30, C.soft('#fff49a', 0.5, 0.2));
          break;
      }
      const aura = Cn(cx, cy + 6, 100, C.soft(biome === 'volcano' ? '#ff9a6a' : biome === 'twilight' ? '#b8a0ff' : '#ffffff', 0.22, 0.3));
      const line = biome === 'snow' ? '#1e2a44' : biome === 'twilight' || biome === 'arena' ? '#1a1238' : biome === 'volcano' ? '#1a0e14' : '#2e1c14';
      C.defs += `<filter id="iol" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="d"/><feFlood flood-color="${line}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
      return svg(260, 222, C.defs, aura + glow + `<g filter="url(#iol)">${under}${cap}${deco}</g>`);
    });
  }

  /* painted top-down isle map (1000x560) for the galaxy's region view: a floating landmass seen from high above with a
   * cliff rim, the two zones' terrains, one landmark per isle and a dotted trail between the location nodes.
   * Ground details are clipped to the land; trees and landmarks stand on it unclipped (so they may rise over the rim). */
  const MAP_NODES = { z1: [300, 318], z2: [640, 280], g: [826, 196] };
  const MAPPAL = {
    sunny: { land: ['#c4f090', '#8ed064', '#62a846'], land2: ['#84c85c', '#56a040', '#3a8036'], rock: ['#c09068', '#7e5438', '#4a3024'], rim: '#f0dca0', hang: 'vine' },
    coral: { land: ['#fff4cc', '#f0d496', '#d8b47a'], land2: ['#f4dca4', '#e0bc84', '#c09868'], rock: ['#d0a070', '#8e6648', '#5a3a2a'], rim: '#ffffff', hang: 'weed' },
    ember: { land: ['#a88894', '#7a5a68', '#54404c'], land2: ['#7a4e5a', '#583440', '#381e2a'], rock: ['#80606a', '#4c3440', '#261820'], rim: '#ffb070', hang: 'lava' },
    frost: { land: ['#ffffff', '#e8f1fc', '#ccdcf2'], land2: ['#e0f0ff', '#b4d4f4', '#86b0e2'], rock: ['#b0b8d0', '#6e6e96', '#3a3a60'], rim: '#ffffff', hang: 'ice' },
    storm: { land: ['#f4e6a8', '#d8c070', '#b0a05c'], land2: ['#d4c4f2', '#ae9cdc', '#8a76bc'], rock: ['#a88e9e', '#6c5a82', '#3a2a50'], rim: '#fff0c0', hang: 'crystal' },
    eclipse: { land: ['#8472cc', '#5c4aa2', '#3a2c74'], land2: ['#54448a', '#35285c', '#22183c'], rock: ['#6e5ca6', '#3c2e74', '#1a1238'], rim: '#b8a0ff', hang: 'glow' },
  };
  /** the trail between the location nodes (two quadratic legs), sampled so decorations can keep clear of it */
  function mapTrail() {
    const [a, b, c] = [MAP_NODES.z1, MAP_NODES.z2, MAP_NODES.g];
    const q1 = [(a[0] + b[0]) / 2, a[1] + 60], q2 = [(b[0] + c[0]) / 2 + 30, b[1] - 10], pts = [];
    const leg = (p0, q, p1) => { for (let i = 0; i <= 18; i++) { const t = i / 18, u = 1 - t; pts.push([u * u * p0[0] + 2 * u * t * q[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * q[1] + t * t * p1[1]]); } };
    leg(a, q1, b); leg(b, q2, c);
    return { d: `M${a[0]} ${a[1]}Q${q1[0]} ${q1[1]} ${b[0]} ${b[1]}Q${q2[0]} ${q2[1]} ${c[0]} ${c[1]}`, pts };
  }
  function isleMap(isleId) {
    return U.svgUrl('imap:' + isleId, () => {
      const pal = MAPPAL[isleId], R = U.rng(U.hash('map' + isleId)), C = Scenery.newCtx(R);
      const cx = 500, cy = 292, rx = 452, ry = 198;
      const pts = [];
      for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * (0.9 + R() * 0.14), cy + Math.sin(a) * ry * (0.86 + R() * 0.2)]); }
      const top = Scenery.smoothClosed(pts), tr = mapTrail();
      const M = {
        C, R, pal, top, flat: '', tall: [], keep: [],
        /** inside the landmass, shrunk toward its centre by m */
        inside(x, y, m = 0.84) {
          let c = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = cx + (pts[i][0] - cx) * m, yi = cy + (pts[i][1] - cy) * m, xj = cx + (pts[j][0] - cx) * m, yj = cy + (pts[j][1] - cy) * m;
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
          }
          return c;
        },
        /** a thing standing at (x,y), h tall, stays clear of the node rings, their labels and the trail */
        free(x, y, h = 40) {
          const hw = h * 0.42;
          if (M.keep.some(([a, b, c, d]) => x + hw > a && x - hw < c && y > b && y - h < d)) return false;
          for (const [nx, ny] of Object.values(MAP_NODES)) {
            if (Math.abs(nx - x) < 50 + hw && y > ny - 50 && y - h < ny + 50) return false;
            if (Math.abs(nx - x) < 100 + hw && y > ny + 48 && y - h < ny + 110) return false;
          }
          return !tr.pts.some(([px, py]) => Math.abs(px - x) < 16 + hw && py > y - h - 8 && py < y + 12);
        },
        add(y, s) { M.tall.push([y, s]); },
        /** place up to n standing things in a box (retrying spots that are off the land or in the way) */
        scatter(n, x0, x1, y0, y1, h, fn, m) {
          for (let i = 0, k = 0; k < n && i < n * 8; i++) {
            const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), hh = h[0] + R() * (h[1] - h[0]);
            if (M.inside(x, y, m) && M.free(x, y, hh) && !M.tall.some(([ty, , tx]) => tx != null && Math.abs(tx - x) < hh * 0.3 && Math.abs(ty - y) < hh * 0.12)) { M.tall.push([y, fn(x, y, hh), x]); k++; }
          }
        },
      };
      let s = En(cx, cy + 24, rx * 1.08, ry * 1.14, C.soft(pal.rim, 0.24, 0.4));
      // cliff: the landmass seen from above, with strata, a hanging rock root and dangling bits per isle
      const under = pts.map(([x, y]) => [x, y + 36]);
      s += Pn(`M${f(cx - 180)} ${f(cy + ry * 0.78)}Q${f(cx - 50)} ${f(cy + ry + 150)} ${f(cx + 6)} ${f(cy + ry + 176)}Q${f(cx + 60)} ${f(cy + ry + 124)} ${f(cx + 200)} ${f(cy + ry * 0.78)}Z`, C.lin([[0, pal.rock[1]], [1, pal.rock[2]]]));
      for (let k = 0; k < 3; k++) s += Ln(`M${f(cx - 150 + k * 34)} ${f(cy + ry * 0.94 + k * 30)}Q${f(cx)} ${f(cy + ry + 30 + k * 34)} ${f(cx + 150 - k * 34)} ${f(cy + ry * 0.94 + k * 30)}`, pal.rock[0], 3, op(0.4));
      s += Pn(Scenery.smoothClosed(under), C.lin([[0, pal.rock[0]], [0.45, pal.rock[1]], [1, pal.rock[2]]]));
      for (let k = 1; k <= 2; k++) s += Pn(Scenery.smoothClosed(pts.map(([x, y]) => [x, y + k * 12])), 'none', ` stroke="${pal.rock[k === 1 ? 0 : 2]}" stroke-width="2.4"` + op(0.45));
      s += hangers(M, under, cx);
      // land: two terrains blended left → right, painterly patches, then the isle's ground features
      const cid = C.id('lm');
      C.defs += `<clipPath id="${cid}"><path d="${top}"/></clipPath>`;
      let land = Rect(0, 0, 1000, 560, C.lin([[0, pal.land[1]], [0.42, pal.land[1]], [0.6, pal.land2[1]], [1, pal.land2[1]]], 0, 0, 1, 0));
      for (let i = 0; i < 46; i++) { const x = cx + (R() - 0.5) * rx * 1.9, y = cy + (R() - 0.5) * ry * 1.8, left = x < cx + (R() - 0.5) * 80; land += En(x, y, 30 + R() * 60, 12 + R() * 24, C.soft(R() < 0.5 ? (left ? pal.land[0] : pal.land2[0]) : (left ? pal.land[2] : pal.land2[2]), 0.6, 0.3)); }
      featureArt(isleId, M);
      land += M.flat;
      land += Rect(0, 0, 1000, 560, C.rad([[0, '#ffffff', 0.16], [1, '#ffffff', 0]], { cx: 330, cy: 150, r: 520, user: 1 }));
      land += Rect(0, 0, 1000, 560, C.rad([[0.62, '#000000', 0], [1, '#000000', 0.3]], { cx: '50%', cy: '45%', r: '60%' }));
      land += Pn(top, 'none', ` stroke="${pal.rock[2]}" stroke-width="10"` + op(0.3));
      s += `<g clip-path="url(#${cid})">${land}</g>`;
      s += Pn(top, 'none', ` stroke="${pal.rim}" stroke-width="7"` + op(0.55)) + Pn(top, 'none', ` stroke="${OL}" stroke-width="4"`);
      s += Ln(tr.d, '#2b2040', 10, op(0.3)) + Ln(tr.d, '#fff8e0', 5.5, ' stroke-dasharray="2 13"' + op(0.95));
      M.tall.sort((p, q) => p[0] - q[0]);
      for (const [, t] of M.tall) s += t;
      return svg(1000, 560, C.defs, s);
    });
  }
  /** vines, icicles, lava drips… dangling from the underside of the cliff */
  function hangers(M, under, cx) {
    const { C, R, pal } = M;
    let s = '';
    for (let i = 0; i < under.length; i++) {
      const [x, y] = under[i];
      if (y < 330 || R() < 0.25) continue;
      const len = 16 + R() * 36, bx = x + (R() - 0.5) * 20;
      switch (pal.hang) {
        case 'vine': case 'weed': {
          const c = pal.hang === 'vine' ? '#4f9a3e' : '#3aa88a';
          s += Ln(`M${f(bx)} ${f(y - 4)}q${f(-6 + R() * 12)} ${f(len * 0.5)} ${f(-3 + R() * 6)} ${f(len)}`, c, 3);
          for (let k = 1; k < 4; k++) s += En(bx + (k % 2 ? 4 : -4), y + len * k / 4, 4.5, 2.6, k % 2 ? '#8ed064' : c);
          break;
        }
        case 'ice':
          s += Pn(`M${f(bx - 7)} ${f(y - 4)}L${f(bx)} ${f(y + len)}L${f(bx + 7)} ${f(y - 4)}Z`, '#dff4ff') + Pn(`M${f(bx)} ${f(y - 4)}L${f(bx)} ${f(y + len)}L${f(bx + 7)} ${f(y - 4)}Z`, '#8fbfe8', op(0.8));
          break;
        case 'crystal':
          s += Pn(`M${f(bx - 8)} ${f(y - 4)}L${f(bx - 2)} ${f(y + len)}L${f(bx + 8)} ${f(y - 4)}Z`, '#d8c8ff') + Pn(`M${f(bx - 2)} ${f(y - 4)}L${f(bx - 2)} ${f(y + len)}L${f(bx + 8)} ${f(y - 4)}Z`, '#8a76cc', op(0.8)) + Cn(bx - 2, y + len, 7, C.soft('#e8d8ff', 0.8, 0.2));
          break;
        case 'lava':
          s += Cn(bx, y + len * 0.6, 16, C.soft('#ff8a3a', 0.6, 0.2)) + Pn(`M${f(bx - 4)} ${f(y - 4)}Q${f(bx - 5)} ${f(y + len * 0.6)} ${f(bx)} ${f(y + len * 0.7)}Q${f(bx + 5)} ${f(y + len * 0.6)} ${f(bx + 4)} ${f(y - 4)}Z`, '#ffb03a') + Cn(bx, y + len * 0.72, 3.4, '#ffe890');
          break;
        case 'glow':
          s += Ln(`M${f(bx)} ${f(y - 4)}q${f(-8 + R() * 16)} ${f(len * 0.5)} ${f(-4 + R() * 8)} ${f(len)}`, '#2a1e48', 3.4) + Cn(bx, y + len, 8, C.soft('#8ffcff', 0.8, 0.2)) + Cn(bx, y + len, 2.6, '#dfffff');
          break;
      }
    }
    return s;
  }
  /* ---- small painted landmarks for the region maps ---- */
  function mRock(C, x, y, w, h, c) {
    const P = Paint.ramp(c);
    const d = `M${f(x - w / 2)} ${f(y)}Q${f(x - w / 2)} ${f(y - h)} ${f(x - w * 0.05)} ${f(y - h)}Q${f(x + w / 2)} ${f(y - h * 0.95)} ${f(x + w / 2)} ${f(y)}Z`;
    return En(x + w * 0.1, y, w * 0.6, h * 0.22, '#000000', op(0.18)) + Pn(d, c) + Pn(`M${f(x + w * 0.02)} ${f(y - h * 0.98)}Q${f(x + w / 2)} ${f(y - h * 0.95)} ${f(x + w / 2)} ${f(y)}L${f(x + w * 0.05)} ${f(y)}Q${f(x + w * 0.2)} ${f(y - h * 0.5)} ${f(x + w * 0.02)} ${f(y - h * 0.98)}Z`, P.sh, op(0.8)) +
      En(x - w * 0.18, y - h * 0.72, w * 0.16, h * 0.12, P.hi, op(0.75)) + Pn(d, 'none', ` stroke="${P.line}" stroke-width="2"` + op(0.6));
  }
  function cottage(C, x, y, s, roof, wall) {
    const w = 60 * s, h = 30 * s, rh = 26 * s, d = 12 * s, fw = w * 0.5, x0 = x - w / 2, P = Paint.ramp(roof), Wp = Paint.ramp(wall);
    let o = En(x + 4 * s, y + 2, w * 0.66, 8 * s, '#000000', op(0.22));
    o += Pn(poly([[x0 + fw, y], [x0 + fw, y - h], [x0 + w, y - h - d], [x0 + w, y - d]]), Wp.sh);
    o += Pn(poly([[x0, y], [x0, y - h], [x0 + fw / 2, y - h - rh], [x0 + fw, y - h], [x0 + fw, y]]), wall);
    o += Rect(x0 + fw + (w - fw) * 0.3, y - h * 0.72 - d * 0.4, (w - fw) * 0.3, h * 0.36, '#8fd8ff') + Rect(x0 + fw * 0.34, y - h * 0.62, fw * 0.32, h * 0.62, '#7a4a2a');
    o += Cn(x0 + fw * 0.6, y - h * 0.3, 1.6 * s, '#ffd23f');
    o += Rect(x0 + w * 0.72, y - h - d - rh * 0.9, 9 * s, 18 * s, '#a0644a');
    o += Pn(poly([[x0 + fw / 2, y - h - rh], [x0 + fw / 2 + (w - fw), y - h - rh - d], [x0 + w + 5 * s, y - h - d + 3 * s], [x0 + fw + 5 * s, y - h + 3 * s]]), roof);
    o += Pn(poly([[x0 + fw / 2, y - h - rh], [x0 + fw / 2 + (w - fw), y - h - rh - d], [x0 + w * 0.8, y - h - rh * 0.6 - d]]), P.lt, op(0.6));
    o += Ln(`M${f(x0 - 4 * s)} ${f(y - h + 3 * s)}L${f(x0 + fw / 2)} ${f(y - h - rh)}L${f(x0 + fw + 5 * s)} ${f(y - h + 3 * s)}`, P.sh, 5 * s);
    return o + Pn(poly([[x0, y], [x0, y - h], [x0 + fw / 2, y - h - rh], [x0 + fw / 2 + (w - fw), y - h - rh - d], [x0 + w + 5 * s, y - h - d + 3 * s], [x0 + w, y - d], [x0 + fw, y]]), 'none', ` stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"`);
  }
  function lighthouse(C, x, y, s) {
    const h = 96 * s, wb = 17 * s, wt = 11 * s, cid = C.id('lh');
    const body = `M${f(x - wb)} ${f(y)}L${f(x - wt)} ${f(y - h)}L${f(x + wt)} ${f(y - h)}L${f(x + wb)} ${f(y)}Z`;
    C.defs += `<clipPath id="${cid}"><path d="${body}"/></clipPath>`;
    let o = Pn(`M${f(x - 60 * s)} ${f(y - h - 14 * s)}L${f(x)} ${f(y - h - 22 * s)}L${f(x - 60 * s)} ${f(y - h - 32 * s)}Z`, C.soft('#fff4a0', 0.55, 0.3)) + Pn(`M${f(x + 60 * s)} ${f(y - h - 14 * s)}L${f(x)} ${f(y - h - 22 * s)}L${f(x + 60 * s)} ${f(y - h - 32 * s)}Z`, C.soft('#fff4a0', 0.55, 0.3));
    o += mRock(C, x - 16 * s, y + 6 * s, 40 * s, 22 * s, '#a08a7a') + mRock(C, x + 18 * s, y + 8 * s, 34 * s, 16 * s, '#8a7a6e');
    let band = Rect(x - wb, y - h, wb * 2, h, '#ffffff');
    for (let k = 0; k < 3; k++) band += Rect(x - wb, y - h * (0.22 + k * 0.3), wb * 2, h * 0.14, '#e8463a');
    band += Rect(x + wb * 0.1, y - h, wb, h, '#1a1030', op(0.22));
    o += `<g clip-path="url(#${cid})">${band}</g>` + Pn(body, 'none', ` stroke="${OL}" stroke-width="2.4"`);
    o += Rect(x - wt - 4 * s, y - h - 4 * s, (wt + 4 * s) * 2, 5 * s, '#3a3050') + Cn(x, y - h - 14 * s, 22 * s, C.soft('#fff4a0', 0.9, 0.25)) + Rect(x - wt * 0.8, y - h - 20 * s, wt * 1.6, 16 * s, '#ffe890') + Pn(`M${f(x - wt - 2 * s)} ${f(y - h - 20 * s)}Q${f(x)} ${f(y - h - 38 * s)} ${f(x + wt + 2 * s)} ${f(y - h - 20 * s)}Z`, '#e8463a');
    return o;
  }
  function volcano(C, x, y, w, h) {
    const cone = `M${f(x - w / 2)} ${f(y)}Q${f(x - w * 0.22)} ${f(y - h * 0.5)} ${f(x - w * 0.12)} ${f(y - h)}L${f(x + w * 0.12)} ${f(y - h)}Q${f(x + w * 0.22)} ${f(y - h * 0.5)} ${f(x + w / 2)} ${f(y)}Q${f(x)} ${f(y + h * 0.12)} ${f(x - w / 2)} ${f(y)}Z`;
    let o = En(x, y + 4, w * 0.56, h * 0.14, '#000000', op(0.25)) + Pn(cone, C.lin([[0, '#8a6a74'], [0.45, '#5a3a48'], [1, '#2e1c28']], 0, 0, 1, 0));
    o += Pn(`M${f(x + w * 0.04)} ${f(y - h)}L${f(x + w * 0.12)} ${f(y - h)}Q${f(x + w * 0.22)} ${f(y - h * 0.5)} ${f(x + w / 2)} ${f(y)}Q${f(x + w * 0.25)} ${f(y + h * 0.08)} ${f(x + w * 0.1)} ${f(y + h * 0.06)}Q${f(x + w * 0.16)} ${f(y - h * 0.5)} ${f(x + w * 0.04)} ${f(y - h)}Z`, '#1c1018', op(0.45));
    for (const k of [-0.3, -0.1, 0.15, 0.32]) o += Ln(`M${f(x + k * w * 0.3)} ${f(y - h * 0.92)}Q${f(x + k * w * 0.9)} ${f(y - h * 0.45)} ${f(x + k * w * 1.3)} ${f(y - h * 0.02)}`, '#2a1820', 2, op(0.5));
    o += Cn(x, y - h, w * 0.3, C.soft('#ff8a3a', 0.7, 0.2)) + En(x, y - h, w * 0.12, w * 0.035, '#ffe07a') + En(x, y - h + 1, w * 0.08, w * 0.02, '#fff6c8');
    for (const [k, len] of [[-0.06, 0.7], [0.03, 0.9], [0.08, 0.5]]) {
      const d = `M${f(x + k * w)} ${f(y - h)}Q${f(x + k * w * 3)} ${f(y - h * (1 - len * 0.5))} ${f(x + k * w * 4.5)} ${f(y - h * (1 - len))}`;
      o += Ln(d, '#ff6a2a', 9, op(0.35)) + Ln(d, '#ffb03a', 4.4) + Ln(d, '#fff0a0', 1.6);
    }
    for (let i = 0; i < 5; i++) o += Cn(x + (i - 1) * w * 0.07 + i * i * 3, y - h - 16 - i * 16, 12 + i * 4, C.soft(i < 2 ? '#8a7a80' : '#a89aa0', 0.75 - i * 0.1, 0.45));
    return o + Pn(cone, 'none', ` stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"`);
  }
  function igloo(C, x, y, s) {
    const r = 30 * s;
    let o = En(x + 4 * s, y + 2, r * 1.2, 8 * s, '#3a4a80', op(0.2)) + Pn(`M${f(x - r)} ${f(y)}A${f(r)} ${f(r * 0.9)} 0 0 1 ${f(x + r)} ${f(y)}Z`, '#ffffff') + Pn(`M${f(x + r * 0.1)} ${f(y - r * 0.9)}A${f(r)} ${f(r * 0.9)} 0 0 1 ${f(x + r)} ${f(y)}L${f(x + r * 0.3)} ${f(y)}Q${f(x + r * 0.5)} ${f(y - r * 0.5)} ${f(x + r * 0.1)} ${f(y - r * 0.9)}Z`, '#bcd4f0');
    for (const k of [0.3, 0.6]) o += Ln(`M${f(x - r * Math.sqrt(1 - k * k))} ${f(y - r * 0.9 * k)}L${f(x + r * Math.sqrt(1 - k * k))} ${f(y - r * 0.9 * k)}`, '#9ab8e0', 1.6);
    o += Pn(`M${f(x - r * 0.62)} ${f(y + 2)}L${f(x - r * 0.62)} ${f(y - r * 0.36)}Q${f(x - r * 0.4)} ${f(y - r * 0.62)} ${f(x - r * 0.1)} ${f(y - r * 0.36)}L${f(x - r * 0.1)} ${f(y + 2)}Z`, '#ffffff') + Pn(`M${f(x - r * 0.5)} ${f(y + 2)}L${f(x - r * 0.5)} ${f(y - r * 0.28)}Q${f(x - r * 0.36)} ${f(y - r * 0.46)} ${f(x - r * 0.22)} ${f(y - r * 0.28)}L${f(x - r * 0.22)} ${f(y + 2)}Z`, '#2a3a6a');
    return o + Pn(`M${f(x - r)} ${f(y)}A${f(r)} ${f(r * 0.9)} 0 0 1 ${f(x + r)} ${f(y)}Z`, 'none', ` stroke="${OL}" stroke-width="2.2"`);
  }
  function peak(C, x, y, w, h, pal) {
    const d = `M${f(x - w / 2)} ${f(y)}L${f(x - w * 0.12)} ${f(y - h * 0.86)}L${f(x)} ${f(y - h)}L${f(x + w * 0.1)} ${f(y - h * 0.9)}L${f(x + w / 2)} ${f(y)}Z`;
    let o = En(x, y + 3, w * 0.56, 10, '#000000', op(0.2)) + Pn(d, pal.lit) + Pn(`M${f(x)} ${f(y - h)}L${f(x + w * 0.1)} ${f(y - h * 0.9)}L${f(x + w / 2)} ${f(y)}L${f(x + w * 0.04)} ${f(y)}Q${f(x + w * 0.1)} ${f(y - h * 0.5)} ${f(x)} ${f(y - h)}Z`, pal.sh);
    o += Pn(`M${f(x - w * 0.2)} ${f(y - h * 0.6)}L${f(x - w * 0.12)} ${f(y - h * 0.86)}L${f(x)} ${f(y - h)}L${f(x + w * 0.1)} ${f(y - h * 0.9)}L${f(x + w * 0.2)} ${f(y - h * 0.62)}L${f(x + w * 0.12)} ${f(y - h * 0.68)}L${f(x + w * 0.05)} ${f(y - h * 0.58)}L${f(x - w * 0.04)} ${f(y - h * 0.7)}L${f(x - w * 0.12)} ${f(y - h * 0.56)}Z`, '#ffffff') +
      Pn(`M${f(x)} ${f(y - h)}L${f(x + w * 0.1)} ${f(y - h * 0.9)}L${f(x + w * 0.2)} ${f(y - h * 0.62)}L${f(x + w * 0.12)} ${f(y - h * 0.68)}L${f(x + w * 0.05)} ${f(y - h * 0.58)}Q${f(x + w * 0.06)} ${f(y - h * 0.8)} ${f(x)} ${f(y - h)}Z`, '#c4d8f4');
    return o + Pn(d, 'none', ` stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"`);
  }
  function spire(C, x, y, h) {
    const w = h * 0.2;
    const d = `M${f(x - w)} ${f(y)}Q${f(x - w * 0.5)} ${f(y - h * 0.5)} ${f(x - w * 0.25)} ${f(y - h * 0.82)}L${f(x + w * 0.25)} ${f(y - h * 0.82)}Q${f(x + w * 0.5)} ${f(y - h * 0.5)} ${f(x + w)} ${f(y)}Z`;
    let o = En(x, y + 3, w * 1.3, 9, '#000000', op(0.22)) + Pn(d, C.lin([[0, '#b89aa8'], [0.5, '#7a6090'], [1, '#3e2c5a']], 0, 0, 1, 0));
    for (let k = 1; k < 5; k++) o += Ln(`M${f(x - w * (1 - k * 0.12))} ${f(y - h * k * 0.16)}L${f(x + w * (1 - k * 0.12))} ${f(y - h * k * 0.16)}`, '#e8c8c0', 1.6, op(0.45));
    o += Cn(x, y - h * 0.94, h * 0.3, C.soft('#e8d8ff', 0.9, 0.2));
    o += Pn(`M${f(x)} ${f(y - h * 1.1)}L${f(x + w * 0.5)} ${f(y - h * 0.92)}L${f(x)} ${f(y - h * 0.8)}L${f(x - w * 0.5)} ${f(y - h * 0.92)}Z`, '#f4ecff') + Pn(`M${f(x)} ${f(y - h * 1.1)}L${f(x + w * 0.5)} ${f(y - h * 0.92)}L${f(x)} ${f(y - h * 0.8)}Z`, '#a894e8');
    const bolt = `M${f(x + 44)} ${f(y - h * 1.4)}L${f(x + 14)} ${f(y - h * 1.26)}L${f(x + 26)} ${f(y - h * 1.24)}L${f(x + 2)} ${f(y - h * 1.12)}`;
    o += Ln(bolt, '#fff6a0', 9, op(0.35)) + Ln(bolt, '#fff6a0', 3.4) + Scenery.cumulus(C, x + 56, y - h * 1.42, 130, { lit: '#9a8ab8', mid: '#6a5a8a', sh: '#40345c', rim: '#d8c8f8' });
    for (const [dx, dy, r] of [[-w * 2.2, -h * 0.5, 7], [w * 2.4, -h * 0.66, 5], [-w * 1.6, -h * 0.8, 4]]) o += mRock(C, x + dx, y + dy, r * 2.4, r * 1.6, '#8a78a8');
    return o + Pn(d, 'none', ` stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"`);
  }
  function citadel(C, x, y, s) {
    const stone = '#3a2c6a', sh = '#22184a', rim = '#b8a0ff', win = '#8ffcff';
    let o = En(x, y + 4, 110 * s, 16 * s, '#000000', op(0.3));
    const tower = (tx, tw, th, roofH) => {
      let t = Rect(tx - tw / 2, y - th, tw, th, stone) + Rect(tx + tw * 0.1, y - th, tw * 0.4, th, sh, op(0.7)) + Ln(`M${f(tx - tw / 2 + 1)} ${f(y - th)}L${f(tx - tw / 2 + 1)} ${f(y)}`, rim, 2, op(0.8));
      t += Pn(`M${f(tx - tw / 2 - 4 * s)} ${f(y - th)}L${f(tx)} ${f(y - th - roofH)}L${f(tx + tw / 2 + 4 * s)} ${f(y - th)}Z`, '#5a3aa0') + Pn(`M${f(tx)} ${f(y - th - roofH)}L${f(tx + tw / 2 + 4 * s)} ${f(y - th)}L${f(tx + 2 * s)} ${f(y - th)}Z`, '#2c1c5a');
      for (let k = 0; k < Math.floor(th / (26 * s)); k++) t += Rect(tx - 3.5 * s, y - th + 14 * s + k * 26 * s, 7 * s, 11 * s, win, op(0.55 + (k % 2) * 0.4));
      return t + Pn(`M${f(tx - tw / 2)} ${f(y)}L${f(tx - tw / 2)} ${f(y - th)}L${f(tx - tw / 2 - 4 * s)} ${f(y - th)}L${f(tx)} ${f(y - th - roofH)}L${f(tx + tw / 2 + 4 * s)} ${f(y - th)}L${f(tx + tw / 2)} ${f(y - th)}L${f(tx + tw / 2)} ${f(y)}`, 'none', ` stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"`);
    };
    o += Cn(x, y - 120 * s, 90 * s, C.soft('#8a6aff', 0.45, 0.3));
    o += tower(x - 62 * s, 30 * s, 92 * s, 40 * s) + tower(x + 64 * s, 30 * s, 84 * s, 36 * s) + tower(x, 42 * s, 136 * s, 56 * s);
    o += Pn(`M${f(x + 6 * s)} ${f(y - 206 * s)}a${f(11 * s)} ${f(11 * s)} 0 1 0 ${f(10 * s)} ${f(15 * s)}a${f(8 * s)} ${f(8 * s)} 0 1 1 ${f(-10 * s)} ${f(-15 * s)}Z`, '#ffe890');
    let wall = Rect(x - 90 * s, y - 40 * s, 180 * s, 40 * s, stone) + Rect(x - 90 * s, y - 40 * s, 180 * s, 7 * s, '#4a3a84');
    for (let k = 0; k < 9; k++) wall += Rect(x - 90 * s + k * 21 * s, y - 50 * s, 12 * s, 11 * s, stone) + Ln(`M${f(x - 90 * s + k * 21 * s)} ${f(y - 50 * s)}l${f(12 * s)} 0`, rim, 1.6, op(0.7));
    wall += Pn(`M${f(x - 16 * s)} ${f(y)}L${f(x - 16 * s)} ${f(y - 20 * s)}Q${f(x)} ${f(y - 38 * s)} ${f(x + 16 * s)} ${f(y - 20 * s)}L${f(x + 16 * s)} ${f(y)}Z`, '#120a26') + Cn(x, y - 10 * s, 16 * s, C.soft(win, 0.6, 0.2));
    return o + wall + Pn(poly([[x - 90 * s, y], [x - 90 * s, y - 40 * s], [x + 90 * s, y - 40 * s], [x + 90 * s, y]]), 'none', ` stroke="${OL}" stroke-width="2.4"`);
  }
  /** ground-level water: an irregular painted lake with a shoreline and glints */
  function mLake(C, R, x, y, rx, ry, deep, shallow, shore) {
    const p = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.push([x + Math.cos(a) * rx * (0.85 + R() * 0.25), y + Math.sin(a) * ry * (0.85 + R() * 0.25)]); }
    const d = Scenery.smoothClosed(p);
    let o = Pn(d, shore, ` stroke="${shore}" stroke-width="14" stroke-linejoin="round"` + op(0.7)) + Pn(d, C.rad([[0, shallow], [1, deep]], { cx: '40%', cy: '35%', r: '75%' })) + Pn(d, 'none', ` stroke="#ffffff" stroke-width="3"` + op(0.55));
    for (let k = 0; k < 4; k++) { const gx = x + (R() - 0.5) * rx, gy = y + (R() - 0.5) * ry * 0.8; o += Ln(`M${f(gx - 12)} ${f(gy)}q12 -5 24 0`, '#ffffff', 2.2, op(0.6)); }
    return o;
  }
  /** each isle's two terrains: ground features (clipped) and standing features (sorted by depth) */
  function featureArt(isleId, M) {
    const { C, R } = M;
    const leaf = { hi: '#eaffa0', lit: '#a2dc5e', mid: '#6cb448', sh: '#3f7f3c' }, deep = { hi: '#d8ffb0', lit: '#7cc050', mid: '#4f9a40', sh: '#2c6a34' };
    const flowers = (n, x0, x1, y0, y1, cols) => { for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); for (let k = 0; k < 5; k++) M.flat += Cn(x + (R() - 0.5) * 26, y + (R() - 0.5) * 12, 2.4 + R() * 1.6, pick(R, cols)); } };
    const tufts = (n, x0, x1, y0, y1, pal) => M.scatter(n, x0, x1, y0, y1, [12, 18], (x, y, h) => Scenery.tuft(C, x, y, h, pal));
    switch (isleId) {
      case 'sunny': {
        M.flat += Ln('M160 96C120 170 190 230 150 300S120 400 180 452', '#7ed0f0', 20) + Ln('M160 96C120 170 190 230 150 300S120 400 180 452', '#b8ecff', 7, op(0.8));
        M.flat += mLake(C, R, 190, 460, 70, 34, '#3aa6d8', '#9ee6ff', '#f0e0a8'); M.keep.push([110, 418, 270, 505]);
        M.flat += Ln('M430 186Q470 230 470 270', '#e8cc8a', 12, op(0.9));
        flowers(16, 80, 470, 130, 440, ['#ff7ab6', '#ffe066', '#ffffff', '#ff9a4a']);
        M.add(186, cottage(C, 430, 186, 1.15, '#e8503a', '#fff2d8')); M.keep.push([385, 105, 485, 200]);
        M.scatter(16, 70, 470, 120, 450, [30, 44], (x, y, h) => Scenery.broadleaf(C, x, y, h, leaf, { dabs: 1 }));
        M.scatter(46, 520, 950, 90, 460, [38, 58], (x, y, h) => Scenery.broadleaf(C, x, y, h, deep, { dabs: 1 }));
        tufts(26, 80, 480, 130, 450, { lit: '#c4f090', mid: '#7cc05a', sh: '#4f9a3e' });
        break;
      }
      case 'coral': {
        M.flat += Pn(M.top, 'none', ` stroke="#6fe0f0" stroke-width="54"` + op(0.75)) + Pn(M.top, 'none', ` stroke="#2ab4d8" stroke-width="22"` + op(0.8)) + Pn(M.top, 'none', ` stroke="#ffffff" stroke-width="30" stroke-dasharray="6 26"` + op(0.55));
        M.flat += mLake(C, R, 200, 196, 104, 58, '#1c9cc8', '#8ff0ff', '#fff8dc'); M.keep.push([90, 130, 312, 262]);
        M.flat += mLake(C, R, 856, 400, 90, 48, '#1c9cc8', '#8ff0ff', '#fff8dc'); M.keep.push([756, 346, 956, 456]);
        for (let i = 0; i < 22; i++) { const x = 90 + R() * 820, y = 130 + R() * 330; if (!M.inside(x, y, 0.8) || !M.free(x, y, 10)) continue; M.flat += R() < 0.5 ? Pn(`M${f(x)} ${f(y - 6)}l2 4.5 5 .5-3.6 3.4 1 5-4.4-2.4-4.4 2.4 1-5-3.6-3.4 5-.5z`, pick(R, ['#ff8a5a', '#ff6a8a', '#ffb03a'])) : En(x, y, 5, 3.6, pick(R, ['#fff0f4', '#ffd0dc', '#f4e4c8'])) + Ln(`M${f(x - 3)} ${f(y - 1)}l3 3l3 -3`, '#d8a0a8', 1); }
        M.add(352, lighthouse(C, 905, 352, 1.05)); M.keep.push([860, 220, 950, 372]);
        M.add(176, cottage(C, 490, 176, 1, '#e8b048', '#f8e8c8')); M.keep.push([450, 105, 545, 190]);
        M.scatter(20, 80, 940, 110, 470, [40, 58], (x, y, h) => Scenery.palm(C, x, y, h, { lit: '#c6ec84', mid: '#4fa84a', sh: '#2f7a3c', trunk: '#c09060', trunkSh: '#8a6038' }, { fk: 0.9 }), 0.84);
        M.scatter(8, 540, 940, 120, 460, [16, 26], (x, y, h) => mRock(C, x, y, h * 1.6, h, '#c0a488'));
        break;
      }
      case 'ember': {
        for (let i = 0; i < 16; i++) { const x = 100 + R() * 800, y = 120 + R() * 330; if (!M.inside(x, y, 0.85)) continue; const d = `M${f(x)} ${f(y)}l${f(14 + R() * 20)} ${f((R() - 0.5) * 16)}l${f(10 + R() * 18)} ${f((R() - 0.5) * 16)}`; M.flat += Ln(d, '#ff6a2a', 7, op(0.35)) + Ln(d, '#ffb03a', 2.4); }
        M.flat += Ln('M470 214C520 260 600 300 620 340S720 390 800 392', '#ff6a2a', 20, op(0.45)) + Ln('M470 214C520 260 600 300 620 340S720 390 800 392', '#ffb03a', 11) + Ln('M470 214C520 260 600 300 620 340S720 390 800 392', '#fff0a0', 3.4);
        M.flat += Cn(830, 392, 120, C.soft('#ff8a3a', 0.5, 0.3)) + mLake(C, R, 830, 392, 92, 44, '#e8402a', '#fff0a0', '#3a2028'); M.keep.push([728, 342, 932, 446]);
        M.add(214, volcano(C, 470, 214, 250, 150)); M.keep.push([350, 60, 590, 232]);
        M.scatter(14, 80, 420, 140, 450, [34, 54], (x, y, h) => Scenery.deadTree(C, x, y, h, '#2a1a24', '#ff9a60'));
        M.scatter(12, 520, 950, 130, 460, [14, 26], (x, y, h) => mRock(C, x, y, h * 1.5, h, '#4a3440'));
        for (let i = 0; i < 4; i++) { const x = 560 + R() * 360, y = 150 + R() * 300; if (M.inside(x, y) && M.free(x, y, 50)) M.add(y, Cn(x, y - 20, 26, C.soft('#a89aa0', 0.6, 0.4)) + Cn(x + 6, y - 42, 20, C.soft('#c0b4b8', 0.45, 0.4)) + En(x, y, 10, 4, '#ff8a3a')); }
        break;
      }
      case 'frost': {
        M.flat += mLake(C, R, 470, 450, 110, 40, '#8ec4f0', '#e8f8ff', '#ffffff'); M.keep.push([350, 404, 590, 500]);
        for (let k = 0; k < 5; k++) M.flat += Ln(`M${f(400 + k * 34)} ${f(430 + R() * 20)}l${f(10 + R() * 10)} ${f(8 + R() * 8)}l${f(12)} ${f(-4)}`, '#ffffff', 1.6, op(0.8));
        for (let i = 0; i < 22; i++) M.flat += En(80 + R() * 860, 120 + R() * 340, 30 + R() * 40, 8 + R() * 8, C.soft('#ffffff', 0.9, 0.4));
        M.add(170, peak(C, 720, 170, 180, 150, { lit: '#a8b8e0', sh: '#5a6aa0' })); M.keep.push([630, 20, 810, 182]);
        M.add(250, igloo(C, 140, 250, 1.1)); M.keep.push([100, 205, 185, 262]);
        M.scatter(30, 70, 470, 110, 460, [38, 56], (x, y, h) => Scenery.pine(C, x, y, h, { lit: '#7ab0b0', mid: '#4f8f84', sh: '#2c5a60' }, { tiers: 3, wk: 0.32, snow: '#ffffff' }));
        M.scatter(12, 520, 950, 150, 460, [40, 70], (x, y, h) => Scenery.shards(C, x, y, h, { hi: '#ffffff', mid: '#bfe8ff', sh: '#6aa8e0', glow: '#bfe8ff', line: '#3a78b8' }, { n: 3 }));
        break;
      }
      case 'storm': {
        for (let i = 0; i < 18; i++) { const x = 90 + R() * 420, y = 130 + R() * 320; if (M.inside(x, y, 0.85)) M.flat += Ln(`M${f(x)} ${f(y)}q20 -6 44 0`, '#fff4c8', 2.4, op(0.6)); }
        for (let i = 0; i < 8; i++) { const x = 540 + R() * 380, y = 140 + R() * 300; if (M.inside(x, y, 0.85)) M.flat += Cn(x, y, 30, C.soft('#e8d8ff', 0.5, 0.3)); }
        M.add(236, spire(C, 520, 236, 136)); M.keep.push([478, 60, 562, 248]);
        M.scatter(7, 80, 440, 140, 450, [34, 50], (x, y, h) => Scenery.mesa(C, x, y, h * 1.7, h, { lit: '#c09aa0', mid: '#9a7890', foot: '#6a5a80', sh: '#5a4a72', band: '#d8b8b0', shadow: '#2a2050', top: '#d8b8a8', rim: '#ffe8c8' }));
        M.scatter(14, 560, 950, 120, 460, [44, 76], (x, y, h) => Scenery.shards(C, x, y, h, { hi: '#ffffff', mid: '#c8b8f8', sh: '#8a78d0', glow: '#e8d8ff', line: '#7a68c0' }, { n: 2 }));
        tufts(22, 80, 460, 130, 450, { lit: '#fff0a8', mid: '#d8c070', sh: '#a89a58' });
        break;
      }
      case 'eclipse': {
        M.flat += mLake(C, R, 470, 450, 100, 38, '#1c1238', '#5a4aa0', '#8a78d0') + Cn(470, 446, 14, '#fff4c0', op(0.7)); M.keep.push([360, 406, 580, 500]);
        for (let i = 0; i < 9; i++) { const x = 100 + R() * 400, y = 140 + R() * 300; if (!M.inside(x, y)) continue; for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; M.flat += Cn(x + Math.cos(a) * 18, y + Math.sin(a) * 8, 3, '#8ffcff') + Cn(x + Math.cos(a) * 18, y + Math.sin(a) * 8, 8, C.soft('#8ffcff', 0.6, 0.2)); } }
        M.add(150, citadel(C, 730, 150, 0.85)); M.keep.push([640, 0, 822, 164]);
        M.scatter(22, 70, 470, 110, 460, [40, 56], (x, y, h) => Scenery.broadleaf(C, x, y, h, { hi: '#bafcff', lit: '#6a58c0', mid: '#44348e', sh: '#261c60' }, { dabs: 3, trunk: '#2a1e48' }));
        M.scatter(9, 540, 950, 170, 470, [40, 70], (x, y, h) => Scenery.ruin(C, x, y, h * 0.36, h, { stone: '#3a2c64', sh: '#1e1640', rim: '#b8a0ff', win: '#8ffcff' }, { windows: 1 }));
        break;
      }
    }
  }

  /* ======================= UI ICONS (inline glyphs) ======================= */
  const ICONS = {
    team: '<path d="M12 21c-4.2 0-7-2.2-7-4.8 0-2.3 2.3-3.4 3.8-4.4C10.2 10.9 10.8 10 12 10s1.8.9 3.2 1.8c1.5 1 3.8 2.1 3.8 4.4C19 18.8 16.2 21 12 21z"/><circle cx="5" cy="9.5" r="2.4"/><circle cx="9.2" cy="5.3" r="2.5"/><circle cx="14.8" cy="5.3" r="2.5"/><circle cx="19" cy="9.5" r="2.4"/>',
    codex: '<path d="M4 4.5C4 3.7 4.7 3 5.5 3H11v17H5.5C4.7 20 4 19.3 4 18.5v-14zM13 3h5.5c.8 0 1.5.7 1.5 1.5v14c0 .8-.7 1.5-1.5 1.5H13V3z"/><path d="M6.5 7h2.5M6.5 10h2.5M15.5 7h2" stroke="#2b2040" stroke-width="1.4" stroke-linecap="round"/>',
    bag: '<path d="M8 7V5.5C8 3.6 9.8 2 12 2s4 1.6 4 3.5V7h-2V5.5C14 4.7 13.1 4 12 4s-2 .7-2 1.5V7H8z"/><path d="M4.5 8h15l-1.2 11.2c-.1 1-1 1.8-2 1.8H7.7c-1 0-1.9-.8-2-1.8L4.5 8z"/><path d="M9 12h6" stroke="#2b2040" stroke-width="1.6" stroke-linecap="round"/>',
    quests: '<path d="M6 3h10.5L20 6.5V20c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1V4c0-.6.4-1 1-1z"/><path d="M12 7v6.2M12 16.2v.3" stroke="#2b2040" stroke-width="2.4" stroke-linecap="round"/>',
    shop: '<path d="M3 9l1.8-5h14.4L21 9c0 1.4-1.1 2.5-2.5 2.5S16 10.4 16 9c0 1.4-1.8 2.5-4 2.5S8 10.4 8 9c0 1.4-1.1 2.5-2.5 2.5S3 10.4 3 9z"/><path d="M5 12.5V20c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-7.5M10 21v-5h4v5"/>',
    spin: '<circle cx="12" cy="12" r="9.5"/><path d="M12 12L12 2.5M12 12l8.2 4.7M12 12l-8.2 4.7" stroke="#2b2040" stroke-width="1.6"/><circle cx="12" cy="12" r="2.2" fill="#2b2040"/>',
    map: '<circle cx="12" cy="12" r="6.5"/><ellipse cx="12" cy="12" rx="11" ry="3.6" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-20 12 12)"/>',
    settings: '<path d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z"/><circle cx="12" cy="12" r="3.2" fill="#2b2040"/>',
    close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" fill="none"/>',
    back: '<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    lock: '<path d="M7 10V7.5C7 4.5 9.2 2.5 12 2.5s5 2 5 5V10h-2.4V7.5c0-1.6-1.2-2.8-2.6-2.8S9.4 5.9 9.4 7.5V10z"/><rect x="4.5" y="10" width="15" height="11.5" rx="2.5"/>',
    check: '<path d="M4.5 12.5l5 5L19.5 7" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.1l-5.9 3.2 1.3-6.5-4.9-4.5 6.6-.8z"/>',
    ad: '<path d="M3 10h18v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z"/><path d="M3 6.2L19.6 3l.8 4.1L3.8 10.3z"/><path d="M7.4 5.4l2.3 3.7M12 4.5l2.3 3.7M16.6 3.6l2.3 3.7" stroke="#2b2040" stroke-width="1.8" fill="none"/><path d="M3 13.6h18" stroke="#2b2040" stroke-width="1.2" opacity=".45"/>',
    music: '<path d="M9 17.5V5.5l11-2.5v12"/><circle cx="6.5" cy="17.5" r="3"/><circle cx="17.5" cy="15" r="3"/>',
    sound: '<path d="M3 9h4l5-4.5v15L7 15H3z"/><path d="M15.5 8.5c1.2 1 1.8 2.2 1.8 3.5s-.6 2.5-1.8 3.5M18 6c2 1.6 3 3.6 3 6s-1 4.4-3 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
    lang: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c3 3 3 16 0 19M12 2.5c-3 3-3 16 0 19" stroke="#2b2040" stroke-width="1.4" fill="none"/>',
    run: '<path d="M13.5 5.5a2 2 0 1 0 0-.1zM9 9l4-1.5 2 3 3 1M11 8l-2 5 4 2-1 6M9 13l-3 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    swap: '<path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    trophy: '<path d="M7 3h10v5c0 3-2.2 5.5-5 5.5S7 11 7 8z"/><path d="M7 5H4c0 3 1.2 4.5 3.2 5M17 5h3c0 3-1.2 4.5-3.2 5" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M10.5 13h3v3.5h2.5v3.5h-8v-3.5h2.5z"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 10.5v6M12 7v.4" stroke="#2b2040" stroke-width="2.6" stroke-linecap="round"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><rect x="2" y="6.5" width="20" height="4" rx="1.5"/><path d="M12 6.5V21" stroke="#2b2040" stroke-width="2"/><path d="M12 6.5C10 3 6.5 3.5 7 6c.3 1 2.5.5 5 .5zM12 6.5c2-3.5 5.5-3 5-.5-.3 1-2.5.5-5 .5z"/>',
    ship: '<path d="M12 2c3.5 2.5 4.8 7 4 12.5H8C7.2 9 8.5 4.5 12 2z"/><path d="M8 11.5L5 16l3.2-.5M16 11.5l3 4.5-3.2-.5M10 16.5h4l-.8 4h-2.4z"/><circle cx="12" cy="9" r="1.8" fill="#2b2040"/>',
    orb: '<circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12.5" rx="9.5" ry="2.8" fill="none" stroke="#2b2040" stroke-width="1.6"/><path d="M12 7.5l1.3 2.7 3 .3-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.3z" fill="#2b2040"/>',
    telescope: '<path d="M3 11l14-6 2 4.5-14 6zM11 13.5l-3 7M13 13l3 7.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    tent: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 9.5l-3.6 10.5h7.2z" fill="#2b2040"/><path d="M12 3.5V1.8M12 1.8l3 1.2-3 1.1" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>',
    moon: '<path d="M15.5 3.2A8.8 8.8 0 1 0 20.8 15 7 7 0 0 1 15.5 3.2z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><circle cx="3" cy="7.5" r="1.8"/><circle cx="12" cy="4.5" r="1.8"/><circle cx="21" cy="7.5" r="1.8"/>',
    auto: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M20.5 3.5v5.2h-5.2z"/><path d="M10 8.5v7l5.5-3.5z"/>',
    fast: '<path d="M3 5.5v13l8.5-6.5zM12 5.5v13l8.5-6.5z"/>',
    swords: '<path d="M4 3l8.5 8.5-2 2L2 5V3zM20 3l-8.5 8.5 2 2L22 5V3z"/><path d="M6.5 14.5l3 3M17.5 14.5l-3 3M4 20l3.5-3.5M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    evolve: '<path d="M12 2.5l2.4 5.3 5.6.6-4.2 3.8 1.2 5.6L12 15l-5 2.8 1.2-5.6L4 8.4l5.6-.6z"/><path d="M6 21h12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
    up: '<path d="M12 3l8 9h-5v9H9v-9H4z"/>',
    arena: '<path d="M2.5 9.5C2.5 6.5 7 4.5 12 4.5s9.5 2 9.5 5V18c0 1.6-4.3 3-9.5 3s-9.5-1.4-9.5-3z"/><path d="M5.5 11v6M9 12v7M12 12v7.5M15 12v7M18.5 11v6" stroke="#2b2040" stroke-width="1.6"/><ellipse cx="12" cy="9.3" rx="7" ry="2.6" fill="#2b2040"/>',
    egg: '<path d="M12 2.5c4.4 0 7.2 6.4 7.2 11.2S16 21.5 12 21.5s-7.2-3-7.2-7.8S7.6 2.5 12 2.5z"/><path d="M5.5 12.5l3.2-2 3 2.5 3-2.5 3.8 2" stroke="#2b2040" stroke-width="1.5" fill="none"/>',
    dojo: '<rect x="1.5" y="9" width="4" height="6" rx="1"/><rect x="18.5" y="9" width="4" height="6" rx="1"/><rect x="4.5" y="7" width="3" height="10" rx="1"/><rect x="16.5" y="7" width="3" height="10" rx="1"/><rect x="7" y="10.8" width="10" height="2.4"/>',
    shard: '<path d="M12 1.5l2.8 7.7L22.5 12l-7.7 2.8L12 22.5l-2.8-7.7L1.5 12l7.7-2.8z"/>',
    bolt: '<path d="M13.5 1.5L4.5 13.5h6l-2 9 9-12.5h-6z"/>',
    flame: '<path d="M12 2.2C13 6.2 18.2 8.2 18.2 14.2 18.2 18.6 15.4 21.6 12 21.6S5.8 18.6 5.8 14.6c0-3.4 2.5-5 3.1-7.6 1.5 1.4 1.9 3 1.6 4.6C12.6 9.6 13.1 6 12 2.2z"/>',
    target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6" fill="#2b2040"/><circle cx="12" cy="12" r="3"/>',
    coin: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.8l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#2b2040"/>',
    badge: '<path d="M12 2l8 3v6.5c0 5-3.6 8.7-8 10.5-4.4-1.8-8-5.5-8-10.5V5z"/><path d="M12 7.2l1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5z" fill="#2b2040"/>',
    heart: '<path d="M12 21.2C6.2 16.9 2.5 13.4 2.5 8.9 2.5 5.8 4.9 3.5 7.8 3.5c1.8 0 3.3.9 4.2 2.3.9-1.4 2.4-2.3 4.2-2.3 2.9 0 5.3 2.3 5.3 5.4 0 4.5-3.7 8-9.5 12.3z"/>',
    hammer: '<path d="M4.5 4.5l5-2.5 2 2-1 1 3.5 3.5-2.5 2.5L8 7.5l-1 1z"/><path d="M11.3 10.2l2.5-2.5 7.7 9.6c.6.7.5 1.7-.1 2.3l-.7.7c-.6.6-1.6.7-2.3.1z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M7.5 2.5v4M16.5 2.5v4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M3 9.5h18" stroke="#2b2040" stroke-width="1.6"/><path d="M12 11.8l1.4 2.8 3.1.4-2.3 2.1.6 3-2.8-1.5-2.8 1.5.6-3-2.3-2.1 3.1-.4z" fill="#2b2040"/>',
    medal: '<path d="M7 1.5h4l1 5-3 1zM17 1.5h-4l-1 5 3 1z"/><circle cx="12" cy="15" r="7"/><path d="M12 10.8l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#2b2040"/>',
  };
  /** translucent zodiac wheel (12 glyphs on a ring) — flashes on super-effective hits */
  function zodiacWheel() {
    return U.svgUrl('zwheel', () => {
      let s = '<circle cx="150" cy="150" r="138" fill="none" stroke="#8ff0ff" stroke-width="5"/><circle cx="150" cy="150" r="92" fill="none" stroke="#8ff0ff" stroke-width="3"/><circle cx="150" cy="150" r="146" fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".7"/>';
      SIGNS.forEach((sg, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2, x = 150 + Math.cos(a) * 115, y = 150 + Math.sin(a) * 115;
        const b = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
        s += `<path d="M${f(150 + Math.cos(b) * 92)} ${f(150 + Math.sin(b) * 92)}L${f(150 + Math.cos(b) * 138)} ${f(150 + Math.sin(b) * 138)}" stroke="#8ff0ff" stroke-width="2.5"/>`;
        s += `<g transform="translate(${f(x - 13)} ${f(y - 13)}) scale(1.08)"><path d="${sg.glyph}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      });
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"><defs><radialGradient id="zw"><stop offset=".55" stop-color="#5fd8ff" stop-opacity="0"/><stop offset=".8" stop-color="#5fd8ff" stop-opacity=".22"/><stop offset="1" stop-color="#5fd8ff" stop-opacity="0"/></radialGradient></defs><circle cx="150" cy="150" r="150" fill="url(#zw)"/>${s}</svg>`;
    });
  }
  /** tileable starfield (CSS background for dark, starry panels) */
  function starTile() {
    return U.svgUrl('startile', () => {
      const R = U.rng(77);
      let s = '';
      for (let i = 0; i < 70; i++) { const x = R() * 256, y = R() * 256, r = 0.4 + R() * 1.1; s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${pick(R, ['#ffffff', '#fff4d8', '#d8e8ff', '#e8d8ff'])}" opacity="${f(0.25 + R() * 0.7)}"/>`; }
      for (let i = 0; i < 5; i++) { const x = R() * 256, y = R() * 256, r = 2 + R() * 2.5; s += `<path d="${sparkD(x, y, r)}" fill="#fffbe6" opacity=".85"/>`; }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${s}</svg>`;
    });
  }
  /** a big glowing zodiac glyph (capture celebration) */
  function signGlyph(sign) {
    const sg = SIGN[sign];
    return `<svg viewBox="0 0 24 24" width="440" height="440"><circle cx="12" cy="12" r="11.2" fill="none" stroke="#bff6ff" stroke-width=".5"/><circle cx="12" cy="12" r="10.4" fill="none" stroke="#ffffff" stroke-width=".25" opacity=".7"/><path d="${sg ? sg.glyph : ''}" fill="none" stroke="#dffbff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  /** an empty decoration spot: a dashed ring on the grass with a little ✚ (3.0 Base) */
  function spotMark() {
    return U.svgUrl('spotmark', () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 46" width="92" height="46"><ellipse cx="46" cy="30" rx="40" ry="13" fill="#fff8d0" fill-opacity=".22" stroke="#fffbe6" stroke-width="3" stroke-dasharray="7 6" stroke-opacity=".9"/><path d="M46 12v20M36 22h20" stroke="#2b2040" stroke-width="8" stroke-linecap="round"/><path d="M46 12v20M36 22h20" stroke="#ffe066" stroke-width="4.4" stroke-linecap="round"/></svg>`);
  }
  function icon(name, size = 24, cls = '') {
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor">${ICONS[name] || ''}</svg>`;
  }

  return { bg, bgImg, bake, plat, zodiacWheel, signGlyph, starTile, isleMap, MAP_NODES, portrait, painted, personSvg, prop, person, pip, item, orbPart, space, isle, icon, spotMark, SKINS, HAIRC, SUITS, HAIRS, PROP };
})();
