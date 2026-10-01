'use strict';
/* Painted explore props (trees, rocks, crystals, landmarks...). Each prop is painted without lines
 * using the Scenery brushes, then wrapped in a single dilate-filter outline tinted from its own
 * colours, so props sit in the painted backdrops yet read as clear gameplay objects.
 * Contract (used by WArt.prop): { w, h, svg(v) → 'defs|body' }. Glows stay outside the outline. */

const PropArt = (() => {
  const f = n => Math.round(n * 10) / 10;
  const Cn = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
  const En = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
  const Pn = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;
  const Ln = (d, c, w, x = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${x}/>`;
  const Rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${extra}/>`;
  const op = a => ` opacity="${Math.round(a * 100) / 100}"`;
  const poly = pts => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
  const ctx = seed => Scenery.newCtx(U.rng(seed));
  /** outline filter + wrapper: glow (unfiltered) + painted body with a unified tinted outline */
  const wrap = (C, body, line, glow = '', r = 2.2) =>
    C.defs + `<filter id="ol" x="-15%" y="-15%" width="130%" height="130%"><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="${line}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    '|' + glow + `<g filter="url(#ol)">${body}</g>`;

  const LEAF = [
    { hi: '#eaffa0', lit: '#a8dc62', mid: '#6cb448', sh: '#3a7a3a' },
    { hi: '#fff3a0', lit: '#c2de5c', mid: '#8abf46', sh: '#4a8638' },
    { hi: '#d8ffb0', lit: '#8fd070', mid: '#56a352', sh: '#2f6a40' },
  ];

  /** tapered trunk with root flare, lit left edge, shadowed right side and bark strokes */
  function trunk(C, x, yb, w, h, c) {
    const R = C.R, P = Paint.ramp(c), top = yb - h;
    const d = `M${f(x - w * 0.95)} ${f(yb)}Q${f(x - w * 0.45)} ${f(yb - 5)} ${f(x - w * 0.42)} ${f(yb - h * 0.3)}L${f(x - w * 0.3)} ${f(top)}L${f(x + w * 0.3)} ${f(top)}L${f(x + w * 0.42)} ${f(yb - h * 0.3)}Q${f(x + w * 0.45)} ${f(yb - 5)} ${f(x + w * 0.95)} ${f(yb)}Z`;
    let s = Pn(d, c) + Pn(`M${f(x + w * 0.05)} ${f(top)}L${f(x + w * 0.3)} ${f(top)}L${f(x + w * 0.42)} ${f(yb - h * 0.3)}Q${f(x + w * 0.45)} ${f(yb - 5)} ${f(x + w * 0.95)} ${f(yb)}L${f(x + w * 0.1)} ${f(yb)}Z`, P.sh, op(0.75));
    s += Ln(`M${f(x - w * 0.3)} ${f(top + 4)}L${f(x - w * 0.38)} ${f(yb - h * 0.3)}Q${f(x - w * 0.42)} ${f(yb - 6)} ${f(x - w * 0.8)} ${f(yb - 1)}`, P.lt, Math.max(1.5, w * 0.12), op(0.7));
    for (let i = 0; i < 3; i++) { const bx = x - w * 0.15 + i * w * 0.15; s += Ln(`M${f(bx)} ${f(top + 6 + R() * 8)}q${f((R() - 0.5) * 4)} ${f(h * 0.3)} ${f((R() - 0.5) * 3)} ${f(h * (0.5 + R() * 0.3))}`, P.deep, 1.3, op(0.5)); }
    return s;
  }
  /** organic boulder: lit top plane, shadowed lower right, cracks, optional moss or snow */
  function boulder(C, x, yb, w, h, c, o = {}) {
    const R = C.R, P = Paint.ramp(c);
    const pts = [[x + w * 0.5, yb], [x - w * 0.5, yb]];
    for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; pts.push([x + Math.cos(a) * w * 0.5 * (0.9 + R() * 0.16), yb + Math.sin(a) * h * (0.82 + R() * 0.26) * (i === 0 || i === 8 ? 0.4 : 1)]); }
    pts.push([x + w * 0.5, yb]);
    const d = Scenery.smoothClosed(Scenery.roughen(pts.slice(1), R, 2, 1)), cid = C.id('bc');
    C.defs += `<clipPath id="${cid}"><path d="${d}"/></clipPath>`;
    let inner = Pn(`M${f(x - w)} ${f(yb - h * 1.4)}L${f(x + w)} ${f(yb - h * 1.4)}L${f(x + w)} ${f(yb + 4)}L${f(x - w)} ${f(yb + 4)}Z`, P.sh, op(0.6)) +
      En(x - w * 0.12, yb - h * 0.52, w * 0.52, h * 0.62, c) + En(x - w * 0.2, yb - h * 0.7, w * 0.32, h * 0.3, P.lt, op(0.75)) + En(x - w * 0.24, yb - h * 0.78, w * 0.12, h * 0.07, P.hi, op(0.7));
    inner += Ln(`M${f(x + w * 0.05)} ${f(yb - h * 0.7)}l${f(w * 0.08)} ${f(h * 0.25)}l${f(-w * 0.04)} ${f(h * 0.2)}`, P.deep, 1.6, op(0.55)) + Ln(`M${f(x - w * 0.3)} ${f(yb - h * 0.3)}l${f(w * 0.1)} ${f(h * 0.12)}`, P.deep, 1.3, op(0.45));
    if (o.moss) inner += Pn(`M${f(x - w * 0.46)} ${f(yb - h * 0.5)}Q${f(x - w * 0.3)} ${f(yb - h * 1.05)} ${f(x + w * 0.05)} ${f(yb - h * 0.98)}Q${f(x - w * 0.1)} ${f(yb - h * 0.8)} ${f(x - w * 0.2)} ${f(yb - h * 0.7)}Q${f(x - w * 0.34)} ${f(yb - h * 0.6)} ${f(x - w * 0.46)} ${f(yb - h * 0.5)}Z`, '#6ab04a') + Cn(x - w * 0.25, yb - h * 0.88, w * 0.05, '#a8e070');
    if (o.snow) inner += Pn(`M${f(x - w * 0.6)} ${f(yb - h * 0.55)}Q${f(x - w * 0.3)} ${f(yb - h * 1.15)} ${f(x + w * 0.15)} ${f(yb - h * 1.1)}Q${f(x + w * 0.5)} ${f(yb - h * 0.95)} ${f(x + w * 0.6)} ${f(yb - h * 0.5)}Q${f(x + w * 0.3)} ${f(yb - h * 0.62)} ${f(x + w * 0.1)} ${f(yb - h * 0.55)}Q${f(x - w * 0.2)} ${f(yb - h * 0.66)} ${f(x - w * 0.6)} ${f(yb - h * 0.55)}Z`, '#ffffff') +
      Pn(`M${f(x + w * 0.1)} ${f(yb - h * 0.62)}Q${f(x + w * 0.4)} ${f(yb - h * 0.72)} ${f(x + w * 0.6)} ${f(yb - h * 0.5)}Q${f(x + w * 0.3)} ${f(yb - h * 0.6)} ${f(x + w * 0.1)} ${f(yb - h * 0.55)}Z`, '#c4d4f0');
    return Pn(d, c) + `<g clip-path="url(#${cid})">${inner}</g>`;
  }
  /** a single painted mushroom (stem, domed cap with shade, spots, gills) */
  function shroom(C, x, yb, h, cap, o = {}) {
    const P = Paint.ramp(cap), w = h * 0.95;
    let s = Pn(`M${f(x - w * 0.14)} ${f(yb)}Q${f(x - w * 0.2)} ${f(yb - h * 0.4)} ${f(x - w * 0.12)} ${f(yb - h * 0.62)}L${f(x + w * 0.12)} ${f(yb - h * 0.62)}Q${f(x + w * 0.2)} ${f(yb - h * 0.4)} ${f(x + w * 0.14)} ${f(yb)}Z`, o.stem || '#f6ecdc') +
      Pn(`M${f(x + w * 0.02)} ${f(yb)}Q${f(x + w * 0.12)} ${f(yb - h * 0.4)} ${f(x + w * 0.04)} ${f(yb - h * 0.62)}L${f(x + w * 0.12)} ${f(yb - h * 0.62)}Q${f(x + w * 0.2)} ${f(yb - h * 0.4)} ${f(x + w * 0.14)} ${f(yb)}Z`, '#c8b8b0', op(0.6));
    s += En(x, yb - h * 0.6, w * 0.46, h * 0.07, '#b8a0a0');
    const capD = `M${f(x - w * 0.52)} ${f(yb - h * 0.58)}Q${f(x - w * 0.52)} ${f(yb - h * 1.08)} ${f(x)} ${f(yb - h * 1.1)}Q${f(x + w * 0.52)} ${f(yb - h * 1.08)} ${f(x + w * 0.52)} ${f(yb - h * 0.58)}Q${f(x)} ${f(yb - h * 0.5)} ${f(x - w * 0.52)} ${f(yb - h * 0.58)}Z`;
    s += Pn(capD, cap) + Pn(`M${f(x + w * 0.08)} ${f(yb - h * 1.09)}Q${f(x + w * 0.52)} ${f(yb - h * 1.05)} ${f(x + w * 0.52)} ${f(yb - h * 0.58)}Q${f(x + w * 0.3)} ${f(yb - h * 0.54)} ${f(x + w * 0.12)} ${f(yb - h * 0.53)}Q${f(x + w * 0.3)} ${f(yb - h * 0.8)} ${f(x + w * 0.08)} ${f(yb - h * 1.09)}Z`, P.sh, op(0.7));
    s += En(x - w * 0.24, yb - h * 0.92, w * 0.14, h * 0.06, P.hi, op(0.85));
    for (const [sx, sy, r] of [[-0.24, 0.8, 0.09], [0.08, 0.95, 0.11], [0.3, 0.72, 0.07], [-0.02, 0.7, 0.06]]) s += En(x + sx * w, yb - sy * h, r * w, r * w * 0.8, o.spots || '#fff8f0');
    return s;
  }

  const PROP = {
    tree_round: { w: 150, h: 190, svg(v) {
      const C = ctx(11 + v), pal = LEAF[v % 3];
      let b = trunk(C, 75, 186, 20, 86, '#8a5a3c') + Scenery.crown(C, 75, 82, 60, pal, { n: 10, dabs: 8 });
      if (v % 2) for (const [x, y] of [[48, 96], [98, 90], [70, 70], [104, 112]]) b += Cn(x, y, 5.5, '#e8403a') + Cn(x - 1.6, y - 1.8, 1.8, '#ffd0c0');
      return wrap(C, b, '#1f3a26');
    } },
    tree_pine: { w: 110, h: 200, svg(v) {
      const C = ctx(21 + v);
      const pal = v % 2 ? { lit: '#7ac08a', mid: '#3f9a6a', sh: '#23604a' } : { lit: '#8acf8a', mid: '#4aa56f', sh: '#2a6a4a' };
      return wrap(C, Scenery.pine(C, 55, 196, 190, pal, { tiers: 5, wk: 0.26, trunk: '#6a4a38' }), '#15322a');
    } },
    tree_snow: { w: 110, h: 200, svg(v) {
      const C = ctx(31 + v);
      return wrap(C, Scenery.pine(C, 55, 196, 190, { lit: '#7ab0b0', mid: '#4f8f84', sh: '#2c5a60' }, { tiers: 5, wk: 0.26, trunk: '#6a4a38', snow: '#ffffff' }), '#1a3040');
    } },
    tree_palm: { w: 170, h: 220, svg(v) {
      const C = ctx(41 + v);
      return wrap(C, Scenery.palm(C, 78, 216, 150, { lit: '#c6ec84', mid: '#4fa84a', sh: '#2f7a3c', trunk: '#c09060', trunkSh: '#8a6038' }, { lean: 0.08, fk: 1 }), '#1e3a24');
    } },
    tree_dead: { w: 130, h: 170, svg(v) {
      const C = ctx(51 + v);
      return wrap(C, Scenery.deadTree(C, 64, 168, 170, '#5a3c48', '#b08a8a'), '#1e1218');
    } },
    tree_twist: { w: 150, h: 200, svg(v) {
      const C = ctx(61 + v), pal = v % 2 ? { hi: '#bafcff', lit: '#9a7ae0', mid: '#6a4ac0', sh: '#3a2a80' } : { hi: '#ffc8f8', lit: '#8a6ad8', mid: '#5f4ab0', sh: '#30246e' };
      let b = Pn('M64 198Q58 170 72 148Q86 126 70 104L82 100Q98 126 84 150Q72 172 86 198Z', '#3c2a58') + Ln('M68 190Q64 168 76 148Q88 128 74 106', '#6a5090', 2.4, op(0.7));
      b += Scenery.crown(C, 75, 76, 56, pal, { n: 9, dabs: 6 });
      let glow = '';
      for (const [x, y] of [[50, 70], [96, 64], [80, 104], [40, 100], [66, 44]]) { glow += Cn(x, y, 14, C.soft('#8ffcff', 0.5, 0.2)); b += Cn(x, y, 5, '#bafcff') + Cn(x - 1.5, y - 1.5, 1.8, '#ffffff'); }
      return wrap(C, b, '#1a1238', glow);
    } },
    bush: { w: 110, h: 70, svg(v) {
      const C = ctx(71 + v), pal = LEAF[v % 3];
      let b = Scenery.crown(C, 55, 42, 30, pal, { n: 8, wide: 1.45, dabs: 5 });
      if (v % 2) for (const [x, y] of [[30, 34], [58, 24], [82, 38], [44, 48]]) b += Cn(x, y, 4.5, '#ff8fb8') + Cn(x, y, 1.6, '#ffe070');
      return wrap(C, b, '#1f3a26');
    } },
    rock: { w: 100, h: 70, svg(v) {
      const C = ctx(81 + v), c = ['#a39a92', '#8f8a9e', '#6a5a66', '#b0a0d0'][v % 4];
      return wrap(C, boulder(C, 50, 66, 84, 52, c, { moss: v % 2 === 0 && v !== 2 }), Paint.ramp(c).line);
    } },
    rock_snow: { w: 100, h: 74, svg(v) {
      const C = ctx(91 + v);
      return wrap(C, boulder(C, 50, 70, 84, 56, '#9aa8bd', { snow: true }), '#1e2a44');
    } },
    crystal: { w: 70, h: 110, svg(v) {
      const C = ctx(101 + v), c = ['#8fd8ff', '#ff6a6a', '#ffe066', '#c09aff'][v % 4], P = Paint.ramp(c);
      const body = Scenery.shards(C, 35, 106, 86, { hi: '#ffffff', mid: c, sh: P.sh, glow: c, line: P.deep }, { n: 3 });
      return wrap(C, body.replace(/<ellipse[^>]*url\(#sf\d+\)[^>]*\/>/, ''), P.line, Cn(35, 64, 34, C.soft(c, 0.35, 0.2)));
    } },
    mushroom: { w: 80, h: 84, svg(v) {
      const C = ctx(111 + v), glow = v % 2;
      const b = shroom(C, 40, 82, 72, glow ? '#5fc8ff' : '#e84a3a', { spots: glow ? '#e8fdff' : '#fff8f0' });
      return wrap(C, b, glow ? '#12304a' : '#3a1418', glow ? Cn(40, 40, 40, C.soft('#8ffcff', 0.35, 0.2)) : '');
    } },
    coral: { w: 90, h: 96, svg(v) {
      const C = ctx(121 + v), c = v % 2 ? '#ff7aa8' : '#ff9a6a', P = Paint.ramp(c);
      const d = 'M45 94L45 60M45 70C30 60 24 44 26 26M45 62C60 52 66 36 64 18M26 40C18 36 14 28 14 20M64 34C72 30 76 24 78 14';
      const b = Ln(d, c, 11) + Ln(d, P.sh, 5, ' transform="translate(2 1)"' + op(0.6)) + Ln(d, P.hi, 3, ' transform="translate(-2 -1)"' + op(0.7)) +
        [[26, 26], [64, 18], [14, 20], [78, 14]].map(([x, y]) => Cn(x, y, 6, P.lt) + Cn(x - 1.5, y - 1.5, 2, '#ffffff', op(0.7))).join('');
      return wrap(C, b, P.line);
    } },
    shell_big: { w: 60, h: 46, svg() {
      const C = ctx(131);
      let b = Pn('M30 44L4 22Q8 6 30 4Q52 6 56 22Z', '#ffc2d6') + Pn('M30 44L44 10Q52 12 56 22Z', '#e8899f', op(0.55));
      for (const a of [-60, -35, -12, 12, 35, 60]) b += Ln(`M30 42L${f(30 + Math.sin(a * Math.PI / 180) * 26)} ${f(42 - Math.cos(a * Math.PI / 180) * 36)}`, '#d8708a', 2, op(0.55));
      b += Pn('M24 44L30 36L36 44Z', '#f0a0b8') + En(20, 14, 6, 3, '#ffffff', op(0.7));
      return wrap(C, b, '#5a2034');
    } },
    lava_vent: { w: 100, h: 64, svg() {
      const C = ctx(141);
      let b = boulder(C, 50, 60, 90, 36, '#5a4450');
      b += Pn('M38 30L46 44L42 60L58 60L54 42L62 30Q50 34 38 30Z', '#ff7a2e') + Pn('M45 33L50 44L47 58L53 58L53 43L57 33Q51 36 45 33Z', '#ffe066');
      return wrap(C, b, '#1a0e14', Cn(50, 34, 36, C.soft('#ff8a2e', 0.5, 0.2)));
    } },
    basalt: { w: 80, h: 120, svg() {
      const C = ctx(151);
      const col = (x, w, top, c) => { const P = Paint.ramp(c); return Pn(poly([[x, 116], [x, top], [x + w / 2, top - 6], [x + w, top], [x + w, 116]]), c) + Rect(x + w * 0.55, top, w * 0.45, 116 - top, P.sh, op(0.8)) + Pn(poly([[x, top], [x + w / 2, top - 6], [x + w, top], [x + w / 2, top + 5]]), P.lt) + Ln(`M${x + 1.5} ${top + 3}L${x + 1.5} 114`, P.hi, 1.4, op(0.5)); };
      return wrap(C, col(8, 24, 40, '#4a3c4c') + col(40, 26, 18, '#56465a') + col(28, 20, 60, '#3e3242'), '#140c16');
    } },
    snowman: { w: 80, h: 110, svg() {
      const C = ctx(161);
      const ball = (x, y, r) => Cn(x, y, r, '#ffffff') + Pn(`M${f(x + r * 0.3)} ${f(y - r * 0.95)}A${f(r)} ${f(r)} 0 0 1 ${f(x - r * 0.4)} ${f(y + r * 0.92)}A${f(r * 1.15)} ${f(r * 1.15)} 0 0 0 ${f(x + r * 0.3)} ${f(y - r * 0.95)}Z`, '#c8d4f0') + En(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, '#ffffff', op(0.9));
      let b = ball(40, 80, 26) + ball(40, 42, 19);
      b += Pn('M40 44L60 47L40 50Z', '#ff8a3d') + Cn(34, 36, 2.6, '#2b2040') + Cn(46, 36, 2.6, '#2b2040') + Cn(40, 74, 2.4, '#2b2040') + Cn(40, 86, 2.4, '#2b2040');
      b += Pn('M22 58Q40 66 58 58L58 64Q40 72 22 64Z', '#ff5d6c') + Pn('M50 62L56 80L48 78Z', '#e0404e');
      b += Rect(20, 22, 40, 5, '#3a3050') + Pn('M26 23L28 4L52 4L54 23Z', '#4a3a6a') + Rect(27, 16, 26, 4, '#ff5d6c');
      b += Ln('M18 70L4 58M62 70L76 56', '#6a4a38', 3) + Ln('M8 61L4 54M72 59L76 52', '#6a4a38', 2);
      return wrap(C, b, '#2a2848');
    } },
    tesla: { w: 70, h: 140, svg() {
      const C = ctx(171);
      let b = Pn('M28 136L31 60L39 60L42 136Z', '#6a5a8a') + Rect(35, 60, 7, 76, '#4a3a6a', op(0.8));
      for (const y of [74, 96, 118]) b += En(35, y, 10, 3.5, '#8a7aaa') + En(35, y - 1, 8, 2, '#b8a8d8', op(0.8));
      b += Pn('M35 6L50 40L35 64L20 40Z', '#ffe066') + Pn('M35 6L50 40L35 64Z', '#e8b020', op(0.8)) + Pn('M35 10L26 40L35 36Z', '#fff8c0', op(0.9));
      const arcs = Ln('M35 28L22 14L18 20M35 38L56 22L58 30M35 44L12 42', '#fff7a0', 2.2) + Ln('M35 28L22 14M35 38L56 22', '#ffffff', 1);
      return wrap(C, b, '#2a1f44', Cn(35, 38, 34, C.soft('#fff7a0', 0.45, 0.2)) + arcs);
    } },
    pillar: { w: 70, h: 160, svg(v) {
      const C = ctx(181 + v);
      let b = Pn('M16 156L16 34L54 34L54 156Z', '#7a6aae') + Rect(40, 34, 14, 122, '#4c3c80', op(0.7)) + Rect(17, 34, 5, 122, '#a898d8', op(0.7));
      for (const x of [26, 34, 44]) b += Ln(`M${x} 40L${x} 146`, '#4c3c80', 2.2, op(0.55));
      b += Pn('M10 36L10 24L60 24L60 36Z', '#8c7cc0') + Rect(10, 24, 50, 3, '#c0b0f0') + Pn('M10 156L10 146L60 146L60 156Z', '#8c7cc0');
      if (v % 2) b += Pn('M16 24L24 8L32 18L42 2L54 24Z', '#7a6aae') + Pn('M42 2L54 24L44 24Z', '#4c3c80', op(0.7));
      b += Pn('M30 88L35 80L40 88L35 96Z', '#c9a0ff');
      return wrap(C, b, '#1e1640', Cn(35, 88, 16, C.soft('#c9a0ff', 0.5, 0.2)));
    } },
    lantern: { w: 44, h: 100, svg() {
      const C = ctx(191);
      let b = Rect(20, 34, 5, 64, '#4a3a6a') + Rect(22.5, 34, 2.5, 64, '#2e2448') + Pn('M12 96L32 96L30 92L14 92Z', '#4a3a6a');
      b += Pn('M12 14L32 14L30 36L14 36Z', '#ffe680') + Pn('M22 14L32 14L30 36L22 36Z', '#f0b840', op(0.8)) + Pn('M10 14L22 4L34 14Z', '#4a3a6a') + Rect(12, 34, 20, 3, '#4a3a6a') + Ln('M22 16L22 34', '#4a3a6a', 1.6);
      return wrap(C, b, '#1e1630', Cn(22, 25, 22, C.soft('#fff49a', 0.55, 0.2)));
    } },
    stump: { w: 80, h: 56, svg() {
      const C = ctx(201);
      let b = trunk(C, 40, 52, 30, 30, '#8a5a3c');
      b += En(40, 22, 22, 7, '#e0b884') + En(40, 22, 14, 4.4, 'none', ' stroke="#b8885a" stroke-width="1.6"') + En(40, 22, 7, 2.2, 'none', ' stroke="#b8885a" stroke-width="1.4"') + Pn('M20 26Q30 32 44 30L42 36Q28 36 20 30Z', '#6ab04a', op(0.85));
      return wrap(C, b, '#2e1a14');
    } },
    sign: { w: 90, h: 100, svg(v) {
      const C = ctx(211 + v);
      const flip = v === 1;
      const board = flip ? 'M84 22L26 22L12 36L26 50L84 50Z' : 'M6 22L64 22L78 36L64 50L6 50Z';
      let b = Rect(40, 26, 10, 72, '#9a6a44') + Rect(45, 26, 5, 72, '#6a4428', op(0.7));
      b += Pn(board, '#e8c070') + Pn(flip ? 'M84 36L26 36L12 36L26 50L84 50Z' : 'M6 36L64 36L78 36L64 50L6 50Z', '#c8984a', op(0.6)) + Ln(flip ? 'M30 29L80 29' : 'M10 29L60 29', '#fff0c0', 2, op(0.6));
      b += Cn(flip ? 76 : 14, 36, 2, '#6a4a2a') + Pn(flip ? 'M50 28L36 36L50 44Z' : 'M40 28L54 36L40 44Z', '#b8602e');
      return wrap(C, b, '#3a2414');
    } },
    pod: { w: 120, h: 150, svg() {
      const C = ctx(221);
      let b = En(60, 138, 52, 11, '#6a7a98') + En(60, 135, 46, 8, '#9aaac8');
      b += Pn('M20 136L24 60C24 30 40 14 60 14C80 14 96 30 96 60L100 136Z', C.lin([[0, '#ffffff'], [0.5, '#e4ecff'], [1, '#aab8dc']], 0, 0, 1, 0));
      b += Pn('M34 118L36 62C36 42 46 30 60 30C74 30 84 42 84 62L86 118Z', C.lin([[0, '#c8fff0'], [1, '#6ad8b0']])) + Pn('M40 110L42 64C42 48 50 38 60 38', 'none', ' stroke="#ffffff" stroke-width="4" opacity=".55"');
      b += Pn('M54 56H66V68H78V80H66V92H54V80H42V68H54Z', '#3cc97a') + Pn('M54 56H66V68H54Z', '#8cf0b8', op(0.8)) + Cn(60, 14, 6, '#ffe066') + Rect(58.5, 2, 3, 8, '#4a4a6a');
      return wrap(C, b, '#26304e', Cn(60, 74, 44, C.soft('#caffea', 0.4, 0.3)));
    } },
    chest: { w: 80, h: 70, svg(v) {
      const C = ctx(231 + v);
      let b;
      if (v === 1) b = Pn('M10 36L14 66L66 66L70 36Z', '#b87840') + Pn('M40 36L42 66L66 66L70 36Z', '#8a5428', op(0.7)) + Pn('M10 36L6 10L74 10L70 36Z', '#9a6034') + Pn('M12 34L68 34L66 20L14 20Z', '#3a2030') + Rect(8, 34, 64, 5, '#e8b030');
      else b = Pn('M8 34L12 66L68 66L72 34Z', '#c8844a') + Pn('M40 34L42 66L68 66L72 34Z', '#8a5428', op(0.6)) + Pn('M8 34C8 14 20 8 40 8C60 8 72 14 72 34Z', '#d9944f') + Pn('M40 8C60 8 72 14 72 34L42 34Z', '#a86a36', op(0.55)) + Ln('M14 30C16 16 26 12 40 12', '#ffd8a0', 2.2, op(0.7)) +
        Rect(6, 32, 68, 5, '#e8b030') + Rect(22, 8, 5, 58, '#e8b030', op(0.9)) + Rect(53, 8, 5, 58, '#e8b030', op(0.9)) + Pn('M34 30L46 30L46 44L34 44Z', '#ffd23f') + Cn(40, 37, 2.6, '#5a3a14');
      return wrap(C, b, '#3a2010');
    } },
    ship: { w: 230, h: 210, svg() {
      const C = ctx(241);
      let b = En(115, 196, 100, 14, '#5a5a7a') + En(115, 192, 86, 10, '#8f8fb0') + En(115, 190, 70, 6, '#b8b8d8', op(0.6));
      b += Pn('M72 170L50 196L96 184Z', '#e84a5a') + Pn('M158 170L180 196L134 184Z', '#c83a4a') + Pn('M96 176L100 190L130 190L134 176Z', '#7a7a98');
      b += Pn('M115 8C150 30 162 90 152 176L78 176C68 90 80 30 115 8Z', C.lin([[0, '#ffffff'], [0.45, '#eef2ff'], [1, '#a8b0d0']], 0, 0, 1, 0));
      b += Pn('M115 8C130 18 140 36 144 56L86 56C90 36 100 18 115 8Z', '#ff5d6c') + Pn('M115 8C130 18 140 36 144 56L118 56Z', '#c83a4a', op(0.6)) + Ln('M92 50C96 34 104 22 114 14', '#ffb0b8', 2.4, op(0.8));
      b += Cn(115, 94, 21, '#4a5a8a') + Cn(115, 94, 16, C.rad([[0, '#bff4ff'], [1, '#3a9ae0']], { cx: '35%', cy: '30%', r: '80%' })) + En(109, 88, 6, 4, '#ffffff', op(0.8));
      b += Ln('M84 140L146 140', '#c9d3ea', 4) + Ln('M86 60C84 90 84 130 88 172', '#ffffff', 3, op(0.6));
      return wrap(C, b, '#26284a');
    } },
    observatory: { w: 230, h: 210, svg() {
      const C = ctx(251);
      let b = Pn('M20 206L24 110L206 110L210 206Z', '#6f5ab0') + Pn('M115 110L206 110L210 206L115 206Z', '#4a3a86', op(0.6)) + Rect(24, 110, 182, 6, '#9a86d8');
      b += Pn('M14 114C14 50 60 18 115 18C170 18 216 50 216 114Z', C.lin([[0, '#e0d4ff'], [0.5, '#b8a6ff'], [1, '#7a66d0']], 0, 0, 1, 0.6)) + Ln('M30 100C34 60 70 30 115 26', '#ffffff', 3, op(0.55));
      b += Pn('M104 22L126 22L130 114L100 114Z', '#2e2258', op(0.85)) + Ln('M115 60L172 28', '#6a6a90', 12) + Ln('M115 60L172 28', '#b8b8d8', 5) + Cn(174, 27, 7, '#8fe3ff');
      b += Pn('M92 206L92 150C92 138 138 138 138 150L138 206Z', '#2a1f4a') + Cn(128, 178, 2.4, '#ffd23f');
      for (const [x, y] of [[50, 60], [180, 70], [150, 40]]) b += Pn(`M${x} ${y - 6}Q${x + 1} ${y - 1} ${x + 6} ${y}Q${x + 1} ${y + 1} ${x} ${y + 6}Q${x - 1} ${y + 1} ${x - 6} ${y}Q${x - 1} ${y - 1} ${x} ${y - 6}Z`, '#fffbe0');
      return wrap(C, b, '#1e1640');
    } },
    /* ---- the home glade ---- */
    treehouse: { w: 320, h: 340, svg() {
      const C = ctx(301), R = C.R;
      // shadow & roots
      let b = En(165, 330, 150, 16, C.soft('#12301a', 0.55, 0.3));
      for (const [x0, d] of [[70, -1], [110, -0.4], [215, 0.5], [255, 1]]) b += Pn(`M${x0} 300Q${x0 + d * 40} 318 ${x0 + d * 70} 332Q${x0 + d * 30} 334 ${x0 - d * 6} 322Z`, '#6a4630');
      // the trunk: a huge stump, lit from the left, with deep bark grooves
      const trunkD = 'M62 330C66 250 58 190 70 130C80 96 110 82 160 82C212 82 244 96 252 132C262 190 254 252 262 330Z';
      b += Pn(trunkD, C.lin([[0, '#b08058'], [0.3, '#8e6040'], [0.7, '#6a4630'], [1, '#452c1e']], 0, 0, 1, 0));
      for (let k = 0; k < 11; k++) { const gx = 78 + k * 17 + (R() - 0.5) * 6; b += Ln(`M${f(gx)} ${f(96 + R() * 20)}q${f((R() - 0.5) * 10)} ${f(90 + R() * 40)} ${f((R() - 0.5) * 6)} ${f(210 + R() * 20)}`, '#3a2416', 2 + R() * 1.6, op(0.5)); }
      b += Ln('M76 140C72 200 74 260 70 318', '#d8a878', 4, op(0.55));
      // a leafy crown and a branch on top (the tree still lives)
      b += Pn('M96 96C84 70 70 58 54 56', 'none', ' stroke="#6a4630" stroke-width="12" stroke-linecap="round"') + Pn('M214 92C230 64 252 52 270 50', 'none', ' stroke="#6a4630" stroke-width="10" stroke-linecap="round"');
      b += Scenery.crown(C, 160, 62, 70, { hi: '#e8ffa0', lit: '#9ad65a', mid: '#5fae44', sh: '#327a38' }, { n: 11, wide: 1.5, dabs: 8 }) + Scenery.crown(C, 56, 60, 28, { hi: '#e8ffa0', lit: '#9ad65a', mid: '#5fae44', sh: '#327a38' }, { n: 6, dabs: 3 }) + Scenery.crown(C, 272, 54, 26, { hi: '#e8ffa0', lit: '#9ad65a', mid: '#5fae44', sh: '#327a38' }, { n: 6, dabs: 3 });
      // round window with warm light
      b += Cn(196, 172, 25, '#4a2c1c') + Cn(196, 172, 20, C.rad([[0, '#fff6c0'], [0.6, '#ffd060'], [1, '#e89a30']], { cx: '40%', cy: '35%', r: '70%' })) + Ln('M196 152L196 192M176 172L216 172', '#5a3a24', 4) + Cn(196, 172, 20, 'none', ' stroke="#8a5a36" stroke-width="3"');
      // the arched door with planks, hinges and a knob
      b += Pn('M126 330L126 262C126 232 146 218 162 218C178 218 198 232 198 262L198 330Z', '#4a2c1c') + Pn('M132 330L132 264C132 240 148 226 162 226C176 226 192 240 192 264L192 330Z', C.lin([[0, '#d89a58'], [1, '#a86a34']], 0, 0, 1, 0));
      for (const x of [148, 162, 176]) b += Ln(`M${x} ${x === 162 ? 228 : 234}L${x} 328`, '#8a5428', 2, op(0.7));
      b += Rect(134, 256, 56, 5, '#6a4a2a') + Rect(134, 300, 56, 5, '#6a4a2a') + Cn(184, 286, 4, '#ffd23f') + Cn(183, 285, 1.4, '#fff6c0');
      // lantern by the door
      b += Ln('M214 250L226 250L226 258', '#3a2a20', 2.4) + Pn('M219 258L233 258L231 278L221 278Z', '#ffe680') + Pn('M218 256L234 256L230 250L222 250Z', '#3a2a20');
      // a little deck with a railing and a ladder on the right
      b += Pn('M244 206L312 206L312 216L244 216Z', '#c89a60') + Rect(244, 214, 68, 4, '#8a6038') + Rect(300, 216, 6, 114, '#9a6a44') + Rect(302, 216, 2, 114, '#6a4428', op(0.7));
      for (const x of [252, 270, 288, 306]) b += Rect(x, 186, 4, 20, '#b8844e');
      b += Rect(248, 184, 64, 5, '#d8aa70');
      b += Ln('M272 218L282 330M292 218L302 330', '#8a6038', 4);
      for (let k = 0; k < 6; k++) b += Ln(`M${f(273.6 + k * 1.8)} ${f(232 + k * 18)}L${f(294 + k * 1.8)} ${f(232 + k * 18)}`, '#b8844e', 3);
      // shelf mushrooms on the left side
      for (const [x, y, w] of [[62, 228, 26], [58, 256, 20], [66, 200, 16]]) b += Pn(`M${x} ${y}Q${x - w * 0.9} ${y - w * 0.5} ${x - w} ${y + 2}Q${x - w * 0.5} ${y + 8} ${x} ${y + 6}Z`, '#f09040') + En(x - w * 0.55, y - w * 0.12, w * 0.2, w * 0.1, '#ffe0b0', op(0.9)) + En(x - w * 0.25, y, w * 0.12, w * 0.07, '#ffe0b0', op(0.9));
      // mushrooms at the foot of the trunk
      for (const [x, y, s2] of [[92, 326, 1], [236, 328, 0.8]]) b += En(x, y - 10 * s2, 12 * s2, 8 * s2, '#e8503a') + Rect(x - 3 * s2, y - 8 * s2, 6 * s2, 9 * s2, '#fff4e0') + Cn(x - 4 * s2, y - 13 * s2, 2.4 * s2, '#ffffff') + Cn(x + 4 * s2, y - 11 * s2, 1.8 * s2, '#ffffff');
      return wrap(C, b, '#2a1a10', Cn(196, 172, 44, C.soft('#fff0a0', 0.5, 0.25)) + Cn(226, 268, 26, C.soft('#fff49a', 0.55, 0.2)));
    } },
    hatchery: { w: 160, h: 150, svg(v) {
      const C = ctx(311);
      let b = En(80, 142, 62, 9, C.soft('#12301a', 0.5, 0.3));
      // a stump pedestal
      b += Pn('M44 142L48 100L112 100L116 142Z', C.lin([[0, '#a8784e'], [0.6, '#7a5234'], [1, '#4e3222']], 0, 0, 1, 0)) + En(80, 100, 32, 9, '#e0bc84') + En(80, 100, 20, 5, 'none', ' stroke="#b8885a" stroke-width="1.6"');
      // the woven nest
      b += Pn('M36 96Q40 78 80 76Q120 78 124 96Q120 110 80 112Q40 110 36 96Z', '#b88a50');
      for (let k = 0; k < 7; k++) b += Ln(`M${38 + k * 12} ${96 + (k % 2) * 4}q8 -8 18 -2`, '#7a5430', 2.2, op(0.8));
      // three speckled eggs (v1: an empty nest — the Base lays the real eggs on it)
      if (!v) for (const [x, y, c] of [[62, 80, '#ffe6b0'], [96, 78, '#bfe6ff'], [80, 70, '#ffd0e6']]) b += En(x, y, 13, 17, c) + En(x - 4, y - 6, 4, 5, '#ffffff', op(0.7)) + Cn(x + 4, y + 2, 2, U.shade(c, -0.3)) + Cn(x - 3, y + 6, 1.6, U.shade(c, -0.3));
      // a glass dome with a golden rim
      b += Pn('M30 98C30 40 52 18 80 18C108 18 130 40 130 98Z', 'rgba(210,240,255,.28)') + Ln('M40 88C40 50 56 30 76 26', '#ffffff', 4, op(0.7)) + Pn('M26 98L134 98L132 106L28 106Z', '#e8b030') + Rect(28, 101, 104, 2, '#fff0a0', op(0.8)) + Cn(80, 16, 6, '#e8b030') + Cn(78, 14, 2, '#fff6c0');
      return wrap(C, b, '#3a2414', Cn(80, 70, 56, C.soft('#fff4c0', 0.45, 0.3)));
    } },
    dojo: { w: 200, h: 130, svg() {
      const C = ctx(321);
      // a round straw mat with woven rings
      let b = En(94, 104, 88, 22, '#9a7a4a') + En(94, 100, 86, 21, '#e8cf8a');
      for (const k of [0.78, 0.55, 0.32]) b += En(94, 100, 86 * k, 21 * k, 'none', ' stroke="#c8a860" stroke-width="3"');
      b += Pn('M24 96Q94 118 164 96', 'none', ' stroke="#fff4c8" stroke-width="3" opacity=".6"');
      // a training post with rope bands and a pennant
      b += Pn('M150 104L152 24L168 24L170 104Z', C.lin([[0, '#c8905a'], [1, '#7a5030']], 0, 0, 1, 0)) + En(160, 24, 9, 3.4, '#e0bc84');
      for (const y of [44, 64, 84]) b += Rect(149, y, 23, 7, '#f0e0b0') + Ln(`M149 ${y + 3.5}L172 ${y + 3.5}`, '#c8a860', 1.6);
      b += Ln('M160 24L160 4', '#6a4428', 3) + Pn('M160 4L184 10L160 16Z', '#e8403a');
      // a punching bag hanging from a crossbar
      b += Ln('M30 20L60 20', '#7a5030', 5) + Ln('M34 20L34 100', '#8a5a36', 5) + Ln('M48 20L48 40', '#5a4030', 2) + Pn('M40 40L56 40L58 70Q48 78 38 70Z', '#d8403a') + Ln('M42 44L42 68', '#ff9a8a', 3, op(0.6));
      return wrap(C, b, '#3a2414');
    } },
    berrybush: { w: 130, h: 160, svg() {
      const C = ctx(331), R = C.R;
      let b = En(65, 154, 50, 8, C.soft('#12301a', 0.5, 0.3));
      // a tall, spiralling bush (tiers of leaves winding up)
      const pal = { hi: '#e6ff9a', lit: '#8fd05a', mid: '#4ea040', sh: '#2c6a34' };
      for (let k = 0; k < 6; k++) { const y = 140 - k * 22, r = 44 - k * 6; b += Scenery.crown(C, 65 + (k % 2 ? 6 : -6), y, r, pal, { n: 6, wide: 1.2, dabs: 3 }); }
      b += Pn('M60 150L62 128L70 128L72 150Z', '#6a4630');
      for (let i = 0; i < 12; i++) { const x = 40 + R() * 52, y = 30 + R() * 110; b += Pn(`M${f(x)} ${f(y - 6)}Q${f(x + 7)} ${f(y - 4)} ${f(x + 5)} ${f(y + 4)}Q${f(x)} ${f(y + 9)} ${f(x - 5)} ${f(y + 4)}Q${f(x - 7)} ${f(y - 4)} ${f(x)} ${f(y - 6)}Z`, '#e8303a') + Cn(x - 2, y - 2, 1.6, '#ffc0c0') + Pn(`M${f(x - 4)} ${f(y - 6)}L${f(x)} ${f(y - 9)}L${f(x + 4)} ${f(y - 6)}Z`, '#3a8a30'); }
      return wrap(C, b, '#1a3a20');
    } },
    fence: { w: 130, h: 56, svg() {
      const C = ctx(261);
      let b = Pn('M4 22L126 22L126 30L4 30Z', '#d9b27a') + Pn('M4 38L126 38L126 46L4 46Z', '#d9b27a') + Rect(4, 27, 122, 3, '#a8804a', op(0.7)) + Rect(4, 43, 122, 3, '#a8804a', op(0.7));
      for (const x of [14, 50, 86, 116]) b += Pn(`M${x - 6} 54L${x - 6} 14L${x} 6L${x + 6} 14L${x + 6} 54Z`, '#e8c690') + Rect(x + 1, 12, 5, 42, '#b88c52', op(0.7)) + Ln(`M${x - 4} 16L${x - 4} 52`, '#fff0cc', 1.6, op(0.7));
      return wrap(C, b, '#3a2414');
    } },
  };
  // the painting helpers are shared with base_art.js (the Base's workshops and decorations)
  return { PROP, H: { f, Cn, En, Pn, Ln, Rect, op, poly, ctx, wrap, trunk, boulder, shroom } };
})();
