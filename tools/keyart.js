/* Dev: the key art of Orbling Skies, drawn with the game's own art (tools/keyart.html). One composition, a function of
 * time t (s), used for everything the portals ask for:
 *   ?w=1080&h=1080            Poki's thumbnail (square, no text) — and, frame by frame, its animated thumbnail
 *   ?w=1920&h=1080&logo=1     CrazyGames' covers (16:9, 2:3, 1:1; the title may be on them)
 *   ?mode=sheet               a contact sheet of the art to pick poses from
 * The scene: Sunkit (the first partner) on a floating isle in a bright sky, a Star Orb flying where it looks, a wild
 * Zapsy on a little isle further off. In the 5 s loop the orb swoops over, catches Zapsy (a flash, three stars) and
 * comes back, and Sunkit hops for joy — the game in one breath, starting and ending on the still.
 * window.ready turns true when the art is painted; window.setT(t) moves the scene to time t (tools/keyart_shots.js). */
const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1080), H = +(Q.get('h') || 1080), LOGO = Q.get('logo') === '1', T0 = +(Q.get('t') || 0);
const c = document.getElementById('c');
window.ready = false;
window.Main = { lite: false, settings: {} }; // (the art code asks about lite mode)

const el = (tag, st, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; Object.assign(e.style, st || {}); c.appendChild(e); return e; };
const img = (src, st, cls) => { const e = el('img', st, cls); e.src = src; return e; };
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

async function sheet() {
  document.body.style.overflow = 'auto';
  c.className = 'sheet'; c.style.position = 'static';
  const add = async (label, p) => { const d = document.createElement('div'); const u = await p; d.innerHTML = `<img src="${u}"><br>${label}`; c.appendChild(d); };
  for (const mv of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875]) await add('sunkit mv ' + mv, MonArt.painted('sunkit', { size: 'lg', mv }));
  for (const t of [0, 0.3, 0.6]) await add('sunkit t ' + t, MonArt.painted('sunkit', { size: 'lg', t }));
  for (const id of ['breezle', 'finnip', 'mossmoo', 'solmane', 'zapsy']) await add(id, MonArt.painted(id, { size: 'lg', mv: 0.25 }));
  for (const b of ['meadow', 'beach', 'snow', 'volcano', 'plains']) await add('isle ' + b, Promise.resolve(WArt.isle(b)));
  for (const b of ['meadow', 'beach']) await add('isle plain ' + b, Promise.resolve(WArt.isle(b, true)));
  await add('orb', Promise.resolve(WArt.item('orb')));
  window.ready = true;
}

