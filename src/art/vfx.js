'use strict';
/* Canvas VFX: glowing, additive particle effects for battles — elemental attacks (fire, water, ice, rock,
 * leaves, wind, lightning, stars...), impacts, statuses, buffs, epic summons, the catch (ring halo, constellations, bursts) and confetti.
 * One <canvas> lives in the #fx layer. Timing never depends on requestAnimationFrame: every effect
 * resolves on timers and particles age by wall-clock time, so throttled/hidden tabs keep battles flowing. */

const VFX = (() => {
  const TAU = Math.PI * 2;
  let lite = false; // slow devices: half the particles
  // the canvas covers the effects layer: the 1280×720 stage, or the whole tall screen of a portrait menu scene
  let W = 1280, H = 720;
  let cv = null, g = null, res = 1, raf = 0, last = 0, running = false;
  const P = [], O = [];
  const sprites = new Map();
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const R2 = v => Array.isArray(v) ? rnd(v[0], v[1]) : (v || 0);
  const K = () => (typeof FX !== 'undefined' ? FX.k : 1);
  const now = () => performance.now();
  const wait = ms => new Promise(r => setTimeout(r, ms * K()));
  const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

  const PAL = {
    fire: ['#fffbe0', '#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], water: ['#ffffff', '#c8f2ff', '#6fd0ff', '#2f8fe8'],
    ice: ['#ffffff', '#e8fbff', '#a8ecff', '#62b8f0'], rock: ['#fff0c8', '#d8b078', '#a0764e', '#6b4a2e'],
    leaf: ['#f0ffb0', '#b8ec70', '#6cc04a', '#2f7a3a'], air: ['#ffffff', '#f0ecff', '#cbbcff', '#9a7cff'],
    bolt: ['#ffffff', '#fffbd0', '#fff066', '#ffc21a'], poison: ['#f8e8ff', '#dca8ff', '#a868f0', '#6a2ab0'],
    dream: ['#ffffff', '#ffe0f6', '#f4b8ff', '#b8a0ff'], star: ['#ffffff', '#fffbd0', '#ffe066', '#ffb13b'],
    pow: ['#ffffff', '#fffbd0', '#ffe8a0'], heal: ['#ffffff', '#e0ffe8', '#8fffc0', '#3ad890'], mud: ['#e8c898', '#b08a58', '#7a5838'],
    dark: ['#ffffff', '#e0c8ff', '#9a6af0', '#4a2a9a'],
  };
  const EL = { fire: 'fire', water: 'water', earth: 'leaf', air: 'air' };

  /* ======================= ENGINE ======================= */
  let okCache = null;
  function ok() {
    if (okCache == null) { try { okCache = typeof document !== 'undefined' && !!document.createElement('canvas').getContext('2d'); } catch (e) { okCache = false; } }
    return okCache;
  }
  function ensure() {
    if (!ok() || typeof UI === 'undefined' || !UI.fx) return false;
    const want = U.clamp(((UI.scale) || 1) * (window.devicePixelRatio || 1), 1, 2);
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'vfx'; g = cv.getContext('2d'); }
    if (!cv.isConnected) { P.length = 0; O.length = 0; UI.fx.prepend(cv); }
    const tall = UI.portrait && !UI.fx.classList.contains('stage16');
    const w = tall ? UI.W : 1280, h = tall ? UI.H : 720;
    if (Math.abs(want - res) > 0.2 || w !== W || h !== H || cv.width !== Math.round(W * res)) {
      res = want; W = w; H = h;
      cv.width = Math.round(W * res); cv.height = Math.round(H * res);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
    }
    return true;
  }
  /** cached radial glow sprite for a colour */
  function sprite(col) {
    let s = sprites.get(col);
    if (!s) {
      s = document.createElement('canvas'); s.width = s.height = 64;
      const c = s.getContext('2d'), [r, gg, b] = U.hexToRgb(col), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${r},${gg},${b},1)`); gr.addColorStop(0.3, `rgba(${r},${gg},${b},.6)`); gr.addColorStop(0.65, `rgba(${r},${gg},${b},.18)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
      sprites.set(col, s);
    }
    return s;
  }
  function start() {
    if (running || !ensure()) return;
    running = true; last = now();
    raf = requestAnimationFrame(frame);
  }
  /** add one particle; times are nominal ms (scaled by the battle speed) */
  function part(o) {
    if (!ensure()) return null;
    const p = Object.assign({ vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 600, s0: 10, s1: 0, cols: ['#ffffff'], shape: 'glow', rot: 0, vr: 0, add: true, a: 1, fin: 0.08, fout: 0.55, streak: 0, w: 2, q: null }, o);
    p.b = now() + (o.delay || 0) * K();
    P.push(p);
    if (P.length > 2600) P.splice(0, 600);
    start();
    return p;
  }
  /** emit n particles with randomized ranges ([min,max]) */
  function emit(n, o) {
    n = Math.round(n * (lite ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const ang = R2(o.ang != null ? o.ang : [0, TAU]), spd = R2(o.spd != null ? o.spd : [60, 200]);
      const s0 = R2(o.size || [6, 12]);
      const p = {
        x: (typeof o.x === 'function' ? o.x(i, n) : R2(o.x)) + (o.rx ? rnd(-o.rx, o.rx) : 0),
        y: (typeof o.y === 'function' ? o.y(i, n) : R2(o.y)) + (o.ry ? rnd(-o.ry, o.ry) : 0),
        vx: Math.cos(ang) * spd + R2(o.vx || 0), vy: Math.sin(ang) * spd + R2(o.vy || 0), ax: R2(o.ax || 0), ay: R2(o.grav || 0), drag: o.drag || 0,
        life: R2(o.life || [400, 800]), s0, s1: s0 * R2(o.grow != null ? o.grow : 0.2), cols: o.cols || ['#ffffff'], shape: o.shape || 'glow',
        rot: o.rot != null ? R2(o.rot) : rnd(0, TAU), vr: R2(o.spin || 0) * (Math.random() < 0.5 ? -1 : 1), add: o.add !== false, a: R2(o.a != null ? o.a : 1),
        fin: o.fin != null ? o.fin : 0.08, fout: o.fout != null ? o.fout : 0.5, streak: o.streak || 0, w: R2(o.w || 2), text: o.text ? (Array.isArray(o.text) ? pick(o.text) : o.text) : null,
        flat: o.flat, delay: R2(o.delay || 0) + (o.stagger || 0) * i, orb: o.orb ? Object.assign({}, o.orb, { a0: R2(o.orb.a0 != null ? o.orb.a0 : [0, TAU]), r0: R2(o.orb.r0) }) : null,
        ease: o.ease, wob: o.wob || 0, wobA: o.wobA || 0, ph: rnd(0, TAU), stroke: o.stroke,
      };
      if (p.shape === 'rock') { p.poly = []; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; p.poly.push([Math.cos(a) * (0.7 + Math.random() * 0.35), Math.sin(a) * (0.6 + Math.random() * 0.35)]); } }
      part(p);
    }
  }
  /** custom drawable (beams, bolts, projectiles, waves...) */
  function obj(o) {
    if (!ensure()) return null;
    o.b = now() + (o.delay || 0) * K(); o.q = null;
    O.push(o); start();
    return o;
  }
  /** an effect whose step or draw throws is dropped (swept on the next frame) instead of stopping the loop */
  function drop(o, e) { o.life = 0; o.q = null; console.warn('vfx', e); }
  function frame() {
    // a broken frame loses its effects but never the loop: it books the next one, or ends so the next effect restarts it
    try { tick(); } catch (e) { P.length = 0; O.length = 0; console.warn('vfx', e); }
    if (P.length || O.length) raf = requestAnimationFrame(frame);
    else { running = false; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }
  }
  function tick() {
    const t = now(), dt = Math.min(0.05, (t - last) / 1000) / K();
    last = t;
    // a scene change took the canvas away (UI.go empties #fx): its effects end with it. Stepping them would spawn
    // through ensure(), which empties both lists in the middle of the loops below
    if (!cv.isConnected) { P.length = 0; O.length = 0; return; }
    // a callback can still empty the lists mid-frame (VFX.clear()): both loops skip the holes
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (!p) continue;
      const age = (t - p.b) / K();
      if (age < 0) continue;
      if (age >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      p.q = age / p.life;
      if (p.orb) {
        const o = p.orb, a = p.orb.a0 + o.w * age / 1000, r = Math.max(0, p.orb.r0 + (o.dr || 0) * age / 1000);
        p.x = o.cx + Math.cos(a) * r; p.y = o.cy + Math.sin(a) * r * (o.flat || 1) + (o.vy || 0) * age / 1000;
      } else {
        p.vx += p.ax * dt; p.vy += p.ay * dt;
        if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      p.rot += p.vr * dt;
    }
    for (let i = O.length - 1; i >= 0; i--) {
      const o = O[i];
      if (!o) continue;
      const age = (t - o.b) / K();
      if (age < 0) continue;
      if (age >= o.life) { O.splice(i, 1); continue; }
      o.q = age / o.life; o.age = age;
      if (o.step) try { o.step(dt, o.q, age); } catch (e) { drop(o, e); }
    }
    draw();
  }
  function draw() {
    g.setTransform(res, 0, 0, res, 0, 0);
    g.clearRect(0, 0, W, H);
    for (const o of O) if (o.q != null && o.under) drawO(o);
    for (const p of P) if (p.q != null) drawP(p);
    for (const o of O) if (o.q != null && !o.under) drawO(o);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  function drawO(o) { g.save(); try { o.draw(g, o.q, o.age); } catch (e) { drop(o, e); } g.restore(); }
  function star4(x, y, s, r, col) {
    g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = col; g.beginPath();
    g.moveTo(0, -s); g.quadraticCurveTo(s * 0.14, -s * 0.14, s, 0); g.quadraticCurveTo(s * 0.14, s * 0.14, 0, s); g.quadraticCurveTo(-s * 0.14, s * 0.14, -s, 0); g.quadraticCurveTo(-s * 0.14, -s * 0.14, 0, -s);
    g.fill(); g.restore();
  }
  function star5(x, y, s, r, col) {
    g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = col; g.beginPath();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? s * 0.45 : s, a = -Math.PI / 2 + i * Math.PI / 5; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.restore();
  }
  function drawP(p) {
    const q = p.q;
    let a = p.a;
    if (q < p.fin) a *= q / p.fin; else if (q > p.fout) a *= Math.max(0, 1 - (q - p.fout) / (1 - p.fout));
    if (a <= 0.01) return;
    const e = p.ease === 'out' ? 1 - (1 - q) * (1 - q) : p.ease === 'pop' ? Math.min(1, q * 4) : q;
    const s = Math.max(0.1, p.s0 + (p.s1 - p.s0) * e);
    const col = p.cols.length > 1 ? p.cols[Math.min(p.cols.length - 1, (q * p.cols.length) | 0)] : p.cols[0];
    const x = p.x + (p.wob ? Math.sin(p.ph + q * p.wob) * p.wobA : 0), y = p.y;
    g.globalAlpha = Math.min(1, a);
    g.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
    switch (p.shape) {
      case 'glow': case 'smoke': g.drawImage(sprite(col), x - s, y - s, s * 2, s * 2); break;
      case 'spark': {
        const v = Math.hypot(p.vx, p.vy) || 1, L = Math.max(s, v * p.streak);
        g.strokeStyle = col; g.lineWidth = p.w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx / v * L, y - p.vy / v * L); g.stroke();
        break;
      }
      case 'star': g.globalAlpha = Math.min(1, a) * 0.55; g.drawImage(sprite(col), x - s * 1.4, y - s * 1.4, s * 2.8, s * 2.8); g.globalAlpha = Math.min(1, a); star4(x, y, s, p.rot, col); break;
      case 'star5': star5(x, y, s, p.rot, col); break;
      case 'ring': g.strokeStyle = col; g.lineWidth = Math.max(0.6, p.w * (1 - q)); g.beginPath(); g.ellipse(x, y, s, s * (p.flat || 1), 0, 0, TAU); g.stroke(); break;
      case 'shard':
        g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = col; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.34, s * 0.15); g.lineTo(0, s * 0.55); g.lineTo(-s * 0.34, s * 0.15); g.closePath(); g.fill();
        g.globalAlpha *= 0.85; g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -s); g.lineTo(-s * 0.34, s * 0.15); g.lineTo(0, s * 0.05); g.closePath(); g.fill(); g.restore();
        break;
      case 'leaf':
        g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, s, s * 0.42, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(20,70,30,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-s * 0.9, 0); g.lineTo(s * 0.9, 0); g.stroke(); g.restore();
        break;
      case 'bubble':
        g.strokeStyle = col; g.lineWidth = Math.max(1, s * 0.12); g.beginPath(); g.arc(x, y, s, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(200,240,255,.16)'; g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - s * 0.35, y - s * 0.4, s * 0.25, s * 0.14, -0.6, 0, TAU); g.fill();
        break;
      case 'drop': {
        const ang = Math.atan2(p.vy, p.vx);
        g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = col; g.beginPath(); g.arc(0, 0, s * 0.5, -Math.PI / 2, Math.PI / 2); g.lineTo(-s * 1.4, 0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(s * 0.1, -s * 0.18, s * 0.16, 0, TAU); g.fill(); g.restore();
        break;
      }
      case 'rock': {
        g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = col; g.beginPath();
        p.poly.forEach(([px, py], i) => g[i ? 'lineTo' : 'moveTo'](px * s, py * s)); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(40,24,16,.6)'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = 'rgba(255,240,210,.45)'; g.beginPath(); g.ellipse(-s * 0.2, -s * 0.25, s * 0.35, s * 0.18, -0.4, 0, TAU); g.fill(); g.restore();
        break;
      }
      case 'text':
        g.save(); g.translate(x, y); g.rotate(p.rot); g.font = `900 ${s.toFixed(0)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineJoin = 'round'; g.lineWidth = Math.max(2, s * 0.16); g.strokeStyle = p.stroke || '#2b2040'; g.strokeText(p.text, 0, 0); g.fillStyle = col; g.fillText(p.text, 0, 0); g.restore();
        break;
      case 'flame': {
        const inner = p.cols[Math.min(p.cols.length - 1, ((q * p.cols.length) | 0) - 1)] || '#fffbe0';
        g.globalCompositeOperation = 'source-over';
        g.save(); g.translate(x, y); g.rotate(Math.sin(p.ph + q * 9) * 0.25);
        g.fillStyle = col; g.beginPath(); g.moveTo(0, -s * 1.5); g.bezierCurveTo(s * 0.45, -s * 0.8, s * 0.95, -s * 0.2, s * 0.7, s * 0.4); g.arc(0, s * 0.25, s * 0.72, 0.2, Math.PI - 0.2); g.bezierCurveTo(-s * 0.95, -s * 0.2, -s * 0.45, -s * 0.8, 0, -s * 1.5); g.fill();
        g.fillStyle = q < 0.5 ? '#fff6c0' : inner; g.globalAlpha *= 0.9; g.beginPath(); g.moveTo(0, -s * 0.7); g.bezierCurveTo(s * 0.3, -s * 0.3, s * 0.45, 0, s * 0.32, s * 0.35); g.arc(0, s * 0.3, s * 0.34, 0.1, Math.PI - 0.1); g.bezierCurveTo(-s * 0.45, 0, -s * 0.3, -s * 0.3, 0, -s * 0.7); g.fill();
        g.restore();
        break;
      }
      case 'rect':
        g.save(); g.translate(x, y); g.rotate(p.rot); g.scale(1, Math.abs(Math.cos(p.rot * 2)) * 0.8 + 0.2); g.fillStyle = col; g.fillRect(-s / 2, -s / 3, s, s * 0.66); g.restore();
        break;
    }
  }
  /* polyline helpers */
  function zig(x1, y1, x2, y2, n, jit) {
    const pts = [[x1, y1]], dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 1; i < n; i++) { const t = i / n, j = rnd(-jit, jit) * Math.sin(t * Math.PI); pts.push([x1 + dx * t + nx * j, y1 + dy * t + ny * j]); }
    pts.push([x2, y2]);
    return pts;
  }
  function poly(c, pts, upto = 1) {
    const n = Math.max(1, Math.round((pts.length - 1) * upto));
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= n; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  const qAt = (s, m, t, q) => { const u = 1 - q; return [u * u * s[0] + 2 * u * q * m[0] + q * q * t[0], u * u * s[1] + 2 * u * q * m[1] + q * q * t[1]]; };
  const arcPath = (s, t, arc = 60, side = 0) => { const m = [(s[0] + t[0]) / 2 + side, (s[1] + t[1]) / 2 - arc]; return q => qAt(s, m, t, q); };

  /* ======================= PRIMITIVE EFFECTS ======================= */
  function flash(x, y, col, size, life = 280) { part({ x, y, shape: 'glow', cols: [col], s0: size * 0.5, s1: size, life, fin: 0.05, fout: 0.25 }); }
  function ring(x, y, col, r0, r1, life = 420, w = 8, o = {}) { part({ x, y, shape: 'ring', cols: [col], s0: r0, s1: r1, life, w, ease: 'out', fin: 0.02, fout: 0.3, flat: o.flat, delay: o.delay }); }
  function smoke(x, y, n, col, o = {}) {
    emit(n, { x, y, rx: o.rx || 30, ry: o.ry || 10, shape: 'smoke', add: false, cols: [col], ang: [-Math.PI * 0.9, -Math.PI * 0.1], spd: o.spd || [20, 70], life: o.life || [700, 1200], size: o.size || [18, 30], grow: o.grow || 2.4, a: o.a || [0.35, 0.55], grav: o.grav != null ? o.grav : -30, drag: 1.2, fout: 0.35, delay: o.delay });
  }
  function sparks(x, y, n, cols, o = {}) {
    emit(n, { x, y, rx: o.rx, ry: o.ry, shape: 'spark', cols, ang: o.ang, spd: o.spd || [220, 560], life: o.life || [260, 560], size: [3, 6], w: o.w || [2, 3.5], streak: o.streak || 0.055, drag: o.drag != null ? o.drag : 2.4, grav: o.grav || 320, delay: o.delay });
  }
  function stars(x, y, n, cols, o = {}) {
    emit(n, { x, y, rx: o.rx, ry: o.ry, shape: 'star', cols, ang: o.ang, spd: o.spd || [120, 320], life: o.life || [500, 900], size: o.size || [6, 12], grow: 0.3, spin: [2, 6], drag: 2, grav: o.grav || 60, delay: o.delay });
  }
  function dots(x, y, n, cols, o = {}) {
    emit(n, { x, y, rx: o.rx, ry: o.ry, shape: 'glow', cols, ang: o.ang, spd: o.spd || [30, 120], life: o.life || [500, 1000], size: o.size || [4, 9], grow: o.grow != null ? o.grow : 0.4, grav: o.grav || 0, drag: 1.5, delay: o.delay, wob: o.wob, wobA: o.wobA });
  }
  /** projectile along path; trail(x, y, q) emits every frame (rate per second) */
  function shot(path, dur, o = {}) {
    let acc = 0;
    obj({
      life: dur, delay: o.delay,
      step(dt, q) { if (!o.trail) return; acc += dt * (o.rate || 60); while (acc >= 1) { acc--; const [x, y] = path(q); o.trail(x, y, q); } },
      draw(c, q) {
        const [x, y] = path(q), s = (o.size || 20) * (o.sz ? o.sz(q) : 1), cols = o.cols || PAL.star;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.55; c.drawImage(sprite(cols[cols.length - 1]), x - s * 2.2, y - s * 2.2, s * 4.4, s * 4.4);
        c.globalAlpha = 0.9; c.drawImage(sprite(cols[Math.min(2, cols.length - 1)]), x - s * 1.3, y - s * 1.3, s * 2.6, s * 2.6);
        c.globalAlpha = 1; c.drawImage(sprite(cols[0]), x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4);
        if (o.draw) { c.globalCompositeOperation = o.addShape ? 'lighter' : 'source-over'; o.draw(c, x, y, s, q); }
      },
    });
    return wait((o.delay || 0) + dur);
  }
  function bolt(x1, y1, x2, y2, o = {}) {
    const pts = zig(x1, y1, x2, y2, o.seg || 9, o.jit || 34), br = [];
    for (let i = 0; i < (o.branches != null ? o.branches : 3); i++) { const k = 2 + ((Math.random() * (pts.length - 4)) | 0), [bx, by] = pts[k]; br.push(zig(bx, by, bx + rnd(-90, 90), by + rnd(30, 100), 4, 14)); }
    obj({
      life: o.life || 380, delay: o.delay,
      draw(c, q) {
        const fl = (q < 0.12 ? 1 : (Math.sin(q * 46) > -0.2 ? 1 : 0.35)) * (1 - q * 0.85);
        c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
        for (const [w, col, al] of [[o.w || 22, o.glow || '#8a7cff', 0.22], [(o.w || 22) * 0.4, o.col || '#fff066', 0.75], [(o.w || 22) * 0.15, '#ffffff', 1]]) {
          c.globalAlpha = al * fl; c.strokeStyle = col; c.lineWidth = w; poly(c, pts);
          c.lineWidth = w * 0.5; for (const b of br) poly(c, b);
        }
      },
    });
    flash(x2, y2, o.col || '#fff066', 90, 300);
  }
  function beam(x1, y1, x2, y2, o = {}) {
    const cols = o.cols || PAL.star, W0 = o.w || 44;
    let acc = 0;
    obj({
      life: o.life || 620, delay: o.delay,
      step(dt, q) { acc += dt * 90; while (acc >= 1) { acc--; const t = Math.random(), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t; part({ x: x + rnd(-8, 8), y: y + rnd(-W0 * 0.4, W0 * 0.4), vx: (x2 - x1) * 0.9, vy: (y2 - y1) * 0.9, shape: 'glow', cols: [pick(cols)], s0: rnd(4, 9), s1: 1, life: 260 }); } },
      draw(c, q) {
        const env = q < 0.18 ? q / 0.18 : q > 0.72 ? (1 - q) / 0.28 : 1, w = W0 * env * (1 + Math.sin(q * 70) * 0.08);
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (const [k, col, al] of [[2.4, cols[cols.length - 1], 0.25], [1.4, cols[Math.min(2, cols.length - 1)], 0.55], [0.8, cols[1], 0.9], [0.34, '#ffffff', 1]]) {
          c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = w * k; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
        }
        c.globalAlpha = env; c.drawImage(sprite(cols[1]), x1 - w * 1.6, y1 - w * 1.6, w * 3.2, w * 3.2); c.drawImage(sprite('#ffffff'), x2 - w * 1.3, y2 - w * 1.3, w * 2.6, w * 2.6);
      },
    });
  }
  /** a glowing arc (crescent) moving from s to t */
  function crescent(s, t, dur, o = {}) {
    const ang = Math.atan2(t[1] - s[1], t[0] - s[0]);
    obj({
      life: dur, delay: o.delay,
      draw(c, q) {
        const x = s[0] + (t[0] - s[0]) * q, y = s[1] + (t[1] - s[1]) * q, r = (o.r || 46) * (0.6 + q * 0.7);
        c.translate(x, y); c.rotate(ang); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        for (const [w, col, al] of [[16, o.glow || '#b8a0ff', 0.3], [7, o.col || '#efe8ff', 0.85], [2.5, '#ffffff', 1]]) {
          c.globalAlpha = al * (1 - Math.max(0, q - 0.8) * 5); c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(-r * 0.6, 0, r, -1.1, 1.1); c.stroke();
        }
      },
    });
    return wait((o.delay || 0) + dur);
  }
  /** sound / shock rings that travel s → t while growing */
  function wavesTo(s, t, n, col, o = {}) {
    for (let i = 0; i < n; i++) part({ x: s[0], y: s[1], vx: (t[0] - s[0]) / 0.42, vy: (t[1] - s[1]) / 0.42, shape: 'ring', cols: [col], s0: 16, s1: 70, w: o.w || 6, life: 420, delay: i * 90, fout: 0.6, flat: o.flat });
    return wait(90 * (n - 1) + 380);
  }
  /** particles converging into (x, y) along spirals */
  function converge(x, y, n, cols, o = {}) {
    emit(n, { x, y, shape: o.shape || 'glow', cols, size: o.size || [4, 9], grow: 0.6, life: o.life || [420, 620], orb: { cx: x, cy: y, r0: o.r || [90, 160], dr: -(o.r ? o.r[1] : 160) * 2.2, w: 5 * (Math.random() < 0.5 ? 1 : -1) }, fin: 0.2, fout: 0.85, stagger: o.stagger || 6 });
  }
  function pow(x, y, size = 70) {
    obj({
      life: 360,
      draw(c, q) {
        const s = size * (0.3 + Math.min(1, q * 3.5) * 0.9), a = q < 0.6 ? 1 : (1 - q) / 0.4;
        c.globalAlpha = a; c.translate(x, y); c.rotate(q * 0.4);
        c.fillStyle = '#ffffff'; c.strokeStyle = '#2b2040'; c.lineWidth = 5; c.lineJoin = 'round';
        c.beginPath();
        for (let i = 0; i < 16; i++) { const r = i % 2 ? s * 0.5 : s, an = i / 16 * TAU; c[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); }
        c.closePath(); c.stroke(); c.fill();
        c.fillStyle = '#ffe066'; c.beginPath();
        for (let i = 0; i < 16; i++) { const r = (i % 2 ? s * 0.5 : s) * 0.62, an = i / 16 * TAU; c[i ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r); }
        c.closePath(); c.fill();
      },
    });
  }

  /* ======================= IMPACTS ======================= */
  const HIT = {
    fire(x, y, n) {
      flash(x, y, '#ffb13b', 150 * n, 300); flash(x, y, '#fffbe0', 70 * n, 200);
      ring(x, y, '#ffb13b', 20, 150 * n, 420, 10);
      sparks(x, y, 26 * n, ['#fffbd0', '#ffe066', '#ff8a2e']);
      emit(16 * n, { x, y, rx: 26, ry: 20, shape: 'flame', cols: ['#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], ang: [-Math.PI * 0.95, -Math.PI * 0.05], spd: [60, 220], life: [380, 700], size: [10, 20], grow: 0.3, grav: -120, drag: 1.6, fout: 0.45 });
      emit(10 * n, { x, y, rx: 24, ry: 24, shape: 'glow', cols: PAL.fire, ang: [-Math.PI, 0], spd: [40, 170], life: [380, 700], size: [18, 34], grow: 0.15, grav: -160, drag: 1.4 });
      smoke(x, y - 10, 6 * n, '#5a4040', { size: [18, 26] });
    },
    water(x, y, n) {
      flash(x, y, '#8fdcff', 120 * n, 260);
      ring(x, y, '#c8f2ff', 20, 170 * n, 440, 9); ring(x, y, '#ffffff', 10, 110 * n, 380, 5, { delay: 90 });
      emit(24 * n, { x, y, shape: 'drop', cols: ['#e8fbff', '#8fdcff', '#3a9cf0'], ang: [-Math.PI * 0.95, -Math.PI * 0.05], spd: [180, 460], life: [500, 800], size: [6, 11], grow: 0.7, grav: 900, fout: 0.7 });
      emit(10, { x, y, rx: 30, ry: 20, shape: 'bubble', cols: ['#e8fbff'], ang: [-Math.PI * 0.9, -Math.PI * 0.1], spd: [30, 90], life: [600, 1000], size: [5, 10], grow: 1.2, grav: -60, add: false });
    },
    ice(x, y, n) {
      flash(x, y, '#dff8ff', 150 * n, 320);
      emit(14 * n, { x, y, shape: 'shard', cols: ['#ffffff', '#c8f2ff', '#8fdcff'], spd: [180, 420], life: [500, 800], size: [10, 18], grow: 0.6, spin: [3, 8], drag: 2.4, grav: 200, add: false, fout: 0.6 });
      stars(x, y, 14, ['#ffffff', '#dff8ff'], { spd: [60, 220], size: [4, 8] });
      ring(x, y, '#bff0ff', 20, 150 * n, 460, 7);
    },
    rock(x, y, n) {
      flash(x, y, '#fff0c8', 90, 200);
      emit(12 * n, { x, y: y + 20, shape: 'rock', cols: ['#a0764e', '#8a6440', '#b08a58'], ang: [-Math.PI * 0.9, -Math.PI * 0.1], spd: [180, 420], life: [600, 900], size: [8, 16], grow: 0.8, spin: [3, 9], grav: 1100, add: false, fout: 0.7 });
      smoke(x, y + 30, 8 * n, '#a08a6a', { rx: 70, size: [22, 34], a: [0.35, 0.5] });
      ring(x, y + 40, '#e8d0a0', 20, 150 * n, 460, 6, { flat: 0.35 });
    },
    mud(x, y, n) {
      emit(16 * n, { x, y, shape: 'glow', cols: PAL.mud, spd: [140, 340], life: [400, 700], size: [8, 14], grow: 0.8, grav: 700, add: false });
      smoke(x, y, 4, '#7a5838');
    },
    leaf(x, y, n) {
      flash(x, y, '#c8ff90', 110 * n, 260);
      emit(16 * n, { x, y, shape: 'leaf', cols: ['#b8ec70', '#6cc04a', '#9ad65a'], spd: [160, 380], life: [700, 1100], size: [7, 11], grow: 0.8, spin: [4, 9], drag: 2, grav: 140, add: false, fout: 0.6 });
      ring(x, y, '#b8ff90', 20, 160 * n, 440, 7);
      dots(x, y, 10, ['#f0ffb0', '#b8ec70'], { spd: [60, 160] });
    },
    air(x, y, n) {
      ring(x, y, '#ffffff', 20, 190 * n, 420, 7); ring(x, y, '#d8c8ff', 10, 140 * n, 380, 5, { delay: 80 }); ring(x, y, '#ffffff', 5, 100 * n, 340, 4, { delay: 160 });
      emit(16 * n, { x, y, shape: 'spark', cols: ['#ffffff', '#e0d4ff'], spd: [260, 520], life: [260, 460], size: [3, 5], w: [2, 3], streak: 0.09, drag: 3 });
      emit(10, { x, y, shape: 'glow', cols: PAL.air, orb: { cx: x, cy: y, r0: [20, 60], dr: 160, w: 9, flat: 0.6 }, life: [400, 700], size: [6, 12], grow: 0.3 });
    },
    bolt(x, y, n) {
      flash(x, y, '#fff066', 160 * n, 280); flash(x, y, '#ffffff', 70 * n, 160);
      sparks(x, y, 30 * n, PAL.bolt, { spd: [260, 640], streak: 0.045, grav: 200 });
      for (let i = 0; i < 3; i++) { const a = rnd(0, TAU), d = rnd(40, 90); bolt(x, y, x + Math.cos(a) * d, y + Math.sin(a) * d, { seg: 4, jit: 12, branches: 0, w: 10, life: 220, delay: i * 50 }); }
      ring(x, y, '#fff066', 20, 150 * n, 360, 6);
    },
    poison(x, y, n) {
      ring(x, y, '#c07cff', 20, 160 * n, 440, 7);
      emit(14 * n, { x, y, rx: 40, ry: 30, shape: 'bubble', cols: ['#dca8ff', '#c07cff'], ang: [-Math.PI * 0.9, -Math.PI * 0.1], spd: [40, 120], life: [600, 1000], size: [5, 11], grow: 1.3, grav: -80, add: false });
      smoke(x, y, 6, '#8a4ac0', { size: [22, 32], a: [0.3, 0.45] });
      dots(x, y, 12, PAL.poison, { spd: [80, 200] });
    },
    dream(x, y, n) {
      flash(x, y, '#ffd8f4', 150 * n, 360);
      stars(x, y, 16 * n, PAL.dream, { spd: [80, 260], size: [6, 12] });
      emit(10, { x, y, shape: 'text', text: ['♥', '★', '☾'], cols: ['#ffd8f4', '#fff6c8', '#d8c8ff'], stroke: '#6a4a8a', spd: [60, 160], life: [700, 1000], size: [16, 22], grow: 0.9, spin: [0.5, 2], grav: -60, drag: 1.5 });
    },
    star(x, y, n) {
      flash(x, y, '#fff6a0', 190 * n, 380); flash(x, y, '#ffffff', 90 * n, 220);
      ring(x, y, '#ffe066', 20, 190 * n, 480, 9);
      stars(x, y, 18 * n, PAL.star, { spd: [140, 380], size: [7, 14] });
      emit(10, { x, y, shape: 'spark', cols: ['#ffffff', '#fff066'], spd: [300, 600], life: [300, 500], size: [4, 6], w: 3, streak: 0.1, drag: 2 });
    },
    claw(x, y, n) {
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 26;
        obj({ life: 340, delay: i * 45, draw(c, q) {
          const t = Math.min(1, q * 2.5), a = q < 0.6 ? 1 : (1 - q) / 0.4;
          c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
          const x1 = x + ox - 70, y1 = y - 70, x2 = x1 + 140 * t, y2 = y1 + 140 * t;
          for (const [w, col, al] of [[14, '#ff9a6a', 0.35], [6, '#fff0c0', 0.9], [2, '#ffffff', 1]]) { c.globalAlpha = al * a; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
        } });
      }
      sparks(x, y, 10, ['#ffffff', '#ffe066'], { spd: [200, 400] });
    },
    pow(x, y, n) {
      pow(x, y, 56 * n);
      flash(x, y, '#fff6c8', 100 * n, 220);
      sparks(x, y, 14 * n, ['#ffffff', '#fffbd0', '#ffe066'], { spd: [240, 520], grav: 200 });
      ring(x, y, '#ffffff', 16, 120 * n, 320, 6);
    },
  };
  function hit(kind, x, y, big) { (HIT[kind] || HIT.pow)(x, y, big ? 1.5 : 1.15); }

  /* ======================= MOVES (resolve at impact) ======================= */
  const tgt = c => c.miss ? [c.d[0] + c.dir * 60, c.d[1] - 130] : c.d;
  const lunge = (c, dx, dy, dur) => U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px, ${dy}px)`, offset: 0.45 }, { transform: 'translate(0,0)' }], { duration: dur * K(), easing: 'ease-in-out' });
  const speedLines = (c, cols = ['#ffffff', '#fffbd0']) => emit(10, { x: c.a[0] - c.dir * 40, y: c.a[1], rx: 30, ry: 50, shape: 'spark', cols, ang: c.dir > 0 ? [Math.PI - 0.1, Math.PI + 0.1] : [-0.1, 0.1], spd: [500, 800], life: [180, 300], size: [4, 6], w: [2, 3], streak: 0.12, stagger: 14 });
  const flameTrail = (big = 1) => (x, y) => { part({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-20, 20), vy: rnd(-70, -30), shape: 'flame', cols: ['#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], s0: rnd(9, 15) * big, s1: 2, life: rnd(260, 420), fout: 0.4 }); part({ x, y, vx: rnd(-20, 20), vy: rnd(-40, 0), shape: 'glow', cols: PAL.fire, s0: rnd(14, 24) * big, s1: 2, life: rnd(200, 320) }); if (Math.random() < 0.35) part({ x, y, vx: rnd(-80, 80), vy: rnd(-120, 40), ay: 300, shape: 'spark', cols: ['#ffe066', '#ff8a2e'], s0: 3, s1: 1, w: 2, streak: 0.05, life: rnd(250, 420) }); };

  const FAM = {
    async fireball(c, id) {
      const big = id !== 'ember' ? 1 : 0.75;
      Snd.play('fire');
      converge(c.a[0] + c.dir * 30, c.a[1] - 10, 10, PAL.fire, { r: [40, 80], life: [200, 300] });
      await wait(120);
      await shot(arcPath(c.a, tgt(c), 70), 460, { size: 30 * big, cols: PAL.fire, rate: 110, trail: flameTrail(big * 1.2), sz: q => 0.85 + Math.sin(q * 30) * 0.08, draw: (cc, x, y, s) => fireCore(cc, x, y, s * 0.62) });
    },
    async firewave(c) {
      Snd.play('fire');
      const gy0 = (c.aGround || c.a)[1] - 10, gy1 = (c.dGround || c.d)[1] - 10, x0 = c.a[0] + c.dir * 40, x1 = tgt(c)[0];
      let acc = 0;
      obj({ life: 560, step(dt, q) { acc += dt * 160; while (acc >= 1) { acc--; const x = x0 + (x1 - x0) * q, y = gy0 + (gy1 - gy0) * q; part({ x: x + rnd(-30, 30), y: y + rnd(-6, 6), vx: c.dir * rnd(40, 140), vy: rnd(-260, -140), shape: Math.random() < 0.6 ? 'flame' : 'glow', cols: ['#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], s0: rnd(14, 28), s1: 2, life: rnd(380, 620), ay: -60, fout: 0.45 }); } }, draw() {} });
      await wait(470);
    },
    async inferno(c) {
      Snd.play('fire');
      const [x] = tgt(c), gy = (c.dGround || [0, c.d[1] + 90])[1];
      ring(x, gy - 6, '#ff8a2e', 30, 150, 500, 8, { flat: 0.3 });
      FX.flash('#ff8a2e', 0.22, 420);
      let acc = 0;
      obj({ life: 760, step(dt) { acc += dt * 240; while (acc >= 1) { acc--; part({ x: x + rnd(-80, 80), y: gy - rnd(0, 10), vx: rnd(-30, 30), vy: rnd(-520, -300), shape: Math.random() < 0.55 ? 'flame' : 'glow', cols: ['#fffbe0', '#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], s0: rnd(16, 34), s1: 3, life: rnd(420, 720), drag: 0.6, fout: 0.45 }); } }, draw() {} });
      emit(24, { x, y: gy - 60, shape: 'spark', cols: ['#fffbd0', '#ffb13b'], orb: { cx: x, cy: gy - 40, r0: [40, 90], dr: 30, w: 7, flat: 0.4, vy: -260 }, life: [600, 900], size: [3, 5], w: 3, streak: 0 });
      await wait(360);
      FX.shake(10);
    },
    async dash(c, id) {
      const el = (MOVES_DATA(id).el) || 'fire', cols = el === 'water' ? PAL.water : el === 'fire' ? PAL.fire : PAL.star;
      Snd.play(el === 'water' ? 'water' : 'fire');
      const [sx, sy] = c.a, reach = c.dir * (Math.abs(c.d[0] - sx) - 120), rise = c.d[1] - sy;
      const path = q => { const p = q < 0.5 ? q * 2 : (1 - q) * 2; return [sx + reach * p, sy + rise * p * 0.8]; };
      let acc = 0;
      obj({ life: 520, step(dt, q) { if (q > 0.5) return; acc += dt * 120; while (acc >= 1) { acc--; const [x, y] = path(q); part({ x: x - c.dir * 40 + rnd(-10, 10), y: y + rnd(-40, 40), vx: -c.dir * rnd(80, 200), vy: rnd(-40, 20), shape: el === 'water' ? 'drop' : 'glow', cols, s0: rnd(10, 22), s1: 2, life: rnd(260, 420), add: el !== 'water' }); } }, draw() {} });
      speedLines(c, [cols[0], cols[1]]);
      U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${reach}px, ${rise * 0.8}px)`, offset: 0.5 }, { transform: 'translate(0,0)' }], { duration: 520 * K(), easing: 'ease-in-out' });
      await wait(250);
    },
    async beam(c, id) {
      const el = MOVES_DATA(id).el, cols = el === 'fire' ? PAL.fire : el === 'air' ? PAL.air : PAL.star;
      Snd.play(el === 'fire' ? 'fire' : 'air');
      const [sx, sy] = c.a, [tx, ty] = tgt(c), bx = sx + c.dir * 40;
      converge(bx, sy, 40, cols, { r: [80, 170] });
      flash(bx, sy, cols[1], 120, 560);
      FX.flash('#140c30', 0.3, 700);
      await wait(340);
      beam(bx, sy, tx, ty, { cols, w: 66, life: 680 });
      FX.flash(cols[1], 0.3, 300);
      await wait(180);
    },
    async meteor(c) {
      Snd.play('fire');
      const [tx, ty] = tgt(c), shots = [];
      for (let i = 0; i < 3; i++) {
        const x = tx + (i - 1) * 50;
        shots.push(shot(arcPath([x + 300, -80], [x, ty], -20), 420, { delay: i * 130, size: 18, cols: PAL.fire, rate: 110, trail: flameTrail(1.1) }).then(() => { if (i < 2) HIT.fire(x, ty, 0.7); }));
      }
      await Promise.all(shots);
    },
    async wisp(c) {
      Snd.play('status');
      const cols = ['#ffffff', '#d8f0ff', '#8fb8ff', '#8a6af0'];
      await Promise.all([0, 1, 2].map(i => {
        const s = [c.a[0] + Math.cos(i * 2.1) * 50, c.a[1] - 40 + Math.sin(i * 2.1) * 30];
        const p = arcPath(s, tgt(c), 40, (i - 1) * 90);
        return shot(q => { const [x, y] = p(q); return [x, y + Math.sin(q * 18 + i) * 12]; }, 600, { delay: i * 60, size: 12, cols, rate: 50, trail: (x, y) => part({ x, y, vx: rnd(-20, 20), vy: rnd(-40, -10), shape: 'glow', cols, s0: rnd(6, 10), s1: 1, life: 320 }) });
      }));
    },
    async bubbles(c) {
      Snd.play('water');
      const shots = [];
      for (let i = 0; i < 7; i++) {
        const s = [c.a[0] + rnd(-20, 20), c.a[1] + rnd(-30, 30)], t = tgt(c), p = arcPath(s, [t[0] + rnd(-30, 30), t[1] + rnd(-30, 30)], rnd(-20, 70), rnd(-50, 50)), sz = rnd(10, 16);
        shots.push(shot(q => { const [x, y] = p(q); return [x + Math.sin(q * 14 + i) * 10, y]; }, 560, { delay: i * 55, size: 3, cols: ['#ffffff', '#c8f2ff', '#8fdcff'], draw: (cc, x, y, s, q) => { cc.globalAlpha = 1; cc.strokeStyle = '#e8fbff'; cc.lineWidth = 2; cc.beginPath(); cc.arc(x, y, sz * (0.7 + q * 0.5), 0, TAU); cc.stroke(); cc.fillStyle = 'rgba(160,220,255,.22)'; cc.fill(); cc.fillStyle = '#ffffff'; cc.beginPath(); cc.arc(x - sz * 0.3, y - sz * 0.35, sz * 0.2, 0, TAU); cc.fill(); } }));
      }
      await Promise.all(shots);
    },
    async waterball(c) {
      Snd.play('water');
      await shot(arcPath(c.a, tgt(c), 60), 460, { size: 22, cols: PAL.water, rate: 70, trail: (x, y) => { part({ x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-40, 40), vy: rnd(-40, 20), ay: 700, shape: 'drop', cols: ['#e8fbff', '#8fdcff'], s0: rnd(5, 9), s1: 3, life: rnd(300, 500), add: false }); }, draw: (cc, x, y, s) => { cc.globalAlpha = 0.9; cc.strokeStyle = '#ffffff'; cc.lineWidth = 3; cc.beginPath(); cc.arc(x, y, s * 1.05, -2.4, -0.9); cc.stroke(); } });
    },
    async ice(c) {
      Snd.play('ice');
      const t = tgt(c), ang = Math.atan2(t[1] - c.a[1], t[0] - c.a[0]);
      await Promise.all([0, 1, 2, 3].map(i => shot(arcPath(c.a, [t[0] + rnd(-20, 20), t[1] + (i - 1.5) * 26], 10 + i * 8), 320, { delay: i * 60, size: 10, cols: PAL.ice, rate: 60, trail: (x, y) => part({ x, y, vx: rnd(-30, 30), vy: rnd(-30, 30), shape: 'star', cols: ['#ffffff', '#dff8ff'], s0: rnd(3, 6), s1: 1, life: 340, rot: rnd(0, TAU) }), draw: (cc, x, y) => { cc.globalAlpha = 1; cc.save(); cc.translate(x, y); cc.rotate(ang + Math.PI / 2); cc.fillStyle = '#e8fbff'; cc.strokeStyle = '#5fb8f0'; cc.lineWidth = 2; cc.beginPath(); cc.moveTo(0, -20); cc.lineTo(7, 4); cc.lineTo(0, 12); cc.lineTo(-7, 4); cc.closePath(); cc.fill(); cc.stroke(); cc.restore(); } })));
    },
    async wave(c) {
      Snd.play('water');
      const sx = c.a[0], [tx] = c.d, gy = (c.dGround || [0, c.d[1] + 100])[1] + 16, ay = (c.aGround || [0, gy])[1] + 16, dir = c.dir;
      let acc = 0;
      obj({
        life: 820,
        step(dt, q) { acc += dt * 120; while (acc >= 1) { acc--; const x = sx + (tx - sx) * q, y = ay + (gy - ay) * q - 150 * Math.min(1, q * 2) * (1 - Math.max(0, q - 0.85) * 5); part({ x: x + rnd(-50, 30) * dir, y: y + rnd(-10, 10), vx: dir * rnd(60, 200), vy: rnd(-160, -40), ay: 600, shape: 'drop', cols: ['#ffffff', '#c8f2ff'], s0: rnd(5, 9), s1: 3, life: rnd(400, 600), add: false }); } },
        draw(cc, q) {
          const x = sx + (tx - sx) * q, y = ay + (gy - ay) * q, h = 170 * Math.min(1, q * 2) * (1 - Math.max(0, q - 0.85) * 5), w = 240;
          cc.globalAlpha = Math.min(1, (1 - q) * 5, q * 8); cc.translate(x, y); cc.scale(dir, 1);
          const gr = cc.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, '#c8f2ff'); gr.addColorStop(0.45, '#36a3ff'); gr.addColorStop(1, '#1a6bc4');
          cc.fillStyle = gr; cc.strokeStyle = '#2b2040'; cc.lineWidth = 6; cc.lineJoin = 'round';
          cc.beginPath(); cc.moveTo(-w, 0); cc.bezierCurveTo(-w * 0.6, -h * 0.35, -w * 0.25, -h, w * 0.1, -h * 0.95); cc.bezierCurveTo(w * 0.36, -h * 0.9, w * 0.42, -h * 0.55, w * 0.3, -h * 0.4);
          cc.bezierCurveTo(w * 0.2, -h * 0.55, w * 0.05, -h * 0.5, w * 0.02, -h * 0.36); cc.bezierCurveTo(w * 0.15, -h * 0.3, w * 0.2, -h * 0.1, w * 0.3, 0); cc.closePath(); cc.fill(); cc.stroke();
          cc.strokeStyle = '#ffffff'; cc.lineWidth = 7; cc.lineCap = 'round'; cc.globalAlpha *= 0.9; cc.beginPath(); cc.moveTo(-w * 0.55, -h * 0.4); cc.bezierCurveTo(-w * 0.3, -h * 0.85, w * 0.05, -h * 0.88, w * 0.26, -h * 0.66); cc.stroke();
        },
      });
      await wait(600);
    },
    async blizzard(c) {
      Snd.play('ice');
      const [tx, ty] = c.d;
      FX.flash('#d8f6ff', 0.3, 600);
      let acc = 0;
      obj({ life: 760, step(dt) { acc += dt * 110; while (acc >= 1) { acc--; const sx = tx - c.dir * rnd(180, 320), sy = ty + rnd(-240, -80), shard = Math.random() < 0.3; part({ x: sx, y: sy, vx: c.dir * rnd(420, 620), vy: rnd(200, 320), shape: shard ? 'shard' : 'star', cols: shard ? ['#ffffff', '#c8f2ff'] : ['#ffffff'], s0: shard ? rnd(8, 14) : rnd(3, 6), s1: 2, life: rnd(500, 700), spin: 6, vr: rnd(-8, 8), rot: rnd(0, TAU), add: !shard }); } }, draw() {} });
      emit(12, { x: tx, y: ty, rx: 60, ry: 50, shape: 'smoke', add: false, cols: ['#e8fbff'], spd: [10, 40], life: [700, 1000], size: [30, 46], grow: 1.6, a: [0.3, 0.45] });
      await wait(520);
    },
    async rain(c) {
      Snd.play('water');
      const [x, y] = c.a;
      let acc = 0;
      obj({ life: 620, step(dt) { acc += dt * 90; while (acc >= 1) { acc--; part({ x: x + rnd(-130, 130), y: y - rnd(200, 260), vx: -40, vy: rnd(700, 900), shape: 'spark', cols: ['#e8fbff', '#8fdcff'], s0: 4, s1: 2, w: 2, streak: 0.04, life: rnd(260, 340) }); } }, draw() {} });
      dots(x, y, 14, PAL.heal, { rx: 90, ry: 40, spd: [20, 60], grav: -80 });
      await wait(440);
    },
    async toxic(c) {
      Snd.play('status');
      await shot(arcPath(c.a, tgt(c), 60), 480, { size: 18, cols: PAL.poison, rate: 50, trail: (x, y) => part({ x: x + rnd(-8, 8), y, vx: rnd(-20, 20), vy: rnd(-60, -20), shape: 'bubble', cols: ['#dca8ff'], s0: rnd(3, 6), s1: 8, life: 420, add: false }) });
    },
    async dream(c) {
      Snd.play('heal');
      await Promise.all([0, 1, 2, 3].map(i => {
        const p = arcPath(c.a, tgt(c), 50 + i * 20, (i - 1.5) * 60);
        return shot(p, 620, { delay: i * 40, size: 8, cols: PAL.dream, rate: 40, trail: (x, y) => part({ x, y, vx: rnd(-20, 20), vy: rnd(-20, 20), shape: 'star', cols: [pick(PAL.dream)], s0: rnd(4, 7), s1: 1, life: 380 }), draw: (cc, x, y, s, q) => { cc.globalAlpha = 1; star4Ctx(cc, x, y, 12, q * 8, '#ffffff'); } });
      }));
    },
    async pebbles(c) {
      Snd.play('earth');
      await Promise.all([0, 1, 2].map(i => shot(arcPath(c.a, [tgt(c)[0] + (i - 1) * 24, tgt(c)[1] + rnd(-12, 12)], 110 + i * 20), 440, { delay: i * 80, size: 5, cols: ['#fff0c8', '#d8b078', '#a0764e'], rate: 30, trail: (x, y) => part({ x, y, vx: rnd(-20, 20), vy: rnd(-10, 20), shape: 'smoke', add: false, cols: ['#b8a080'], s0: rnd(5, 8), s1: 12, a: 0.4, life: 360 }), draw: (cc, x, y, s, q) => rockCtx(cc, x, y, 13, q * 12) })));
    },
    async mud(c) {
      Snd.play('earth');
      await Promise.all([0, 1, 2].map(i => shot(arcPath(c.a, [tgt(c)[0] + (i - 1) * 30, tgt(c)[1] + (i - 1) * 16], 90), 420, { delay: i * 80, size: 12, cols: PAL.mud, rate: 30, trail: (x, y) => part({ x, y, vx: rnd(-30, 30), vy: rnd(0, 60), ay: 500, shape: 'glow', add: false, cols: ['#8a6440'], s0: rnd(4, 7), s1: 2, life: 380 }) })));
    },
    async vine(c) {
      Snd.play('earth');
      const [sx, sy] = [c.a[0] + c.dir * 30, (c.aGround || c.a)[1] - 20], t = tgt(c);
      const vines = [0, 1].map(i => { const m = [(sx + t[0]) / 2 + (i ? 40 : -40), Math.min(sy, t[1]) - 140 - i * 40]; return q => qAt([sx, sy], m, [t[0] + (i ? 20 : -20), t[1] + (i ? 10 : -10)], q); });
      let acc = 0;
      obj({
        life: 520, under: false,
        step(dt, q) { acc += dt * 60; while (acc >= 1) { acc--; const v = vines[(Math.random() * 2) | 0], [x, y] = v(Math.min(1, q * 1.6) * Math.random()); part({ x, y, vx: rnd(-60, 60), vy: rnd(-60, 30), ay: 200, shape: 'leaf', cols: ['#9ad65a', '#6cc04a'], s0: rnd(5, 8), s1: 4, life: 500, spin: 6, vr: rnd(-6, 6), add: false }); } },
        draw(cc, q) {
          const up = Math.min(1, q * 1.6), a = q > 0.8 ? (1 - q) / 0.2 : 1;
          cc.lineCap = 'round'; cc.lineJoin = 'round';
          for (const v of vines) {
            const pts = []; for (let k = 0; k <= 24; k++) pts.push(v(up * k / 24));
            for (const [w, col] of [[16, '#2b2040'], [10, '#4f9a3a'], [4, '#9ad65a']]) { cc.globalAlpha = a; cc.strokeStyle = col; cc.lineWidth = w; poly(cc, pts); }
          }
        },
      });
      await wait(340);
    },
    async rockfall(c, id) {
      Snd.play('earth');
      const [tx, ty] = tgt(c), big = id === 'summit_crash', n = big ? 3 : 5, shots = [];
      for (let i = 0; i < n; i++) {
        const x = tx + rnd(-70, 70), size = big ? rnd(30, 42) : rnd(16, 26);
        shots.push(shot(q => [x + (1 - q) * 30, ty - 360 + q * q * 360], 320, { delay: i * 70, size: 2, cols: ['#fff0c8', '#d8b078', '#a0764e'], draw: (cc, px, py, s, q) => rockCtx(cc, px, py, size, q * 4) }).then(() => { smoke(x, ty + 30, 3, '#a08a6a', { rx: 30 }); emit(5, { x, y: ty + 20, shape: 'rock', cols: ['#a0764e', '#8a6440'], ang: [-Math.PI * 0.9, -Math.PI * 0.1], spd: [120, 260], life: [400, 600], size: [5, 9], grow: 0.8, grav: 1000, add: false }); }));
      }
      await Promise.all(shots);
      FX.shake(big ? 14 : 9);
    },
    async leaves(c) {
      Snd.play('earth');
      const t = tgt(c), shots = [];
      for (let i = 0; i < 16; i++) {
        const s = [c.a[0] + rnd(-30, 30), c.a[1] + rnd(-40, 40)], p = arcPath(s, [t[0] + rnd(-40, 40), t[1] + rnd(-40, 40)], rnd(-60, 120), rnd(-80, 80)), ph = rnd(0, TAU), rot0 = rnd(0, TAU);
        shots.push(shot(q => { const [x, y] = p(q); return [x + Math.cos(q * 12 + ph) * 18, y + Math.sin(q * 12 + ph) * 18]; }, rnd(460, 560), { delay: i * 25, size: 2, cols: ['#f0ffb0', '#b8ec70', '#6cc04a'], draw: (cc, x, y, s, q) => leafCtx(cc, x, y, 10, rot0 + q * 14, pick(['#9ad65a', '#6cc04a', '#b8ec70'])) }));
      }
      await Promise.all(shots.slice(0, 10));
    },
    async quake(c) {
      Snd.play('rumble');
      const [tx] = c.d, gy = (c.dGround || [0, c.d[1] + 100])[1], sx = c.a[0] + c.dir * 60, sgy = (c.aGround || [0, gy])[1];
      FX.shake(16, 700);
      const crack = zig(sx, sgy, tx, gy, 12, 18), br = [zig(tx, gy, tx + 90, gy + rnd(-20, 20), 4, 10), zig(tx, gy, tx - 90, gy + rnd(-20, 20), 4, 10)];
      obj({ life: 1100, under: true, draw(cc, q) {
        const up = Math.min(1, q * 3), a = q > 0.7 ? (1 - q) / 0.3 : 1;
        cc.globalAlpha = a; cc.lineCap = 'round'; cc.lineJoin = 'round';
        cc.strokeStyle = '#2b2040'; cc.lineWidth = 9; poly(cc, crack, up); cc.lineWidth = 6; for (const b of br) poly(cc, b, Math.max(0, up * 2 - 1));
        cc.globalCompositeOperation = 'lighter'; cc.strokeStyle = '#ffb870'; cc.lineWidth = 2.5; cc.globalAlpha = a * 0.7; poly(cc, crack, up);
      } });
      for (let i = 0; i < 6; i++) { const [x, y] = crack[2 + i]; emit(3, { x, y, shape: 'rock', cols: ['#a0764e', '#8a6440', '#b08a58'], ang: [-Math.PI * 0.8, -Math.PI * 0.2], spd: [200, 380], life: [500, 700], size: [6, 11], grow: 0.8, grav: 1100, add: false, delay: i * 40 }); smoke(x, y, 2, '#a08a6a', { delay: i * 40, rx: 20 }); }
      await wait(380);
    },
    async spores(c) {
      Snd.play('status');
      const t = tgt(c), shots = [];
      for (let i = 0; i < 16; i++) { const p = arcPath([c.a[0] + rnd(-40, 40), c.a[1] + rnd(-40, 20)], [t[0] + rnd(-40, 40), t[1] + rnd(-40, 40)], rnd(0, 90), rnd(-60, 60)); shots.push(shot(q => { const [x, y] = p(q); return [x + Math.sin(q * 10 + i) * 14, y]; }, 700, { delay: i * 22, size: 5, cols: ['#ffffff', '#f6ffb0', '#d8f070', '#a0c040'] })); }
      await Promise.all(shots.slice(0, 10));
    },
    async wind(c, id) {
      Snd.play('air');
      const n = id === 'twin_tempest' ? 5 : 3, t = tgt(c);
      await Promise.all(Array.from({ length: n }, (_, i) => crescent([c.a[0] + c.dir * 40, c.a[1]], [t[0], t[1] + (i - (n - 1) / 2) * 30], 380, { delay: i * 80, r: 44 })));
    },
    async spark(c) {
      Snd.play('air');
      await shot(arcPath(c.a, tgt(c), 40), 380, { size: 16, cols: PAL.bolt, rate: 70, trail: (x, y) => { part({ x: x + rnd(-10, 10), y: y + rnd(-10, 10), vx: rnd(-160, 160), vy: rnd(-160, 160), shape: 'spark', cols: ['#ffffff', '#fff066'], s0: 3, s1: 1, w: 2, streak: 0.04, life: rnd(160, 260) }); if (Math.random() < 0.12) bolt(x, y, x + rnd(-40, 40), y + rnd(-40, 40), { seg: 3, jit: 8, branches: 0, w: 8, life: 140 }); } });
    },
    async slash(c) {
      Snd.play('air');
      const [x, y] = tgt(c);
      for (let i = 0; i < 2; i++) {
        const r0 = i ? -0.7 : 0.7;
        obj({ life: 340, delay: i * 110, draw(cc, q) {
          const t2 = Math.min(1, q * 2.4), a = q < 0.55 ? 1 : (1 - q) / 0.45;
          cc.translate(x, y); cc.rotate(r0); cc.globalCompositeOperation = 'lighter'; cc.lineCap = 'round';
          for (const [w, col, al] of [[20, '#b8a0ff', 0.3], [8, '#f0ecff', 0.9], [3, '#ffffff', 1]]) { cc.globalAlpha = al * a; cc.strokeStyle = col; cc.lineWidth = w; cc.beginPath(); cc.arc(0, 60, 130, -Math.PI / 2 - 0.9, -Math.PI / 2 - 0.9 + 1.8 * t2); cc.stroke(); }
        } });
      }
      await wait(200);
    },
    async bolt(c) {
      Snd.play('thunder');
      const [x, y] = tgt(c);
      FX.flash('#1c1640', 0.28, 200);
      bolt(x + rnd(-60, 60), -30, x, y, { col: '#fff066', glow: '#8a7cff' });
      setTimeout(() => bolt(x + rnd(-80, 80), -30, x + rnd(-20, 20), y, { col: '#ffffff', glow: '#a898ff', branches: 1, w: 14, life: 260 }), 90 * K());
      FX.flash('#fffbe0', 0.45, 220);
      await wait(110);
    },
    async storm(c) {
      Snd.play('thunder');
      const [x, y] = tgt(c);
      FX.flash('#1c1640', 0.45, 800);
      emit(14, { x, y: y - 230, rx: 150, ry: 26, shape: 'smoke', add: false, cols: ['#3a3460'], spd: [5, 30], life: [900, 1200], size: [40, 60], grow: 1.4, a: [0.5, 0.7], grav: 0 });
      for (let i = 0; i < 3; i++) setTimeout(() => bolt(x + (i - 1) * 60 + rnd(-20, 20), y - 220, x + rnd(-30, 30), y, { col: '#fff066' }), (120 + i * 130) * K());
      let acc = 0;
      obj({ life: 800, step(dt) { acc += dt * 70; while (acc >= 1) { acc--; part({ x: x + rnd(-170, 170), y: y - rnd(180, 220), vx: -60, vy: rnd(700, 850), shape: 'spark', cols: ['#c8d8ff'], s0: 3, s1: 2, w: 1.6, streak: 0.04, life: 300 }); } }, draw() {} });
      await wait(420);
      FX.shake(10);
    },
    async starfall(c) {
      Snd.play('thunder');
      const [tx, ty] = tgt(c);
      FX.flash('#1c1640', 0.35, 700);
      const shots = [];
      for (let i = 0; i < 6; i++) {
        const x = tx + rnd(-90, 90);
        shots.push(shot(arcPath([x - 380 + rnd(-60, 60), -60], [x, ty + rnd(-30, 30)], 0), 360, { delay: i * 75, size: 11, cols: PAL.star, rate: 120, trail: (px, py) => part({ x: px, y: py, vx: rnd(-20, 20), vy: rnd(-20, 20), shape: 'glow', cols: ['#fff6a0', '#ffb13b'], s0: rnd(6, 11), s1: 1, life: rnd(260, 420) }), draw: (cc, px, py, s, q) => { cc.globalAlpha = 1; star5Ctx(cc, px, py, 13, q * 9, '#ffffff'); } }).then(() => { if (i < 5) HIT.star(x, ty, 0.55); }));
      }
      await Promise.all(shots);
    },
    async lunge(c) { Snd.play('phys'); speedLines(c); lunge(c, c.dir * 150, c.dir * -40, 420); await wait(190); },
    async slam(c) {
      Snd.play('phys');
      const dx = c.dir * 200, dy = c.dir * -60;
      speedLines(c);
      U.anim(c.aSlot.wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.4}px, ${dy - 90}px)`, offset: 0.3 }, { transform: `translate(${dx}px, ${dy}px)`, offset: 0.55 }, { transform: 'translate(0,0)' }], { duration: 560 * K(), easing: 'ease-in-out' });
      await wait(300);
      const g2 = c.dGround || [c.d[0], c.d[1] + 90];
      ring(g2[0], g2[1] - 4, '#ffffff', 30, 200, 480, 8, { flat: 0.3 }); smoke(g2[0], g2[1], 8, '#a8987a', { rx: 90 });
      FX.shake(10);
    },
    async claw(c) { Snd.play('phys'); speedLines(c); lunge(c, c.dir * 110, c.dir * -30, 380); await wait(170); },
    async chomp(c) {
      Snd.play('phys');
      const [x, y] = tgt(c);
      obj({ life: 420, draw(cc, q) {
        const close = q < 0.3 ? 0 : Math.min(1, (q - 0.3) / 0.35), a = q < 0.8 ? Math.min(1, q * 6) : (1 - q) / 0.2, gap = 70 * (1 - close);
        cc.globalAlpha = a; cc.fillStyle = '#ffffff'; cc.strokeStyle = '#2b2040'; cc.lineWidth = 4; cc.lineJoin = 'round';
        for (const sd of [-1, 1]) {
          cc.beginPath(); const by = y + sd * gap;
          cc.moveTo(x - 80, by); for (let k = 0; k <= 8; k++) cc.lineTo(x - 80 + k * 20, by - sd * (k % 2 ? 0 : 22)); cc.lineTo(x + 80, by + sd * 18); cc.lineTo(x - 80, by + sd * 18); cc.closePath(); cc.fill(); cc.stroke();
        }
      } });
      await wait(300);
    },
    async peck(c) {
      Snd.play('phys'); speedLines(c); lunge(c, c.dir * 130, c.dir * -36, 360);
      await wait(160);
      const [x, y] = tgt(c);
      for (let i = 0; i < 2; i++) setTimeout(() => pow(x + rnd(-40, 40), y + rnd(-40, 40), 40), 90 * (i + 1) * K());
    },
    async sting(c) { Snd.play('phys'); speedLines(c, ['#f0d0ff', '#c07cff']); lunge(c, c.dir * 150, c.dir * -40, 420); await wait(190); HIT.poison(...tgt(c), 0.8); },
    async arrow(c) {
      Snd.play('air');
      const t = tgt(c), ang = Math.atan2(t[1] - c.a[1], t[0] - c.a[0]);
      await shot(arcPath(c.a, t, 12), 260, { size: 6, cols: PAL.star, rate: 80, trail: (x, y) => part({ x, y, shape: 'glow', cols: ['#fff6a0'], s0: 5, s1: 1, life: 240 }), draw: (cc, x, y) => { cc.globalAlpha = 1; cc.save(); cc.translate(x, y); cc.rotate(ang); cc.strokeStyle = '#2b2040'; cc.lineWidth = 7; cc.beginPath(); cc.moveTo(-50, 0); cc.lineTo(14, 0); cc.stroke(); cc.strokeStyle = '#ffe066'; cc.lineWidth = 3.5; cc.stroke(); cc.fillStyle = '#ffffff'; cc.beginPath(); cc.moveTo(22, 0); cc.lineTo(8, -8); cc.lineTo(8, 8); cc.closePath(); cc.fill(); cc.restore(); } });
    },
    async shout(c, id) {
      Snd.play('debuff');
      await wavesTo(c.a, c.d, id === 'roar' ? 4 : 3, '#ffffff', { w: 7 });
      if (id === 'roar') FX.shake(7);
    },
    async glare(c) {
      Snd.play('debuff');
      const [sx, sy] = c.a;
      flash(sx, sy - 20, '#ff5d6c', 80, 400);
      await shot(arcPath(c.a, c.d, 0), 300, { size: 10, cols: ['#ffffff', '#ffb0b8', '#ff5d6c'], rate: 40, trail: (x, y) => part({ x, y, shape: 'glow', cols: ['#ff5d6c'], s0: 8, s1: 1, life: 260 }) });
      FX.flash('#ff5d6c', 0.18, 300);
    },
    async notes(c) {
      Snd.play('heal');
      await Promise.all([0, 1, 2].map(i => { const p = arcPath([c.a[0], c.a[1] - 40], c.d, 60 + i * 30, (i - 1) * 50); return shot(p, 700, { delay: i * 120, size: 6, cols: PAL.dream, draw: (cc, x, y, s, q) => textCtx(cc, x, y + Math.sin(q * 14) * 8, i % 2 ? '♫' : '♪', 34, '#ffffff', '#6a4a8a') }); }));
    },
  };
  const MOVES_DATA = id => (typeof MOVES !== 'undefined' && MOVES[id]) || {};
  /* small ctx drawing helpers used by projectiles */
  function fireCore(cc, x, y, s) {
    cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over';
    const gr = cc.createRadialGradient(x - s * 0.25, y - s * 0.25, 0, x, y, s);
    gr.addColorStop(0, '#fffbe0'); gr.addColorStop(0.35, '#ffe066'); gr.addColorStop(0.75, '#ff8a2e'); gr.addColorStop(1, '#d8402a');
    cc.fillStyle = gr; cc.strokeStyle = '#7a1e14'; cc.lineWidth = 3; cc.beginPath(); cc.arc(x, y, s, 0, TAU); cc.fill(); cc.stroke();
  }
  function star4Ctx(cc, x, y, s, r, col) { const gg = g; g = cc; star4(x, y, s, r, col); g = gg; }
  function star5Ctx(cc, x, y, s, r, col) { const gg = g; g = cc; star5(x, y, s, r, col); g = gg; }
  function rockCtx(cc, x, y, s, r) {
    cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.save(); cc.translate(x, y); cc.rotate(r);
    cc.fillStyle = '#a0764e'; cc.strokeStyle = '#2b2040'; cc.lineWidth = 3; cc.beginPath();
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = s * (0.8 + ((k * 37) % 5) * 0.06); cc[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr * 0.85); }
    cc.closePath(); cc.fill(); cc.stroke(); cc.fillStyle = '#d8b078'; cc.beginPath(); cc.ellipse(-s * 0.25, -s * 0.25, s * 0.35, s * 0.2, -0.5, 0, TAU); cc.fill(); cc.restore();
  }
  function leafCtx(cc, x, y, s, r, col) {
    cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.save(); cc.translate(x, y); cc.rotate(r);
    cc.fillStyle = col; cc.strokeStyle = '#1f4a26'; cc.lineWidth = 1.5; cc.beginPath(); cc.ellipse(0, 0, s, s * 0.45, 0, 0, TAU); cc.fill(); cc.stroke(); cc.beginPath(); cc.moveTo(-s, 0); cc.lineTo(s, 0); cc.stroke(); cc.restore();
  }
  function textCtx(cc, x, y, text, size, col, stroke) {
    cc.globalAlpha = 1; cc.globalCompositeOperation = 'source-over'; cc.font = `900 ${size}px ${FONT}`; cc.textAlign = 'center'; cc.textBaseline = 'middle';
    cc.lineWidth = size * 0.16; cc.strokeStyle = stroke; cc.lineJoin = 'round'; cc.strokeText(text, x, y); cc.fillStyle = col; cc.fillText(text, x, y);
  }

  /* ======================= STATUS / BUFFS / SELF-CAST ======================= */
  function status(st, x, y) {
    switch (st) {
      case 'burn': emit(22, { x, y: y + 30, rx: 50, ry: 16, shape: 'flame', cols: ['#ffe066', '#ffb13b', '#ff6a26', '#d8402a'], ang: [-Math.PI * 0.6, -Math.PI * 0.4], spd: [80, 180], life: [400, 700], size: [14, 26], grow: 0.15, grav: -120, stagger: 16 }); sparks(x, y, 10, ['#ffe066', '#ff8a2e'], { grav: -100 }); break;
      case 'poison': HIT.poison(x, y, 1); break;
      case 'shock': HIT.bolt(x, y, 0.8); break;
      case 'sleep': emit(3, { x: x + 40, y: y - 30, shape: 'text', text: 'Z', cols: ['#ffffff'], stroke: '#4a3a8a', ang: [-1.2, -0.9], spd: [50, 70], life: [1100, 1200], size: [24, 36], grow: 1.4, stagger: 180, rot: 0, fout: 0.7 }); dots(x, y, 10, PAL.dream, { spd: [20, 60] }); break;
      case 'freeze': HIT.ice(x, y, 1.3); FX.flash('#bff0ff', 0.3); break;
      default: hit('pow', x, y);
    }
  }
  function stage(x, y, up) {
    const col = up ? '#9dff7a' : '#ff6b7a';
    ring(x, y + 70, col, 30, 150, 600, 6, { flat: 0.3 }); ring(x, y + 70, col, 20, 110, 600, 4, { flat: 0.3, delay: 150 });
    emit(8, { x, y: y + (up ? 50 : -50), rx: 70, shape: 'text', text: up ? '▲' : '▼', cols: [col], stroke: '#2b2040', ang: up ? [-Math.PI / 2, -Math.PI / 2] : [Math.PI / 2, Math.PI / 2], spd: [120, 170], life: [700, 900], size: [22, 30], grow: 1, rot: 0, stagger: 60 });
    emit(20, { x, y: y + 60, rx: 70, ry: 10, shape: 'glow', cols: [col, '#ffffff'], ang: up ? [-Math.PI / 2 - 0.1, -Math.PI / 2 + 0.1] : [Math.PI / 2 - 0.1, Math.PI / 2 + 0.1], spd: [90, 200], life: [500, 800], size: [4, 8], grow: 0.4, stagger: 20 });
  }
  function heal(x, y) {
    flash(x, y, '#8fffc0', 140, 700);
    emit(12, { x, y: y + 40, rx: 70, ry: 20, shape: 'text', text: '+', cols: ['#ffffff'], stroke: '#2a8a5a', ang: [-Math.PI / 2, -Math.PI / 2], spd: [80, 140], life: [800, 1000], size: [22, 32], grow: 1, rot: 0, stagger: 50 });
    emit(26, { x, y: y + 60, rx: 80, ry: 16, shape: 'star', cols: PAL.heal, ang: [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2], spd: [80, 220], life: [600, 900], size: [4, 8], grow: 0.4, stagger: 12 });
    ring(x, y + 70, '#8fffc0', 30, 160, 700, 6, { flat: 0.3 });
  }
  async function cast(id, c) {
    const st = FX.styleOf(id), [x, y] = c.a, m = MOVES_DATA(id);
    const cols = m.el ? PAL[EL[m.el]] || PAL.star : PAL.star;
    if (st === 'heal') { Snd.play('heal'); heal(x, y); await wait(460); return; }
    if (st === 'rain') { await FAM.rain(c); heal(x, y); return; }
    if (st === 'charge') {
      Snd.play('buff');
      converge(x, y, 36, PAL.bolt, { r: [90, 170] });
      for (let i = 0; i < 4; i++) setTimeout(() => { const a = rnd(0, TAU); bolt(x + Math.cos(a) * 70, y + Math.sin(a) * 70, x, y, { seg: 4, jit: 12, branches: 0, w: 10, life: 200 }); }, i * 90 * K());
      await wait(460);
      flash(x, y, '#fff066', 130, 360);
      return;
    }
    Snd.play('buff');
    const gy = (c.aGround || [0, y + 90])[1];
    ring(x, gy - 4, cols[2], 30, 170, 620, 7, { flat: 0.3 }); ring(x, gy - 4, cols[1], 20, 120, 620, 5, { flat: 0.3, delay: 140 });
    emit(34, { x, y: gy - 10, rx: 80, ry: 10, shape: Math.random() < 0.5 ? 'star' : 'glow', cols, ang: [-Math.PI / 2 - 0.12, -Math.PI / 2 + 0.12], spd: [120, 300], life: [500, 800], size: [4, 9], grow: 0.4, stagger: 10 });
    flash(x, y, cols[1], 130, 600);
    await wait(420);
  }

  /* ======================= SUMMON / FAINT / PARTY ======================= */
  /** orb bursts open on the platform: light pillar, rays, ground ring, stars, dust */
  function summon(x, gy, o = {}) {
    const cols = o.cols || PAL.star, big = o.big ? 1.35 : 1;
    flash(x, gy - 60, '#ffffff', 170 * big, 380);
    obj({ life: 620, draw(cc, q) {
      const a = q < 0.2 ? q / 0.2 : (1 - q) / 0.8, w = 120 * big * (1 - q * 0.55);
      const gr = cc.createLinearGradient(0, gy - 320, 0, gy);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, cols[1]); gr.addColorStop(1, '#ffffff');
      cc.globalCompositeOperation = 'lighter'; cc.globalAlpha = a * 0.9; cc.fillStyle = gr; cc.fillRect(x - w / 2, gy - 320, w, 320);
      cc.globalAlpha = a; cc.fillStyle = '#ffffff'; cc.fillRect(x - w * 0.14, gy - 320, w * 0.28, 320);
      cc.globalAlpha = a * 0.8; cc.drawImage(sprite(cols[1]), x - w * 1.3, gy - 140 - w * 1.3, w * 2.6, w * 2.6);
    } });
    emit(16 * big, { x, y: gy - 70, shape: 'spark', cols: ['#ffffff', cols[1]], spd: [600, 900], life: [260, 420], size: [5, 8], w: [3, 5], streak: 0.16, drag: 1.2 });
    ring(x, gy - 4, '#ffffff', 20, 190 * big, 600, 9, { flat: 0.32 }); ring(x, gy - 4, cols[2], 10, 140 * big, 560, 6, { flat: 0.32, delay: 100 });
    stars(x, gy - 70, 16 * big, cols, { spd: [160, 380] });
    smoke(x, gy - 6, 8, o.dust || '#c8b8a0', { rx: 70, size: [18, 26], a: [0.3, 0.45], grav: -10 });
    emit(20, { x, y: gy - 40, rx: 60, ry: 40, shape: 'glow', cols, ang: [-Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4], spd: [20, 80], life: [900, 1400], size: [3, 6], grow: 0.5, delay: [100, 500], wob: 8, wobA: 10 });
    return wait(260);
  }
  /** wild Orbling bursts out of a sparkle vortex (element-tinted) */
  function wildIn(x, gy, el, alpha) {
    const cols = PAL[EL[el]] || PAL.leaf;
    emit(64, { x, y: gy - 80, shape: el === 'earth' ? 'leaf' : 'star', cols: el === 'earth' ? ['#9ad65a', '#6cc04a', '#b8ec70'] : cols, add: el !== 'earth', orb: { cx: x, cy: gy - 80, r0: [80, 150], dr: -170, w: 9, flat: 0.5 }, life: [420, 620], size: [6, 11], grow: 0.4, stagger: 5 });
    emit(30, { x, y: gy - 80, shape: 'glow', cols: [cols[1], '#ffffff'], orb: { cx: x, cy: gy - 80, r0: [60, 130], dr: -150, w: -8, flat: 0.5 }, life: [400, 600], size: [5, 10], grow: 0.4, stagger: 7 });
    setTimeout(() => {
      flash(x, gy - 70, alpha ? '#ffd23f' : cols[1], alpha ? 220 : 150, 400);
      stars(x, gy - 70, alpha ? 30 : 18, alpha ? PAL.star : cols, { spd: [160, 420] });
      ring(x, gy - 4, alpha ? '#ffd23f' : '#ffffff', 20, alpha ? 240 : 180, 560, 8, { flat: 0.32 });
      smoke(x, gy - 6, 8, '#c8b8a0', { rx: 70 });
    }, 380 * K());
    return wait(400);
  }
  /* the opening film's capture (prologue.js): light spiralling into the orb, its wobbles, the catch burst */
  function suck(ex, ey, ox, oy) {
    emit(46, { x: ex, y: ey, rx: 50, ry: 60, shape: 'glow', cols: ['#ffffff', '#fff6a0', '#8fd8ff'], size: [5, 11], grow: 0.3, life: [360, 520], orb: { cx: ox, cy: oy, r0: [40, 110], dr: -260, w: 10 }, stagger: 4 });
    flash(ox, oy, '#ffffff', 110, 420);
  }
  function wobble(x, y) { stars(x, y - 10, 5, PAL.star, { ang: [-Math.PI * 0.85, -Math.PI * 0.15], spd: [80, 180], size: [5, 8] }); ring(x, y, '#fff6a0', 10, 60, 300, 4); }
  function caught(x, y) {
    flash(x, y, '#fff6a0', 260, 700); flash(x, y, '#ffffff', 120, 360);
    obj({ life: 1100, draw(cc, q) {
      const a = q < 0.15 ? q / 0.15 : (1 - q) / 0.85;
      cc.translate(x, y); cc.rotate(q * 0.8); cc.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) { cc.rotate(TAU / 12); const gr = cc.createLinearGradient(0, 0, 0, -260); gr.addColorStop(0, 'rgba(255,246,160,' + (0.55 * a).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,246,160,0)'); cc.fillStyle = gr; cc.beginPath(); cc.moveTo(-10, 0); cc.lineTo(0, -260); cc.lineTo(10, 0); cc.closePath(); cc.fill(); }
    } });
    stars(x, y, 34, PAL.star, { spd: [180, 480], size: [7, 14] });
    ring(x, y, '#ffe066', 20, 240, 700, 10); ring(x, y, '#ffffff', 10, 170, 600, 6, { delay: 120 });
    confetti(x, y - 40, 60);
  }

  /* ======================= THE CATCH (3.2) ======================= */
  const rgba = (h, a) => { const [r, gg, b] = U.hexToRgb(h); return `rgba(${r},${gg},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`; };
  const eOut = q => 1 - (1 - q) * (1 - q), eIO = q => (q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q)), eIn = q => q * q * q;
  const eBack = q => 1 + 2.70158 * Math.pow(q - 1, 3) + 1.70158 * Math.pow(q - 1, 2);
  /** the timing ring shatters where it stood (grade 1 nice, 2 great, 3 excellent) */
  function aimBurst(x, y, r, grade) {
    const cols = grade === 3 ? PAL.star : grade === 2 ? ['#ffffff', '#dff9ff', '#7fe8ff'] : ['#ffffff', '#eef4ff'];
    const n = Math.round((grade === 3 ? 34 : grade === 2 ? 24 : 16) * (lite ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + rnd(-0.1, 0.1), v = rnd(60, grade === 3 ? 260 : 170);
      part({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.2, shape: i % 3 ? 'glow' : 'star', cols, s0: rnd(4, 8), s1: 1, life: rnd(320, 560), rot: rnd(0, TAU) });
    }
    ring(x, y, cols[cols.length - 1], r, r * 1.4, 320, grade === 3 ? 7 : 4);
    if (grade === 3) { flash(x, y, '#fff6a0', r * 2.4, 420); ring(x, y, '#ffffff', r * 0.6, r * 2.1, 480, 5, { delay: 60 }); }
  }
  /** the orb's ring thrown around an Orbling: it drops from the orb (ox, oy) to the feet (fx, fy) opening wide, rises up
   *  the body to cy while a curtain of light climbs to its top, then tightens back into the orb (d: the three phases) */
  function halo(o) {
    const [d1, d2, d3] = o.d, cols = o.cols || PAL.star, flat = o.flat || 0.3, rx0 = 22;
    obj({ life: d1 + d2 + d3, draw(c, q, age) {
      let x, y, r, curtain, tether, k3 = 0;
      if (age < d1) { const k = eOut(age / d1); x = o.ox + (o.fx - o.ox) * k; y = o.oy + (o.fy - o.oy) * k; r = rx0 + (o.rx - rx0) * k; curtain = 0.55 * k; tether = 1; }
      else if (age < d1 + d2) { const k = eIO((age - d1) / d2); x = o.fx; y = o.fy + (o.cy - o.fy) * k; r = o.rx * (1 - 0.12 * k); curtain = 0.55 + 0.45 * k; tether = 1 - 0.4 * k; }
      else { k3 = eIn((age - d1 - d2) / d3); x = o.fx + (o.ox - o.fx) * k3; y = o.cy + (o.oy - o.cy) * k3; r = o.rx * 0.88 * (1 - k3) + 5 * k3; curtain = 1 - k3; tether = 0.6 * (1 - k3); }
      const ry = r * flat;
      c.globalCompositeOperation = 'lighter';
      if (tether > 0.02) { // a faint cone of light from the orb down to the ring
        const gr = c.createLinearGradient(0, o.oy, 0, y);
        gr.addColorStop(0, rgba('#ffffff', 0.4 * tether)); gr.addColorStop(1, rgba(cols[2], 0.1 * tether));
        c.fillStyle = gr; c.beginPath(); c.moveTo(o.ox - 6, o.oy); c.lineTo(o.ox + 6, o.oy); c.lineTo(x + r, y); c.lineTo(x - r, y); c.closePath(); c.fill();
      }
      if (curtain > 0.02) { // light climbing from the ring up the Orbling
        const h = Math.max(24, y - o.top), gr = c.createLinearGradient(0, y, 0, y - h);
        gr.addColorStop(0, rgba(cols[1], 0.36 * curtain)); gr.addColorStop(0.7, rgba(cols[1], 0.1 * curtain)); gr.addColorStop(1, rgba(cols[1], 0));
        c.fillStyle = gr; c.fillRect(x - r, y - h, r * 2, h);
      }
      for (const [w, col, al] of [[16, cols[3] || cols[2], 0.3], [7, cols[2], 0.85], [2.6, '#ffffff', 1]]) { c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.ellipse(x, y, r, ry, 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { // sparks running round the ring
        const a = age / 1000 * 7 + i * TAU / 6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * ry, s = 10 + 4 * Math.sin(age / 60 + i);
        c.drawImage(sprite('#ffffff'), px - s, py - s, s * 2, s * 2);
      }
      c.globalAlpha = 0.45 + 0.55 * k3; c.drawImage(sprite(cols[1]), o.ox - 36, o.oy - 36, 72, 72);
    } });
    // stars spiralling up round the Orbling while the ring climbs, then streaming into the orb
    emit(26, { x: o.fx, y: o.fy, shape: 'star', cols, size: [4, 8], grow: 0.4, life: [d2 * 0.8, d2 * 1.2], orb: { cx: o.fx, cy: o.fy - 6, r0: [o.rx * 0.7, o.rx * 1.05], dr: -o.rx * 0.6, w: 7, flat, vy: -(o.fy - o.top) * 1000 / (d2 + d3) * 0.8 }, delay: d1, stagger: d2 / 30 });
    setTimeout(() => converge(o.ox, o.oy, 28, [cols[0], cols[1], '#ffffff'], { r: [60, 130], life: [d3 * 0.8, d3 * 1.1] }), (d1 + d2) * K());
    return wait(d1 + d2 + d3);
  }
  /** a constellation draws itself: its stars pop in one by one (every o.step ms after o.t0) and the lines follow; it
   *  holds, then streams into (o.tx, o.ty). o.onStar(i) fires as each star appears (a bell); setting o.cancelled
   *  stops it at once. Returns its length (nominal ms). */
  function constellation(o) {
    const S = typeof SIGN_STARS !== 'undefined' && SIGN_STARS[o.sign];
    if (!S) return 0;
    const n = S.p.length, R = o.r, col = o.col || '#8fe8ff', step = o.step, t0 = o.t0 || 0, hold = o.hold || 700, out = o.out || 420;
    const pts = S.p.map(([px, py]) => [o.x + px * R, o.y + py * R * 0.86]);
    const ts = pts.map((_, i) => t0 + i * step), life = t0 + (n - 1) * step + hold + out, tOut = life - out;
    const lines = S.l.map(([a, b]) => (ts[a] <= ts[b] ? [a, b] : [b, a]));
    const big = new Set(S.big || []);
    obj({ life, draw(c, q, age) {
      if (o.cancelled) return;
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      const fo = age > tOut ? (age - tOut) / out : 0;
      const P = pts.map(([px, py], i) => { if (!fo) return [px, py]; const e = Math.pow(Math.max(0, Math.min(1, fo * 1.3 - i / n * 0.3)), 2); return [px + (o.tx - px) * e, py + (o.ty - py) * e]; });
      const la = 1 - Math.min(1, fo * 2.2);
      if (la > 0) for (const [s, e] of lines) {
        const k = Math.min(1, (age - ts[e]) / 160);
        if (k <= 0) continue;
        const [x1, y1] = P[s], [x2, y2] = P[e];
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
        c.globalAlpha = 0.34 * la; c.strokeStyle = col; c.lineWidth = 9; c.stroke();
        c.globalAlpha = 0.92 * la; c.strokeStyle = '#ffffff'; c.lineWidth = 2.6; c.stroke();
      }
      for (let i = 0; i < n; i++) {
        const a = age - ts[i];
        if (a < 0) continue;
        const pop = a < 170 ? Math.max(0, eBack(a / 170)) : 1, tw = 1 + 0.14 * Math.sin(age / 85 + i * 1.7);
        const s = (big.has(i) ? 12 : 8) * pop * tw * (1 - fo * 0.55), [px, py] = P[i];
        c.globalAlpha = 0.85; c.drawImage(sprite(col), px - s * 3.2, py - s * 3.2, s * 6.4, s * 6.4);
        c.globalAlpha = 1; star4(px, py, s * 1.35, 0, '#ffffff');
      }
    } });
    for (let i = 0; i < n; i++) setTimeout(() => { if (o.cancelled) return; stars(pts[i][0], pts[i][1], big.has(i) ? 6 : 3, ['#ffffff', col], { spd: [50, 150], size: [3, 6] }); if (o.onStar) o.onStar(i); }, ts[i] * K());
    return life;
  }
  /** jagged cracks of light running out of an orb about to burst */
  function cracks(x, y, r, dur = 340) {
    const L = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + rnd(-0.4, 0.4), pts = [[x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25]];
      let px = pts[0][0], py = pts[0][1];
      for (let k = 0; k < 3; k++) { const aa = a + rnd(-0.6, 0.6), d = r * rnd(0.3, 0.5); px += Math.cos(aa) * d; py += Math.sin(aa) * d; pts.push([px, py]); }
      L.push({ pts, t: i / 6 * dur * 0.6 });
    }
    obj({ life: dur, draw(c, q, age) {
      c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
      for (const l of L) {
        const k = (age - l.t) / 70;
        if (k <= 0) continue;
        const fl = Math.sin(age / 18 + l.t) > -0.4 ? 1 : 0.35;
        for (const [w, col, al] of [[7, '#8fd8ff', 0.35], [2.4, '#ffffff', 1]]) { c.globalAlpha = al * fl; c.strokeStyle = col; c.lineWidth = w; poly(c, l.pts, Math.min(1, k)); }
      }
    } });
  }
  /** the orb locks: a white-hot flash, turning rays, rings along the ground and a burst of stars */
  function sealed(x, y, gy, cols) {
    flash(x, y, '#ffffff', 160, 320); flash(x, y, cols[1], 320, 900);
    obj({ life: 1300, draw(cc, q) {
      const a = q < 0.12 ? q / 0.12 : Math.pow(1 - (q - 0.12) / 0.88, 1.4);
      cc.translate(x, y); cc.rotate(q * 0.9); cc.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 16; i++) {
        cc.rotate(TAU / 16);
        const L = (i % 2 ? 190 : 300) * (0.75 + q * 0.4), gr = cc.createLinearGradient(0, 0, 0, -L);
        gr.addColorStop(0, rgba(cols[1], 0.62 * a)); gr.addColorStop(1, rgba(cols[1], 0));
        cc.fillStyle = gr; cc.beginPath(); cc.moveTo(-9, 0); cc.lineTo(0, -L); cc.lineTo(9, 0); cc.closePath(); cc.fill();
      }
    } });
    ring(x, y, '#ffffff', 16, 230, 520, 9); ring(x, y, cols[2], 10, 320, 820, 6, { delay: 90 });
    ring(x, gy, '#ffffff', 24, 280, 700, 6, { flat: 0.28 });
    stars(x, y, 38, PAL.star, { spd: [220, 580], size: [7, 14] });
    sparks(x, y, 18, ['#ffffff', cols[1]], { spd: [380, 720], grav: 200 });
  }
  /** the orb bursts open: a shockwave, sparks and dust */
  function breakout(x, y, gy) {
    flash(x, y, '#ffffff', 200, 300);
    ring(x, y, '#ffffff', 20, 250, 420, 10); ring(x, gy, '#dff6ff', 24, 210, 520, 6, { flat: 0.3 });
    sparks(x, y, 26, ['#ffffff', '#8fd8ff', '#fff6a0'], { spd: [260, 640] });
    smoke(x, gy - 6, 12, '#b8b0c8', { rx: 44, size: [18, 30], spd: [40, 140] });
    stars(x, y, 10, ['#ffffff', '#cfefff'], { spd: [120, 300] });
  }
  function confetti(x, y, n = 70) {
    emit(n, { x, y, rx: 40, shape: 'rect', add: false, cols: ['#ffd23f', '#ff7ab6', '#5cd6ff', '#9dff7a', '#ffffff', '#b08cff', '#ff8a3d'], ang: [-Math.PI * 0.95, -Math.PI * 0.05], spd: [260, 620], life: [1300, 1900], size: [7, 12], grow: 1, spin: [4, 10], grav: 700, drag: 1.4, fout: 0.75 });
  }
  function dissolve(x, y, cols) {
    emit(40, { x, y, rx: 60, ry: 60, shape: 'glow', cols: cols || ['#ffffff', '#d8d0ff', '#9a8ac8'], ang: [-Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4], spd: [40, 140], life: [600, 1000], size: [4, 10], grow: 0.3, grav: -60, stagger: 8, wob: 6, wobA: 8 });
    smoke(x, y + 30, 6, '#6a6080', { rx: 50 });
  }
  /** a slow sparkle aura rising around a point (legend / alpha presence) */
  function aura(x, y, col, dur = 1200) {
    let acc = 0;
    obj({ life: dur, step(dt) { acc += dt * 30; while (acc >= 1) { acc--; part({ x: x + rnd(-70, 70), y: y + rnd(20, 80), vy: rnd(-120, -60), shape: Math.random() < 0.4 ? 'star' : 'glow', cols: [col, '#ffffff'], s0: rnd(4, 8), s1: 1, life: rnd(600, 900), rot: rnd(0, TAU) }); } }, draw() {} });
  }

  return {
    ok, ensure, emit, part, obj, flash, ring, smoke, sparks, stars, dots, shot, bolt, beam, crescent, wavesTo, converge, pow,
    hit, status, stage, heal, cast, moves: FAM, summon, wildIn, suck, wobble, caught, confetti, dissolve, aura, PAL, EL, arcPath,
    sprite, aimBurst, halo, constellation, cracks, sealed, breakout,
    clear() { P.length = 0; O.length = 0; },
    setLite(v) { lite = !!v; },
    stats() { return { p: P.length, o: O.length, running, res, conn: !!(cv && cv.isConnected), w: cv && cv.width }; },
  };
})();
