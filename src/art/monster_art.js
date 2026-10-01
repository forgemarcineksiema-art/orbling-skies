'use strict';
/* Procedural Orbling art.
 * Builds a painterly SVG (viewBox 200x200, feet at y≈188) for every species from its `art` params:
 * a body type + ears/horns/crests/tail/wings/pattern/face features. Every mass is shaded with a
 * warm-light / cool-shadow ramp (Paint), outlined in a dark tint of the Orbling's own colour, and
 * gets cel-shading overlays, glossy eyes and fur tufts. Cached as an object URL for <img> tags
 * (inner CSS animations: blink, flames, sway). */

const MonArt = (() => {
  let OL = '#2b2040'; // outline: re-tinted per Orbling in render()
  const SW = 4;
  let LW = 1; // line weight: the painted bake draws finer inner lines (the Painter inks the silhouette)
  const f = n => Math.round(n * 10) / 10;
  const D = (s, ...v) => s.reduce((a, str, i) => a + str + (i < v.length ? (typeof v[i] === 'number' ? f(v[i]) : v[i]) : ''), '');
  const rad = x => x * Math.PI / 180;
  const pt = (cx, cy, r, deg) => [cx + Math.cos(rad(deg)) * r, cy + Math.sin(rad(deg)) * r];
  const stroke = (w = SW) => ` stroke="${OL}" stroke-width="${f(w * LW)}" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, fill, x = '', w) => `<path d="${d}" fill="${fill}"${stroke(w)}${x}/>`;
  const Pn = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;
  const E = (cx, cy, rx, ry, fill, x = '', w) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${stroke(w)}${x}/>`;
  const En = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
  const Ci = (cx, cy, r, fill, x = '', w) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${stroke(w)}${x}/>`;
  const Cn = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
  const Ln = (d, color, w, x = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(color === OL ? w * Math.max(LW, 0.7) : w)}" stroke-linecap="round" stroke-linejoin="round"${x}/>`;
  /* outlined tube with a cylinder highlight (limbs, tails, antennae) */
  const Tube = (d, color, w) => {
    let s = Ln(d, OL, w + SW * 2 * LW) + Ln(d, color, w);
    if (color[0] === '#') { const R = Paint.ramp(color); s += Ln(d, R.sh, w * 0.42, ` opacity=".5" transform="translate(${f(w * 0.12)} ${f(w * 0.16)})"`) + Ln(d, R.hi, w * 0.3, ` opacity=".55" transform="translate(${f(-w * 0.12)} ${f(-w * 0.16)})"`); }
    return s;
  };
  const Gt = (inner, tr, x = '') => `<g${tr ? ` transform="${tr}"` : ''}${x}>${inner}</g>`;
  const tr = (x, y, r, s) => `translate(${f(x)} ${f(y)})` + (r ? ` rotate(${f(r)})` : '') + (s ? ` scale(${s})` : '');
  const ellD = (cx, cy, rx, ry) => D`M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  const f3 = n => Math.round(n * 1000) / 1000;

  /* ---- animation poses ----
   * x.t  idle phase 0..1: secondary motion — tails sway, flames flicker, wings flutter, crests & antennae lag, fins paddle,
   *      cloud lobes breathe, a serpent's body ripples.
   * x.mv move phase 0..1, per body: legs (quad/crab/scorp), a hop (egg/round/bird), swimming (fish), drifting (cloud),
   *      slithering (serpent). While moving, the secondary motion follows the move phase (x.ph). */
  const osc = (ph, off = 0) => Math.sin((ph + off) * Math.PI * 2);
  let FL = null, FLn = 0; // flame flicker phase while a posed frame is being drawn
  // hop keys, one per frame (phases k/6): crouch · launch · rise · apex · fall · land.  wing: + is up (wings point back)
  const HOP_KEYS = [
    { spread: 1.3, fy: 0, tuck: 0, arm: 30, crest: -4, wing: -8, tail: 5, flare: -3 },
    { spread: 0.78, fy: 9, tuck: 0.15, arm: -52, crest: -18, wing: 55, tail: -12, flare: 6 },
    { spread: 0.72, fy: 3, tuck: 0.7, arm: -30, crest: -9, wing: 18, tail: -5, flare: 10 },
    { spread: 0.8, fy: -2, tuck: 1, arm: -14, crest: 3, wing: -36, tail: 6, flare: 12 },
    { spread: 1.05, fy: 10, tuck: 0.35, arm: -58, crest: 16, wing: 44, tail: 14, flare: 16 },
    { spread: 1.4, fy: 0, tuck: 0, arm: 26, crest: -9, wing: -10, tail: -4, flare: -5 },
  ];

  /** a flyer at rest still beats its wings (spread high, feet tucked) */
  function flyPose(ph, moving) {
    const w = ph == null ? 0 : osc(ph);
    return { spread: 0.8, fy: 0, tuck: 1, arm: -14, crest: 3 * w, wing: 44 + (moving ? 26 : 18) * w, tail: 6 * w, flare: 0 };
  }
  const WALKERS = ['quad', 'crab', 'scorp', 'biped', 'centaur'];
  function hopPose(ph) {
    const n = HOP_KEYS.length, v = (((ph % 1) + 1) % 1) * n, i = Math.floor(v), t = v - i;
    const K = j => HOP_KEYS[((j % n) + n) % n], out = {};
    for (const key in HOP_KEYS[0]) {
      const a = K(i - 1)[key], b = K(i)[key], c = K(i + 1)[key], d = K(i + 2)[key];
      out[key] = 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    }
    return out;
  }
  /** like fluffy(), but every lobe breathes on its own beat (a ripple running round the cloud) */
  function fluffyW(cx, cy, rx, ry, n, bump, ph, amp = 0.45) {
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      if (i === 0) d += D`M${x} ${y}`;
      else {
        const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2, b = bump * (1 + amp * osc(ph, (i / n) * 2));
        d += D`Q${cx + Math.cos(am) * (rx + b * 2)} ${cy + Math.sin(am) * (ry + b * 2)} ${x} ${y}`;
      }
    }
    return d + 'Z';
  }

  /** head outline with soft fur scallops at both cheeks */
  function furHead(cx, cy, rx, ry, amt = 1) {
    const cheek = deg => {
      const near = (c, w) => Math.max(0, 1 - Math.abs(deg - c) / w);
      return amt * Math.max(near(40, 24), near(140, 24)) * (Math.round(deg / 11) % 2 ? 1 : 0.35);
    };
    return Paint.blob(cx, cy, rx, ry, cheek, 32);
  }
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
  function starD(cx, cy, r1, r2, n = 5, rot = -90) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 ? r2 : r1, a = rad(rot + (i * 180) / n);
      d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r);
    }
    return d + 'Z';
  }
  const sparkD = (x, y, r) => D`M${x} ${y - r}Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y}Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r}Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y}Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z`;
  const rg = (id, c) => Paint.vgrad(id, c);
  /** belly patch with a soft scalloped (furry) upper edge */
  const bellyD = (cx, cy, rx, ry) => Paint.blob(cx, cy, rx, ry, deg => (deg > 195 && deg < 345 ? (Math.round(deg / 13) % 2 ? 0.9 : 0.15) : 0), 30);
  const belly = (cx, cy, rx, ry, x = '') => Pn(bellyD(cx, cy, rx, ry), 'url(#g2)', x);

  /* flame: base at (0,0) pointing up */
  function flame(s, cls = true) {
    const o = D`M${-12 * s} ${4 * s}C${-18 * s} ${-8 * s} ${-9 * s} ${-16 * s} ${-7 * s} ${-28 * s}C${-2 * s} ${-19 * s} ${2 * s} ${-18 * s} ${3 * s} ${-33 * s}C${10 * s} ${-21 * s} ${17 * s} ${-14 * s} ${13 * s} ${4 * s}C${9 * s} ${10 * s} ${-8 * s} ${10 * s} ${-12 * s} ${4 * s}Z`;
    const i = D`M${-6 * s} ${3 * s}C${-9 * s} ${-4 * s} ${-3 * s} ${-9 * s} ${-2 * s} ${-17 * s}C${2 * s} ${-10 * s} ${7 * s} ${-7 * s} ${6 * s} ${3 * s}C${4 * s} ${6 * s} ${-4 * s} ${6 * s} ${-6 * s} ${3 * s}Z`;
    if (FL != null) {
      const q = FL * 2 + (FLn++) * 0.37, sx = 1 + 0.07 * osc(q), sy = 1 - 0.12 * osc(q), sk = 4 * osc(q, 0.3);
      return `<g transform="scale(${f3(sx)} ${f3(sy)}) skewX(${f3(sk)})">` + P(o, 'url(#gF)', '', 3.6) + Pn(i, '#ffe56b') + '</g>';
    }
    return `<g${cls ? ' class="fl"' : ''}>` + P(o, 'url(#gF)', '', 3.6) + Pn(i, '#ffe56b') + '</g>';
  }
  const pacman = (R, fill) => {
    const a = rad(34);
    return P(D`M${R * Math.cos(a)} ${R * Math.sin(a)}A${R} ${R} 0 1 1 ${R * Math.cos(a)} ${-R * Math.sin(a)}L${R * 0.28} 0Z`, fill) +
      En(-R * 0.35, -R * 0.35, R * 0.28, R * 0.16, '#fff', ' opacity=".45" transform="rotate(-35)"');
  };

  /** the two stubby feet of round & egg bodies: spread on the ground, tucked and tilted in the air */
  function hopFeet(x, cx, dl, dr, y, rx, ry) {
    const H = x.hop, sp = H ? H.spread : 1, fy = H ? H.fy : 0, tk = H ? H.tuck : 0;
    const air = H ? Math.max(0, Math.min(1, fy / 9)) : 0; // legs stretched down: feet hang, toes point down
    const foot = (fx, fyy, rot) => {
      const rxE = rx * (1 - air * 0.25), ryE = ry * (1 - tk * 0.2 + air * 0.35), a = rad(rot || 0);
      fyy = Math.min(fyy, 196.5 - Math.hypot(rxE * Math.sin(a), ryE * Math.cos(a))); // never out of the bottom of the picture
      return E(fx, fyy, rxE, ryE, 'url(#gB)', rot ? ` transform="rotate(${f(rot)} ${f(fx)} ${f(fyy)})"` : '');
    };
    return foot(cx - dl * sp, y + fy - tk * 3, -tk * 20 + air * 12) + foot(cx + dr * sp, y + 1 + fy - tk * 3, tk * 20 + air * 16);
  }

  /* stage-3 and legend quadrupeds get their own stance (2.9): extra leg angles [near, far] at the shoulder / hip,
   *  leg shortening (tuck) and a whole-figure turn or lift. At rest and idle; a walking beast trots normally. */
  const QUAD_POSE = {
    proud:  { front: [-26, 0], tuckF: 0.88 },
    charge: { front: [16, 11], hind: [-13, -9] },
    rear:   { front: [-62, -44], tuckF: 0.78, rot: -21, sc: 0.9 },
    fly:    { front: [-78, -64], hind: [68, 54], tuckF: 0.7, tuckH: 0.72, lift: 26, noWalk: 1 },
    titan:  {},
  };
  /** a small floating isle (grass on top, rock and roots below) a mountain goat stands on — it drifts with it */
  function islet(x) {
    const top = 164;
    const rock = D`M28 ${top}C30 ${top + 10} 44 ${top + 16} 56 ${top + 22}C66 ${top + 28} 78 ${top + 34} 92 ${top + 36}C106 ${top + 34} 122 ${top + 26} 136 ${top + 18}C150 ${top + 12} 160 ${top + 8} 162 ${top}Z`;
    let s = P(rock, 'url(#gRock)', '', 3.4) + Ln(D`M60 ${top + 12}L70 ${top + 24}M104 ${top + 14}L100 ${top + 28}M132 ${top + 8}L138 ${top + 16}`, OL, 1.8, ' opacity=".3"');
    s += Tube(D`M78 ${top + 30}Q74 ${top + 38} 78 ${top + 44}`, '#8a5a3a', 2.6) + Tube(D`M112 ${top + 26}Q118 ${top + 34} 114 ${top + 40}`, '#8a5a3a', 2.2);
    s += P(D`M88 ${top + 34}L92 ${top + 44}L96 ${top + 34}Z`, '#8fe3ff', '', 2) ;
    s += E(95, top, 68, 10, '#6fbf4f', '', 3.4) + En(84, top - 2, 40, 4, '#a8e67a', ' opacity=".6"');
    for (const [gx, gs] of [[40, 1], [150, 0.9], [118, 0.8]]) s += P(D`M${gx - 5 * gs} ${top - 4}L${gx - 2 * gs} ${top - 12 * gs}L${gx} ${top - 5}L${gx + 3 * gs} ${top - 13 * gs}L${gx + 5 * gs} ${top - 3}Z`, '#5aa83e', '', 2);
    return s;
  }
  /** a flat-topped crag a mountain beast stands on */
  function crag(x) {
    const k = x.k || 1;
    const d = D`M18 200L26 183Q30 176 40 175L58 172Q64 168 74 170L118 168Q128 165 136 169L156 171Q168 172 172 180L182 200Z`;
    return P(d, 'url(#gRock)', '', 3.4) + Ln(D`M44 181L60 180M90 176L112 175M140 179L158 182`, '#fff', 2.2, ' opacity=".35"') +
      Ln(D`M70 186L78 196M120 184L128 197`, OL, 1.8, ' opacity=".35"') + P(fluffy(52, 172, 12 * k, 4 * k, 6, 1.4), '#6fbf4f', '', 2.4) + P(fluffy(146, 170, 10 * k, 3.5 * k, 5, 1.2), '#6fbf4f', '', 2.2);
  }

  /** a smooth tapered limb through hip → knee → foot (widths at each), softly bent at the knee, rounded at the foot */
  function limbD(p0, p1, p2, w0, w1, w2) {
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const n01 = nrm(p0, p1), n12 = nrm(p1, p2);
    let nk = [n01[0] + n12[0], n01[1] + n12[1]];
    const nl = Math.hypot(nk[0], nk[1]);
    nk = nl < 0.35 ? n01 : [nk[0] / nl, nk[1] / nl];
    const o = (q, n, w, sg) => [q[0] + n[0] * w / 2 * sg, q[1] + n[1] * w / 2 * sg];
    const L0 = o(p0, n01, w0, 1), R0 = o(p0, n01, w0, -1), Lk = o(p1, nk, w1 * 1.08, 1), Rk = o(p1, nk, w1 * 1.08, -1), L2 = o(p2, n12, w2, 1), R2 = o(p2, n12, w2, -1);
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dl = Math.hypot(dx, dy) || 1, tip = [p2[0] + dx / dl * w2 * 0.55, p2[1] + dy / dl * w2 * 0.55];
    return D`M${L0[0]} ${L0[1]}Q${Lk[0]} ${Lk[1]} ${L2[0]} ${L2[1]}Q${tip[0]} ${tip[1]} ${R2[0]} ${R2[1]}Q${Rk[0]} ${Rk[1]} ${R0[0]} ${R0[1]}Z`;
  }

  /* ================= BODIES ================= */
  const BODY = {
    quad(x) {
      const { p, a, C } = x;
      const pose = a.pose && !(x.mv != null && a.pose === 'rear') ? a.pose : '', PZ = QUAD_POSE[pose] || null;
      const titan = pose === 'titan' ? 1 : 0;
      const bulky = a.bulky ? 1 : 0, slim = a.slim ? 1 : 0;
      const hr = U.lerp(40, 31, p) * (bulky ? 0.96 : 1) * (titan ? 1.04 : 1);
      const rx = U.lerp(44, 56, p) * (bulky ? 1.14 : slim ? 0.9 : 1) * (titan ? 1.2 : 1);
      const ry = U.lerp(29, 33, p) * (bulky ? 1.16 : slim ? 0.88 : 1) * (titan ? 1.08 : 1);
      const cx = 90 - bulky * 4 - titan * 5, cy = U.lerp(147, 128, p) + bulky * 4 - slim * 5 - titan * 3;
      let hx = cx + rx * 0.8, hy = cy - ry * 0.78 - hr * 0.45;
      if (pose === 'proud') { hy -= 9; hx += 1; }
      if (pose === 'charge') { hy += 15; hx += 9; }
      if (titan) { hy += 13; hx += 3; }
      const lw = U.lerp(15, 17, p) * (bulky ? 1.25 : slim ? 0.82 : 1) * (titan ? 1.22 : 1);
      const top = cy + ry * 0.05;
      const xb = cx - rx * 0.55, xf = cx + rx * 0.5;
      const leg = (lx, far) => {
        const b = far ? 184 : 189, w = lw, fill = far ? 'url(#gLf)' : 'url(#gL)', r = Math.min(5, w / 3), tw = w * 0.62, mid = top + (b - top) * 0.55;
        let s = P(D`M${lx - tw} ${top}Q${lx - w * 0.5} ${mid} ${lx - w * 0.47} ${b - r}Q${lx - w * 0.52} ${b} ${lx - w * 0.47 + r} ${b}H${lx + w * 0.47 - r}Q${lx + w * 0.52} ${b} ${lx + w * 0.47} ${b - r}Q${lx + w * 0.5} ${mid} ${lx + tw} ${top}Z`, fill);
        if (a.hoof) s += P(D`M${lx - w / 2} ${b - 8}H${lx + w / 2}V${b - r}Q${lx + w / 2} ${b} ${lx + w / 2 - r} ${b}H${lx - w / 2 + r}Q${lx - w / 2} ${b} ${lx - w / 2} ${b - r}Z`, far ? '#4a3547' : '#5d4459', '', 3.2);
        if (a.paws) s += Ln(D`M${lx - 2.6} ${b - 5.5}V${b - 1.5}M${lx + 2.6} ${b - 5.5}V${b - 1.5}`, OL, 2);
        return s;
      };
      // trot: front-near & back-far swing together, the other diagonal half a cycle later; a leg lifts as it swings forward
      const stride = (lx, far, off, front) => {
        const g = leg(lx, far);
        let ang = 0, lift = 0, sc = 1;
        if (PZ && !(x.walk != null && pose === 'proud')) {
          const arr = front ? PZ.front : PZ.hind;
          if (arr) ang = arr[far ? 1 : 0];
          sc = (front ? PZ.tuckF : PZ.tuckH) || 1;
        }
        if (x.walk != null && !(PZ && PZ.noWalk)) { const q = (x.walk + off) * Math.PI * 2; ang += 19 * Math.sin(q); lift = Math.max(0, -Math.cos(q)) * 5.5; }
        else if (PZ && PZ.noWalk && x.ph != null) ang += (x.mv != null ? 10 : 5) * osc(x.ph, front ? 0 : 0.5); // paddling in the air
        if (!ang && !lift && sc === 1) return g;
        return `<g transform="translate(0 ${f(-lift)}) rotate(${f(ang)} ${f(lx)} ${f(top)})${sc !== 1 ? ` translate(0 ${f(top)}) scale(1 ${f3(sc)}) translate(0 ${f(-top)})` : ''}">${g}</g>`;
      };
      const back = stride(xb + 9, 1, 0, 0) + stride(xf + 9, 1, 0.5, 1) + stride(xb - 3, 0, 0.5, 0) + stride(xf - 3, 0, 0, 1);
      // the whole figure: rearing turns it about the hind feet, flying lifts it, a crag raises it
      let fig = '';
      if (PZ && PZ.rot) { const px = xb + 3, py = 187; fig = `translate(${f(px)} ${f(py)}) rotate(${PZ.rot}) scale(${PZ.sc || 1}) translate(${f(-px)} ${f(-py)})`; }
      if (PZ && PZ.lift) fig = `translate(0 ${-PZ.lift})` + (fig ? ' ' + fig : '');
      if (a.rock) fig = 'translate(0 -16)' + (fig ? ' ' + fig : '');
      if (a.islet) fig = 'translate(12 -18) scale(.9)' + (fig ? ' ' + fig : '');
      const clip = a.wool ? fluffy(cx, cy, rx, ry, 11, 4.2) : ellD(cx, cy, rx, ry);
      const headD = a.fur === false ? ellD(hx, hy, hr, hr * 0.96) : furHead(hx, hy, hr, hr * 0.96);
      return {
        hx, hy, hr, fx: hx + hr * 0.27, fy: hy + hr * 0.1, cx, cy, rx, ry,
        earA: [-152, -58], hornA: [-128, -62], crestP: pt(hx, hy, hr * 0.9, -98),
        tailP: [cx - rx * 0.93, cy - ry * 0.28], wingP: [cx - rx * 0.05, cy - ry * 0.72],
        maneP: [hx - hr * 0.1, hy + hr * 0.04], muzzleP: [hx + hr * 0.5, hy + hr * 0.44],
        back, body: P(clip, 'url(#gB)'), clip,
        belly: a.wool ? '' : belly(cx + rx * 0.18, cy + ry * 0.62, rx * 0.72, ry * 0.5),
        head: P(headD, 'url(#gH)'), headClip: headD,
        xf: fig, pre: a.rock ? crag(x) : a.islet ? islet(x) : '', wingK: pose === 'fly' ? 1.5 : a.wings && pose === 'proud' ? 1.3 : 1, wingRot: pose === 'fly' ? -12 : 0, flapK: pose === 'fly' ? 1.8 : 1,
      };
    },

    /* an Orbling that stands up (2.9): a big head on a round barrel of a body, stout legs and arms. Final forms and
     * legends of several lines use it: a ram or bull warrior (hooves), a storm imp (claws), a flower dryad or goddess
     * (a petal dress), a scorpion knight (pincers and a tail over its head). */
    biped(x) {
      const { a, C } = x;
      const bulky = a.bulky ? 1 : 0, slim = a.slim ? 1 : 0, dress = !!a.dress, flt = a.float ? 1 : 0;
      const moving = x.mv != null;
      const W = x.walk != null ? x.walk : null;
      const bob = W != null ? -2.2 * Math.abs(Math.sin(W * Math.PI * 2)) : x.ph != null ? 1.2 * osc(x.ph, 0.1) : 0;
      const tw = bulky ? 41 : slim ? 29 : 35, th = bulky ? 39 : slim ? 36 : 37;   // torso half width / half height
      const cx = 98, cy = 134 - flt * 14 + bob;
      const hr = bulky ? 33 : slim ? 31 : 32;
      const hx = cx + 7, hy = cy - th * 0.78 - hr * 0.55;
      // torso: a slightly pear-shaped barrel (broad chest on the bulky ones)
      const top = cy - th, bot = cy + th;
      const clip = D`M${cx} ${top}C${cx + tw * 0.78} ${top} ${cx + tw} ${cy - th * 0.35} ${cx + tw * (bulky ? 1 : 0.96)} ${cy + th * 0.12}` +
        D`C${cx + tw * 0.94} ${cy + th * 0.78} ${cx + tw * 0.5} ${bot} ${cx} ${bot}C${cx - tw * 0.5} ${bot} ${cx - tw * 0.94} ${cy + th * 0.78} ${cx - tw * (bulky ? 1 : 0.96)} ${cy + th * 0.12}` +
        D`C${cx - tw} ${cy - th * 0.35} ${cx - tw * 0.78} ${top} ${cx} ${top}Z`;
      // legs: stout, swinging at the hip while walking; hooves, claws or small feet
      const legW = bulky ? 22 : slim ? 15 : 19, hipY = cy + th * 0.55, footY = 188 - flt * 14;
      const legC = C.leg;
      const legLen = footY - hipY;
      const leg = (side, far) => {
        const hx0 = cx + side * tw * 0.42 - (far ? 3 : 0);
        let ang = 0, lift = 0;
        if (W != null) { const q = (W + (side > 0 ? 0 : 0.5)) * Math.PI * 2; ang = 22 * Math.sin(q); lift = Math.max(0, -Math.cos(q)) * 6; }
        const k = [hx0 + side * 2, hipY + legLen * 0.52], ft = [hx0 + side * 3, footY - (far ? 3 : 0)];
        let s = P(limbD([hx0, hipY - 10], k, ft, legW * 1.15, legW * 0.95, legW * 0.85), far ? 'url(#gLf)' : 'url(#gL)', '', 3.4);
        if (a.hoof) s += P(D`M${ft[0] - legW * 0.5} ${ft[1] - 6}H${ft[0] + legW * 0.5}L${ft[0] + legW * 0.56} ${ft[1] + 2}Q${ft[0] + legW * 0.56} ${ft[1] + 4} ${ft[0] + legW * 0.4} ${ft[1] + 4}H${ft[0] - legW * 0.4}Q${ft[0] - legW * 0.56} ${ft[1] + 4} ${ft[0] - legW * 0.56} ${ft[1] + 2}Z`, far ? '#4a3547' : '#5d4459', '', 3.2);
        else s += E(ft[0] + 5, ft[1], legW * 0.72, legW * 0.36, far ? 'url(#gLf)' : 'url(#gL)', '', 3.2) + Ln(D`M${ft[0] + 8} ${ft[1] - 2}V${ft[1] + 2}M${ft[0] + 13} ${ft[1] - 2}V${ft[1] + 1}`, OL, 1.8, ' opacity=".6"');
        return `<g transform="translate(0 ${f(-lift)}) rotate(${f(ang)} ${f(hx0)} ${f(hipY)})">${s}</g>`;
      };
      // arms: from the shoulders, swinging opposite to the legs; hands per kind
      const armW = bulky ? 17 : slim ? 11 : 14;
      const hand = (hx1, hy1, far) => {
        const fill = far ? U.shade(C.c1, -0.12) : 'url(#gB)';
        if (a.hands === 'pincer') return Gt(pacman(15 * (a.clawK || 1), far ? U.shade(C.c3, -0.1) : 'url(#g3)'), tr(hx1 + 6, hy1 + 4, -70));
        if (a.hands === 'leaf') return P(D`M${hx1 - 5} ${hy1 - 3}C${hx1 + 2} ${hy1 - 12} ${hx1 + 18} ${hy1 - 8} ${hx1 + 20} ${hy1 + 3}C${hx1 + 10} ${hy1 + 10} ${hx1} ${hy1 + 8} ${hx1 - 5} ${hy1 - 3}Z`, far ? U.shade('#6fcf5a', -0.1) : '#6fcf5a', '', 3);
        if (a.hands === 'hoof') return Ci(hx1, hy1, armW * 0.62, fill, '', 3.4) + P(D`M${hx1 - armW * 0.45} ${hy1 + armW * 0.25}H${hx1 + armW * 0.45}L${hx1 + armW * 0.5} ${hy1 + armW * 0.62}H${hx1 - armW * 0.5}Z`, far ? '#4a3547' : '#5d4459', '', 2.6);
        if (a.hands === 'claw') return Ci(hx1, hy1, armW * 0.6, fill, '', 3.4) + [-0.5, 0, 0.5].map(o => P(D`M${hx1 + (o * armW - 2)} ${hy1 + armW * 0.4}L${hx1 + o * armW} ${hy1 + armW * 0.95}L${hx1 + (o * armW + 2)} ${hy1 + armW * 0.4}Z`, '#fff', '', 1.8)).join('');
        return Ci(hx1, hy1, armW * 0.62, fill, '', 3.4);
      };
      const arm = (side, far) => {
        const sx0 = cx + side * tw * 0.8, sy0 = cy - th * 0.45;
        let ang = W != null ? -18 * Math.sin((W + (side > 0 ? 0.5 : 0)) * Math.PI * 2) : x.ph != null ? (side > 0 ? 5 : 3) * osc(x.ph, side > 0 ? 0 : 0.4) : 0;
        if (a.pose === 'guard' && !moving && side > 0) ang -= 40;
        const e1 = [sx0 + side * 10, sy0 + 20], h1 = [sx0 + side * 8 + 6, sy0 + 36];
        const s = P(limbD([sx0 - side * 4, sy0 - 4], e1, h1, armW * 1.1, armW * 0.9, armW * 0.8), far ? U.shade(C.c1, -0.12) : 'url(#gB)', '', 3.4) + hand(h1[0], h1[1], far);
        return `<g transform="rotate(${f(ang)} ${f(sx0)} ${f(sy0)})">${s}</g>`;
      };
      // the petal dress: an upside-down flower from the waist — a back row behind the body, a front row over the hips
      let dressBack = '', dressFront = '';
      if (dress) {
        const y0 = cy + th * 0.12, y1 = flt ? cy + th * 1.75 : footY - 1, Ld = y1 - y0;
        const fl = x.ph != null ? (moving ? 5 : 3) * osc(x.ph, 0.2) : 0;
        const petal = (ang, len, wid, fill) => Gt(P(D`M0 0C${wid * 0.62} ${len * 0.18} ${wid * 0.66} ${len * 0.74} 0 ${len}C${-wid * 0.66} ${len * 0.74} ${-wid * 0.62} ${len * 0.18} 0 0Z`, fill, '', 3.2) +
          Ln(D`M0 ${len * 0.2}L0 ${len * 0.8}`, '#ffffff', 1.6, ' opacity=".35"'), tr(cx + ang * 0.25, y0, -ang));
        for (const ang of [-32, -11, 11, 32]) dressBack += petal(ang + (ang < 0 ? -fl : fl), Ld * 1.04, 32, 'url(#gP)');
        for (const ang of [-44, -22, 0, 22, 44]) dressFront += petal(ang + (ang < 0 ? -fl : ang > 0 ? fl : 0), Ld * (ang ? 0.94 : 0.9), 27, 'url(#g3)');
      }
      // a fluffy mantle over the shoulders: wool, moss or flaming wool
      let mid = dressFront + arm(1, 0), tailX = '';
      if (a.mantle) {
        const ex = cx + 3, ey = cy - th * 0.74, erx = tw * 0.98, ery = th * 0.3;
        const col = a.mantle === 'moss' ? '#6fbf4f' : 'url(#gWool)';
        mid += P(fluffy(ex, ey, erx, ery, 12, 3.2), col, '', 3.4);
        if (a.mantle === 'moss') mid += Ln(D`M${ex - erx * 0.7} ${ey - 2}Q${ex} ${ey - ery * 1.2} ${ex + erx * 0.7} ${ey - 2}`, '#a8e67a', 2.4, ' opacity=".55"');
        if (a.mantle === 'flame') for (const ang of [-162, -128, -94, -60, -28]) mid += Gt(flame(0.52, x.anim), tr(ex + Math.cos(rad(ang)) * erx * 0.92, ey + Math.sin(rad(ang)) * ery * 0.92, ang + 90));
      }
      // a scorpion knight's tail arches up from the small of its back and hangs its sting over the head
      if (a.stinger) {
        const sw = x.ph != null ? osc(x.ph, 0) : 0;
        const P0 = [cx - tw * 0.7, cy + th * 0.4], P1 = [cx - tw * 2.05, cy - th * 0.1], P2 = [cx - tw * 1.35 + 3 * sw, hy - hr * 1.75], P3 = [hx - 8 + 4 * sw, hy - hr * 1.42 + 2 * sw];
        const bz = (t, i) => (1 - t) ** 3 * P0[i] + 3 * (1 - t) ** 2 * t * P1[i] + 3 * (1 - t) * t * t * P2[i] + t ** 3 * P3[i];
        tailX += Gt(P(D`M-6 -5C5 -7 15 1 15 14C9 8 3 6 -6 6Z`, 'url(#g3)'), tr(P3[0], P3[1], 20, 1.35));
        const N = 10;
        for (let j = N - 1; j >= 0; j--) { const t = (j / (N - 1)) * 0.95; tailX += Ci(bz(t, 0), bz(t, 1), U.lerp(13, 7.5, j / (N - 1)), 'url(#gB)', '', 3.6); }
      }
      const headD = a.fur === false ? ellD(hx, hy, hr, hr * 0.96) : furHead(hx, hy, hr, hr * 0.96, bulky ? 1 : 0.6);
      const legs = dress ? (flt ? '' : [-1, 1].map(sd => E(cx + sd * 12 + 4, footY, 9, 5, 'url(#gL)', '', 3)).join('')) : leg(-1, 1) + leg(1, 0);
      return {
        hx, hy, hr, fx: hx + hr * 0.2, fy: hy + hr * 0.1, cx, cy, rx: tw, ry: th,
        earA: [-150, -58], hornA: [-126, -62], crestP: pt(hx, hy, hr * 0.92, -96),
        tailP: [cx - tw * 0.82, cy + th * 0.3], wingP: [cx - tw * 0.35, cy - th * 0.62],
        maneP: [hx - hr * 0.15, hy + hr * 0.25], muzzleP: [hx + hr * 0.5, hy + hr * 0.44],
        back: tailX + arm(-1, 1) + legs + dressBack, mid, body: P(clip, 'url(#gB)'), clip,
        belly: belly(cx + tw * 0.12, cy + th * 0.28, tw * 0.62, th * 0.46),
        head: P(headD, 'url(#gH)'), headClip: headD, biped: true,
        wingK: a.wingK || 1.1, float: !!flt,
      };
    },

    /* Sagittaris: an archer centaur — the deer body of its line with a rider's torso, a golden bow and a flaming arrow */
    centaur(x) {
      const { C } = x;
      const Q = BODY.quad(x);
      const bx = Q.cx + Q.rx * 0.58, by = Q.cy - Q.ry * 0.42;
      const bob = x.ph != null && x.mv == null ? 1.2 * osc(x.ph, 0.1) : 0;
      const tw = 19, th = 27, tcx = bx + 4, tcy = by - th * 0.62 + bob;
      const torso = D`M${tcx} ${tcy - th}C${tcx + tw * 0.9} ${tcy - th} ${tcx + tw} ${tcy - th * 0.2} ${tcx + tw * 0.86} ${tcy + th * 0.5}C${tcx + tw * 0.7} ${tcy + th} ${tcx - tw * 0.7} ${tcy + th} ${tcx - tw * 0.86} ${tcy + th * 0.5}C${tcx - tw} ${tcy - th * 0.2} ${tcx - tw * 0.9} ${tcy - th} ${tcx} ${tcy - th}Z`;
      const hr = 25, hx = tcx + 5, hy = tcy - th * 0.95 - hr * 0.55;
      const bowX = Math.min(186, hx + hr * 1.6), bowT = hy - 26, bowB = tcy + th * 1.05, bm = (bowT + bowB) / 2;
      const pull = x.ph != null ? 2.5 * osc(x.ph, 0.3) : 0;
      const sx = tcx - 2 - pull, sy = bm + 2;
      const bow = P(D`M${bowX - 3} ${bowT}Q${bowX + 26} ${bm} ${bowX - 3} ${bowB}Q${bowX + 17} ${bm} ${bowX - 3} ${bowT}Z`, 'url(#gGold)', '', 3) +
        Ln(D`M${bowX - 3} ${bowT}L${sx} ${sy}L${bowX - 3} ${bowB}`, '#fff6d8', 1.6);
      const arrow = Ln(D`M${sx} ${sy}L${bowX + 14} ${sy}`, OL, 4.6) + Ln(D`M${sx} ${sy}L${bowX + 14} ${sy}`, '#c9955e', 2.4) +
        P(D`M${bowX + 12} ${sy - 5}L${bowX + 22} ${sy}L${bowX + 12} ${sy + 5}Z`, '#ffe066', '', 2) + Gt(flame(0.34, x.anim), tr(bowX + 16, sy, 90));
      const armC = C.head, armW = 11;
      const farArm = Tube(D`M${tcx + 8} ${tcy - th * 0.55}L${bowX + 1} ${sy}`, U.shade(armC, -0.12), armW) + Ci(bowX + 1, sy, 6.5, U.shade(armC, -0.12), '', 3);
      const nearArm = Tube(D`M${tcx - 4} ${tcy - th * 0.5}L${tcx - 15} ${tcy - th * 0.05}L${sx} ${sy}`, armC, armW) + Ci(sx, sy, 6.5, armC, '', 3);
      const headD = furHead(hx, hy, hr, hr * 0.96, 0.6);
      return Object.assign({}, Q, {
        hx, hy, hr, fx: hx + hr * 0.24, fy: hy + hr * 0.1, muzzleP: [hx + hr * 0.5, hy + hr * 0.44],
        earA: [-152, -58], hornA: [-128, -62], crestP: pt(hx, hy, hr * 0.9, -98), maneP: [hx - hr * 0.1, hy + hr * 0.1],
        back: Q.back + farArm, mid: P(torso, 'url(#gH)') + belly(tcx + 2, tcy + th * 0.34, tw * 0.62, th * 0.4) + bow + arrow + nearArm,
        head: P(headD, 'url(#gH)'), headClip: headD, xf: 'translate(10 16) scale(.9)', pre: '',
      });
    },

    /* Castorlux: the twin stars — two egg spirits side by side, holding hands under a little arc of stars */
    twin(x) {
      const { a, C } = x;
      const bob = x.ph != null ? 3 * osc(x.ph) : 0;
      const egg = (cx, top, hw, h) => { const bot = top + h; return D`M${cx} ${top}C${cx + hw * 0.62} ${top} ${cx + hw} ${top + h * 0.32} ${cx + hw} ${top + h * 0.6}C${cx + hw} ${top + h * 0.86} ${cx + hw * 0.6} ${bot} ${cx} ${bot}C${cx - hw * 0.6} ${bot} ${cx - hw} ${top + h * 0.86} ${cx - hw} ${top + h * 0.6}C${cx - hw} ${top + h * 0.32} ${cx - hw * 0.62} ${top} ${cx} ${top}Z`; };
      const L = { cx: 74, top: 62 + bob, hw: 37, h: 102 }, R = { cx: 128, top: 58 - bob, hw: 35, h: 98 };
      const dL = egg(L.cx, L.top, L.hw, L.h), dR = egg(R.cx, R.top, R.hw, R.h);
      x.defs.push(`<clipPath id="ctw"><path d="${dR}"/></clipPath>`);
      const rb = [R.cx - R.hw, R.top, R.hw * 2, R.h];
      let right = `<path d="${dR}" fill="none" stroke="${OL}" stroke-width="${SW * 1.5 * LW}" stroke-linejoin="round" transform="translate(1.4 1.8)"/>` + P(dR, 'url(#gP)') +
        `<g clip-path="url(#ctw)">${belly(R.cx + 5, R.top + R.h * 0.78, R.hw * 0.62, R.h * 0.23)}${Paint.shade(dR, C.patC, R.hw, { bbox: rb, sheen: 'gShB', gloss: 0.55 })}</g>`;
      // the right twin's face and its star antenna
      const fyR = R.top + R.h * 0.37, er = 8.6;
      right += eye('cute', R.cx - 5, fyR + 1, er * 0.86, 1, x, { hr: 34 }, 6, x.defs) + eye('cute', R.cx + 12, fyR, er, -1, x, { hr: 34 }, 7, x.defs) +
        Ln(D`M${R.cx - 1} ${fyR + 13}Q${R.cx + 4} ${fyR + 18} ${R.cx + 9} ${fyR + 13}`, OL, 3) + En(R.cx + 22, fyR + 11, 5.2, 2.8, '#ff6f91', ' opacity=".42"');
      const aTip = [R.cx + 10, R.top - 22 + (x.ph != null ? 2 * osc(x.ph, 0.4) : 0)];
      right = Tube(D`M${R.cx + 4} ${R.top + 4}Q${R.cx - 4} ${R.top - 10} ${aTip[0]} ${aTip[1]}`, U.shade(C.patC, -0.12), 3.6) + P(starD(aTip[0], aTip[1] - 3, 9, 4), 'url(#gGold)', '', 3) + right;
      // their near hands meet between them; a small arc of stars links them overhead
      const hands = Ci(101, L.top + L.h * 0.64 + bob * 0.5, 9, 'url(#gB)', '', 3.4) + Ci(106, R.top + R.h * 0.66 - bob * 0.5, 8.5, 'url(#gP)', '', 3.4);
      let arc = Ln(D`M${L.cx + 6} ${L.top - 26}Q${101} ${Math.min(L.top, R.top) - 58} ${R.cx - 2} ${R.top - 30}`, '#fff6b0', 2, ' stroke-dasharray="2 7" opacity=".85"');
      for (const [px, py, rr] of [[88, Math.min(L.top, R.top) - 42, 5], [104, Math.min(L.top, R.top) - 48, 6.5], [118, Math.min(L.top, R.top) - 40, 4.5]]) arc += P(starD(px, py, rr, rr * 0.45), '#fff6b0', '', 1.6);
      return {
        hx: L.cx, hy: L.top + L.h * 0.38, hr: 34, fx: L.cx + 4, fy: L.top + L.h * 0.37, cx: L.cx, cy: L.top + L.h * 0.6, rx: L.hw, ry: L.h / 2, unified: true, float: true,
        earA: [-122, -62], hornA: [-112, -72], crestP: [L.cx + 2, L.top + 4], tailP: null, wingP: [L.cx - L.hw * 0.5, L.top + L.h * 0.4],
        back: right, body: P(dL, 'url(#gB)'), clip: dL, belly: belly(L.cx + 5, L.top + L.h * 0.78, L.hw * 0.62, L.h * 0.23), front2: hands + arc,
      };
    },

    /* Alreshia: two koi of the Pisces tied by a starry cord, circling each other */
    twinfish(x) {
      const { C } = x;
      const spin = x.ph != null ? 6 * osc(x.ph) : 0;
      const fishD = (rx, ry) => D`M${rx} 0C${rx} ${-ry * 1.12} ${-rx * 0.35} ${-ry * 1.15} ${-rx} ${-ry * 0.12}L${-rx} ${ry * 0.12}C${-rx * 0.35} ${ry * 1.15} ${rx} ${ry * 1.12} ${rx} 0Z`;
      const one = (px, py, rot, mirror, fill, finFill, idx) => {
        const rx = 40, ry = 27, sw = x.ph != null ? 12 * osc(x.ph, idx * 0.5) : 0;
        let s = Gt(P(D`M${-rx + 4} 0C${-rx - 12} ${-16} ${-rx - 26} ${-26} ${-rx - 32} ${-22}C${-rx - 24} ${-8} ${-rx - 24} ${8} ${-rx - 32} ${22}C${-rx - 26} ${26} ${-rx - 12} ${16} ${-rx + 4} 0Z`, finFill, '', 3.2), `rotate(${f(sw)} ${-rx + 4} 0)`);
        s += P(D`M${-6} ${-ry * 0.9}Q${4} ${-ry * 1.7} ${16} ${-ry * 1.25}Q${10} ${-ry * 0.9} ${12} ${-ry * 0.7}Z`, finFill, '', 3);
        s += P(fishD(rx, ry), fill) + En(4, ry * 0.4, rx * 0.72, ry * 0.4, 'url(#g2)', ' opacity=".9"');
        s += Cn(-10, -8, 5, '#ffffff', ' opacity=".55"') + Cn(8, -12, 4, '#ffffff', ' opacity=".45"');
        s += P(D`M${6} ${ry * 0.3}C${14} ${ry * 0.55} ${16} ${ry * 1.05} ${9} ${ry * 1.2}C${6} ${ry * 0.9} ${2} ${ry * 0.6} ${6} ${ry * 0.3}Z`, finFill, '', 2.6);
        s += eye('wise', rx * 0.5, -ry * 0.22, 8.4, -1, x, { hr: 34 }, 8 + idx, x.defs) + Ln(D`M${rx * 0.66} ${ry * 0.3}Q${rx * 0.8} ${ry * 0.42} ${rx * 0.9} ${ry * 0.24}`, OL, 2.6);
        s += Ln(D`M${rx * 0.72} ${ry * 0.05}c${10} ${-2} ${18} ${4} ${22} ${14}`, OL, 2) ;
        return Gt(s, `translate(${f(px)} ${f(py)}) rotate(${f(rot)})` + (mirror ? ' scale(-1 1)' : ''));
      };
      const cord = Ln(D`M58 ${76}C${34} ${110} ${66} ${150} ${100} ${108}C${134} ${66} ${166} ${106} ${142} ${140}`, '#fff6b0', 2.4, ' stroke-dasharray="3 5"') + P(starD(100, 108, 10, 4.5), 'url(#gGold)', '', 2.6);
      const A = one(112, 74, -14, 0, 'url(#gB)', 'url(#g3)', 0), B2 = one(88, 146, -14, 1, 'url(#gP)', 'url(#g3)', 1);
      return {
        hx: 112, hy: 74, hr: 30, fx: 128, fy: 68, cx: 100, cy: 110, rx: 60, ry: 60, unified: true, float: true, noFace: true,
        crestP: [104, 40], tailP: null, wingP: [96, 60],
        back: '', body: `<g transform="rotate(${f(spin)} 100 110)">${cord}${B2}${A}</g>`, clip: null, belly: '',
      };
    },

    /* Sadalmir: the water-bearer — a genie on a curling cloud tail, pouring starry water from an urn */
    genie(x) {
      const { a, C } = x;
      const bob = x.ph != null ? 2.5 * osc(x.ph) : 0, w = x.ph != null ? osc(x.ph, 0.25) : 0;
      const cx = 96, top = 78 + bob, hw = 31, h = 64;
      const torso = D`M${cx} ${top}C${cx + hw * 0.66} ${top} ${cx + hw} ${top + h * 0.3} ${cx + hw * 0.92} ${top + h * 0.62}C${cx + hw * 0.8} ${top + h} ${cx - hw * 0.8} ${top + h} ${cx - hw * 0.92} ${top + h * 0.62}C${cx - hw} ${top + h * 0.3} ${cx - hw * 0.66} ${top} ${cx} ${top}Z`;
      let tail = '';
      for (const [px, py, r, k] of [[cx + 4, top + h * 0.92, 25, 0], [cx - 8, top + h * 1.2, 19, 1], [cx + 6, top + h * 1.42, 14, 2], [cx - 4, top + h * 1.6, 9.5, 3], [cx + 7, top + h * 1.72, 6, 4]]) {
        tail = P(fluffy(px + 3 * osc(x.ph || 0, k * 0.2), py, r, r * 0.82, 7, r * 0.12), 'url(#gB)', '', 3.2) + tail;
      }
      const hr = 30, hx = cx + 6, hy = top - hr * 0.62;
      // the urn in the near arm, tipped forward; the water arcs down in a starry ribbon
      const ux = cx + hw + 18, uy = top + 18 + bob * 0.5;
      const urn = Gt(P(D`M-12 -14Q-16 -2 -10 10Q0 16 10 10Q16 -2 12 -14Q10 -18 6 -19L-6 -19Q-10 -18 -12 -14Z`, 'url(#gGold)', '', 3) + P(D`M-7 -19H7L9 -24H-9Z`, 'url(#gGold)', '', 2.6) +
        Ln(D`M-10 -4Q0 2 10 -4`, '#c89a2a', 2, ' opacity=".7"'), tr(ux, uy, -38));
      const mx = ux + 14, my = uy - 12;
      const stream = `<path d="${D`M${mx} ${my}C${mx + 22} ${my - 4} ${mx + 26} ${my + 40} ${mx + 18 + 4 * w} ${my + 92}`}" fill="none" stroke="${OL}" stroke-width="11" stroke-linecap="round"/>` +
        `<path d="${D`M${mx} ${my}C${mx + 22} ${my - 4} ${mx + 26} ${my + 40} ${mx + 18 + 4 * w} ${my + 92}`}" fill="none" stroke="#7fd4ff" stroke-width="6.5" stroke-linecap="round"/>` +
        `<path d="${D`M${mx} ${my}C${mx + 22} ${my - 4} ${mx + 26} ${my + 40} ${mx + 18 + 4 * w} ${my + 92}`}" fill="none" stroke="#e8f8ff" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/>` +
        [[mx + 30, my + 70, 3], [mx + 12, my + 98, 2.6], [mx + 28, my + 100, 2.2]].map(([px, py, r]) => Ci(px, py + 2 * w, r, '#bfeaff', '', 1.6)).join('');
      const armC = C.c1;
      const nearArm = Tube(D`M${cx + hw * 0.62} ${top + 18}Q${cx + hw + 6} ${top + 26} ${ux - 6} ${uy + 4}`, armC, 13) + Ci(ux - 6, uy + 4, 7, armC, '', 3);
      const farArm = Tube(D`M${cx - hw * 0.6} ${top + 16}Q${cx - hw - 14} ${top + 8 - 4 * w} ${cx - hw - 12} ${top - 12 - 4 * w}`, U.shade(armC, -0.12), 12) + Ci(cx - hw - 12, top - 12 - 4 * w, 6.5, U.shade(armC, -0.12), '', 3);
      const headD = ellD(hx, hy, hr, hr * 0.96);
      return {
        hx, hy, hr, fx: hx + hr * 0.18, fy: hy + hr * 0.1, cx, cy: top + h * 0.5, rx: hw, ry: h / 2, float: true,
        earA: [-130, -55], hornA: [-116, -70], crestP: [hx + 2, hy - hr * 0.86], tailP: null, wingP: [cx - hw * 0.5, top + 10],
        back: farArm + tail, body: P(torso, 'url(#gB)'), clip: torso, belly: belly(cx + 4, top + h * 0.66, hw * 0.62, h * 0.24),
        mid: nearArm + urn, front2: stream, head: P(headD, 'url(#gH)'), headClip: headD,
      };
    },

    /* Aegoros: the sea-goat — a goat's head, chest and forelegs, and a long fish tail curling up behind */
    seagoat(x) {
      const { a, C } = x;
      const moving = x.mv != null, w = x.ph != null ? osc(x.ph) : 0, amp = moving ? 1.6 : 1;
      const bob = x.ph != null ? 2 * osc(x.ph, 0.1) : 0;
      // the spine of the tail: from the chest to a fin held high behind
      const P0 = [124, 116 + bob], P1 = [70, 178 + 6 * w * amp], P2 = [8, 146 - 4 * w * amp], P3 = [44, 90 + 8 * w * amp];
      const bz = (t, i) => (1 - t) ** 3 * P0[i] + 3 * (1 - t) ** 2 * t * P1[i] + 3 * (1 - t) * t * t * P2[i] + t ** 3 * P3[i];
      const N = 18, Lp = [], Rp = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, x0 = bz(t, 0), y0 = bz(t, 1), x1 = bz(Math.min(1, t + 0.01), 0), y1 = bz(Math.min(1, t + 0.01), 1);
        const dx = x1 - x0 || 0.001, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, r = U.lerp(29, 5, Math.pow(t, 0.72));
        Lp.push([x0 + nx * r, y0 + ny * r]); Rp.push([x0 - nx * r, y0 - ny * r]);
      }
      let d = D`M${Lp[0][0]} ${Lp[0][1]}`;
      for (let i = 1; i <= N; i++) d += D`L${Lp[i][0]} ${Lp[i][1]}`;
      for (let i = N; i >= 0; i--) d += D`L${Rp[i][0]} ${Rp[i][1]}`;
      d += D`A29 29 0 0 0 ${Lp[0][0]} ${Lp[0][1]}Z`; // a round chest in front
      const tip = [bz(1, 0), bz(1, 1)];
      // fish scales along the tail
      let scales = '';
      for (let i = 2; i < N - 2; i += 2) { const t = i / N, sx = bz(t, 0), sy = bz(t, 1), r = U.lerp(29, 5, Math.pow(t, 0.72)) * 0.55; scales += Ln(D`M${sx - r} ${sy + 2}Q${sx} ${sy + r * 0.9} ${sx + r} ${sy + 2}`, '#ffffff', 1.8, ' opacity=".35"'); }
      const fin = Gt(P(D`M0 0C${-10} ${-8} ${-24} ${-10} ${-30} ${-4}C${-22} ${-14} ${-18} ${-24} ${-16} ${-32}C${-6} ${-22} ${2} ${-12} 0 0Z`, 'url(#g3)', '', 3.2), tr(tip[0] + 2, tip[1] + 2, 40 + 8 * w));
      let dors = '';
      for (const t of [0.3, 0.48, 0.66]) dors += Gt(P('M-7 4Q-2 -12 9 -16Q4 -5 7 4Z', 'url(#g3)', '', 2.8), tr(bz(t, 0), bz(t, 1) - U.lerp(24, 10, t), -20 + t * 60));
      const hr = 30, hx = 146, hy = 78 + bob;
      // forelegs, bent as if galloping through the air
      const leg = (lx, ly, ang, far) => Gt(Tube(D`M0 0L7 24L3 40`, far ? U.shade(C.leg, -0.14) : C.leg, 15) + P(D`M-7 36H11L12 45H-8Z`, far ? '#4a3547' : '#5d4459', '', 2.8), tr(lx, ly, ang));
      const legFar = leg(126, 128 + bob, 30 + 8 * w * amp, 1), legNear = leg(114, 132 + bob, -10 - 8 * w * amp, 0);
      const headD = furHead(hx, hy, hr, hr * 0.96, 0.6);
      return {
        hx, hy, hr, fx: hx + hr * 0.27, fy: hy + hr * 0.1, cx: 96, cy: 130, rx: 60, ry: 34, float: true,
        earA: [-152, -58], hornA: [-128, -62], crestP: pt(hx, hy, hr * 0.9, -98), tailP: null, wingP: [100, 110], muzzleP: [hx + hr * 0.5, hy + hr * 0.44],
        back: dors + fin + legFar, mid: legNear, body: P(d, 'url(#gB)'), clip: d, belly: scales + belly(128, 124 + bob, 18, 14),
        head: P(headD, 'url(#gH)'), headClip: headD,
      };
    },

    round(x) {
      const { p } = x;
      const rx = U.lerp(53, 60, p), ry = U.lerp(50, 55, p);
      const cx = 100, cy = 180 - ry;
      const hr = Math.min(rx, ry);
      const clip = ellD(cx, cy, rx, ry);
      return {
        hx: cx, hy: cy - 4, hr, fx: cx + hr * 0.14, fy: cy - hr * 0.1, cx, cy, rx, ry, unified: true,
        earA: [-126, -60], hornA: [-114, -72], crestP: [cx + 4, cy - ry + 3],
        tailP: [cx - rx * 0.88, cy + ry * 0.38], wingP: [cx - rx * 0.45, cy - ry * 0.25],
        armP: [[cx - rx * 0.96, cy + ry * 0.2], [cx + rx * 0.95, cy + ry * 0.22]],
        back: hopFeet(x, cx, rx * 0.4, rx * 0.42, 181, 15, 9),
        body: P(clip, 'url(#gB)'), clip, belly: belly(cx + 8, cy + ry * 0.4, rx * 0.62, ry * 0.5),
      };
    },

    egg(x) {
      const { p } = x;
      const hw = U.lerp(44, 50, p), h = U.lerp(112, 130, p);
      const cx = 100, bot = 183, top = bot - h;
      const clip = D`M${cx} ${top}C${cx + hw * 0.62} ${top} ${cx + hw} ${top + h * 0.32} ${cx + hw} ${top + h * 0.6}C${cx + hw} ${top + h * 0.86} ${cx + hw * 0.6} ${bot} ${cx} ${bot}C${cx - hw * 0.6} ${bot} ${cx - hw} ${top + h * 0.86} ${cx - hw} ${top + h * 0.6}C${cx - hw} ${top + h * 0.32} ${cx - hw * 0.62} ${top} ${cx} ${top}Z`;
      const hr = hw * 0.92;
      return {
        hx: cx, hy: top + h * 0.38, hr, fx: cx + hr * 0.14, fy: top + h * 0.37, cx, cy: top + h * 0.6, rx: hw, ry: h / 2, unified: true,
        top, h, hw,
        earA: [-122, -62], hornA: [-112, -72], crestP: [cx + 2, top + 4],
        tailP: [cx - hw * 0.9, top + h * 0.76], wingP: [cx - hw * 0.5, top + h * 0.4],
        armP: [[cx - hw * 0.97, top + h * 0.64], [cx + hw * 0.97, top + h * 0.64]],
        back: hopFeet(x, cx, hw * 0.4, hw * 0.4, 183, 14, 8.5),
        body: P(clip, 'url(#gB)'), clip, belly: belly(cx + 6, top + h * 0.78, hw * 0.62, h * 0.23),
      };
    },

    bird(x) {
      const { p, C, a } = x;
      const br = U.lerp(41, 47, p), fly = a.pose === 'fly';
      const cx = 90, cy = 184 - 17 - br * 0.9 - (fly ? 22 : 0);
      const hr = U.lerp(33, 29, p), hx = cx + br * 0.8, hy = cy - br * 0.7;
      const legC = C.c3;
      let legs = '';
      const tk = x.hop ? x.hop.tuck : 0, hy0 = x.hop ? x.hop.fy * 0.6 : 0;
      [cx - 2, cx + 15].forEach((lx, i) => {
        const col = i ? legC : U.shade(legC, -0.12);
        const fx = lx - 2 - tk * 12, fy = 184 + hy0 - tk * 13;
        legs += Tube(D`M${lx} ${cy + br * 0.7}L${fx} ${fy}`, col, 4.2);
        legs += tk > 0.5 ? Tube(D`M${fx} ${fy}L${fx - 7} ${fy + 1.5}M${fx} ${fy}L${fx - 5} ${fy + 5}`, col, 2.6)
          : Tube(D`M${fx} ${fy}L${fx + 10} ${fy + 1}M${fx} ${fy}L${fx + 7} ${fy + 4.5}M${fx} ${fy}L${fx - 6} ${fy + 2}`, col, 2.8);
      });
      const clip = ellD(cx, cy, br * 1.08, br * 0.95);
      const headD = furHead(hx, hy, hr, hr, 0.6);
      // Libra's scales: a golden balance beam with a pan at each end hangs from the tucked feet and tips as it flies
      if (a.scales) {
        const tilt = x.ph != null ? 7 * osc(x.ph, 0.15) : 0, hx0 = cx + 4, hy0 = cy + br * 0.78, by = hy0 + 16, bw = 38;
        let sc = Ln(D`M${hx0} ${hy0}L${hx0} ${by}`, OL, 5) + Ln(D`M${hx0} ${hy0}L${hx0} ${by}`, '#ffd23f', 2.6);
        sc += Tube(D`M${hx0 - bw} ${by}L${hx0 + bw} ${by}`, '#ffd23f', 4.4) + Ci(hx0, by, 4.6, 'url(#gGold)', '', 2.2);
        for (const sd of [-1, 1]) {
          const ex = hx0 + sd * bw, py = by + 20;
          sc += Ln(D`M${ex} ${by}L${ex - 11} ${py}M${ex} ${by}L${ex + 11} ${py}`, '#c89a2a', 1.6);
          sc += P(D`M${ex - 14} ${py}Q${ex} ${py + 13} ${ex + 14} ${py}Z`, 'url(#gGold)', '', 2.6) + Ln(D`M${ex - 8} ${py + 2}Q${ex} ${py + 7} ${ex + 7} ${py + 2}`, '#fff6c0', 1.6, ' opacity=".7"');
        }
        legs += `<g transform="rotate(${f(tilt)} ${f(hx0)} ${f(by)})">${sc}</g>`;
      }
      // Equinyx flies before the equinox: a disc half day (gold, rays) and half night (indigo, stars)
      let pre = '';
      if (a.disc) {
        const dx = 92, dy = 86, R = 76, rot = x.ph != null ? 10 * osc(x.ph, 0.1) : 0;
        let rays = '';
        for (let i = 0; i < 7; i++) { const an = -80 + i * 27; const [ax, ay] = pt(dx, dy, R + 4, an - 5), [bx, by] = pt(dx, dy, R + 17, an), [ex, ey] = pt(dx, dy, R + 4, an + 5); rays += D`M${ax} ${ay}L${bx} ${by}L${ex} ${ey}Z`; }
        pre = `<g transform="rotate(${f(-30 + rot)} ${dx} ${dy})">` + P(rays, 'url(#gGold)', '', 2.6) +
          P(D`M${dx} ${dy - R}A${R} ${R} 0 0 1 ${dx} ${dy + R}Z`, 'url(#gGold)', '', 3.4) + P(D`M${dx} ${dy - R}A${R} ${R} 0 0 0 ${dx} ${dy + R}Z`, '#3b2e8f', '', 3.4) +
          [[dx - 50, dy - 34, 5], [dx - 58, dy + 16, 4], [dx - 34, dy + 50, 4.4], [dx - 24, dy - 58, 3.6]].map(([sx, sy, r]) => P(starD(sx, sy, r, r * 0.45), '#fff6c0', '', 1.4)).join('') +
          Ci(dx - 44, dy - 8, 11, '#fff4c8', '', 2.4) + Ci(dx - 39, dy - 12, 10, '#3b2e8f', '', 0.01) + '</g>';
      }
      return {
        pre,
        hx, hy, hr, fx: hx + hr * 0.18, fy: hy + hr * 0.02, cx, cy, rx: br * 1.08, ry: br * 0.95, bird: true, wingK: fly ? (a.wingK || 1.4) : 1,
        earA: [-140, -40], hornA: [-120, -70], crestP: pt(hx, hy, hr * 0.92, -112),
        tailP: [cx - br * 1.0, cy + br * 0.05], wingP: [cx - br * 0.08, cy - br * 0.22],
        back: legs, body: P(clip, 'url(#gB)'), clip,
        belly: belly(cx + br * 0.32, cy + br * 0.38, br * 0.72, br * 0.6),
        head: P(headD, 'url(#gH)'), headClip: headD,
      };
    },

    cloud(x) {
      const { p } = x;
      const rx = U.lerp(56, 66, p), ry = U.lerp(38, 44, p);
      const cx = 100, cy = 106;
      const clip = x.ph != null ? fluffyW(cx, cy, rx, ry, 10, 5.5, x.ph * (x.mv != null ? 1 : 1), x.mv != null ? 0.55 : 0.4) : fluffy(cx, cy, rx, ry, 10, 5.5);
      return {
        hx: cx, hy: cy, hr: ry * 1.08, fx: cx + 10, fy: cy + 2, cx, cy, rx, ry, unified: true, float: true, cloudArms: true,
        earA: [-130, -55], hornA: [-116, -70], crestP: [cx + 6, cy - ry - 5],
        tailP: [cx - rx * 0.5, cy + ry * 0.9], wingP: [cx - rx * 0.4, cy - ry * 0.3],
        armP: [[cx - rx * 1.02, cy + ry * 0.35], [cx + rx * 1.0, cy + ry * 0.4]],
        back: '', body: P(clip, 'url(#gB)'), clip,
        belly: belly(cx, cy + ry * 0.78, rx * 0.82, ry * 0.42, ' opacity=".85"'),
      };
    },

    crab(x) {
      const { p, C, a } = x;
      const rx = U.lerp(50, 60, p), ry = U.lerp(33, 39, p);
      const cx = 100, cy = 182 - ry * 1.05;
      const legC = U.shade(C.c1, -0.08);
      let back = '';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const bx = cx + s * (rx * 0.35 + i * 11), by = cy + ry * 0.35;
        const kx = cx + s * (rx * 0.86 + i * 7), ky = cy + ry * 0.2 - 4 + i * 3;
        const ex = cx + s * (rx * 0.8 + i * 12), ey = 185 - (i === 1 ? 0 : 2);
        const tube = Tube(D`M${bx} ${by}L${kx} ${ky}L${ex} ${ey}`, legC, 6.5);
        back += x.walk == null ? tube : `<g transform="rotate(${f(11 * Math.sin((x.walk + (i % 2) * 0.5 + (s > 0 ? 0.25 : 0)) * Math.PI * 2))} ${f(bx)} ${f(by)})">${tube}</g>`;
      }
      const es = x.ph != null ? (x.mv != null ? 3 : 2) * osc(x.ph, 0.1) : 0;
      const e1 = cx - rx * 0.3 + es, e2 = cx + rx * 0.3 + es * 0.8, ey = cy - ry - 16 - p * 4 + (x.ph != null ? 1.2 * osc(x.ph, 0.35) : 0);
      back += Tube(D`M${cx - rx * 0.22} ${cy - ry * 0.6}L${e1} ${ey}`, C.c1, 6.5) + Tube(D`M${cx + rx * 0.22} ${cy - ry * 0.6}L${e2} ${ey}`, C.c1, 6.5);
      const clip = D`M${cx - rx} ${cy + ry * 0.25}C${cx - rx} ${cy - ry * 1.15} ${cx + rx} ${cy - ry * 1.15} ${cx + rx} ${cy + ry * 0.25}C${cx + rx} ${cy + ry * 0.95} ${cx - rx} ${cy + ry * 0.95} ${cx - rx} ${cy + ry * 0.25}Z`;
      // Moontide carries a huge crescent-moon shell; Lunacrest floats before a full moon
      let pre = '', xf = '';
      if (a.shell === 'moon') {
        const q = 2.1 * (ry / 36), rr = x.ph != null ? 2 * osc(x.ph, 0.3) : 0;
        const cres = D`M${4 * q} ${-32 * q}C${-26 * q} ${-30 * q} ${-32 * q} ${6 * q} ${4 * q} ${14 * q}C${-12 * q} ${2 * q} ${-14 * q} ${-22 * q} ${4 * q} ${-32 * q}Z`;
        back = Gt(P(cres, 'url(#gMoon)', '', 4) + Ln(D`M${-5 * q} ${-22 * q}C${-12 * q} ${-14 * q} ${-12 * q} ${-4 * q} ${-4 * q} ${3 * q}`, U.shade('#e8dca0', -0.3), 2.4, ' opacity=".55"') +
          Ln(D`M${-2 * q} ${-26 * q}C${-8 * q} ${-20 * q} ${-9 * q} ${-12 * q} ${-7 * q} ${-6 * q}`, '#ffffff', 2, ' opacity=".6"'), tr(cx - rx * 0.05, cy - ry * 0.7, -32 + rr)) + back;
      }
      if (a.shell === 'fullmoon') {
        pre = `<circle cx="100" cy="92" r="70" fill="#fff8d8" opacity=".18"/>` + Ci(100, 92, 56, 'url(#gMoon)', '', 3.4) +
          [[80, 74, 9, 6], [118, 104, 12, 8], [106, 68, 6, 4], [84, 112, 7, 5]].map(([mx, my, mrx, mry]) => En(mx, my, mrx, mry, '#c9b98a', ' opacity=".45"')).join('') +
          En(84, 70, 18, 10, '#ffffff', ' opacity=".35" transform="rotate(-30 84 70)"');
      }
      if (a.float) xf = 'translate(0 -18)';
      return {
        xf, pre, bigClaw: a.bigClaw ? 1.4 : 1,
        hx: cx, hy: cy - ry * 0.1, hr: ry * 1.25, fx: cx, fy: cy - ry * 0.05, cx, cy, rx, ry, front: true, unified: true,
        eyes: [[e1, ey], [e2, ey]], eyeBall: true, mouthP: [cx, cy + ry * 0.12], markP: [cx, cy - ry * 0.52],
        crestP: [cx, cy - ry * 0.8], wingP: [cx - rx * 0.3, cy - ry * 0.5], claws: true,
        back, body: P(clip, 'url(#gB)'), clip, belly: belly(cx, cy + ry * 0.62, rx * 0.82, ry * 0.4),
      };
    },

    scorp(x) {
      const { p, C } = x;
      const rx = U.lerp(40, 47, p), ry = U.lerp(23, 27, p);
      const cx = 86, cy = 180 - ry;
      const hr = U.lerp(30, 27, p), hx = cx + rx * 0.98, hy = cy - ry * 0.45;
      const legC = U.shade(C.c1, -0.1);
      let legs = '';
      for (let i = 0; i < 3; i++) {
        const bx = cx - rx * 0.45 + i * rx * 0.42;
        const tube = Tube(D`M${bx} ${cy + ry * 0.4}L${bx - 8} ${cy + ry + 2}L${bx - 12} 186`, legC, 5.5);
        legs += x.walk == null ? tube : `<g transform="rotate(${f(15 * Math.sin((x.walk + (i % 2) * 0.5) * Math.PI * 2))} ${f(bx)} ${f(cy + ry * 0.4)})">${tube}</g>`;
      }
      const sw = x.ph != null ? (x.mv != null ? 1 : 0.7) : 0, sph = x.ph || 0;
      const P0 = [cx - rx * 0.78, cy - ry * 0.35], P1 = [cx - rx * 1.7, cy - ry * 1.9], P2 = [cx - rx * 1.25 + 7 * sw * osc(sph, -0.1), cy - ry * 4.4 + 2 * sw * osc(sph, 0.15)], P3 = [cx + rx * 0.05 + 9 * sw * osc(sph, -0.2), cy - ry * 4.3 + 3 * sw * osc(sph, 0.05)];
      const bz = (t, i) => (1 - t) ** 3 * P0[i] + 3 * (1 - t) ** 2 * t * P1[i] + 3 * (1 - t) * t * t * P2[i] + t ** 3 * P3[i];
      let tail = Gt(P(D`M-6 -5C5 -7 15 1 15 14C9 8 3 6 -6 6Z`, 'url(#g3)'), tr(P3[0], P3[1], 8, U.lerp(1, 1.2, p)));
      const N = 9;
      for (let j = N - 1; j >= 0; j--) {
        const t = (j / (N - 1)) * 0.95;
        tail += Ci(bz(t, 0), bz(t, 1), U.lerp(14, 7.5, j / (N - 1)) * U.lerp(1, 1.12, p), 'url(#gB)', '', 3.8);
      }
      const clip = ellD(cx, cy, rx, ry);
      const headD = ellD(hx, hy, hr, hr * 0.95);
      const rear = x.a.pose === 'rear' && x.mv == null;
      const pvx = cx - rx * 0.6, pvy = 186;
      return {
        xf: x.a.float ? 'translate(4 -22) scale(.94)' : rear ? `translate(${f(pvx)} ${f(pvy)}) rotate(-16) scale(.94) translate(${f(-pvx)} ${f(-pvy)})` : '', wingK: x.a.wingK || 1, wingRot: x.a.float ? -18 : 0, flapK: x.a.float ? 1.6 : 1,
        hx, hy, hr, fx: hx + hr * 0.22, fy: hy + hr * 0.06, cx, cy, rx, ry, scorpClaws: true,
        earA: [-140, -45], hornA: [-120, -70], crestP: [cx - rx * 0.05, cy - ry * 0.92],
        wingP: [cx - rx * 0.1, cy - ry * 0.8],
        back: tail + legs, body: P(clip, 'url(#gB)'), clip,
        belly: belly(cx + rx * 0.1, cy + ry * 0.62, rx * 0.8, ry * 0.45),
        head: P(headD, 'url(#gH)'), headClip: headD,
      };
    },

    fish(x) {
      const { p } = x;
      const rx = U.lerp(54, 60, p), ry = U.lerp(39, 42, p);
      const cx = 104, cy = 106;
      const clip = D`M${cx + rx} ${cy}C${cx + rx} ${cy - ry * 1.12} ${cx - rx * 0.35} ${cy - ry * 1.15} ${cx - rx} ${cy - ry * 0.12}L${cx - rx} ${cy + ry * 0.12}C${cx - rx * 0.35} ${cy + ry * 1.15} ${cx + rx} ${cy + ry * 1.12} ${cx + rx} ${cy}Z`;
      return {
        hx: cx + rx * 0.35, hy: cy, hr: ry, fx: cx + rx * 0.42, fy: cy - ry * 0.08, cx, cy, rx, ry, unified: true, float: true,
        earP: [[cx + rx * 0.0, cy - ry * 0.66, -58], [cx + rx * 0.22, cy - ry * 0.8, -30]],
        crestP: [cx - rx * 0.12, cy - ry * 0.9], tailP: [cx - rx + 5, cy], defaultTail: 'fin', defaultCrest: 'fin',
        wingP: [cx - rx * 0.2, cy - ry * 0.4], finP: [cx + rx * 0.06, cy + ry * 0.5],
        back: '', body: P(clip, 'url(#gB)'), clip, belly: belly(cx + rx * 0.2, cy + ry * 0.62, rx * 0.8, ry * 0.45),
      };
    },

    serpent(x) {
      const { p, C } = x;
      const T = U.lerp(30, 33, p);
      const w = x.mv != null ? 1 : x.t != null ? 0.4 : 0, q = x.mv != null ? x.mv : (x.t || 0);
      const o = (amp, off) => amp * w * osc(q, off);
      const tailE = [50 + o(3, 0.5), 167 + o(-6, 0.25)];
      const path = D`M${tailE[0]} ${tailE[1]}C68 ${183 + o(4, 0)} 124 ${183 + o(-4, 0.25)} 138 ${166 + o(2, 0.4)}C${150 + o(6, 0.1)} 146 ${126 + o(-6, 0.1)} 134 118 116C110 98 116 88 128 80`;
      const fin = (x0, y0, r) => Gt(P('M-9 4Q-2 -16 11 -20Q5 -7 9 4Z', 'url(#g3)', '', 3.2), tr(x0, y0, r));
      const back = fin(152 + o(4, 0.1), 150, 80 + o(6, 0.2)) + fin(106, 108, -80 + o(9, 0.3)) + fin(110, 90, -62 + o(7, 0.35));
      const body = Tube(path, C.c1, T) + Ln(path, U.shade(C.c1, 0.16), T * 0.3, ' opacity=".55"') +
        Ln(path, C.c2, T * 0.14, ' opacity=".55" stroke-dasharray="2.5 8"');
      const headD = 'M110 66C108 38 142 25 163 37C178 44 192 55 190 73C188 90 169 96 152 94C131 98 112 90 110 66Z';
      return {
        hx: 150, hy: 64, hr: 33, fx: 158, fy: 58, cx: 104, cy: 142, rx: 56, ry: 40, serpent: true,
        earP: [[122, 48, -72], [133, 38, -40]], crestP: [130, 42], tailP: tailE, wingP: [100, 122],
        mouthP: [177, 81], markP: [148, 42],
        back, body, clip: null, belly: '',
        head: P(headD, 'url(#gH)'), headClip: headD,
      };
    },
  };

  /* ================= FEATURES ================= */
  function ear(type, x, i) {
    const { C, k } = x;
    const w = 13 * k, h = 26 * k;
    switch (type) {
      case 'cat':
        return P(D`M${-w} ${5 * k}Q${-w * 0.55} ${-h * 0.55} ${-w * 0.06} ${-h}Q${w * 0.3} ${-h * 0.8} ${w * 0.55} ${-h * 0.5}Q${w * 0.85} ${-h * 0.1} ${w} ${5 * k}Z`, 'url(#gH)') +
          Pn(D`M${-w * 0.52} ${2 * k}Q${-w * 0.3} ${-h * 0.42} ${-w * 0.05} ${-h * 0.72}Q${w * 0.3} ${-h * 0.4} ${w * 0.5} ${2 * k}Z`, C.inner);
      case 'round':
        return Ci(0, -h * 0.3, w * 0.95, 'url(#gH)') + Cn(0, -h * 0.3, w * 0.52, C.inner);
      case 'long':
        return P(D`M${-w * 0.55} ${5 * k}C${-w * 0.95} ${-h * 0.7} ${-w * 0.45} ${-h * 1.4} 0 ${-h * 1.4}C${w * 0.45} ${-h * 1.4} ${w * 0.95} ${-h * 0.7} ${w * 0.55} ${5 * k}Z`, 'url(#gH)') +
          Pn(D`M${-w * 0.25} 0C${-w * 0.5} ${-h * 0.6} ${-w * 0.25} ${-h * 1.15} 0 ${-h * 1.15}C${w * 0.25} ${-h * 1.15} ${w * 0.5} ${-h * 0.6} ${w * 0.25} 0Z`, C.inner);
      case 'droop':
        return P(D`M${-w * 0.5} ${4 * k}C${-w * 0.85} ${-h * 0.45} ${-w * 0.45} ${-h * 0.98} 0 ${-h * 0.98}C${w * 0.45} ${-h * 0.98} ${w * 0.85} ${-h * 0.45} ${w * 0.5} ${4 * k}Z`, 'url(#gH)') +
          Pn(D`M${-w * 0.22} ${-h * 0.1}C${-w * 0.42} ${-h * 0.45} ${-w * 0.22} ${-h * 0.78} 0 ${-h * 0.78}C${w * 0.22} ${-h * 0.78} ${w * 0.42} ${-h * 0.45} ${w * 0.22} ${-h * 0.1}Z`, C.inner, ' opacity=".8"');
      case 'deer':
        return P(D`M${-w * 0.45} ${4 * k}C${-w * 1.05} ${-h * 0.5} ${-w * 0.35} ${-h * 1.05} ${w * 0.1} ${-h * 1.1}C${w * 0.5} ${-h * 0.8} ${w * 0.8} ${-h * 0.4} ${w * 0.45} ${4 * k}Z`, 'url(#gH)') +
          Pn(D`M${-w * 0.2} ${-h * 0.1}C${-w * 0.55} ${-h * 0.5} ${-w * 0.15} ${-h * 0.85} ${w * 0.08} ${-h * 0.88}C${w * 0.3} ${-h * 0.6} ${w * 0.42} ${-h * 0.35} ${w * 0.2} ${-h * 0.1}Z`, C.inner);
      case 'antenna': {
        const d = D`M0 ${4 * k}Q${-w * 0.5} ${-h * 0.55} ${w * 0.25} ${-h * 1.05}`;
        const tx = w * 0.25, ty = -h * 1.05 - 4 * k;
        const tip = x.legend ? P(starD(tx, ty, 9 * k, 4 * k), 'url(#gGold)', '', 3)
          : Ci(tx, ty, 6.5 * k, 'url(#g3)', '', 3.4) + Cn(tx - 2 * k, ty - 2 * k, 2.2 * k, '#fff', ' opacity=".8"');
        return Tube(d, U.shade(C.c1, -0.12), 3.2 * k + 0.8) + tip;
      }
      case 'gills': {
        let s = '';
        for (const j of [-1, 0, 1]) s += Gt(P(D`M0 ${2 * k}C${-5 * k} ${-6 * k} ${-5 * k} ${-h * 0.7} 0 ${-h * 0.92}C${5 * k} ${-h * 0.7} ${5 * k} ${-6 * k} 0 ${2 * k}Z`, 'url(#g3)', '', 3.2), `rotate(${j * 32})`);
        return s;
      }
      case 'fin':
        return P(D`M${-w * 0.8} ${5 * k}Q${-w * 0.3} ${-h * 0.7} ${w * 0.6} ${-h * 1.05}Q${w * 0.2} ${-h * 0.4} ${w * 0.8} ${5 * k}Z`, 'url(#g3)') +
          Ln(D`M${-w * 0.2} ${2 * k}L${w * 0.35} ${-h * 0.7}M${w * 0.3} ${2 * k}L${w * 0.5} ${-h * 0.5}`, U.shade(C.c3, -0.2), 1.8);
      case 'flame':
        return flame(0.8 * k, x.anim);
    }
    return '';
  }
  function ears(type, x, B) {
    let s = '';
    const pos = B.earP || B.earA.map(ang => { const [px, py] = pt(B.hx, B.hy, B.hr * 0.84, ang); return [px, py, ang + 90]; });
    pos.forEach(([px, py, rot], i) => {
      let r = rot;
      if (type === 'droop') r += i === 0 ? -76 : 76;
      if (type === 'deer') r += i === 0 ? -18 : 18;
      if (x.ph != null) {
        const amp = { antenna: 8, gills: 7, fin: 5, long: 3, droop: 3, deer: 2.5, cat: 1.5, round: 1.5, flame: 4 }[type] || 2;
        r += x.hop && type === 'antenna' ? x.hop.crest * 1.2 : amp * osc(x.ph, -0.2 - i * 0.12) * (x.mv != null ? 1.3 : 1);
      }
      s += Gt(ear(type, x, i), tr(px, py, r));
    });
    return s;
  }

  function horns(type, x, B) {
    const { C, k, p, a } = x;
    const hr = B.hr;
    let s = '';
    const ridge = (d, w) => Ln(d, U.shade(C.hornC, -0.28), w, ' stroke-dasharray="1.6 5.2" opacity=".5"');
    switch (type) {
      case 'nub':
        for (const ang of B.hornA) {
          const [hx, hy] = pt(B.hx, B.hy, hr * 0.9, ang);
          s += Gt(P(D`M${-6 * k} ${4 * k}Q${-5 * k} ${-9 * k} 0 ${-12 * k}Q${5 * k} ${-9 * k} ${6 * k} ${4 * k}Z`, 'url(#gHo)', '', 3.4), tr(hx, hy, ang + 90));
        }
        break;
      case 'ram': {
        const q = k * U.lerp(0.95, 1.2, p) * (a.hornK || 1);
        const d = D`M0 0C${12 * q} ${-14 * q} ${33 * q} ${-9 * q} ${35 * q} ${8 * q}C${37 * q} ${25 * q} ${21 * q} ${32 * q} ${12 * q} ${25 * q}C${5 * q} ${20 * q} ${8 * q} ${11 * q} ${15 * q} ${13 * q}`;
        for (const i of [0, 1]) {
          const [hx, hy] = pt(B.hx, B.hy, hr * 0.7, i ? -40 : -140);
          s += Gt(Tube(d, 'url(#gHo)', 11 * q) + ridge(d, 10 * q), tr(hx, hy) + (i ? '' : ' scale(-1 1)'), i ? '' : ' opacity=".96"');
        }
        break;
      }
      case 'bull': {
        const q = k * U.lerp(0.9, 1.15, p) * (a.hornK || 1);
        const d = D`M${-7 * q} ${5 * q}C${8 * q} ${7 * q} ${24 * q} 0 ${30 * q} ${-22 * q}C${31 * q} ${-29 * q} ${26 * q} ${-31 * q} ${23 * q} ${-25 * q}C${17 * q} ${-12 * q} ${7 * q} ${-7 * q} ${-7 * q} ${-7 * q}Z`;
        for (const i of [0, 1]) {
          const [hx, hy] = pt(B.hx, B.hy, hr * 0.8, i ? -32 : -150);
          s += Gt(P(d, 'url(#gHo)'), tr(hx, hy) + (i ? '' : ' scale(-1 1)'));
        }
        break;
      }
      case 'goat': {
        const q = k * U.lerp(0.72, 1.22, p) * (a.hornK || 1);
        const d = D`M${-5 * q} ${3 * q}C${-9 * q} ${-16 * q} ${-24 * q} ${-33 * q} ${-46 * q} ${-28 * q}C${-32 * q} ${-24 * q} ${-15 * q} ${-11 * q} ${7 * q} ${2 * q}Z`;
        const rd = D`M${0} ${0}C${-6 * q} ${-14 * q} ${-20 * q} ${-26 * q} ${-38 * q} ${-26 * q}`;
        [[-104, 1], [-76, 0]].forEach(([ang, back]) => {
          const [hx, hy] = pt(B.hx, B.hy, hr * 0.86, ang);
          s += Gt(P(d, 'url(#gHo)') + ridge(rd, 6 * q) + (back ? P(d, '#000', ' fill-opacity=".14"', 0.01) : ''), tr(hx, hy));
        });
        break;
      }
      case 'antler': {
        const q = k * U.lerp(0.8, 1.25, p) * (a.hornK || 1);
        const main = D`M0 0C${-2 * q} ${-14 * q} ${6 * q} ${-26 * q} ${2 * q} ${-40 * q}`;
        const t1 = D`M${1 * q} ${-16 * q}C${8 * q} ${-19 * q} ${13 * q} ${-22 * q} ${16 * q} ${-30 * q}`;
        const t2 = D`M${3 * q} ${-28 * q}C${-4 * q} ${-31 * q} ${-8 * q} ${-35 * q} ${-10 * q} ${-43 * q}`;
        const tips = a.flameTips ? [[2 * q, -40 * q], [16 * q, -30 * q], [-10 * q, -43 * q]].map(([tx, ty]) => Gt(flame(0.42 * q, x.anim), tr(tx, ty + 3 * q))).join('') : '';
        const one = Ln(main + t1 + t2, OL, 5.5 * q + SW * 2) + Ln(main + t1 + t2, C.hornC, 5.5 * q) + tips;
        [[-122, 1], [-66, 0]].forEach(([ang, mir]) => {
          const [hx, hy] = pt(B.hx, B.hy, hr * 0.86, ang);
          s += Gt(one, tr(hx, hy, mir ? -18 : 12) + (mir ? ' scale(-1 1)' : ''));
        });
        break;
      }
      case 'crystal': {
        const q = k * U.lerp(0.85, 1.15, p);
        const prism = sc => P(D`M0 0L${-5 * sc} ${-5 * sc}L${-4 * sc} ${-22 * sc}L0 ${-29 * sc}L${4 * sc} ${-22 * sc}L${5 * sc} ${-5 * sc}Z`, 'url(#gHo)', '', 3.2) + Ln(D`M0 ${-3 * sc}L0 ${-26 * sc}`, '#fff', 1.6, ' opacity=".6"');
        const [hx, hy] = pt(B.hx, B.hy, hr * 0.9, -96);
        s += Gt(Gt(prism(0.8 * q), 'rotate(-30)') + Gt(prism(0.8 * q), 'rotate(30)') + prism(1.1 * q), tr(hx, hy));
        break;
      }
    }
    return s;
  }

  const CREST_LAYER = {
    tuft: 'front', flame: 'back', sprout: 'back', bud: 'back', flower: 'front', flowercrown: 'front', drop: 'back', bolt: 'back',
    mane: 'mid', flamemane: 'mid', crown: 'front', halo: 'front', moon: 'front', star: 'back', cloud: 'back', fin: 'back',
    spikes: 'back', wool: 'front', plume: 'back', sunrays: 'back',
  };
  function crest(type, x, B) {
    const { C, k } = x;
    let [cx, cy] = B.crestP;
    if (type === 'moon' && B.claws) { cx = B.cx + B.rx * 0.68; cy = B.cy - B.ry * 0.12; }  // crab: crescent emblem on the shell
    const CS = { sprout: 5, bud: 5, flower: 4, plume: 5, drop: 3, bolt: 3, star: 5, fin: 3, cloud: 3, tuft: 2.5 };
    let cr = 0;
    if (x.ph != null && CS[type]) cr = x.hop ? x.hop.crest * CS[type] / 5 : CS[type] * osc(x.ph, -0.15) * (x.mv != null ? 1.4 : 1);
    if (x.ph != null && type === 'halo') cy += 1.8 * osc(x.ph, 0.1);
    const T = inner => Gt(inner, tr(cx, cy, cr));
    switch (type) {
      case 'tuft':
        return T(P(D`M${-12 * k} ${5 * k}C${-17 * k} ${-9 * k} ${-6 * k} ${-21 * k} ${8 * k} ${-19 * k}C${1 * k} ${-15 * k} ${1 * k} ${-8 * k} ${5 * k} ${-3 * k}C${9 * k} ${-11 * k} ${18 * k} ${-11 * k} ${21 * k} ${-4 * k}C${14 * k} ${-2 * k} ${12 * k} ${2 * k} ${12 * k} ${6 * k}Z`, 'url(#g3)', '', 3.6));
      case 'flame':
        return T(flame(1.05 * k, x.anim));
      case 'sprout':
        return T(Tube(D`M0 ${4 * k}Q${2 * k} ${-8 * k} 0 ${-15 * k}`, '#5aa83e', 3 * k) +
          P(D`M0 ${-13 * k}C${-8 * k} ${-25 * k} ${-22 * k} ${-22 * k} ${-24 * k} ${-14 * k}C${-16 * k} ${-8 * k} ${-6 * k} ${-8 * k} 0 ${-13 * k}Z`, 'url(#g3)', '', 3.2) +
          P(D`M0 ${-14 * k}C${8 * k} ${-29 * k} ${25 * k} ${-26 * k} ${27 * k} ${-16 * k}C${18 * k} ${-9 * k} ${7 * k} ${-9 * k} 0 ${-14 * k}Z`, 'url(#g3)', '', 3.2));
      case 'bud':
        return T(Tube(D`M0 ${4 * k}Q${3 * k} ${-6 * k} 0 ${-12 * k}`, '#5aa83e', 3 * k) +
          P(D`M0 ${-34 * k}C${9 * k} ${-26 * k} ${10 * k} ${-16 * k} ${6 * k} ${-11 * k}C${3 * k} ${-8 * k} ${-3 * k} ${-8 * k} ${-6 * k} ${-11 * k}C${-10 * k} ${-16 * k} ${-9 * k} ${-26 * k} 0 ${-34 * k}Z`, 'url(#g3)', '', 3.4) +
          P(D`M${-8 * k} ${-10 * k}Q${-2 * k} ${-18 * k} 0 ${-12 * k}Q${2 * k} ${-18 * k} ${8 * k} ${-10 * k}Q0 ${-6 * k} ${-8 * k} ${-10 * k}Z`, '#6fcf5a', '', 2.6));
      case 'flower': {
        let s = '';
        for (let i = 0; i < 5; i++) s += Gt(E(0, -9 * k, 6.5 * k, 10 * k, 'url(#g3)', '', 3), `rotate(${i * 72})`);
        return T(Gt(s + Ci(0, 0, 5.5 * k, '#ffe066', '', 3), `translate(0 ${f(-11 * k)})`));
      }
      case 'flowercrown': {
        let s = '';
        for (const ang of [-128, -60]) {
          const [lx, ly] = pt(B.hx, B.hy, B.hr * 0.97, ang);
          s += Gt(P(D`M0 0C${-4 * k} ${-6 * k} ${-12 * k} ${-6 * k} ${-14 * k} 0C${-10 * k} ${4 * k} ${-4 * k} ${4 * k} 0 0Z`, '#6fcf5a', '', 2.6), tr(lx, ly, ang + 180 + 20));
        }
        for (const [ang, sc] of [[-145, 0.8], [-94, 1.05], [-45, 0.8]]) {
          const [px, py] = pt(B.hx, B.hy, B.hr * 0.93, ang);
          let fl = '';
          for (let i = 0; i < 5; i++) fl += Gt(E(0, -5.5 * k * sc, 4.2 * k * sc, 6.2 * k * sc, 'url(#g3)', '', 2.6), `rotate(${i * 72})`);
          s += Gt(fl + Ci(0, 0, 3.4 * k * sc, '#ffe066', '', 2.4), tr(px, py));
        }
        return s;
      }
      case 'drop':
        return T(P(D`M0 ${-30 * k}C${8 * k} ${-18 * k} ${12 * k} ${-12 * k} ${12 * k} ${-5 * k}C${12 * k} ${3 * k} ${6 * k} ${7 * k} 0 ${7 * k}C${-6 * k} ${7 * k} ${-12 * k} ${3 * k} ${-12 * k} ${-5 * k}C${-12 * k} ${-12 * k} ${-8 * k} ${-18 * k} 0 ${-30 * k}Z`, 'url(#g3)', '', 3.6) +
          En(-4 * k, -6 * k, 3 * k, 5 * k, '#fff', ' opacity=".7"'));
      case 'bolt':
        return T(P(D`M${-4 * k} ${5 * k}L${5 * k} ${-12 * k}L${-1 * k} ${-12 * k}L${7 * k} ${-31 * k}L${-9 * k} ${-8 * k}L${-2 * k} ${-8 * k}L${-11 * k} ${5 * k}Z`, 'url(#g3)', '', 3.6));
      case 'mane': case 'flamemane': {
        const [mx, my] = B.maneP || [B.hx, B.hy];
        const maneD = (R1, R2) => {
          const n = 13, step = 360 / n;
          const s0 = pt(mx, my, R2, -90);
          let d = D`M${s0[0]} ${s0[1]}`;
          for (let i = 1; i <= n; i++) {
            const aTip = -90 + (i - 0.5) * step, aEnd = -90 + i * step;
            const tip = pt(mx, my, R1, aTip + (type === 'flamemane' ? 9 : 0)), end = pt(mx, my, R2, aEnd);
            if (type === 'flamemane') {
              const q1 = pt(mx, my, R1 * 0.84, aTip - step * 0.32), q2 = pt(mx, my, R2 * 1.1, aEnd - step * 0.1);
              d += D`Q${q1[0]} ${q1[1]} ${tip[0]} ${tip[1]}Q${q2[0]} ${q2[1]} ${end[0]} ${end[1]}`;
            } else d += D`L${tip[0]} ${tip[1]}L${end[0]} ${end[1]}`;
          }
          return d + 'Z';
        };
        const R1 = B.hr * U.lerp(1.3, 1.55, x.p), R2 = B.hr * 1.08;
        const g = P(maneD(R1, R2), 'url(#gM)') + (type === 'flamemane' ? Pn(maneD(R1 * 0.84, R2 * 0.96), '#ffd24a', ' opacity=".55"') : '');
        if (x.ph != null && type === 'flamemane') return `<g transform="translate(${f(mx)} ${f(my)}) rotate(${f(3 * osc(x.ph))}) scale(${f3(1.02 + 0.02 * osc(x.ph, 0.25))}) translate(${f(-mx)} ${f(-my)})">${g}</g>`;
        return x.anim && type === 'flamemane' ? `<g class="mn" style="transform-origin:${f(mx)}px ${f(my)}px">${g}</g>` : g;
      }
      case 'sunrays': {
        // a slowly turning sunburst behind the mane: 12 rays, long and short, trading lengths as it turns 30° — so the
        // loop ends on the picture it began with
        const [mx, my] = B.maneP || [B.hx, B.hy];
        const n = 12, R1 = B.hr * 2.1, R2 = B.hr * 1.25, w = 360 / n / 2 * 0.62, ph = x.ph != null ? x.ph : 0;
        let d = '';
        for (let i = 0; i < n; i++) {
          const a0 = i * 360 / n, L = R1 * (1 - 0.22 * (i % 2 ? 1 - ph : ph));
          const [ax, ay] = pt(mx, my, R2, a0 - w), [bx, by] = pt(mx, my, L, a0), [ex, ey] = pt(mx, my, R2, a0 + w);
          d += D`M${ax} ${ay}L${bx} ${by}L${ex} ${ey}Z`;
        }
        const rr = x.ph != null ? x.ph * 30 : 0;
        return `<g transform="rotate(${f(rr)} ${f(mx)} ${f(my)})">` + P(d, 'url(#gGold)', '', 3) + '</g>';
      }
      case 'crown':
        return T(P(D`M${-13 * k} ${2 * k}L${-16 * k} ${-15 * k}L${-7 * k} ${-7 * k}L0 ${-19 * k}L${7 * k} ${-7 * k}L${16 * k} ${-15 * k}L${13 * k} ${2 * k}Z`, 'url(#gGold)', '', 3.4) +
          Cn(0, -4 * k, 2.6 * k, '#ff5d8f') + Cn(-9 * k, -3 * k, 2 * k, '#5fd4ff') + Cn(9 * k, -3 * k, 2 * k, '#5fd4ff'));
      case 'halo': {
        const y = cy - 20 * k;
        return `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(19 * k)}" ry="${f(6 * k)}" fill="none" stroke="#fff6b0" stroke-width="${f(14 * k)}" opacity=".25"/>` +
          `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(19 * k)}" ry="${f(6 * k)}" fill="none" stroke="${OL}" stroke-width="${f(3.6 * k + 5)}"/>` +
          `<ellipse cx="${f(cx)}" cy="${f(y)}" rx="${f(19 * k)}" ry="${f(6 * k)}" fill="none" stroke="#ffe680" stroke-width="${f(3.6 * k)}"/>`;
      }
      case 'moon':
        return T(Gt(P(D`M0 ${-30 * k}C${-18 * k} ${-26 * k} ${-21 * k} ${2 * k} ${3 * k} ${8 * k}C${-8 * k} ${-2 * k} ${-10 * k} ${-20 * k} 0 ${-30 * k}Z`, '#fff1a8', '', 3.4), 'rotate(-24)'));
      case 'star':
        return T(Tube(D`M0 ${4 * k}Q${-5 * k} ${-8 * k} ${2 * k} ${-16 * k}`, U.shade(C.c1, -0.1), 3 * k) + P(starD(2 * k, -22 * k, 10 * k, 4.4 * k), 'url(#gGold)', '', 3.2));
      case 'cloud':
        return T(P(fluffy(-4 * k, -8 * k, 26 * k, 14 * k, 8, 3.2 * k), '#f4f8ff', '', 3.6));
      case 'fin':
        return T(P(D`M${-16 * k} ${6 * k}Q${-8 * k} ${-22 * k} ${14 * k} ${-30 * k}Q${6 * k} ${-12 * k} ${16 * k} ${6 * k}Z`, 'url(#g3)', '', 3.6) +
          Ln(D`M${-6 * k} ${4 * k}L${4 * k} ${-18 * k}M${4 * k} ${4 * k}L${9 * k} ${-12 * k}`, U.shade(C.c3, -0.2), 1.8));
      case 'spikes': {
        let s = '';
        for (const o of [-1, 0, 1]) s += P(D`M${o * 15 * k - 7 * k} ${4 * k}L${o * 15 * k + 1 * k} ${(-15 + Math.abs(o) * 4) * k}L${o * 15 * k + 7 * k} ${4 * k}Z`, 'url(#g3)', '', 3.4);
        return T(s);
      }
      case 'wool':
        return T(P(fluffy(0, -2 * k, 16 * k, 10 * k, 7, 2.6 * k), 'url(#gWool)', '', 3.6));
      case 'plume': {
        let s = '';
        for (const [r, sc] of [[-38, 1], [-14, 1.2], [10, 0.9]]) {
          s += Gt(P(D`M0 ${3 * k}C${-6 * k} ${-6 * k} ${-5 * k} ${-18 * k * sc} 0 ${-24 * k * sc}C${5 * k} ${-18 * k * sc} ${6 * k} ${-6 * k} 0 ${3 * k}Z`, 'url(#gPl)', '', 3.2), `rotate(${r})`);
        }
        return T(s);
      }
    }
    return '';
  }

  function tail(type, x, B) {
    const { C, k, anim } = x;
    const [tx, ty] = B.tailP;
    let s = '';
    switch (type) {
      case 'fluff':
        s = P(fluffy(tx - 9 * k, ty, 12 * k, 10.5 * k, 7, 2.4 * k), 'url(#gWool)', '', 3.6); break;
      case 'flame':
        s = Tube(D`M${tx + 4} ${ty}Q${tx - 14 * k} ${ty + 2 * k} ${tx - 20 * k} ${ty - 14 * k}`, C.leg, 7 * k) +
          Gt(flame(0.62 * k, anim), tr(tx - 20 * k, ty - 12 * k, -35)); break;
      case 'tuft': case 'flametuft': {
        const ex = tx - 24 * k, ey = ty - 22 * k;
        s = Tube(D`M${tx + 4} ${ty}C${tx - 14 * k} ${ty + 4 * k} ${tx - 20 * k} ${ty - 6 * k} ${ex} ${ey}`, C.leg, 5 * k);
        s += type === 'flametuft' ? Gt(flame(0.55 * k, anim), tr(ex, ey + 4 * k, -20))
          : Gt(P(D`M${-7 * k} ${4 * k}C${-10 * k} ${-6 * k} ${-4 * k} ${-12 * k} 0 ${-15 * k}C${4 * k} ${-12 * k} ${10 * k} ${-6 * k} ${7 * k} ${4 * k}C${4 * k} ${8 * k} ${-4 * k} ${8 * k} ${-7 * k} ${4 * k}Z`, 'url(#g3)', '', 3.2), tr(ex, ey + 3 * k, -25));
        break;
      }
      case 'short':
        s = P(D`M${tx + 6} ${ty - 4 * k}L${tx - 12 * k} ${ty - 12 * k}Q${tx - 13 * k} ${ty - 4 * k} ${tx + 4} ${ty + 6 * k}Z`, 'url(#g2)', '', 3.4); break;
      case 'bolt': {
        const q = 1.45 * k;
        s = Gt(P(D`M${-4 * q} ${5 * q}L${5 * q} ${-12 * q}L${-1 * q} ${-12 * q}L${7 * q} ${-31 * q}L${-9 * q} ${-8 * q}L${-2 * q} ${-8 * q}L${-11 * q} ${5 * q}Z`, 'url(#g3)', '', 3.6), tr(tx + 2, ty, -58));
        break;
      }
      case 'feather':
        for (const [r, sc] of [[196, 1], [172, 1.18], [150, 0.95]]) {
          s += Gt(P(D`M0 0C${6 * k} ${-7 * k * sc} ${24 * k * sc} ${-8 * k} ${32 * k * sc} 0C${24 * k * sc} ${8 * k} ${6 * k} ${7 * k * sc} 0 0Z`, 'url(#gB)', '', 3.4), tr(tx + 4, ty, r));
        }
        break;
      case 'cloud': {
        const o = (amp, off) => (x.ph != null ? amp * osc(x.ph, off) * (x.mv != null ? 1.5 : 1) : 0);
        s = P(fluffy(tx - 4 * k + o(2, 0), ty + 6 * k + o(1.5, 0.2), 12 * k, 9 * k, 7, 2 * k), 'url(#gB)', '', 3.4) +
          P(fluffy(tx - 20 * k + o(4, -0.15), ty + 16 * k + o(2.5, 0.05), 8 * k, 6 * k, 6, 1.6 * k), 'url(#gB)', '', 3.2) +
          P(fluffy(tx - 31 * k + o(6, -0.3), ty + 23 * k + o(3.5, -0.1), 5 * k, 4 * k, 5, 1.2 * k), 'url(#gB)', '', 3); break;
      }
      case 'fin':
        s = P(D`M${tx + 6} ${ty}C${tx - 12 * k} ${ty - 22 * k} ${tx - 30 * k} ${ty - 34 * k} ${tx - 40 * k} ${ty - 30 * k}C${tx - 32 * k} ${ty - 14 * k} ${tx - 32 * k} ${ty + 14 * k} ${tx - 40 * k} ${ty + 30 * k}C${tx - 30 * k} ${ty + 34 * k} ${tx - 12 * k} ${ty + 22 * k} ${tx + 6} ${ty}Z`, 'url(#g3)') +
          Ln(D`M${tx - 6 * k} ${ty - 3 * k}L${tx - 30 * k} ${ty - 22 * k}M${tx - 8 * k} ${ty}L${tx - 32 * k} ${ty}M${tx - 6 * k} ${ty + 3 * k}L${tx - 30 * k} ${ty + 22 * k}`, U.shade(C.c3, -0.18), 1.8); break;
      case 'fishtail': {
        const d = D`M${tx + 4} ${ty}C${tx - 18 * k} ${ty - 2 * k} ${tx - 30 * k} ${ty - 16 * k} ${tx - 26 * k} ${ty - 34 * k}`;
        s = Tube(d, C.c3, 13 * k) + Ln(d, U.shade(C.c3, -0.2), 12 * k, ' stroke-dasharray="2.5 6" opacity=".35"') +
          Gt(P(D`M0 0C${-8 * k} ${-6 * k} ${-18 * k} ${-8 * k} ${-24 * k} ${-4 * k}C${-16 * k} ${-12 * k} ${-12 * k} ${-20 * k} ${-12 * k} ${-26 * k}C${-4 * k} ${-18 * k} ${2 * k} ${-10 * k} 0 0Z`, 'url(#g3)', '', 3.4), tr(tx - 26 * k, ty - 32 * k, 20));
        break;
      }
      case 'comet':
        s = `<path d="${D`M${tx + 4} ${ty - 7 * k}C${tx - 18 * k} ${ty - 16 * k} ${tx - 36 * k} ${ty - 12 * k} ${tx - 58 * k} ${ty - 28 * k}C${tx - 46 * k} ${ty - 4 * k} ${tx - 26 * k} ${ty + 8 * k} ${tx + 4} ${ty + 8 * k}Z`}" fill="url(#gCo)"${stroke(3)}/>` +
          P(sparkD(tx - 30 * k, ty - 8 * k, 4 * k), '#fff8c8', '', 1.6) + P(sparkD(tx - 48 * k, ty - 20 * k, 3 * k), '#fff8c8', '', 1.4);
        break;
    }
    if (x.ph != null && type !== 'cloud') {
      let r;
      if (x.hop) r = x.hop.tail;
      else {
        const amp = { fin: B.float ? 20 : 8, fishtail: 9, feather: 5, fluff: 4, flame: 7, tuft: 8, flametuft: 8, short: 4, bolt: 6, comet: 5 }[type] || 5;
        r = amp * osc(x.ph, -0.1) * (x.mv != null ? (B.float ? 1.25 : 1.35) : 1);
      }
      return `<g transform="rotate(${f(r)} ${f(tx)} ${f(ty)})">${s}</g>`;
    }
    return anim ? `<g class="sw" style="transform-origin:${f(tx)}px ${f(ty)}px">${s}</g>` : s;
  }

  function wingShape(type, q, dark) {
    const fill = dark ? 'url(#gWd)' : 'url(#gW)';
    switch (type) {
      case 'feather':
        return P(D`M0 0C${-6 * q} ${-26 * q} ${-30 * q} ${-44 * q} ${-58 * q} ${-42 * q}C${-50 * q} ${-35 * q} ${-50 * q} ${-30 * q} ${-56 * q} ${-24 * q}C${-44 * q} ${-22 * q} ${-42 * q} ${-16 * q} ${-48 * q} ${-9 * q}C${-34 * q} ${-8 * q} ${-29 * q} ${-2 * q} ${-31 * q} ${4 * q}C${-18 * q} ${8 * q} ${-6 * q} ${6 * q} 0 0Z`, fill) +
          Ln(D`M${-10 * q} ${-4 * q}C${-22 * q} ${-12 * q} ${-32 * q} ${-18 * q} ${-44 * q} ${-19 * q}M${-10 * q} ${1 * q}C${-18 * q} ${-2 * q} ${-26 * q} ${-4 * q} ${-36 * q} ${-4 * q}`, OL, 2, ' opacity=".35"');
      case 'fairy':
        return Gt(E(-28 * q, 0, 31 * q, 14 * q, '#ffffff', ' fill-opacity=".62"', 3), tr(0, -16 * q, -42)) +
          Gt(En(-28 * q, 0, 19 * q, 6 * q, 'url(#g3)', ' opacity=".4"'), tr(0, -16 * q, -42)) +
          Gt(E(-20 * q, 0, 21 * q, 10 * q, '#ffffff', ' fill-opacity=".62"', 3), tr(0, 4 * q, 16)) +
          Gt(En(-20 * q, 0, 12 * q, 4 * q, 'url(#g3)', ' opacity=".4"'), tr(0, 4 * q, 16));
      case 'leaf':
        return P(D`M0 0C${-10 * q} ${-30 * q} ${-36 * q} ${-44 * q} ${-56 * q} ${-38 * q}C${-46 * q} ${-18 * q} ${-24 * q} ${-4 * q} 0 0Z`, fill) +
          Ln(D`M${-3 * q} ${-3 * q}C${-18 * q} ${-16 * q} ${-34 * q} ${-28 * q} ${-50 * q} ${-36 * q}`, OL, 2, ' opacity=".4"') +
          P(D`M0 0C${-14 * q} ${-6 * q} ${-34 * q} ${-2 * q} ${-44 * q} ${10 * q}C${-28 * q} ${14 * q} ${-12 * q} ${8 * q} 0 0Z`, fill);
      case 'bat':
        return P(D`M0 0C${-12 * q} ${-26 * q} ${-40 * q} ${-40 * q} ${-62 * q} ${-32 * q}C${-56 * q} ${-24 * q} ${-56 * q} ${-16 * q} ${-50 * q} ${-10 * q}C${-44 * q} ${-16 * q} ${-36 * q} ${-14 * q} ${-34 * q} ${-6 * q}C${-28 * q} ${-12 * q} ${-18 * q} ${-8 * q} ${-18 * q} 0C${-12 * q} ${-4 * q} ${-4 * q} ${-2 * q} 0 0Z`, 'url(#gP)') +
          Ln(D`M${-4 * q} ${-4 * q}L${-50 * q} ${-30 * q}M${-6 * q} ${-2 * q}L${-34 * q} ${-8 * q}`, OL, 1.8, ' opacity=".35"');
      case 'star': {
        let s = '';
        for (const [r, l] of [[22, 44], [48, 52], [74, 40]]) {
          s += Gt(P(D`M0 ${-4 * q}L${-l * q} 0L0 ${4 * q}Z`, 'url(#gGold)', ' fill-opacity=".92"', 2.8) + P(sparkD(-l * q, 0, 5 * q), '#fffbe0', '', 1.6), `rotate(${r})`);
        }
        return s;
      }
    }
    return '';
  }
  function wings(type, x, B, layer) {
    const { k, anim, p } = x;
    const [wx, wy] = B.wingP;
    const q = k * (B.bird ? 0.95 : 1.05) * U.lerp(0.8, 1.15, p) * (B.wingK || 1);
    const flap = (inner, ox, oy, delay) => {
      if (x.ph != null) {
        let ang;
        if (x.hop && B.bird) ang = x.hop.wing * (delay ? 0.8 : 1);
        else { const fast = type === 'fairy' ? 2 : 1, amp = (type === 'fairy' ? 10 : 6) * (x.mv != null ? 1.8 : 1) * (B.flapK || 1); ang = amp * osc(x.ph * fast, delay * 0.4); }
        return `<g transform="rotate(${f(ang)} ${f(ox)} ${f(oy)})">${inner}</g>`;
      }
      return anim ? `<g class="wf" style="transform-origin:${f(ox)}px ${f(oy)}px;animation-delay:${delay}s">${inner}</g>` : inner;
    };
    if (B.bird) {
      if (layer === 'back') return flap(Gt(wingShape(type, q, true), tr(wx + 10 * k, wy - 14 * k, 18)), wx + 10 * k, wy - 14 * k, -0.4);
      if (x.hop && x.hop.tuck > 0.3) return flap(Gt(wingShape(type, q * 0.95, false), tr(wx + 14 * k, wy - 2 * k, 6)), wx + 14 * k, wy - 2 * k, 0);
      const fold = P(D`M0 0C${-4 * q} ${-12 * q} ${-26 * q} ${-18 * q} ${-40 * q} ${-8 * q}C${-30 * q} ${-4 * q} ${-36 * q} ${2 * q} ${-42 * q} ${8 * q}C${-28 * q} ${10 * q} ${-30 * q} ${16 * q} ${-34 * q} ${20 * q}C${-18 * q} ${22 * q} ${-4 * q} ${12 * q} 0 0Z`, 'url(#gW)') +
        Ln(D`M${-6 * q} ${2 * q}C${-16 * q} ${2 * q} ${-26 * q} ${6 * q} ${-32 * q} ${14 * q}`, OL, 2, ' opacity=".35"');
      return flap(Gt(fold, tr(wx + 14 * k, wy)), wx + 14 * k, wy, 0);
    }
    if (layer !== 'back') return '';
    const wr = B.wingRot || 0;
    return flap(Gt(wingShape(type, q * 0.92, true), tr(wx + 14 * k, wy - 5 * k, 10 + wr)), wx + 14 * k, wy - 5 * k, -0.25) +
      flap(Gt(wingShape(type, q, false), tr(wx, wy, wr)), wx, wy, 0);
  }

  function arm(type, x, B, P0, side) {
    const { k } = x;
    const [ax, ay] = P0;
    let s;
    if (B.cloudArms) s = P(fluffy(0, 0, 9 * k, 8 * k, 6, 1.6 * k), 'url(#gB)', '', 3.4);
    else if (type === 'leaf') s = P(D`M${-4 * k} ${-4 * k}C${4 * k} ${-10 * k} ${18 * k} ${-6 * k} ${22 * k} ${4 * k}C${12 * k} ${10 * k} ${0} ${8 * k} ${-4 * k} ${-4 * k}Z`, 'url(#gB)', '', 3.6) + Ln(D`M${-2 * k} ${-2 * k}L${16 * k} ${3 * k}`, OL, 1.6, ' opacity=".35"');
    else if (type === 'claw') s = E(0, 0, 9 * k, 11.5 * k, 'url(#gB)', '', 3.6) + [-5, 0, 5].map(o => P(D`M${(o - 2) * k} ${9 * k}L${o * k} ${16 * k}L${(o + 2) * k} ${9 * k}Z`, '#fff', '', 2)).join('');
    else s = E(0, 0, 9 * k, 11.5 * k, 'url(#gB)', '', 3.8);
    let d = 0;
    if (x.ph != null) {
      if (x.hop) d = side > 0 ? x.hop.arm : -x.hop.arm;
      else if (B.cloudArms) d = (x.mv != null ? 20 : 8) * osc(x.ph, side > 0 ? 0 : 0.5);
      else d = (side > 0 ? 7 : 4) * osc(x.ph, side > 0 ? 0 : 0.35);
    }
    if (!d) return Gt(s, tr(ax, ay, side > 0 ? -28 : 28));
    return Gt(s, `translate(${f(ax)} ${f(ay)}) rotate(${side > 0 ? -28 : 28}) translate(0 ${f(-8 * k)}) rotate(${f(d)}) translate(0 ${f(8 * k)})`);
  }

  function pattern(type, x, B, R, layer) {
    const { C, k } = x;
    const { cx, cy, rx, ry } = B;
    if (layer === 'under') {
      if (type === 'split') return Pn(D`M0 0H${cx - 2}L${cx - 8} ${cy - ry * 0.6}L${cx + 4} ${cy - ry * 0.25}L${cx - 6} ${cy + ry * 0.1}L${cx + 5} ${cy + ry * 0.45}L${cx - 4} ${cy + ry * 0.8}L${cx + 2} 200H0Z`, 'url(#gP)');
      return '';
    }
    let s = '';
    switch (type) {
      case 'spots':
        for (let i = 0; i < 6; i++) {
          const sx = cx + (R() * 1.5 - 0.85) * rx, sy = cy + (R() * 0.9 - 0.8) * ry, r = (4 + R() * 4) * k;
          s += En(sx, sy, r, r * 0.85, C.patC, ' opacity=".95"');
        }
        break;
      case 'shell':
        s = Ln(D`M${cx - rx * 0.72} ${cy - ry * 0.02}Q${cx} ${cy - ry * 1.12} ${cx + rx * 0.72} ${cy - ry * 0.02}`, U.shade(C.c1, -0.2), 3.2) +
          Ln(D`M${cx - rx * 0.42} ${cy - ry * 0.12}Q${cx} ${cy - ry * 0.72} ${cx + rx * 0.42} ${cy - ry * 0.12}`, U.shade(C.c1, -0.2), 3) +
          Cn(cx - rx * 0.55, cy - ry * 0.45, 3.2, '#fff', ' opacity=".55"') + Cn(cx + rx * 0.5, cy - ry * 0.5, 2.6, '#fff', ' opacity=".55"');
        break;
      case 'glow':
        for (let i = 0; i < 6; i++) {
          const sx = cx + (R() * 1.6 - 0.8) * rx, sy = cy + (R() * 1.0 - 0.7) * ry, r = (3 + R() * 2.5) * k;
          s += Cn(sx, sy, r * 2, C.patC, ' opacity=".25"') + Cn(sx, sy, r, C.patC) + Cn(sx - r * 0.3, sy - r * 0.3, r * 0.4, '#fff', ' opacity=".85"');
        }
        break;
      case 'stripes':
        for (let i = 0; i < 3; i++) {
          const sx = cx - rx * 0.5 + i * rx * 0.4;
          s += Ln(D`M${sx} ${cy - ry * 1.1}Q${sx + 8} ${cy - ry * 0.4} ${sx} ${cy + ry * 0.1}`, U.shade(C.c1, -0.2), 6 * k);
        }
        break;
    }
    return s;
  }
  /* unclipped decorations sitting on the body outline */
  function patternOver(x, B, R) {
    const { a, C, k, anim } = x;
    const { cx, cy, rx, ry } = B;
    let s = '';
    if (a.pattern === 'plates') {
      for (const ang of [-158, -128, -98, -70]) {
        const [px, py] = pt(cx, cy, 1, ang);
        const bx = cx + (px - cx) * rx * 0.9, by = cy + (py - cy) * ry * 0.9;
        const r = (8 + R() * 3) * k * 1.1;
        let d = '';
        for (let i = 0; i < 6; i++) { const aa = rad(i * 60 + R() * 20); d += (i ? 'L' : 'M') + f(bx + Math.cos(aa) * r * (0.8 + R() * 0.3)) + ' ' + f(by + Math.sin(aa) * r * (0.7 + R() * 0.3)); }
        s += P(d + 'Z', 'url(#gRock)', '', 3.2);
      }
    }
    if (a.pattern === 'mountain') {
      // a mossy mountain ridge rising from the back: three rock peaks with snowcaps and a little tree between them
      const [tx0, ty0] = B.torsoTop || [cx, cy - ry];
      const band = fluffy(tx0 - 8, ty0 + 6, rx * 0.5, 9 * k, 11, 2 * k);
      for (const [ox, oy, h, snow] of [[-34, 10, 0.78, 0], [-8, 0, 1.25, 1], [18, 4, 0.95, 1]]) {
        const bx0 = tx0 + ox, by0 = ty0 + oy + 6;
        const H = 44 * h * k, W = 22 * k;
        s += P(D`M${bx0 - W} ${by0 + 8}L${bx0 - W * 0.42} ${by0 - H * 0.52}L${bx0 - W * 0.14} ${by0 - H * 0.6}L${bx0 + W * 0.04} ${by0 - H}L${bx0 + W * 0.36} ${by0 - H * 0.55}L${bx0 + W * 0.58} ${by0 - H * 0.48}L${bx0 + W} ${by0 + 8}Z`, 'url(#gRock)', '', 3.2);
        s += Ln(D`M${bx0 + W * 0.04} ${by0 - H * 0.96}L${bx0 + W * 0.2} ${by0 - H * 0.3}`, '#ffffff', 2, ' opacity=".3"');
        if (snow) s += P(D`M${bx0 - W * 0.24} ${by0 - H * 0.74}L${bx0 + W * 0.04} ${by0 - H}L${bx0 + W * 0.3} ${by0 - H * 0.68}L${bx0 + W * 0.12} ${by0 - H * 0.73}L${bx0 - W * 0.04} ${by0 - H * 0.64}Z`, '#f4f8ff', '', 2);
      }
      s += P(band, '#6fbf4f', '', 3.4) + Ln(D`M${tx0 - rx * 0.4} ${ty0 + 2}Q${tx0 - 6} ${ty0 - 4} ${tx0 + rx * 0.3} ${ty0 + 3}`, '#a8e67a', 2.4, ' opacity=".6"');
      const tx = tx0 + 36, ty = ty0 + 6;
      s += Tube(D`M${tx} ${ty}L${tx + 1} ${ty - 13 * k}`, '#8a5a3a', 3.4 * k) + P(fluffy(tx + 1, ty - 21 * k, 10 * k, 8.5 * k, 7, 1.8 * k), '#4fae3c', '', 3.2) + Cn(tx - 3 * k, ty - 25 * k, 2.6 * k, '#9be07a', ' opacity=".7"');
    }
    if (a.pattern === 'moss') {
      s += P(fluffy(cx - rx * 0.12, cy - ry * 0.78, rx * 0.62, ry * 0.3, 9, 2.6 * k), '#6fbf4f', '', 3.6);
      const tx = cx - rx * 0.3, ty = cy - ry * 1.02;
      s += Tube(D`M${tx} ${ty}L${tx} ${ty - 16 * k}`, '#8a5a3a', 4 * k) + P(fluffy(tx, ty - 24 * k, 12 * k, 10 * k, 7, 2 * k), '#4fae3c', '', 3.4) + Cn(tx - 4 * k, ty - 28 * k, 3 * k, '#9be07a', ' opacity=".7"');
      for (const [ox, sc] of [[0.25, 0.8], [0.45, 0.6]]) {
        const px = cx + rx * ox, py = cy - ry * 0.92;
        s += P(D`M${px} ${py}L${px - 4 * k * sc} ${py - 4 * k * sc}L${px - 2 * k * sc} ${py - 16 * k * sc}L${px + 2 * k * sc} ${py - 18 * k * sc}L${px + 5 * k * sc} ${py - 5 * k * sc}Z`, 'url(#gHo)', '', 2.8);
      }
    }
    if (a.wool === 'flame') {
      for (const ang of [-150, -118, -86, -58]) {
        const [px, py] = pt(0, 0, 1, ang);
        s += Gt(flame(0.55 * k, anim), tr(cx + px * rx * 0.95, cy + py * ry * 0.95, ang + 90));
      }
    }
    return s;
  }
  function woolCurls(x, B, R) {
    const { C, k } = x;
    let s = '';
    for (let i = 0; i < 8; i++) {
      const wx = B.cx + (R() * 1.6 - 0.8) * B.rx, wy = B.cy + (R() * 1.4 - 0.7) * B.ry;
      s += Ln(D`M${wx} ${wy}a${3.5 * k} ${3.5 * k} 0 1 1 ${5 * k} ${2 * k}`, x.a.wool === 'flame' ? '#ffd76a' : U.shade(C.c2, -0.14), 2.2, ' opacity=".8"');
    }
    return s;
  }
  function constellation(B, R) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([B.cx + (R() - 0.5) * B.rx * 1.3, B.cy + (R() - 0.6) * B.ry * 1.1]);
    const d = 'M' + pts.map(q => f(q[0]) + ' ' + f(q[1])).join('L');
    return Ln(d, '#ffffff', 1.4, ' opacity=".65"') + pts.map(q => Cn(q[0], q[1], 5, '#fff', ' opacity=".28"') + Cn(q[0], q[1], 2.3, '#fff')).join('');
  }
  function skirt(x, B) {
    const { k } = x;
    const n = 7, list = [];
    for (let i = 0; i < n; i++) {
      const ang = U.lerp(12, 168, i / (n - 1));
      list.push([Math.abs(ang - 90), ang]);
    }
    list.sort((A, Bb) => Bb[0] - A[0]);
    let s = '';
    const ecx = B.cx, ecy = B.top + B.h * 0.8, erx = B.hw * 0.98, ery = B.h * 0.16;
    for (const [, ang] of list) {
      const px = ecx + Math.cos(rad(ang)) * erx, py = ecy + Math.sin(rad(ang)) * ery;
      const fl = x.hop ? x.hop.flare : x.ph != null ? 2.5 * osc(x.ph, ang / 360) : 0;
      s += Gt(P(D`M0 0C${8 * k} ${6 * k} ${9 * k} ${18 * k} 0 ${24 * k}C${-9 * k} ${18 * k} ${-8 * k} ${6 * k} 0 0Z`, 'url(#g3)', '', 3.2), tr(px, py - 6 * k, ang - 90 + (ang < 90 ? -fl : fl)));
    }
    return s;
  }
  function crabClaws(x, B) {
    const { C, p } = x;
    const { cx, cy, rx, ry } = B;
    let s = '';
    for (const sd of [-1, 1]) {
      const R0 = U.lerp(14, 18, p) * (sd > 0 ? B.bigClaw || 1 : 1);
      const ax = cx + sd * rx * 0.82, ay = cy + ry * 0.05;
      const bx = cx + sd * (rx + 8), by = cy - ry * 0.55;
      s += Tube(D`M${ax} ${ay}Q${cx + sd * (rx + 14)} ${cy} ${bx} ${by}`, U.shade(C.c3, -0.06), 7);
      s += Gt(pacman(R0, 'url(#g3)'), tr(bx + sd * 3, by - R0 * 0.6, (sd > 0 ? -62 : -118) + (x.ph != null ? (x.mv != null ? 9 : 6) * osc(x.ph, sd * 0.25) : 0)));
    }
    return s;
  }
  function scorpClaw(x, B, far) {
    const { C, p } = x;
    const R0 = U.lerp(10, 13, p) * (x.a.clawK || 1);
    const ax = B.hx + B.hr * (far ? 0.55 : 0.3), ay = B.hy + B.hr * (far ? 0.4 : 0.75);
    const bx = B.hx + B.hr * (far ? 1.15 : 1.22), by = B.hy + B.hr * (far ? 0.12 : 0.58);
    const col = far ? U.shade(C.c1, -0.12) : C.c1;
    return Tube(D`M${ax} ${ay}L${bx} ${by}`, col, 6.5) + Gt(pacman(R0, far ? U.shade(C.c3, -0.1) : 'url(#g3)'), tr(bx + R0 * 0.55, by - R0 * 0.2, -15));
  }
  function pecFin(x, B) {
    const { k, anim } = x;
    const [px, py] = B.finP;
    const s = Gt(P(D`M0 0C${10 * k} ${4 * k} ${14 * k} ${16 * k} ${6 * k} ${22 * k}C${2 * k} ${14 * k} ${-4 * k} ${8 * k} 0 0Z`, 'url(#g3)', '', 3.2), tr(px, py, -25 + (x.ph != null ? (x.mv != null ? 26 : 15) * osc(x.ph, 0.25) : 0)));
    return anim ? `<g class="wf" style="transform-origin:${f(px)}px ${f(py)}px">${s}</g>` : s;
  }

  /* ================= FACE ================= */
  function eye(style, ex, ey, r, inner, x, B, idx, defs) {
    const white = E(ex, ey, r * 0.86, r, 'url(#gEw)', '', 2.8);
    const ix = ex + r * 0.08, iy = ey + r * 0.12, ir = r * 0.66;
    const iris = Cn(ix, iy, ir, 'url(#gI)') + Cn(ix, iy, ir * 0.97, 'none', ` stroke="${OL}" stroke-width="${f(r * 0.09)}" opacity=".55"`) +
      Cn(ix + r * 0.02, iy + r * 0.03, ir * 0.5, '#140a26') +
      Ln(D`M${ix - ir * 0.62} ${iy + ir * 0.35}Q${ix} ${iy + ir * 0.95} ${ix + ir * 0.62} ${iy + ir * 0.35}`, '#ffffff', r * 0.1, ' opacity=".35"') +
      En(ex - r * 0.2, ey - r * 0.22, r * 0.3, r * 0.24, '#fff', ' transform="rotate(-20 ' + f(ex - r * 0.2) + ' ' + f(ey - r * 0.22) + ')"') +
      Cn(ex + r * 0.34, ey + r * 0.4, r * 0.11, '#fff', ' opacity=".95"') +
      Ln(D`M${ex - r * 0.86} ${ey - r * 0.12}Q${ex - r * 0.1} ${ey - r * 1.28} ${ex + r * 0.86} ${ey - r * 0.16}`, OL, Math.max(2.8, r * 0.22));
    const clipId = 'ce' + idx;
    switch (style) {
      case 'happy':
        return Ln(D`M${ex - r * 0.75} ${ey + r * 0.25}Q${ex} ${ey - r * 0.85} ${ex + r * 0.75} ${ey + r * 0.25}`, OL, 4);
      case 'fierce': {
        const xi = ex + inner * r * 1.15, xo = ex - inner * r * 1.15;
        defs.push(`<clipPath id="${clipId}"><path d="${D`M${xo} ${ey - r * 0.9}L${xi} ${ey - r * 0.22}L${xi} ${ey + r * 1.3}L${xo} ${ey + r * 1.3}Z`}"/></clipPath>`);
        return `<g clip-path="url(#${clipId})">${white}${iris}</g>` + Ln(D`M${ex - inner * r * 0.95} ${ey - r * 0.84}L${ex + inner * r * 1.0} ${ey - r * 0.27}`, OL, 4.4);
      }
      case 'sleepy': case 'wise': {
        const ly = ey - r * (style === 'sleepy' ? 0.05 : 0.42);
        defs.push(`<clipPath id="${clipId}"><path d="${D`M${ex - r * 1.2} ${ly}Q${ex} ${ly + r * 0.22} ${ex + r * 1.2} ${ly}L${ex + r * 1.2} ${ey + r * 1.3}L${ex - r * 1.2} ${ey + r * 1.3}Z`}"/></clipPath>`);
        return `<g clip-path="url(#${clipId})">${white}${iris}</g>` + Ln(D`M${ex - r * 0.9} ${ly + r * 0.02}Q${ex} ${ly + r * 0.24} ${ex + r * 0.9} ${ly + r * 0.02}`, OL, 3.8);
      }
    }
    return white + iris;
  }
  function mouth(type, mx, my, x, B) {
    const hr = B.hr, w = hr * 0.13;
    switch (type) {
      case 'none': return '';
      case 'cat': return Ln(D`M${mx - w * 1.1} ${my - 1}Q${mx - w * 0.55} ${my + w * 0.75} ${mx} ${my}Q${mx + w * 0.55} ${my + w * 0.75} ${mx + w * 1.1} ${my - 1}`, OL, 3.3);
      case 'fang': return Ln(D`M${mx - w} ${my}Q${mx} ${my + w * 0.95} ${mx + w} ${my}`, OL, 3.3) + P(D`M${mx + w * 0.12} ${my + w * 0.42}L${mx + w * 0.4} ${my + w * 1.08}L${mx + w * 0.66} ${my + w * 0.3}Z`, '#fff', '', 2);
      case 'fangs': return Ln(D`M${mx - w * 1.2} ${my}Q${mx} ${my + w * 1.05} ${mx + w * 1.2} ${my}`, OL, 3.3) +
        P(D`M${mx - w * 0.72} ${my + w * 0.36}L${mx - w * 0.48} ${my + w * 1.05}L${mx - w * 0.24} ${my + w * 0.5}Z`, '#fff', '', 2) +
        P(D`M${mx + w * 0.24} ${my + w * 0.5}L${mx + w * 0.48} ${my + w * 1.05}L${mx + w * 0.72} ${my + w * 0.36}Z`, '#fff', '', 2);
      case 'open': return P(D`M${mx - w} ${my - 1}Q${mx} ${my + w * 1.9} ${mx + w} ${my - 1}Z`, '#7a1f3d', '', 3) +
        Pn(D`M${mx - w * 0.5} ${my + w * 0.75}Q${mx} ${my + w * 0.35} ${mx + w * 0.55} ${my + w * 0.8}Q${mx} ${my + w * 1.3} ${mx - w * 0.5} ${my + w * 0.75}Z`, '#ff7a94');
      case 'grin': return P(D`M${mx - w * 1.4} ${my - 2}Q${mx} ${my + w * 1.8} ${mx + w * 1.4} ${my - 2}Z`, '#7a1f3d', '', 3) +
        Pn(D`M${mx - w * 1.15} ${my - 0.5}L${mx - w * 0.8} ${my + w * 0.45}L${mx - w * 0.4} ${my + 0.5}L${mx} ${my + w * 0.5}L${mx + w * 0.4} ${my + 0.5}L${mx + w * 0.8} ${my + w * 0.45}L${mx + w * 1.15} ${my - 0.5}Z`, '#fff');
      case 'beak': {
        const bx = B.hx + hr * 0.78, by = B.fy + hr * 0.2;
        return P(D`M${bx - 5} ${by - hr * 0.2}Q${bx + hr * 0.2} ${by - hr * 0.16} ${bx + hr * 0.44} ${by + hr * 0.04}Q${bx + hr * 0.2} ${by + hr * 0.2} ${bx - 5} ${by + hr * 0.26}Z`, 'url(#g3)', '', 3.4) +
          Ln(D`M${bx - 3} ${by + hr * 0.04}L${bx + hr * 0.3} ${by + hr * 0.05}`, OL, 2);
      }
    }
    return Ln(D`M${mx - w} ${my}Q${mx} ${my + w * 0.95} ${mx + w} ${my}`, OL, 3.3);
  }
  function face(x, B, defs) {
    const { a, sp, C, anim } = x;
    const style = a.eyes || 'cute';
    const hr = B.hr;
    let fx = B.fx, fy = B.fy;
    if (a.muzzle) { fx -= hr * 0.06; fy -= hr * 0.14; }
    const er = hr * (sp.stage >= 3 ? 0.225 : 0.26) * (B.eyeK || 1);
    let pos;
    if (B.eyes) pos = B.eyes.map(([ex, ey]) => [ex, ey, 1]);
    else if (B.front) pos = [[fx - hr * 0.33, fy, 1], [fx + hr * 0.33, fy, 1]];
    else pos = [[fx - hr * 0.25, fy + 1, 0.86], [fx + hr * 0.3, fy, 1]];
    let eyes = '';
    pos.forEach(([ex, ey, sc], i) => {
      if (B.eyeBall) eyes += Ci(ex, ey, er * 1.32, 'url(#gB)', '', 3.8);
      if (x.blink) {
        // closed eyes: a soft lid curve with a little lash at the outer corner (a fierce one closes in a straight, slanted line)
        const r = er * sc, w = Math.max(3, r * 0.27), inner = i === 0 ? 1 : -1;
        if (style === 'fierce') eyes += Ln(D`M${ex - r * 0.8} ${ey + r * (inner > 0 ? 0.05 : 0.3)}L${ex + r * 0.8} ${ey + r * (inner > 0 ? 0.3 : 0.05)}`, OL, w) +
          Ln(D`M${ex - inner * r * 0.95} ${ey - r * 0.84}L${ex + inner * r * 1.0} ${ey - r * 0.27}`, OL, 4.4);
        else eyes += Ln(D`M${ex - r * 0.85} ${ey + r * 0.1}Q${ex} ${ey + r * 0.66} ${ex + r * 0.85} ${ey + r * 0.1}`, OL, w) +
          Ln(D`M${ex + inner * -r * 0.85} ${ey + r * 0.1}l${inner * -r * 0.2} ${-r * 0.22}`, OL, Math.max(2, w * 0.6));
      } else eyes += eye(style, ex, ey, er * sc, i === 0 ? 1 : -1, x, B, i, defs);
    });
    let s = anim ? `<g class="bl">${eyes}</g>` : eyes;
    if (a.cheeks) {
      for (const [ex, ey, sc] of pos) {
        const cyy = B.eyes ? B.cy - B.ry * 0.25 : ey + er * 1.28;
        const cxx = B.eyes ? (ex < B.cx ? B.cx - B.rx * 0.5 : B.cx + B.rx * 0.5) : ex + (B.front ? 0 : er * 0.15);
        s += En(cxx, cyy, er * 0.62 * sc, er * 0.33 * sc, '#ff6f91', ' opacity=".42"');
      }
    }
    if (a.muzzle) {
      const [mx, my] = B.muzzleP;
      s += E(mx, my, hr * 0.38, hr * 0.28, 'url(#g2)', '', 3.5) + Cn(mx - hr * 0.12, my - hr * 0.05, hr * 0.055, '#5a3a4a') + Cn(mx + hr * 0.15, my - hr * 0.07, hr * 0.06, '#5a3a4a');
    }
    const [mx, my] = B.mouthP || (a.muzzle ? [B.muzzleP[0], B.muzzleP[1] + hr * 0.13] : B.front ? [fx, fy + hr * 0.4] : [fx + hr * 0.1, fy + hr * 0.42]);
    s += mouth(a.muzzle && a.mouth !== 'beak' ? 'smile' : (a.mouth || 'smile'), mx, my, x, B);
    if (a.beard) {
      const bx = B.hx + hr * 0.42, by = B.hy + hr * 0.84;
      s += P(D`M${bx - hr * 0.12} ${by - 2}C${bx - hr * 0.1} ${by + hr * 0.25} ${bx + hr * 0.02} ${by + hr * 0.42} ${bx + hr * 0.06} ${by + hr * 0.45}C${bx + hr * 0.1} ${by + hr * 0.3} ${bx + hr * 0.14} ${by + hr * 0.1} ${bx + hr * 0.14} ${by - 2}Z`, 'url(#g2)', '', 3);
    }
    if (a.whiskers) {
      s += Ln(D`M${mx + hr * 0.05} ${my - hr * 0.02}c${hr * 0.25} ${-hr * 0.04} ${hr * 0.42} ${hr * 0.1} ${hr * 0.5} ${hr * 0.34}`, OL, 2.2) +
        Ln(D`M${mx - hr * 0.08} ${my + hr * 0.02}c${-hr * 0.05} ${hr * 0.22} ${hr * 0.05} ${hr * 0.42} ${hr * 0.22} ${hr * 0.55}`, OL, 2.2);
    }
    const markOn = a.mark != null ? a.mark : sp.stage >= 3;
    if (markOn) {
      const S = SIGN[sp.sign], q = hr * 0.02;
      const [kx, ky] = B.markP || [B.front ? fx : fx - hr * 0.04, fy - hr * 0.64];
      s += Gt(Ln(S.glyph, OL, 5.4) + Ln(S.glyph, sp.legend ? '#ffe680' : '#fff4d6', 2.5), `translate(${f(kx - 12 * q)} ${f(ky - 12 * q)}) scale(${f(q * 100) / 100})`);
    }
    return s;
  }

  /** soft contact shadow where the head overlaps the body (gradient defined as #gAO) */
  function aoUnderHead(B) {
    return `<ellipse cx="${f(B.hx - B.hr * 0.05)}" cy="${f(B.hy + B.hr * 0.78)}" rx="${f(B.hr * 1.1)}" ry="${f(B.hr * 0.6)}" fill="url(#gAO)"/>`;
  }
  /** little fur tufts at the cheeks and chest (breaks the perfect-circle silhouette) */
  function furTufts(x, B, R) {
    const { C, k } = x;
    if (!B.head || B.serpent) return '';
    const tuft = (px, py, rot, sc, col) => Gt(P(D`M${-7 * sc} 0C${-7 * sc} ${-6 * sc} ${-3 * sc} ${-9 * sc} 0 ${-13 * sc}C${1 * sc} ${-8 * sc} ${4 * sc} ${-6 * sc} ${6 * sc} ${-9 * sc}C${6 * sc} ${-4 * sc} ${8 * sc} ${-2 * sc} ${7 * sc} 0Z`, col, '', 2.6), tr(px, py, rot));
    let s = '';
    const [c1x, c1y] = pt(B.hx, B.hy, B.hr * 0.96, 132), [c2x, c2y] = pt(B.hx, B.hy, B.hr * 0.95, 52);
    s += tuft(c1x, c1y, 120, 1.05 * k, 'url(#gH)') + tuft(c2x, c2y, 60 + R() * 10, 0.9 * k, 'url(#gH)');
    if (!B.bird) {
      const [bx, by] = [B.cx + B.rx * 0.55, B.cy + B.ry * 0.05];
      s += tuft(bx, by, 150, 0.95 * k, 'url(#g2)');
    }
    return s;
  }
  function aura(x) {
    const { C, anim } = x;
    let st = '';
    for (let i = 0; i < 6; i++) {
      const [px, py] = pt(100, 108, 88, i * 60 - 90);
      st += P(sparkD(px, py, i % 2 ? 6 : 8.5), '#fffbe0', '', 2);
    }
    return `<circle cx="100" cy="108" r="98" fill="url(#gA)"/>` + (anim ? `<g class="au">${st}</g>` : x.ph != null ? `<g transform="rotate(${f(x.ph * 60)} 100 108)">${st}</g>` : st);
  }
  function sparkles(anim, ph) {
    return [[34, 46, 8], [166, 40, 10], [172, 132, 6.5]].map(([sx, sy, r], i) => {
      if (ph != null) { const k = 0.6 + 0.4 * (0.5 + 0.5 * osc(ph, i / 3)); return `<g transform="translate(${sx} ${sy}) scale(${f3(k)}) translate(${-sx} ${-sy})" opacity="${f3(0.35 + 0.65 * k)}">${P(sparkD(sx, sy, r), '#fff7a8', '', 2.2)}</g>`; }
      return `<g${anim ? ` class="tw" style="animation-delay:${-i * 0.55}s"` : ''}>${P(sparkD(sx, sy, r), '#fff7a8', '', 2.2)}</g>`;
    }).join('');
  }

  /* ================= RENDER ================= */
  function render(id, opts = {}) {
    LW = opts.paint ? 0.5 : 1;
    try { return render0(id, opts); } finally { LW = 1; FL = null; }
  }
  function render0(id, opts = {}) {
    const sp = SPECIES[id], a = sp.art;
    const anim = opts.anim !== false, shiny = !!opts.shiny;
    const p = a.p != null ? a.p : [0, 0, 0.5, 1, 1][sp.stage];
    const H = shiny ? (c => U.hue(c, 150)) : (c => c);
    const c1 = H(a.c1), c2 = a.c2 || U.shade(a.c1, 0.3), c3 = H(a.c3 || U.shade(a.c1, -0.2));
    const C = {
      c1, c2, c3, head: H(a.head || a.c1), hornC: H(a.hornC || a.c3 || c3), wingC: a.wingC ? H(a.wingC) : c2,
      patC: a.patC ? (a.pattern === 'split' || a.pattern === 'glow' ? H(a.patC) : a.patC) : c2,
      eye: a.eye || U.shade(ELEMENTS[sp.el].dark, -0.04), aura: a.aura ? H(a.aura) : null,
    };
    C.leg = U.shade(C.head, -0.05);
    C.inner = U.mix(c2, '#ff9dbd', 0.5);
    const bodyC = a.wool === 'wool' ? c2 : c1;
    OL = Paint.ramp(c1).line;
    const defs = [
      Paint.glowGrad('gAO', Paint.ramp(bodyC).deep, 0.42),
      Paint.cgrad('gL', C.leg), Paint.cgrad('gLf', U.shade(C.leg, -0.1)),
      `<linearGradient id="gEw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfcbe8"/><stop offset=".34" stop-color="#ffffff"/><stop offset="1" stop-color="#f1efff"/></linearGradient>`,
      a.wool === 'flame'
        ? `<radialGradient id="gB" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#ffe27a"/><stop offset=".55" stop-color="#ff9a3a"/><stop offset="1" stop-color="#e2502a"/></radialGradient>`
        : rg('gB', bodyC),
      rg('gH', C.head), `<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.mix(c2, '#ffffff', 0.18)}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`,
      Paint.glowGrad('gShB', Paint.ramp(bodyC).hi, 0.45), Paint.glowGrad('gShH', Paint.ramp(C.head).hi, 0.45), rg('g3', c3), rg('gHo', C.hornC), rg('gW', C.wingC, 0.08, -0.12), rg('gWd', a.duo ? H(a.duo) : U.shade(C.wingC, -0.1), 0.06, -0.12),
      rg('gP', C.patC, 0.1, -0.1), rg('gWool', c2, 0.05, -0.1), rg('gPl', U.shade(c1, -0.08)), rg('gRock', '#a3968b', 0.12, -0.16),
      rg('gMoon', '#fff4c8', 0.1, -0.14),
      `<linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a26"/><stop offset=".55" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ffc23a"/></linearGradient>`,
      `<radialGradient id="gI" cx="50%" cy="72%" r="72%"><stop offset="0" stop-color="${U.shade(C.eye, 0.34)}"/><stop offset=".5" stop-color="${C.eye}"/><stop offset="1" stop-color="${U.shade(C.eye, -0.2)}"/></radialGradient>`,
      `<radialGradient id="gGold" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".55" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09a14"/></radialGradient>`,
      `<radialGradient id="gM" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="${c3}"/></radialGradient>`,
      `<linearGradient id="gCo" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${c3}"/><stop offset="1" stop-color="#fff8d0" stop-opacity=".15"/></linearGradient>`,
    ];
    if (C.aura) defs.push(`<radialGradient id="gA" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.aura}" stop-opacity=".75"/><stop offset=".55" stop-color="${C.aura}" stop-opacity=".3"/><stop offset="1" stop-color="${C.aura}" stop-opacity="0"/></radialGradient>`);

    const mv = opts.mv != null ? opts.mv : opts.pose != null ? opts.pose : null;
    const x = { sp, a, C, p, anim, legend: sp.legend, blink: !!opts.blink, t: opts.t != null ? opts.t : null, mv, walk: null, hop: null, defs };
    if (mv != null && WALKERS.includes(a.body)) x.walk = mv;
    if (mv != null && (a.body === 'egg' || a.body === 'round' || a.body === 'bird')) x.hop = hopPose(mv);
    x.ph = mv != null ? mv : x.t;
    if (a.body === 'bird' && a.pose === 'fly') x.hop = flyPose(x.ph, mv != null);
    FL = x.ph; FLn = 0;
    const B = BODY[a.body](x);
    x.k = B.hr / 40;
    const R = U.rng(U.hash(id));
    const crests = [].concat(a.crest || B.defaultCrest || []);
    const tailT = a.tail || B.defaultTail || null;
    let s = '';
    const pre = (C.aura ? aura(x) : '') + (B.pre || '');
    if (a.wings) s += wings(a.wings, x, B, 'back');
    if (tailT && B.tailP) s += tail(tailT, x, B);
    for (const c of crests) if (CREST_LAYER[c] === 'back') s += crest(c, x, B);
    if (a.ears) s += ears(a.ears, x, B);
    if (a.horns) s += horns(a.horns, x, B);
    if (a.arms && B.armP) s += arm(a.arms, x, B, B.armP[0], -1);
    if (B.scorpClaws) s += scorpClaw(x, B, true);
    s += B.back;
    if (B.clip) s += `<path d="${B.clip}" fill="none" stroke="${OL}" stroke-width="${SW * 1.5 * LW}" stroke-linejoin="round" transform="translate(1.4 1.8)"/>`;
    s += B.body;
    if (B.clip) {
      defs.push(`<clipPath id="cb"><path d="${B.clip}"/></clipPath>`);
      let inner = pattern(a.pattern, x, B, R, 'under') + B.belly + pattern(a.pattern, x, B, R, 'over');
      if (a.wool) inner += woolCurls(x, B, R);
      if (sp.legend) inner += constellation(B, R);
      const glossy = ['fish', 'crab', 'egg', 'round', 'serpent'].includes(a.body) || a.pattern === 'shell';
      const bb = [B.cx - B.rx, B.cy - B.ry, B.rx * 2, B.ry * 2];
      if (!glossy && !a.wool) inner += Paint.strokes(bb, bodyC, R, 7, 1.6);
      inner += Paint.shade(B.clip, bodyC, Math.min(B.rx, B.ry) * 1.05, { bbox: bb, sheen: 'gShB', gloss: glossy ? 0.55 : 0 });
      if (!B.unified && B.head) inner += aoUnderHead(B);
      s += `<g clip-path="url(#cb)">${inner}</g>`;
    }
    s += patternOver(x, B, R);
    if (a.skirt) s += skirt(x, B);
    for (const c of crests) if (CREST_LAYER[c] === 'mid') s += crest(c, x, B);
    if (B.mid) s += B.mid;
    if (B.head) {
      if (B.headClip) s += `<path d="${B.headClip}" fill="none" stroke="${OL}" stroke-width="${SW * 1.5 * LW}" stroke-linejoin="round" transform="translate(1.3 1.7)"/>`;
      s += B.head;
      if (B.headClip) {
        defs.push(`<clipPath id="chd"><path d="${B.headClip}"/></clipPath>`);
        const hb = [B.hx - B.hr, B.hy - B.hr, B.hr * 2, B.hr * 2];
        s += `<g clip-path="url(#chd)">${a.body === 'serpent' ? '' : Paint.strokes(hb, C.head, R, 5, 1.5)}${Paint.shade(B.headClip, C.head, B.hr, { bbox: hb, sheen: 'gShH', gloss: a.body === 'serpent' ? 0.45 : 0 })}</g>`;
      }
    }
    for (const c of crests) if (CREST_LAYER[c] === 'front') s += crest(c, x, B);
    if (!B.noFace) s += face(x, B, defs);
    if (B.claws) s += crabClaws(x, B);
    if (B.scorpClaws) s += scorpClaw(x, B, false);
    if (a.arms && B.armP) s += arm(a.arms, x, B, B.armP[1], 1);
    if (B.finP) s += pecFin(x, B);
    if (a.wings && B.bird) s += wings(a.wings, x, B, 'front');
    if (B.front2) s += B.front2;
    if (shiny) s += sparkles(anim, x.ph);
    let fig = pre + (B.xf ? `<g transform="${B.xf}">${s}</g>` : s);
    // a.fit [dx, dy, scale]: a big pose (a rearing stag, a titan, a flyer on its disc) nudged and scaled about the
    // feet so that it stays inside the 200×200 picture in every frame
    if (a.fit) fig = `<g transform="translate(${100 + a.fit[0]} ${189 + a.fit[1]}) scale(${a.fit[2] || 1}) translate(-100 -189)">${fig}</g>`;

    const delay = -((U.hash(id) % 400) / 100);
    const css = anim ? `<style>.bl{animation:bl 4.4s ${delay}s infinite;transform-box:fill-box;transform-origin:center}@keyframes bl{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}.fl{animation:fl .55s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 90%}@keyframes fl{0%{transform:scale(1,1)}100%{transform:scale(.9,1.12) skewX(-3deg)}}.sw{animation:sw 1.8s ease-in-out infinite alternate}@keyframes sw{0%{transform:rotate(-6deg)}100%{transform:rotate(7deg)}}.wf{animation:wf 1.1s ease-in-out infinite alternate}@keyframes wf{0%{transform:rotate(-5deg)}100%{transform:rotate(9deg)}}.mn{animation:mn 2.4s ease-in-out infinite alternate}@keyframes mn{0%{transform:rotate(-3deg) scale(1)}100%{transform:rotate(3deg) scale(1.04)}}.au{animation:au 14s linear infinite;transform-origin:100px 108px}@keyframes au{to{transform:rotate(360deg)}}.tw{animation:tw 1.6s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes tw{0%{opacity:.25;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}</style>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${css}<defs>${defs.join('')}</defs>${fig}</svg>`;
  }

  /* ---- painted versions (Painter): every Orbling picture in the game is a painted bitmap ---- */
  function paintSpec(id, opts = {}) {
    const sp = SPECIES[id], lg = opts.size === 'lg', shiny = !!opts.shiny;
    const mv = opts.mv != null ? opts.mv : opts.pose != null ? opts.pose : null;
    const t = mv != null ? null : opts.t != null ? opts.t : 0;
    const key = 'mp:' + id + (shiny ? ':s' : '') + (opts.blink ? ':b' : '') + (mv != null ? ':m' + f3(mv) : ':t' + f3(t)) + (lg ? ':L' : '');
    const c1 = shiny ? U.hue(sp.art.c1, 150) : sp.art.c1;
    const o = { w: lg ? 600 : 320, h: lg ? 600 : 320, px: lg ? 3 : 1.6, ink: Paint.ramp(c1).line, inkW: 2.2, box: lg ? [60, 60, 480, 510] : [32, 32, 256, 272], rim: null, tex: 0.4, light: 0.35, shade: 0.4, seed: U.hash(id) };
    if (opts.urgent) o.urgent = true;
    return { key, o, svg: () => render(id, { shiny, blink: opts.blink, t, mv, anim: false, paint: true }) };
  }
  /** synchronous url for <img> tags: the painting when ready, else the vector stand-in (upgraded in place) */
  function url(id, opts = {}) {
    const q = paintSpec(id, { shiny: opts.shiny, size: opts.size });
    return Painter.get(q.key, q.svg, q.o);
  }
  /** does this species hover above the ground (for shadows / placement)? */
  const FLOAT_BODY = ['fish', 'cloud', 'twin', 'twinfish', 'genie', 'seagoat'];
  function floats(id) { const a = SPECIES[id].art; return FLOAT_BODY.includes(a.body) || !!a.float || !!a.islet || a.pose === 'fly'; }
  const GAIT_OF = { quad: 'trot', biped: 'trot', centaur: 'trot', egg: 'hop', round: 'hop', bird: 'hop', crab: 'scuttle', scorp: 'skitter', serpent: 'slither', fish: 'float', cloud: 'float' };
  /** how an Orbling moves about in the world */
  function gait(id) { return floats(id) ? 'float' : GAIT_OF[SPECIES[id].art.body] || 'trot'; }
  /** painted bitmap (Painter) of a species → Promise<url> */
  /** queue a species' whole animation set (rest pose first, then the move cycle, the idle loop and the blink) */
  function prefetchSet(id, low) {
    const list = [paintSpec(id, {})];
    const n = frames();
    for (let i = 0; i < n; i++) list.push(paintSpec(id, { mv: i / n }));
    for (let i = 1; i < n; i++) list.push(paintSpec(id, { t: i / n }));
    list.push(paintSpec(id, { blink: true }));
    if (low) Painter.prefetch(list.map(q => [q.key, q.svg, q.o]));
    else for (const q of list) Painter.bake(q.key, q.svg(), q.o);
  }
  /** paint every species in the background (idle pictures for menus / the Codex) */
  function prefetchAll() { Painter.prefetch(SPECIES_ORDER.map(id => { const q = paintSpec(id, {}); return [q.key, q.svg, q.o]; })); }
  /** every Orbling has FRAMES idle frames (t = k/FRAMES) and FRAMES move frames (mv = k/FRAMES); lite mode (slow
   *  devices) paints every other one — a subset of the full set, so the caches stay valid when it is switched */
  const FRAMES = 6;
  let lite = false;
  const frames = () => (lite ? 3 : FRAMES);
  const setLite = v => { lite = !!v; };
  const isLite = () => lite;
  /** the tamers' walk cycle: 8 pictures, 4 in lite mode (step through frame indices 0..7) */
  const walkStep = () => (lite ? 2 : 1);
  const isHopper = id => ['egg', 'round', 'bird'].includes(SPECIES[id].art.body);
  /** painted bitmap → Promise<url>; opts: shiny, blink, pose (walk phase), size ('lg' for battle), urgent */
  function painted(id, opts = {}) {
    const q = paintSpec(id, opts);
    return Painter.bake(q.key, q.svg(), q.o);
  }

  return { svg: render, url, floats, gait, painted, prefetchAll, prefetchSet, FRAMES, frames, setLite, isLite, walkStep, isHopper };
})();