/* ---------------- the composition ---------------- */
const S = {}; // the scene's elements and anchors
const star4 = (fill = '#fffbe0') => `<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10Z" fill="${fill}"/></svg>`;
async function build() {
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const land = W / H > 1.2, port = W / H < 0.9;
  // one unit = 1/1080 of the short side; the square layout sits in the middle, a long side gets more sky
  // with the title (not 16:9) the scene shrinks a little and moves down: the sky above it is kept clear for the logo
  const sk = LOGO && !land ? (port ? 0.96 : 0.8) : 1;
  const u = Math.min(W, H) / 1080 * sk;
  const ox = (W - 1080 * u) / 2 + (land && LOGO ? -W * 0.18 : 0), oy = LOGO && !land ? H - 1080 * u + (port ? 0 : 20 * u) : (H - 1080 * u) / 2;
  const P = (x, y) => [ox + x * u, oy + y * u]; // square-layout point → canvas
  Object.assign(S, { u, P, land, port });
  // sky, the sun behind the hero's head and its slowly turning rays
  el('div', { inset: 0, background: 'linear-gradient(#2a8ce8 0%, #56b1fb 36%, #9fd8ff 70%, #d7f0ff 100%)' });
  const [sx, sy] = P(360, 250);
  S.rays = el('div', { left: sx - 1300 * u + 'px', top: sy - 1300 * u + 'px', width: 2600 * u + 'px', height: 2600 * u + 'px', borderRadius: '50%',
    background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,.17) 0deg 6deg, rgba(255,255,255,0) 6deg 18deg)',
    maskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,.55) 26%, transparent 58%)', WebkitMaskImage: 'radial-gradient(circle, #000 0%, rgba(0,0,0,.55) 26%, transparent 58%)' });
  el('div', { left: sx - 330 * u + 'px', top: sy - 330 * u + 'px', width: 660 * u + 'px', height: 660 * u + 'px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,251,220,1) 0 10%, rgba(255,238,150,.6) 30%, rgba(255,238,150,0) 70%)' });
  // soft far clouds
  S.clouds = [];
  const cloud = (x, y, s, o) => {
    const [cx, cy] = P(x, y);
    const d = el('div', { left: cx + 'px', top: cy + 'px', width: 420 * s * u + 'px', height: 150 * s * u + 'px', opacity: o });
    d.innerHTML = `<svg viewBox="0 0 420 150" width="100%" height="100%"><path d="M30 128 C-6 128 -4 84 34 84 C30 44 88 34 108 62 C120 18 196 8 214 58 C236 22 300 30 300 74 C334 52 388 70 380 104 C414 110 410 132 384 132 Z" fill="#ffffff"/><path d="M40 128 C120 138 300 138 384 132 C360 120 330 118 300 122 C240 112 160 116 110 122 C80 118 56 120 40 128Z" fill="#d3eaff"/></svg>`;
    S.clouds.push([d, cx, s]);
  };
  cloud(-140, 600, 1.3, 0.92); cloud(760, 470, 0.9, 0.85); cloud(520, 60, 0.6, 0.6);
  if (land) { cloud(-560, 180, 1.0, 0.8); cloud(1300, 140, 1.1, 0.8); cloud(1260, 700, 1.2, 0.9); }
  if (port && !LOGO) { cloud(-80, -330, 1.1, 0.8); cloud(700, -220, 0.9, 0.75); }
  // far isles in the haze: the Star Isles float in the sky
  const far = (b, x, y, w, o, blur) => { const [fx, fy] = P(x, y); return img(WArt.isle(b), { left: fx + 'px', top: fy + 'px', width: w * u + 'px', opacity: o, filter: `blur(${blur * u}px) saturate(.8) brightness(1.05)` }); };
  S.far = LOGO && !land ? [far('volcano', 900, 420, 140, 0.7, 1.6)] : [far('volcano', 880, 90, 150, 0.7, 1.6)];
  if (land) S.far.push(far('plains', -420, 560, 190, 0.75, 1.4), far('beach', LOGO ? 1330 : 1380, LOGO ? 860 : 420, 170, 0.7, 1.6));
  // the wild one: Zapsy on a little isle to the right (the orb will catch it)
  const [zx, zy] = P(860, 700);
  S.zIsle = img(WArt.isle('beach', true), { left: zx - 130 * u + 'px', top: zy + 'px', width: 260 * u + 'px', filter: 'drop-shadow(0 12px 12px rgba(20,60,120,.25))' });
  S.zap = img(await MonArt.painted('zapsy', { size: 'lg', t: 0 }), { width: 250 * u + 'px', transformOrigin: '50% 85%', filter: 'drop-shadow(0 0 2px #1a1040) drop-shadow(0 10px 10px rgba(20,20,80,.25))' });
  S.zAt = [zx, zy];
  // the hero's isle (plain: nothing on it but grass) and the hero
  const [ix, iy] = P(430, 640), iw = 700 * u; // (the isle's art is 260×200: its grass is centred 50 % down)
  S.isle = img(WArt.isle('meadow', true), { left: ix - iw / 2 + 'px', top: iy + 'px', width: iw + 'px', filter: 'drop-shadow(0 20px 22px rgba(20,60,120,.3))' });
  S.isleAt = [ix, iy, iw];
  S.hero = img(await MonArt.painted('sunkit', { size: 'lg', mv: 0.375 }), { width: 660 * u + 'px', transformOrigin: '50% 88%', filter: 'drop-shadow(0 0 3px #4a1a04) drop-shadow(-8px 0 18px rgba(255,236,150,.55)) drop-shadow(0 18px 14px rgba(60,30,0,.25))' });
  S.heroShadow = el('div', { width: 360 * u + 'px', height: 44 * u + 'px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(30,60,20,.35), rgba(30,60,20,0) 70%)' });
  c.insertBefore(S.heroShadow, S.hero);
  // a second partner flying behind: there are many to befriend
  S.pal = img(await MonArt.painted('breezle', { size: 'lg', mv: 0.25 }), { width: 250 * u + 'px', transformOrigin: '50% 50%', filter: 'drop-shadow(0 0 2px #0e3040) drop-shadow(0 10px 10px rgba(20,40,80,.22))' });
  c.insertBefore(S.pal, S.isle);
  // the Star Orb, its glow and streak, the catch flash, three stars and sparkles
  S.trail = el('div', { left: 0, top: 0, width: W + 'px', height: H + 'px' });
  S.orbGlow = el('div', { width: 380 * u + 'px', height: 380 * u + 'px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,252,220,.95) 0 13%, rgba(255,236,140,.5) 32%, rgba(143,240,255,0) 70%)' });
  S.orb = img(WArt.item('orb'), { width: 200 * u + 'px', transformOrigin: '50% 50%', filter: 'drop-shadow(0 0 2px #0a2040) drop-shadow(0 10px 12px rgba(0,30,80,.35))' });
  S.flash = el('div', { width: 700 * u + 'px', height: 700 * u + 'px', borderRadius: '50%', opacity: 0, background: 'radial-gradient(circle, #ffffff 0 16%, rgba(255,246,190,.8) 30%, rgba(255,246,190,0) 68%)' });
  S.pips = [0, 1, 2].map(() => { const s = el('div', { width: 70 * u + 'px', height: 70 * u + 'px', opacity: 0 }); s.innerHTML = star4('#ffe14a'); return s; });
  S.sparks = [];
  for (let i = 0; i < 14; i++) { const s = el('div', {}); s.innerHTML = star4(); S.sparks.push([s, (i * 0.618) % 1, (i * 0.37) % 1, 0.45 + ((i * 0.53) % 1) * 0.55]); }
  // the title (CrazyGames' covers only): right of the scene in 16:9, above it otherwise
  if (LOGO) {
    const lw = land ? 820 * u : W * (port ? 0.92 : 0.8);
    S.logo = el('div', { width: lw + 'px', left: (land ? W - lw - W * 0.04 : (W - lw) / 2) + 'px', top: (land ? H * 0.30 : H * (port ? 0.04 : 0.02)) + 'px', filter: 'drop-shadow(0 8px 0 rgba(10,30,60,.35))' });
    S.logo.innerHTML = orbitSvg() + logoSvg();
    const [o, l] = S.logo.querySelectorAll('svg');
    Object.assign(l.style, { width: '100%', display: 'block', position: 'relative' });
    Object.assign(o.style, { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' });
  }
  // a soft vignette that holds the eye on the hero
  el('div', { inset: 0, background: 'radial-gradient(ellipse at 48% 56%, rgba(0,0,0,0) 56%, rgba(8,40,90,.26))', pointerEvents: 'none' });
}

/** the scene at time t (s): a 5 s loop (the catch between 1.4 s and 3.4 s); t = 0 is the still */
function setT(t) {
  const { u, P } = S, L = 5, tt = ((t % L) + L) % L, ph = tt / L, TAU = Math.PI * 2;
  const [ix, iy, iw] = S.isleAt, [zx, zy] = S.zAt;
  // the world breathes: isles bob, rays turn, clouds drift
  const bob = Math.sin(ph * TAU) * 9 * u, zbob = Math.sin(ph * TAU + 2) * 7 * u;
  S.isle.style.transform = `translateY(${bob}px)`;
  S.zIsle.style.transform = `translateY(${zbob}px)`;
  S.rays.style.transform = `rotate(${ph * 16}deg)`;
  for (const [d, x] of S.clouds) d.style.transform = `translateX(${Math.sin(ph * TAU + x * 0.01) * 16 * u}px)`;
  S.far.forEach((f, i) => { f.style.transform = `translateY(${Math.sin(ph * TAU + i * 1.7) * 7 * u}px)`; });
  // the hero: a joyful double hop right after the catch (3.5–4.6 s), otherwise a calm breath
  const hopK = tt > 3.5 && tt < 4.6 ? (tt - 3.5) / 1.1 : -1;
  const q = hopK < 0 ? 0 : (hopK * 2) % 1, air = hopK < 0 ? 0 : Math.sin(q * Math.PI) * (hopK < 0.5 ? 1 : 0.6);
  const breath = Math.sin(ph * TAU * 2) * 0.012;
  const hw = 660 * u, hx = ix + iw * 0.02, feet = iy + iw * 0.36 + bob; // (the grass' middle)
  S.hero.style.left = hx - hw / 2 + 'px'; S.hero.style.top = feet - hw * 0.94 - air * 110 * u + 'px'; // (its paws sit 94 % down its picture)
  S.hero.style.transform = `rotate(${-4 - air * 6}deg) scale(${1 + breath}, ${1 - breath})`;
  S.heroShadow.style.left = hx - 180 * u + 'px'; S.heroShadow.style.top = feet - 22 * u + 'px'; S.heroShadow.style.opacity = 1 - air * 0.5;
  S.heroShadow.style.transform = `scale(${1 - air * 0.25})`;
  // Breezle circles lazily behind, up left
  const [bx, by] = P(120, 330);
  S.pal.style.left = bx + Math.cos(ph * TAU) * 22 * u - 125 * u + 'px'; S.pal.style.top = by + Math.sin(ph * TAU * 2) * 18 * u - 125 * u + 'px';
  S.pal.style.transform = `rotate(${Math.sin(ph * TAU) * 7}deg)`;
  // the orb: resting spot up right (in the hero's gaze); 1.4–2.2 s it swoops to Zapsy, 2.2–2.9 s the catch,
  // 2.9–3.6 s it flies home with Zapsy inside
  const [rx, ry] = P(760, 250), home = [rx + Math.cos(ph * TAU) * 16 * u, ry + Math.sin(ph * TAU) * 14 * u];
  const tgt = [zx, zy - 40 * u + zbob];
  let ox = home[0], oy = home[1], spin = Math.sin(ph * TAU) * 12, zS = 1, zO = 1, flash = 0;
  const arc = (a, b, k, lift) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * lift];
  if (tt >= 1.4 && tt < 2.2) { const k = smooth((tt - 1.4) / 0.8); [ox, oy] = arc(home, tgt, k, 140 * u); spin = k * 540; }
  else if (tt >= 2.2 && tt < 2.9) {
    const k = (tt - 2.2) / 0.7; [ox, oy] = tgt; spin = 540 + Math.sin(k * Math.PI * 6) * 14 * (1 - k);
    zS = 1 - smooth(k / 0.45); zO = 1 - smooth(k / 0.45); flash = Math.sin(clamp01(k / 0.5) * Math.PI);
  } else if (tt >= 2.9 && tt < 3.6) { const k = smooth((tt - 2.9) / 0.7); [ox, oy] = arc(tgt, home, k, 120 * u); spin = 540 + k * 180; zS = 0; zO = 0; }
  else if (tt >= 3.6 && tt < 4.4) { zS = 0; zO = 0; } // Zapsy is in the orb; it pops back only as the loop restarts
  else if (tt >= 4.4) { const k = smooth((tt - 4.4) / 0.6); zS = k; zO = k; } // (a fresh wild one hops onto the isle)
  S.orb.style.left = ox - 100 * u + 'px'; S.orb.style.top = oy - 100 * u + 'px'; S.orb.style.transform = `rotate(${spin}deg)`;
  S.orbGlow.style.left = ox - 190 * u + 'px'; S.orbGlow.style.top = oy - 190 * u + 'px'; S.orbGlow.style.opacity = 0.8 + Math.sin(ph * TAU * 3) * 0.2;
  // Zapsy (squashes into the orb's light when caught)
  const zw = 250 * u, zh = zw;
  S.zap.style.left = zx - zw / 2 + 'px'; S.zap.style.top = zy + 260 * u * 0.36 - zh * 0.94 + zbob + 'px';
  S.zap.style.transform = `scale(${zS}) rotate(${(1 - zS) * 40}deg)`; S.zap.style.opacity = zO;
  S.zap.style.filter = zS < 1 && zS > 0 ? `brightness(${1 + (1 - zS) * 3}) drop-shadow(0 0 2px #1a1040)` : 'drop-shadow(0 0 2px #1a1040) drop-shadow(0 10px 10px rgba(20,20,80,.25))';
  S.flash.style.left = tgt[0] - 350 * u + 'px'; S.flash.style.top = tgt[1] - 350 * u + 'px'; S.flash.style.opacity = flash;
  // three stars pop over the orb when the catch holds (2.6–3.3 s)
  S.pips.forEach((p, i) => {
    const k = clamp01((tt - 2.55 - i * 0.12) / 0.25), out = clamp01((tt - 3.25) / 0.3);
    p.style.left = tgt[0] + (i - 1) * 80 * u - 35 * u + 'px'; p.style.top = tgt[1] - 150 * u - k * 20 * u + 'px';
    p.style.opacity = k * (1 - out); p.style.transform = `scale(${0.4 + k * 0.8}) rotate(${k * 90}deg)`;
  });
  // the streak: behind the orb, along where it came from (at rest: a swoosh from down right)
  const moving = tt >= 1.4 && tt < 3.6;
  const from = moving ? [ox + (tt < 2.9 ? -1 : 1) * 260 * u, oy + 160 * u] : [ox + 420 * u, oy + 330 * u];
  S.trail.innerHTML = tt >= 2.2 && tt < 2.9 ? '' : `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="tr" x1="${from[0]}" y1="${from[1]}" x2="${ox}" y2="${oy}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8ff0ff" stop-opacity="0"/><stop offset=".6" stop-color="#bff8ff" stop-opacity=".6"/><stop offset="1" stop-color="#fff6c0" stop-opacity=".95"/></linearGradient></defs>
    <path d="M${from[0]} ${from[1]} Q${lerp(from[0], ox, 0.35) + 60 * u} ${lerp(from[1], oy, 0.75)} ${ox + 20 * u} ${oy + 28 * u}" stroke="url(#tr)" stroke-width="${56 * u}" stroke-linecap="round" fill="none"/>
    <path d="M${from[0] - 20 * u} ${from[1] + 14 * u} Q${lerp(from[0], ox, 0.3) + 40 * u} ${lerp(from[1], oy, 0.8) + 20 * u} ${ox + 16 * u} ${oy + 46 * u}" stroke="url(#tr)" stroke-width="${16 * u}" stroke-linecap="round" fill="none" opacity=".8"/></svg>`;
  // sparkles twinkle round the orb and the hero
  S.sparks.forEach(([s, a, b, k], i) => {
    const near = i < 8, cx = near ? ox : hx, cy = near ? oy : feet - hw * 0.5, r = (near ? 160 : 360) * u;
    const ang = a * TAU + ph * TAU * (near ? 0.5 : 0.2);
    const tw = Math.max(0, Math.sin((ph * 3 + b) * TAU));
    const sz = (near ? 44 : 34) * u * k;
    s.style.left = cx + Math.cos(ang) * r * (0.55 + b * 0.45) - sz / 2 + 'px'; s.style.top = cy + Math.sin(ang) * r * 0.7 * (0.55 + b * 0.45) - sz / 2 + 'px';
    s.style.width = s.style.height = sz + 'px'; s.style.opacity = 0.35 + tw * 0.65; s.style.transform = `rotate(${ph * 90}deg) scale(${0.6 + tw * 0.5})`;
  });
}

(async () => {
  try {
    if (Q.get('mode') === 'sheet') { await sheet(); return; }
    await build();
    await Promise.all([...c.querySelectorAll('img')].map(i => i.decode ? i.decode().catch(() => {}) : null));
    setT(T0);
    window.setT = setT;
    await document.fonts.ready;
    window.ready = true;
  } catch (e) { console.error(e); window.ready = 'error: ' + e.message; }
})();
