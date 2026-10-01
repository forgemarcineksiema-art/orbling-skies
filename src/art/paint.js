'use strict';
/* Painterly SVG toolkit shared by the monster, scenery and prop generators.
 * Colour ramps with warm lights / cool shadows, matte volume gradients, soft two-step core shadows
 * with bounce light (shade), form-following fur strokes, scalloped blobs and painted rocks. */

const Paint = (() => {
  const f = n => Math.round(n * 10) / 10;
  const hueToward = (h, target, t) => { const d = ((target - h + 540) % 360) - 180; return (h + d * t + 360) % 360; };
  const cache = new Map();

  /** colour ramp: highlight (warm), light, base, shadow (cool), deep, line (dark coloured outline) */
  function ramp(c) {
    let r = cache.get(c);
    if (r) return r;
    const [h, s, l] = U.hexToHsl(c);
    const grey = s < 0.14;
    const hs = grey ? 232 : hueToward(h, 255, 0.2), sS = grey ? 0.22 : Math.min(1, s * 1.08 + 0.06);
    r = {
      hi: U.hslToHex(hueToward(h, 52, grey ? 0 : 0.28), grey ? s : Math.min(1, s * 0.95 + 0.05), Math.min(0.97, l + (1 - l) * 0.62)),
      lt: U.hslToHex(hueToward(h, 52, grey ? 0 : 0.12), Math.min(1, s * 1.02), Math.min(0.95, l + (1 - l) * 0.3)),
      base: c,
      sh: U.hslToHex(hs, sS, Math.max(0.06, Math.min(l * 0.74, l - 0.18))),
      deep: U.hslToHex(grey ? 240 : hueToward(h, 262, 0.34), grey ? 0.28 : Math.min(1, s * 1.12 + 0.1), Math.max(0.05, Math.min(l * 0.52, l - 0.3))),
      line: U.hslToHex(grey ? 250 : hueToward(h, 268, 0.4), grey ? 0.3 : Math.min(0.85, s * 0.85 + 0.18), Math.max(0.08, Math.min(0.24, l * 0.3))),
    };
    cache.set(c, r);
    return r;
  }
  /** volume gradient, light from the top-left (matte: soft light, shadow mostly from the overlay) */
  function vgrad(id, c, o = {}) {
    const R = ramp(c);
    const cx = o.cx || '34%', cy = o.cy || '26%', rr = o.r || '90%';
    return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${rr}">` +
      `<stop offset="0" stop-color="${U.mix(c, R.lt, 0.55)}"/><stop offset=".4" stop-color="${U.mix(c, R.lt, 0.18)}"/><stop offset=".75" stop-color="${c}"/>` +
      `<stop offset="1" stop-color="${U.mix(c, R.sh, 0.35)}"/></radialGradient>`;
  }
  /** vertical cylinder gradient (legs, trunks, pillars) */
  function cgrad(id, c, vertical = false) {
    const R = ramp(c);
    const [x2, y2] = vertical ? [0, 1] : [1, 0];
    return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${R.lt}"/><stop offset=".3" stop-color="${R.hi}"/>` +
      `<stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${R.sh}"/></linearGradient>`;
  }
  function glowGrad(id, c, a0 = 0.8) {
    return `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a0}"/><stop offset=".45" stop-color="${c}" stop-opacity="${f(a0 * 0.35 * 100) / 100}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  }
  /** cel-shading overlay for a shape, to be placed INSIDE a clip of that shape:
   *  a soft core shadow on the lower right, a lit band on the upper left and a specular glint */
  /** translate an absolute SVG path (M L H V C S Q T A Z) by dx, dy */
  const ARGS = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
  function shiftPath(d, dx, dy) {
    const tok = d.match(/[MLHVCSQTAZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    let out = '', cmd = '', i = 0;
    while (i < tok.length) {
      if (/[A-Za-z]/.test(tok[i])) { cmd = tok[i].toUpperCase(); out += cmd; i++; if (cmd === 'Z') continue; }
      const n = ARGS[cmd];
      const v = tok.slice(i, i + n).map(Number);
      i += n;
      if (cmd === 'H') v[0] += dx;
      else if (cmd === 'V') v[0] += dy;
      else if (cmd === 'A') { v[5] += dx; v[6] += dy; }
      else for (let k = 0; k < n; k += 2) { v[k] += dx; v[k + 1] += dy; }
      out += v.map(f).join(' ') + ' ';
    }
    return out.trim();
  }
  /** matte painted form shading, placed INSIDE a clip of the shape:
   *  two stacked core-shadow crescents (soft terminator), warm bounce light on the lower edge,
   *  a soft sheen on the lit side (`o.sheen` = radial gradient id) and an optional small specular */
  function shade(d, c, sz, o = {}) {
    const R = ramp(c), k = sz / 40, big = 'M-60 -60H260V260H-60Z ';
    const a = o.shadow != null ? o.shadow : 1;
    let s = `<path d="${big}${shiftPath(d, -9 * k, -11 * k)}" fill-rule="evenodd" fill="${R.sh}" opacity="${f(0.26 * a * 100) / 100}"/>` +
      `<path d="${big}${shiftPath(d, -4.5 * k, -5.5 * k)}" fill-rule="evenodd" fill="${R.sh}" opacity="${f(0.34 * a * 100) / 100}"/>` +
      `<path d="${big}${shiftPath(d, -1.6 * k, -2 * k)}" fill-rule="evenodd" fill="${R.deep}" opacity="${f(0.3 * a * 100) / 100}"/>`;
    s += `<path d="${d}" fill="none" stroke="${o.bounce || U.mix(R.lt, '#ffe6b8', 0.35)}" stroke-width="${f(3 * k)}" opacity=".34" transform="translate(${f(-2.6 * k)} ${f(-3.2 * k)})"/>`;
    if (o.sheen && o.bbox) { const [bx, by, bw, bh] = o.bbox; s += `<ellipse cx="${f(bx + bw * 0.33)}" cy="${f(by + bh * 0.27)}" rx="${f(bw * 0.3)}" ry="${f(bh * 0.21)}" fill="url(#${o.sheen})"/>`; }
    if (o.gloss && o.bbox) {
      const [bx, by, bw, bh] = o.bbox, gx = bx + bw * 0.3, gy = by + bh * 0.2;
      s += `<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(bw * 0.07)}" ry="${f(bh * 0.04)}" fill="#fff" opacity="${o.gloss}" transform="rotate(-28 ${f(gx)} ${f(gy)})"/>` +
        `<circle cx="${f(gx + bw * 0.1)}" cy="${f(gy - bh * 0.015)}" r="${f(bw * 0.016)}" fill="#fff" opacity="${o.gloss}"/>`;
    }
    return s;
  }
  /** short painted strokes following the form: light on the upper left, shadow on the lower right */
  function strokes(bbox, c, R, n = 12, w = 2.2) {
    const P = ramp(c), [bx, by, bw, bh] = bbox;
    const cx = bx + bw / 2, cy = by + bh / 2;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, rr = 0.74 + R() * 0.16;
      const x = cx + Math.cos(a) * bw * 0.5 * rr, y = cy + Math.sin(a) * bh * 0.5 * rr;
      const t = a + Math.PI / 2, len = (4 + R() * 4) * (bw / 90);
      const lit = Math.cos(a - Math.PI * 1.25) > 0.2;
      const x2 = x + Math.cos(t) * len, y2 = y + Math.sin(t) * len, mx = (x + x2) / 2 + Math.cos(a) * len * 0.25, my = (y + y2) / 2 + Math.sin(a) * len * 0.25;
      s += `<path d="M${f(x)} ${f(y)}Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}" fill="none" stroke="${lit ? P.lt : P.sh}" stroke-width="${f(w)}" stroke-linecap="round" opacity="${lit ? '.45' : '.5'}"/>`;
    }
    return s;
  }
  /** round blob path with optional scallops (fur cheeks, fluffy chests): bump(angleDeg) → 0..1 */
  function blob(cx, cy, rx, ry, bump, n = 28) {
    const P = a => [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    let d = '';
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const [x, y] = P(a);
      if (!i) { d = `M${f(x)} ${f(y)}`; continue; }
      const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2, deg = ((am * 180 / Math.PI) + 360) % 360;
      const b = bump ? bump(deg) : 0, k = 1 / Math.cos(Math.PI / n) + b * 0.16;
      d += `Q${f(cx + Math.cos(am) * rx * k)} ${f(cy + Math.sin(am) * ry * k)} ${f(x)} ${f(y)}`;
    }
    return d + 'Z';
  }

  /* ---------------- painted elements ---------------- */
  const Pn = (d, fill, x = '') => `<path d="${d}" fill="${fill}"${x}/>`;

  /** faceted painted rock: shadow body, lit top plane, rim highlight */
  function rock(x, y, w, h, c, R, o = {}) {
    const P = ramp(c);
    const pts = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI, rr = 0.85 + R() * 0.25;
      pts.push([x + Math.cos(a) * w * 0.5 * rr, y + Math.sin(a) * h * rr]);
    }
    const d = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
    const top = 'M' + pts.slice(1, -1).map((p, i) => f(p[0] + (i ? 0 : w * 0.05)) + ' ' + f(p[1] + (y - p[1]) * 0.45)).join('L') + 'L' + pts.slice(1, -1).reverse().map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';
    return Pn(d, P.sh) + Pn(top, c) + Pn(`M${f(pts[1][0])} ${f(pts[1][1])}L${f(pts[3][0])} ${f(pts[3][1])}`, 'none', ` stroke="${P.hi}" stroke-width="${f(Math.max(1.5, w * 0.04))}" stroke-linecap="round" opacity=".7"`) +
      (o.line ? `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="${o.line}" stroke-linejoin="round" opacity=".55"/>` : '');
  }
  return { ramp, vgrad, cgrad, glowGrad, shade, shiftPath, strokes, blob, rock, hueToward };
})();
