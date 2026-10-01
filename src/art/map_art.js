'use strict';
/* The Star Map of the Star Isles: one wide painted panorama
 * (3200×720) of the six isles floating in deep space, linked by glowing star-bridges of stepping stones.
 * Location rings sit on each isle's own trails. The picture is baked to a canvas once per unlock state. */

const MapArt = (() => {
  const W = 3200, H = 720, K = 0.6;
  // top-left corner of each isle painting (1000×560 at scale K) on the panorama
  const ISLE_AT = { sunny: [60, 300], coral: [556, 58], ember: [1072, 318], frost: [1592, 62], storm: [2104, 322], eclipse: [2604, 58] };
  const ARENA = { at: [1250, 40], w: 250 };
  const f = n => Math.round(n * 10) / 10;

  const node = (isleId, k) => { const [ox, oy] = ISLE_AT[isleId], [x, y] = WArt.MAP_NODES[k]; return [ox + x * K, oy + y * K]; };
  const isleCenter = id => { const [ox, oy] = ISLE_AT[id]; return [ox + 500 * K, oy + 292 * K]; };
  const arenaNode = () => [ARENA.at[0] + ARENA.w / 2, ARENA.at[1] + ARENA.w * 0.52];
  const quad = (a, c, b, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } return pts; };
  /** star-bridges between consecutive isles (guardian ring → next isle's landing ring) and the branch to the Arena */
  function bridges() {
    const out = [];
    for (let i = 0; i < ISLES.length - 1; i++) {
      const a = node(ISLES[i].id, 'g'), b = node(ISLES[i + 1].id, 'z1');
      const c = [(a[0] + b[0]) / 2 + 30, (a[1] + b[1]) / 2 + (i % 2 ? -70 : 90)];
      out.push({ from: ISLES[i].id, to: ISLES[i + 1].id, pts: quad(a, c, b, 44) });
    }
    const a = node('coral', 'g'), b = arenaNode();
    out.push({ from: 'coral', to: 'arena', pts: quad(a, [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 70], [b[0] - 20, b[1] + 10], 30) });
    return out;
  }
  /** the whole route as an ordered list of stops: [isleId, key, [x,y]] (the arena hangs off the Coral Isle) */
  function route() {
    const r = [];
    for (const is of ISLES) for (const k of ['z1', 'z2', 'g']) r.push([is.id, k, node(is.id, k)]);
    return r;
  }

  /* ---------- the painted space backdrop (wide) ---------- */
  function spaceSvg() {
    const R = U.rng(4242), C = Scenery.newCtx(R);
    const En = (cx, cy, rx, ry, fill, x = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${x}/>`;
    const Cn = (cx, cy, r, fill, x = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${x}/>`;
    let b = `<rect width="${W}" height="${H}" fill="${C.lin([[0, '#050818'], [0.45, '#0e1238'], [1, '#1f0f42']])}"/>`;
    // painted nebulae drifting along the whole panorama
    const neb = ['#6a3aff', '#ff4fa8', '#2fb8ff', '#8a2fff', '#ff8a5a', '#29d6c0'];
    for (let n = 0; n < 16; n++) {
      const x = (n + 0.5) / 16 * W + (R() - 0.5) * 160, y = 120 + R() * 480, r = 220 + R() * 240, c = neb[n % neb.length];
      for (let i = 0; i < 6; i++) b += En(x + (R() - 0.5) * r * 0.9, y + (R() - 0.5) * r * 0.5, r * (0.35 + R() * 0.4), r * (0.16 + R() * 0.2), C.soft(c, 0.16 + R() * 0.14, 0.25), ` transform="rotate(${f(-25 + R() * 50)} ${f(x)} ${f(y)})"`);
    }
    // the galactic band, sweeping across the panorama
    for (let i = 0; i < 120; i++) { const t = R(), x = t * (W + 200) - 100, y = 560 - Math.sin(t * Math.PI * 1.3) * 300 + (R() - 0.5) * 110; b += En(x, y, 70 + R() * 110, 22 + R() * 34, C.soft(['#c8b8ff', '#ffd8f0', '#b8e8ff'][i % 3], 0.1, 0.3), ` transform="rotate(${f(-18 + R() * 36)} ${f(x)} ${f(y)})"`); }
    for (let i = 0; i < 1100; i++) { const x = R() * W, y = R() * H, r = 0.4 + R() * 1.5; b += Cn(x, y, r, ['#ffffff', '#fff4d8', '#d8e8ff'][i % 3], ` opacity="${f(0.3 + R() * 0.7)}"`); }
    for (let i = 0; i < 46; i++) {
      const x = R() * W, y = R() * H, r = 4 + R() * 6;
      b += Cn(x, y, r * 2.4, C.soft('#ffffff', 0.32, 0.2)) + `<path d="M${f(x)} ${f(y - r)}Q${f(x + r * 0.2)} ${f(y - r * 0.2)} ${f(x + r)} ${f(y)}Q${f(x + r * 0.2)} ${f(y + r * 0.2)} ${f(x)} ${f(y + r)}Q${f(x - r * 0.2)} ${f(y + r * 0.2)} ${f(x - r)} ${f(y)}Q${f(x - r * 0.2)} ${f(y - r * 0.2)} ${f(x)} ${f(y - r)}Z" fill="#fffbe6" opacity=".9"/>`;
    }
    // distant planets for scale & wonder
    const planet = (x, y, r, c1, c2, ring) => {
      const P = Paint.ramp(c1);
      let s = Cn(x, y, r * 1.6, C.soft(c1, 0.22, 0.4)) + Cn(x, y, r, C.rad([[0, P.hi], [0.35, c1], [0.8, c2], [1, P.deep]], { cx: '35%', cy: '30%', r: '85%' }));
      s += `<path d="M${f(x - r)} ${f(y - r * 0.2)}Q${f(x)} ${f(y - r * 0.05)} ${f(x + r)} ${f(y - r * 0.3)}" fill="none" stroke="${P.lt}" stroke-width="${f(r * 0.12)}" opacity=".35"/>`;
      if (ring) s = `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 1.9)}" ry="${f(r * 0.45)}" fill="none" stroke="${ring}" stroke-width="${f(r * 0.16)}" opacity=".5" transform="rotate(-14 ${f(x)} ${f(y)})"/>` + s + `<path d="M${f(x - r * 1.86)} ${f(y + r * 0.02)}A${f(r * 1.9)} ${f(r * 0.45)} -14 0 0 ${f(x + r * 1.86)} ${f(y - r * 0.4)}" fill="none" stroke="${ring}" stroke-width="${f(r * 0.16)}" opacity=".55"/>`;
      return s;
    };
    b += planet(1010, 640, 46, '#ffb86a', '#c85a8a', '#ffe0b0') + planet(2020, 150, 30, '#8fe8ff', '#4a6ae0') + planet(320, 110, 22, '#d8c8ff', '#7a5ae0', '#b8a8ff') + planet(3000, 640, 38, '#9affc8', '#2a8a6a') + planet(2440, 690, 18, '#ffd0a0', '#a85a3a');
    // a spiral galaxy far away
    b += `<g transform="translate(1850 600) rotate(-20)" opacity=".55">` + En(0, 0, 90, 26, C.soft('#d8c8ff', 0.5, 0.2)) + En(0, 0, 30, 10, C.soft('#fff4d8', 0.9, 0.3)) + '</g>';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${C.defs}</defs>${b}</svg>`;
  }

  const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  /** a little floating rock (stepping stone of the star-bridge) */
  function rock(ctx, x, y, r, hue) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, -r, 0, r * 1.6);
    g.addColorStop(0, hue[0]); g.addColorStop(0.45, hue[1]); g.addColorStop(1, hue[2]);
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.1); ctx.quadraticCurveTo(-r * 0.9, -r * 0.55, 0, -r * 0.55); ctx.quadraticCurveTo(r * 0.95, -r * 0.5, r, -r * 0.05);
    ctx.quadraticCurveTo(r * 0.5, r * 0.6, r * 0.1, r * 1.5); ctx.quadraticCurveTo(-r * 0.4, r * 0.7, -r, -r * 0.1); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(10,6,24,.8)'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.82, r * 0.26, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill();
    ctx.restore();
  }
  function glowDot(ctx, x, y, r, col, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const cache = {};
  /** bake the panorama for the current unlock state → Promise<canvas> */
  async function bake(open, arenaOpen) {
    const key = open.join(',') + '|' + (arenaOpen ? 1 : 0);
    if (cache[key]) return cache[key];
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const [bg, ...isles] = await Promise.all([load(U.svgUrl('mapspace', spaceSvg)), ...ISLES.map(is => load(WArt.isleMap(is.id)))]);
    const arenaImg = await load(WArt.isle('arena'));
    if (bg) ctx.drawImage(bg, 0, 0);
    const br = bridges();
    // stepping stones float beneath the bridges
    for (const b of br) {
      const lit = open.includes(b.to) || (b.to === 'arena' && arenaOpen);
      for (let i = 7; i < b.pts.length - 7; i += 5) { const [x, y] = b.pts[i]; rock(ctx, x + (i % 3 - 1) * 6, y + 16, 11 + (i % 4) * 3, lit ? ['#c8b8e8', '#7a68a8', '#3a2c60'] : ['#6a6480', '#3e3a52', '#1e1a30']); }
    }
    // the isles themselves; sealed ones sleep under a violet mist
    ISLES.forEach((is, i) => {
      const im = isles[i]; if (!im) return;
      const [x, y] = ISLE_AT[is.id];
      ctx.drawImage(im, x, y, 1000 * K, 560 * K);
      if (!open.includes(is.id)) {
        const [cx, cy] = isleCenter(is.id);
        ctx.save();
        ctx.globalAlpha = 0.78;
        const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 330);
        g.addColorStop(0, 'rgba(34,24,66,.92)'); g.addColorStop(0.62, 'rgba(26,18,52,.82)'); g.addColorStop(1, 'rgba(20,14,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, 330, 210, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        for (let k = 0; k < 14; k++) glowDot(ctx, cx + Math.cos(k * 2.4) * (80 + k * 14), cy + Math.sin(k * 1.7) * (40 + k * 6), 40 + (k % 3) * 16, '150,130,210', 0.16);
      }
    });
    if (arenaImg) {
      ctx.save();
      if (!arenaOpen) ctx.globalAlpha = 0.45;
      ctx.drawImage(arenaImg, ARENA.at[0], ARENA.at[1], ARENA.w, ARENA.w * arenaImg.height / arenaImg.width);
      ctx.restore();
    }
    // dotted star trails over everything (they continue onto the isles' own paths)
    for (const b of br) {
      const lit = open.includes(b.to) || (b.to === 'arena' && arenaOpen);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 2; i < b.pts.length - 1; i += 2) glowDot(ctx, b.pts[i][0], b.pts[i][1], 10, lit ? '140,220,255' : '120,110,160', lit ? 0.45 : 0.18);
      ctx.restore();
      for (let i = 2; i < b.pts.length - 1; i += 2) { ctx.beginPath(); ctx.arc(b.pts[i][0], b.pts[i][1], 3.4, 0, Math.PI * 2); ctx.fillStyle = lit ? '#fff8e0' : 'rgba(190,180,220,.5)'; ctx.fill(); }
    }
    cache[key] = cv;
    return cv;
  }
  return { W, H, K, ISLE_AT, ARENA, node, isleCenter, arenaNode, bridges, route, bake };
})();
